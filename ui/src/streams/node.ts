import { ReadableStream } from 'node:stream/web';
import factory from './factory';

  // function pullStream(mockSlowIO) {
  //   return new ReadableStream({
  //     type: 'bytes',
  //     autoAllocateChunkSize: 2**10,

  //     async pull(controller) {
  //       const chunk = await mockSlowIO(controller.byobRequest.view);
  //       controller.byobRequest.respond(
  //         chunk.byteLength - Math.floor(Math.random() * 256)
  //       );
  //     }
  //   });
  // }


const ftbStream = factory(ReadableStream);
