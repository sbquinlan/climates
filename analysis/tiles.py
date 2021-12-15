import asyncio
from functools import reduce, partial
from typing import List
from aiohttp.client import ClientSession
import json

# this is how leaflet selects subdomains by default
def subdomain(x, y, subdomains='abc'):
  return subdomains[abs(x + y) % len(subdomains)]

def uri_builder(base_uri):
  return partial(base_uri.format, s='b', ext='png', r='')

async def measure_tile(session: ClientSession, uri: str):
  async with session.head(uri) as resp:
    return int(resp.headers['Content-Length'])

def measure_zooms(session: ClientSession, format_uri, zooms: List[int]):
  return [
    measure_tile(session, format_uri(x=x, y=y, z=z)) 
    for z in zooms for x in range(z + 1) for y in range(z + 1) 
  ]

HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:61.0) Gecko/20100101 Firefox/61.0'
}

def online_stats(a, b): 
  if a is None:
    return {
      'max': b,
      'min': b,
      'avg': b,
      'count': 1,
    }
  else:
    return {
      'max': max(a['max'], b),
      'min': min(a['min'], b),
      'avg': a['avg'] + ((b - a['avg']) / (a['count'] + 1)),
      'count': a['count'] + 1,
    }

async def measure_tiles(providers, zooms):
  provider_results = {}
  async with ClientSession(headers=HEADERS) as session:
    for p in providers:
      builder = uri_builder(p)
      provider_results[p] = reduce(
        online_stats,
        [size for size in await asyncio.gather(*measure_zooms(session, builder, zooms))],
        None
      )
  return provider_results
      
if __name__ == '__main__':
  result = asyncio.run(
    measure_tiles(
      [
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.{ext}',
        'https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.{ext}',
        'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}{r}.{ext}',
        'https://stamen-tiles-{s}.a.ssl.fastly.net/streets/{z}/{x}/{y}{r}.{ext}',
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
      ],
      [1, 5, 10],
    )
  )
  print(json.dumps(result, indent=4, sort_keys=True))