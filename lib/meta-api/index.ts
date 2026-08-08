// Wrapper da Meta Graph API — implementação real pendente de credenciais (ver STATUS_FASE_0.md).
// Escopo previsto: OAuth de social_accounts + sync de insights_snapshots.

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<never> {
  throw new Error("exchangeCodeForToken: pendente de credenciais Meta App");
}

export async function fetchAccountInsights(
  accountId: string,
  accessToken: string
): Promise<never> {
  throw new Error("fetchAccountInsights: pendente de credenciais Meta App");
}

export { GRAPH_API_BASE };
