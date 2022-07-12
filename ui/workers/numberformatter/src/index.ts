import api from "./api";

export interface Env {
  B2_AUTH: KVNamespace
}

const BZ_HEADER = /^x-bz.*/i;
const BZ_LAST_MODIFIED = 'x-bz-info-src_last_modified_millis';
const BZ_SHA1 = 'x-bz-content-sha1';

const CACHE_CONTROL = 'Cache-Control';
const CACHE_AGE = 86400;
const ETAG = 'Etag';
const LAST_MODIFIED = 'Last-Modified';

function clean_bz_headers(resp: Response): Response {
  for (const name of resp.headers.keys()) {
    if (BZ_HEADER.test(name)) {
      resp.headers.delete(name);
    }
  }
  return resp;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    // the returned uri will have the query string removed
    const { uri, transform } = api(new URL(request.url));

    // pull out auth token that cron worker sets
    const headers = new Headers(request.headers);
    const token = await env.B2_AUTH.get('RASTER_TOKEN');
    if (!token) {
      // error, log or something, return 500
      return new Response(null, { status: 500 });
    }
    headers.append('Authorization', token!);
    const resp = await fetch(uri.toString(), { headers });
    
    // on error, just return the response with bz headers scrubbed if any
    if (!resp.ok || resp.body === null) {
      return clean_bz_headers(resp);
    }
    
    // https://developers.cloudflare.com/cache/about/default-cache-behavior/ our file 
    // extensions are supported but we manually configure the cache here, because might as 
    // well be descriptive about our cache policy
    const new_resp = new Response(transform(resp.body), resp);
    const sha = new_resp.headers.get(BZ_SHA1);
    if (sha) {
      // this isn't a strong tag because it's based on the query string
      new_resp.headers.set(ETAG, `W/${sha}`)
    }
    const modified = new_resp.headers.get(BZ_LAST_MODIFIED)
    if (modified) {
      new_resp.headers.set(LAST_MODIFIED, new Date(modified).toUTCString());
    }
    // cloudflare supports additional proxy specific headers, but w/e
    new_resp.headers.set(CACHE_CONTROL, `public,max-age=${CACHE_AGE}`)
    return clean_bz_headers(new_resp);
  },
};
