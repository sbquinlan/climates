from fnmatch import fnmatch
from io import BytesIO
from itertools import product
from os import makedirs
from os.path import join
from typing import Iterator, Tuple
from zipfile import ZipFile

import click
import numpy
from png import Writer
from rio_tiler.io.cogeo import COGReader

from config import process_band, local_file, VARS

def gen_tile_numbers(min_zoom: int, max_zoom: int) -> Iterator[Tuple[int, int, int]]:
  return ((x,y,z) for z in range(min_zoom, max_zoom + 1) for (x, y) in product(range(2 ** z), range(2 ** z)))

def create_tiles_with_reader(res: str, var: str, vconfig):
  tilesize = 256
  with ZipFile(local_file(res, var, ext='zip'), 'r') as zip:
    for bidx, bandname in enumerate(sorted(bname for bname in zip.namelist() if fnmatch(bname, '*.tif'))):
      with COGReader(BytesIO(zip.read(bandname))) as cog:
        writer = Writer(
          width=tilesize, 
          height=tilesize, 
          greyscale=True, 
          transparent=65535, 
          bitdepth=16,
          compression=6,
          interlace=True,
        )
        for x, y, z in gen_tile_numbers(cog.minzoom, cog.maxzoom):
          if not cog.tile_exists(x, y, z):
            continue
          name = local_file(res, var, ext=None)
          path = join(f'{name}_{bidx}', str(z), str(x))
          makedirs(path, exist_ok=True)
          img = cog.tile(
            x, y, z, 
            post_process=lambda data, mask: (
              process_band(
                numpy.ma.masked_array(data, mask=mask),
                **vconfig,
              ),
              mask,
            )
          )
          with open(join(path, f'{y}.png'), 'wb') as out:
            writer.write(out, img.data[0])

@click.command()
@click.argument('res', type=click.Choice(choices=['10m', '5m', '2.5m', '10s']))
def tile(res):
  for v, c in VARS.items():
    print(v)
    create_tiles_with_reader(res, v, c)

if __name__ == '__main__':
  tile()