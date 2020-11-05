import { Parser, Handler, ParserOptions } from "./Parser";
import { Writable } from "stream";
import { StringDecoder } from "string_decoder";

// Following the example in https://nodejs.org/api/stream.html#stream_decoding_buffers_in_a_writable_stream
function isBuffer(_chunk: string | Buffer, encoding: string): _chunk is Buffer {
    return encoding === "buffer";
}

/**
 * WritableStream makes the `Parser` interface available as a NodeJS stream.
 *
 * @see Parser
 */
export class WritableStream extends Writable {
    _parser: Parser;
    _decoder = new StringDecoder();

    constructor(cbs: Partial<Handler>, options?: ParserOptions) {
        super({ decodeStrings: false });
        this._parser = new Parser(cbs, options);
    }

    _write(chunk: string | Buffer, encoding: string, cb: () => void) {
        if (isBuffer(chunk, encoding)) chunk = this._decoder.write(chunk);
        this._parser.write(chunk);
        cb();
    }

    _final(cb: () => void) {
        this._parser.end(this._decoder.end());
        cb();
    }
}
