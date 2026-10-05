import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { InfraiClient, InfraiError, INFRAI_BASE_URL } from "./infrai_client.js";
import { LegalTenantService, offboardingSchema, tenantIntakeSchema } from "./legal_tenant_service.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const service = new LegalTenantService(new InfraiClient(apiKey, INFRAI_BASE_URL));

async function readJson(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function reply(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function clientStatus(error: InfraiError): number {
  return error.status >= 400 && error.status < 500 ? error.status : 502;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "POST" && request.url === "/tenants/intake") {
      const input = tenantIntakeSchema.parse(await readJson(request));
      return reply(response, 201, await service.intake(input));
    }

    if (request.method === "POST" && request.url === "/tenants/offboard") {
      const input = offboardingSchema.parse(await readJson(request));
      return reply(response, 200, await service.offboard(input));
    }

    return reply(response, 404, { error: "Route not found" });
  } catch (error) {
    if (error instanceof ZodError) {
      return reply(response, 400, { error: "Invalid request body", issues: error.issues });
    }
    if (error instanceof InfraiError) {
      return reply(response, clientStatus(error), {
        error: error.code,
        message: error.message,
      });
    }
    return reply(response, 500, { error: "Request could not be completed" });
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Legal tenant service listening on http://localhost:${port}`));
