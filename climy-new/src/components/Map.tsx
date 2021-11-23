import { MapContainer, TileLayer } from 'react-leaflet'
import type { MapContainerProps } from 'react-leaflet'

import "leaflet/dist/leaflet.css"

const OSM_COPYRIGHT = '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';

export default function Map(props: MapContainerProps) {
  const { children, ...rest } = props
  return (
    <MapContainer {...rest} className="p-0 m-0 h-full">
      <TileLayer
        attribution={OSM_COPYRIGHT}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
}