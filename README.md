Okay so I've basically got the whole thing working end to end. I could theoretically at this point just write the entire thing in open layers and it would pretty much do what I want. There are plenty of missing pieces, but I kind of need to rework the entire thing. I'm actually debating just using COGs. Here's why.

I currently convert what starts as a tiff with float32 values into int16. The thinking was that it would help me save a massive amount of space (roughly 50%) by dropping some unneccessary precision in temperatures (ten thousandths of a degree). I also needed to do this in the end to use PNGs which support only integer formats and I think maximally 16 bits per channel but only in 1 - 2 channel formats. Again, PNGs would further save space by being very compressable. The space savings makes serving a large tileset much easier.

Alright so what's the problem? Reading PNGs in the browser seems to mainly read at 8bits per channel. So I encode my data into a 16bit int, which gets converted into an 8bit int. This is both (1) a lossy conversion and (2) a difficult conversion to then colorize accurately. For a given pixel, what does the temperature that was originally in that pixel now map to in 8bits? Both of these just complicate colorizing the data and visualizing the data accurately. 

No matter what, I absolutely need the range of the data that I'm mapping. I need to know what the nodata, min, and max are of the original dataset so that I can colorize appropriately. AND if I want to continue using PNGs I believe I either have to map all the datasets to the correct texture formats in webgl2 (not sure that actually works) OR I have to preformat the data such that in uint8 0 would be the min and 255 would be the max OR be really crafty with spec-breaking image hacks (like writing uint16 into two uint8 channels then combining them in the shader).

So the other option is if I just read the original source data using fetch() and then create the appropriate TypedDataArray and build a texture using that. The idea here is that I could do what OpenLayers does: support only Float32 or uint8, which is constraining, but simplifies things a bit. Either it's one or the other AND I have the option of converting other types to the appropriate type when I load the data in JS. The idea is that reading from a texture that's initialized that way would net me the original value, so I don't have to do any range conversion (like if this was 200 in 16 bit int space what would the value be in a float from 0 to 1).

It definitely screws up my whole space saving data prep step. So I could just completely undo that, use the geotiff's directly (optimize them later) and use geotiff.js to read from it and write the data into a texture to render it. I need to prove that actually works, that I write in a float > 1 and read it (in the shader) at the same value I wrote it in. It's fine that color depth is 255, colorizing shit is a natural step. I just don't want to constantly be converting between a bunch of number spaces.

This new approach though kind of changes things. I'm more and more skeptical I'll be able to host this anywhere. The full resolution data is definitely on the terabyte scale, especially if I duplicate it between a tileset and a point query file. I could think about combining those two by maybe changing the way the values are mixed in the tiff between bands so that bands are by themselves, but the point queries still on their own. Anyways I need to rethink how the data is stored. COG might make sense and just ignore cloudflare hosting possibility. 

I also don't think Cloudflare would cache this even in it's current form with lots of a photos won't work and with big files won't work. Bummer. I saw other CDN solution will cache partials which is cool, but other providers would cost so much.

Some of the existing products kind of make sense now. Maptiler and Mapbox providing their services and other's providing tiling services. It makes sense, there aren't really hosting solutions that make sense for it. Also I guess I finally spent time on google earth engine and found that it has most of what I want, especially 

So yeah I need to:
- Do an experiment with raw data into textures and then read out
- Redo the source data in a different format
- Generate STAC or something parseable 
- Write the UI

--------------------------

Did the first thing. If I pass in raw data as a typedarray into the shader texture then I can use the raw values in the shader, which should vastly simply things over trying to use images and then decode images.

I knew a thought thought when I was setting up Cloudflare. I could do one of two things to make the cloudflare thing work AND basically free me up to store the data in whatever format storage side. The options are:

1. I could write a tileserver to be the origin server, then the CDN would just cache the responses of the tile server. This tileserver can be ridiculously flexible too, supporting different formats, different sources, different projections etc and to Cloudflare it would all just be a file

