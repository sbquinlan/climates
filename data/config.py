from os.path import join
from typing import Any, Dict, Optional, Tuple

import numpy

# bio is 12 variables in one, the rest are monthly
VARS: Dict[str, Dict[str, Any]] = {
  'tmin': {
    'transform': (100, 10000)
  },
  'tmax': {
    'transform': (100, 10000)
  }, 
  'tavg': {
    'transform': (100, 10000)
  },
  'prec': {
    'transform': None
  },
  'srad': {
    'transform': None
  },
  'wind': {
    'transform': (10, 0)
  },
  'vapr': {
    'transform': (100, 0)
  }
}

DATA_DIR = './data/'
def local_file(res: str, var: str, ext: Optional[str]='zip'): 
  if ext is not None:
    return join(DATA_DIR, f'{res}_{var}.{ext}')
  return join(DATA_DIR, f'{res}_{var}')

BASE_URI = 'https://biogeo.ucdavis.edu/data/worldclim/v2.1/base/'
def remote_file(res: str, var: str):
  return f'{BASE_URI}wc2.1_{res}_{var}.zip'

## replace fill value and change datatype + scaling with broadcast
def process_band(
  band: numpy.ma.MaskedArray, 
  transform: Optional[Tuple[int, int]]
):
  return numpy.ma.filled(
    band if transform is None else (band * transform[0] + transform[1]), 
    fill_value=65535,
  ).astype(dtype='uint16', copy=False)