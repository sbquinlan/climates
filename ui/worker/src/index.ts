import NumberFormatterSource from './NumberFormatterSource';

function clamp(min, f, max) {
  return Math.min(Math.max(Math.round(f), min), max);
}

function float_to_int(stream) {
  return new ReadableStream(
    new NumberFormatterSource(
      stream,
      Float32Array,
      Int8Array,
      (x) => x === clamp(-127, x, 127),
    )
  );
}

async function handleRequest(request) {
  if (request.method.toUpperCase() !== 'GET') {
    return await fetch(request)
  }

  // 01234567891
  // /asint8/<path> -> /<path>
  const uri = new URL(request.url);
  uri.pathname = uri.pathname.substring(6);

  const resp = await fetch(uri);
  if (!resp.ok) {
    return resp;
  }
  return new Response(float_to_int(resp.body), resp);
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
});
