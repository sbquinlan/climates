import fnmatch
import os
import shutil
import zipfile

import click
import rasterio
import urllib3
from config import DATA_DIR, VARS, local_file, remote_file

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

def extract_normal(res: str, var: str): 
  with zipfile.ZipFile(local_file(res, var), 'r') as zip:
    for bname in zip.namelist():
      if fnmatch.fnmatch(bname, '*.tif') and not os.path.exists(f'{DATA_DIR}{bname}'):
        zip.extract(bname, DATA_DIR)

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

if __name__ == '__main__':
  download()
