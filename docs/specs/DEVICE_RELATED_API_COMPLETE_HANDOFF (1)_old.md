# AxionPro Device APIs — Complete Angular UI Handoff

**Analysis date:** 2026-09-13  
**Source of truth:** current backend source code in this repository. The supplied Swagger screenshots were used only to identify areas of interest.  
**Audience:** Host UI developer, Tenant UI developer, API integrator, QA.  
**Verification status:** static source-code analysis. This document does not claim deployed-environment or physical-firmware verification.

## 1. Executive answer and exact API count

There are **69 directly device-domain HTTP endpoints** in the current source when every small supporting endpoint is counted:

| API group | Count | Primary caller |
| --- | ---: | --- |
| `DeviceMaster` catalogue | 7 | Host admin |
| `TenantDevice` assignment/lifecycle | 7 | Host admin; scoped reads may also be used by Tenant |
| `TenantDeviceConfiguration` connection, settings and operations | 24 | Host admin and/or Tenant admin according to permission behavior |
| `device-ddl-options` | 12 | Angular forms |
| Generic `device-commands` submission | 1 | Authorized Host/Tenant administrative tooling; not normal typed settings UI |
| Device HTTPS gateway/private bootstrap | 2 | Physical device only, never Angular |
| `EmployeeDeviceEnrollment` | 10 | Tenant admin |
| `TenantCardMaster` | 6 | Host admin |
| **Direct total** | **69** | |

There are also **8 DeviceMaster bulk-import endpoints** under `/api/DeviceMaster/import`. Including those makes the broad operational total **77**. Generic supporting APIs such as MyMenu/permission discovery, Tenant list, Tenant Location list, Employee list and currency list are intentionally not added to 69 because they are shared platform APIs rather than device-domain APIs.

`GET /api/ClientInfo/detect-device` is also not included: despite its name, it detects the requesting browser/client context and is not a physical attendance-device API.

## 2. Non-negotiable Angular rules

1. Send `Authorization: Bearer <access-token>` to every authenticated API.
2. Never hard-code numeric `moduleId` or `operationId`. Resolve the current user's granted module/action IDs through the existing authenticated menu/permission pipeline. The values in examples below are placeholders.
3. Host requests carry the Host-selected opaque `tenantId` where the DTO supports it. Tenant-user requests derive Tenant scope from the authenticated token.
4. Treat opaque string IDs as opaque. Never parse, increment, cache raw database IDs or derive a device serial number from them.
5. Never call a device LAN IP from Angular. Commands move through AxionPro's durable queue.
6. `200` plus `status: "Queued"` means accepted into the queue; it does **not** mean the physical device applied it.
7. Secrets such as gateway bearer URLs, current/new WebServer passwords, PINs, face bytes, card numbers and app tokens must not be logged or retained in browser storage.

The common response envelope is conceptually:

```json
{
  "isSucceeded": true,
  "message": "...",
  "data": {},
  "errors": [],
  "errorCode": null,
  "pageNumber": null,
  "pageSize": null,
  "totalRecords": null,
  "totalPages": null
}
```

Use the actual casing configured by the deployed ASP.NET JSON policy. Representative JSON in this document uses camelCase.

## 3. Ownership and complete lifecycle

```text
Host creates DeviceMaster catalogue item
  -> Host optionally bootstraps an unassigned HTTPS-capable unit
  -> Host creates TenantDevice (assigns physical DeviceMaster to Tenant + location)
  -> Host creates TenantDeviceConfiguration (transport and connection metadata)
  -> Host issues/copies initial HTTPS gateway URL when required
  -> Tenant admin reads assigned devices in its own Tenant scope
  -> Tenant admin edits permitted runtime sections / reboots / rotates URL
  -> each mutation creates durable DeviceCommand work
  -> HTTPS: physical device polls gateway; MQTTS: worker publishes via broker
  -> device response updates command/audit/heartbeat state
  -> Tenant admin enrolls employee and Face/Card/PIN through typed APIs
```

Host assignment is not a separate `assign` endpoint. **`POST /api/TenantDevice/create` is the assignment operation**: it joins a Host `DeviceMaster` to an opaque Tenant and a Tenant location. Connection/runtime ownership then crosses a security boundary: the current permission behavior allows Host to read configuration and issue provisioning/gateway material, but it rejects Host runtime mutations. The Tenant admin creates or updates its own `TenantDeviceConfiguration` and queues its own settings so Tenant-only device credentials do not have to be disclosed to Host.

## 4. Recommended UI information architecture

### Host admin screens

1. **Device Catalogue** — list, create, edit, activate/deactivate, delete, bulk import.
2. **Tenant Device Assignments** — Tenant selector, location selector, DeviceMaster selector, assignment list/form, move location, status/delete.
3. **Connection Provisioning and Handover** — unassigned bootstrap URL, one-time gateway URL, read-only post-handover health metadata. Host must not collect or retain the Tenant's final device passwords.
4. **Tenant Card Inventory** — Host-purchased card catalogue, masked identifiers, purchase/tax information and lifecycle.
5. Optional advanced **Device Command Console** only if product owners explicitly want raw approved command submission. Normal settings pages must use typed endpoints.

### Tenant admin screens

1. **Devices** — Tenant-scoped assigned-device list and health/configuration status.
2. **Device Configuration** with separate tabs: Connection, Time, Bell, Device setup, Advanced, Lock/access control, Serial, Ethernet, Wi-Fi, App notification, Web access, Screen menu PIN.
3. **Device Operations** — reboot, MQTTS dispatch when applicable, HTTPS gateway replacement state.
4. **Device Employees** — enrollment list/form, weekly access windows, Face upload, PIN set/reset, issued-card binding and credential removal.

Render actions from the granted module/operation metadata. UI visibility is convenience only; backend permission validation remains authoritative.

## 5. Complete endpoint catalogue

### 5.1 Host DeviceMaster — 7 endpoints

| Method and route | Use case | UI |
| --- | --- | --- |
| `POST /api/DeviceMaster/create` | Register a global physical model/unit with serial, capabilities, capacities and commercial metadata. | Host Device Catalogue form |
| `GET /api/DeviceMaster/get-by-id/{id}` | Load one catalogue record. ID is a Host-side numeric ID. | Edit/detail |
| `GET /api/DeviceMaster/get-info-by-sno/{sNo}` | Look up catalogue information by serial. | Provisioning/diagnostic lookup; current controller notes no active Angular call |
| `GET /api/DeviceMaster/get-all` | Paged search/filter by device type, active and occupied flags. | Catalogue and assignment selector |
| `POST /api/DeviceMaster/update` | Update catalogue/capability metadata. | Edit form |
| `POST /api/DeviceMaster/update-status` | Activate/deactivate. | Row toggle/action |
| `DELETE /api/DeviceMaster/delete/{id}` | Soft-delete subject to repository validations. | Destructive row action |

Important request fields include `sNo`, `deviceCode`, `deviceName`, `modelNo`, manufacturer/brand, `deviceType`, capability booleans (`supportsFace`, `supportsFingerprint`, `supportsCard`, `supportsPin`, transport/network flags), capacity values, firmware/software information, commercial metadata and `isActive`. Device type values are: `1 Face`, `2 Fingerprint`, `3 Card`, `4 FaceFingerprint`, `5 FaceCard`, `6 MultiBiometric`, `7 AccessControl`, `8 Other`.

### 5.2 Host/Tenant physical assignment — 7 endpoints

| Method and route | Use case | Key inputs |
| --- | --- | --- |
| `POST /api/TenantDevice/create` | Assign DeviceMaster to selected Tenant and location. | `tenantId`, `tenantLocationId`, `deviceMasterId`, `deviceCode`, optional name/install metadata, flags, permission IDs |
| `GET /api/TenantDevice/get-by-id/{opaqueId}` | Read one assigned device. | Host adds `tenantId` query scope; permission IDs as required |
| `GET /api/TenantDevice/get-all` | Paged assigned-device list. Tenant caller is automatically scoped. | `search`, `tenantLocationId`, `deviceMasterId`, `isAttendanceDevice`, `isActive`, paging, Host `tenantId` |
| `POST /api/TenantDevice/update` | Edit assignment metadata without changing runtime telemetry. | same editable fields plus opaque `id` |
| `POST /api/TenantDevice/update-status` | Activate/deactivate assignment. | `id`, `isActive`, scope/permission |
| `POST /api/TenantDevice/update-location` | Move an assigned device to another Tenant location without replacing DeviceMaster. | `tenantDeviceId`, `tenantLocationId`, scope/permission |
| `DELETE /api/TenantDevice/delete/{opaqueId}` | Soft-delete only when dependent configuration/enrollments allow it. | query scope/permission |

