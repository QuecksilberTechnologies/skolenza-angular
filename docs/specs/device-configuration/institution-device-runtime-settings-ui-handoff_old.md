# Tenant device configuration — Angular UI handoff

## Scope and boundaries

This screen is for an **assigned Tenant device** only. It gives a Tenant
administrator control of the device's runtime configuration, location,
outbound HTTPS gateway, local Web UI/API access, and the physical
System/Local-Manager PIN.

Do not use this screen for Employee/user enrollment, user add/update, or
attendance administration. Those remain in their dedicated controllers.

Never display or send a numeric Tenant-device/configuration ID. Use the
opaque `id` / `tenantDeviceId` token returned by the Tenant device APIs. Do
not render `deviceMasterName`, `deviceMasterModelNo`, `deviceMasterSNo`, or a
device serial number in the Tenant UI.

Every Tenant runtime request below requires the normal authorization header
plus the `moduleId` and `operationId` fields for the
`TENANT_DEVICE_CONFIGURATION` permission. The authenticated Tenant in the
access token is authoritative; do not let a Tenant screen choose another
Tenant by changing a body value. A Host-only request that selects a Tenant
uses the existing opaque `tenantId` contract. Every settings request also
needs the opaque `tenantDeviceId` and `currentWebServerPassword` fields. The
latter is an input-only field: keep it masked, do not persist it in browser
storage, and clear it from the form after the request completes.

### Permission enforcement (backend)

The API does not rely on Angular button visibility. Every MediatR request in
this feature is registered in
`TenantDeviceConfigurationPermissionBehavior&lt;TRequest,TResponse&gt;` and is
checked in this order:

1. validate the authenticated principal from the access token;
2. read the supplied module ID and require its server-side code to equal
   `TENANT_DEVICE_CONFIGURATION`;
3. require an authenticated Tenant employee and resolve the Tenant, employee,
   and current role from the trusted request context;
4. call `CheckTenantEmployeePermissionAsync(tenant, employee, role, module,
operation)`; and
5. proceed only when the database function returns its allow result. A denied
   operation stops before the command handler or command queue runs.

Host principals are denied these assigned-device runtime endpoints. Their
scope remains inventory assignment and initial provisioning only.

## Command-delivery model

All setting changes are durable server-side queue items; Angular never sends
vendor JSON or calls a device LAN address.

| Device transport | Delivery                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HTTPS            | The device fetches the next queued command during its own outbound heartbeat poll. The server does not open a connection to the device.                |
| MQTTS            | The queue can be published immediately with the explicit manual endpoint below. It still uses the already queued command, never a raw Angular payload. |

The existing central MQTT dispatcher remains enabled for the application's
pre-existing MQTT/MQTTS command flows. It never handles HTTPS settings; those
are delivered only by the device heartbeat poll. The manual MQTTS endpoint is
an additional controlled dispatch path and can race the normal broker worker,
so the UI should use it only when an immediate publish is required.

A successful settings API result means **queued**, not necessarily applied.
Show the returned command tracking values, then refresh the device status and
command history until it is completed or failed. Diagnostic message logs and
stored command responses redact password, PIN, token, and other credential
fields.

### Queue retention and status lifecycle

Queued command rows are **not auto-deleted**. They remain as the audit and
retry record. The lifecycle is:

`Queued` → `Publishing` → `AwaitingResponse` → `Completed`

or, when a broker/publish/response deadline fails:

`Publishing` → `RetryScheduled` → `Publishing` (up to the attempt limit) →
`Failed`.

Publish-only commands go from `Publishing` directly to `Completed`. The
outbound `DeviceMessageLog` and the redacted device response are retained as
well; there is no queue worker that removes the command row after delivery.

### Transport resolution

Angular does not submit `transport`, `mqtt`, `mqtts`, or `https` for a setting.
The backend decodes the opaque `tenantDeviceId`, loads that Tenant device's
stored `TenantDeviceConfiguration`, and resolves its configured
`CommandTransport` (falling back to the legacy `MqttTransport` only when the
new field is absent). The queue dispatcher then filters by that stored
transport. This prevents a caller from routing a command to a different
transport by changing a request field.

The older connection-record `create`/`update` routes still exist for the
transport/gateway record itself (and therefore expose transport fields for
that setup contract). They are not the runtime-settings form. Once the record
exists, every `settings/*`, location, URL-replacement, and manual-dispatch
request is transport-neutral from Angular's point of view.

## Dropdown data APIs

Do not hard-code firmware numbers in Angular. Call the matching endpoint when
the corresponding card first opens (cache the result for that browser session).
Each response is `data[]`, with `key`, `label`, and `options[]` (`value`,
`label`).

