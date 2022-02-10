
from contextlib import ExitStack
from fnmatch import fnmatch
from io import BytesIO
from os.path import join
from typing import List, NamedTuple, TypeVar
from urllib.parse import urljoin
from zipfile import ZipFile

import numpy
import rasterio
from rasterio.enums import Compression, Interleaving

from configs.base import Source

TBand = TypeVar('TBand')

class WorldClimBand(NamedTuple):
  name: str

class WorldClim(Source[WorldClimBand]):
  _res: str = '10m' # ['10m', '5m', '2.5m', '10s']
  _BASE_URL: str = 'https://biogeo.ucdavis.edu/data/worldclim/v2.1/base/'

  _vars: List[WorldClimBand] = [
    WorldClimBand('tmin'),
    WorldClimBand('tmax'),
    WorldClimBand('tavg'),
    WorldClimBand('prec'),
    WorldClimBand('srad'),
    WorldClimBand('wind'),
    WorldClimBand('vapr'),
  ]

  def bandname(self, band: WorldClimBand) -> str:
    return f'wc2.1_{self._res}_{band.name}'

  def _remote_file(self, band: WorldClimBand) -> str:
    return urljoin(self._BASE_URL, f'{self.bandname(band)}.zip')

  def bands(self) -> List[WorldClimBand]:
    return self._vars

  def cache_single_var(self, band: WorldClimBand, resp, cache_file: str) -> None:
    with ExitStack() as stack:
      zip = ZipFile(BytesIO(resp.read()))
      bandfiles = [
        stack.enter_context(rasterio.open(zip.open(bname))) for bname in 
        sorted(binfo.filename for binfo in zip.infolist() if fnmatch(binfo.filename, 'wc2.1_*.tif'))
      ]

      # grab the profile from the first file and override for the outfile
      profile = bandfiles[0].profile
      profile.update({
        'driver': 'GTIFF',
        'count': len(bandfiles),
        'interleave': Interleaving.pixel.value,
        'compress': Compression.none.value,
        'tiled': True,
        'blockxsize': 256,
        'blockysize': 256,
        'overviews': None
      })
      outfile = stack.enter_context(rasterio.open(cache_file, mode='w', **profile))
      for _, window in bandfiles[0].block_windows(1):
        bands = [f.read(1, masked=True, window=window) for f in bandfiles]
        outfile.write(numpy.asarray(bands), window=window)

