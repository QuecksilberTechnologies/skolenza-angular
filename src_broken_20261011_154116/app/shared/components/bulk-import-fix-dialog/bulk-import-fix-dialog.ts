import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Signal,
  signal,
} from '@angular/core';
import { disabled, form, validate, validateStandardSchema } from '@angular/forms/signals';
import { ButtonModule } from '@openng/optimus-ui/button';
import { DynamicDialogConfig, DynamicDialogRef } from '@openng/optimus-ui/dynamicdialog';
import { MessageModule } from '@openng/optimus-ui/message';

import {
  BulkImportFieldConfig,
  BulkImportFieldOption,
  BulkImportFixDialogData,
  BulkImportFixResult,
  BulkImportRow,
} from '@shared/interfaces';
import { errorsByColumn } from '@shared/utilities/bulk-import-errors';

import { FormDate } from '../form-inputs/form-date/form-date';
import { FormSelect } from '../form-inputs/form-select/form-select';
import { FormSwitch } from '../form-inputs/form-switch/form-switch';
import { FormText } from '../form-inputs/form-text/form-text';
import { SectionCard } from '../section-card/section-card';
import { BulkImportFixModel, buildFixSchema } from './bulk-import-fix-dialog.schema';

/** The card ungrouped fields land under, so a master describing no sections still gets one. */
const DEFAULT_SECTION = 'Row details';

/** What the sheet writes for a flag. Lower case, as the templates and the API's own reports use. */
const TRUE = 'true';
const FALSE = 'false';

/** `yyyy-MM-dd`, the only date form the importer accepts. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Corrects the rows a bulk import rejected, without leaving the app for a spreadsheet.
 *
 * Opened by `BulkImportDialog` and closed with the columns that actually changed, by row number.
 * It never talks to the API itself: the wizard owns the re-check, because the only way to
 * re-validate a correction is to send the whole sheet through `preview` again.
 *
 * The field set is whatever the importing feature described, so this component knows nothing about
 * staffMembers or departments — only about columns, their types and where their options come from.
 */
