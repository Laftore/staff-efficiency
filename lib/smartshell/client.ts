const DEFAULT_API_URL = "https://api.smartshell.gg/graphql";

export interface SmartshellClientConfig {
  apiUrl?: string;
  token?: string;
}

/**
 * Placeholder GraphQL client for Smartshell API.
 * @see https://apidoc.smartshell.gg
 */
export class SmartshellClient {
  private readonly apiUrl: string;
  private readonly token: string | undefined;

  constructor(config: SmartshellClientConfig = {}) {
    this.apiUrl = config.apiUrl ?? process.env.SMARTSHELL_API_URL ?? DEFAULT_API_URL;
    this.token = config.token ?? process.env.SMARTSHELL_API_TOKEN;
  }

  /**
   * Executes a GraphQL query/mutation against Smartshell.
   * TODO: implement in Smartshell integration step.
   */
  async query<T>(_document: string, _variables?: Record<string, unknown>): Promise<T> {
    if (!this.token) {
      throw new Error("SMARTSHELL_API_TOKEN is not configured");
    }
    throw new Error("Smartshell GraphQL client not implemented yet");
  }
}

export const smartshell = new SmartshellClient();
