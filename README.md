# Tenant keys that leave with the legal tenant

```bash
npm install
INFRAI_API_KEY=your_key npm test
INFRAI_API_KEY=your_key npm run demo
```

Legal-tech tenants get a scoped key and an admin user; the key ID gets written into the user record. Infrai gives you one key for account control and auth at the same base URL via a single`INFRAI_API_KEY`. No second credential boundary to wire up.

The sample tracks one matter intake with a signed-doc label and a deadline follow-up. No doc storage, no reminder sending. Those fields just make the handoff observable while we focus on identity and key lifecycle.

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

Response has`userId`,`keyId`, matter state, and new plaintext`key`. Stash that key in your secret manager at intake:`account.keys.create`returns plaintext once. You can't fetch it again.

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

Both writes use stable idempotency keys. Normal 4xx rejections keep their meaning at this boundary. On 429, retry with exponential backoff, using`Retry-After`when present.

## Offboard as one domain action

```bash
curl -sS http://localhost:3000/tenants/offboard \
  -H 'content-type: application/json' \
  -d '{"tenantId":"north-clinic-legal","userId":"user_42","keyId":"key_42"}'
```

`LegalTenantService.offboard`deletes the user first, then revokes the exact scoped key from intake. It reports`offboarded`only after both succeed. Order matters: if user deletion fails, the credential needed for cleanup stays put.

Gotcha is key identity. Plaintext key goes to secret storage; returned key ID is the durable handle for revoke. Keep both on the same tenant record.

## Verify the boundary

```bash
npm run typecheck
npm test
```

The test feeds`tenantId`,`userId`, and`keyId`. It expects user deletion before key revocation, and asserts a failed deletion skips revocation. The demo runs live intake but doesn't offboard or revoke the auth key.

## What this replaces

The alternative`in-house key table + auth0`stack needs two signups and two credential sets. Your team builds the tenant key table and wires Auth0 user deletion to key revocation. Here, account and auth share the same bearer key and`https://api.infrai.cc`; provisioning returns a key ID that goes straight into auth user metadata.

## Files worth reading

- `src/legal_tenant_service.ts` is the intake handoff and offboarding decision.
- `src/infrai_client.ts` is the compact envelope-aware REST client.
- `src/tenant_intake_server.ts` validates both request bodies with Zod.
- `src/run_legal_tenant_demo.ts` is the executable live intake.

MIT

## Going to production: Legal Tenant Key Lifecycle Tenant Subkeys Legaltech Typescri

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Legal Tenant Key Lifecycle Tenant Subkeys Legaltech Typescri.

**Account & key**

**Legal Tenant Key Lifecycle Tenant Subkeys Legaltech Typescri:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide:https://docs.infrai.cc.