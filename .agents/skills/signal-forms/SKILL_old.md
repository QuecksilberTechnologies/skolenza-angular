---
name: signal-forms
description: Signal Forms + zod validation convention — one colocated *.schema.ts per form wired through validateStandardSchema(), z.input not z.infer, nullable-number fields, disabled() rules. Use when creating or converting a form, writing a form schema, or touching validation in any Signal Form.
---

# Forms & validation

**All** validation for a Signal Form lives in a colocated **zod** schema wired through
`validateStandardSchema()` (`zod` is a production dependency). Do **not** reach for the built-in
`required` / `email` / `min` / `max` / `minLength` / `maxLength` / `pattern` validators in new
forms — one rule, one place, and the schema is the place.

```ts
// features/host/subscriptions/subscription-plan-form/subscription-plan-form.schema.ts
export const subscriptionPlanSchema = z.object({
  planName: z.string().trim().min(1, 'Plan name is required'),
  maxUsers: z
    .number()
    .min(1, 'Max users must be at least 1')
    .nullable()
    .refine((value) => value !== null, 'Max users is required'),
});

/** `z.input`, not `z.infer` — `.refine` narrows null out of the *output* type. */
export type SubscriptionPlanModel = z.input<typeof subscriptionPlanSchema>;
```

```ts
protected readonly model = signal<SubscriptionPlanModel>({ planName: '', maxUsers: null });

protected readonly f = form(this.model, (p) => {
  validateStandardSchema(p, subscriptionPlanSchema);

  // Form behaviour, not validation — stays in the callback.
  disabled(p.perDayPrice, { when: ({ valueOf }) => valueOf(p.isFree) });
});
```

- **One schema file per form**, colocated and named after it: `login.ts` → `login.schema.ts`,
  `subscription-plan-form.ts` → `subscription-plan-form.schema.ts`. It exports the schema and the
  model type; the component types its `signal<Model>` from that export rather than hand-writing the
  shape.
- **`validateStandardSchema` reads the issue list and discards the parsed value.** `.trim()`,
  `.transform()`, and `.coerce` are validation-only — they never write back to the model. Normalising
  for the request body still happens in the submit handler.
- **Use `z.input`, never `z.infer`**, for any schema with a `.refine`. TS 6 infers
  `(value) => value !== null` as a type predicate, so `z.infer` narrows a nullable field to
  non-null and the component can no longer seed it with `null`.
- Fields that must stay `number | null` (blank numeric inputs whose placeholders depend on it) get
  `.min(...)` **before** `.nullable()`, then a trailing `.refine` for the required message.
- Reuse the shared regex constants from `@shared/utilities/validation-regex` — do not inline copies.
- `disabled({ when })` and other cross-field _behaviour_ stay in the `form()` callback; only
  validation moves into the schema.
- Templates need no change when converting a form: they already render
  `f.x().errors()[0].message`, which zod issues populate through the same channel.
- **Accepted tradeoff:** zod issues carry no field metadata, so the built-ins' `required` / `min` /
  `minLength` / `pattern` state no longer reaches the control's DOM bindings and the inputs report
  `required=false`. Labels must therefore carry a visible `*`, and numeric inputs keep an explicit
  `[min]` in the template.
- Reference implementations: `features/authentication/login/login.schema.ts` (simple) and
  `features/host/subscriptions/subscription-plan-form/subscription-plan-form.schema.ts` (nullable
  numbers, free-plan `disabled` rules).
- Older Signal Forms still use the built-in validators. Leave them as-is; convert one only when
  already working in that file.
