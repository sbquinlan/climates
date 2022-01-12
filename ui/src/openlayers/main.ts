import Map from 'ol/Map';
import TileLayer from 'ol/layer/Tile';
import GLLayer from 'ol/layer/WebGLTile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import View from 'ol/View';

import colormap from 'colormap';

import "ol/ol.css"
import { fromLonLat } from 'ol/src/proj';

function getColorStops(name, min, max, steps, reverse) {
  const delta = (max - min) / (steps - 1);
  const stops = new Array(steps * 2);
  const colors = colormap({colormap: name, nshades: steps, format: 'rgba'});
  if (reverse) {
    colors.reverse();
  }
  for (let i = 0; i < steps; i++) {
    stops[i * 2] = min + i * delta;
    stops[i * 2 + 1] = colors[i];
  }
  return stops;
}


const base_layer = new TileLayer({
  source: new OSM(),
});

const gl_layer = new GLLayer({
  source: new XYZ({
    crossOrigin: '',
    maxZoom: 3,
    url: "http://localhost:8000/10m_tavg/March/{z}/{x}/{y}.png",
  }),
  style: {
    color: [
      'interpolate',
      ['linear'],
      ['band', 1],
      ... getColorStops('jet', 0, 0.3, 6, false)
    ] 
  },
  opacity: 1.0,
});

new Map({
  target: 'map',
  layers: [
    base_layer,
    gl_layer,
  ],
  view: new View({
    center: fromLonLat([0,0]),
    zoom: 2,
  })
});