| Angular card / section             | Call when opened            | Dropdown endpoint                              |
| ---------------------------------- | --------------------------- | ---------------------------------------------- |
| Time and scheduled reboot          | Time card opens             | `GET /api/device-ddl-options/time`             |
| Bell settings                      | Bell card opens             | `GET /api/device-ddl-options/bell`             |
| Screen, voice, and recognition     | Device setup card opens     | `GET /api/device-ddl-options/device-setup`     |
| Verification, QR, and camera       | Advanced card opens         | `GET /api/device-ddl-options/advanced`         |
| Door, Wiegand, and access settings | Lock card opens             | `GET /api/device-ddl-options/lock`             |
| Serial port                        | Serial card opens           | `GET /api/device-ddl-options/serial`           |
| Ethernet                           | Ethernet card opens         | `GET /api/device-ddl-options/ethernet`         |
| Wi-Fi                              | Wi-Fi card opens            | `GET /api/device-ddl-options/wifi`             |
| App notification                   | App notification card opens | `GET /api/device-ddl-options/app-notification` |

The dropdown labels are deliberately human-readable. The selected `value` is
submitted in the typed request below; the backend maps it to the vendor field.

## Settings APIs

All endpoints below are `POST /api/TenantDeviceConfiguration/...` and return a
queued-command response. Send only the fields of the requested typed DTO plus
the common permission/device fields.

| UI card                   | Endpoint                    | User-facing fields                                                                                                                                                                      |
| ------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Time                      | `settings/time`             | Clock/date format, DST and start/end dates, network time, timezone, three scheduled reboot times.                                                                                       |
| Set clock now             | `settings/time/sync`        | Optional `utcDateTime`; leave absent to use server UTC now.                                                                                                                             |
| Bell                      | `settings/bell`             | Bell count, ring pattern, bell output.                                                                                                                                                  |
| Device setup              | `settings/device-setup`     | Language, voice volume/name announcement, multi-face detection, result/screen-saver/sleep timing, wake-up method, recognition distance, result style, liveness, avatar.                 |
| Advanced                  | `settings/advanced`         | Maximum admins, verification/QR/privacy options, face/liveness/fingerprint/palm thresholds, mask settings, fill light, exposure, disable-face and online-debug switches.                |
| Lock / access hardware    | `settings/lock`             | Door delay/sensor/access controls, anti-passback, Wiegand/card formats and reversals, interlock/alarm, failure limits, access logging options.                                          |
| Serial                    | `settings/serial`           | Device address, network port, baud rate, serial function.                                                                                                                               |
| Ethernet                  | `settings/ethernet`         | DHCP, IP/subnet/gateway/DNS when static, hide-IP. Do not send static values while DHCP is selected.                                                                                     |
| Wi-Fi                     | `settings/wifi`             | DHCP, IP/subnet/gateway when static. Do not send static values while DHCP is selected.                                                                                                  |
| App notification          | `settings/app-notification` | Enabled switch, app token, notification frequency. Treat app token as a password.                                                                                                       |
| Local Web UI/API          | `settings/web-access`       | `localWebServerEnabled`; optional `newWebServerPassword` to rotate the device Web UI/API password. The old password is supplied in `currentWebServerPassword` to authorize this change. |
| Physical System-menu lock | `settings/screen-menu-pin`  | `screenMenuPin` (numeric input, 4–12 digits). This changes the device's Local-Manager/System-menu PIN; it does not hide the System menu.                                                |

For all cards except location, include `currentWebServerPassword`. It is sent
only inside an encrypted-at-rest queue item and is not included in the API
response or stored diagnostics.

### Location

Use `POST /api/TenantDevice/update-location` with the opaque
`tenantDeviceId`, a Tenant-owned `tenantLocationId`, and permission fields.
This changes only the assigned Tenant location. It cannot change the Host
inventory DeviceMaster assignment.

## HTTPS gateway address and replacement

`GET /api/TenantDeviceConfiguration/gateway-address/{tenantDeviceId}` returns
only safe metadata: server base URL/path/port and whether an active or pending
gateway exists. It intentionally does **not** return the complete current
gateway URL because its trailing bearer token is stored only as a hash.

To remotely change an existing HTTPS device URL without changing its
heartbeat, use:

```text
POST /api/TenantDeviceConfiguration/replace-https-gateway-url
```

Send the common settings fields plus `replacementLifetimeMinutes` (5–1440).
The backend creates a pending one-time URL and queues the corresponding device
configuration through the **still active** gateway. It does not show the raw
replacement URL to the browser. The old address remains valid until the
device's first successful poll on the pending address; only then is the new
address promoted and the old one revoked. Show `isReplacementPending` and
`replacementExpiresDateTime` from `gateway-address` while waiting.

