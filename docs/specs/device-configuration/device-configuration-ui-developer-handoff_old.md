# Device Configuration — UI Developer Handoff

## Physical device prerequisites — complete before using the UI

This is the technician checklist for the physical AiFace device. Complete it
before a Host user generates a bootstrap URL or a Tenant Admin applies runtime
settings.

| Area                                   | Required device-side value / action                                                                                                                                                              | Why it is required                                                                                                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Firmware and serial                    | Confirm the device serial number, model and firmware. This implementation was designed from the observed `ai806_f06v_v5.16` response.                                                            | The bootstrap URL is bound to the exact serial number; vendor fields can vary across firmware.                                                                                                              |
| Power / time                           | Device is powered, date/time is reasonable, and it can remain online while testing.                                                                                                              | A command is delivered only when the device polls the cloud.                                                                                                                                                |
| Internet path                          | Connect device through Wi-Fi or Ethernet to a network that can make outbound HTTPS connections to `axionpro-api.onrender.com:443`.                                                               | AxionPro does not open an inbound connection to the device LAN IP. DNS and outbound TCP 443 are required.                                                                                                   |
| DNS                                    | The network must resolve `axionpro-api.onrender.com`. If DHCP/DNS is unreliable, set a valid DNS server on the device/network.                                                                   | The device is configured using a domain URL, not a fixed cloud IP.                                                                                                                                          |
| Device network                         | Use DHCP or a reserved IP; record its local IP only for on-site setup/troubleshooting. Do not add router port-forwarding.                                                                        | Local IP is not part of AxionPro cloud configuration and must not be exposed publicly.                                                                                                                      |
| LAN security                           | Put devices on a separate device VLAN/management network and firewall their local management port from employee/user networks.                                                                   | Someone on the same LAN may otherwise call the device IP directly, independent of AxionPro permissions.                                                                                                     |
| Current local password                 | Technician must know the current device WebServer/API password before Tenant Admin runtime configuration. During the observed test device it was the local WebServer password from `getdevinfo`. | The backend needs it only once to create the protected `setdevinfo` command; it is not saved or returned.                                                                                                   |
| Default bootstrap URL template         | `https://axionpro-api.onrender.com/api/initial/{SNo}/{one-time-opaque-token}`                                                                                                                    | This is the first URL pattern. Host UI generates the real full URL; technician must paste that real returned URL, not this template or a serial-only URL.                                                   |
| Default permanent gateway URL template | `https://axionpro-api.onrender.com/device-gateway/{opaque-token}`                                                                                                                                | This is the normal steady-state URL after Tenant Admin applies the initial runtime configuration. The device receives it automatically in protected `setdevinfo`; do not type or invent the token manually. |
| Physical device selection              | In **Comm set → Server**, set **Server Req = Yes** and **Use domain name = Yes**.                                                                                                                | This tells the device to initiate cloud communication using the issued domain URL.                                                                                                                          |
| Initial gateway URL                    | After Host clicks **Issue bootstrap URL**, copy the entire returned `initialGatewayUrl` into **DomainNm**. Do not manually remove the serial or token from the URL.                              | The URL contains the serial plus a one-time opaque credential; `/api/initial/{SNo}` without the token is intentionally invalid.                                                                             |
| Server port                            | Set **SerPortNo = 443**.                                                                                                                                                                         | The public AxionPro gateway accepts HTTPS only.                                                                                                                                                             |
| Initial heartbeat                      | Set heartbeat to **20 seconds**.                                                                                                                                                                 | This is the requested initial polling interval and makes command delivery/testing timely.                                                                                                                   |
| Verification                           | Wait for the device to poll. Then complete TenantDevice assignment, save the permanent HTTPS configuration, and apply runtime settings from Tenant Admin UI.                                     | The initial command switches the device to its permanent per-Tenant opaque gateway URL.                                                                                                                     |
| Local API disable                      | After successful runtime configuration, verify that the device's local WebServer/API is disabled.                                                                                                | The secure configuration queues `use_webserver = 0`; confirm it works with the exact firmware before relying on it.                                                                                         |

### Technician sequence on the physical device

