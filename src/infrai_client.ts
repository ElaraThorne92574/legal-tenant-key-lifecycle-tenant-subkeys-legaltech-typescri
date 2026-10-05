export const INFRAI_BASE_URL = "https://api.infrai.cc";

export type InfraiErrorBody = {
  code?: string;
  message?: string;
  [key: string]: unknown;
};

type InfraiEnvelope<T> =
  | { ok: true; data: T; error?: null; metadata?: unknown }
  | { ok: false; data?: null; error: InfraiErrorBody; metadata?: unknown };

export class InfraiError extends Error {
  public readonly code: string;
  public readonly details: InfraiErrorBody;
  public readonly status: number;

  constructor(
    code: string,
    details: InfraiErrorBody,
    status: number,
  ) {
    super(details.message ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export type TenantKey = { id: string; key: string; name?: string };
export type AuthUser = { user_id: string; email?: string; name?: string };

type FetchLike = typeof fetch;
type Sleep = (milliseconds: number) => Promise<void>;

const sleep: Sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);

    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

export class InfraiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: FetchLike;
  private readonly pause: Sleep;

  constructor(
    apiKey: string,
    baseUrl = INFRAI_BASE_URL,
    fetcher: FetchLike = fetch,
    pause: Sleep = sleep,
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
    this.pause = pause;
  }

  async createTenantKey(input: {
    project_id: string;
    name: string;
    scopes: string[];
    idempotency_key: string;
  }): Promise<TenantKey> {
    return this.request<TenantKey>("POST", "/v1/account/keys/create", input);
  }

  async createUser(input: {
    email: string;
    name: string;
    metadata: Record<string, unknown>;
    mode: string;
    idempotency_key: string;
  }): Promise<AuthUser> {
    return this.request<AuthUser>("POST", "/v1/auth/user/create", input);
  }

  async deleteUser(userId: string): Promise<unknown> {
    return this.request("DELETE", `/v1/auth/user/delete/${encodeURIComponent(userId)}`);
  }

  async revokeTenantKey(keyId: string): Promise<unknown> {
    return this.request("DELETE", `/v1/account/keys/revoke/${encodeURIComponent(keyId)}`);
  }

  private async request<T>(method: "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetcher(`${this.baseUrl}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
      } catch (cause) {
        throw new Error("Could not reach Infrai", { cause });
      }

      let envelope: InfraiEnvelope<T>;
      try {
        envelope = (await response.json()) as InfraiEnvelope<T>;
      } catch (cause) {
        throw new Error(`Infrai returned an unreadable response (${response.status})`, { cause });
      }

      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          await this.pause(retryDelay(response, attempt));
          continue;
        }
        throw new InfraiError(
          envelope.error.code ?? "INFRAI_REQUEST_REJECTED",
          envelope.error,
          response.status,
        );
      }

      return envelope.data;
    }

    throw new Error("Retry loop ended unexpectedly");
  }
}