Do not use the old rotate endpoint for a remote replacement: it invalidates
the old address immediately and is for a technician who will enter a fresh URL
on the physical device.

## Explicit MQTTS delivery

For a device whose configured command transport is MQTTS, the UI may show a
**Dispatch next queued command now** button:

```text
POST /api/TenantDeviceConfiguration/dispatch-mqtts-now
```

Its request contains the opaque `tenantDeviceId` and permission fields only.
It accepts no command name, payload, password, or broker credential. The
response has `wasDispatched` and a message. HTTPS devices must not show this
button: their queue is delivered through the next heartbeat poll.

## Suggested UI states

1. Disable every submit button while its request is in flight.
2. On `queued`, show “Waiting for device heartbeat” for HTTPS, or “Queued for
   secure MQTT” for MQTTS; do not show “Saved on device” yet.
3. On a command failure, show the server's non-sensitive failure message and
   retain non-secret form values for correction. Never repopulate passwords,
   PINs, or app tokens.
4. For network, Web UI/API, and physical menu PIN changes, show a confirmation
   dialog because the change may alter future technician access.
5. Angular must never call `http://<device-ip>/...`; all device action goes
   through AxionPro APIs and the durable command queue.

## Database deployment

Before deploying the remote HTTPS replacement feature, apply
`database-scripts/AddPendingHttpsGatewayReplacement.sql`. It adds the pending
gateway hash/expiry columns and the uniqueness constraint used to safely
promote a replacement after the device confirms it.

## Automated tests

`axionpro.automationtests/Unit/TenantDeviceConfigurationPermissionBehaviorTests.cs`
verifies the permission behavior for the new typed Web UI/API settings,
manual MQTTS dispatch, and remote gateway replacement requests. It covers the
allowed path plus wrong-module and denied-operation rejection before a handler
can run.

Run only these tests with:

```powershell
dotnet test .\axionpro.automationtests\axionpro.automationtests.csproj --filter "FullyQualifiedName~TenantDeviceConfigurationPermissionBehaviorTests"
```

---

# Complete Angular API flow — use this section to implement the screens

This is the operational sequence for a new physical device through to normal
Tenant administration. It is intentionally based on the routes that exist in
this repository today; it does not describe mock APIs or an Angular-to-device
LAN connection.

## 1. API base, headers, response envelope, and identifiers

Configure the base URL in the Angular environment, never in a component. The
current hosted deployment base is `https://axionpro-api.onrender.com`; local
development normally uses `http://localhost:5170`.

Every **Angular** request in this document uses:

```http
Authorization: Bearer <logged-in-user-access-token>
Content-Type: application/json
```

Every normal API response uses this shape:

```json
{
  "isSucceeded": true,
  "message": "Human-readable result",
  "data": {},
  "errors": [],
  "errorCode": null
}
```

Use the casing returned by the actual API serializer if the Angular project is
configured differently; the DTO property names documented below are the API
contract.

| Value                                                                           | UI rule                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tenantDeviceId`                                                                | Opaque token returned in `TenantDeviceResponseDTO.id` or configuration response `tenantDeviceId`. Store it as a string; never parse it or replace it with a database number.                                  |
| `tenantDeviceConfigurationId` / `id`                                            | Opaque configuration token. Use it only for `get-by-id`, `update`, delete, and legacy physical URL rotation.                                                                                                  |
| `deviceMasterId`                                                                | Host inventory-only numeric ID. It must never appear in a Tenant runtime screen.                                                                                                                              |
| `moduleId`, `operationId`                                                       | Use the permitted IDs loaded for the logged-in user. Do not hard-code `49`, `4`, or any other numeric ID in Angular. The server verifies the real module code and role permission.                            |
| `currentWebServerPassword`, `newWebServerPassword`, `screenMenuPin`, `appToken` | Input-only secrets. Mask them, do not log them, do not store them in local/session storage, and clear the form after request completion. Use placeholders in development fixtures; never commit a real value. |

Tenant runtime requests are scoped to the Tenant in the access token. A Tenant
screen must not send or edit a different Tenant ID. Host-only assignment or
bootstrap screens use the existing protected `tenantId` value when they select
a Tenant.

In JSON samples below, `123` and `456` are valid-shape example integers only.
The UI must replace them with the permitted module and operation IDs loaded for
the current user; the examples must never be hard-coded into Angular.

## 2. End-to-end decision flow

```text
Host inventory device (unassigned)
  -> Host creates a one-time bootstrap URL
  -> Technician enters that URL in the physical device
  -> Device begins outbound HTTPS polling
  -> Host assigns physical device to a Tenant + location
  -> Tenant creates its one connection record (first time only)
  -> Tenant runs initial HTTPS handoff once
  -> Device receives permanent opaque gateway URL on its next bootstrap poll
  -> Device polls permanent gateway; bootstrap URL is revoked
  -> Tenant uses typed runtime setting cards; each action enters DeviceCommand queue
  -> HTTPS device receives the next command on next heartbeat
     OR MQTTS device publishes from the secure broker path
