import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import { Uniforms } from 'ol/renderer/webgl/TileLayer.js'
import { fromLonLat } from 'ol/src/proj';
import OSM from 'ol/source/OSM';
import DataTileSource from 'ol/source/DataTile';
import View from 'ol/View';

import "ol/ol.css"

import GLLayer from './CustomWebGLLayer';
import { genTexture } from '../lib/util';

const textureCount = 1;
const FRAGMENT_SHADER = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  varying vec2 v_textureCoord;
  uniform float ${Uniforms.TRANSITION_ALPHA};
  uniform float ${Uniforms.TEXTURE_PIXEL_WIDTH};
  uniform float ${Uniforms.TEXTURE_PIXEL_HEIGHT};
  uniform float ${Uniforms.RESOLUTION};
  uniform float ${Uniforms.ZOOM};
  uniform sampler2D ${Uniforms.TILE_TEXTURE_ARRAY}[${textureCount}];

  void main() {
    vec4 color = texture2D(${
      Uniforms.TILE_TEXTURE_ARRAY
    }[0],  v_textureCoord);

    if (color.a == 0.0) {
      discard;
    }

    gl_FragColor = color;
    gl_FragColor.rgb *= gl_FragColor.a;
    gl_FragColor *= ${Uniforms.TRANSITION_ALPHA};
  }`;

const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
    new GLLayer(
      {
        source: new DataTileSource({
          loader: async (z, x, y) => {
            const resp = await fetch(`/tiles/wc2.1_10m_tavg/${z}/${x}/${y}.bin`);
            const arraybuff = await resp.arrayBuffer();
            return new Float32Array(arraybuff);
          },
          bandCount: 12,
          maxZoom: 1
        }),
        opacity: 1.0
      },
      {},
      FRAGMENT_SHADER,
    ),
  ],
  view: new View({
    center: fromLonLat([0,0]),
    zoom: 2,
  })
});