Assignment request example:

```json
{
  "tenantId": "opaque-host-selected-tenant-id",
  "tenantLocationId": 101,
  "deviceMasterId": 25,
  "deviceCode": "DEL-HQ-GATE-01",
  "deviceName": "Delhi HQ Main Gate",
  "installedDateTime": "2026-09-13T08:30:00Z",
  "installedBy": null,
  "installationRemark": "Main entrance",
  "isAttendanceDevice": true,
  "description": "Face and card terminal",
  "remark": null,
  "isActive": true,
  "moduleId": 0,
  "operationId": 0
}
```

Representative response data includes opaque `id`, opaque `tenantId`, location metadata, Host-only DeviceMaster metadata when the caller is Host, device code/name, flags, `hasConfiguration`, and audit timestamps. Tenant responses omit Host-only DeviceMaster ID/name/model data.

### 5.3 TenantDeviceConfiguration — all 24 endpoints

#### Provisioning, typed settings and operations — 18

| Method and route | Role/use case |
| --- | --- |
| `POST /api/TenantDeviceConfiguration/issue-bootstrap-url` | Host issues a short-lived initial URL for an unassigned HTTPS-capable DeviceMaster. Never Tenant Angular. |
| `POST /api/TenantDeviceConfiguration/apply-runtime-configuration` | **Tenant admin mutation.** Queues baseline heartbeat/volume configuration and optionally reboot. |
| `POST /api/TenantDeviceConfiguration/reboot` | **Tenant admin mutation.** Queues an auditable reboot. |
| `POST /api/TenantDeviceConfiguration/settings/time` | **Tenant admin mutation.** Time/date/DST/NTP/scheduled-reboot settings. |
| `POST /api/TenantDeviceConfiguration/settings/time/sync` | Explicit clock sync without changing format settings. |
| `POST /api/TenantDeviceConfiguration/settings/bell` | Bell count/pattern/output. |
| `POST /api/TenantDeviceConfiguration/settings/device-setup` | Language/display/voice/wake/recognition settings. |
| `POST /api/TenantDeviceConfiguration/settings/advanced` | Verification, thresholds, privacy, mask/fill-light settings. |
| `POST /api/TenantDeviceConfiguration/settings/lock` | Door sensor, Wiegand and access-control settings. |
| `POST /api/TenantDeviceConfiguration/settings/serial` | Serial address/port/baud/function. |
| `POST /api/TenantDeviceConfiguration/settings/ethernet` | DHCP or static Ethernet configuration. |
| `POST /api/TenantDeviceConfiguration/settings/wifi` | DHCP or static Wi-Fi IP configuration. This DTO does not currently accept SSID/password. |
| `POST /api/TenantDeviceConfiguration/settings/app-notification` | Optional third-party app notification behavior/token. |
| `POST /api/TenantDeviceConfiguration/settings/web-access` | **Tenant admin mutation.** Enable/disable local Web UI/API and optionally rotate its password. |
| `POST /api/TenantDeviceConfiguration/settings/screen-menu-pin` | **Tenant admin mutation.** Set physical System/Local Manager menu PIN. |
| `GET /api/TenantDeviceConfiguration/gateway-address/{tenantDeviceId}` | Return non-secret server URL/path/port and pending replacement state. |
| `POST /api/TenantDeviceConfiguration/replace-https-gateway-url` | **Tenant admin mutation.** Queue remote seamless HTTPS bearer-URL replacement. |
| `POST /api/TenantDeviceConfiguration/dispatch-mqtts-now` | **Tenant admin mutation.** Publish the next already-queued MQTTS command immediately. Not used for HTTPS. |

#### Connection configuration CRUD — 6

| Method and route | Use case |
| --- | --- |
| `POST /api/TenantDeviceConfiguration/create` | **Tenant admin mutation.** Create the one connection configuration for an assigned TenantDevice. Host is rejected by the current permission behavior. |
| `GET /api/TenantDeviceConfiguration/get-by-id/{opaqueId}` | Host may read under Host leaf-module grant; Tenant reads under `TENANT_DEVICE_CONFIGURATION`. No secret is returned. |
| `GET /api/TenantDeviceConfiguration/get-all` | Host/Tenant read, each under its expected module and scope. Paged health/config list. |
| `POST /api/TenantDeviceConfiguration/update` | **Tenant admin mutation.** Update connection metadata; validates transport against DeviceMaster capability. Host is rejected. |
| `POST /api/TenantDeviceConfiguration/rotate-https-ingress-token` | Host or Tenant may issue a one-time HTTPS gateway bearer URL under the expected permission. Use only for controlled provisioning/recovery. |
| `DELETE /api/TenantDeviceConfiguration/delete/{opaqueId}` | **Tenant admin mutation.** Delete configuration under permission and dependency rules. Host is rejected. |

#### Current permission ownership for every configuration endpoint

| Endpoint set | Host | Tenant admin |
| --- | --- | --- |
| `issue-bootstrap-url` | Allowed with `HOST_INITIAL_DEVICE_CONFIGURATION` grant | Rejected |
| `get-by-id`, `get-all` | Read-only with Host `TENANT_DEVICE_CONFIG` leaf-module grant | Read with `TENANT_DEVICE_CONFIGURATION` grant |
| `rotate-https-ingress-token` | Allowed for controlled provisioning/recovery with expected persisted grant | Allowed with Tenant configuration grant |
| `create`, `update`, `delete` | Rejected by current permission behavior | Allowed with matching Tenant configuration operation grant |
| `apply-runtime-configuration`, `reboot`, `settings/time`, `settings/time/sync`, `settings/bell`, `settings/device-setup`, `settings/advanced`, `settings/lock`, `settings/serial`, `settings/ethernet`, `settings/wifi`, `settings/app-notification`, `settings/web-access`, `settings/screen-menu-pin` | Rejected | Allowed with matching Tenant configuration operation grant |
| `gateway-address`, `replace-https-gateway-url`, `dispatch-mqtts-now` | Rejected | Allowed with matching Tenant configuration operation grant |

This is why the phrase “Host configured the device and gave it to Tenant” must be interpreted carefully. Host performs physical catalogue/assignment and temporary provisioning. The current backend intentionally reserves final connection mutation and every runtime setting for Tenant admin. If product requirements intend Host to create a temporary `TenantDeviceConfiguration`, that is a **new permission/business-flow change**, not current behavior, and must be explicitly approved and implemented before the UI calls it as Host.

Connection create/update example:

```json
{
  "id": "opaque-configuration-id-only-on-update",
  "tenantDeviceId": "opaque-tenant-device-id",
  "tenantId": "opaque-host-selected-tenant-id-only-for-host",
  "ipAddress": null,
  "macAddress": null,
  "devicePort": null,
  "commandTransport": 4,
  "serverHost": "api.example.com",
  "serverPort": 443,
  "serverPath": "/device-gateway",
  "serverUrl": "https://api.example.com",
  "pushMode": null,
  "heartbeatIntervalSeconds": 15,
  "timeZoneId": "Asia/Kolkata",
  "configuration": null,
  "isEnrollmentEnabled": true,
  "isAttendancePushEnabled": true,
  "isAutoSyncEnabled": true,
  "moduleId": 0,
  "operationId": 0
}
```

`mqttTransport` is legacy compatibility. New Angular code must use `commandTransport`: `1 MQTT`, `2 MQTTS`, `3 HTTP (reserved/LAN legacy)`, `4 HTTPS polling`, `5 WebSocket (reserved)`, `6 WSS (future/reserved)`. Active implementations documented in code are MQTTS and HTTPS polling; do not offer a reserved transport as production-ready merely because its enum value persists.

Configuration reads return non-secret telemetry including `lastHeartbeatDateTime`, `lastSyncDateTime`, `lastAttendanceReceivedDateTime`, `lastSuccessfulConnectionDateTime`, `lastFailedConnectionDateTime` and `lastConnectionError`. They never return the HTTPS bearer token.

## 6. Host-to-Tenant assignment and first configuration flow

1. Host loads the Tenant selector through the existing Host Tenant API and loads valid Tenant locations through the existing Tenant Location API.
2. Host loads eligible DeviceMaster rows with `GET /api/DeviceMaster/get-all`.
3. Host resolves the assignment module/action from its granted permission menu.
4. Host calls `POST /api/TenantDevice/create`. `deviceMasterId` and location are validated; duplicate serial/code/asset rules are enforced by backend handlers/repositories.
5. Host hands the assigned device to Tenant. Host may read non-secret configuration/health and may issue an initial gateway URL under provisioning permission, but the current permission pipeline rejects Host calls to create/update/delete configuration and all runtime-setting mutations.
6. Tenant admin signs in, resolves its `TENANT_DEVICE_CONFIGURATION` module/action IDs and calls `POST /api/TenantDeviceConfiguration/create` with a supported `commandTransport`.
7. For HTTPS, Host or Tenant can call `rotate-https-ingress-token` during controlled handover. The person physically installing the URL copies it once into the device; the browser immediately discards it.
8. Tenant admin runs the private reconfiguration flow in section 6.1 so final passwords, PINs and app tokens are Tenant-owned.

