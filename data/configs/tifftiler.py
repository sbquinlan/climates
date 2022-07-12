
from os import makedirs
from os.path import join
from attr import attrib, attrs

import morecantile
from morecantile import TileMatrixSet
import rasterio
from rasterio.enums import Resampling, Compression, Interleaving
from rasterio.transform import from_bounds
from rasterio.vrt import WarpedVRT
from rasterio.warp import calculate_default_transform

from configs.base import TBand, AssetFactory

GTIFF = {
  'driver': 'GTIFF',
  'interleave': Interleaving.pixel.value,
  'compress': Compression.none.value,
  'overviews': None,
  'tiled': False
}

HEADERLESS_TIFF = {
  'driver': 'ENVI',
  'interleave': 'BIP'
}

@attrs
class TiffTiler(AssetFactory[TBand]):
  _tms: TileMatrixSet = attrib(default=morecantile.tms.get('WebMercatorQuad'))
  # should get this off the _tms but it's not available.
  _tilesize: int = attrib(default=256)
  _dtype: str = attrib(default='float32')
  _profile = attrib(default=HEADERLESS_TIFF)

  # Solve for the dimensions of the dataset in the destination crs.
  # Find the zoom in the destination crs with the closest matching dimensions.
  def max_zoom(self, ds) -> None:
    affine = ds.transform 
    if ds.crs != self._tms.rasterio_crs:
      affine, _, _ = calculate_default_transform(
        ds.crs,
        self._tms.rasterio_crs,
        ds.width,
        ds.height,
        *ds.bounds
      )
    return self._tms.zoom_for_res(max(abs(affine.a), abs(affine.e)))

  def tiles(self) -> None:
    ts = self._tilesize
    for band in self._source.bands():
      with rasterio.open(self._source.cache_file(band)) as src:
        maxzoom = self.max_zoom(src)
        
        # this logic is copied from rio-tiler. I don't understand what it does exactly
        # but it seems to fix the transform and that impacts the output quite a bit.
        # https://github.com/rasterio/rasterio/discussions/2484
        dst_transform, width, height = calculate_default_transform(
          src.crs, 
          self._tms.rasterio_crs, 
          src.width, 
          src.height, 
          *src.bounds
        )
        tile_transform = from_bounds(*self._tms.xy_bbox, width=width, height=height)
        w_res = (
          tile_transform.a
          if abs(tile_transform.a) < abs(dst_transform.a)
          else dst_transform.a
        )
        h_res = (
          tile_transform.e
          if abs(tile_transform.e) < abs(dst_transform.e)
          else dst_transform.e
        )
        w, s, e, n = self._tms.xy_bbox
        vrt_width = max(1, round((e - w) / w_res))
        vrt_height = max(1, round((s - n) / h_res))
        vrt_transform = from_bounds(w, s, e, n, vrt_width, vrt_height)

        with WarpedVRT(src, transform=vrt_transform, height=vrt_height, width=vrt_width, crs=self._tms.rasterio_crs, resampling=Resampling.average) as vrt:
          # range isn't inclusive, but maxzoom is.
          for tile in self._tms.tiles(*self._tms.bbox, range(maxzoom + 1), truncate=True):
            dwin = vrt.window(*self._tms.xy_bounds(tile))
            data = vrt.read(window=dwin, out_shape=(src.count, ts, ts))

            profile = {
              ** vrt.profile,
              ** self._profile,
              'dtype': self._dtype,
              'width': ts,
              'height': ts,
              # this doesn't seem to be needed, not sure why it was here.
              # 'transform': vrt.window_transform(dwin) * Affine.scale(dwin.height / ts, dwin.width / ts)
            }
            path = join(self._source.output_dir(band), str(tile.z), str(tile.x))
            makedirs(path, exist_ok=True)
            with rasterio.open(join(path, f'{tile.y}.bin'), 'w', **profile) as dst:
              dst.write(data if data.dtype == self._dtype else data.astype(self._dtype))
