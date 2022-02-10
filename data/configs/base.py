
from abc import abstractmethod
from itertools import product
from os import remove
from os.path import exists, join, isdir
from shutil import rmtree
from typing import Generic, Iterator, List, Tuple, TypeVar

import urllib3
from attr import attrib, attrs

TBand = TypeVar('TBand')

@attrs
class Source(Generic[TBand]):
  cache: str = attrib()
  output: str = attrib()

  @abstractmethod
  def _remote_file(self, band: TBand) -> str:
    ...

  @abstractmethod
  def bandname(self, band: TBand) -> str:
    ...

  def cache_file(self, band: TBand) -> str:
    return join(self.cache, self.bandname(band))

  ## kind of wierd here, but whatever
  def output_dir(self, band: TBand) -> str:
    return join(self.output, self.bandname(band))

  @abstractmethod
  def bands(self) -> List[TBand]:
    ...

  @abstractmethod
  def cache_single_var(self, band: TBand, resp, cache_file: str) -> None:
    ... 

  def load(self) -> None:
    http = urllib3.PoolManager()
    for band in self.bands():
      cache_file = self.cache_file(band)
      if exists(cache_file):
        continue

      with http.request('GET', self._remote_file(band), preload_content=False) as resp:
        self.cache_single_var(band, resp, cache_file)
        resp.release_conn()
    http.clear()

  def clear(self) -> None:
    for var in self.bands():
      dir = self.cache_file(var)
      if exists(dir) and isdir(dir):
        rmtree(dir)
      elif exists(dir):
        remove(dir)
  
@attrs
class AssetFactory(Generic[TBand]):
  _source: Source[TBand] = attrib()

  def cache(self) -> None:
    self._source.load()

  def clear_cache(self) -> None:
    self._source.clear()

  def clear_build(self) -> None:
    for band in self._source.bands():
      dir = self._source.output_dir(band)
      if exists(dir) and isdir(dir):
        rmtree(dir)
      elif exists(dir):
        remove(dir)

def gen_tile_numbers(min_zoom: int, max_zoom: int) -> Iterator[Tuple[int, int, int]]:
  return ((x,y,z) for z in range(min_zoom, max_zoom + 1) for (x, y) in product(range(2 ** z), range(2 ** z)))