2. I could write a worker that sits inbetween the cache and the origin server that takes requests and maps that to a different request against origin. This is both less flexible and more complicated, but it would save me from having any sort of compute in the origin server so idk.

Also in writing the gee implementation I realized just how complicated the shader would be. First of all koppen needs all the individual month averages, not just like a couple biovars so that's a bit different. Second there's a bunch of complicated rules that are all conditional and shit so idk. 

Anywho, I hate the first option because I think I'd have to write a shit ass python backend, but it really isn't hard to do I guess I should just fucking do it huh? Return raw binary I guess instead of images.

The STAC + Worker feel like stretch goals now. Just like UI on the existing tiffs would be nice and something hostable on cloudflare. The only thing about the worker is that it might be a mandatory thing to making this cheap. IDK. I guess I could run the server here and then just proxy it thru my free gcloud tier and hope for the best. Or run it on the gcloud vm, nah too much memory.

Yeah so if I want to host this publicly and assuming it gets some traffic, the cheapest way would be backblaze + cloudflare w/ worker to index into the raw files. But I guess if I use a worker to index into a geotiff, what's the point of having the geotiff? I should just store all the tiles as headerless tiff files with some json to describe them and all that could just be in backblaze?

I think the tradeoff is like workers $ vs b2 $ in the end. There's no cost to the cache size so the idea was to use just a little bit of compute to amplify the geotiff into a bigger cache set, but probably over optimizing a bit here.

-------------------------------

Alright so I don't know if it was what I was supposed to do, but I got the new tiles and now parcel just serves them using the proxyrc file instead of running a python server, but there was a couple days there that I spent fucking around with docker and nginx to run a http server to do the same thing.

O well, the good news is that now I have the new data getting to the regl implementation and the shader seems to be doing something close to what it's supposed to be doing. The bad news is that I'm more or less back where I started struggling with how to come up with a standard interface to the data.

I kind of feel like I should just get the koppen thing working and work backwards from there. The annoying thing is that the koppen thing is so specific and hard that it's not really a great thing to work backwards from. It's far easier to build the version where you pick a band, then colorize it and maybe do basic math on it. That's way easier to do.

At any rate, I do need to come up with some sort of common API that I can rely on for the textures. The constraints on the webgl side (assuming webgl1) that I only really have these to play with:

- channels: [1 - 4]
- bytes: [1 or 4]

With the added flexibility of supporting multiple textures and multiple dimensions too. The frustrating thing is that neither channels or bytes is really that enjoyable to work with. Suppose I say you know like, select N bands to process and I'll put them into channels of the texels and then split them out into separate vars. There isn't an easy way (with webgl1) to load individual bands of texels with data. So then you're left with having to process textures in javascript prior to loading them on the GPU. That sucks.

Bytes also sucks. Using 4 bytes per channel per texel leads so some enormous data requirements that are difficult on web. So I always planned on being able to "transcode" a float texture to a byte texture, but byte textures have a drastically reduced range. Single degrees for temperature for example. That would work for the koppen project, but seeing the finer details in a particular region where one area might be half a degree cooler, becomes out of the question or at least more complicated.

So yeah I mean I guess reasonable improvement would be to force all source material to be float32, then I would at least have the option of natively being able to load everything as a float. If the data is too much, then I would have to find a way for the clamped byte texture to work. I think that's a reasonable tradeoff. Bytes to be performance but less percise. Floats if you want to be percise but potentially less performant.

As a stretch goal I could also support selecting individual bands within datasets through the same transcoding. I really wish JS offered a DataView that supported a different read of the data. Or if there was some image thing I could do to say give me only this band of this texture. I could render a texture to another texture to reorganize the texture data quickly i guess. I don't know. I guess I'm over optimizing because something about the data doesn't work in one part of the stack but then providing that breaks another part of the stack like only storing one version of the base data in b2 and using caching/workers/ranges to supplement.

Anyways this doesn't really change the work for today which is figure out how to, in the dev environment support float and bytes and compression.