### 6.1 Host handover followed by Tenant private reconfiguration

**Important ownership rule:** Host may provision transport and assign hardware, but Tenant's final local WebServer password, physical menu PIN, employee PINs, app token and biometric/card credentials should be entered only in Tenant-authenticated UI. Host should neither ask for them nor receive them in configuration reads, logs or support exports.

```text
HOST ADMIN                AXIONPRO                 TENANT ADMIN                   PHYSICAL DEVICE
    |                         |                          |                               |
    | create assignment       |                          |                               |
    |------------------------>|                          |                               |
    | issue bootstrap/gateway |                          |                               |
    |------------------------>|---- technician installs temporary access ------------->|
    | hand over device        |                          |                               |
    |--------------------------------------------------->|                               |
    |                         |<-- create/update config --|                               |
    |                         |<-- rotate gateway --------|-- queue / next poll -------->|
    |                         |<-- rotate Web password ---|-- queue / next poll -------->|
    |                         |<-- set physical menu PIN -|-- queue / next poll -------->|
    |                         |<-- employee credentials --|-- queue / next poll -------->|
    | Host reads health only; final Tenant secrets are never returned                   |
```

### 6.2 APIs Tenant calls again after Host handover

These are not accidental duplicate calls. They transfer control from temporary/Host-assisted provisioning to Tenant-owned desired state.

| Order | Tenant UI action | Endpoint | Why it is called again |
| ---: | --- | --- | --- |
| 1 | Load assigned device | `GET /api/TenantDevice/get-by-id/{id}` or `get-all` | Confirm assignment and location in trusted Tenant scope. |
| 2 | Load current non-secret connection state | `GET /api/TenantDeviceConfiguration/get-by-id/{id}` / `get-all` | Populate form without passwords or bearer token. |
| 3 | Create or take ownership of connection configuration | `POST .../create` when absent; `POST .../update` when present | Save Tenant-approved transport, URL/path/port, heartbeat and feature flags. Host cannot perform these mutations in current permission behavior. |
| 4 | Rotate permanent HTTPS route when needed | `POST .../rotate-https-ingress-token` for manual one-time installation, or `POST .../replace-https-gateway-url` for remote two-phase replacement | Invalidate/replace Host-assisted or possibly exposed route credential. |
| 5 | Rotate local device WebServer password | `POST .../settings/web-access` | Tenant enters current temporary credential and its own new write-only password. This does not change cloud gateway URL. |
| 6 | Set physical menu PIN | `POST .../settings/screen-menu-pin` | Prevent a technician/unauthorized local user from changing settings after handover. |
| 7 | Apply Tenant baseline | `POST .../apply-runtime-configuration` and individual settings APIs | Tenant owns heartbeat/volume/time/network/access configuration. |
| 8 | Enroll employees and credentials | `/api/EmployeeDeviceEnrollment/*` | Face/Card/employee PIN is supplied only within Tenant scope. |
| 9 | Verify asynchronous result | enrollment reads plus configuration/gateway health | Every mutation is queued; verify physical acknowledgement/reconnect separately. |

Tenant reconfiguration wizard:

```text
[Assigned Device]
       |
       v
[Read safe state] -- no config --> [Create Tenant configuration]
       | existing                       |
       v                                v
[Choose HTTPS/MQTTS] ------------> [Save desired connection]
       |
       v
[Rotate gateway credential?] --> [One-time URL or remote replacement]
       |
       v
[Enter temporary current Web password]
       |
       +--> [Set Tenant-only new Web password]
       +--> [Set Tenant-only physical menu PIN]
       +--> [Apply Time/Network/Lock/Other tabs]
       |
       v
[Queued] --> [Device heartbeat/poll] --> [Confirmed or action required]
```

### 6.3 Credential confidentiality and physical prerequisite

The backend cannot read the existing physical WebServer password from a device. Typed runtime requests require `currentWebServerPassword` because the vendor command uses it for authorization. The Tenant must therefore receive a one-time temporary password through a controlled handover channel or reset it locally through an approved technician process, then immediately rotate it with `settings/web-access`.

- Host knows only the temporary installation credential when operationally necessary.
- Tenant submits temporary current password and its own new password over authenticated TLS.
- Queue payload is protected; API read models never return either password.
- After confirmed rotation, Host cannot recover the Tenant password through an API.
- Gateway token, local WebServer password and physical menu PIN are three different secrets changed by three different endpoints.
- If the device is offline or the temporary password is wrong, Tenant must preserve a working recovery path until the new state is confirmed.

A formal break-glass/reset policy is still a product decision and must be approved before implementation.

Initial bootstrap is different. Before Tenant assignment, Host can call:

```json
POST /api/TenantDeviceConfiguration/issue-bootstrap-url
{
  "deviceMasterId": 25,
  "lifetimeMinutes": 120,
  "moduleId": 0,
  "operationId": 0
}
```

Response data:

```json
{
  "deviceSerialNumber": "DEVICE-SERIAL",
  "initialGatewayUrl": "https://api.example.com/api/initial/DEVICE-SERIAL/one-time-secret",
  "heartbeatIntervalSeconds": 20,
  "expiresDateTime": "2026-09-13T12:00:00Z"
}
```

That route is single-purpose, short-lived and device-facing. Do not expose it on Tenant screens or retain its secret.

## 7. Every typed settings request and its DDL dependency

All setting POSTs share:

```json
{
  "tenantDeviceId": "opaque-tenant-device-id",
  "currentWebServerPassword": "write-only-current-password",
  "moduleId": 0,
  "operationId": 0
}
```

Append the endpoint-specific fields shown below. `currentWebServerPassword` is protected in the queued payload and never returned.

### Time — first call `GET /api/device-ddl-options/time`

```json
{
  "tenantDeviceId": "opaque-id",
  "currentWebServerPassword": "secret",
  "timeFormat": 0,
  "dateFormat": 2,
  "daylightSavingEnabled": false,
  "daylightSavingStart": "3/21",
  "daylightSavingEnd": "9/21",
  "networkTimeEnabled": true,
  "timeZone": 27,
  "rebootTime1": "00:00",
  "rebootTime2": "00:00",
  "rebootTime3": "00:00",
  "moduleId": 0,
  "operationId": 0
}
```

DDL: clock `0=24-hour, 1=12-hour`; date `0=Y/M/D, 1=M/D/Y, 2=D/M/Y`; NTP `0/1`; timezone codes `0..12=UTC+0..UTC+12`, `13..24=UTC-1..UTC-12`, `25=UTC+3:30`, `26=UTC+4:30`, `27=UTC+5:30`, `28=UTC+5:45`, `29=UTC+6:30`, `30=UTC+9:30`, `31=UTC-3:30`, `32=UTC-4:30`.

Time sync uses the same common fields plus optional `utcDateTime`; when omitted the server's current UTC is used:

```json
{ "tenantDeviceId": "opaque-id", "currentWebServerPassword": "secret", "utcDateTime": "2026-09-13T10:00:00Z", "moduleId": 0, "operationId": 0 }
```

### Bell — first call `GET /api/device-ddl-options/bell`

```json
{ "tenantDeviceId": "opaque-id", "currentWebServerPassword": "secret", "bellCount": 2, "ringStyle": 1, "bellOutput": 1, "moduleId": 0, "operationId": 0 }
```

DDL: `ringStyle 0=Continuous, 1=Interrupted`; `bellOutput 0=Disabled, 1=Bell`.

### Device setup — first call `GET /api/device-ddl-options/device-setup`

```json
{
  "tenantDeviceId": "opaque-id", "currentWebServerPassword": "secret",
  "language": 24, "voiceVolume": 8, "announcePersonName": true,
  "detectMultipleFaces": false, "resultDisplaySeconds": 3,
  "screenSaverIdleSeconds": 60, "sleepModeSeconds": 300,
  "screenWakeUpMethod": 0, "faceWakeUpSeconds": 5,
  "resultDisplayStyle": 0, "faceRecognitionDistance": 1,
  "livenessDetectionEnabled": true, "showAvatar": true,
  "moduleId": 0, "operationId": 0
}
```

DDL: language `0 English, 24 Hindi`; wake `0 Face, 1 Touch`; display `0 Default, 1 Gym, 2 Message bar`; distance `0 Short, 1 Medium, 2 Long`.

