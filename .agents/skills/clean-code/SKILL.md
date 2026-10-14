---
name: clean-code
description: >-
  Clean-code rubric - naming, comments and formatting, function size and levels
  of abstraction, nesting, error handling, objects/classes and SOLID. Use when
  refactoring, reviewing code for quality, or asked "is this clean?".
---

# Clean Code

Readable, maintainable code beats clever code. Clean code is written by
**iterating** — first make it work, then make it read well. Apply the rules
below when writing new code and use them as a review rubric for existing code.

Language-agnostic. Examples are in JavaScript/TypeScript for brevity; translate
the idea to whatever language is in front of you.

## How to use this skill

- **Writing new code** → follow every section as you go, then run the
  Checklist at the end before presenting the code.
- **Reviewing / refactoring** → walk the Checklist top to bottom, flag each
  violation with the rule it breaks, and show a corrected before/after. Change
  behavior only when asked; otherwise refactor for readability without altering
  what the code does.
- Keep suggestions concrete. Point at the exact name, line, or nesting level and
  give the improved version, not just the principle.

---

## 1. Naming

A name's only job is to **describe** what a variable holds or what a function
does. Poor names undermine every other clean-code technique.

- **Variables & properties → nouns** (they hold data): `user`, `product`,
  `transaction`, `database`. For booleans use a yes/no adjective phrase:
  `isValid`, `isLoggedIn`, `didAuthenticate`, `emailExists`.
- **Functions & methods → verbs** (they do things): `login()`, `createUser()`,
  `database.insert()`, `sendRequest()`. Boolean-producing functions can be
  adjective phrases: `isValid(...)`, `isEmpty(...)`. Avoid property-sounding
  names like `email()` — prefer `getEmail()`.
- **Classes → nouns** describing the object created: `User`, `Product`,
  `Transaction`, `RootAdministrator`.
- **Be as specific as the context allows.** Prefer `customer` over `user` when
  the code does customer-specific work; `createUser()` over `create()`.
- **Avoid generic names** like `handle()`, `process()`, `data`, `item`. Make
  them specific (`processTransaction()`) or pick a real noun (`product`).
- **Never mislead.** A name must not imply something the code doesn't do.
- **Be consistent.** Pick one verb per concept and stick to it — don't mix
  `fetchUsers()` and `getProducts()` in the same codebase.

```js
// Bad                          // Good
const d = getData();            const activeCustomers = getActiveCustomers();
function handle(u) { ... }      function deactivateUser(user) { ... }
class Manager { ... }           class PaymentProcessor { ... }
```

## 2. Comments & Formatting

Most comments are a liability, not an asset. **Formatting** does far more for
readability.

### Avoid these comments

- **Dividers/markers** (`// ===== CLASSES =====`) — noise; clean names already
  signal structure.
- **Redundant comments** (`// creating a user` above `createUser()`) — they
  restate what the code says.
- **Commented-out code** — delete it; source control remembers.
- **Misleading comments** — the worst kind; a comment that contradicts the code
  forces a full re-read to learn the truth.

### Acceptable comments (use sparingly)

- **Legal/required** headers (`// (c) Academind GmbH`).
- **Required explanations** where the code genuinely can't self-document — e.g.
  the intent of a regular expression.
- **Warnings** (`// requires local dev server`).
- **TODOs** — occasional and IDE-discoverable, not a wall of them.

### Vertical formatting

- **Add blank lines** between distinct concepts; the same code with breathing
  room reads far easier.
- **Vertical density** — keep closely-related statements together (no blank line
  between building an object and saving it).
- **Vertical distance** — separate unrelated concepts (e.g. validation vs.
  persistence) with a blank line.
- **Stepdown rule** — a called function should sit just below its caller, so the
  file reads top-to-bottom.
- Split large files (many classes/concepts) across multiple files with
  imports/exports.

### Horizontal formatting