```

Do **not** reorder the first three steps: `issue-bootstrap-url` is intended
for an active, unassigned physical device. Do **not** call a device local URL
from Angular at any point.

## 3. Host / technician onboarding flow

This part is not shown on the normal Tenant runtime-settings page.

| Step | UI role and situation                                     | Full endpoint                                                                                         | What the UI sends / does                                                                                                                                                                                                                                                                                      |
| ---- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1   | Host selects an unused physical model/device              | `GET {API_BASE_URL}/api/DeviceMaster/get-all?isActive=true&isOccupied=false&pageNumber=1&pageSize=50` | Use Host inventory only. `DeviceMaster` information is not carried into the Tenant UI.                                                                                                                                                                                                                        |
| H2   | Host creates bootstrap route before assignment            | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/issue-bootstrap-url`                               | Body: `{ "deviceMasterId": 99, "lifetimeMinutes": 120, "moduleId": 123, "operationId": 456 }`. Save/display `data.initialGatewayUrl` only in this Host/technician handoff once.                                                                                                                               |
| H3   | Technician has physical device open                       | No Angular API call                                                                                   | In the device **Comm set → Server** screen: enable Server Request and domain name, paste the complete `initialGatewayUrl` into Domain Name, set server port `443`, set the heartbeat returned by H2, and save. The device—not Angular—then calls `POST {API_BASE_URL}/api/initial/{serial}/{one-time-token}`. |
| H4   | Host assigns device to Tenant and Tenant location         | `POST {API_BASE_URL}/api/TenantDevice/create`                                                         | Host assignment body contains protected `tenantId`, `tenantLocationId`, `deviceMasterId`, `deviceCode`, optional display/install fields, `isAttendanceDevice`, `isActive`, `moduleId`, and `operationId`. Response `data.id` is the opaque Tenant-device token to retain in the Host workflow.                |
| H5   | Tenant creates first connection record after H4           | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/create`                                            | See **first connection record** below. This is a setup record, not a runtime card.                                                                                                                                                                                                                            |
| H6   | Tenant switches from bootstrap route to permanent gateway | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/apply-runtime-configuration`                       | Call exactly once while the HTTPS device is still on its bootstrap URL and no active permanent gateway exists. See **initial HTTPS handoff** below.                                                                                                                                                           |

### First connection record — one time only

The current backend requires a connection record before it can route queued
commands. The API is:

```http
POST {API_BASE_URL}/api/TenantDeviceConfiguration/create
```

For an HTTPS device, the body is shaped as follows:

```json
{
  "tenantDeviceId": "<opaque-tenant-device-id>",
  "commandTransport": 4,
  "serverUrl": "https://axionpro-api.onrender.com",
  "serverPath": "/device-gateway",
  "serverPort": 443,
  "heartbeatIntervalSeconds": 20,
  "isEnrollmentEnabled": true,
  "isAttendancePushEnabled": true,
  "isAutoSyncEnabled": true,
  "moduleId": 123,
  "operationId": 456
}
```

`4` is the stored backend code for HTTPS. It is required only while creating
or editing the **connection record**. Do not put a transport selector in the
normal Tenant runtime-settings UI. All typed runtime endpoints resolve the
transport from this stored record using `tenantDeviceId`.

Current implementation note: the connection-record endpoint is an existing
setup contract and it still accepts `commandTransport`/legacy `mqttTransport`.
If the product requires even first-time connection setup to have no Tenant
transport selection, the backend needs a separate Host/system seeding command;
that automatic creation endpoint does not currently exist.

### Initial HTTPS handoff — one time only

Call this only after the device is assigned, its HTTPS connection record exists,
and the device is still polling the Host-issued bootstrap URL:

```http
POST {API_BASE_URL}/api/TenantDeviceConfiguration/apply-runtime-configuration
```

```json
{
  "tenantDeviceId": "<opaque-tenant-device-id>",
  "currentWebServerPassword": "<current-device-web-ui-api-password>",
  "heartbeatIntervalSeconds": 20,
  "volume": 8,
  "rebootAfterApply": true,
  "moduleId": 123,
  "operationId": 456
}
```

The response contains `configurationCommandId`,
`configurationTrackingId`, optional reboot tracking, and `status: "Queued"`.
On the next bootstrap poll, the device receives a protected command containing
its permanent opaque `/device-gateway/{token}` URL. On its first successful
permanent-gateway poll the old bootstrap route is revoked.