### Advanced — first call `GET /api/device-ddl-options/advanced`

```json
{
  "tenantDeviceId": "opaque-id", "currentWebServerPassword": "secret",
  "maximumAdministrators": 5, "verificationMode": 8, "qrCodeMode": 0,
  "hidePrivacyInformation": true, "faceMatchThreshold": 80,
  "livenessThreshold": 80, "fingerprintMatchThreshold": 80,
  "fingerprintsPerUser": 2, "maskDetectionEnabled": false,
  "maskThreshold": 80, "fillLightMode": 0,
  "constantFillLightPeriod": "08:00~18:00", "exposureCompensation": 0,
  "palmVeinMatchThreshold": 80, "palmDetectionThreshold": 80,
  "disableFaceRecognition": false, "onlineDebugEnabled": false,
  "moduleId": 0, "operationId": 0
}
```

Verification DDL: `0 Any`, `10 Card+Face`, `9 Face+PIN`, `14 Face+(Card or PIN)`, `8 Face only`, `11 Card+PIN`, `3 Card only`, `2 PIN only`. QR: `0 Disabled, 1 Visitor, 2 Card-to-QR, 3 Server`. Fill light: `0 Auto, 1 Off, 2 On`.

### Lock — first call `GET /api/device-ddl-options/lock`

```json
{
  "tenantDeviceId": "opaque-id", "currentWebServerPassword": "secret",
  "doorOpenDelaySeconds": 5, "doorSensorMode": 1, "doorSensorDelaySeconds": 5,
  "blockStrangerAccess": true, "doorPassword": 0, "requiredUsersForDoorOpen": 1,
  "antiPassbackMode": 0, "wiegandOutput": 1, "wiegandFormat": 0,
  "accessLimit": 0, "cardDisplayFormat": 0, "reverseCardPin": false,
  "reverseWiegandOutput": false, "externalWiegandSnapshotEnabled": false,
  "interlockEnabled": false, "alarmProcessingEnabled": true,
  "failedVerificationLimit": 5, "timeZonePunchLimit": 0,
  "suppressAccessDeniedLog": false, "denyOutsideNormallyOpenTimeZone": false,
  "moduleId": 0, "operationId": 0
}
```

DDL: sensor `0 NG, 1 NC, 2 NO`; anti-passback `0 Disabled, 1 Entry, 2 Exit, 3 Both`; Wiegand content `0 User ID, 1 Card, 2 Management+User, 3 Group, 4 Group+User`; Wiegand format `0 26-bit, 1 34-bit, 2 42-bit, 3 50-bit, 4 58-bit, 5 64-bit`; card display `0 Decimal, 1 Wiegand, 2 Hex`.

### Serial — first call `GET /api/device-ddl-options/serial`

```json
{ "tenantDeviceId": "opaque-id", "currentWebServerPassword": "secret", "deviceAddress": 1, "networkPort": 5005, "baudRate": 4, "serialFunction": 2, "moduleId": 0, "operationId": 0 }
```

DDL baud `0 9600, 1 19200, 2 38400, 3 57600, 4 115200`; function `0 Disabled, 1 Printer, 2 Send JSON`.

### Ethernet — first call `GET /api/device-ddl-options/ethernet`

```json
{ "tenantDeviceId": "opaque-id", "currentWebServerPassword": "secret", "dhcpEnabled": false, "ipAddress": "10.0.0.50", "subnetMask": "255.255.255.0", "gateway": "10.0.0.1", "dnsServer": "10.0.0.2", "hideIpAddress": true, "moduleId": 0, "operationId": 0 }
```

When `dhcpEnabled=true`, do not force static address fields. DDL is `0 No, 1 Yes`.

### Wi-Fi — first call `GET /api/device-ddl-options/wifi`

```json
{ "tenantDeviceId": "opaque-id", "currentWebServerPassword": "secret", "dhcpEnabled": true, "ipAddress": null, "subnetMask": null, "gateway": null, "moduleId": 0, "operationId": 0 }
```

Current DTO has no SSID or Wi-Fi password field. Do not invent those controls without a backend contract change.

### App notification — first call `GET /api/device-ddl-options/app-notification`

```json
{ "tenantDeviceId": "opaque-id", "currentWebServerPassword": "secret", "appNotificationEnabled": true, "appToken": "write-only-token", "notificationType": 1, "moduleId": 0, "operationId": 0 }
```

Type: `0 All`, `1 Each attendance punch`, `2 Summary`, `3 Disabled`.

### Web access and screen PIN — no DDL endpoint exists

```json
POST /api/TenantDeviceConfiguration/settings/web-access
{ "tenantDeviceId": "opaque-id", "currentWebServerPassword": "old-secret", "localWebServerEnabled": false, "newWebServerPassword": "optional-new-secret", "moduleId": 0, "operationId": 0 }
```

This changes the device's **local embedded Web UI/API**, not the AxionPro cloud URL. Tenant may disable local access to reduce LAN exposure or rotate the local password after installation. `newWebServerPassword` is optional and write-only.

```json
POST /api/TenantDeviceConfiguration/settings/screen-menu-pin
{ "tenantDeviceId": "opaque-id", "currentWebServerPassword": "secret", "screenMenuPin": "2468", "moduleId": 0, "operationId": 0 }
```

This protects the physical device menu. Do not confuse it with an employee attendance PIN.

## 8. Why and how the HTTPS gateway URL changes

The gateway URL contains an opaque bearer token. Rotate/replace it when it may have leaked, ownership/installation changes, or security policy requires credential rotation. `settings/web-access` does **not** change this URL.

For initial/manual rotation:

```json
POST /api/TenantDeviceConfiguration/rotate-https-ingress-token
{
  "tenantDeviceConfigurationId": "opaque-config-id",
  "tenantDeviceId": null,
  "moduleId": 0,
  "operationId": 0
}
```

Response:

```json
{ "isSucceeded": true, "data": { "gatewayUrl": "https://api.example.com/device-gateway/opaque-secret" } }
```

Show a one-time copy modal. Never later expect GET configuration to return it.

For remote seamless replacement:

```json
POST /api/TenantDeviceConfiguration/replace-https-gateway-url
{
  "tenantDeviceId": "opaque-id",
  "currentWebServerPassword": "secret",
  "replacementLifetimeMinutes": 30,
  "moduleId": 0,
  "operationId": 0
}
```

The server queues a command containing the new URL. The old URL remains usable during handover; when the device successfully polls using the pending new token, backend promotes it and clears pending replacement state. Angular checks:

```http
GET /api/TenantDeviceConfiguration/gateway-address/{opaque-device-id}?moduleId=...&operationId=...
```

Representative data:

```json
{
  "tenantDeviceId": "opaque-id",
  "serverUrl": "https://api.example.com",
  "serverPath": "/device-gateway",
  "serverPort": 443,
  "hasActiveGatewayUrl": true,
  "isReplacementPending": true,
  "replacementExpiresDateTime": "2026-09-13T10:30:00Z"
}
```

There is no guaranteed fixed completion time. It depends on the next device poll and physical application. Expiry protects an abandoned pending token; it is not an execution SLA.

## 9. Heartbeat, command timing, services and states

### HTTPS polling

The physical device calls `POST /device-gateway/{ingressToken}` with its vendor JSON including serial `sn`. This private route validates token hash, serial mapping, size/content and rate limits. It updates telemetry and returns **at most one** queued command; if none exists it returns an acknowledgement containing the configured heartbeat interval.

For configured interval `H` seconds and no network/firmware delay, the next command can normally be picked up within roughly `0..H` seconds. That is a scheduling estimate, not a promise. The default used in several flows is 20 seconds and validated configuration accepts the documented range 10–3600 seconds. Actual completion additionally needs device execution plus response delivery.

### MQTTS

`DeviceCommandDispatcherWorker` uses a `PeriodicTimer` of **1 second** and publishes eligible MQTTS commands through `IAxionProMqttPublisher`. `AxionProMqttHostedService` has a **10-second** connection maintenance loop. An authorized user can request immediate publication of the next queued command with `dispatch-mqtts-now`.

### Durable states

`1 Queued`, `2 Publishing`, `3 AwaitingResponse`, `4 Completed`, `5 Failed`, `6 RetryScheduled`, `7 Cancelled`.

Repository submission clamps `MaxAttempts` to 1–10. Retry timing is repository-controlled. UI must not promise a hard duration. For employee credentials, poll `EmployeeDeviceEnrollment/get-by-id` or `get-all` and show the returned live command/deployment fields. For generic configuration/reboot commands, the submission returns IDs/status but the current public API has **no dedicated get-command-status endpoint**. Therefore show “Queued for device” and use configuration heartbeat/health refresh; do not claim device acknowledgement.

