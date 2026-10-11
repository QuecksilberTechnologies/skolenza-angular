# AxionPro Device Configuration — Docs Index

All specs for the AiFace-style physical device: provisioning, Host/Tenant configuration UI, and the Angular integration contract. Grouped here on 2026-09-12 from loose files that were previously scattered directly under `docs/specs/`.

## Suggested reading order

1. `device-initial-configuration-report.md` — implementation report for the secure, outbound-HTTPS device provisioning flow (the initial `/api/initial/...` route).
2. `device-configuration-ui-developer-handoff.md` — technician/physical-device prerequisites checklist, written for the UI developer building on top of provisioning.
3. `axionpro-device-configuration-ui-api-handoff.docx` / `axionpro-device-configuration-ui-api-handoff-local.docx` — earlier Word handoffs for the Device Configuration UI/API (local vs. shared variants — check which one has the latest edits before relying on either).
4. `axionpro-device-ui-api-developer-guide.docx` — the later, consolidated Developer Guide for the Device UI/API.
5. `axionpro-device-angular-handoff.md` — Angular integration contract for building Host/Tenant device-management screens against the existing APIs.
6. `tenant-device-runtime-settings-ui-handoff.md` — scope for the Tenant device runtime-configuration screen specifically (location, gateway, local Web UI/API, System/Local-Manager PIN).

## screenshots/

Reference screenshots and device photos pulled out of the flat `docs/specs/` folder, renamed to `YYYY-MM-DD-screenshot-NN.png` / `-whatsapp-NN.jpeg` in chronological order (originals were unlabeled `image.png` / `image (N).png` / WhatsApp exports, so names are sequence-only, not content descriptions). Four exact-duplicate re-exports of screenshots 08–11 (originally `image.png`, `image (1).png`, `image (2).png`, `image (3).png`) were dropped as redundant copies.

## Note on the two Word handoffs

`axionpro-device-configuration-ui-api-handoff.docx` and `-local.docx` look like two versions of the same handoff (created ~90 seconds apart on 2026-09-06). Both are kept since content wasn't diffed, but worth a manual check for which one is authoritative before deleting either.
