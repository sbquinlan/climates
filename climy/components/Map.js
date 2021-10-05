import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import dynamic from 'next/dynamic'

export default function Map({}) {
  return (
    <MapContainer center={[51.505, -0.09]} zoom={13} scrollWheelZoom={false}>
          <TileLayer
      attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    </MapContainer>
  );
}