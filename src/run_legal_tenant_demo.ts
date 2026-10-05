import { InfraiClient, INFRAI_BASE_URL } from "./infrai_client.js";
import { LegalTenantService, tenantIntakeSchema } from "./legal_tenant_service.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the demo");

const input = tenantIntakeSchema.parse({
  tenantId: "north-clinic-legal",
  projectId: "legal-operations",
  administrator: {
    email: "chenhua@changba.com",
    name: "Privacy Counsel",
  },
  matter: {
    reference: "MAT-2026-1042",
    signedDocumentLabel: "Business associate agreement",
    deadline: "2026-10-15T09:00:00.000Z",
  },
});

const service = new LegalTenantService(new InfraiClient(apiKey, INFRAI_BASE_URL));
const handoff = await service.intake(input, "demo-mat-2026-1042");

console.log(JSON.stringify({
  tenantId: handoff.tenantId,
  userId: handoff.userId,
  keyId: handoff.keyId,
  matter: handoff.matter,
  keyCaptured: handoff.key.length > 0,
}, null, 2));