Runtime configuration request:

```json
{
  "tenantDeviceId": "opaque-id",
  "currentWebServerPassword": "secret",
  "heartbeatIntervalSeconds": 20,
  "volume": 8,
  "disableLocalWebServer": true,
  "newWebServerPassword": null,
  "rebootAfterApply": true,
  "moduleId": 0,
  "operationId": 0
}
```

The two WebServer fields here are legacy compatibility; use typed `settings/web-access` for new UI. Response data has `configurationCommandId`, `configurationTrackingId`, optional reboot IDs and queue-time `status`.

Reboot request:

```json
{ "tenantDeviceId": "opaque-id", "moduleId": 0, "operationId": 0 }
```

## 10. Device DDL APIs — all 12 and exact consumption map

Response shape is a list of fields, each containing `key`, `label`, and `options[{value,label}]`. Keep `value` as returned; convert only as required by the typed DTO.

| DDL endpoint | Must be called before / used by |
| --- | --- |
| `GET /api/device-ddl-options/time` | `POST .../settings/time` |
| `GET /api/device-ddl-options/bell` | `POST .../settings/bell` |
| `GET /api/device-ddl-options/device-setup` | `POST .../settings/device-setup` |
| `GET /api/device-ddl-options/advanced` | `POST .../settings/advanced` |
| `GET /api/device-ddl-options/lock` | `POST .../settings/lock` |
| `GET /api/device-ddl-options/serial` | `POST .../settings/serial` |
| `GET /api/device-ddl-options/ethernet` | `POST .../settings/ethernet` |
| `GET /api/device-ddl-options/wifi` | `POST .../settings/wifi` |
| `GET /api/device-ddl-options/app-notification` | `POST .../settings/app-notification` |
| `GET /api/device-ddl-options/employee-device-credentials` | `POST /api/EmployeeDeviceEnrollment/credential/remove` |
| `GET /api/device-ddl-options/employee-device-access-windows` | enrollment create/update `accessWindows[].dayOfWeek` |
| `GET /api/device-ddl-options/tenant-card-inventory` | TenantCardMaster tax treatment and card-status filter |

There are deliberately no DDL endpoints for web access, screen PIN, free numeric thresholds, IP strings or passwords. Use typed controls and backend validation.

## 11. Employee enrollment from Angular — all 10 APIs

### Preconditions

- Employee is active and visible under the established employee data-access behavior.
- Employee has an active attendance-enabled assignment to the selected device location.
- TenantDevice is active and enrollment enabled.
- UI uses the Tenant permission module code `EMP_DEVICES`, resolving actual module/operation IDs dynamically.
- `Employee.Id` is decrypted server-side and becomes vendor `enrollid`; Angular never receives the raw numeric value.

| Method and route | Angular action |
| --- | --- |
| `POST /api/EmployeeDeviceEnrollment/create` | Add employee to device and queue baseline `setuserinfo`. |
| `GET /api/EmployeeDeviceEnrollment/get-by-id/{opaqueEnrollmentId}` | Detail and command-status refresh. |
| `GET /api/EmployeeDeviceEnrollment/get-all` | Paged employee/device list. |
| `POST /api/EmployeeDeviceEnrollment/update` | Change validity and weekly access windows; cannot swap employee/device. |
| `POST /api/EmployeeDeviceEnrollment/update-status` | Queue `enableuser` state change. |
| `POST /api/EmployeeDeviceEnrollment/face/upsert` | Upload JPEG/PNG face as multipart, maximum 2 MB per existing handoff. |
| `POST /api/EmployeeDeviceEnrollment/pin/upsert` | Set/reset write-only 4–12 digit employee device PIN. |
| `POST /api/EmployeeDeviceEnrollment/card/bind` | Bind an available active Host-issued card. |
| `POST /api/EmployeeDeviceEnrollment/credential/remove` | Remove exactly Face, Card or PIN. |
| `DELETE /api/EmployeeDeviceEnrollment/delete/{opaqueEnrollmentId}` | Queue full device-user deletion and soft-delete mapping. |

Create request:

```json
{
  "employeeId": "opaque-employee-id",
  "tenantDeviceId": "opaque-device-id",
  "tenantCardId": null,
  "accessEffectiveFromDateTime": "2026-09-13T00:00:00Z",
  "accessEffectiveToDateTime": null,
  "accessWindows": [
    { "dayOfWeek": 1, "startLocalTime": "09:00:00", "endLocalTime": "18:00:00", "isActive": true }
  ],
  "isActive": true,
  "moduleId": 0,
  "operationId": 0
}
```

Day DDL: `1 Monday`, `2 Tuesday`, `3 Wednesday`, `4 Thursday`, `5 Friday`, `6 Saturday`, `7 Sunday`. Multiple windows per day are supported.

Face `multipart/form-data` fields:

```text
enrollmentId = opaque-enrollment-id
faceImage = <JPEG or PNG binary>
moduleId = dynamically-resolved-module-id
operationId = dynamically-resolved-operation-id
```

PIN:

```json
{ "enrollmentId": "opaque-enrollment-id", "pin": "482913", "moduleId": 0, "operationId": 0 }
```

Card bind:

```json
{ "enrollmentId": "opaque-enrollment-id", "tenantCardId": "opaque-card-id", "moduleId": 0, "operationId": 0 }
```

Credential removal after loading its DDL:

```json
{ "enrollmentId": "opaque-enrollment-id", "credentialType": 1, "moduleId": 0, "operationId": 0 }
```

Credential codes: `1 Face`, `2 Card`, `3 PIN`.

Enrollment response fields required by UI include opaque employee/device/location/card IDs, employee/device display names, masked card number, enrolled flags, `faceDeploymentStatus`, `cardDeploymentStatus`, `pinDeploymentStatus`, `faceCommandStatus`, `cardCommandStatus`, `pinCommandStatus`, `userActivationCommandStatus`, validity, windows, last sync and active flag.

Deployment values: `0 NotConfigured`, `1 Queued`, `2 Completed`, `3 Failed`, `4 Removed`. Command status values are from section 9. Poll this read API after a submit; never expose protected queue payloads.

Fingerprint is present as a response capability flag but **there is no fingerprint upsert endpoint in the current controller**. Do not build a working fingerprint enrollment button. Face, Card and PIN are implemented typed actions.

## 12. Host TenantCardMaster — 6 supporting APIs

| Method and route | Use |
| --- | --- |
| `POST /api/TenantCardMaster/create` | Host adds purchased card to selected Tenant inventory. |
| `GET /api/TenantCardMaster/get-by-id/{opaqueCardId}` | Return masked card detail. |
| `GET /api/TenantCardMaster/get-all` | Paged inventory/filter and available-card selector. |
| `POST /api/TenantCardMaster/update` | Update unassigned procurement metadata. |
| `POST /api/TenantCardMaster/update-status` | Activate/deactivate an unassigned card. |
| `DELETE /api/TenantCardMaster/delete/{opaqueCardId}` | Soft-delete an unassigned card. |

Tenant admin cannot create/edit/deactivate/delete inventory. It only binds an available issued card through enrollment. Backend encrypts card number and returns only `maskedCardNumber`. Card lifecycle: `1 Available`, `2 Assigned`, `3 Blocked`, `4 Lost`, `5 Returned`, `6 Retired`. Tax: `1 India intra-state`, `2 India inter-state`, `3 Import`, `4 Foreign local tax`. Use `/api/device-ddl-options/tenant-card-inventory`; use the existing `/api/Enum/get-all-currencies` provider for currency.

The permission module code is `HOST_TENANT_CARD_INVENTORY`, with actual IDs dynamically resolved.

## 13. Generic DeviceCommand API and command catalogue

`POST /api/device-commands/submit` accepts:

```json
{
  "tenantId": "opaque-host-selected-tenant-id-when-host",
  "tenantDeviceId": 123,
  "commandName": "getdevinfo",
  "payload": "vendor-json-string",
  "moduleId": 0,
  "operationId": 0
}
```

Its current DTO exposes a numeric `tenantDeviceId`, unlike the safer typed UI APIs. It is governed by `DeviceProtocolCommandCatalog`: all vendor commands default Host-only, then a limited subset is opened to Tenant permission; door commands require access-control permission; stream commands have streamed response behavior. For normal Angular settings/enrollment use the typed endpoints, not raw vendor JSON.

Tenant-permitted catalogue entries include `setuserinfo`, `adduser`, `deleteuser`, `enableuser`, `getdevcap`, `getdevinfo`, `gettime`, `settime`, `setdevinfo`, `getuserinfo`; `reboot` is publish-only; `getdoorstatus`, `opendoor`, `lockctrl` require access-control permission. Streamed commands include `getalllog`, `getallusers`, `getnewlog`, `getuserlist`. All other constants remain Host-only unless catalog configuration says otherwise.

