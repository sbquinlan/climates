Ok I've combined 12 month averages into one tiff that's tiled. That should be queryable by byte range from JS / browser. The remaining work would be something like this:

- Export some json from the tiff builder to explain how the data is laid out (what resolution / byte offsets / tile size etc)
- Build the map + query from javascript to pull in the data.
- Export a mask from the tiff builder to mask the nodata regions out of the point queries

If we export the data to Cloudflare, then we'll need to break up the large file into smaller tile files so that they are under the limit, this will also need to be exported from the tiff builder.

If we want to look at the data rather than just do point queries, then we'll also need to build a color map + tiling pipeline with the tiff builder.