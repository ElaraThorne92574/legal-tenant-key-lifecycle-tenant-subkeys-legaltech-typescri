import assert from "node:assert/strict";
import test from "node:test";
import { LegalTenantService, type TenantControlPlane } from "../src/legal_tenant_service.js";

function controlPlane(events: string[], deleteUserFails = false): TenantControlPlane {
  return {
    async createTenantKey() { return { id: "key_42", key: "one-time-secret" }; },
    async createUser() { return { user_id: "user_42" }; },
    async deleteUser(userId) {
      events.push(`delete-user:${userId}`);
      if (deleteUserFails) throw new Error("user deletion rejected");
    },
    async revokeTenantKey(keyId) { events.push(`revoke-key:${keyId}`); },
  };
}

test("offboarding deletes the user before revoking the exact tenant key", async () => {
  const events: string[] = [];
  const service = new LegalTenantService(controlPlane(events));

  const result = await service.offboard({
    tenantId: "tenant-42",
    userId: "user_42",
    keyId: "key_42",
  });

  assert.deepEqual(events, ["delete-user:user_42", "revoke-key:key_42"]);
  assert.deepEqual(result, { tenantId: "tenant-42", state: "offboarded" });
});

test("offboarding keeps the tenant key active when user deletion is rejected", async () => {
  const events: string[] = [];
  const service = new LegalTenantService(controlPlane(events, true));

  await assert.rejects(() => service.offboard({
    tenantId: "tenant-42",
    userId: "user_42",
    keyId: "key_42",
  }));

  assert.deepEqual(events, ["delete-user:user_42"]);
});
