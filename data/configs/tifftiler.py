
from os import makedirs
from os.path import join
from attr import attrib, attrs

from affine import Affine
import morecantile
from morecantile import TileMatrixSet
import rasterio
from rasterio.enums import Resampling, Compression, Interleaving
from rasterio.vrt import WarpedVRT

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

  def tiles(self) -> None:
    ts = self._tilesize
    for band in self._source.bands():
      with rasterio.open(self._source.cache_file(band)) as src:
        with WarpedVRT(src, crs=self._tms.rasterio_crs, resampling=Resampling.average) as vrt:
          # i hate that somebody doesn't just write this logic by itself. so annoying
          # i'm biasing towards height here because i had to pick one? idk
          maxzoom = self._tms.zoom_for_res(self._tms.xy_bbox.top * 2 / src.height)
          for tile in self._tms.tiles(*self._tms.bbox, range(maxzoom), truncate=True):
            dwin = vrt.window(*self._tms.xy_bounds(tile))
            data = vrt.read(window=dwin, out_shape=(src.count, ts, ts))

            profile = {
              ** vrt.profile,
              ** self._profile,
              'dtype': self._dtype,
              'width': ts,
              'height': ts,
              'transform': vrt.window_transform(dwin) * Affine.scale(dwin.height / ts, dwin.width / ts)
            }
            path = join(self._source.output_dir(band), str(tile.z), str(tile.x))
            makedirs(path, exist_ok=True)
            with rasterio.open(join(path, f'{tile.y}.bin'), 'w', **profile) as dst:
              dst.write(data if data.dtype == self._dtype else data.astype(self._dtype))
