import { ReadableStream } from 'node:stream/web';
import factory from './factory';

const {
  ftbStream,
} = factory(
  ReadableStream,
);
