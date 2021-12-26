Alright, I've got like a POC working now. I'm using python to create the data and then leaflet is loading it correctly. I'm able to tile the data and combine the bands into something that I can correctly index.

Whats next?
Well its a POC in more than one way. There's lots of things that need to be better before it's usable.

On the data build, it isn't automated. Everything is manual, you have to (1) run both scripts depending on what you want to generate, (2) manually copy things to their proper folders, and (3) manually describe the data in JS. As an extra complication, (4) it runs really slowly on what are actually pretty small files and so I'm not quite sure it'll even work for the smallest resolution.

On the UI side, there's even more work because things are just plainly not finished. (1) Zooming past 3 removes the tiled data view. (2) The base layer doesn't seem to blend. (3) There are no controls for changing what you're seeing at all. (4) There is no display of the point query data. (5) No normalization of data from it's storage format (like the transforms)

On the stack side, I'm not confident that either (1) Leaflet or (2) nextjs are the right choice. 

Leaflet is small and digestable but everything seems to be an add on including some pretty major functionality like the webgl thing and the experience isn't that great really, the map seems to load kind of slowly and the zoom is kind of lurchy. I guess these are fixable with plugins and debugging the code a bit to make some changes. On the flip side, Openlayers looks feature rich, which webgl working in what seems to be clean code. The docs seem slightly worse and the package significantly less popular. I'm not convinced that Leaflet is the _wrong_ move here but it does at least seem like OpenLayer would accelerate something things. 

Nextjs works with Typescript out of the box and that is particulary convienent. Nextjs is very heavy for what I'm building though. It's actually kind of annoying to be locked into react funny enough. Parcel seems to be much more of what I'm looking for if I could just get the tsconfig to work with VS code.

And there's missing features like leveraging some sort of control over the visualization, either (1) to color it or (2) to do expressions with it. Like the whole Service Worker or WebGL Layer isn't done at all.

I'm not sure what to work on really. I kind of feel like spending a couple days building the OpenLayers + parcel version going to just accelerate? maybe? building out the shaders stuff. style + expression is pretty much what I wanted and I think the base open layers supports that outright.

The alternative is that I continue cranking on the data build and get that outputting a config, dumping the data in the right folder and integrate it into the same folder directory etc etc. I feel like I don't quite know enough about the rest of the project tho to know specifically what the config will be. I'm also nervous that I'll lose alot of time trying to improve build performance once we get to the higher res versions. I also have no idea how to push files to a CDN and what the free limits are there. 

The right thing seems to be spend more time on the top. I'll do OpenLayers + parcel I think, even if it means not using TypeScript.