```text
1. Connect Wi-Fi/Ethernet and confirm device has Internet + DNS.
2. Confirm serial number matches the DeviceMaster selected by Host.
3. Host generates one-time bootstrap URL in AxionPro UI.
4. On device: Comm set -> Server:
     Server Req       = Yes
     Use domain name  = Yes
     DomainNm         = paste complete initialGatewayUrl
                        https://axionpro-api.onrender.com/api/initial/{SNo}/{one-time-opaque-token}
     SerPortNo        = 443
     Heartbeat        = 20 seconds
5. Save settings and wait for the device to poll AxionPro.
6. Do not configure MQTT/MQTTS for this HTTPS flow.
7. Tenant Admin finishes permanent configuration from AxionPro UI.
8. Confirm heartbeat appears, then verify local WebServer is no longer reachable.
```

Do not use Postman against `http://{device-local-ip}/api` as a normal operating
path. It may be used only by an authorised technician during isolated initial
firmware verification. Once the HTTPS flow is working, local WebServer access
must be disabled and network-isolated.

### Local Postman request — initial device setup only

This is the **one temporary technician request** used to put a new device onto
its initial cloud route. It is not an Angular call and it must not be exposed
in the production UI.

1. Host first calls `POST /api/initial-device-configure/issue-bootstrap-url`.
2. Copy the exact `data.initialGatewayUrl` returned by that API. It will look
   like this, with a real server-generated token at the end:

   ```text
   https://axionpro-api.onrender.com/api/initial/AYUC24030780/0123abc...64-hex-characters
   ```

3. In Postman make this request to the device's **local LAN IP**:

   ```http
   POST http://192.168.1.17/api
   Content-Type: application/json
   ```

4. Use **Body → raw → JSON**, then paste this exact shape. Replace only the
   two marked values: the current device password and the URL returned in step
   1. Keep `{{$timestamp}}000` unquoted; Postman resolves it to the current
      Unix time in milliseconds.

   ```json
   {
     "cmd": "setdevinfo",
     "password": "PASTE_CURRENT_DEVICE_WEBSERVER_PASSWORD",
     "nowtime": {{$timestamp}}000,
     "use_bs": 1,
     "use_domain_name": 1,
     "bs_domain_name": "PASTE_THE_COMPLETE_initialGatewayUrl_FROM_HOST_API_HERE",
     "serverport": 443,
     "server_response_time": 20,
     "use_webserver": 1
   }
   ```

For the current device serial, after the Host API generates the token, the
`bs_domain_name` value must be exactly this full form:

```text
https://axionpro-api.onrender.com/api/initial/AYUC24030780/{real-token-returned-by-Host-API}
```

It cannot safely be written with a fixed token in this document: each token is
random, valid only for the selected serial, expires (default two hours), and is
shown by AxionPro once. A serial-only URL such as
`https://axionpro-api.onrender.com/api/initial/AYUC24030780` will correctly
fail because it has no credential.

Expected device response:

```json
{
  "ret": "setdevinfo",
  "sn": "AYUC24030780",
  "result": true
}
```

`"result": true` means the device accepted the local setting—not yet that it
has connected to cloud. Wait up to the 20-second heartbeat interval and then
check the Tenant device configuration health values.

Do **not** use `"use_webserver": 0` in this initial Postman request. The
Tenant Admin runtime configuration API sends that only after the cloud path is
working, so that the technician is not locked out before a successful device
heartbeat.

## Purpose and scope

This document is the frontend contract for the secure physical-device setup
feature. It covers only the device-related controllers and screens needed for:

1. registering a physical device to a Tenant;
2. giving an unassigned device its first, temporary cloud URL;
3. switching it to AxionPro's permanent HTTPS device gateway;
4. allowing a Tenant Admin to change approved runtime settings; and
5. preventing configuration through a direct device IP or arbitrary vendor JSON.

The API base URL in production is:

```text
https://axionpro-api.onrender.com
```

All browser-to-AxionPro calls need the normal authenticated Bearer token. The
only unauthenticated route is a device-only bootstrap polling URL that Angular
must never call.

## Roles and access model

| User                     | What the UI may show                                                                                 | Required module                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Host provisioning user   | Generate/copy a temporary first-connection URL.                                                      | `HOST_INITIAL_DEVICE_CONFIGURATION` with Create or Add permission.    |
| Tenant Admin             | Create/read/update/delete the Tenant gateway configuration; apply approved runtime settings; reboot. | `TENANT_DEVICE_CONFIGURATION` with the relevant operation permission. |
| Ordinary Tenant employee | No device configuration or reboot controls.                                                          | Do not grant this module.                                             |
| Physical device          | Calls its URL itself. No login/JWT/UI involvement.                                                   | Opaque route token only.                                              |

