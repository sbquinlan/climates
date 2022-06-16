from asyncio import subprocess
import click
from configs.worldclim import WorldClim
from configs.tifftiler import TiffTiler

@click.group(chain=True)
@click.option('--cache', default='cache', type=click.Path(exists=False, file_okay=False, dir_okay=True))
@click.option('--output', default='webroot', type=click.Path(exists=False, file_okay=False, dir_okay=True))
@click.pass_context
def cli(ctx, **kwargs):
  ctx.ensure_object(dict)
  ctx.obj.update(kwargs)

@cli.command()
@click.pass_context
@click.argument('level', type=click.Choice(['all', 'cache', 'build']))
def clear(ctx, level):
  wc = WorldClim(**ctx.obj)
  if level != 'cache':
    tt = TiffTiler(wc)
    tt.clear_build()
  if level != 'build':
    wc.clear()

@cli.command()
@click.pass_context
def download(ctx):
  wc = WorldClim(**ctx.obj)
  wc.load()

@cli.command()
@click.pass_context
def tile(ctx):
  tt = TiffTiler(WorldClim(**ctx.obj))
  tt.tiles()

@cli.command()
@click.pass_context
def upload(ctx):
  subprocess.run(
    [
      'b2',
      'sync',
      '--excludeAllSymlinks',
      '--excludeRegex', '\'\..*\'',
      '--includeRegex', '\'.*\.bin$\'',
      ctx['output'], 'b2://raster/',
    ],
    stdout=subprocess.STDOUT,
    stderr=subprocess.STDOUT,
  )

if __name__ == '__main__':
  cli(obj={})