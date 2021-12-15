import { Map as LeafletMap, TileLayer, Control, CRS } from 'leaflet'
import type { LatLng, LeafletMouseEvent, MapOptions } from 'leaflet';
import { useEffect, useRef, useState } from 'react';

const OSM_COPYRIGHT = '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';

function zoom_for_grid(grid_width: number): number {
  // each tile is 256, zoom 0 is 256 x 512
  return Math.floor(Math.max(0, grid_width) / 512)
}

function geo_to_grid(latlng: LatLng, grid_width: number): {x: number, y: number} {
  const zoom = zoom_for_grid(grid_width)
  const [zoom_height, zoom_width] = [512 * zoom, 256 * zoom]
  const { x, y } = CRS.EPSG4326.latLngToPoint(latlng, zoom_for_grid(grid_width));

  return { x: (x % zoom_width), y: (y % zoom_height) }
}

export default function Map(props: MapOptions) {

  const map_ref = useRef<HTMLDivElement>(null)
  let [map, setMap] = useState<LeafletMap | null>(null)
  useEffect(() => {
    if (map_ref.current !== null && map == null) {
      const inner_map = new LeafletMap(map_ref.current, props);

      // const tiles = new TileLayer(
      //   'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: OSM_COPYRIGHT }
      // );
      const tiles = new TileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      });
      inner_map.addLayer(tiles);
      inner_map.addControl(new Control.Scale());

      inner_map.addEventListener(
        'click',
        (e: LeafletMouseEvent) => { 
          console.log(geo_to_grid(e.latlng, 2160))
        },
      );

      setMap(inner_map)
      return () => { }
    }
  }, [])

  return (
    <div style={{ height: "100%" }} ref={map_ref}> 
    </div>
  );
}