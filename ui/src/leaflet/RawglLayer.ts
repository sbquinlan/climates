import * as L from 'leaflet'

import factory from '../rawgl/rawgl';
import vert from '../shaders/shader3.vert';
import { isLittleEndian, getTransformMatrix, mapValues } from '../lib/util';

import type { DataTileLayer } from "./layer";

export default class RawglRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly textureObjects: { [name: string]: any };
  private command: () => void;

  constructor(
    viewport: L.Point,
    layers: { [name: string]: DataTileLayer },
    options: { fragmentShader: string, uniforms?: {} }
  ) {
    this.canvas = L.DomUtil.create('canvas');
    Object.assign(this.canvas, { width: viewport.x, height: viewport.y });

    const gl = this.canvas.getContext(
      'webgl2',
      { preserveDrawingBuffer: true, premultipliedAlpha: false }
    );
    gl.getExtension('EXT_color_buffer_float')
    const { rawgl, buffer, texture, vao } = factory(gl)

    this.textureObjects = mapValues(
      layers,
      layer => texture({
        width: layer.width,
        height: layer.height,
        format: [gl.RGB32F, gl.RGB, gl.FLOAT],
      })
    );

    this.command = rawgl({
      viewport: { width: viewport.x, height: viewport.y },
      vert, frag: options.fragmentShader,
      attributes: vao({
        position: buffer(new Float32Array([
          0, 0, 0, 1, 1, 0,
          1, 1, 1, 0, 0, 1
        ])),
      }),
      uniforms: {
        ... (options.uniforms ?? {}),
        littleEndian: isLittleEndian(),
        projectionMatrix: getTransformMatrix(2, 2, -1, -1),
        modelViewMatrix: getTransformMatrix(1, 1, 0, 0),
        ... this.textureObjects
      },
    });
  }

  async render(
    tiles: { [key: string]: ArrayBufferView },
  ): Promise<ImageBitmap> {
    for (const [name, tile] of Object.entries(tiles)) {
      this.textureObjects[name].subimage(tile);
    }
    this.command();
    // TODO: i dont really like using ImageBitmap because it doesn't have 
    // great support and it seems like it might be slower. I guess
    // an alternative is ImageData via framebuffers but we can come back 
    // to that maybe.
    return await createImageBitmap(this.canvas);
  }
}