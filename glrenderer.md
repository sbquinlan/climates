// Other implementations have another optimization that I'm not convinced is
    // as useful: They batch render multiple tiles. If I wanted to do that
    // then I'd need to micromanage resolving promises in here and support batch
    // rendering in the renderer, which is a bit more complicated.
    // It might be useful when an entire layer is invalidated by updating a uniform
    // and all tiles get rerendered at once.

    // I'm just not sure what the bottleneck of webgl is. If it's texture uploads,
    // then it doesn't really matter if I batch or not because I still spend the same
    // amount of time uploading and downloading all the data from the gpu. If the render
    // takes a bunch of time then the scaling makes sense, because massively parallel
    // compute obviously. Basically I'm not convinced that the expensive part of rendering
    // is the compute. I think it's probably moving memory around. If that's true then we pay
    // for it no matter what and batching rendering would make ttft (time to first tile)
    // longer by the batch factor.

    // So I'm skeptical that there's a benefit there, but maybe. It definitely is a
    // significant technical challenge though: The renderer would have to change to have
    // rendering slots that match the constraints reported by the webgl context. That includes
    // updating parts of textures and reading out parts of framebuffers.
    // The management of the promises in here wouldn't be trivial either because there isn't a
    // one to one mapping between renderTile and renderer.render in that world, it would
    // break up the cache of fetching promises and rendering promises, in between you would
    // fill the rendering promises with the finished fetching promises and then resolve all
    // the matching tile promises at the end. Complicated to fanout with promises.

    // Also just like how is it supposed to work exactly? If I fetch the textures for a tile
    // the callback will run immediately after it's done and idk what's the chance that I beat
    // another tiles fetch callback you know? Idk I'm really not convinced that this works very well
    // and is worth all the extra complication.