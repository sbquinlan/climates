import * as L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import GLLayer, { DataTileLayer } from './layer';

import fragmentShader from '../shaders/koppen/shader.frag'

const map = L.map('map', {
  center: [0, 0],
  zoom: 0
});

const tilesize = 256;
const temp = new DataTileLayer(
  '/asint8/wc2.1_10m_tavg/{z}/{x}/{y}.bin',
  {},
  tilesize,
  tilesize,
  Float32Array,
  12,
);
const prec = new DataTileLayer(
  '/asint8/wc2.1_10m_prec/{z}/{x}/{y}.bin',
  {},
  tilesize,
  tilesize,
  Float32Array,
  12,
);

map.addLayer(
  new GLLayer({
    layers: { temp, prec },
    minZoom: 0,
    maxZoom: 1,
    rendererOptions: { fragmentShader }
  })
);