`moduleId` and `operationId` must come from the authenticated user's permitted
menu/operation metadata. They are examples in the JSON below—not hard-coded
values. The backend validates the module **code**, so passing another module ID
does not bypass permission checks.

## End-to-end UI flow

```text
Host screen                         Physical device                 Tenant Admin screen
-----------                         ---------------                 -------------------
1. Select unassigned DeviceMaster
2. Issue temporary bootstrap URL
3. Copy URL once
4. Enter it on Device > Server
   Use domain name = Yes
   heartbeat = 20
                                         5. POSTs outbound HTTPS
                                            to temporary URL
6. Register/assign TenantDevice
                                                                     7. Save HTTPS gateway config
                                                                     8. Apply runtime config
                                         9. Receives setdevinfo:
                                            permanent gateway URL,
                                            heartbeat/volume,
                                            disable local WebServer
                                         10. POSTs outbound HTTPS
                                             to permanent gateway
                                                                     11. Show last connection /
                                                                         heartbeat state
```

Important: the temporary initial URL contains a secret token. Show it in the UI
only immediately after generation, with Copy and Expiry information. Do not
place it in a list page, browser local storage, application logs, analytics, or
support screenshot.

---

## New controller: `InitialDeviceConfigureController`

Base route:

```text
/api/initial-device-configure
```

### A. Issue a first-connection URL — Host only

```http
POST /api/initial-device-configure/issue-bootstrap-url
Authorization: Bearer {hostAccessToken}
Content-Type: application/json
```

Request body:

```json
{
  "deviceMasterId": 1,
  "lifetimeMinutes": 120,
  "moduleId": 123,
  "operationId": 456
}
```

| Field                      | Required | UI rule                                                                                 |
| -------------------------- | -------: | --------------------------------------------------------------------------------------- |
| `deviceMasterId`           |      Yes | Select an active, unassigned device that has `supportsHttps = true`.                    |
| `lifetimeMinutes`          |       No | Default `120`; allowed range is 5–1,440 minutes. Use 120 unless Host chooses otherwise. |
| `moduleId` / `operationId` |      Yes | Use Host initial-provisioning module and Create/Add operation IDs. Never send `0`.      |

Success data shape:

```json
{
  "deviceSerialNumber": "AYUC24030780",
  "initialGatewayUrl": "https://axionpro-api.onrender.com/api/initial/AYUC24030780/{opaque-token}",
  "heartbeatIntervalSeconds": 20,
  "expiresDateTime": "2026-09-06T12:00:00Z"
}
```

Host UI behaviour:

- Present `initialGatewayUrl` in a password-style/copy-only panel with an
  explicit expiry countdown.
- Warn: “This URL will not be shown again.”
- Show setup instructions: on the device go to **Comm set → Server**, set
  **Server Req = Yes**, **Use domain name = Yes**, paste the entire URL in
  **DomainNm**, set **SerPortNo = 443**, then set heartbeat to **20**.
- Do not make an HTTP request from Angular to that returned URL. The physical
  device performs the POST.

### B. Apply approved runtime configuration — Tenant Admin only

```http
POST /api/initial-device-configure/apply-runtime-configuration
Authorization: Bearer {tenantAdminAccessToken}
Content-Type: application/json
```

Request body:

```json
{
  "tenantDeviceId": 4,
  "moduleId": 123,
  "operationId": 456,
  "currentWebServerPassword": "current-device-password",
  "heartbeatIntervalSeconds": 20,
  "volume": 8,
  "disableLocalWebServer": true,
  "newWebServerPassword": "optional-new-device-password",
  "rebootAfterApply": true
}
```

