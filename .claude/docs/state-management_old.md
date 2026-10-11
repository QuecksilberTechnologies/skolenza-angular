# State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead
- Use **NgRx Signal Store** (`@ngrx/signals`) for feature-level state management
  - Define state interface + `initialState`, then compose with `signalStore()` + `withState()` + `withComputed()` + `withProps()` + `withMethods()`
  - Use `rxResource()` inside `withProps()` for reactive data fetching
  - Use `patchState()` for state mutations
  - Derive `isLoading` from `resource.isLoading()` via `withComputed()`
  - Provide stores at component level via `providers: [MyStore]`
  - Components should expose store signals directly — do NOT copy store state into local signals via `effect()`
  - API services should remain pure HTTP wrappers — move state management logic (loading flags, data signals, setters) into stores
  - Do NOT add `append*`, `patch*`, `remove*` state-mutation helpers to API services — handle optimistic updates via `patchState()` in the store
  - See `features/departments/departments.store.ts` or `features/assets-management/asset-category/asset-category.store.ts` as reference implementations
