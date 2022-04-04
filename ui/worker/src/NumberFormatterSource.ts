type TypedArray = Uint8ArrayConstructor | Int8ArrayConstructor
  | Uint16ArrayConstructor | Int16ArrayConstructor
  | Uint32ArrayConstructor | Int32ArrayConstructor
  | Float32ArrayConstructor | Float64ArrayConstructor

function idiv(total: number, divisor: number): number {
  return Math.floor(total / divisor);
}

class NumberFormatterSource {
  private readonly _reader: ReadableStreamDefaultReader;
  private readonly _from_ctor: TypedArray;
  private readonly _to_ctor: TypedArray;
  private readonly _converter: (a: number) => number;

  private _extra_bytes = 0;
  private _overflow: Uint8Array;

  constructor(
    stream: ReadableStream,
    from_ctor: TypedArray,
    to_ctor: TypedArray,
    converter: (a: number) => number,
  ) {
    this._reader = stream.getReader();
    this._from_ctor = from_ctor;
    this._to_ctor = to_ctor;
    this._converter = converter;

    this._overflow = new Uint8Array(from_ctor.BYTES_PER_ELEMENT);
  }

  public async pull(controller) {
    const from_bpe = this._from_ctor.BYTES_PER_ELEMENT;
    const { value, done } = await this._reader.read();

    if (done) {
      if (this._extra_bytes > 0) {
        controller.error(new Error('Extra bytes left in stream buffer'));
      }
      controller.close();
      return;
    }

    let chunk = new this._to_ctor(
      idiv(value.byteLength + this._extra_bytes, from_bpe)
    );

    // existing extra data
    if (this._extra_bytes > 0) {
      // this assumes that both overflow and value are uint8
      this._overflow.set(
        value.subarray(0, from_bpe - this._extra_bytes),
        this._extra_bytes,
      );
      chunk[0] = this._converter(
        new this._from_ctor(this._overflow.buffer)[0]
      )

      // unfortunate extra copy to put the remaining data
      // on a word boundary. There's no way to really
      // fix this once a chunk is off the word boundary
      value.copyWithin(0, this._extra_bytes)

      // keep the indexing the same for the copy loop
      chunk = new this._to_ctor(chunk.buffer, 1)
    }

    // copy values over
    const from = new this._from_ctor(
      value.buffer,
      0,
      // if there was an extra from_bpe, we already wrote it
      // to chunk and adjusted the indexing
      idiv(value.byteLength, from_bpe),
    );
    for (const [i, from_value] of from.entries()) {
      chunk[i] = this._converter(from_value);
    }

    // save new extra data, this isn't impacted by the copywithin
    this._extra_bytes = (value.byteLength + this._extra_bytes) % from_bpe;
    if (this._extra_bytes > 0) {
      this._overflow.set(value.subarray(-this._extra_bytes))
    }

    // may need to reset the indexing
    controller.enqueue(new this._to_ctor(chunk.buffer));
  }
}

export default NumberFormatterSource;
