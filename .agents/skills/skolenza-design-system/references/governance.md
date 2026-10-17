[← Index](./README.md)

# Governance

> Verified against Skolenza code on 2026-10-15. Earlier source versions are in git history (commit `0c786d5`).

> **Ownership:** T0 — Foundations · **Status:** Normative
> **Related:** [Introduction](./introduction.md) · [Tokens](./tokens/README.md) · [Open items](./open-items.md)

How a change gets into this design system, who may make it, and what "done" means.

---

## 1. Ownership tiers

| Tier | What it covers | Who may change it | Where it lives |
| --- | --- | --- | --- |
| **T0 — Foundations** | Palette architecture, type scale, spacing step, breakpoints, radius / shadow / motion scales | Design System owner + Frontend architect, **joint sign-off** | `src/styles.css`, `src/app/core/skolenza-preset.ts` |
| **T1 — Shared components** | `src/app/shared/components/**` | Any engineer, review by a T0 owner | `shared/` |
| **T2 — Feature composition** | `features/<feature>/**` | Feature owner | `features/` |
| **T3 — Institution theme** | Brand colour, logo, favicon | Institution admin, at runtime | Backend institution settings (read via `InstitutionsApi.getBrandColor()`) |

Every document in this folder carries an **Ownership** line in its header. Changing a T0 document
requires the same joint sign-off as changing the code it describes — the two land in one PR.

---

## 2. Change process

### Step 1 — Propose

Open an issue (GitHub Issues on `QuecksilberTechnologies/Skolenza-app`) describing the need in terms
of a **user problem**, not a value.

> ✅ "Status chips are unreadable in dark mode."
> ❌ "Make chips `#22c55e`."

### Step 2 — Check for an existing token

A new token is only justified when no combination of existing tokens works. Before adding one, ask:

- Can this be expressed with an existing token plus a different *shape* (outline vs filled, dashed vs
  solid, size vs weight)?
- Is this pattern repeated three or more times in feature code? If so, the right fix is **promoting**
  it into `shared/`, not minting a foundation token.
- Is this a one-off? One-offs do not become tokens.

### Step 3 — Amend the source of truth

T0 changes go into `src/styles.css` and/or `src/app/core/skolenza-preset.ts` **in the same PR** as
the documentation change. A token added to docs but not to code is rejected, and vice versa.

### Step 4 — Audit

- Run the [contrast check](./accessibility.md) for **both** themes
  (`py .agents/skills/skolenza-design-system/scripts/skolenza_color.py check FG BG`)
- AXE clean
- `bun run lint`
- `bun run analyze` if the change touches CSS volume

### Step 5 — Migrate

A changed token requires a codemod, or an inventory of affected call sites, in the PR description.
"We'll fix the rest later" is not an accepted migration plan.

---

## 3. Deprecation policy

- Deprecated tokens keep working for **one minor release** and are marked `@deprecated` with the
  replacement named in a comment beside them.
- Retired components move to `docs/archived/` at the repo root (excluded from build, lint, format and
  tests; the folder does not exist yet and is created on first use). That folder is inert — **do not
  extend it and do not delete from it unasked**.
- Removed tokens are listed in the release notes with a sed-able before/after pair.

---

## 4. Versioning

Semver on this design system, tracking **token semantics** — not documentation volume.

| Bump | Trigger | Example |
| --- | --- | --- |
| **Major** | A token is removed, or its meaning changes | `radius-md` moves from 6px to 10px |
| **Minor** | Tokens are added, or a component gains a variant | `color-info-700` is introduced |
| **Patch** | Documentation, usage guidance, contrast corrections | An audit row is closed |

---

## 5. Definition of Done

Every UI PR must satisfy all of the following before review.

- [ ] No new colour / radius / shadow / duration literals outside `src/styles.css` and
      `src/app/core/skolenza-preset.ts`
- [ ] Renders correctly in light **and** dark (`.dark` on `<html>`)
- [ ] Verified at 320px, 640px, 1024px, 1440px
- [ ] Loading, empty and error states implemented
- [ ] AXE clean; visible focus on every interactive element; icon-only controls have `aria-label`
- [ ] Contrast ≥ 4.5:1 body text, ≥ 3:1 large text and UI boundaries — **both** themes
- [ ] `prefers-reduced-motion` respected for any new transition
- [ ] `ChangeDetectionStrategy.OnPush`; native control flow (`@if` / `@for` / `@switch` / `@defer`)
- [ ] Component stylesheet under 4 kB (the `anyComponentStyle` budget warns at 4 kB, errors at 8 kB)
- [ ] User-facing copy uses no em / en dash as a separator (`.claude/docs/ui-copy.md`)

---

## 6. Where documentation lives

| Kind | Home |
| --- | --- |
| Design decisions, tokens, foundations, patterns | **This folder** |
| Architecture, layering, API service shape, routing gates | `.claude/docs/architecture.md` |
| Angular / TypeScript standards | `.claude/docs/angular-standards.md` |
| Accessibility engineering rules | `.claude/docs/accessibility.md` |
| UI copy rules | `.claude/docs/ui-copy.md` |
| Cross-cutting policy and rationale | `.claude/SPEC.md` |

**One rule, one place.** If a rule already lives in `.claude/docs/`, this folder links to it rather
than restating it.

Earlier source versions of these documents are in git history (commit `0c786d5`). Record new
decisions only in the current files.

---

**Next:** [Accessibility →](./accessibility.md)
