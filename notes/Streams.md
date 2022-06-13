# Streams

I want to write a pretty simple Cloudflare Worker. The idea is to take my raw data that is stored in floats and clamp it down to a int8 on demand. Why? Because in certain circumstances, the loss of percision isn't important, but the amount of data per tile is. This would allow me to read 24 bands per tile for example. It creates some other challenges like how to handle nodata/alpha but maybe we can ignore that for now.

## Start

At the start the problem seemed reasonably easy. I would just read a byte stream, taking 4 bytes as a float, turning that float into an int by clamping it. This is a sort of lossy compression so it seems reasonable to do it in a Cloudflare Worker.

### Workers

Cloudflare provides a Chrome-based environment to run logic at the edge based on certain requests. There are multiple APIs provided to you, notably the Cache API, to interact with the Cloudflare environment.

One of the solutions the documentation recommends is using the "Web Stream" API, which I had never heard of. Cloudflare provides some documentation on the subject that helped a little bit, but it really took writing a couple examples myself to get familiar with the abstractions.

### What are Streams

I've now realized that most of the documentation out there is nearly copy-pasta of the [Web Streams spec](https://streams.spec.whatwg.org/). This includes the [sparse documentation on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API) and  [the definitive guide](https://web.dev/streams/).

This documentation leads of with distinguishing two types of streams: readable and writable. These should be self explanatory. Readable supports reading (the data comes out). Writable supports writing (the data goes in). This is usually followed up with an explanation of the ReadableStream api, which has the most complexity by far.

The documentation distinguishes between a "push" readable stream and a "pull" readable stream, which I will provide examples of (mostly ripped from the spec itself) now for reference.

### Simple Push Stream

```js
function pushStream() {
  return new ReadableStream(
    {
      async pump(controller) {
        const chunk = await readFromSomeSource();
        controller.enqueue(chunk);
        return await this.pump(controller);
      },
      async start(controller) {
        return await this.pump(controller);
      }
    }
  );
}
```

### Simple Pull Stream

```js
function pullStream() {
  return new ReadableStream(
    {
      async pull(controller) {
        const chunk = await readFromSomeSource();
        controller.enqueue(chunk);
      }
    }
  );
}
```

The difference being that the push version will just recursively feed the stream data from the start and the pull stream waits for a pull request. The spec allows for a sort of combination by using the backpressure api, by which downstream ... streams can tell upstream streams "hey! stfu!".

### Simple adaptive stream with back pressure support

```js
function backPressureStream() {
  return new ReadableStream(
    {
      async pump(controller) {
        if (controller.desiredSize <= 0) {
          return;
        }

        const chunk = await readFromSomeSource();
        controller.enqueue(chunk);
        return await this.pump(controller);
      },

      async start(controller) {
        return await this.pump(controller);
      },

      async pull(controller) {
        return await this.pump(controller);
      }
    }
  );
}
```