| Field                      | Required | Validation / UI behaviour                                                                                                                          |
| -------------------------- | -------: | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tenantDeviceId`           |      Yes | Select only a device belonging to the logged-in Tenant.                                                                                            |
| `moduleId` / `operationId` |      Yes | Use `TENANT_DEVICE_CONFIGURATION` and Update/Edit operation IDs.                                                                                   |
| `currentWebServerPassword` |      Yes | Password control; 4–128 chars. Keep only in component memory; clear the field immediately after response. Never local-store, log, or redisplay it. |
| `heartbeatIntervalSeconds` |      Yes | 10–3,600; default/show **20**.                                                                                                                     |
| `volume`                   |       No | 0–15. Omit if it should remain unchanged.                                                                                                          |
| `disableLocalWebServer`    |      Yes | Locked to `true` in UI. The secure workflow does not allow it to be unchecked.                                                                     |
| `newWebServerPassword`     |       No | 8–128 chars. Show only after deliberate “rotate local password” action. It is never returned by the API.                                           |
| `rebootAfterApply`         |      Yes | Default `true`; show a confirmation because the device will temporarily disconnect.                                                                |

Success data shape:

```json
{
  "configurationCommandId": 1001,
  "configurationTrackingId": "4e9c1a22-1dbd-4f9d-a935-000000000000",
  "rebootCommandId": 1002,
  "rebootTrackingId": "c36cc8c2-b712-4e51-a00d-000000000000",
  "status": "Queued"
}
```

`Queued` means the server safely stored the command. It does **not** mean that
the device has already applied it. Refresh the Tenant configuration list and
show `lastHeartbeatDateTime`, `lastSuccessfulConnectionDateTime`,
`lastFailedConnectionDateTime`, and `lastConnectionError` as the device polls.

### C. Reboot only — Tenant Admin only

```http
POST /api/initial-device-configure/reboot
Authorization: Bearer {tenantAdminAccessToken}
Content-Type: application/json
```

```json
{
  "tenantDeviceId": 4,
  "moduleId": 123,
  "operationId": 456
}
```

Show a confirmation dialog. On success, display the returned `deviceCommandId`
and `internalTrackingId` as “Reboot queued”; do not say “reboot completed”
until a later device heartbeat confirms reconnect.

---

## Device-only controller: `InitialDeviceGatewayController`

```http
POST /api/initial/{deviceSerialNumber}/{opaque-token}
Content-Type: application/json
```

This route receives the vendor device's polling JSON. It is:

- anonymous by design because an opaque, 64-hex token is the credential;
- hidden from Swagger/API explorer;
- rate-limited and payload-bounded;
- not an Angular endpoint;
- not a Postman endpoint for an operator.

Never build a UI button, service method, or direct test around this route. The
Host UI only copies the generated URL to the person configuring the physical
device.

---

## Existing controllers used by the UI

### 1. `DeviceMasterController` — Host catalog

Base route: `/api/DeviceMaster`

| Endpoint                                                                     | Use in device flow                                                                                                          |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `GET /get-all`                                                               | Populate Host's DeviceMaster selector. Filter/select only `isActive` and `supportsHttps` models for bootstrap.              |
| `GET /get-by-id/{id}`                                                        | Detail/edit view.                                                                                                           |
| `POST /create`, `POST /update`, `POST /update-status`, `DELETE /delete/{id}` | Existing Host catalog management. Ensure the correct HTTPS capability is set; do not set MQTTS just to use this HTTPS flow. |

### 2. `TenantDeviceController` — physical Tenant installation record

Base route: `/api/TenantDevice`

| Endpoint                                                     | Use in device flow                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /create`                                               | Create/assign the physical device to Tenant + `tenantLocationId` after Host provisioning. Key fields: `tenantId` (Host context only), `tenantLocationId`, `deviceMasterId`, `deviceCode`, `deviceName`, installation values, `isAttendanceDevice`, `isActive`, plus `moduleId`/`operationId`. |
| `GET /get-by-id/{id}`, `GET /get-all`                        | Select device and show physical installation information.                                                                                                                                                                                                                                     |
| `POST /update`, `POST /update-status`, `DELETE /delete/{id}` | Existing physical-device lifecycle screens. These are not runtime configuration calls.                                                                                                                                                                                                        |

### 3. `TenantDeviceConfigurationController` — permanent HTTPS connection configuration

Base route: `/api/TenantDeviceConfiguration`

The configuration CRUD is now Tenant-only and requires
`TENANT_DEVICE_CONFIGURATION`. Use it before calling runtime configuration.