@Component({
  selector: 'app-bulk-import-fix-dialog',
  imports: [ButtonModule, MessageModule, SectionCard, FormDate, FormSelect, FormSwitch, FormText],
  templateUrl: './bulk-import-fix-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BulkImportFixDialog {
  readonly #dialogRef = inject(DynamicDialogRef);
  readonly #data: BulkImportFixDialogData = inject(DynamicDialogConfig).data;

  protected readonly rows = this.#data.rows;
  protected readonly fields = this.#data.fields;
  protected readonly display = this.#data.display;

  /** Which row the pane is on. Seeded from the row the editor was opened from, when it was one. */
  protected readonly activeIndex = signal(
    Math.max(
      this.rows.findIndex((row) => row.rowNumber === this.#data.startRowNumber),
      0,
    ),
  );

  protected readonly activeRow = computed(() => this.rows[this.activeIndex()]);

  /**
   * Corrections so far, by row number. Held here rather than written straight back, so Cancel
   * really cancels and the wizard is handed one set of edits to re-check rather than a stream.
   */
  readonly #edits = signal<BulkImportFixResult>(new Map());

  /**
   * The server's sentences for the row on screen, under the column each one names. Cleared per
   * field as soon as that field is edited: the complaint was about the value that was sent, and
   * keeping it under a value the user has since changed reads as a fresh rejection.
   */
  readonly #rowErrors = computed(() =>
    errorsByColumn(
      this.activeRow()?.errors ?? [],
      this.#data.sourceColumns,
      this.#data.columnMapping,
    ),
  );

  /** Sentences naming no column. Shown against the row, so nothing the API said is dropped. */
  protected readonly rowLevelErrors = computed(() => this.#rowErrors().unmatched);

  /** The values the row arrived with, to compare edits against and to reset back to. */
  readonly #original = computed(() => this.#toModel(this.activeRow()));

  protected readonly model = signal<BulkImportFixModel>(this.#toModel(this.rows[0]));

  /**
   * Built once. The key set is fixed at creation — every described column exists in every model,
   * seeded blank when the row does not carry it — so moving between rows is a `model.set()`, never
   * a second `form()`.
   */
  protected readonly f = form(this.model, (p) => {
    validateStandardSchema(p, buildFixSchema(this.fields));

    for (const field of this.fields) {
      const path = p[field.column];

      // Behaviour, not validation, so it stays in the callback: a list that hangs off another
      // column has nothing to offer until that column is answered. Only when the parent is on this
      // sheet — a described column the file does not carry is dropped, and reading a path that was
      // never built would throw the moment the predicate ran.
      const parent = field.dependsOn
        ? this.fields.find((other) => other.column === field.dependsOn)
        : undefined;

      if (parent) {
        const parentColumn = parent.column;
        disabled(path, {
          when: ({ valueOf }) => !String(valueOf(p[parentColumn]) ?? '').trim(),
        });
      }

      // The server's own complaint, shown on the field it names until that field is edited.
      validate(path, ({ value }) => {
        const sentences = this.#rowErrors().byColumn.get(field.column);
        if (!sentences?.length) return null;
        if (!this.#isPristine(field, value())) return null;

        return sentences.map((message) => ({ kind: 'server', message }));
      });
    }
  });

  /**
   * Seeded submitted: every one of these rows has already been sent and rejected, so a message
   * waiting on touch-and-dirty would leave the fields the user has to fix looking clean.
   */
  protected readonly submitted = true;

  /** Set when a save was refused, so the footer can say why rather than doing nothing visible. */
  protected readonly saveBlocked = signal(false);

  protected readonly sections = computed(() => {
    const grouped = new Map<string, BulkImportFieldConfig[]>();

    for (const field of this.fields) {
      const heading = field.section ?? DEFAULT_SECTION;
      const existing = grouped.get(heading);
      if (existing) existing.push(field);
      else grouped.set(heading, [field]);
    }

    return [...grouped].map(([heading, fields]) => ({ heading, fields }));
  });

  protected readonly positionLabel = computed(
    () => `Row ${this.activeIndex() + 1} of ${this.rows.length}`,
  );

  protected readonly isFirst = computed(() => this.activeIndex() === 0);
  protected readonly isLast = computed(() => this.activeIndex() === this.rows.length - 1);

  constructor() {
    this.#openRow(this.activeIndex());
  }

  /** How many errors a rail entry still carries, before any correction is re-checked. */
  protected errorCountLabel(row: BulkImportRow): string {
    return row.errors.length === 1 ? '1 error' : `${row.errors.length} errors`;
  }

  protected rowTitle(row: BulkImportRow): string {
    return row.values[this.display.rowSummaryField] || `Row ${row.rowNumber}`;
  }

  /** Every option list is `{ id, <something>Name }`, so the id is always the value written back. */
  protected readonly optionValue = 'id';

  /**
   * The option lists with their ids as strings.
   *
   * The sheet carries `"5"` and the lookups carry `5`, and `p-select` matches its model against
   * `option[optionValue]` by identity — so a row naming a perfectly good department would render
   * blank, and picking one would put a number where the rest of this component, the schema and the
   * CSV all expect a string. Normalising the list once is what keeps every value a string
   * end to end.
   */
  readonly #stringIdOptions = new Map<string, Signal<readonly BulkImportFieldOption[]>>(
    this.fields
      .filter((field) => field.options)
      .map((field) => [
        field.column,
        computed(() =>
          (field.options?.() ?? []).map((option) => ({ ...option, id: String(option.id) })),
        ),
      ]),
  );

  protected options(field: BulkImportFieldConfig): readonly BulkImportFieldOption[] {
    return this.#stringIdOptions.get(field.column)?.() ?? [];
  }

  protected goTo(index: number): void {
    if (index === this.activeIndex()) return;

    this.#commit();
    this.#openRow(index);
  }

  protected previous(): void {
    if (!this.isFirst()) this.goTo(this.activeIndex() - 1);
  }

  /** Saves the row on screen and moves on; on the last row it saves and closes. */
  protected saveAndNext(): void {
    if (!this.#isRowSavable()) return;

    this.#commit();

    if (this.isLast()) {
      this.#dialogRef.close(this.#edits());
      return;
    }

    this.#openRow(this.activeIndex() + 1);
  }

  /** Drops this row's corrections and puts the values the import rejected back on screen. */
  protected resetRow(): void {
    const row = this.activeRow();
    if (!row) return;

    this.#edits.update((edits) => {
      const next = new Map(edits);
      next.delete(row.rowNumber);

      return next;
    });

    this.model.set(this.#toModel(row));
    this.#loadDependentOptions();
  }

  protected close(): void {
    this.#dialogRef.close(undefined);
  }

  /** Commits the row on screen and hands the wizard everything that changed. */
  protected done(): void {
    if (!this.#isRowSavable()) return;

    this.#commit();
    this.#dialogRef.close(this.#edits());
  }

  /**
   * Whether the row on screen is worth sending. A blank required column or a malformed address is
   * something the schema already knows about, and letting it through would spend a full upload and
   * re-check to be told the same thing.
   *
   * Server complaints do not block: those are about the values that were rejected, and a row still
   * carrying one is exactly the row the user is here to send again.
   */
  #isRowSavable(): boolean {
    const blocked = this.fields.some((field) =>
      this.f[field.column]()
        .errors()
        .some((error) => error.kind !== 'server'),
    );

    this.saveBlocked.set(blocked);

    return !blocked;
  }

  /**
   * A dependent field is cleared when its parent moves, and its list is refetched for the new
   * parent — a designation belonging to the department that was chosen before is not an option any
   * more, and leaving it selected would send an id the server is about to reject again.
   */
  protected onFieldChange(field: BulkImportFieldConfig): void {
    const dependents = this.fields.filter((other) => other.dependsOn === field.column);
    if (!dependents.length) return;

    const parentValue = this.#sheetValue(field, this.model()[field.column]);

    this.model.update((values) => {
      const next = { ...values };
      for (const dependent of dependents) next[dependent.column] = '';

      return next;
    });

    for (const dependent of dependents) dependent.loadOptions?.(parentValue);
  }

  /**
   * Puts a row on screen and asks every dependent field for the list its parent implies.
   *
   * Corrections already made to that row go back on with it — coming back to a row the user has
   * half-fixed must not hand them the rejected values again.
   */
  #openRow(index: number): void {
    this.activeIndex.set(index);

    const row = this.rows[index];
    if (!row) return;

    this.model.set(this.#toModel(row, this.#edits().get(row.rowNumber)));
    this.#loadDependentOptions();
  }

  /**
   * Asks every list for the options the values on screen imply.
   *
   * Every list, not only the cascaded ones: a field with no parent still has to say it is wanted,
   * which is what keeps the wizard from fetching option lists nobody opened the editor to see.
   */
  #loadDependentOptions(): void {
    for (const field of this.fields) {
      if (!field.loadOptions) continue;

      const parent = field.dependsOn
        ? this.fields.find((other) => other.column === field.dependsOn)
        : undefined;

      field.loadOptions(parent ? this.#sheetValue(parent, this.model()[parent.column]) : '');
    }
  }

  /** Records the row on screen, but only the columns whose value actually moved. */
  #commit(): void {
    const row = this.activeRow();
    if (!row) return;

    const values = this.model();
    const changed: Record<string, string> = {};

    for (const field of this.fields) {
      const next = this.#sheetValue(field, values[field.column]);
      // Against the RAW cell, not the value the control was seeded with. A date the sheet wrote as
      // `13/05/1990` seeds the picker as empty, and comparing empty to empty would record no change
      // — so the same unreadable date would go back up and be rejected again, with nothing on
      // screen to say why. `#isPristine` compares against the seeded value instead, because the
      // question it asks is whether the user has touched the control.
      if (next === (row.values[field.column] ?? '')) continue;

      changed[field.column] = next;
    }

    this.#edits.update((edits) => {
      const map = new Map(edits);
      if (Object.keys(changed).length) map.set(row.rowNumber, changed);
      else map.delete(row.rowNumber);

      return map;
    });
  }

  /** Whether a field still holds what the import was given, so the server's verdict still stands. */
  #isPristine(field: BulkImportFieldConfig, value: unknown): boolean {
    return (
      this.#sheetValue(field, value) === this.#sheetValue(field, this.#original()[field.column])
    );
  }

  /**
   * The row's values as the controls want them: a `Date` for the pickers, a `boolean` for the
   * switches, and the raw string for everything else including the selects, whose options are
   * keyed by the numeric id the sheet already carries.
   */
  #toModel(
    row: BulkImportRow | undefined,
    corrections?: Record<string, string>,
  ): BulkImportFixModel {
    const model: BulkImportFixModel = {};

    for (const field of this.fields) {
      const raw = corrections?.[field.column] ?? row?.values[field.column] ?? '';

      if (field.type === 'switch') model[field.column] = raw.trim().toLowerCase() === TRUE;
      else if (field.type === 'date') model[field.column] = toDate(raw);
      else model[field.column] = raw;
    }

    return model;
  }

  /** The inverse: what the corrected sheet writes into the cell. */
  #sheetValue(field: BulkImportFieldConfig, value: unknown): string {
    if (field.type === 'switch') return value ? TRUE : FALSE;
    if (field.type === 'date') return value instanceof Date ? toIsoDate(value) : '';
    if (value === null || value === undefined) return '';

    return String(value).trim();
  }
}

/**
 * `yyyy-MM-dd` only. Anything else is what the import called an invalid date format, and parsing it
 * leniently here would quietly replace the value the user has to look at and correct.
 */
function toDate(raw: string): Date | null {
  const text = raw.trim();
  if (!ISO_DATE.test(text)) return null;

  const parsed = new Date(`${text}T00:00:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Local parts, not `toISOString()` — that shifts the day backwards east of UTC. */
function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}