Do not use this legacy handoff route as the normal settings form. It does not
control Local Web UI/API enablement or password change; use the typed
`settings/web-access` route for that.

## 4. Tenant page-load flow

Run these calls in the shown situation. The config and device token are opaque
strings returned by prior responses.

| Situation                                            | Full endpoint                                                                                                             | Call details                                                                                                                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant session/menu initializes                      | `GET {API_BASE_URL}/api/Tenant/get-all-tenant-operations?isActive=true`                                                   | Read the existing permitted operation metadata used by the Angular permission store. Find the module/operations authorised for `TENANT_DEVICE_CONFIGURATION`; do not invent module/operation IDs.                                                     |
| Device list page opens                               | `GET {API_BASE_URL}/api/TenantDevice/get-all?pageNumber=1&pageSize=50`                                                    | Send the current screen's permission query fields as required by the existing app. Use `data[].id`, `deviceCode`, `deviceName`, location display fields, `isActive`, and `hasConfiguration`; never use hidden DeviceMaster fields in a Tenant screen. |
| Configuration list/details screen opens              | `GET {API_BASE_URL}/api/TenantDeviceConfiguration/get-all?pageNumber=1&pageSize=50&moduleId=<id>&operationId=<id>`        | Filter with `tenantDeviceId=<opaque-token>` when needed. Use the returned opaque `id` and `tenantDeviceId`.                                                                                                                                           |
| One configuration record must be refreshed           | `GET {API_BASE_URL}/api/TenantDeviceConfiguration/get-by-id/{tenantDeviceConfigurationId}?moduleId=<id>&operationId=<id>` | This is the current device connectivity/telemetry read: `lastHeartbeatDateTime`, `lastSuccessfulConnectionDateTime`, `lastFailedConnectionDateTime`, and `lastConnectionError`.                                                                       |
| Gateway card opens or remote URL change needs status | `GET {API_BASE_URL}/api/TenantDeviceConfiguration/gateway-address/{tenantDeviceId}?moduleId=<id>&operationId=<id>`        | Returns safe gateway metadata only: `serverUrl`, `serverPath`, `serverPort`, `hasActiveGatewayUrl`, `isReplacementPending`, `replacementExpiresDateTime`. It never returns the bearer-token URL.                                                      |

## 5. Dropdown APIs — call only when the corresponding card opens

These are authenticated static-option APIs. They require the Bearer token but
not `moduleId`, `operationId`, device ID, password, or PIN. Cache each response
for the current browser session. The response is:

```json
{
  "data": [
    {
      "key": "verificationMode",
      "label": "Verification method",
      "options": [{ "value": "0", "label": "Any available method" }]
    }
  ]
}
```

Convert the selected `value` to a number when the matching request property is
an integer. Keep booleans as real JSON booleans, not `0`/`1` strings.

| Card opens                | Full endpoint                                                | Returns options for                                            |
| ------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| Time and scheduled reboot | `GET {API_BASE_URL}/api/device-ddl-options/time`             | Clock/date format, NTP, timezone.                              |
| Bell                      | `GET {API_BASE_URL}/api/device-ddl-options/bell`             | Ring style and bell output.                                    |
| Device setup              | `GET {API_BASE_URL}/api/device-ddl-options/device-setup`     | Language, wake-up method, display style, recognition distance. |
| Advanced                  | `GET {API_BASE_URL}/api/device-ddl-options/advanced`         | Verification method, QR mode, fill light.                      |
| Lock/access hardware      | `GET {API_BASE_URL}/api/device-ddl-options/lock`             | Door sensor, anti-passback, Wiegand, card display format.      |
| Serial                    | `GET {API_BASE_URL}/api/device-ddl-options/serial`           | Baud rate and serial function.                                 |
| Ethernet                  | `GET {API_BASE_URL}/api/device-ddl-options/ethernet`         | DHCP.                                                          |
| Wi-Fi                     | `GET {API_BASE_URL}/api/device-ddl-options/wifi`             | DHCP.                                                          |
| App notification          | `GET {API_BASE_URL}/api/device-ddl-options/app-notification` | Enablement and notification frequency.                         |

### Exact DDL-to-request binding

Use the DDL field `key` only for its matching JSON property below. Do not reuse
one section's code in another section.

