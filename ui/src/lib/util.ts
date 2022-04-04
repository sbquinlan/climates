// types
export type CtorOf<Tinst> = { new (...args: any[]): Tinst };
// graphics helper
export function isLittleEndian(): boolean { 
  return new Int8Array(new Int32Array([1]).buffer)[0] === 1
}

export function getTransformMatrix(
  sx: number, sy: number,
  tx: number, ty: number,
): number[] {
  // Matrix must be in column-major order for WebGL.
  return [
    sx,  0, 0, 0,
     0, sy, 0, 0,
     0,  0, 1, 0,
    tx, ty, 0, 1,
  ];
}

// https://www.khronos.org/registry/webgl/specs/latest/2.0/#TEXTURE_TYPES_FORMATS_FROM_DOM_ELEMENTS_TABLE
export function typed_array_for_type(gl, type: number): CtorOf<ArrayBufferView> {
  switch(type) {
    case gl.BYTE:
      return Int8Array;
    case gl.UNSIGNED_BYTE:
      return Uint8Array; // also clamped array
    case gl.SHORT:
      return Int16Array;
    case gl.UNSIGNED_SHORT:
    case gl.UNSIGNED_SHORT_4_4_4_4:
    case gl.UNSIGNED_SHORT_5_5_5_1:
    case gl.UNSIGNED_SHORT_5_6_5:
    case gl.HALF_FLOAT:
      return Uint16Array;
    case gl.INT:
      return Int32Array;
    case gl.UNSIGNED_INT:
    case gl.UNSIGNED_INT_5_9_9_9_REV:
    case gl.UNSIGNED_INT_2_10_10_10_REV:
    case gl.UNSIGNED_INT_10F_11F_11F_REV:
    case gl.UNSIGNED_INT_24_8:
      return Uint32Array;
    case gl.FLOAT:
      return Float32Array;
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}

// FB throw back!
export function make_array<TArray extends ArrayBufferView>(a: any, ctor: CtorOf<TArray>): TArray {
  if (a instanceof ctor) return a;
  if (Array.isArray(a)) return new ctor(a);
  return new ctor([a]);
}

export async function genTexture(uri: string, ctor: CtorOf<ArrayBufferView> = Float32Array): Promise<ArrayBufferView> {
  const resp = await fetch(uri);
  const buff = await resp.arrayBuffer();
  return new ctor(buff);
}

// generic js helpers
export function* range(n) { let i = 0; while (i < n) yield i++; }
export function mapValues<TObj, Tout>(
  obj: TObj, 
  lambda: (a: TObj[keyof TObj]) => Tout
): { [Property in keyof TObj]: Tout } {
  return Object.fromEntries(
    Object.entries(obj).map(
      ([key, value]) => [key, lambda(value)]
    )
  ) as { [Property in keyof TObj]: Tout };
}

// special

export function debug<Tthing>(class_inst: Tthing): Tthing {
  function getAllFunctions(inst) {
    const props = [];
    let curr = inst;
    do {
      props.push(... Object.getOwnPropertyNames(curr));
    } while (curr = Object.getPrototypeOf(curr))
    return props.filter((prop, i, arr) => (typeof inst[prop] == 'function'))
  }
  for (const method of getAllFunctions(class_inst)) {
    const temp = class_inst[method]
    class_inst[method] = (... rest) => {
      console.log(method, ... rest);
      return temp.call(... arguments, ... rest);
    }
  }
  return class_inst;
}