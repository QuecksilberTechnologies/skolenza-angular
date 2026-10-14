# Accessibility Requirements

- All UI MUST pass all AXE checks.
- All UI MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.
- ESLint runs `angular.configs.templateAccessibility` on every `.html` — failures there are a11y bugs, not style nits.
