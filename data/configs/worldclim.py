
import re
import calendar
from contextlib import ExitStack
from fnmatch import fnmatch
from io import BytesIO
from os import listdir, makedirs
from os.path import exists, join
from shutil import copyfileobj, rmtree
from typing import Any, Iterator, List, NamedTuple, Optional, Tuple
from urllib.parse import urljoin
from zipfile import ZipFile

import numpy
import rasterio
import urllib3
from configs.base import SupportsTiles, TileJSON
from png import Writer
from rasterio.enums import Compression, Interleaving
from rio_tiler.io.cogeo import COGReader
from rio_tiler.models import ImageData


class WorldClimBand(NamedTuple):
  name: str
  bands: int
  transform: Optional[Tuple[int, int]]

class WorldClim(SupportsTiles[WorldClimBand]):

  _res: str = '10m' # ['10m', '5m', '2.5m', '10s']

  _BASE_URL: str = 'https://biogeo.ucdavis.edu/data/worldclim/v2.1/base/'
  
  _vars: List[WorldClimBand] = [
    WorldClimBand('tmin', 12, (100, 10000)),
    WorldClimBand('tmax', 12, (100, 10000)),
    WorldClimBand('tavg', 12, (100, 10000)),
    WorldClimBand('prec', 12, None),
    WorldClimBand('srad', 12, None),
    WorldClimBand('wind', 12, (10, 0)),
    WorldClimBand('vapr', 12, (100, 0)),
  ]

  _tilesize: int = 256
  _dtype: str = 'uint16'
  _nodata: int = 65535
  _writer: Writer = Writer(
    width=256, 
    height=256, 
    greyscale=True, 
    transparent=65535, 
    bitdepth=16,
    compression=6,
    interlace=True,
  )

  def _bands(self) -> List[WorldClimBand]:
    return self._vars

  def _wc_format(self, var: str) -> str:
    return f'wc2.1_{self._res}_{var}'

  def _remote_file(self, var: str) -> str:
    return urljoin(self._BASE_URL, f'{self._wc_format(var)}.zip')

  def _cache_file(self, var: str, bidx: Optional[int]) -> str:
    if bidx is None:
      return join(self.cache, self._wc_format(var))
    return join(self.cache, self._wc_format(var), f'{bidx}.tif')

  def _local_file(self, var: str, bidx: Optional[int]) -> str: 
    if bidx is not None:
      return join(self.output, f'{self._res}_{var}', calendar.month_name[bidx])
    return join(self.output, f'{self._res}_{var}')

  ## replace fill value and change datatype + scaling with broadcast
  def _process_band(self, vconfig: WorldClimBand, data: numpy.ma.masked_array) -> numpy.ma.masked_array:
    if vconfig.transform is not None:
      data = (data * vconfig.transform[0] + vconfig.transform[1])
    return numpy.ma.filled(data, fill_value=self._nodata).astype(dtype=self._dtype, copy=False)

  # Public Interface

  def clear_cache(self) -> None:
    for var in self._bands():
      dir = self._cache_file(var.name, None)
      if exists(dir):
        rmtree(dir)

  def clear_build(self) -> None:
    for var in self._bands():
      dir = self._local_file(var.name, None)
      if exists(dir):
        rmtree(dir)

  def load(self) -> None:
    http = urllib3.PoolManager()
    for vconfig in self._bands():
      cache_dir = self._cache_file(vconfig.name, None)
      if exists(cache_dir):
        continue
      makedirs(cache_dir)

      with http.request('GET', self._remote_file(vconfig.name), preload_content=False) as resp:
        with ZipFile(BytesIO(resp.read())) as zip:
          for binfo in zip.infolist():
            if not fnmatch(binfo.filename, 'wc2.1_*.tif') or exists(join(cache_dir, binfo.filename)):
              continue
            bidx = int(re.match(f'.*_([\d]+).tif', binfo.filename).group(1))
            out_path = self._cache_file(vconfig.name, bidx)
            with zip.open(binfo, 'r') as in_tif, \
                open(out_path, 'wb') as out_tif:
              copyfileobj(in_tif, out_tif)
        resp.release_conn()
    http.clear()

  # Tile Stuff

  def gen_tile_inputs(self) -> Iterator[Tuple[Any, str, WorldClimBand]]:
    for vconfig in self._bands():
      for bidx in range(1, vconfig.bands + 1):
        yield (self._cache_file(vconfig.name, bidx), self._local_file(vconfig.name, bidx), vconfig)

  def write_tile_image(self, vconfig: WorldClimBand, path: str, img: ImageData) -> None:
    data = numpy.ma.masked_array(data=img.data, mask=numpy.logical_not(img.mask))
    with open(path, 'wb') as out:
      self._writer.write(
        out,
        # remove the band index
        self._process_band(vconfig, data)[0]
      )
  
  def tilejson(self, vconfig: WorldClimBand, cog: COGReader) -> TileJSON:
    local_dir = self._local_file(vconfig.name, None)
    return TileJSON(
      name=vconfig.name,
      description='',
      version='2.1',
      attribution='Fick, S.E. and R.J. Hijmans, 2017. WorldClim 2: new 1km spatial resolution climate surfaces for global land areas. International Journal of Climatology 37 (12): 4302-4315.',
      tiles=[urljoin(local_dir, '{z}/{x}/{y}.png')],
      tilesize=self._tilesize,
      minzoom=cog.minzoom,
      maxzoom=cog.maxzoom,
      bounds=cog.bounds
    )

  # Other Assets

  def gen_assets(self) -> None:
    for vconfig in self._bands():
      cache_dir = self._cache_file(vconfig.name, None)
      with ExitStack() as stack:
        bandfiles = [
          stack.enter_context(rasterio.open(band)) for band in 
          sorted(bname for bname in listdir(cache_dir) if fnmatch(bname, '*.tif'))
        ]

        # grab the profile from the first file and override for the outfile
        profile = bandfiles[0].profile
        profile.update({
          'driver': 'GTIFF',
          'dtype': self._dtype,
          'nodata': self._nodata,
          'count': len(bandfiles),
          'interleave': Interleaving.pixel.value,
          'compress': Compression.none.value,
          'tiled': True,
          'blockxsize': self._tilesize,
          'blockysize': self._tilesize,
          'overviews': None
        })
        local_dir = self._local_file(vconfig.name)
        with rasterio.open(join(local_dir, 'all.tif'), mode='w', **profile) as outfile:
          # assume all the file have the same blocks
          for _, window in bandfiles[0].block_windows(1):
            bands = [self._process_band(vconfig, f.read(1, masked=True, window=window)) for f in bandfiles]
            outfile.write(numpy.asarray(bands), window=window)
