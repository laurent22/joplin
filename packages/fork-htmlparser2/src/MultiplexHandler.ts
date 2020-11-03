import { Handler } from "./Parser";

/**
 * Calls a specific handler function for all events that are encountered.
 *
 * @param func — The function to multiplex all events to.
 */
export default class MultiplexHandler implements Handler {
    _func: (event: keyof Handler, ...args: unknown[]) => void;

    constructor(func: (event: keyof Handler, ...args: unknown[]) => void) {
        this._func = func;
    }

    /* Format: eventname: number of arguments */
    onattribute(name: string, value: string) {
        this._func("onattribute", name, value);
    }
    oncdatastart() {
        this._func("oncdatastart");
    }
    oncdataend() {
        this._func("oncdataend");
    }
    ontext(text: string) {
        this._func("ontext", text);
    }
    onprocessinginstruction(name: string, value: string) {
        this._func("onprocessinginstruction", name, value);
    }
    oncomment(comment: string) {
        this._func("oncomment", comment);
    }
    oncommentend() {
        this._func("oncommentend");
    }
    onclosetag(name: string) {
        this._func("onclosetag", name);
    }
    onopentag(name: string, attribs: { [key: string]: string }) {
        this._func("onopentag", name, attribs);
    }
    onopentagname(name: string) {
        this._func("onopentagname", name);
    }
    onerror(error: Error) {
        this._func("onerror", error);
    }
    onend() {
        this._func("onend");
    }
    onparserinit(parser: {}) {
        this._func("onparserinit", parser);
    }
    onreset() {
        this._func("onreset");
    }
}
