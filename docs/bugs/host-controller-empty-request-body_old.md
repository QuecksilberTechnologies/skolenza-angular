# Every `POST /api/Host/*` rejects a valid JSON body as empty

**Component:** AxionPro API — `Host` controller
**Severity:** Blocker — all host-side writes are impossible from any client
**Reported:** 2026-08-16
**Environment:** `https://axionpro-api.onrender.com`, authenticated with a Host user token

## Summary

Every `POST` endpoint on the `Host` controller returns HTTP 400 with a model-binding error claiming
the request body is empty, even when a well-formed JSON body matching the documented DTO is sent.

The failure is server-side and reproduces with plain `curl` — no browser, framework, or client
library is involved. The `HostRolePermission` controller accepts POST bodies normally, and every
`Host` GET endpoint works, so the problem is scoped to the `Host` controller's POST pipeline.

## Reproduce

```bash
curl -X POST 'https://axionpro-api.onrender.com/api/Host/update-host-user' \
  -H 'authorization: Bearer <host user token>' \
  -H 'content-type: application/json' \
  --data-raw '{"id":999999,"hostRoleId":2,"name":"Probe","loginId":"probe@example.invalid","email":"probe@example.invalid","mobileNumber":"0000000000","isActive":true}'
```

The id `999999` does not exist, so this probe mutates nothing.

**Actual response — HTTP 400:**

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "$": [
      "The input does not contain any JSON tokens. Expected the input to start with a valid JSON token, when isFinalBlock is true. Path: $ | LineNumber: 0 | BytePositionInLine: 0."
    ],
    "requestDTO": ["The requestDTO field is required."]
  },
  "traceId": "00-f712f807efb404fc944fc57859323063-8c920077a92bd4d9-00"
}
```

**Expected:** the request binds to `UpdateHostUserRequestDTO` and the endpoint returns the standard
envelope — either `isSucceeded: true`, or a "host user not found" message for this probe id.

The request body matches `UpdateHostUserRequestDTO` in the published Swagger document field for
field (`id`, `hostRoleId`, `name`, `loginId`, `email`, `mobileNumber`, `isActive`).

## Scope

Verified in a single session with one Host token.

| Endpoint                                                       | Body sent                               | Result                       |
| -------------------------------------------------------------- | --------------------------------------- | ---------------------------- |
| `POST /api/Host/update-host-user`                              | valid `UpdateHostUserRequestDTO`        | **400 — body read as empty** |
| `POST /api/Host/delete-host-user`                              | `{"id":999999}`                         | **400 — same error**         |
| `POST /api/Host/update-host-role`                              | valid `UpdateHostRoleRequestDTO`        | **400 — same error**         |
| `POST /api/Host/reset-host-user-password`                      | valid `ResetHostUserPasswordRequestDTO` | **400 — same error**         |
| `POST /api/HostRolePermission/save-role-module-permissions`    | valid DTO                               | 200 — persists correctly     |
| `GET /api/Host/get-all-host-roles`                             | —                                       | 200                          |
| `GET /api/Host/get-host-modules?isActive=true`                 | —                                       | 200                          |
| `GET /api/HostRolePermission/get-role-module-permissions/{id}` | —                                       | 200                          |

The content type is not the trigger. All of the following produce the byte-identical error:

- `application/json`
- `application/json; charset=utf-8`
- `text/json`
- `application/*+json`

The last three are the content types the endpoint's own Swagger `requestBody` advertises.

## Evidence that the body arrives and is then discarded

Sending **no** body produces a _different_ error than sending a valid one:

| Request         | `errors` key | Message                                                                                                                                                                          |
| --------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Valid JSON body | `"$"`        | "The input does not contain any JSON tokens. Expected the input to start with a valid JSON token, when isFinalBlock is true. Path: $ \| LineNumber: 0 \| BytePositionInLine: 0." |
| No body at all  | `""`         | "A non-empty request body is required."                                                                                                                                          |

The no-body case is rejected before the input formatter runs, on the `Content-Length: 0` check. The
body-present case gets past that check, reaches the JSON input formatter, and the formatter then
reads **zero bytes** from the stream.

In other words: the payload does reach the server, and something consumes it before model binding.

## Suggested investigation

In order of likelihood:

1. **A component reading `Request.Body` without buffering.** Middleware, an action filter, or an
   audit/logging component on the Host pipeline reading the request stream and neither calling
   `HttpContext.Request.EnableBuffering()` beforehand nor rewinding
   (`HttpContext.Request.Body.Position = 0`) afterwards. This matches the evidence exactly and
   explains why only one controller is affected.
2. **A binding-source mismatch on the Host actions.** A missing `[FromBody]`, or a `[Consumes]` /
   form-binding attribute that steers the parameter away from the JSON body. Compare a `Host` action
   signature against `HostRolePermission.SaveRoleModulePermissions`, which binds correctly.

The parameter is named `requestDTO` in all four failing endpoints, so whatever differs is shared
across the controller rather than specific to one action.

## Impact

Every host-side write is blocked from any client:

- create / update / delete host user
- activate / deactivate a host user (the UI performs this through `update-host-user`)
- reset a host user's password
- create / update / delete host role

Host role **permissions** are unaffected — they are saved through the `HostRolePermission`
controller.

## Verifying the fix

1. Re-run the repro `curl` above. Expect the standard envelope instead of the binding error — either
   a success response or a "host user not found" message for id `999999`.
2. In the web app, go to `/app/host-users`:
   - Row menu → **Deactivate** flips the status tag to Inactive and shows a success toast.
   - Row menu → **Edit** → Save persists the change.
   - Row menu → **Reset Password** completes.
3. On `/app/host-roles`, creating, renaming, and deleting a role all succeed.
