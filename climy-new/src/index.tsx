import ReactDOM from "react-dom"
import Map from "./components/Map"

const _root = document.getElementById('_root')
ReactDOM.render(<Map center={[51.505, -0.09]} zoom={13} scrollWheelZoom={false} />, _root)