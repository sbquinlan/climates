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
      ... this.urlOptions
    });
  }
  
  async fetchTexture(coords: L.Coords): Promise<ArrayBufferView> {
    const resp = await fetch(this.getTileUrl(coords));
    const buff = await resp.arrayBuffer();
    return new this.format(buff);
  }
}

export abstract class GLRenderer {
  public constructor(
    readonly viewport: L.Point,
    readonly layers: { [name: string]: DataTileLayer },
  ) {}

  private async fetchTile(coords: L.Coords): Promise<{ [name: string]: ArrayBufferView }> {
    const texture_entries = await Promise.all(
      Object.entries(this.layers).map(
        async ([name, layer]) => [name, await layer.fetchTexture(coords)]
      )
    )
    return Object.fromEntries(texture_entries);
  }

  public async renderTile(coords: L.Coords): Promise<ImageBitmap> {
    const textures = await this.fetchTile(coords);
    return await this.render(textures);
  }

  protected abstract render(
    tiles: { [key: string]: ArrayBufferView },
  ): Promise<ImageBitmap>;
}

class CoallescingPromiseCache<Tcachekey, Targs extends unknown[], Tresult> {
  private cache: Map<Tcachekey, Promise<Tresult>> = new Map();

  constructor(
    private readonly cacheKey: (... args: Targs) => Tcachekey,
    private readonly promiseMaker: (... args: Targs) => Promise<Tresult>,
    private readonly limit: number | undefined = undefined,
  ) {}

  public async get(... args: Targs): Promise<Tresult> {
    const cache_key = this.cacheKey(... args);
    
    if (!this.cache.has(cache_key)) {
      // console.log('draw', cache_key);
      this.cache.set(cache_key, this.promiseMaker(... args));
    } else {
      const [first, ... _rest] = this.cache.keys();
      if (first !== cache_key) {
        // Needs to be an LRU, so every read needs to write
        const temp = this.cache.get(cache_key)!
        this.cache.delete(cache_key);
        this.cache.set(cache_key, temp);
      }
      // console.log('cached', cache_key);
    }

    // cache needs to be trimmed
    if (this.limit && this.cache.size > this.limit) {
      const keys = [...this.cache.keys()];
      this.cache.delete(keys[keys.length - 1]);
    }
    return await this.cache.get(cache_key)!;
  }
}

export default class GLLayer extends L.GridLayer {
  private readonly cache: CoallescingPromiseCache<string, [L.Coords], ImageBitmap>;

  constructor(
    private readonly renderer: GLRenderer,
    options: L.GridLayerOptions,
  ) {
    super();
    L.Util.setOptions(this, { ...  options, tileSize: renderer.viewport });
    this.cache = new CoallescingPromiseCache(
      (coords) => GLLayer.coordsCacheKey(coords),
      (coords) => this.renderer.renderTile(coords),
    );
  }

  private static coordsCacheKey(coords: L.Coords): string {
    return `${coords.z}/${coords.y}/${coords.x}`
  }

  private async drawTile(coords: L.Coords, tile: HTMLCanvasElement): Promise<void> {
    const img = await this.cache.get(coords);
    const context = tile.getContext('2d')!;
    context.clearRect(0, 0, tile.width, tile.height);
    context.drawImage(img, 0, 0);
  }

	protected createTile(coords: L.Coords, done: L.DoneCallback): HTMLCanvasElement {
    const tile_canvas = L.DomUtil.create('canvas');
    // @ts-ignore I can't define options, it should be on GridLayer
    const tileSize = (this.options as L.GridLayerOptions).tileSize! as L.Point
    Object.assign(tile_canvas, {
      style: 'image-rendering: pixelated; image-rendering: crisp-edges;',
      width: tileSize.x,
      height: tileSize.y,
      onselectstart: L.Util.falseFn,
      onmousemove: L.Util.falseFn,
    });

    this.drawTile(coords, tile_canvas)
      .then(_ => done(undefined, tile_canvas))
      .catch(done);
		return tile_canvas;
	}
}

