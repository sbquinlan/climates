import { MapContainer, TileLayer } from 'react-leaflet'
import type { MapContainerProps } from 'react-leaflet'

const OSM_COPYRIGHT = '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';

export default function Map(props: MapContainerProps) {
  const { children, ...rest } = props
  return (
    <MapContainer {...rest} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution={OSM_COPYRIGHT}
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
}