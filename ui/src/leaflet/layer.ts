import * as L from 'leaflet'

import factory from '../rawgl/rawgl';
import vert from '../shaders/shader3.vert';
import { isLittleEndian, getTransformMatrix, mapValues, CtorOf } from '../lib/util';

export class DataTileLayer {
  constructor(
    private readonly url: string,
    private readonly urlOptions: { [key: string]: string | (() => string) },
    public readonly width: number,
    public readonly height: number,
    public readonly format: CtorOf<ArrayBufferView>,
    public readonly bands: number,
  ) { }

  getTileUrl(coords: L.Coords) {
    return L.Util.template(
      this.url, 
      {
        ... coords,
        r: L.Browser.retina ? '@2x' : '', 
        ... this.urlOptions
      }
    );
  }
  
  async fetchTexture(coords: L.Coords): Promise<ArrayBufferView> {
    const resp = await fetch(this.getTileUrl(coords));
    const buff = await resp.arrayBuffer();
    return new this.format(buff);
  }
}

export interface TextureObject {
  subimage(data: ArrayBufferView);
}

export interface RendererOptions {
  fragmentShader: string;
  uniforms?: { [name: string]: any };
}

class GLRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly textureObjects: { [name: string]: TextureObject };
  private command: () => void;

  constructor(
    viewport: L.Point,
    layers: { [name: string]: DataTileLayer },
    options: RendererOptions
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
  ): Promise<ImageData> {
    for (const [name, tile] of Object.entries(tiles)) {
      this.textureObjects[name].subimage(tile);
    }
    this.command();
    return this.canvas.getContext('2d')
      .getImageData(0, 0, this.canvas.width, this.canvas.height);
  }
}

export interface Options extends L.GridLayerOptions {
  layers: { [name: string]: DataTileLayer };
  rendererOptions: RendererOptions,
}

const DefaultOptions = {
  tileSize: 256,
  tms: false,
}

export default class GLLayer extends L.GridLayer {
  private readonly renderer: GLRenderer;
  private readonly layers: { [name: string]: DataTileLayer };

  options: Options & typeof DefaultOptions;

  constructor(options: Options) {
    options = { ... DefaultOptions, ... options };
    options.tileSize = options.tileSize instanceof L.Point 
      ? options.tileSize
      : new L.Point(options.tileSize, options.tileSize)
    super(options);
    this.layers = options.layers;
    this.renderer = new GLRenderer(
      options.tileSize,
      options.layers,
      options.rendererOptions,
    );
  }

	protected createTile(coords: L.Coords, done: L.DoneCallback) {
    const tile_canvas = L.DomUtil.create('canvas');
    Object.assign(tile_canvas, {
      style: 'image-rendering: pixelated; image-rendering: crisp-edges;',
      width: (this.options.tileSize as L.Point).x,
      height: (this.options.tileSize as L.Point).y,
      onselectstart: L.Util.falseFn,
      onmousemove: L.Util.falseFn,
    });
    Promise.all(
      Object.entries(this.layers).map(
        ([name, layer]) => layer.fetchTexture(coords).then((tile) => [name, tile])
      )
    ) .then(entries => this.renderer.render(Object.fromEntries(entries)))
      .then(img => tile_canvas.getContext('2d').putImageData(img, 0, 0))
      .then(_ => done(null, tile_canvas))
      .catch(done);
		return tile_canvas;
	}

  protected removeTile() {

  }
}

