import dynamic from 'next/dynamic'

/**
 * This module is intended to a barrier between the server-side rendered 
 * code and the client side rendered code. By making this a dynamic import,
 * Next.js won't try to render the map into html on request, it'll let the 
 * client side code import the module and render the map. Leaflet needs the window
 * stuff to render properly
 */
export default dynamic(
  () => import('./Map'),
  { 
    ssr: false,
    loading: () => <p>One second...</p>
  }
)