from _typeshed import ReadableBuffer
from abc import abstractmethod
from itertools import product
import json
from os import makedirs
from os.path import join
from typing import Any, Callable, Generic, Iterator, List, NamedTuple, Tuple, TypeVar, final

from attr import attr, attrib, attrs
import numpy
from rio_tiler.io.cogeo import COGReader
from rio_tiler.models import ImageData

class TileJSON(NamedTuple):
  name: str 
  description: str
  version: str
  attribution: str
  bounds: Tuple[float, float, float, float]
  
  tiles: List[str]
  minzoom: int
  maxzoom: int
  
  # not part of the spec
  tilesize: int 

  tilejson: str = "3.0.0"
  scheme: str = "xyz"
  vector_layers: List[Any] = []

class Asset(NamedTuple):
  name: str
  description: str
  version: str
  attribution: str
  bounds: Tuple[float, float, float, float]

  bands: int
  dtype: str
  nodata: int

  data_offset: int
  tilesize: int

def gen_tile_numbers(min_zoom: int, max_zoom: int) -> Iterator[Tuple[int, int, int]]:
  return ((x,y,z) for z in range(min_zoom, max_zoom + 1) for (x, y) in product(range(2 ** z), range(2 ** z)))

TBandConfig = TypeVar('TBandConfig')

@attrs
class BaseFactory(object):
  cache: str = attrib()
  output: str = attrib()

  @abstractmethod
  def clear_cache(self) -> None:
    ...

  @abstractmethod
  def clear_build(self) -> None:
    ...

  @abstractmethod
  def load(self) -> None:
    ...

class SupportsTiles(BaseFactory, Generic[TBandConfig]):

  # returns the input file, output directory, and associated metadata
  # for callbacks
  @abstractmethod
  def gen_tile_inputs(self) -> Iterator[Tuple[str, str, TBandConfig]]:
    ...

  # should write the imagedata to the path
  @abstractmethod
  def write_tile_image(self, vconfig: TBandConfig, path: str, img: ImageData) -> None:
    ...
  
  # creates a TileJSON for a completed tileset
  @abstractmethod
  def tilejson(self, vconfig: TBandConfig, cog: COGReader) -> TileJSON:
    ...

  @final
  def tiles(self) -> None:
    for (input, output, vconfig) in self.gen_tile_inputs():
      with COGReader(input) as cog:
        for x, y, z in gen_tile_numbers(cog.minzoom, cog.maxzoom):
          if not cog.tile_exists(x, y, z):
            continue
          path = join(output, str(z), str(x))
          makedirs(path, exist_ok=True)
          self.write_tile_image(vconfig, join(path, f'{y}.png'), cog.tile(x, y, z))
        with open(join(output, 'tiles.json'), 'w') as tilejson:
          tilejson.write(json.dumps( self.tilejson(vconfig, cog)._asdict() ))
        
