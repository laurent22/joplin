import { Parser, ParserOptions } from "./Parser";
export { Parser, ParserOptions };

import { DomHandler, DomHandlerOptions, Node, Element } from "domhandler";

export { DomHandler, DomHandlerOptions };

type Options = ParserOptions & DomHandlerOptions;

// Helper methods

/**
 * Parses data, returns the resulting DOM.
 *
 * @param data The data that should be parsed.
 * @param options Optional options for the parser and DOM builder.
 */
export function parseDOM(data: string, options?: Options): Node[] {
    const handler = new DomHandler(void 0, options);
    new Parser(handler, options).end(data);
    return handler.dom;
}
/**
 * Creates a parser instance, with an attached DOM handler.
 *
 * @param cb A callback that will be called once parsing has been completed.
 * @param options Optional options for the parser and DOM builder.
 * @param elementCb An optional callback that will be called every time a tag has been completed inside of the DOM.
 */
export function createDomStream(
    cb: (error: Error | null, dom: Node[]) => void,
    options?: Options,
    elementCb?: (element: Element) => void
) {
    const handler = new DomHandler(cb, options, elementCb);
    return new Parser(handler, options);
}

export { default as Tokenizer } from "./Tokenizer";
import * as ElementType from "domelementtype";
export { ElementType };

// cSpell:disable

/**
 * List of all events that the parser emits.
 *
 * Format: eventname: number of arguments.
 */
export const EVENTS = {
    attribute: 2,
    cdatastart: 0,
    cdataend: 0,
    text: 1,
    processinginstruction: 2,
    comment: 1,
    commentend: 0,
    closetag: 1,
    opentag: 2,
    opentagname: 1,
    error: 1,
    end: 0
};

// cSpell:enable

/*
    All of the following exports exist for backwards-compatibility.
    They should probably be removed eventually.
*/

export * from "./FeedHandler";
export * from "./WritableStream";
export * from "./CollectingHandler";

import * as DomUtils from "domutils";
export { DomUtils };

// Old names for Dom- & FeedHandler
export { DomHandler as DefaultHandler };
export { FeedHandler as RssHandler } from "./FeedHandler";
