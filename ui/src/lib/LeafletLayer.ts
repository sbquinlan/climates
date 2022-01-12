/*
 * Based on https://github.com/ihmeuw/leaflet.tilelayer.glcolorscale
 */

import { DomUtil, DomEvent, GridLayer, GridLayerOptions, TileLayer } from "leaflet";
import REGL, { DrawCommand } from "regl";

/**
 * The matrix output by this function transforms coordinates in pixel space within the drawing
 * buffer (with upper left corner (0, 0) and lower right corner (buffer width, buffer height))
 * to WebGL "clipspace", with upper left corner (-1, 1) and lower right corner (1, -1).
 */
function getTransformMatrix(
  drawingBufferWidth: number,
  drawingBufferHeight: number,
): REGL.Mat4 {
  // To scale horizontally, divide by width (in pixels) and multiply by 2, because width is 2 in clipspace.
  const sx = 2 / drawingBufferWidth;
  // To scale vertically, divide by height (in pixels) and multiply by -2, because height is 2 in clipspace,
  // and the direction is flipped (positive is up, negative is down).
  const sy = -2 / drawingBufferHeight;
  // We translate by -1 horizontally (so the range 0 to 2 maps to the range -1 to 1).
  const tx = -1;
  // We translate by 1 horizontally (so the range -2 to 0 maps to the range -1 to 1).
  const ty = 1;
  // Matrix must be in column-major order for WebGL.
  return [
    sx, 0,  0, 0,
    0,  sy, 0, 0,
    0,  0,  1, 0,
    tx, ty, 0, 1,
  ];
}

class GLRenderer {
	_canvas: HTMLCanvasElement
	_regl: REGL.Regl
	_command: DrawCommand

	constructor(tilesize) {
		this._canvas = DomUtil.create("canvas")

    this._canvas.width = this._canvas.height = tilesize;
    this._regl = REGL(this._canvas)
		const transform_matrix = getTransformMatrix(tilesize, tilesize)

		this._command = this._regl({
			vert: `
precision mediump float;

uniform mat4 transformMatrix;
attribute vec2 position;
attribute vec2 texPosition;

varying vec2 vTexPostion;

void main() {
  gl_Position = transformMatrix * vec4(position, 0.0, 1.0);
}
`,
			frag: `
precision mediump float;

uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D texture4;

uniform sampler2D texture5;
uniform sampler2D texture6;
uniform sampler2D texture7;
uniform sampler2D texture8;

uniform sampler2D texture9;
uniform sampler2D texture10;
uniform sampler2D texture11;
uniform sampler2D texture12;

uniform sampler2D texture13;
uniform sampler2D texture14;
uniform sampler2D texture15;
uniform sampler2D texture16;

varying vec2 vTexPostion;

void main() {
  vec4 rgbaFloats = texture2D(textureA, vTexPostion);
  gl_FragColor = vec4(0.2, 0.2, 0.2, 1.0);
}
`,
			uniforms: {
				transformMatrix: transform_matrix
			},
			attributes: {
				// these are the same we're assuming the tilesize (output aka canvas size)
				// and the tilesize ('texture' tile size) are the same, but they could be different
				// if the texture dimensions are different or if we batch render tiles
				position: [
					[0,  0   ],
					[tilesize, 0   ],
					[0,  tilesize],
					[tilesize, tilesize],
				],
				texCoord: [
					[0,  0   ],
					[tilesize, 0  ],
					[0,  tilesize],
					[tilesize, tilesize],
				]
			},
			depth: { enable: false },
			primitive: 'triangle strip',
			count: 4,
			viewport: { width: tilesize, height: tilesize }
		})
  }

	drawTile() {
		this._command()
		return this._canvas
	}
}

export default class GLLayer extends GridLayer {
	_layers: TileLayer[]
	_renderer: GLRenderer

	constructor(layers: TileLayer[], options: GridLayerOptions) {
		super(options)
		this._layers = layers
		this._renderer = new GLRenderer(options.tileSize)
	}

	createTile(coords, done) {
		var tile = DomUtil.create('canvas')
		const { x,  y } = this.getTileSize();
		Object.assign(
			tile,
			{ width: x, height: y },
		);

		Promise.all(
      this._layers.map((_, i) => this._getNthTile(i, coords))
    ).then(
			(textureImages) => {
				if (!this._map) {
					return;
				}

				const ctx = tile.getContext('2d');
				if (!ctx) {
					return;
				}

				ctx.clearRect(0, 0, x, y);
				ctx.drawImage(
					this._renderer.drawTile(),
					0, 0, 0, 0,
					
				);
				done();
			},
			(err) => {
				console.error(err)
			}
		);

		return tile;
	}
	// Gets the tile for the Nth `TileLayer` in `this._tileLayers`,
	// for the given tile coords, returns a promise to the tile.
	_getNthTile(n, coords) {
		var layer = this._layers[n];

		// Monkey-patch a few things, both for TileLayer and TileLayer.WMS
		layer._tileZoom = this._tileZoom;
		layer._map = this._map;
		layer._crs = this._map.options.crs;
		layer._globalTileRange = this._globalTileRange;
		
		return new Promise(
			function(resolve, reject) {
				var tile = document.createElement("img");
				tile.crossOrigin = "";
				tile.src = layer.getTileUrl(coords);
				DomEvent.on(tile, "load", resolve.bind(this, tile));
				DomEvent.on(tile, "error", reject.bind(this, tile));
			}.bind(this)
		);
	}
}
