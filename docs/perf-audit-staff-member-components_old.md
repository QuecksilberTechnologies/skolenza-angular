# Performance Audit — Employee Shared Components

**Date:** 2026-06-07
**Scope:** `src/app/shared/components/employee/` — `employee-filter`, `employee-manage-dialog`, `verification-settings`

## Summary

All three components use `ChangeDetectionStrategy.OnPush` and `takeUntilDestroyed` correctly. The dominant problem is the **store-signal mirroring anti-pattern**: each component copies NgRx store signals into local signals via `effect()`, which CLAUDE.md explicitly forbids ("Components should expose store signals directly — do NOT copy store state into local signals via `effect()`"). One stray `console.log` also remains.

## Findings

| Priority | Issue                                                                                         | Location                            | Impact | Fix                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------- | ----------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| P1       | `console.log('ngOnInit() called.')` left in code                                              | verification-settings.ts:77         | 🟠Med  | Remove                                                                                                            |
| P1       | 3× `effect()` mirror store signals → local (`completionPercentages`, `isLoading`, `isSaving`) | verification-settings.ts:62-74      | 🟠Med  | Alias store signals directly, drop effects                                                                        |
| P1       | `effect()` mirrors `designationsApi.isLoading()`/`designations()` → local                     | employee-filter.ts:57-60            | 🟠Med  | Alias `#designationsApi` signals, drop effect                                                                     |
| P1       | Roles `effect()` pure copy → local (`isLoadingRoles`, `roleOptions`)                          | employee-manage-dialog.ts:137-140   | 🟠Med  | Alias `#rolesApi` signals, drop effect                                                                            |
| P2       | Designation `effect()` mixes copy + clear-logic                                               | employee-manage-dialog.ts:121-135   | 🟡Low  | Keep effect (real side-effect: clears `designationId`), drop only the mirror `.set()` lines, alias options signal |
| P2       | `isInvalid()` + repeated `employeeForm.get('x')` getter calls in template (~60 calls/CD)      | employee-manage-dialog.html         | 🟡Low  | Hoist controls via `@let`; reactive form bounds CD so low real cost                                               |
| P2       | Country flag `<img [src]>` not `NgOptimizedImage`                                             | employee-manage-dialog.html:248-266 | 🟡Low  | Dynamic remote flags inside select template — NgOptimizedImage needs fixed dims; leave/defer                      |
| P2       | `async` methods with no `await` (`onApply`, `onReset`, `onDepartmentChange`)                  | employee-filter.ts:95,139,140       | 🟡Low  | Drop `async` — cosmetic                                                                                           |
| P2       | Knob `[ngModel]` bound to `.toFixed()` string                                                 | verification-settings.html:9        | 🟡Low  | Pass number; cosmetic                                                                                             |

No P0. Hot path is fine.

## Notes

- **Real wins = P1**: removing redundant effects + console.log → fewer change-detection triggers, matches the store-signal standard in CLAUDE.md.
- **Caveat (verification-settings):** template uses `[(ngModel)]` on `completionPercentage.isInfoVerified`/`isEditAllowed` rows. Aliasing the store signal keeps two-way mutation on the same store objects — behavior preserved.
- **Login component** (`features/authentication/login`) audited separately: already healthy. Only P2 items — `isInvalid()`/`loginForm.get()` getter calls in template. No action taken.

## Status

Findings reported. No fixes applied yet — awaiting confirmation on P1 scope.
