const DEFAULT_API_URL = "https://api.smartshell.gg/graphql";

export interface SmartshellClientConfig {
  apiUrl?: string;
  token?: string;
}

/**
 * GraphQL client for Smartshell.
 * Uses server-side fetch and Bearer token authentication.
 */
export class SmartshellClient {
  private readonly apiUrl: string;
  private readonly token: string | undefined;

  constructor(config: SmartshellClientConfig = {}) {
    this.apiUrl = config.apiUrl ?? process.env.SMARTSHELL_API_URL ?? DEFAULT_API_URL;
    this.token = config.token ?? process.env.SMARTSHELL_API_TOKEN;
  }

  async query<T>(document: string, variables: Record<string, unknown> = {}): Promise<T> {
    if (!this.token) {
      throw new Error("SMARTSHELL_API_TOKEN is not configured");
    }

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ query: document, variables }),
      cache: "no-store",
    });

    const payload = (await response.json()) as {
      data?: T;
      errors?: Array<{ message: string }>;
    };

    if (!response.ok || payload.errors?.length) {
      const message = payload.errors?.map((error) => error.message).join("; ") ?? response.statusText;
      throw new Error(`Smartshell GraphQL error: ${message}`);
    }

    if (!payload.data) {
      throw new Error("Smartshell GraphQL returned no data");
    }

    return payload.data;
  }
}

export const smartshell = new SmartshellClient();
