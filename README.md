# 🎓 Skolenza

Multi-tenant institution management SPA built with **Angular 22** (zoneless, standalone, signals)
and **Optimus UI**.

- 🔗 Backend: [QuecksilberTechnologies/Skolenza.be](https://github.com/QuecksilberTechnologies/Skolenza.be)
- 📘 API docs: https://Skolenza-api.onrender.com/swagger/index.html
- 🐞 Issues: [QuecksilberTechnologies/Skolenza-app](https://github.com/QuecksilberTechnologies/Skolenza-app/issues)

---

## 🛠️ Tech Stack

| Area          | Technology                                          |
| ------------- | --------------------------------------------------- |
| 🅰️ Framework  | Angular 22 (zoneless, standalone, OnPush)           |
| 📡 State      | Angular signals, NgRx Signal Store                  |
| 📝 Forms      | Signal Forms + zod                                  |
| 🎨 UI         | `@openng/optimus-ui` v2 (PrimeNG-compatible)        |
| 💨 Styling    | Tailwind CSS 4                                      |
| 🔷 Icons      | Lucide Angular, OpenNG Icons                        |
| 📈 Charts     | Chart.js, FullCalendar                              |
| ✍️ Editor     | Tiptap                                              |
| 🌍 i18n       | ngx-translate                                       |
| 📱 PWA        | Angular Service Worker                              |
| 🚨 Monitoring | Sentry                                              |
| 🧪 Testing    | Vitest (unit, jsdom), Playwright (e2e)              |
| 🔍 Tooling    | ESLint + angular-eslint, Oxfmt, Husky + lint-staged |

---

## 🏁 Getting Started

### 📋 Prerequisites

- [Bun](https://bun.sh/) 1.3.11 🥟
- [Git](https://git-scm.com/) 🐙

### 📦 Installation

```bash
git clone https://github.com/QuecksilberTechnologies/Skolenza-app.git
cd Skolenza-app
bun install
bun start
```

The app runs at [http://localhost:4200](http://localhost:4200) 🌐. API URLs are set in
`src/environments/`.

### 🔧 Available Scripts

| Script                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `bun start`            | 🚀 Start the dev server                      |
| `bun run build`        | 📦 Production build                          |
| `bun run watch`        | 👀 Development build in watch mode           |
| `bun run test`         | 🧪 Unit tests (Vitest)                       |
| `bun run e2e`          | 🎭 Playwright e2e tests (mocked backend)     |
| `bun run e2e:ui`       | 🖱️ Playwright interactive mode               |
| `bun run lint`         | 🔍 ESLint                                    |
| `bun run format`       | 💅 Format with Oxfmt                         |
| `bun run format:check` | ✅ Check formatting                          |
| `bun run analyze`      | 📊 Production build + bundle size analysis   |
| `bun run clean`        | 🧹 Remove `node_modules`, `.angular`, `dist` |

Run a single unit spec:

```bash
bun run test -- --include src/app/core/stores/auth.store.spec.ts
```

---

## 🏗️ Project Structure

```
src/
├── app/
│   ├── core/           🔒 Services (pure HTTP wrappers), root signal stores, guards
│   ├── features/       📂 Lazy-loaded feature pages, one flat folder per feature
│   ├── layout/         📐 App shell: header, aside menu
│   └── shared/         🧩 Presentational components, interfaces, pipes, validators
├── environments/       ⚙️ Environment configuration
└── styles.css          🎨 Global styles
e2e/                    🎭 Playwright specs and network mocks
docs/                   📚 Design system, specs, testing notes, archived components
```

---

## 🔐 Access Control

Routes use two independent guards:

- 🛡️ `roleTypeGuard([...])`: coarse gate by role type
- 🔑 `hasModulePermissionGuard('<Module>')`: fine-grained gate from the permission matrix

> ⚠️ `moduleKey` strings must match the backend `moduleName` (case-insensitive).

---

## 🤝 Contributing

- 📖 Read `AGENTS.md` before changing code.
- 🔒 Behavior listed in the backend `LOCKED_FIXES.md` must not change without explicit approval.
- 🗄️ Files ending in `_old.md` are read-only legacy reference.
