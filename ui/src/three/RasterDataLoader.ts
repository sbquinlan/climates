import * as THREE from 'three'
import type { TypedArray } from '../lib/util'
type TextureType = typeof THREE.UnsignedByteType | 
  typeof THREE.ByteType | 
  typeof THREE.ShortType | 
  typeof THREE.UnsignedShortType | 
  typeof THREE.IntType | 
  typeof THREE.UnsignedIntType | 
  typeof THREE.FloatType | 
  typeof THREE.HalfFloatType | 
  typeof THREE.UnsignedShort4444Type | 
  typeof THREE.UnsignedShort5551Type | 
  typeof THREE.UnsignedInt248Type;

type TextureFormat = typeof THREE.AlphaFormat | 
  typeof THREE.RGBFormat | 
  typeof THREE.RGBAFormat | 
  typeof THREE.LuminanceFormat | 
  typeof THREE.LuminanceAlphaFormat | 
  typeof THREE.DepthFormat | 
  typeof THREE.DepthStencilFormat | 
  typeof THREE.RedFormat | 
  typeof THREE.RedIntegerFormat | 
  typeof THREE.RGFormat | 
  typeof THREE.RGIntegerFormat | 
  typeof THREE.RGBAIntegerFormat;

const ARRAY_CTOR_FOR_TYPE: { [key: number]: TypedArray } = { 
  [THREE.FloatType]: Float32Array,
  [THREE.HalfFloatType]: Float32Array,
  [THREE.IntType]: Int32Array,
  [THREE.UnsignedIntType]: Uint32Array,
  [THREE.ShortType]: Int16Array,
  [THREE.UnsignedShortType]: Uint16Array,
  [THREE.ByteType]: Int8Array,
  [THREE.UnsignedByteType]: Uint8Array,
};

class RasterDataLoader extends THREE.DataTextureLoader {
  private width: number;
  private height: number;
  private format: TextureFormat;
  private type: TextureType;

  constructor({ width, height, format, type }) {
    super();
    this.width = width;
    this.height = height;
    this.format = format;
    this.type = type;
  }

  protected parse(buffer: ArrayBuffer) {
    const { width, height, format, type, ... rest } = this;
    return {
      image: { width, height, data: new ARRAY_CTOR_FOR_TYPE[type](buffer) },
      format,
      type,
      generateMipmaps: false,
    }
  }
}

export default RasterDataLoader