In this case, the pump method stops recursing when the desiredSize is less than or equal to one. This is the back pressure mechanism. The stream would resume pumping when the pull method is called. This is a cool mechanism, but the start of my confusion with the streams api. The last example is a version of [10.3](https://streams.spec.whatwg.org/#example-rbs-push) from the spec, that simply adds "BYOB" (bring your own buffer) support to a readable **byte** stream, specified by the 'type'.

### BYOB Stream

```js
async function mockSlowIO(view) {
  await new Promise(res => setTimeout(res, 1000));
  return crypto.getRandomValues(view);
}

function byteStream(strategy) {
  return new ReadableStream({
    type: 'bytes',
    autoAllocateChunkSize: 1024,

    async pump(controller) {
      if (controller.desiredSize <= 0) {
        return;
      }

      // use the byobRequest if it's provided
      if (controller.byobRequest) {
        const chunk = await mockSlowIO(controller.byobRequest.view);
        controller.byobRequest.respond(chunk.byteLength);
      } else {
        const chunk = await mockSlowIO(new Int8Array(2**10));
        controller.enqueue(chunk);
      }
      return await this.pump(controller);
    },
    async start(controller) {
      return await this.pump(controller);
    },
    async pull(controller) {
      return await this.pump(controller);
    }
  }, strategy);
}
```

This isn't exactly the 10.3 example. Specifically that example in the spec doesn't support backpressure. Ignoring the backpressure support, I'm not sure that the 10.3 example works as intended. The example is intended to show a stream supporting BYOB requests if they are provided; otherwise, falling back to creating buffers and enqueueing them. This is where my confusion begins.

## Confusion

First of all, the example in 10.3 doesn't work. The idea is to support byobRequest if a buffer was provided to the reader; otherwise, create one. This doesn't work on Chrome. If the pump loop is started in the start() method, then the controller will never have byobRequest and the data will always be enqueued. Stupidly, the downstream reader using the byob method will get no data. This just seems plainly broken.

The spec goes on to provide another example that encourages the byob methods:

```js
function anotherByteStream() {
  return new ReadableStream({
    type: "bytes",
    autoAllocateChunkSize: 2**10,

    async pull(controller) {
      if (controller.desiredSize <= 0) {
        return;
      }

      // this should always be populated either by auto allocation
      // using a default reader or as the provided buffer with a byob reader
      const v = controller.byobRequest.view;
      const chunk = await mockSlowIO(v);
      controller.byobRequest.respond(chunk.byteLength);
    }
  });
}
```

This doesn't work as written. Either you need to provide a highWaterMark, in which case byobRequest isn't populated after the first pull call, or you need to remove the back pressure guard and not provide a highWaterMark. So maybe there's some interaction between using backpressure and autoallocate? I don't know, I must have missed it in the spec.

One last, "this doesn't work":

```js
if (/* source is finished */) {
  // this means zero bytes were written
  controller.close();
  controller.byobRequest.respond(0);
}
```

This, taken directly from example 10.5 in the spec, results in an error on Chrome. respond() doesn't seem to like getting a zero. That's pretty broken if I'm taking examples from the spec and they just don't work.

### Back Pressure

Back pressure just feels hard to use. There aren't great examples on it in the documentation and the spec doesn't particularly shed much light on how it's meant to be used.

The documentation says that "highWaterMark" will default to 1 if another strategy isn't used. I'm not sure if that's particularly to default readers (non-byte streams), but in my experience with byte streams the highWaterMark is 0 on Chrome. This makes sense, but again the magical different of 'type': 'bytes' is strange to me.

Why does this make sense? Well, "highWaterMark" really just means "internal queue size." For default streams, this means the number of chunks the stream can enqueue. For byte streams, this means the number of bytes the stream can enqueue. See the queuing strategy specs for more details here.

While this roughly makes sense, it's been kind of annoying in practice. Let's take stream A piped to B. A is a readable stream and B is a writeable stream.

```js
function consoleStream(strategy) {
  return new WritableStream({
    write(chunk, controller) {
      console.log(chunk);
    }
  });
}

// using code from a previous example
// A -> B
byteStream({ highWaterMark: 2**10 }).pipeTo(consoleStream());
```

In this example, the highWaterMark is specified on stream A, which means that stream A is saying "I should only be allowed to queue up 1024 bytes at a time." It feels strange to me that a readable stream would describe the throttling of it's downstream reads. A writeable stream describing how much should be queued up for it makes more sense. So let's try that:

```js
byteStream().pipeTo(consoleStream({ highWaterMark: 2**10 }));
```

Now this should be stream B ("consoleStream") describing how much data it can take in one call of write() at a time; and therefore, how much that should be buffered for it. But on Chrome with byte streams at least, this isn't what happens. If a highWaterMark isn't specified on the readable stream then it defaults to 0, effectively stopping a stream with back pressure enabled and requiring the implementor to describe the downstream buffer support of the byte stream. This strikes me as particularly strange and for that reason I don't think the backpressure mechanism is useful.

### Interface

I also don't like the interface. That's literally the feedback. I think it's just that there's flags that bother me. The byte stream stuff seems like it's just tacked on in a half assed way: "Specify this flag and stuff works differently".

A more minor annoyance is that ReadableStreams are so strong in comparison to the other abstractions TransformStreams and WritableStreams. If you pull another streams Reader into a ReadableStream, you've effectively written a TransformStream, skipping the write side. ReadableStreams are also the only stream to support bytes, which just feels disconnected.

### Browser support

Chrome seems to have the most complete implementation. Firefox and Safari have this half-implemented, to the point that I kind of wonder why it's there at all. Notably, Firefox doesn't support byte streams. Node does actually support web streams in experimental packages alongside the pre-existing event-based streams.

It's not particularly new-ish either. Chrome 43 supports ReadableStream. Firefox 65 supports ReadableStream (though not byte). I'm sure there's some story here that I've missed entirely.

## Wrapping it up.

Yeah, not a fan. It seemed promising at the start, but it just seems broken, not well supported and a funky design in practice.