The complete constant file also contains vendor commands such as registration, cleaning, OTA, bell/company/department/device-lock/holiday/shift/user/profile, voice, verification and file operations. A string existing in `DeviceCommands` does not itself authorize Tenant use.

## 14. Private device-only routes — never Angular

| Route | Caller and behavior |
| --- | --- |
| `POST /api/initial/{deviceSerialNumber}/{ingressToken}` | Fresh physical device uses short-lived Host bootstrap token. |
| `POST /device-gateway/{ingressToken}` | Configured HTTPS device sends heartbeat/vendor response and receives at most one queued command. |

Invalid token/serial/body/content type intentionally gets a non-descriptive response. Device gateway limits payload size and is rate-limited. Browser code must never proxy or replay these URLs.

## 15. Tables touched, by flow

All listed EF mappings use schema `axionpro`.

| Table/entity | Why it is used |
| --- | --- |
| `DeviceMaster` | Global Host catalogue, physical serial/model/capabilities and occupied state. |
| `TenantDevice` | Tenant assignment, location, code/name, active state and DeviceMaster link. |
| `TenantDeviceConfiguration` | One device connection record, transport, server data, heartbeat and success/failure telemetry, active/pending HTTPS token hashes. |
| `DeviceInitialProvisioning` | Short-lived pre-assignment bootstrap token hash, serial, heartbeat and expiry. |
| `DeviceCommand` | Durable queue, protected payload, command name, transport, state, attempts/timing and correlation. |
| `DeviceCommandResponse` | Redacted/normalized device reply audit and completion linkage. |
| `DeviceMessageLog` | Inbound/outbound device message diagnostic/audit log. |
| `DeviceCredential` | Stored encrypted transport/device credential where explicitly supported. Do not confuse with employee Face/Card/PIN state. |
| `EmployeeDeviceEnrollment` | Employee↔TenantDevice mapping, credential deployment flags/status and command references. |
| `EmployeeDeviceAccessWindow` | Weekly local-time windows belonging to enrollment. |
| `TenantCardMaster` | Host-issued Tenant card inventory, encrypted number/hash, masked view, procurement and lifecycle. |
| `Employee`, `EmployeeLocationAssignment`, `TenantLocation` | Enrollment eligibility, data access and selected physical location. |
| Permission/module/role mapping tables | Existing pipeline validates supplied module/action against authenticated Host/Tenant actor. |

Flow-specific writes:

- Assignment: `TenantDevice`; reads `DeviceMaster`, Tenant and location; may update occupied/reference state according to handler/repository logic.
- Connection configuration: `TenantDeviceConfiguration`; reads `TenantDevice` and `DeviceMaster` capability.
- Bootstrap: `DeviceInitialProvisioning` plus DeviceMaster lookup.
- Typed setting/reboot/enrollment mutation: `DeviceCommand`; employee flows also update `EmployeeDeviceEnrollment`, access windows and/or `TenantCardMaster`.
- Publish/poll: updates `DeviceCommand`; adds `DeviceMessageLog`; device reply adds `DeviceCommandResponse`; gateway updates `TenantDeviceConfiguration` telemetry.
- HTTPS URL replacement: pending hash/expiry in `TenantDeviceConfiguration`, queued `DeviceCommand`, then promotion when new-token poll is observed.

These are backend ownership details, not permission for Angular to query tables directly.

## 16. DeviceMaster bulk import — additional 8 endpoints

Base route `/api/DeviceMaster/import` exposes:

| Method/relative route | Purpose |
| --- | --- |
| `POST preview` | Upload/preview validated import. |
| `POST confirm` | Confirm preview and queue/persist job. |
| `GET job` | Read one job. |
| `GET jobs` | List jobs. |
| `POST retry` | Retry eligible job. |
| `POST cancel` | Cancel eligible job. |
| `GET template` | Download template. |
| `GET report` | Download result/report. |

Use the existing bulk-import reference and Host catalogue bulk UI handoff for exact multipart/query contracts, polling, report download and tested status. These APIs account for the broad total of 77 but are not required for ordinary per-device assignment/configuration UI.

## 17. Angular service split and UI state machine

Recommended services:

```text
DeviceMasterApi
TenantDeviceApi
TenantDeviceConfigurationApi
DeviceDdlOptionsApi
EmployeeDeviceEnrollmentApi
TenantCardMasterApi
```

Keep secrets in local component variables only and clear them after submit/failure/navigation. Suggested command states:

```text
Idle -> Submitting -> Queued -> Awaiting device -> Completed | Failed
```

Only use `Completed` when a read contract actually exposes confirmed state. For setting/reboot without a public status read, finish at `Queued for device` and show heartbeat health separately.

Recommended health labels derived from configuration data:

- Never connected: no successful heartbeat/connection timestamp.
- Online/recent: product-defined comparison with `lastHeartbeatDateTime` and configured interval.
- Stale/offline: product-defined threshold exceeded.
- Connection error: show sanitized `lastConnectionError` when provided.

The backend currently does not define the UI's online/stale multiplier. UI/product must agree on a threshold; do not silently invent an SLA in shared business logic.

## 18. Error handling

| Result | Angular behavior |
| --- | --- |
| `400` validation | Keep safe fields, show message near relevant form section; clear passwords/PIN/token/file controls. |
| `401` | Follow existing login/session-expiry flow. |
| `403` | Refresh permission/menu state; show no-permission message; do not retry automatically. |
| `404` | Treat opaque resource/gateway as unavailable in current scope; refresh list. |
| `409` | Refresh current state; common cases include duplicate/in-use assignment, existing configuration or pending replacement. |
| `200` + Queued | Show queue acknowledgement, not completed toast. |
| Network timeout after POST | Do not blindly resubmit secrets/commands. Refresh the safe read model first to avoid duplicates. |

## 19. Known gaps and do-not-assume list

1. No public generic `GET device-command status` endpoint exists in the reviewed controller.
2. No fingerprint upload/capture endpoint exists in `EmployeeDeviceEnrollmentController`.
3. Wi-Fi settings DTO has no SSID/password.
4. Web access and screen-menu PIN have no DDL endpoints because they are typed boolean/secret inputs.
5. Source defines scheduling mechanics but no hard end-to-end execution SLA; device/network availability controls actual completion.
6. Static analysis cannot prove that each physical firmware model supports every typed field. DeviceMaster capabilities and real-device acceptance must be tested before enabling controls for a model.
7. Local source/test evidence is not deployed acceptance.

## 20. UI implementation checklist

- [ ] Resolve module and operation IDs from authenticated menu/permission response; no numeric constants in Angular.
- [ ] Separate Host and Tenant routes/components.
- [ ] Use opaque IDs exactly as returned.
- [ ] Load the mapped DDL API when each settings tab opens; cache only non-secret option data.
- [ ] Use typed settings APIs; do not send raw vendor JSON from normal UI.
- [ ] Label queue acknowledgement accurately.
- [ ] Never call private gateway/bootstrap routes from Angular.
- [ ] One-time display and immediate disposal for gateway URLs.
- [ ] Clear current/new device passwords, employee PIN, app token and face file after submission.
- [ ] Poll enrollment reads for credential status; do not poll a nonexistent generic status route.
- [ ] Hide unsupported fingerprint and Wi-Fi credential actions.
- [ ] Gate Tenant card selection to active Available Host-issued cards.
- [ ] Test Host assignment, Tenant scoping, every settings tab, both HTTPS/MQTTS paths, error states and credential lifecycle in a deployed-like environment.

## 21. Principal source files reviewed

- `axionpro.api/Controllers/HostDevice/DeviceMasterController.cs`
- `axionpro.api/Controllers/HostDevice/TenantDeviceController.cs`
- `axionpro.api/Controllers/HostDevice/TenantDeviceConfigurationController.cs`
- `axionpro.api/Controllers/HostDevice/DeviceDdlOptionsController.cs`
- `axionpro.api/Controllers/HostDevice/DeviceCommandController.cs`
- `axionpro.api/Controllers/DeviceGatewayController.cs`
- `axionpro.api/Controllers/TenantConfiguration/TenantConfigurationControllers.cs`
- `axionpro.api/Controllers/HostDevice/TenantCardMasterController.cs`
- `axionpro.application/DTOS/Host/DeviceManagementDTOs.cs`
- `axionpro.application/DTOS/Host/DeviceRuntimeSettingsDTOs.cs`
- `axionpro.application/DTOS/TenantConfiguration/TenantConfigurationDTOs.cs`
- `axionpro.application/Constants/DeviceDdl.cs`
- `axionpro.application/Constants/DeviceCommands.cs`
- `axionpro.application/Constants/DeviceProtocolCommandCatalog.cs`
- `axionpro.infrastructure/DeviceCommunication/Mqtt/DeviceCommandDispatcherWorker.cs`
- `axionpro.persistance/Repositories/DeviceCommandRepository.cs`
- `axionpro.persistance/Data/Context/WorkforceDbContext.cs`
- existing device UI handoff and transport documents under `docs/`.