- **Keep lines short.** Break long expressions across multiple lines even if
  they technically fit the screen.
- **Don't over-specify names.** `loggedInUser` beats
  `loggedInUserAuthenticatedByEmailAndPassword`.
- Use indentation to express scope.

## 3. Functions

The heart of any codebase. Design them around parameters, size, and one job.

### Minimize parameters

Fewer is better. 0–1 params are easy; 2 can be fine; **more than two should
usually be avoided** because call order and meaning get murky
(`createRectangle(10, 9, 30, 12)`). When a function truly needs a lot of data,
**pass one object/map** instead:

```js
createRectangle({ x: 10, y: 9, width: 30, height: 12 });
```

### Keep functions small & do one thing

A smaller body is less to read and forces you to extract well-named helpers.
"One thing" = every operation in the body sits on **one level of abstraction**,
exactly **one level below** the level implied by the function name.

- **Don't mix levels of abstraction** — high-level calls (`printer.print()`)
  next to low-level fiddling (`uri === ''`, `console.log`) reads badly. Push the
  low-level steps into a helper (`readFromFile()`, `showError()`).
- **Two rules of thumb for when to extract:**
  1. Extract code that works on the same functionality / is closely related.
  2. Extract code that requires more interpretation than the surrounding code.

```js
// Mixed levels + doing too much        // Clean: one level, one thing each
function login(email, password) {       function login(email, password) {
  if (!email.includes('@') ||             validateUserInput(email, password);
      password.length < 7) { ... }        const user = findUserByEmail(email);
  const user = db.find('users', ...);     user.validatePassword(password);
  if (!user) { ... }                    }
  if (user.password === password){...}
}
```

### Don't over-split

Extraction is not free. **Avoid pointless extractions.** An extraction is a
smell when: (1) you're just renaming the operation, (2) it makes the reader
scroll/jump around more, or (3) you can't find a reasonable name that isn't
already taken. Split to clarify, never for its own sake.

### Stay DRY & avoid unexpected side effects

- Don't repeat yourself — factor duplication into shared helpers.
- A **side effect** changes state (DB, memory, I/O). Side effects are normal;
  **unexpected** ones are the problem. `validateUserInput()` that secretly calls
  `createSession()` is a trap. Move the side effect into an appropriately named
  function, or rename the function to advertise it.

## 4. Control Structures & Errors

- **Prefer positive checks** — `if (isEmpty(x))` reads easier than
  `if (!hasContent(x))`. Exception: a short negative can beat a contrived
  positive, especially when there are many states (checking "not open" beats
  enumerating closed/unknown/…).
- **Avoid deep nesting** — it's unreadable and error-prone. Tools to flatten:
  1. **Guards / fail fast** — invert nested conditions into early
     `return`/`throw` at the top of the function.
  2. **Extract control structures & logic** into separate functions.
  3. **Polymorphism & factory functions** — replace repeated
     type-check `if`s with a factory that returns a polymorphic object.
  4. **Embrace real errors** instead of "synthetic" error codes + `if` chains.

```js
// Deeply nested                         // Guard + fail fast
function messageUser(user, message) {     function messageUser(user, message) {
  if (user) {                               if (!user || !message ||
    if (message) {                              !user.acceptsMessages) return;
      if (user.acceptsMessages) {           user.sendMessage(message);
        user.sendMessage(message);        }
      }
    }
  }
}
```

- **Embrace errors.** Don't invent error codes and branch on them; `throw` real
  errors and handle them with `try/catch`. Errors bubble up the call stack and
  cancel execution until handled — removing piles of `if`/`return`. Error
  handling is itself "one thing," so it often belongs in its own function.

## 5. Objects & Classes

### Objects vs. data containers

- A **real object** hides its data and exposes a public API of methods
  (`user.greet()`). Don't reach into its internals.
- A **data container / structure** just holds public data (`userData.name`).
  That's fine when a place genuinely needs data.
