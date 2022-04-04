const error = require('http-errors');

function if_modified_since(header, mtime) {
  if (!header) return true
  const header_date = Date.parse(header)
  return isNaN(mtime) || header_date < mtime
}
function if_unmodified_since(header, mtime) {
  if (!header) return true
  const header_date = Date.parse(header)
  return isNaN(mtime) || header_date >= mtime
}

function if_match(header, etag) {
  return !header || etag_matches(header, etag)
}
function if_none_match(header, etag) {
  return !header || !etag_matches(header, etag)
}
function etag_matches(header, etag) {
  return ~header.indexOf(etag) || header.trim() === '*'
}

function conditionals(req, res) {
  const etag = res.getHeader('Etag');
  const mtime = Date.parse(res.getHeader('Last-Modified'))
  if (!if_match(req.headers['if-match'], etag)) 
    throw error(req.headers['range'] ? 416 : 412)
  if (!if_unmodified_since(req.headers['if-unmodified-since'], mtime)) 
    throw error(412)
  if (
    !if_none_match(req.headers['if-none-match'], etag) ||
    !if_modified_since(req.headers['if-modified-since'], mtime)
  )
    throw error(304)
};

module.exports = conditionals