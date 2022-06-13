export type TypedArray =
  | Int8Array
  | Uint8Array
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;
export type TypedArrayConstructor<TArray extends TypedArray> = {
  new (...args: any[]): TArray;
  BYTES_PER_ELEMENT: number;
};

/**
 * Byte stream formatter. It will read a byte stream of integers in TFrom byte width and
 * translate those integers to TTo byte width. This is typically used for a lossy compression.
 * For example, you could translate hundredths of a degree in Uint32 to degrees in Uint8 saving
 * data.
 */
export default async function* format(
  from_ctor: TypedArrayConstructor<TypedArray>,
  to_ctor: TypedArrayConstructor<TypedArray>,
  convert: (from: number) => number,
  source: AsyncIterable<Uint8Array>
): AsyncGenerator<Uint8Array, void, void> {
  const from_bpe = from_ctor.BYTES_PER_ELEMENT;
  const to_bpe = to_ctor.BYTES_PER_ELEMENT;
  const overflow = new Uint8Array(from_bpe);
  // overflow is always from_bpe length, so this
  // tracks how many bytes are in the overflow buffer
  let extra_bytes = 0;

  for await (let value of source) {
    // output chunk
    let chunk = new to_ctor(
      // number of whole bpe's we have in output
      Math.floor((value.byteLength + extra_bytes) / from_bpe)
    );

    // extra data from last chunk
    if (extra_bytes > 0) {
      // fill in the remaining bytes to overflow
      overflow.set(value.subarray(0, from_bpe - extra_bytes), extra_bytes);
      // read the conversion of the extra from_bpe into output
      chunk[0] = convert(new from_ctor(overflow.buffer)[0]);
      // move the remaining data in the chunk down to a word boundary
      // so that you can read it in the from_ctor format
      value.copyWithin(0, from_bpe - extra_bytes);

      // offset indexing here so that it lines up
      // for the bigger copy below
      chunk = new to_ctor(chunk.buffer, to_bpe);
    }

    // copy all the from to the output
    const from = new from_ctor(
      value.buffer,
      0,
      Math.floor(value.byteLength / from_bpe)
    );
    for (const [i, from_value] of from.entries()) {
      chunk[i] = convert(from_value);
    }

    // slice off the extra bytes
    extra_bytes = (value.byteLength + extra_bytes) % from_bpe;
    if (extra_bytes > 0) {
      overflow.set(value.subarray(-extra_bytes));
    }

    // reset any extra data indexing adjustment
    yield new Uint8Array(chunk.buffer);
  }

  if (extra_bytes > 0) {
    throw new Error("Extra bytes left in stream buffer");
  }
}
