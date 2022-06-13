
function numberformatter(
  from_ctor: DataViewConstructor,
  to_ctor,
  converter,
) {
  // in node streams the second param has an abort flag
  async function* transform(source, _) {
    const from_bpe = from_ctor.BYTES_PER_ELEMENT;
    const overflow = new Uint8Array(from_bpe);
    // overflow is always from_bpe length, so this 
    // tracks how many bytes are in the overflow buffer
    let extra_bytes = 0;
    
    for await (let value of source) {
      // this is just for compatibility w/ node
      if (!(value instanceof Uint8Array)) {
        value = new Uint8Array(value)
      }

      // output chunk
      let chunk = new to_ctor(
        // number of whole bpe's we have in output
        Math.floor(value.byteLength + extra_bytes / from_bpe)
      );

      // extra data from last chunk
      if (extra_bytes > 0) {
        // fill in the remaining bytes to overflow
        overflow.set(
          value.subarray(0, from_bpe - extra_bytes),
          extra_bytes,
        )
        // read the conversion of the extra from_bpe into output
        chunk[0] = converter(new from_ctor(overflow)[0])
        // move the remaining data in the chunk down to a word boundary
        // so that you can read it in the from_ctor format
        value.copyWithin(0, extra_bytes)

        // offset indexing here so that it lines up 
        // for the bigger copy below
        chunk = new to_ctor(chunk.buffer, 1)
      }

      // copy all the from to the output
      const from = new from_ctor(
        value.buffer,
        0,
        Math.floor(value.byteLength / from_bpe),
      )
      for (const [i, from_value] of from.entries()) {
        chunk[i] = converter(from_value)
      }

      // slice off the extra bytes
      extra_bytes = (value.byteLength + extra_bytes) % from_bpe
      if (extra_bytes > 0) {
        overflow.set(value.subarray(-extra_bytes))
      }
      
      // reset any extra data indexing adjustment
      yield new Uint8Array(chunk.buffer)
    }

    if (extra_bytes > 0) {
      throw new Error('Extra bytes left in stream buffer');
    }
  }
  return transform;
  
}

module.exports = numberformatter