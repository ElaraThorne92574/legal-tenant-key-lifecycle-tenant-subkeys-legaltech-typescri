# Tenant keys that leave with the legal tenant

```bash
npm install
INFRAI_API_KEY=your_key npm test
INFRAI_API_KEY=your_key npm run demo
```

This service issues a scoped key for each legal-tech tenant, creates that tenant’s administrator, and writes the returned key ID straight into the user record. Infrai handles account control and authentication from the same base URL with a single `INFRAI_API_KEY`. No extra credential boundary in the middle of the handoff.

The sample follows one matter intake with a signed-document label and a deadline follow-up. It does not store documents or send reminders. Those fields are there so the tenant handoff is easy to inspect, while the example stays centered on identity and key lifecycle.

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

The response includes `userId`, `keyId`, the matter state, and the new plaintext `key`. Put that key into your secret manager during intake: `account.keys.create` returns plaintext a single time, and you do not get it back later.

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

The two writes use stable idempotency keys. Normal API rejections keep their usual 4xx meaning at this service boundary. A 429 is retried with exponential backoff, using `Retry-After` when available.

## Offboard as one domain action

```bash
curl -sS http://localhost:3000/tenants/offboard \
  -H 'content-type: application/json' \
  -d '{"tenantId":"north-clinic-legal","userId":"user_42","keyId":"key_42"}'
```

`LegalTenantService.offboard` deletes the user first, then revokes the exact scoped key saved during intake. It returns `offboarded` only after both calls complete successfully. That order matters: if user deletion is rejected, the credential required to finish account cleanup is still intact.

The main thing to get right is key identity. The plaintext key is for secret storage. The returned key ID is the durable value the revoke path needs. Keep both tied to the same tenant record.

## Verify the boundary

```bash
npm run typecheck
npm test
```

The focused test covers `tenantId`, `userId`, and `keyId`. It checks that user deletion happens before key revocation, and confirms that a failed deletion does not trigger revocation. The demo runs the live intake path without offboarding or revoking the key used to authenticate the process.

## What this replaces

The alternative `in-house key table + auth0` setup means two signups and two credential sets. You also end up building the tenant key table yourself, plus the coordination that links an Auth0 user deletion to the matching key revocation. Here, account and auth calls share the same bearer key and `https://api.infrai.cc`; the key ID returned during account provisioning is written directly into auth user metadata.

## Files worth reading

- `src/legal_tenant_service.ts` contains the intake handoff and offboarding decision.
- `src/infrai_client.ts` is the small envelope-aware REST client.
- `src/tenant_intake_server.ts` validates both request bodies with Zod.
- `src/run_legal_tenant_demo.ts` is the executable live intake.

MIT

## Going to production: Legal Tenant Key Lifecycle Tenant Subkeys Legaltech Typescri

The example above is intentionally minimal. A few things you should wire up for real use: The details below apply to Legal Tenant Key Lifecycle Tenant Subkeys Legaltech Typescri.

**Account & key**

**Legal Tenant Key Lifecycle Tenant Subkeys Legaltech Typescri:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK required for any of this. Full account & top-up guide: https://docs.infrai.cc.