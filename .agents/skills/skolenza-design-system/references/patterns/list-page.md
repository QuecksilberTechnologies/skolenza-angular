[← Index](../README.md) · [Foundations](../foundations/color.md)

# Pattern — List page

> Verified against Skolenza code on 2026-10-15. Earlier source versions are in git history (commit `0c786d5`).

> **Ownership:** T1 — Shared components · **Status:** Normative
> **Reference implementation:** `src/app/features/staff-members/` (`staff-members.html`)
> **Related:** [Spacing](../foundations/spacing.md) · [Grid](../foundations/grid.md) · [Accessibility](../accessibility.md)

`src/app/features/staff-members/` is the canonical list page. Every new list page — Departments,
Designations, Assets, Devices, Modules — follows this anatomy. **Deviating requires a T0 review.**
Where the reference page itself lags a rule (R12, R20, copy), the rule wins; see the notes in §2.

---

## 1. Anatomy

```
┌─ h-[calc(100vh-4.6rem)] overflow-y-auto ──────────────────────────────┐
│                                                                        │
│  ┌─ m-3 sm:m-4 ─────────────────────────────────────────────────────┐ │
│  │  @defer → <app-staff-member-stats> | @placeholder → *-stats-loader│ │  ① Stats row
│  │  flex flex-wrap gap-4 · 4 × p-card · rounded-xl · h-[7.4rem]      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌─ p-card m-3 sm:m-4 overflow-x-auto ──────────────────────────────┐ │
│  │  #caption → <app-table-inline-filters>                            │ │  ② Filter bar
│  │     ├ 3 × p-select (lg:min-w-52, appendTo body, showClear)        │ │
│  │     ├ <app-table-search-filter [filterCount]>  → opens drawer     │ │
│  │     └ ngProjectAs="right": search input + primary action button   │ │
│  │  ─────────────────────────────────────────────────────────────    │ │
│  │  #header → bg-gray-50 dark:bg-zinc-800 · px-3 py-3 · max-w-* caps │ │  ③ Table
│  │  #body   → truncate + pTooltip · chips · progress · row actions   │ │
│  │  #loadingbody  → <app-table-loader>                               │ │  ④ Async states
│  │  #emptymessage → <app-table-empty-message icon message subMessage>│ │
│  │  paginator · [10,25,50] · "Showing {first} to {last} of {total}"  │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
   Overlays (siblings, appendTo="body"):
   p-tieredmenu (row actions) · p-contextMenu (right-click) ·
   p-confirmDialog (destructive) · p-drawer (advanced filter) · app-headless-drawer (side sheet)
```

---

## 2. The rules this page encodes

| # | Rule | Evidence |
| --- | --- | --- |
| **R1** | The page owns its scroll; the shell never does | `h-[calc(100vh-4.6rem)] overflow-hidden overflow-y-auto` |
| **R2** | Stats are deferred and always have a skeleton | `@defer { … } @placeholder (minimum 300ms) { <app-asset-stats-loader /> }` |
| **R3** | Server-side everything | `[lazy]="true"` + `(onLazyLoad)` — no client-side sort or page over partial data |
| **R4** | The table has a floor width, then scrolls | `[tableStyle]="{ 'min-width': '60rem' }"` + `[scrollable]="true"` |
| **R5** | Three filters inline, the rest in a drawer behind a count | `<app-table-search-filter [filterCount]="store.appliedFilterCount()">` |
| **R6** | Overlays render to `body` | `appendTo="body"` on every select, menu, split button and the paginator dropdown — escapes the card's `overflow-x-auto` |
| **R7** | Permission removes, it does not disable | `@if (canAdd())`, `@if (canUpdate())`, `@if (canUseRowActions())` (permission-matrix `computed`s in `staff-members.ts`) around the add buttons, status toggle, Actions column; the context menu binds `[contextMenu]="canUseRowActions() ? actionContextMenu : null"` |
| **R8** | …except where a tooltip can explain the block | A control may stay visible and disabled only when its tooltip states why |
| **R9** | Cells truncate with a tooltip, never wrap | `max-w-* truncate` + `[pTooltip]` |
| **R10** | Secondary actions reveal on hover, and are never essential | `opacity-0 group-hover:opacity-100` on the staff member code copy button |
| **R11** | Colour is paired with an icon and a label | Role chips carry `pi pi-shield` + name (`staff-member-role-cell`); status uses `pi-check-circle` / `pi-ban` |
| **R11a** | Status colour and icon describe the *state*, never the action | Chip and toggle button both: `pi-check-circle` + `severity="success"` when active, `pi-ban` + `severity="danger"` when not. Only the tooltip, `ariaLabel` and the row-menu item name the action ("Deactivate"). Copy `host/institutions/institutions.html` |
| **R12** | Interactive chips and icon buttons carry an accessible name | `[attr.aria-label]="'Manage ' + n + ' roles for ' + firstName + ' ' + lastName"` in `staff-member-role-cell.html`. The reference page's status toggle has a tooltip but **no `ariaLabel`**; add one when copying |
| **R13** | Every async control has a loading identity | `[loading]="staffMember.isUpdatingStatus"`, `pi pi-spin pi-spinner` inside chips |
| **R14** | The empty state names the thing and the next step | `message="No staff members found"` + `subMessage="Create a new staff member to get started"` (the reference page currently renders "staffMembers"; see [open items](../open-items.md) DS-15) |
| **R15** | Heavy children are lazy | The filter drawer body is `@defer` with a placeholder inside `#headless` |
| **R16** | The inline action slot holds one icon button, then `app-table-action-button` (⋯) | Staff members: status toggle + ⋯. Everything else lives in the tiered/context menu |
| **R17** | A row awaiting a decision puts the decision in that slot, not the status toggle | Pending approval → `icon="pi pi-check"` `severity="secondary"` `[outlined]="true"`, tooltip + `ariaLabel` "Approve …", `[loading]` on the deciding flag. The toggle and Reject move to the ⋯ menu. Neutral colour, because R11a reserves green for the *state*. Copy `user-menu/staff-member-profile/staff-member-work-mode-override-info` |
| **R18** | A category chip is neutral; semantic severities are for state only | Work mode, type, kind → `p-tag severity="secondary"`. Approval / active → `success` / `warn` / `danger` |
| **R19** | Page-level guidance sits above the table as a banner with an icon | `<p-message severity="info" icon="pi pi-info-circle" class="mb-3 w-full">` inside the table card, before `p-table` |
| **R20** | Row menus style their panel through `[pt]`, never `styleClass` (deprecated) | The popup panel moves to `body`; host `class` does not follow it. `[pt]="{ root: { class: 'staffMember-action-menu' } }"` on both `p-tieredmenu` and `p-contextMenu`. Copy `staff-member-work-mode-override-info.html`; `staff-members.html` still uses `styleClass` (DS-14) |

