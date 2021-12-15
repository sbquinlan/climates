import asyncio
from asyncio.tasks import sleep

async def sleepy_range(delay, stop):
  for i in range(stop):
    await asyncio.sleep(delay)
    yield i

async def count(stop):
  res = {}
  for i in range(stop):
    res[i] = [x async for x in sleepy_range(1, i)]
  return res

if __name__ == '__main__':
  result = asyncio.run(count(10))
  print(result)