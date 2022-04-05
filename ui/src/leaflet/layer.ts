import * as L from 'leaflet'

import { CtorOf } from '../lib/util';

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
      this.url, {
      ... coords,
      r: L.Browser.retina ? '@2x' : '', 
      ... this.urlOptions
    });
  }
  
  async fetchTexture(coords: L.Coords): Promise<ArrayBufferView> {
    const resp = await fetch(this.getTileUrl(coords));
    const buff = await resp.arrayBuffer();
    return new this.format(buff);
  }
}

export interface GLRenderer {
  render(
    tiles: { [key: string]: ArrayBufferView },
  ): Promise<ImageBitmap>;
}

export interface Options extends L.GridLayerOptions {
  layers: { [name: string]: DataTileLayer };
}

const DefaultOptions = {
  tileSize: 256,
  tms: false,
}

class CoallescingPromiseCache<Tcachekey, Targs extends unknown[], Tresult> {
  private readonly cache: Map<Tcachekey, Promise<Tresult>> = new Map();

  constructor(
    private readonly cacheKey: (... args: Targs) => Tcachekey,
    private readonly promiseMaker: (... args: Targs) => Promise<Tresult>,
  ) {}

  public async get(... args: Targs): Promise<Tresult> {
    const cache_key = this.cacheKey(... args);
    if (!this.cache.has(cache_key)) {
      // TODO: need to trim this cache
      // This coallesces all the calls to draw the same tile into
      // one promise for the fetch + render
      this.cache.set(cache_key, this.promiseMaker(... args));
    }
    return await this.cache.get(cache_key);
  }
}

export default class GLLayer extends L.GridLayer {
  private readonly layers: { [name: string]: DataTileLayer };

  private readonly cache: CoallescingPromiseCache<string, [L.Coords], ImageBitmap>;

  options: Options & typeof DefaultOptions;

  constructor(
    private readonly renderer: GLRenderer,
    options: Options,
  ) {
    options = { ... DefaultOptions, ... options };
    options.tileSize = options.tileSize instanceof L.Point 
      ? options.tileSize
      : new L.Point(options.tileSize, options.tileSize)
    super(options);
    this.layers = options.layers;
    this.cache = new CoallescingPromiseCache(
      (coords) => GLLayer.coordsCacheKey(coords),
      (coords) => this.renderTile(coords),
    );
  }

  private static coordsCacheKey(coords: L.Coords): string {
    return `${coords.z}/${coords.y}/${coords.x}`
  }

  private async fetchTile(coords: L.Coords): Promise<{ [name: string]: ArrayBufferView }> {
    const texture_entries = await Promise.all(
      Object.entries(this.layers).map(
        async ([name, layer]) => [name, await layer.fetchTexture(coords)]
      )
    )
    return Object.fromEntries(texture_entries);
  }

  private async renderTile(coords: L.Coords): Promise<ImageBitmap> {
    const textures = await this.fetchTile(coords);
    return await this.renderer.render(textures);
  }

  private async drawTile(coords: L.Coords, tile: HTMLCanvasElement): Promise<void> {
    const img = await this.cache.get(coords);
    const context = tile.getContext('2d');
    context.clearRect(0, 0, tile.width, tile.height);
    context.drawImage(img, 0, 0);
  }

	protected createTile(coords: L.Coords, done: L.DoneCallback): HTMLCanvasElement {
    const tile_canvas = L.DomUtil.create('canvas');
    Object.assign(tile_canvas, {
      style: 'image-rendering: pixelated; image-rendering: crisp-edges;',
      width: (this.options.tileSize as L.Point).x,
      height: (this.options.tileSize as L.Point).y,
      onselectstart: L.Util.falseFn,
      onmousemove: L.Util.falseFn,
    });

    this.drawTile(coords, tile_canvas)
      .then(_ => done(null, tile_canvas))
      .catch(done);
		return tile_canvas;
	}
}

