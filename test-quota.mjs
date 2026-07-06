import { resolveGoToken, resolveGoWorkspaceId } from './src/providers/opencode-go/go.auth.js';

async function main() {
  const token = await resolveGoToken();
  const workspaceId = await resolveGoWorkspaceId();

  console.log('Token found:', token ? `yes (${token.slice(0, 10)}...)` : 'no');
  console.log('Workspace ID:', workspaceId ?? '(not found)');

  if (!token) {
    console.log('\nNo token — cannot fetch quota');
    return;
  }
  if (!workspaceId) {
    console.log('\nNo workspace ID — cannot fetch quota');
    console.log('The Go API requires a workspace ID to query limits.');
    console.log('Check if auth.json has a workspaceId field, or set OPENCODE_GO_WORKSPACE_ID env var.');
    return;
  }

  console.log('\nAttempting quota fetch...');

  const { OpenCodeGoAdapter } = await import('./src/providers/opencode-go/go.js');
  const adapter = new OpenCodeGoAdapter();
  const result = await adapter.fetchProviderApi('/rate-limit');
  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
