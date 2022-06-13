const { resolve } = require('path')
const { compose, PassThrough } = require('stream')
const { pipeline } = require('stream/promises')

const { isHttpError } = require('http-errors');
const { 
  streamStatic,
  compression, 
  byterange 
} = require('stream-static');
const NumberFormatter = require('./NumberFormatterTransform');

function web_stream(node_stream) {
  return compose(
    async function* (source, _) {
      for await (const chunk of source) yield new Uint8Array(chunk)
    },
    node_stream,
    async function* (source, _) {
      for await (const chunk of source) yield Buffer.from(chunk.buffer)
    }
  )
}

function static_compression(root, converter = null) {
  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('Allow', 'GET, HEAD')
      res.setHeader('Content-Length', 0)
      res.end();
      return;
    }
    let stream;
    try {
      stream = await streamStatic(resolve(root), req, res);
      if (req.method === 'HEAD') {
        stream.destroy();
        return;
      }
      await pipeline(
        stream,
        byterange(req, res),
        converter ? converter(req, res) : new PassThrough(),
        compression(req, res),
        res,
      );
      res.end();
    } catch (err) {
      console.error(err);
      res.statusCode = isHttpError(err) ? err.statusCode : 500
      if (!res.headersSent) {
        res.setHeader('Content-Length', 0);
      }
      res.end();
      stream?.destroy();
    }
  };
}

function float_to_byte(req, res) {
  res.setHeader('Content-Length', Math.floor(res.getHeader('Content-Length') / 4))
  return web_stream(
    NumberFormatter(
      Float32Array,
      Int8Array,
      (x) => Math.max(-128, Math.min(val, 127)),
    ),
  )
}

module.exports = function (app) {
  app.use('/', (req, res, next) => { console.log(req.method, req.url); next(); });
  app.use(
    '/tiles',
    static_compression('../data/webroot/')
  );
  app.use(
    '/asint8',
    static_compression('../data/webroot/', float_to_byte)
  );
  app.use((_, res, next) => {
    res.setHeader('Cache-control', 'no-cache');
    next();
  });
}
