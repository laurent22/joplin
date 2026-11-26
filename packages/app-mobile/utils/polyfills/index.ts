import './bufferPolyfill';
import { ReadableStream as PolyfillReadableStream } from 'web-streams-polyfill/ponyfill';

// Expo's fetch response body uses ReadableStream, which Hermes does not provide.
if (typeof globalThis.ReadableStream === 'undefined') {
	globalThis.ReadableStream = PolyfillReadableStream as unknown as typeof ReadableStream;
}

// For aws-sdk-js-v3
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
