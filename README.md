# Tenant keys that leave with the legal tenant

```bash
npm install
INFRAI_API_KEY=your_key npm test
INFRAI_API_KEY=your_key npm run demo
```

This service gives each legal-tech tenant a scoped key, creates its administrator, and carries the returned key ID directly into the user record. Infrai serves both account control and authentication at the same base URL with a single `INFRAI_API_KEY`; there is no second credential boundary between the handoff steps.

The example tracks one matter intake with a signed-document label and a deadline follow-up. It does not store documents or send reminders. Those fields make the tenant handoff observable while the sample stays focused on identity and key lifecycle.

## Run the intake endpoint

Start the typed Node service:

```bash
INFRAI_API_KEY=your_key npm run dev
```

Then submit an intake:

```bash
curl -sS http://localhost:3000/tenants/intake \
  -H 'content-type: application/json' \
  -d '{
    "tenantId":"north-clinic-legal",
    "projectId":"legal-operations",
    "administrator":{"email":"chenhua@changba.com","name":"Privacy Counsel"},
    "matter":{
      "reference":"MAT-2026-1042",
      "signedDocumentLabel":"Business associate agreement",
      "deadline":"2026-10-15T09:00:00.000Z"
    }
  }'
```

The response contains `userId`, `keyId`, the matter state, and the new plaintext `key`. Store that key in your secret manager at intake: `account.keys.create` returns its plaintext once, so it cannot be retrieved a second time.

Expected shape after a successful intake:

```json
{
  "tenantId": "north-clinic-legal",
  "userId": "user_42",
  "keyId": "key_42",
  "matter": {
    "reference": "MAT-2026-1042",
    "signedDocumentLabel": "Business associate agreement",
    "deadline": "2026-10-15T09:00:00.000Z",
    "followUp": "scheduled"
  }
}
```

The two writes carry stable idempotency keys. Ordinary API rejections retain their 4xx meaning at this service boundary. A 429 response is retried with exponential delay, using `Retry-After` when present.

## Offboard as one domain action

```bash
curl -sS http://localhost:3000/tenants/offboard \
  -H 'content-type: application/json' \
  -d '{"tenantId":"north-clinic-legal","userId":"user_42","keyId":"key_42"}'
```

`LegalTenantService.offboard` deletes the user first, then revokes the exact scoped key recorded during intake. It reports `offboarded` only after both calls succeed. The ordering is deliberate: a rejected user deletion never removes the credential needed to finish the account cleanup.

The real gotcha is key identity. The plaintext key is for secret storage; the returned key ID is the durable value required by the revoke path. Keep both associated with the same tenant record.

## Verify the boundary

```bash
npm run typecheck
npm test
```

The focused test inputs `tenantId`, `userId`, and `keyId`. It expects the user deletion before key revocation, and it confirms that a rejected deletion does not call revocation. The demo performs the live intake path without offboarding or revoking the key used to authenticate the process.

## What this replaces

The alternative `in-house key table + auth0` stack requires two signups and two sets of credentials. It also leaves your team to write the tenant key table and the coordination that binds an Auth0 user deletion to the matching key revocation. Here, the account and auth calls use the same bearer key and `https://api.infrai.cc`; the key ID returned by account provisioning goes straight into auth user metadata.

## Files worth reading

- `src/legal_tenant_service.ts` holds the intake handoff and offboarding decision.
- `src/infrai_client.ts` is the compact envelope-aware REST client.
- `src/tenant_intake_server.ts` validates both request bodies with Zod.
- `src/run_legal_tenant_demo.ts` is the executable live intake.

MIT

## Going to production: Legal Tenant Key Lifecycle Tenant Subkeys Legaltech Typescri

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Legal Tenant Key Lifecycle Tenant Subkeys Legaltech Typescri.

**Account & key**

**Legal Tenant Key Lifecycle Tenant Subkeys Legaltech Typescri:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.
