import "leaflet/dist/leaflet.css"

import { Map, TileLayer } from 'leaflet';

const map = new Map(
  'map', 
  { 
    center: [0, 0],
    zoom: 0, 
    zoomSnap: 0.25,
  }
);
// map.addLayer(new TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'))
map.addLayer(new TileLayer('http://localhost:8000/10m_tavg/January/{z}/{x}/{y}.png', { maxZoom: 3 }))