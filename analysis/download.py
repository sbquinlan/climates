from contextlib import ExitStack
import fnmatch
import io
import os
import shutil
import urllib3
import zipfile

import click
import numpy
import rasterio
from rasterio.enums import Interleaving, Compression

# bio is 12 variables in one, the rest are monthly
VARS = {
  'tmin': {
    'nodata': -32768,
    'dtype': rasterio.int16,
    'scale': 10
  },
  'tmax': {
    'nodata': -32768,
    'dtype': rasterio.int16,
    'scale': 10
  }, 
  'tavg': {
    'nodata': -32768,
    'dtype': rasterio.int16,
    'scale': 10
  },
  'prec': {
    'nodata': -32768,
    'dtype': rasterio.int16,
    'scale': 1
  },
  'srad': {
    'nodata': 65535,
    'dtype': rasterio.uint16,
    'scale': 1
  },
  'wind': {
    'nodata': 65535,
    'dtype': rasterio.uint16,
    'scale': 10
  },
  'vapr': {
    'nodata': 65535,
    'dtype': rasterio.uint16,
    'scale': 100
  }
}

BASE_URI = 'https://biogeo.ucdavis.edu/data/worldclim/v2.1/base/'
DATA_DIR = './data/'

def local_file(res: str, var: str, ext: str='zip'): 
  return f'{DATA_DIR}{res}_{var}.{ext}'

def remote_file(res: str, var: str):
  return f'{BASE_URI}wc2.1_{res}_{var}.zip'

def download_archive(res: str, var: str):
  lfile = local_file(res, var)
  if os.path.exists(lfile):
    return

  http = urllib3.PoolManager()
  with http.request('GET', remote_file(res, var), preload_content=False) as resp, \
      open(lfile, 'wb') as archive:
    shutil.copyfileobj(resp, archive)
    resp.release_conn()
  http.clear()

## replace fill value and change datatype + scaling with broadcast
def process_band(
  band: numpy.ma.MaskedArray, 
  nodata: int, 
  dtype: str, 
  scale: int
):
  return numpy.ma.filled(band * scale, fill_value=nodata).astype(dtype)

def extract_normal(res: str, var: str): 
  with zipfile.ZipFile(local_file(res, var), 'r') as zip:
    for bname in zip.namelist():
      if fnmatch.fnmatch(bname, '*.tif') and not os.path.exists(f'{DATA_DIR}{bname}'):
        zip.extract(bname, DATA_DIR)

def extract_and_combine(res: str, var: str, vconfig):
  with zipfile.ZipFile(local_file(res, var), 'r') as zip, \
       ExitStack() as stack:
    bandfiles = [
      stack.enter_context(rasterio.open(io.BytesIO(zip.read(bandname)))) for bandname in
      sorted(bname for bname in zip.namelist() if fnmatch.fnmatch(bname, '*.tif'))
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
      'blocksize': 128,
      'overviews': None
    })

    with rasterio.open(local_file(res, var, 'tif'), mode='w', **profile) as outfile:
      # assume all the file have the same blocks
      for ij, window in bandfiles[0].block_windows(1):
        bands = [process_band(f.read(1, masked=True, window=window), **vconfig) for f in bandfiles]
        outfile.write(
          numpy.asarray(bands),
          window=window,
        )

@click.command()
@click.argument('res', type=click.Choice(choices=['10m', '5m', '2.5m', '10s']))
@click.option('--extract', default=False)
def download(res, extract):
  # blocks need to be in order, streamable forces this (doesn't work)
  with rasterio.Env(STREAMABLE_OUTPUT=True):
    for v, c in VARS.items():
      print(v)
      download_archive(res, v)
      if (extract):
        extract_normal(res, v)
      extract_and_combine(res, v, c)

if __name__ == '__main__':
  download()