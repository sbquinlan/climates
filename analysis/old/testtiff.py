from re import M
from typing import Callable
from affine import Affine
import click
import numpy as np
import math
import rasterio
from rasterio.enums import Interleaving, Compression
from rasterio.crs import CRS

def byte_offset(row, col):
  tdim, twide = 256, math.ceil(2160 / 256)
  bpp = 12 * 2
  tpixels = tdim * tdim * bpp
  tx, x = math.floor(row / tdim), row % tdim
  ty, y = math.floor(col / tdim), col % tdim
  skip_pixels = (ty * twide * tpixels) + tx * tpixels  + (y * twide) + tx
  return 839 + skip_pixels * bpp

def tiled_data(dim: int, tdim: int, f: Callable[[int, int, int, int], int]):
  tdomain_dim = math.ceil(dim / tdim)
  return (
    np.array(
      [
        [
          f(trow, tcol, row, col)
          # for every col (twice the width)
          for tcol in range(tdomain_dim * 2) for col in range(tdim)
        ] 
        # for every row
        for trow in range(tdomain_dim) for row in range(tdim)
      ],
      dtype=np.uint8
    )
  )

@click.command()
@click.argument('path')
def create(path: str):
  dim = 32
  tdim = 16
  tdomain_dim = math.ceil(dim / tdim)

  file = rasterio.open(
    path,
    mode='w',
    driver='GTiff',
    crs=CRS.from_epsg(4326),
    transform=Affine(0,0,-180,0,0,90),
    width=dim * 2,
    height=dim,
    dtype='uint8',
    nodata=0,
    count=2,
    interleave=Interleaving.pixel.value,
    compress=Compression.none.value,
    tiled=True,
    blockxsize=tdim,
    blockysize=tdim,
    overviews=False,
  )
  file.write(
    tiled_data(
      dim, tdim, 
      lambda trow, tcol, row, col: trow * tdomain_dim + tcol
    )
  )
  file.write(
    tiled_data(
      dim, tdim,
      lambda trow, tcol, row, col: row * tdim + col
    )
  )
  file.close()

if __name__ == '__main__':
  create()