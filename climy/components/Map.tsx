import type { LatLng, LeafletMouseEvent, MapOptions } from 'leaflet';
import { Control, CRS, LatLngBounds, Map as LeafletMap, Polyline, TileLayer } from 'leaflet';
import { useEffect, useRef, useState } from 'react';

const OSM_COPYRIGHT = '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors';

interface DimensionsType {
  height: number,
  width: number
}

type CRSKey = keyof typeof CRS;
interface ConfigType {
  path: string,
  scale: number,
  crs: CRSKey,
  
  dimensions: DimensionsType,
  tile_dim: number,

  bands: number,
  // offset in bytes to get past the ifd and other headers
  data_offset: number,
  // datatype basically like uint16, not sure how to do that in javascript
  dtype: string,
}

type TypedArray = Int8ArrayConstructor 
  | Uint8ArrayConstructor 
  | Int16ArrayConstructor 
  | Uint16ArrayConstructor 
  | Int32ArrayConstructor 
  | Uint32ArrayConstructor;
const DTypeArray: { [key: string]: TypedArray } = {
  'int8': Int8Array,
  'uint8': Uint8Array,
  'int16': Int16Array,
  'uint16': Uint16Array,
  'int32': Int32Array,
  'uint32': Uint32Array,
};

const DATA_CONFIGS: { [key: string]: ConfigType } = {
  'temp': {
    'path': '/tmp.tif',
    'scale': 1,
    'crs': 'EPSG4326',

    'dimensions': {'height': 32, 'width': 32},
    'bands': 2,
    'tile_dim': 16,
    'data_offset': 470,
    'dtype': 'uint8',
  },
  'tmin': {
    'path': '/10m_tmin.tif',
    'scale': 10,
    'crs': 'EPSG4326',

    'dimensions': {'height': 1080, 'width': 2160},
    'bands': 12,
    'tile_dim': 256,
    'data_offset': 839,
    'dtype': 'int16',
  },
  'tavg': {
    'path': '/10m_tavg.tif',
    'scale': 10,
    'crs': 'EPSG4326',

    'dimensions': {'height': 1080, 'width': 2160},
    'bands': 12,
    'tile_dim': 256,
    'data_offset': 839,
    'dtype': 'int16',
  },
  'tmax': {
    'path': '/10m_tmax.tif',
    'scale': 10,
    'crs': 'EPSG4326',

    'dimensions': {'height': 1080, 'width': 2160},
    'bands': 12,
    'tile_dim': 256,
    'data_offset': 839,
    'dtype': 'int16',
  }
};

// byte offset for scan matrix in row major
function byte_offset(
  x_offset: number,
  y_offset: number,
  x_dim: number,
): number {
  // this first part is a linear transform
  return ((y_offset * x_dim) + x_offset);
}

function latlng_to_pixel(config: ConfigType, latlng: LatLng): {x:number, y:number} {
  const crs = CRS[config.crs]
  // zoom is just Math.log2(height of raster pixels / 256)
  // the opposite is 256 * 2^zoom = pixels in height @ zoom
  let { x , y } = crs.latLngToPoint(latlng, crs.zoom(config.dimensions.height))
  // these points can be on a repeated tile somewhere and give really big numbers
  // i need to make sure they stay in the dimensions of the target file
  x = Math.floor(x) % config.dimensions.width
  y = Math.floor(y) % config.dimensions.height
  return {
    x: (x < 0) ? config.dimensions.width + x : x,
    y: (y < 0) ? config.dimensions.height + y : y,
  }
}

function sample_data(key: string, latlng: LatLng) {
  const config = DATA_CONFIGS[key];
  let { x , y } = latlng_to_pixel(config, latlng)
  
  const typed_arr = DTypeArray[config.dtype]
  const pixel_size = typed_arr.BYTES_PER_ELEMENT * config.bands
  
  const tile_offset = byte_offset(
    // tile coordinates
    Math.floor(x / config.tile_dim), 
    Math.floor(y / config.tile_dim), 
    // ceil is important: a ty means skipping a dx of tiles, even though this might not evenly divide
    // this is the number of tiles we are skipping for each tile in the y
    Math.ceil(config.dimensions.width / config.tile_dim),
    // number of pixels in the tile
  ) * (config.tile_dim ** 2);

  const pixel_offset = byte_offset(
    // sub-tile pixel coords
    Math.floor(x % config.tile_dim),
    Math.floor(y % config.tile_dim),
    // number of pixels to skip for every y
    config.tile_dim,
  );
  const range_offset = config.data_offset + (tile_offset + pixel_offset) * pixel_size

  return fetch(
    config.path,
    {
      headers: {
        range: `bytes=${range_offset}-${range_offset + pixel_size - 1}`
      }
    },
  ).then(
    (resp) => {
      if (resp.status !== 206) {
        throw new Error(resp.statusText)
      }
      return resp.arrayBuffer()
    }
  )
   .then((buff) => new typed_arr(buff))
   .then(console.log.bind(console, key))
   .catch(console.error.bind(console));
}

// stuff for making a grid
function* range(start: number, end: number, step: number = 1) {
  let count = 0;
  if (step === 0) {
    return count;
  }
  for (let i = start; (step > 0 && i < end) || (step < 0 && i > end); i += step) {
    count++;
    yield i;
  }
  return count;
}

function grid(step: {x: number, y: number}, bounds: LatLngBounds) {
  return [
    ... [...range(bounds.getSouth(), bounds.getNorth() + step.y / 2, step.y)].map(
      lat => [[lat, bounds.getWest()],[lat, bounds.getEast()]]
    ),
    ... [...range(bounds.getWest(), bounds.getEast() + step.x / 2, step.x)].map(
      lng => [[bounds.getNorth(), lng], [bounds.getSouth(), lng]]
    )
  ]
}

export default function Map(props: MapOptions) {
  const map_ref = useRef<HTMLDivElement>(null)
  let [map, setMap] = useState<LeafletMap | null>(null)
  useEffect(() => {
    if (map_ref.current !== null && map == null) {
      const inner_map = new LeafletMap(map_ref.current, props);
      // const tiles = new TileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

      const tmin = new TileLayer('/10m_tmin_1/{z}/{x}/{y}.png', { })
      inner_map.addLayer(tmin)

      // const base_tiles = new TileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      //   attribution: OSM_COPYRIGHT,
      //   subdomains: 'abcd',
      //   minZoom: 0,
      //   maxZoom: 20
      // });
      // inner_map.addLayer(base_tiles);

      inner_map.addControl(new Control.Scale());
      inner_map.addEventListener(
        'click',
        (e: LeafletMouseEvent) => { 
          sample_data('tmin', e.latlng)
          sample_data('tmax', e.latlng)
          sample_data('tavg', e.latlng)
        },
      );

      // (new Polyline(
      //   [ ... grid({x: 360/36, y: 180/18}, new LatLngBounds([-90, -180], [90, 180])), ],
      //   { 
      //     lineCap: 'square',
      //     weight: 1
      //   }
      // )).addTo(inner_map);

      setMap(inner_map)
      return () => { }
    }
  }, [])

  return (
    <div style={{ height: "100%" }} ref={map_ref}> 
    </div>
  );
}