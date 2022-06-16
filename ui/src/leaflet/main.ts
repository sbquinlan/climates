import * as L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import GLLayer, { DataTileLayer } from './layer';

import rawgl_shader from '../shaders/koppen/shader.frag'
import RawglRenderer from './RawglLayer';

const map = L.map('map', {
  center: [0, 0],
  zoom: 0,
  zoomDelta: 0.10,
  zoomSnap: 0.10,
  wheelDebounceTime: 100,
});

const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
map.addLayer(
  L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?', 
    { attribution }
  )
);

const tilesize = 256;
const temp = new DataTileLayer(
  '/data/wc2.1_10m_tavg/{z}/{x}/{y}.bin?bitout=int8',
  { },
  tilesize,
  tilesize,
  Float32Array,
  12,
);
const prec = new DataTileLayer(
  '/data/wc2.1_10m_prec/{z}/{x}/{y}.bin?bitout=int8',
  { },
  tilesize,
  tilesize,
  Float32Array,
  12,
);
map.addLayer(
  new GLLayer(
    new RawglRenderer(
      L.point(tilesize, tilesize),
      { temp, prec },
      { fragmentShader: rawgl_shader },
    ),
    {
      minZoom: 0,
      maxZoom: 1,
      opacity: 0.5
    }
  )
);