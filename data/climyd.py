from os import chdir
import click
from configs.worldclim import WorldClim
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

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
    wc.clear_build()
  if level != 'build':
    wc.clear_cache()

@cli.command()
@click.pass_context
def download(ctx):
  wc = WorldClim(**ctx.obj)
  wc.load()

@cli.command()
@click.pass_context
def tile(ctx):
  wc = WorldClim(**ctx.obj)
  wc.tiles()
      
@cli.command()
@click.option('--webroot', default='webroot', type=click.Path(exists=False, file_okay=False, dir_okay=True))
@click.option('--port', default=8000)
def serve(webroot, port):
  chdir(webroot)
  with ThreadingHTTPServer(('', port), SimpleHTTPRequestHandler) as httpd:
    httpd.serve_forever()

if __name__ == '__main__':
  cli(obj={})