---

## 3. Copy-this skeleton

```html
<div class="h-[calc(100vh-4.6rem)] overflow-hidden overflow-y-auto">
  <!-- ① Stats -->
  <div class="m-3 flex flex-col sm:m-4">
    @defer {
      @if (!store.isLoadingStatistics()) { <app-x-stats [stats]="store.statistics()" /> }
      @else { <app-asset-stats-loader /> }
    } @placeholder (minimum 300ms) {
      <app-asset-stats-loader />
    }
  </div>

  <!-- ②③④ Table card -->
  <p-card class="m-3 overflow-x-auto sm:m-4">
    <p-table
      #dt
      [value]="store.rows()"
      [loading]="store.isLoading()"
      [showGridlines]="false"
      [showLoader]="false"
      [scrollable]="true"
      [tableStyle]="{ 'min-width': '60rem' }"
      [lazy]="true"
      [paginator]="true"
      [showCurrentPageReport]="true"
      [rows]="store.pageSize()"
      [rowsPerPageOptions]="[10, 25, 50]"
      [totalRecords]="store.totalRecords()"
      currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
      paginatorDropdownAppendTo="body"
      (onLazyLoad)="load($event)">

      <ng-template #caption>
        <app-table-inline-filters>
          <p-select class="w-full min-w-0 lg:min-w-52" [appendTo]="'body'" [showClear]="true"
                    panelStyleClass="select-option-truncate" … />
          <app-table-search-filter [filterCount]="store.appliedFilterCount()" (filter)="openDrawer()" />
          <div ngProjectAs="right" class="flex w-full flex-col gap-2 lg:w-auto lg:flex-row">
            <app-table-search-input class="min-w-0 flex-1 lg:flex-none" (searchTerm)="search(dt, $event)" />
            @if (canAdd()) {
              <p-button label="Add X" icon="pi pi-plus" class="w-full justify-center lg:w-auto"
                        (onClick)="create()" />
            }
          </div>
        </app-table-inline-filters>
      </ng-template>

      <ng-template #header>
        <tr class="bg-gray-50 dark:bg-zinc-800">
          <th pSortableColumn="name"
              class="max-w-52 px-3! py-3! align-middle text-gray-700 dark:text-zinc-100">
            <div class="flex items-center gap-2">Name <p-sortIcon field="name" /></div>
          </th>
          <!-- … -->
        </tr>
      </ng-template>

      <ng-template #body let-row>
        <tr [pContextMenuRow]="row">
          <td class="max-w-52 px-3! py-3! align-middle text-gray-700 dark:text-zinc-100">
            <div class="truncate" [pTooltip]="row.name" tooltipPosition="bottom">{{ row.name }}</div>
          </td>
          <!-- … -->
        </tr>
      </ng-template>

      <ng-template #loadingbody>
        @if (store.rows().length === 0) {
          <tr><td [attr.colspan]="columnCount()"><app-table-loader /></td></tr>
        }
      </ng-template>

      <ng-template #emptymessage>
        <tr><td [attr.colspan]="columnCount()">
          <app-table-empty-message icon="pi pi-inbox"
                                   message="No records found"
                                   subMessage="Create one to get started" />
        </td></tr>
      </ng-template>
    </p-table>
  </p-card>
</div>

<!-- Overlays: siblings of the page, all appendTo="body" (R6, R20) -->
<p-tieredmenu #actionMenu [model]="actionMenuItems()" [autoDisplay]="true" [popup]="true"
              [pt]="{ root: { class: 'x-action-menu' } }" appendTo="body" />
<p-contextMenu #actionContextMenu [model]="actionMenuItems()"
               [pt]="{ root: { class: 'x-action-menu' } }" appendTo="body" />
<p-confirmDialog />  <!-- width comes from the global .p-confirmdialog rule -->
```

