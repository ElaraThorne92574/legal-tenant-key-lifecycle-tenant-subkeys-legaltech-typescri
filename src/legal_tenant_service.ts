import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { InfraiClient } from "./infrai_client.js";

export const tenantIntakeSchema = z.object({
  tenantId: z.string().min(1),
  projectId: z.string().min(1),
  administrator: z.object({
    email: z.string().email(),
    name: z.string().min(1),
  }),
  matter: z.object({
    reference: z.string().min(1),
    signedDocumentLabel: z.string().min(1),
    deadline: z.string().datetime(),
  }),
});

export const offboardingSchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  keyId: z.string().min(1),
});

export type TenantIntake = z.infer<typeof tenantIntakeSchema>;
export type OffboardingRequest = z.infer<typeof offboardingSchema>;

export type TenantHandoff = {
  tenantId: string;
  userId: string;
  keyId: string;
  key: string;
  matter: {
    reference: string;
    signedDocumentLabel: string;
    deadline: string;
    followUp: "scheduled";
  };
};

export interface TenantControlPlane {
  createTenantKey(input: {
    project_id: string;
    name: string;
    scopes: string[];
    idempotency_key: string;
  }): Promise<{ id: string; key: string }>;
  createUser(input: {
    email: string;
    name: string;
    metadata: Record<string, unknown>;
    mode: string;
    idempotency_key: string;
  }): Promise<{ user_id: string }>;
  deleteUser(userId: string): Promise<unknown>;
  revokeTenantKey(keyId: string): Promise<unknown>;
}

export class LegalTenantService {
  private readonly infrai: TenantControlPlane | InfraiClient;

  constructor(infrai: TenantControlPlane | InfraiClient) {
    this.infrai = infrai;
  }

  async intake(input: TenantIntake, operationId: string = randomUUID()): Promise<TenantHandoff> {
    const tenantKey = await this.infrai.createTenantKey({
      project_id: input.projectId,
      name: `legal-tenant:${input.tenantId}`,
      scopes: ["matter:intake", "document:signed:deliver", "deadline:follow-up"],
      idempotency_key: `${operationId}:key`,
    });

    const user = await this.infrai.createUser({
      email: input.administrator.email,
      name: input.administrator.name,
      metadata: {
        tenantId: input.tenantId,
        keyId: tenantKey.id,
        matterReference: input.matter.reference,
      },
      mode: "tenant",
      idempotency_key: `${operationId}:user`,
    });

    return {
      tenantId: input.tenantId,
      userId: user.user_id,
      keyId: tenantKey.id,
      key: tenantKey.key,
      matter: {
        ...input.matter,
        followUp: "scheduled",
      },
    };
  }

  async offboard(input: OffboardingRequest): Promise<{ tenantId: string; state: "offboarded" }> {
    await this.infrai.deleteUser(input.userId);
    await this.infrai.revokeTenantKey(input.keyId);
    return { tenantId: input.tenantId, state: "offboarded" };
  }
}
