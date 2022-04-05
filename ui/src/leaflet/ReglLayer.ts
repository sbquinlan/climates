import * as L from 'leaflet'
import REGL, { Texture2D } from 'regl';

import vert from '../shaders/shader.vert'
import { getTransformMatrix, mapValues } from '../lib/util';
import type { DataTileLayer } from "./layer";

export default class ReglRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly textureObjects: { [name: string]: Texture2D };
  private command: () => void;

  constructor(
    viewport: L.Point,
    layers: { [name: string]: DataTileLayer },
    options: { fragmentShader: string, uniforms?: {} }
  ) {
    this.canvas = L.DomUtil.create('canvas');
    Object.assign(this.canvas, { width: viewport.x, height: viewport.y });

    const gl = this.canvas.getContext(
      'webgl',
      { preserveDrawingBuffer: true, premultipliedAlpha: false }
    );
    const regl = REGL({ gl, extensions: ['WEBGL_color_buffer_float', 'OES_texture_float'] });

    this.textureObjects = mapValues(
      layers,
      layer => regl.texture({
        width: layer.width * 3,
        height: layer.height,
        type: 'float'
      }),
    );

    this.command = regl({
      viewport: { width: viewport.x, height: viewport.y },
      vert, 
      frag: options.fragmentShader,
      vao: regl.vao({ 
        attributes: [
          [ [0, 0], [0, 1], [1, 0],
            [1, 1], [0, 1], [1, 0] ], 
        ],
        count: 6,
      }),
      attributes: { position: 0 },
      uniforms: {
        ... (options.uniforms ?? {}),
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
      this.textureObjects[name].subimage({ data: tile });
    }
    this.command();
    // TODO: i dont really like using ImageBitmap because it doesn't have 
    // great support and it seems like it might be slower. I guess
    // an alternative is ImageData via framebuffers but we can come back 
    // to that maybe.
    return await createImageBitmap(this.canvas);
  }
}