| Endpoint                              | UI use                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /create`                        | Create the normal connection record. Required secure values: `tenantDeviceId`, `commandTransport: 4` (**HTTPS**), `serverUrl: "https://axionpro-api.onrender.com"`, `serverPort: 443`, `serverPath: "/device-gateway"`, `heartbeatIntervalSeconds: 20`, `moduleId`, `operationId`. Also retain normal enrollment/attendance/autosync flags. |
| `GET /get-by-id/{id}`, `GET /get-all` | Configuration form and health/telemetry list. Display timestamps/errors but never a raw gateway token.                                                                                                                                                                                                                                      |
| `POST /update`                        | Update stored connection settings. Do not use it to send passwords or raw device settings.                                                                                                                                                                                                                                                  |
| `POST /rotate-https-ingress-token`    | Recovery-only action. It returns a new permanent opaque device URL once. Show a high-risk confirmation and manual device reconfiguration instructions; do not expose it in normal day-to-day UI.                                                                                                                                            |
| `DELETE /delete/{id}`                 | Remove configuration only with a destructive-action confirmation.                                                                                                                                                                                                                                                                           |

### 4. `DeviceCommandController` — do not use for configuration

```text
POST /api/device-commands/submit
```

This legacy generic endpoint remains for protocol-approved operational commands
only. Do **not** use it for `setdevinfo`, reboot, wipe/clean, upgrade,
write-file, or other device-global configuration. Those are deliberately
blocked so a browser cannot bypass Tenant Admin typed validation.

---

## Screen and component checklist

| Screen                      | User                          | APIs                                            | Required behaviour                                                                                    |
| --------------------------- | ----------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Initial Device Provisioning | Host                          | `DeviceMaster/get-all`, `issue-bootstrap-url`   | Device selector, validity choice, single-use URL copy and on-device instructions. No device-IP field. |
| Physical Device Assignment  | Existing Host/authorized flow | `TenantDevice/create`, `get-all`                | Assign selected DeviceMaster to Tenant location. Keep it distinct from connection/runtime settings.   |
| HTTPS Gateway Configuration | Tenant Admin                  | `TenantDeviceConfiguration/create/update/get-*` | Lock transport to HTTPS (`4`), server URL/path/port to approved values, heartbeat to 20.              |
| Runtime Settings            | Tenant Admin                  | `apply-runtime-configuration`                   | Heartbeat/volume/password fields, WebServer disable fixed true, secure confirm and queued state.      |
| Device Health               | Tenant Admin                  | `TenantDeviceConfiguration/get-all`             | Last heartbeat/success/failure/error display; refresh after configuration/reboot.                     |
| Reboot confirmation         | Tenant Admin                  | `reboot`                                        | Explicit confirmation, then show “Queued” and wait for reconnect heartbeat.                           |

## Frontend security requirements

1. Never call `http://{device-ip}/api` from Angular. Do not display local IP
   control buttons or raw vendor JSON editors.
2. Never store a WebServer password or either gateway URL token in local
   storage, session storage, Redux/NgRx persisted state, logs, analytics, or
   error tracking. Clear password form controls after the request completes.
3. Treat every endpoint response as data, not as HTML; preserve normal Angular
   output escaping.
4. Do not rely only on hidden buttons. The backend is authoritative, but the UI
   should use permission metadata to hide screens/actions not granted.
5. Display only `Queued` after submission. Determine device recovery from the
   later gateway heartbeat values, not from an optimistic UI response.
6. On `401`, return to login; on `403`, show “You do not have device
   configuration permission”; on validation errors, show the server message
   without echoing password values.

## Production dependency checklist

Before enabling the screens, backend/DB deployment must have completed:

1. Run `database-scripts/AddSecureInitialDeviceConfiguration.sql`.
2. Run `database-scripts/CreateDeviceConfigurationModules.sql`.
3. Grant the Host module to approved provisioning users and the Tenant module
   only to Tenant Admin users.
4. Deploy the API with `DeviceGateway:PublicBaseUrl` set to the public HTTPS
   base address.
5. Verify `use_webserver` and `webserver_pwd` behavior against firmware
   `ai806_f06v_v5.16` on a non-production device.
6. Keep devices on a restricted VLAN/firewall segment. Cloud API authorization
   cannot itself stop an arbitrary laptop already on the same device LAN.

## Backend implementation status

- New secure controller: `InitialDeviceConfigureController`.
- New device-only bootstrap controller: `InitialDeviceGatewayController`.
- Existing Tenant configuration authorization tightened to Tenant module code.
- Generic device-global command bypass blocked.
- Secure provisioning database and module seed SQL prepared.
- Backend build: 0 errors.
- Security token tests: 5 passed, 0 failed.
