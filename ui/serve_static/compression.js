const { PassThrough } = require('stream')
const zlib = require('zlib');

const GZIP = 'gzip';
const DEFLATE = 'deflate';

const THRESHOLD = 1024;

function compression(req, res) {
  const accepts = req.headers['accept-encoding']
  const length = Number(res.getHeader('Content-Length'));
  if (!accepts || !length || length < THRESHOLD) {
    return new PassThrough();
  }
  if (~accepts.indexOf(GZIP)) {
    res.removeHeader('Content-Length')
    res.setHeader('Content-Encoding', GZIP)
    return zlib.createGzip();
  } 
  if (~accepts.indexOf(DEFLATE)) {
    res.removeHeader('Content-Length')
    res.setHeader('Content-Encoding', DEFLATE)
    return zlib.createDeflate();
  }
  return new PassThrough();
}

module.exports = compression