- **Don't mix the two.** Accessing another object's internals couples your code
  to its structure and breaks when that structure changes.

### Polymorphism over repeated type checks

When the same `if (type === ...)` checks recur with slightly different bodies,
replace them with specialized classes (or a factory returning a polymorphic
object) so each type owns its behavior and the type check happens **once**.

### Small classes, high cohesion

- **Small classes.** Size is measured by **number of responsibilities**, not
  lines. A `User` with a `refund()` method is doing too much — that belongs on
  `Payment`.
- **High cohesion** — methods should use the class's properties. If methods
  don't touch the properties, cohesion is low and the class probably wants to be
  a data container or be split into smaller, focused classes.

### Law of Demeter (principle of least knowledge)

Don't reach through objects: `this.customer.lastPurchase.date` is a violation. A
method may only use internals of: the object itself, objects held in its
properties, objects received as parameters, and objects it creates.

```js
// Violates Law of Demeter               // Better — and "tell, don't ask"
const date =                             this.warehouse
  this.customer.lastPurchase.date;         .deliverPurchase(customer.lastPurchase);
this.warehouse
  .deliverByDate(this.customer, date);
```

Note: this applies to **property/attribute chaining**, not real method chaining
(`customer.sendMessage(m).retry(2)` is fine). Chaining data-container properties
is also fine — exposing data is their whole purpose.

### SOLID

- **S — Single Responsibility.** A class changes for exactly one reason. Split a
  `ReportDocument` that both `generateReport()` and `createPDF()` into `Report`
  and `PDFPrinter`. (Biggest clean-code win, alongside OCP.)
- **O — Open/Closed.** Open for extension, closed for modification. Instead of
  editing a `Printer` every time a new document type appears, define a `Printer`
  interface and add new implementing classes (`WebPrinter`, `PDFPrinter`).
- **L — Liskov Substitution.** A subclass must be usable wherever its base is.
  `Penguin extends Bird` with a `fly()` it can't fulfill breaks this — model a
  `FlyingBird` layer instead. LSP is really about modeling data correctly.
- **I — Interface Segregation.** Many small, client-specific interfaces beat one
  fat one. Don't force `InMemoryDatabase` to implement `connect()` it can't use;
  split `Database` and `RemoteDatabase`.
- **D — Dependency Inversion.** Depend on abstractions, not concretions. Type
  against an interface (`Database`) rather than a concrete class, so
  implementations can be swapped. Mostly falls out of following the other four.

---

## Clean Code Checklist

Run this before presenting or approving code.

**Naming**
- [ ] Descriptive, meaningful names (nouns for variables/classes, verbs for functions)
- [ ] As specific as necessary and possible
- [ ] Yes/no phrasing for booleans (`isValid`)
- [ ] No misleading names
- [ ] Consistent terminology across the codebase

**Comments & Formatting**
- [ ] No redundant, divider, commented-out, or misleading comments
- [ ] Only good comments kept (legal, warnings, required explanations, sparse TODOs)
- [ ] Vertical formatting: density for related code, distance for unrelated, stepdown order
- [ ] Horizontal formatting: short lines, sensible indentation

**Functions**
- [ ] Few parameters (group into an object if many)
- [ ] Small and does one thing
- [ ] Single level of abstraction, one below the function name; levels not mixed
- [ ] No redundant/pointless splitting
- [ ] DRY
- [ ] No unexpected side effects

**Control Structures & Errors**
- [ ] Positive checks preferred
- [ ] No deep nesting (guards, extraction, polymorphism/factories)
- [ ] Real errors + error handling instead of synthetic error codes

**Objects & Classes**
- [ ] "Real objects" vs. data containers — not mixed
- [ ] Small classes, single responsibility
- [ ] High cohesion
- [ ] Law of Demeter respected for real objects
- [ ] SOLID applied (SRP & OCP give the most leverage)