| DDL endpoint        | Returned field key                                                                          | Submit it in                                                         |
| ------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `/time`             | `timeFormat`, `dateFormat`, `networkTimeEnabled`, `timeZone`                                | `POST .../settings/time` properties with the same names.             |
| `/bell`             | `ringStyle`, `bellOutput`                                                                   | `POST .../settings/bell` properties with the same names.             |
| `/device-setup`     | `language`, `screenWakeUpMethod`, `resultDisplayStyle`, `faceRecognitionDistance`           | `POST .../settings/device-setup` properties with the same names.     |
| `/advanced`         | `verificationMode`, `qrCodeMode`, `fillLightMode`                                           | `POST .../settings/advanced` properties with the same names.         |
| `/lock`             | `doorSensorMode`, `antiPassbackMode`, `wiegandOutput`, `wiegandFormat`, `cardDisplayFormat` | `POST .../settings/lock` properties with the same names.             |
| `/serial`           | `baudRate`, `serialFunction`                                                                | `POST .../settings/serial` properties with the same names.           |
| `/ethernet`         | `dhcpEnabled`                                                                               | `POST .../settings/ethernet.dhcpEnabled`.                            |
| `/wifi`             | `dhcpEnabled`                                                                               | `POST .../settings/wifi.dhcpEnabled`.                                |
| `/app-notification` | `appNotificationEnabled`, `notificationType`                                                | `POST .../settings/app-notification` properties with the same names. |

## 6. Runtime settings API contract

Every request in this section is a durable queue submission. Start each body
with this common shape and append **only** the fields listed for its card:

```json
{
  "tenantDeviceId": "<opaque-tenant-device-id>",
  "currentWebServerPassword": "<current-device-web-ui-api-password>",
  "moduleId": 123,
  "operationId": 456
}
```

All these routes return the same submission data shape:

```json
{
  "data": {
    "deviceCommandId": 123,
    "internalTrackingId": "<server-guid>",
    "status": "Queued"
  }
}
```

Display `internalTrackingId` as the user-support reference if needed. Do not
claim the setting has reached the physical device just because the status is
`Queued`.

