# UI copy

## Dashes

Never use an em dash (`—`) or an en dash (`–`) to separate words or clauses in user-facing
copy — dialog headers, page titles and descriptions, button labels, tooltips, toasts, hints,
empty states. Use a plain hyphen `-`, a colon, or split the sentence in two.

```ts
header: `${plan.planName} - Module Map`; // yes
header: `${plan.planName} — Module Map`; // no
```

This rule is about strings rendered to users. Code comments and JSDoc keep the repo's
existing em-dash style.

Two established uses stay legal:

- `—` as the empty-value placeholder in detail views and table cells (paired with an
  `sr-only` label where the cell has no other text).
- `–` inside a numeric or date range: `0–100`, `Apr 2025 – Mar 2026`.
