from config import process_band, local_file, VARS

from contextlib import ExitStack
from fnmatch import fnmatch
from io import BytesIO
from zipfile import ZipFile

import click
import numpy
import rasterio
from rasterio.enums import Interleaving, Compression

def extract_and_combine(res: str, var: str, vconfig):
  with ZipFile(local_file(res, var), 'r') as zip, \
       ExitStack() as stack:
    bandfiles = [
      stack.enter_context(rasterio.open(BytesIO(zip.read(bandname)))) for bandname in
      sorted(bname for bname in zip.namelist() if fnmatch(bname, '*.tif'))
    ]

    # grab the profile from the first file and override for the outfile
    profile = bandfiles[0].profile
    profile.update({
      'driver': 'GTIFF',
      'dtype': vconfig['dtype'],
      'nodata': vconfig['nodata'],
      'count': len(bandfiles),
      'interleave': Interleaving.pixel.value,
      'compress': Compression.none.value,
      'tiled': True,
      'blockxsize': 256,
      'blockysize': 256,
      'overviews': None
    })

    with rasterio.open(local_file(res, var, 'tif'), mode='w', **profile) as outfile:
      # assume all the file have the same blocks
      for ij, window in bandfiles[0].block_windows(1):
        bands = [process_band(f.read(1, masked=True, window=window), **vconfig) for f in bandfiles]
        outfile.write(numpy.asarray(bands), window=window)

@click.command()
@click.argument('res', type=click.Choice(choices=['10m', '5m', '2.5m', '10s']))
def combine(res):
  # blocks need to be in order, streamable forces this (doesn't work)
  with rasterio.Env(STREAMABLE_OUTPUT=True):
    for v, c in VARS.items():
      print(v)
      extract_and_combine(res, v, c)

if __name__ == '__main__':
  combine()