| UI card / user action                               | Full endpoint                                                                 | Add these fields after the common body                                                                                                                                                                                                                                                                                                                                                                                                                                   | Client-side form rule                                                                                                                                      |
| --------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Time, DST, NTP, scheduled restarts                  | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/settings/time`             | `timeFormat`, `dateFormat`, `daylightSavingEnabled`, `daylightSavingStart`, `daylightSavingEnd`, `networkTimeEnabled`, `timeZone`, `rebootTime1`, `rebootTime2`, `rebootTime3`                                                                                                                                                                                                                                                                                           | `daylightSavingStart`/`End`: `M/d`; restart times: `HH:mm`; `00:00` disables that scheduled restart. Load the Time DDL first.                              |
| Set device clock now                                | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/settings/time/sync`        | Optional `utcDateTime` ISO UTC string. Omit it to use server UTC time.                                                                                                                                                                                                                                                                                                                                                                                                   | Do not calculate vendor timestamps in Angular.                                                                                                             |
| Bell configuration                                  | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/settings/bell`             | `bellCount`, `ringStyle`, `bellOutput`                                                                                                                                                                                                                                                                                                                                                                                                                                   | `bellCount` is 0–100. Load Bell DDL first.                                                                                                                 |
| Screen, voice, and face-recognition defaults        | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/settings/device-setup`     | `language`, `voiceVolume`, `announcePersonName`, `detectMultipleFaces`, `resultDisplaySeconds`, `screenSaverIdleSeconds`, `sleepModeSeconds`, `screenWakeUpMethod`, `faceWakeUpSeconds`, `resultDisplayStyle`, `faceRecognitionDistance`, `livenessDetectionEnabled`, `showAvatar`                                                                                                                                                                                       | Load Device setup DDL first. Voice is 0–10; wake-up seconds 0–10.                                                                                          |
| Verification, QR, privacy, face/camera settings     | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/settings/advanced`         | `maximumAdministrators`, `verificationMode`, `qrCodeMode`, `hidePrivacyInformation`, `faceMatchThreshold`, `livenessThreshold`, `fingerprintMatchThreshold`, `fingerprintsPerUser`, `maskDetectionEnabled`, `maskThreshold`, `fillLightMode`, `constantFillLightPeriod`, `exposureCompensation`, `palmVeinMatchThreshold`, `palmDetectionThreshold`, `disableFaceRecognition`, `onlineDebugEnabled`                                                                      | Load Advanced DDL first. Fill-light period is `HH:mm~HH:mm`. Debug must have a confirmation dialog.                                                        |
| Door, sensor, Wiegand and access hardware           | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/settings/lock`             | `doorOpenDelaySeconds`, `doorSensorMode`, `doorSensorDelaySeconds`, `blockStrangerAccess`, `doorPassword`, `requiredUsersForDoorOpen`, `antiPassbackMode`, `wiegandOutput`, `wiegandFormat`, `accessLimit`, `cardDisplayFormat`, `reverseCardPin`, `reverseWiegandOutput`, `externalWiegandSnapshotEnabled`, `interlockEnabled`, `alarmProcessingEnabled`, `failedVerificationLimit`, `timeZonePunchLimit`, `suppressAccessDeniedLog`, `denyOutsideNormallyOpenTimeZone` | Load Lock DDL first. Show a disruptive-change confirmation before submit.                                                                                  |
| Serial communication                                | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/settings/serial`           | `deviceAddress`, `networkPort`, `baudRate`, `serialFunction`                                                                                                                                                                                                                                                                                                                                                                                                             | Load Serial DDL first. Device address: 0–9999; port must be positive.                                                                                      |
| Ethernet network                                    | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/settings/ethernet`         | `dhcpEnabled`, `hideIpAddress`; if DHCP is `false`, also `ipAddress`, `subnetMask`, `gateway`, `dnsServer`                                                                                                                                                                                                                                                                                                                                                               | Static values must be valid IPv4. Disable/hide those inputs if DHCP is enabled. Confirm because connection may change.                                     |
| Wi-Fi network                                       | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/settings/wifi`             | `dhcpEnabled`; if DHCP is `false`, also `ipAddress`, `subnetMask`, `gateway`                                                                                                                                                                                                                                                                                                                                                                                             | Static values must be valid IPv4. Confirm because connection may change.                                                                                   |
| Third-party app notification                        | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/settings/app-notification` | `appNotificationEnabled`, `appToken`, `notificationType`                                                                                                                                                                                                                                                                                                                                                                                                                 | Load App notification DDL first. Require an app token when enabled; treat it like a password.                                                              |
| Local Web UI/API enable, disable, password rotation | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/settings/web-access`       | `localWebServerEnabled`, optional `newWebServerPassword`                                                                                                                                                                                                                                                                                                                                                                                                                 | Ask for the current password through the common field. New password is 4–128 characters when supplied. Confirm because technician local access may change. |
| Physical device System / Local Manager menu lock    | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/settings/screen-menu-pin`  | `screenMenuPin`                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Numeric 4–12 digits. This sets the physical menu PIN; it does not remove the System menu. Never redisplay the PIN after submit.                            |
| Reboot only                                         | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/reboot`                    | `tenantDeviceId`, `moduleId`, `operationId` only — no web password required                                                                                                                                                                                                                                                                                                                                                                                              | Confirm reboot. Result is queued; HTTPS reboot happens on the next heartbeat.                                                                              |

### Location is not a device command

When a Tenant changes only the business location of an assigned device, call:

```http
POST {API_BASE_URL}/api/TenantDevice/update-location
```

```json
{
  "tenantDeviceId": "<opaque-tenant-device-id>",
  "tenantLocationId": 123,
  "moduleId": 123,
  "operationId": 456
}
```

This does not enter the device command queue and does not alter the Host-owned
DeviceMaster assignment. The selected location must be active and belong to
the logged-in Tenant.

## 7. HTTPS URL situations — choose exactly one path

| Situation                                                                 | Full endpoint                                                                                                      | Body / result                                                                                                                                                                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Display current gateway safely                                            | `GET {API_BASE_URL}/api/TenantDeviceConfiguration/gateway-address/{tenantDeviceId}?moduleId=<id>&operationId=<id>` | Read safe base URL/path/port and active/pending flags. The full current URL cannot be read again because its final bearer token is deliberately unavailable.                                                   |
| Technician is physically present and will paste a replacement immediately | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/rotate-https-ingress-token`                                     | Tenant body: `{ "tenantDeviceConfigurationId": "<opaque-config-id>", "moduleId": 123, "operationId": 456 }`. The raw URL is returned once. This invalidates the old URL, so do not use for remote replacement. |
| Device is online remotely and URL must change without heartbeat change    | `POST {API_BASE_URL}/api/TenantDeviceConfiguration/replace-https-gateway-url`                                      | Common settings body plus `replacementLifetimeMinutes` (5–1440). It queues a protected replacement command through the current gateway and returns `Queued`, not the raw URL.                                  |

For remote replacement, poll the gateway-address endpoint at the device's
normal heartbeat interval until `isReplacementPending` becomes `false` or the
expiry passes. It becomes false only after the device successfully polls the
pending address; then the old token is revoked.

## 8. MQTTS manual dispatch situation

This route never accepts vendor JSON, an MQTT topic, a broker credential, or a
transport choice from Angular:

```http
POST {API_BASE_URL}/api/TenantDeviceConfiguration/dispatch-mqtts-now
```

```json
{
  "tenantDeviceId": "<opaque-tenant-device-id>",
  "moduleId": 123,
  "operationId": 456
}
```