## 22. Remaining APIs and automation for a professional HRMS device module

This section separates **vendor-supported commands** from **finished AxionPro APIs**. The HTTP/HTTPS protocol 3.0 and MQTT+JSON PDFs confirm the device command vocabulary, but a documented vendor command is not automatically safe or implemented as an HRMS API. The current generic endpoint deliberately blocks destructive/device-global commands until typed DTOs, authorization, validation, audit and automated tests exist.

### 22.1 Confirmed current gaps

| Requirement | Current source behavior | Status |
| --- | --- | --- |
| Bulk-enroll existing Employee IDs onto one or more Tenant devices | Only single `EmployeeDeviceEnrollment/create` exists. | **PENDING** |
| Automatically enroll employees created by Employee bulk import | Employee import creates Employee, LoginCredential and UserRole; it does not create device enrollments or commands. | **PENDING** |
| Employee deactivation automatically disables that employee on every enrolled device | `PUT /api/Employee/update-status` changes HRMS employee state only. Device `enableuser` is queued only by `EmployeeDeviceEnrollment/update-status`. | **PENDING** |
| Employee reactivation automatically re-enables eligible device enrollments | No orchestration currently connects employee activation to device commands. | **PENDING** |
| Persist production attendance punches received as `sendlog` | Legacy `/api/Attendance/timmy-test` parses and logs diagnostics but does not provide production persistence. Secure gateway records protocol/audit messages, but no verified mapping into business attendance tables was found. | **PENDING** |
| Pull missed logs with `getnewlog` / `getalllog` and expose sync progress | Commands exist in catalog as Host-only streamed commands; there is no typed Tenant attendance-sync API/job UI contract. | **PENDING** |
| Delete device logs safely with `cleanlog` / photos with `cleanlogphoto` | Constants exist; generic command endpoint blocks them; no typed retention/approval API exists. | **PENDING** |
| Push HRMS shifts and holidays | Vendor commands exist; no typed AxionPro shift/holiday device-sync endpoints exist. | **PENDING** |
| Generic command status/history API | Submission exists, dedicated authenticated status/history/cancel/retry read contract does not. | **PENDING** |
| User/device reconciliation | Vendor user list commands exist; no business reconciliation API identifies missing, extra or mismatched device users. | **PENDING** |

### 22.2 Required Employee bulk-to-device API family — proposed 8 endpoints

Use a separate asynchronous job. Do not add thousands of device commands inside the Employee import database transaction. The Employee bulk import may optionally create a follow-on device-deployment job only after employee rows have committed successfully.

Recommended base route: `/api/EmployeeDeviceEnrollment/bulk`.

| Method and route | Purpose |
| --- | --- |
| `POST /preview` | Validate existing opaque Employee IDs, target device IDs, location eligibility, capability, duplicates and command capacity without writing enrollment rows. |
| `POST /confirm` | Confirm a saved preview and queue the deployment job. |
| `GET /jobs/{jobId}` | Progress and per employee/device result. |
| `GET /jobs` | Actor/Tenant-scoped job history. |
| `POST /retry` | Retry failed/pending rows only; never duplicate confirmed rows. |
| `POST /cancel` | Stop rows not yet submitted; already queued device commands remain auditable. |
| `GET /template` | CSV template for existing employee/device mapping. |
| `GET /jobs/{jobId}/report` | Sanitized row result report without credentials or raw IDs. |

Proposed CSV for **existing employees**:

```csv
EmployeeId,TenantDeviceId,AccessEffectiveFromDateTime,AccessEffectiveToDateTime,MondayStart,MondayEnd,IsActive
opaque-employee-id,opaque-device-id,2026-09-13T00:00:00Z,,09:00:00,18:00:00,true
```

Both IDs must be opaque IDs returned by authenticated APIs. A human-readable employee code/device code may be accepted only after an explicit, unambiguous same-Tenant resolution rule is approved.

Proposed preview request is multipart and follows the existing bulk framework:

```text
File = employee-device-enrollment.csv
ModuleId = dynamically resolved EMP_DEVICES module ID
OperationId = dynamically resolved Import operation ID
RequestId = client UUID
```

Proposed confirm:

```json
{
  "jobId": "2cc585cb-5d50-4e5f-913e-b9486cb39c89",
  "scheduledAtUtc": null,
  "moduleId": 0,
  "operationId": 0
}
```

For each valid row, the worker should create/reuse `EmployeeDeviceEnrollment`, save access windows and queue baseline `setuserinfo`. Face, fingerprint, card and PIN must not be fabricated by bulk import. They require a separately supplied protected credential or later typed enrollment action.

Recommended Angular bulk UI:

```text
[Device Employees > Bulk add]
          |
          v
[CSV/XLSX | Paste | Select existing employees]
          |
          v
[One device | Selected devices | Approved location policy]
          |
          v
[Map columns and weekly access windows]
          |
          v
[Preview]
 Valid | Existing | Invalid | Location ineligible | Offline warning
          |
          v
[Explicit confirmation]
          |
          v
[Background deployment job]
 Queued -> Running -> Completed / With errors / Failed / Cancelled
          |
          +--> [Per Employee x Device result]
          +--> [Retry failed rows]
          +--> [Download sanitized report]
```

| UI area | Required behavior |
| --- | --- |
| Source | Accept existing opaque Employee/device IDs; template and paste options follow existing bulk conventions. |
| Targets | Require explicit device(s) or approved policy. Show location, enrollment flag, transport and online/stale state. |
| Schedule | Set validity and Monday-first weekly windows. Do not accept Face/Card/PIN in an ordinary CSV. |
| Preview | One row per Employee x Device; show existing enrollment, eligibility and safe validation errors. |
| Confirmation | Show enrollment-row and command counts. Confirmation queues work; it is not device completion. |
| Progress | Poll every 2-5 seconds, restore from history, cancel safely and retry only failed/pending rows. |
| Results | Separate HRMS mapping creation from confirmed physical deployment. Reports exclude all secrets and payloads. |

### 22.3 Employee import integration — no new public import API required

The existing Employee bulk endpoints should remain the Employee source-of-truth workflow. Add an explicit, optional post-import deployment choice rather than silently putting every new employee on every device.

Recommended confirmed behavior:

1. Employee import completes its current Employee/LoginCredential/UserRole transaction and records imported opaque employee results.
2. If the user selected device deployment before confirmation, create a linked `EmployeeDeviceDeploymentJob` only for successfully created employees.
3. The user selects one or more target devices or a location-based policy. The system must not guess a device.
4. Device deployment is separately retryable/cancellable and does not roll back employee creation.
5. Employee import job response adds a safe linked deployment-job reference and counts; it does not embed command payloads.

Required unresolved decisions before implementation:

- Are targets selected devices, all attendance devices at the employee's active location, or a reusable assignment policy?
- If an employee has multiple active locations, which devices receive the user?
- Should existing matched employees be deployed, or only newly created rows?
- What should happen when a target device is offline for days?
- Whether baseline enrollment sends name only or also approved schedule/access data.

### 22.4 Automatic Employee active-status synchronization

`PUT /api/Employee/update-status` should remain the HRMS status API. Device synchronization should be a durable post-commit workflow, not a browser loop calling every enrollment.

Proposed behavior on deactivation:

```text
Employee becomes inactive in HRMS
  -> transaction records EmployeeStatusChanged outbox event
  -> worker finds all active EmployeeDeviceEnrollment rows in same Tenant
  -> queue enableuser { enrollid, enflag:false } per active device
  -> enrollment keeps business history but deployment status becomes Queued
  -> command responses mark each target Completed/Failed
```

Reactivation must re-enable only enrollments that are still active, within validity, at valid active locations/devices, and allowed by enrollment policy. It must not recreate deleted credentials automatically.

Recommended observability APIs — proposed 3:

| Method and route | Purpose |
| --- | --- |
| `GET /api/EmployeeDeviceSync/employee/{employeeId}` | Per-device desired/actual status and latest command result. |
| `GET /api/EmployeeDeviceSync/failures` | Tenant-scoped synchronization failures needing action. |
| `POST /api/EmployeeDeviceSync/retry` | Retry selected failed synchronization rows with permission/audit. |

