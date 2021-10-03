# Climate Map

Make an interactive map of the world similar to windy.com that displays climate information rather than current weather conditions. The work in this repo right now is just basic analysis of the existing data. To use that work you will need python3-venv installed and then ```source .env/bin/activate``` to access to local python modules required. I believe you might also need gdal headers installed for some of the python modules to work but I can't remember.

## Data Sources

The most useful data source for current climate normals is [WorldClim](https://www.worldclim.org/data/index.html) and this repository is currently setup expecting that different resolutions of the "Bioclimate Variables" dataset is expanded into a _data directory that is ignored by git.

## Future Work

[Leaflet](https://leafletjs.com/) seems to be the best choice for an interactive map. [Next.js](nextjs.org) is my preferred way of standing up a website, but I could be into anything else. I haven't actually tried to take the raster data from WorldClimv2 and push it onto a leaflet map as a raster layer yet. I imagine that doesn't work very well. [Maptiler](https://www.maptiler.com/) seems to be the tool of choice for making the tiled images that we're used to with google maps sat imagery. I haven't run it using the WorldClimv2 data yet, but I think I could bypass all the registration/paywall stuff by using [a docker container to run maptiler](https://hub.docker.com/r/maptiler/engine).

If we just had a tiled map of the world clim data that would be a great MVP to build from.