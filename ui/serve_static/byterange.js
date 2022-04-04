const { PassThrough }  = require('stream');

const parseRange = require('range-parser');
const error = require('http-errors');

function content_range({start, end}) {
  return `bytes ${start}-${end}/*`
}

function boundary(sep, content_type, range) {
  return Buffer.from(`\n\r--${sep}\n\rContent-type: ${content_type}\n\rContent-range: ${content_range(range)}\n\r\n\r`)
}

function closing_boundary(sep) {
  return Buffer.from(`\n\r--${sep}--`)
}

function if_range(header, etag, mtime) {
  if (!header) return true
  if (~header.indexOf(etag)) return true
  const header_date = Date.parse(header);
  return isNaN(mtime) || header_date >= mtime
}

function slicer(ranges, seperator, content_type) {
  async function* transform(source, signal) {
    let pos = 0;
    let { value: buffer, done } = await source.next();
    if (signal.abort) return
    if (done) throw new Error('Empty stream to slice')    
    for (const {start, end} of ranges) {
      if (ranges.length > 1) {
        // need to do multi part encoding
        yield boundary(seperator, content_type, {start, end})
      }
      // fast forward to the window start
      while ((pos + buffer.length) < start) {
        pos += buffer.length;
        ({ value: buffer, done } = await source.next())
        if (signal.abort) return;
        if (done) throw new Error('Ran out of data')
      }

      // return the window 
      if (signal.abort) return;
      yield buffer.slice(
        Math.max(0, start - pos),
        Math.min(buffer.length, end - pos),
      );

      // keep going until we get the buffer with the end byte
      while ((pos + buffer.length) < end) {
        pos += buffer.length
        ({ value: buffer, done } = await source.next())
        if (signal.abort) return;
        if (done) throw new Error('Ran out of data')

        yield buffer.slice(
          Math.max(0, start - pos), // should always be 0 in this case
          Math.min(buffer.length, end - pos),
        );
      }
    }
    if (ranges.length > 1) {
      yield closing_boundary(seperator)
    }
  }
  return transform
}

function byterange(req, res, stat) {
  res.setHeader('Accept-Ranges', 'bytes');

  const etag = res.getHeader('Etag');
  const mtime = Date.parse(res.getHeader('Last-Modified'));
  const length = Number(res.getHeader('Content-Length'));
  const range_header = req.headers['range'];
  if (!if_range(req.headers['if-range'], etag, mtime) || !range_header) {
    return new PassThrough();
  }

  const ranges = parseRange(length, range_header, { combine: true });
  if (typeof ranges === 'number' && ranges < 0) {
    res.setHeader('Content-Range', `bytes */${length}`)
    throw error(416)
  }

  if (ranges.length === 1) {  
    res.setHeader('Content-Range', `bytes ${ranges[0].start}-${ranges[0].end}/${length}`)
    res.setHeader('Content-Length', ranges[0].end - ranges[0].start)
    return slicer(ranges)
  }

  // multipart
  const sep = '';
  const type = res.getHeader('Content-Type');
  res.setHeader('Content-Type', `multipart/byteranges; boundary=${sep}`)
  // this is hard it's like the sum of all the ranges plus the separators
  res.setHeader('Content-Length', '')
  return slicer(ranges, sep, type)
}

module.exports = byterange;