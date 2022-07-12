// Reference python implementation: https://github.com/Backblaze/gists/blob/b5a73fef3e4d3ae14121decc1b364008acc18515/b2AuthorizeCfWorker.py

export interface Env {
  B2_AUTH: KVNamespace;
  // secrets
  B2_READ_RASTER_ID: string;
  B2_READ_RASTER_KEY: string;
}

const ACCOUNT_AUTH = `https://api.backblazeb2.com/b2api/v2/b2_authorize_account`
const DOWNLOAD_AUTH_PATH = `/b2api/v2/b2_get_download_authorization`

// https://www.backblaze.com/b2/docs/b2_authorize_account.html
interface AccountAuthResult {
  apiUrl: string,
  authorizationToken: string;
  allowed: { 
    // only if there's a single bucket
    bucketId: string 
  };
}
async function account_auth(api_key_id: string, api_key: string): Promise<AccountAuthResult> {
  const headers = { 
    'Authorization': `Basic ${btoa(`${api_key_id}:${api_key}`)}`
  };
  const acc_auth_resp = await fetch(ACCOUNT_AUTH, { headers });
  if (!acc_auth_resp.ok) {
    // log or something?
    const body = await acc_auth_resp.text()
    console.error(body, acc_auth_resp.statusText);
  }
  return await acc_auth_resp.json();
}

// https://www.backblaze.com/b2/docs/b2_get_download_authorization.html
// default config on bucket access
const fileNamePrefix = '';
const validDurationInSeconds = 86400;
interface DownloadAuthResult {
  authorizationToken: string;
}
async function download_auth(account_auth: AccountAuthResult): Promise<DownloadAuthResult> {
  const headers = {
    'Authorization': account_auth.authorizationToken,
  }
  const download_auth_resp = await fetch(
    account_auth.apiUrl + DOWNLOAD_AUTH_PATH, 
    { 
      headers, 
      method: 'POST', 
      body: JSON.stringify({ 
        bucketId: account_auth.allowed.bucketId, 
        fileNamePrefix, 
        validDurationInSeconds 
      })
    }
  );
  if (!download_auth_resp.ok) {
    // log or something?
    const body = await download_auth_resp.text()
    console.error(body, download_auth_resp.statusText);
  }
  return await download_auth_resp.json()
}

export default {

  // to test locally:
  // - Run `wrangler dev --local` in your terminal to start a development server
  // - Run `curl "http://localhost:8787/cdn-cgi/mf/scheduled"` to trigger the scheduled even
  async scheduled(
    controller: ScheduledController | null,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    const account_auth_result = await account_auth(env.B2_READ_RASTER_ID, env.B2_READ_RASTER_KEY);
    const { authorizationToken }  = await download_auth(account_auth_result);
    await env.B2_AUTH.put('RASTER_TOKEN', authorizationToken);
  },
};