Suggested response:

```json
{
  "employeeId": "opaque-employee-id",
  "desiredEmployeeStatus": "Inactive",
  "devices": [
    {
      "tenantDeviceId": "opaque-device-id",
      "deviceCode": "DEL-HQ-01",
      "desiredDeviceUserStatus": "Disabled",
      "commandStatus": "AwaitingResponse",
      "lastAttemptDateTime": "2026-09-13T10:00:00Z",
      "lastError": null
    }
  ]
}
```

If immediate employee deactivation is security-critical, HRMS deactivation must succeed even when a device is offline; access is then reported as **pending physical-device enforcement**, not falsely completed.

### 22.5 Production attendance ingestion and missed-log recovery

Vendor PDFs confirm terminal-pushed `sendlog` records with `enrollid`, `time`, `mode`, `inout`, `event`, optional temperature/image and log index. They also confirm server commands `getnewlog` and `getalllog`.

Required backend flow:

```text
private authenticated device gateway
  -> validate token + serial + TenantDevice
  -> idempotency key: device + logindex and/or canonical event fingerprint
  -> resolve enrollid through same-Tenant EmployeeDeviceEnrollment
  -> store immutable raw normalized punch
  -> queue attendance processing
  -> calculate business attendance under policy/shift/time zone
  -> preserve unmatched punches for reconciliation, never silently discard
```

Proposed UI/administration APIs — 6:

| Method and route | Purpose |
| --- | --- |
| `GET /api/DeviceAttendance/events` | Paged normalized device punches with filters and matched/unmatched status. |
| `GET /api/DeviceAttendance/events/{eventId}` | One sanitized event, processing history and source device. |
| `POST /api/DeviceAttendance/sync` | Queue `getnewlog` for selected device and date/index recovery policy. |
| `POST /api/DeviceAttendance/full-reconcile` | High-risk Host/Tenant action using `getalllog`, rate and date bounded. |
| `GET /api/DeviceAttendance/sync-jobs/{jobId}` | Streamed-command progress, batch counts and terminal state. |
| `POST /api/DeviceAttendance/unmatched/{eventId}/resolve` | Map/resolve an unmatched punch with audit; never edit raw event. |

Do not use `/api/Attendance/timmy-test` in production. It is `[AllowAnonymous]`, logs raw diagnostic content and contains temporary fallback behavior.

Verification modes from the HTTP PDF: `1 Fingerprint`, `2 Password`, `3 Card`, `8 Face`; `inout 0 In`, `1 Out`. Event values can be firmware/custom-key specific and require a server-owned mapping/DDL, not hard-coded Angular labels.

### 22.6 Shift, holiday and employee access schedules

Vendor PDFs confirm `setshift/getshift`, `setholiday/getholiday` and user access/lock commands. AxionPro already has professional HRMS work pattern/arrangement and holiday concepts; the device representation must be treated as a deployment projection, not the source of truth.

Proposed typed endpoints — 6:

| Method and route | Purpose |
| --- | --- |
| `POST /api/TenantDeviceSchedule/shift/apply` | Project approved HRMS shifts to selected devices. |
| `GET /api/TenantDeviceSchedule/shift/status` | Desired vs deployed shift versions per device. |
| `POST /api/TenantDeviceSchedule/holiday/apply` | Project selected holiday calendar; vendor PDF maximum is 30 holiday entries. |
| `GET /api/TenantDeviceSchedule/holiday/status` | Desired vs deployed holiday version. |
| `POST /api/TenantDeviceSchedule/employee-access/apply` | Project one enrollment's validated weekly/time-zone access rules. |
| `GET /api/TenantDeviceSchedule/employee-access/status` | Per enrollment/device deployment status. |

Never let the physical device overwrite HRMS shift/holiday policy. If firmware limits cannot represent an HRMS rule, return a preview warning/error and retain HRMS as authoritative.

### 22.7 Device log cleanup and retention

`cleanlog` and `cleanlogphoto` are destructive. A professional system must not expose a simple “Delete logs” button.

Proposed typed endpoints — 4:

| Method and route | Purpose |
| --- | --- |
| `POST /api/DeviceLogRetention/preview` | Show device, last synchronized index/time, unsynced-risk count and retention policy. No deletion. |
| `POST /api/DeviceLogRetention/execute` | Queue `cleanlog` only after proof that required records are durably persisted and approved. |
| `POST /api/DeviceLogRetention/photos/execute` | Separately clean device photos under privacy retention policy. |
| `GET /api/DeviceLogRetention/jobs/{jobId}` | Audit/status including approver, command and reconnect/verification result. |

Recommended safety gates: dedicated permission, confirmation phrase, optional dual approval, minimum retention period, recent successful full sync, no unresolved gaps, immutable audit, and no automatic retry that could cross an unreviewed data boundary.

### 22.8 Reconciliation, health and command operations

Proposed professional control-plane APIs — 10:

| Method and route | Purpose |
| --- | --- |
| `GET /api/DeviceCommands/{commandId}` | Safe command status without payload. |
| `GET /api/DeviceCommands` | Filtered Tenant/device command history. |
| `POST /api/DeviceCommands/{commandId}/retry` | Permission-checked retry of a failed command. |
| `POST /api/DeviceCommands/{commandId}/cancel` | Cancel only before physical dispatch. |
| `POST /api/DeviceReconciliation/users/start` | Queue streamed user-list read. |
| `GET /api/DeviceReconciliation/users/{jobId}` | Missing/extra/mismatched employees and credentials. |
| `POST /api/DeviceReconciliation/users/repair` | Explicitly repair selected differences; never mass-delete by default. |
| `GET /api/DeviceHealth/summary` | Fleet online/stale/offline, queue depth, firmware/capacity and last error. |
| `GET /api/DeviceHealth/{tenantDeviceId}/diagnostics` | Sanitized connectivity, clock drift, capacity and command health. |
| `POST /api/DeviceHealth/{tenantDeviceId}/probe` | Typed `getdevinfo/gettime/getdevcap` diagnostic job. |

### 22.9 Access-control and door operations — optional licensed module

Vendor protocol confirms door status/open/control concepts. These must remain separate from attendance permissions.

Proposed typed endpoints — 4:

| Method and route | Purpose |
| --- | --- |
| `GET /api/DeviceAccessControl/{tenantDeviceId}/door-status` | Read current door state. |
| `POST /api/DeviceAccessControl/{tenantDeviceId}/open-door` | Time-limited, reason-required remote open. |
| `POST /api/DeviceAccessControl/{tenantDeviceId}/lock-control` | Typed controlled lock action. |
| `GET /api/DeviceAccessControl/events` | Door/alarm/tamper event list. |

Require `TENANT_DEVICE_ACCESS_CONTROL` or equivalent existing approved module, reason text, actor/device/location audit and optional step-up authentication. Ordinary HR attendance roles must not inherit door-open access.

### 22.10 Fleet features beyond a basic professional HRMS — proposed later phase

- Firmware inventory and signed OTA campaign preview/rollout/pause/rollback.
- Device capability/capacity alerts before enrollment.
- Clock-drift monitoring and bounded auto-sync.
- Certificate/credential expiry and rotation without secret exposure.
- Offline command expiry and dead-letter queue.
- Device replacement workflow that migrates desired enrollments/configuration without copying stale secrets.
- Multi-device desired-state reconciliation by location/group.
- Attendance anomaly pipeline: duplicate punch, impossible travel, clock skew, repeated access denial and unknown enroll ID.
- Privacy retention for punch images/temperature and biometric templates.
- Webhook/notification events for offline device, sync failure, storage threshold and repeated rejected command.

### 22.11 Proposed count and implementation sequence

The recommended minimum described above adds **37 typed/admin endpoints**: 8 bulk enrollment, 3 employee sync, 6 attendance, 6 schedule, 4 retention and 10 command/reconciliation/health. The optional licensed door module adds 4 more, making **41 proposed endpoints**. This count is a design inventory, not implemented API count.

Recommended order:

1. Generic safe command status/history (needed by every later screen).
2. Employee deactivate/reactivate outbox synchronization.
3. Bulk existing-employee enrollment and optional Employee-import follow-on job.
4. Production `sendlog` ingestion, idempotency and attendance processing.
5. Missed-log sync/reconciliation.
6. Shift/holiday/employee-access projection.
7. Retention cleanup only after ingestion/reconciliation is proven.
8. Fleet health and user reconciliation.
9. Optional door/access-control module.

No item in this section is marked implemented or production-ready. Each new endpoint requires the repository's established permission pipeline, DTO/handler/repository conventions, automated tests in `axionpro.automationtests`, UI handoff updates and scenario evidence under `docs/testing` before COMPLETE status.
