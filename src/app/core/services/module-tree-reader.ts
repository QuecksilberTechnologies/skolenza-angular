import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { flattenModuleHeaders, ModuleRow, SubModuleRow } from '@shared/interfaces';

import { ParentModuleApi } from './parent-module-api';
import { SubModuleApi } from './sub-module-api';

export interface ModuleTree {
  /** Header modules, parents before their children. */
  headers: ModuleRow[];
  /** Leaf modules — the only kind `/ChildModule/list` returns. */
  leaves: SubModuleRow[];
  /**
   * Headers whose read-back failed. They are absent from `headers`, which is indistinguishable
   * from "this module does not exist" unless the caller says otherwise.
   */
  unreadHeaderIds: number[];
}

/** Guards the ancestor walk against a cycle in the parent chain. Real trees are 2–3 deep. */
const MAX_HEADER_DEPTH = 6;

/**
 * Reassembles a scope's module tree, which no single endpoint can serve:
 *
 * - `/ParentModule/get-module-headers` enumerates headers but only **active** ones — `IsActive=false`
 *   comes back empty and omitting it behaves like `true`, whatever its swagger text says. It is also
 *   a trimmed projection with no scope, status, code or audit columns.
 * - `/ParentModule/{id}` returns the full row for any header, active or not, but only by id.
 * - `/ChildModule/list` returns every leaf, active or not, each carrying its `parentModuleId`.
 *
 * So the ids are seeded from the active tree plus the leaves' parents, then walked up to the root
 * and read back in full.
 *
 * KNOWN GAP: an inactive header is only recovered if a leaf still points somewhere beneath it. One
 * whose whole subtree holds no leaves is enumerated by nothing and cannot be listed — it is invisible
 * until the backend makes `IsActive=false` work, which would collapse this whole class back to a
 * single call. No other endpoint enumerates modules: `/ChildModule/list` returns leaves only,
 * `/Host/get-host-modules` comes back empty, and there is no plan-independent module catalogue.
 */
@Injectable({ providedIn: 'root' })
export class ModuleTreeReader {
  readonly #parentModuleApi = inject(ParentModuleApi);
  readonly #subModuleApi = inject(SubModuleApi);

  readScope(moduleScope: number): Observable<ModuleTree> {
    return forkJoin({
      tree: this.#parentModuleApi.getModuleHeaders({ ModuleScope: moduleScope }),
      subs: this.#subModuleApi.getSubModules({ moduleScope }),
    }).pipe(
      switchMap(({ tree, subs }) => {
        // A refused envelope is a failure, not an empty scope. Collapsing the two painted an empty
        // grid with no message at all.
        if (!tree.isSucceeded) {
          throw new Error(tree.message || 'Could not load module headers.');
        }
        if (!subs.isSucceeded) {
          throw new Error(subs.message || 'Could not load child modules.');
        }

        const leaves = subs.data ?? [];
        // The active tree also fixes the display order — reconstructed rows have no order of
        // their own beyond `itemPriority`.
        const apiOrder = flattenModuleHeaders(tree.data ?? []).map((header) => header.id);

        const seeds = new Set(apiOrder);
        for (const leaf of leaves) {
          if (leaf.parentModuleId) {
            seeds.add(leaf.parentModuleId);
          }
        }

        if (seeds.size === 0) {
          return of({ headers: [] as ModuleRow[], leaves, unreadHeaderIds: [] });
        }

        return this.#hydrate([...seeds], moduleScope).pipe(
          map(({ rows, unread }) => ({
            headers: orderHeaders(rows, apiOrder),
            leaves,
            unreadHeaderIds: unread,
          })),
        );
      }),
    );
  }

  /** Reads a wave of ids in full, then follows their parents until the roots are reached. */
  #hydrate(
    ids: number[],
    moduleScope: number,
  ): Observable<{ rows: ModuleRow[]; unread: number[] }> {
    const found = new Map<number, ModuleRow>();
    const unread = new Set<number>();

    const wave = (
      batch: number[],
      depth: number,
    ): Observable<{ rows: ModuleRow[]; unread: number[] }> => {
      const pending = batch.filter((id) => !found.has(id));
      if (pending.length === 0 || depth >= MAX_HEADER_DEPTH) {
        return of({ rows: [...found.values()], unread: [...unread] });
      }

      return forkJoin(
        // One unreadable header must not empty the grid, so each read swallows its own failure.
        pending.map((id) =>
          this.#parentModuleApi.getParentModule(id, moduleScope).pipe(catchError(() => of(null))),
        ),
      ).pipe(
        switchMap((responses) => {
          const parents: number[] = [];
          for (const res of responses) {
            const row = res?.isSucceeded ? res.data : null;
            if (!row) {
              continue;
            }
            found.set(row.id, row);
            if (row.parentModuleId && !found.has(row.parentModuleId)) {
              parents.push(row.parentModuleId);
            }
          }
          for (const id of pending) {
            if (found.has(id)) {
              unread.delete(id);
            } else {
              unread.add(id);
            }
          }

          return wave(parents, depth + 1);
        }),
      );
    };

    return wave(ids, 0);
  }
}

/** Re-nests the flat rows: roots first, each followed by its own children. */
function orderHeaders(rows: ModuleRow[], apiOrder: number[]): ModuleRow[] {
  const rank = new Map(apiOrder.map((id, index) => [id, index]));
  const byParent = new Map<number | null, ModuleRow[]>();

  for (const row of rows) {
    const parentId = row.parentModuleId ?? null;
    byParent.set(parentId, [...(byParent.get(parentId) ?? []), row]);
  }

  const sorted = (siblings: ModuleRow[]) =>
    [...siblings].sort(
      (a, b) =>
        (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER) ||
        a.itemPriority - b.itemPriority ||
        a.displayName.localeCompare(b.displayName),
    );

  const walk = (parentId: number | null): ModuleRow[] =>
    sorted(byParent.get(parentId) ?? []).flatMap((row) => [row, ...walk(row.id)]);

  const ordered = walk(null);
  // A row whose parent went unread would otherwise vanish rather than merely lose its indent.
  const placed = new Set(ordered.map((row) => row.id));
  return [...ordered, ...rows.filter((row) => !placed.has(row.id))];
}
