# TenantLocation rows return a null `stateName` and no audit or tenant fields

**Component:** AxionPro API - `TenantLocation` (`get-all`, `get-by-id/{id}`)
**Severity:** Minor - display gaps, plus a filtering gap on the host tenant-device screens
**Reported:** 2026-09-26
**Environment:** `https://axionpro-api.onrender.com`

## Summary

Swagger publishes the request DTOs and query params for `/api/TenantLocation/*` but no response
schema. A live `get-all` response shows three gaps:

1. `stateName` is `null` although `stateId` is set.
2. There are no audit fields (`addedById`, `addedDateTime`, `updatedById`, `updatedDateTime`).
3. There is no `tenantId`.

## The evidence

`GET /api/TenantLocation/get-all?CountryId=1&PageNumber=1&PageSize=10&ModuleId=24&OperationId=4`,
one row (trimmed):

```json
{
  "id": 8,
  "locationCode": "JBP_CLIENT_SITE",
  "locationName": "SAMDARIYA MALL",
  "countryId": 1,
  "countryName": "India",
  "stateId": 20,
  "stateName": null,
  "districtId": null,
  "districtName": null,
  "localityId": null,
  "localityName": null,
  "isActive": true
}
```

`stateId: 20` is Madhya Pradesh in `GET /api/Location/State/option?CountryId=1`, so the name
exists. `countryName` is populated, so the country join works and only the state join is missing.

## Expected

| Field                                                          | Expected                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| `stateName`                                                    | The state's name whenever `stateId` is set                  |
| `addedById`, `addedDateTime`, `updatedById`, `updatedDateTime` | Present, as on the other attendance-config rows             |
| `tenantId`                                                     | Present, so a host session can tell which tenant owns a row |

Publishing a response schema in swagger for all six operations would stop the contract from
drifting silently again (the create/update DTOs moved from `cityId` to `districtId` / `localityId`
with no response-side change visible to the client).

## Client impact today

- The location detail drawer resolves `stateName` from the states lookup as a fallback, costing an
  extra request per open. Remove the fallback in `tenant-location-detail.ts` once this is fixed.
- The drawer's Audit section was removed because every value rendered as a dash. Restore it once
  the fields are returned.
- The host tenant-device screens narrow `get-all` results client-side on `tenantId`, keeping rows
  where it is missing. With the field never returned, that narrowing does nothing, so the host
  screens rely entirely on the server honouring the `TenantId` query param.

## Related: duplicate state seed data

`GET /api/Location/State/option?CountryId=1` returns three states twice, from what looks like a
second seed with a different `stateCode` format:

| Newer row                                  | Existing row                                  |
| ------------------------------------------ | --------------------------------------------- |
| 216 "Andaman & Nicobar Islands", code `01` | 1 "Andaman and Nicobar Islands", code `IN-S1` |
| 217 "Jammu & Kashmir", code `12`           | 14 "Jammu and Kashmir", code `IN-S14`         |
| 218 "Pondicherry", code `22`               | 27 "Puducherry", code `IN-S27`                |

Every state dropdown shows these twice, and records saved against either id will not match a
filter on the other. The list is also ordered by `id` descending rather than by `stateName`.