Use it only when an already queued MQTTS command needs an immediate publish.
The backend decodes the device token, reloads its stored configuration, and
rejects the request if that device is not configured for MQTTS. HTTPS devices
must wait for their next heartbeat instead.

## 9. Live UI / polling rules — current real API behavior

There is currently no SignalR, SSE, WebSocket, or public command-history/status
read endpoint for this feature. Do not invent one in Angular.

| UI event                                                        | Actual call                                                                                                                                                                 | What the UI can truthfully show                                                                                 |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Screen first loads                                              | Configuration `get-by-id` and gateway-address                                                                                                                               | Current heartbeat/connection telemetry and gateway state.                                                       |
| A settings request returns `Queued`                             | Keep `internalTrackingId`; refresh configuration telemetry after one configured device heartbeat, then at most once per heartbeat (minimum 10 seconds, maximum 30 seconds). | “Queued / waiting for device heartbeat” for HTTPS. Do not say “applied” solely from HTTP 200.                   |
| `lastHeartbeatDateTime` changes                                 | Refresh the displayed connection timestamp.                                                                                                                                 | Device has contacted AxionPro. It is not a per-command success confirmation.                                    |
| `lastFailedConnectionDateTime` or `lastConnectionError` changes | Show the non-secret error/state.                                                                                                                                            | Connectivity needs attention.                                                                                   |
| Remote URL replacement pending                                  | Poll gateway-address once per heartbeat.                                                                                                                                    | “Replacement queued” while pending; “replacement confirmed” only when pending becomes false before expiry.      |
| MQTTS manual dispatch response                                  | Read `data.wasDispatched` and `message`.                                                                                                                                    | It means broker publish was attempted successfully; a required device response may still be pending internally. |

The durable backend queue internally retains command status transitions:
`Queued → Publishing → AwaitingResponse → Completed`, with retry/failure
states. The queue, outbound diagnostic log, and redacted response audit are
retained. A dedicated read API for individual command status is not yet part
of the public UI contract; add one server-side before building a screen that
claims precise per-command completion history.

## 10. Error and permission behaviour for Angular

| HTTP/result                | UI handling                                                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `401` / `UNAUTHORIZED`     | Clear authenticated session as the existing app does and send user to login.                                                                              |
| `403` / permission denied  | Hide/disable the action from permission metadata and show “You do not have permission.” Do not retry the command.                                         |
| `400` / `VALIDATION_ERROR` | Keep non-secret values, show the API message by its field/card, and clear secret fields.                                                                  |
| `404`                      | Device/configuration is unavailable in this Tenant scope. Refresh the list; never try another opaque ID.                                                  |
| `409`                      | A conflicting configuration action exists—for example a still-pending remote URL replacement. Refresh gateway state rather than creating another request. |
| `200` + `status: Queued`   | It is a queue acknowledgement, not device completion. Follow section 9.                                                                                   |

The server-side behavior is not based on Angular visibility. For every Tenant
device-configuration route it validates the access token, requires the module
code `TENANT_DEVICE_CONFIGURATION`, resolves the current Tenant employee and
role, and calls the database permission check before a handler or queue entry
can run.

## 11. Backend data ownership — UI must not access these tables directly

| Backend table/entity                           | Purpose in this flow                                                   | UI exposure                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `DeviceMaster`                                 | Host inventory and physical model capability.                          | Host only; DeviceMaster brand/model/serial stays out of Tenant runtime screens.    |
| `TenantDevice`                                 | Tenant assignment, code/name, active state, location.                  | Use its opaque `id` only.                                                          |
| `TenantDeviceConfiguration`                    | Stored transport, server metadata, heartbeat and connection telemetry. | Read through configuration/gateway APIs; runtime settings do not submit transport. |
| `DeviceInitialProvisioning`                    | One-time Host bootstrap route.                                         | Raw bootstrap URL is Host/technician-only and appears only once.                   |
| `DeviceCommand`                                | Durable queued setting/reboot work.                                    | Submission returns queue reference only; no direct table/API access from Angular.  |
| `DeviceMessageLog` and `DeviceCommandResponse` | Redacted outbound/inbound audit data.                                  | No direct Tenant UI route in the current contract.                                 |

## 12. Private device-only routes — never call from Angular

| Route                                                                 | Caller                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `POST {API_BASE_URL}/api/initial/{deviceSerialNumber}/{oneTimeToken}` | A fresh physical device during Host bootstrap only.                                          |
| `POST {API_BASE_URL}/device-gateway/{opaqueIngressToken}`             | A configured physical HTTPS device heartbeat only.                                           |
| `http://<device-lan-ip>/...`                                          | Never Angular. It is technician-only local access and must not be used by this product flow. |
