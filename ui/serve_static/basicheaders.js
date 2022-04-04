const mime = require('mime');
const etag = require('etag');

function basicheaders(res, path, stat) {
  res.setHeader('Content-Length', stat.size)
  res.setHeader('Content-Type', mime.lookup(path))
  res.setHeader('Etag', etag(stat))
  res.setHeader('Last-Modified', stat.mtime.toUTCString())
  res.statusCode = 200;
}

module.exports = basicheaders;