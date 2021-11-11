## What the fuck am I doing with this data?

Ignoring adding a colormap and generating tiles to all the data, I also want to do point queries against the data.

## Point Queries

I thought about pumping all of the data into a database like the geo version of postgres, but I don't know what that gets me if I'm just doing point queries on gridded data. The tiff files with byte offsets are already the fastest indexing I can do for the data.

## Tiff File Size

The 10 min grid is 2160 by 1080. With the data type being Float32 that works out to be like 4 * 2160 * 1080 * N where N is the number of variables you want to query for file size, something like 2 MB per variable. 30 seconds would be 20 times that? No because there's two dimensions that get subdivided. So the grid would be like 2160 * 20 * 1080 * 20. So 400 * 2MB which is nearly a gig? Calculator says much more than a gig.

-- half the size by dropping precision
-- reduce size by doing compression