---

## 4. Component-level token contract

| Element | Tokens |
| --- | --- |
| **Stat card** | `radius-card` · `shadow-sm` / `dark:shadow-none dark:border-zinc-800` · `bg-white dark:bg-zinc-900` · height `7.4rem` · icon tile `h-10 w-10` `radius-xl` `bg-primary-50 dark:bg-primary-900/30` · numeral `type-display-sm` · label `type-caption-strong` (current stat cards still use bare `shadow`, DS-07) |
| **Filter select** | `radius-md` · `space-2` gap · `lg:min-w-52` · panel `shadow-md` `z-overlay` · long labels truncate at the panel width via `.select-option-truncate` |
| **Table header** | `bg-neutral-50 dark:bg-neutral-800` · `type-label` · `px-3 py-3` · sort icon `icon-xs` `gap-2` |
| **Table cell** | `type-body-md` · `px-3 py-3` · `text-neutral-700 dark:text-neutral-100` · `truncate` + `max-w-*` |
| **Role chip** | `radius-full` · `px-2.5 py-1` · `type-label-sm` · `bg-primary-50 text-primary-700 border-primary-200` / dark `bg-primary-900/30 text-primary-200 border-primary-700` · `focus-visible:ring-2 ring-primary-400` |
| **Count badge** | `radius-full` · `h-5 min-w-5` · `type-body-sm font-semibold` · `bg-neutral-200 text-neutral-700` |
| **Progress bar** | Track `h-2 radius-full bg-surface-200 dark:bg-surface-700` · fill `radius-full` + `transition-all duration-300` (`duration-moderate`) · colour from `getProgressTone` (`shared/utilities/progress-tone.ts`) · label `type-body-sm font-semibold` |
| **Row action button** | `severity="secondary"` · `icon-md` · ≥ 32×32 hit area · `ariaLabel` required |
| **Status toggle** | `class="text-xl!"` · `pi-check-circle` + `success` / `pi-ban` + `danger` (state, R11a) · tooltip `left` · `[showDelay]="300"` · `[loading]` · `ariaLabel` names the action |
| **Decision button** | as Status toggle, but `pi-check` · `severity="secondary"` · `[outlined]="true"` (R17) |
| **Category chip** | `p-tag severity="secondary"` (R18) |
| **Guidance banner** | `p-message severity="info" icon="pi pi-info-circle"` · `mb-3 w-full` (R19) |
| **Confirm dialog** | no width in the template: `.p-confirmdialog` in `src/styles.css` sets `var(--container-dialog-sm)` (28rem) with `max-width: 90vw` · header names the action + object ("Approve Work Mode Override") · icon `text-2xl!` with the `-700` / `dark:-400` text shade, never `-500` · `acceptButtonStyleClass="p-button-primary"` + `rejectButtonStyleClass="p-button-secondary"` so the two buttons never share a weight |
| **Empty state** | `py-12` · halo `h-16 w-16 radius-full bg-primary-50 dark:bg-zinc-800` · icon `icon-2xl` · title `type-h3` · sub `type-caption` |
| **Drawer** | `w-full!` below `sm`, `sm:min-w-[40rem] sm:w-auto!` above · `shadow-lg` · scrim `color-mask` · `z-modal` |

---

## 5. Checklist for a new list page

- [ ] Shell is `h-[calc(100vh-4.6rem)] overflow-hidden overflow-y-auto`
- [ ] Stats row is `@defer` with a `@placeholder (minimum 300ms)` skeleton
- [ ] Table is `[lazy]="true"` with a server-driven `(onLazyLoad)`
- [ ] `[tableStyle]` sets a `min-width` so columns never crush
- [ ] Every overlay sets `appendTo="body"`
- [ ] `#loadingbody` and `#emptymessage` templates both present
- [ ] Long cell values `truncate` with a `pTooltip`
- [ ] Permission-gated UI is **removed**, not disabled — unless a tooltip explains the block
- [ ] Icon-only actions carry `ariaLabel`
- [ ] Verified in light and dark, at 320 / 640 / 1024 / 1440px

---

**See also:** [Accessibility](../accessibility.md) · [Governance → Definition of Done](../governance.md#5-definition-of-done)
