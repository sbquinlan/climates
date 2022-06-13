import api from "./api";

export interface Env {}

export default {
  async fetch(
    request: Request,
    _env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const { uri, transform } = api(new URL(request.url));
    const resp = await fetch(uri.toString(), { cf: { cacheEverything: true } });
    if (!resp.ok || resp.body === null) {
      return resp;
    }
    return new Response(transform(resp.body), resp);
  },
};
