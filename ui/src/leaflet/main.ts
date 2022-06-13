import * as L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import GLLayer, { DataTileLayer } from './layer';

import rawgl_shader from '../shaders/koppen/shader.frag'
import regl_shader from '../shaders/koppen/float.frag'
import RawglRenderer from './RawglLayer';
import ReglRenderer from './ReglLayer';

const map = L.map('map', {
  center: [0, 0],
  zoom: 0
});

const tilesize = 256;
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const temp = new DataTileLayer(
  '/data/wc2.1_10m_tavg/{z}/{x}/{y}.bin',
  { },
  tilesize,
  tilesize,
  Float32Array,
  12,
);
const prec = new DataTileLayer(
  '/data/wc2.1_10m_prec/{z}/{x}/{y}.bin',
  { },
  tilesize,
  tilesize,
  Float32Array,
  12,
);
map.addLayer(
  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?', 
    { attribution }
  )
);
// map.addLayer(
//   new GLLayer(
//     new ReglRenderer(
//       L.point(tilesize, tilesize),
//       { temp, prec },
//       { fragmentShader: regl_shader },
//     ),
//     {
//       layers: { temp, prec },
//       minZoom: 0,
//     }
//   )
// );
map.addLayer(
  new GLLayer(
    new RawglRenderer(
      L.point(tilesize, tilesize),
      { temp, prec },
      { fragmentShader: rawgl_shader },
    ),
    {
      layers: { temp, prec },
      minZoom: 0,
      maxZoom: 1,
      opacity: 0.5,
    }
  )
);