import Tokenizer from "./Tokenizer";
import { EventEmitter } from "events";

const formTags = new Set([
    "input",
    "option",
    "optgroup",
    "select",
    "button",
    "datalist",
    "textarea"
]);

const pTag = new Set(["p"]);

const openImpliesClose = {
    tr: new Set(["tr", "th", "td"]),
    th: new Set(["th"]),
    td: new Set(["thead", "th", "td"]),
    body: new Set(["head", "link", "script"]),
    li: new Set(["li"]),
    p: pTag,
    h1: pTag,
    h2: pTag,
    h3: pTag,
    h4: pTag,
    h5: pTag,
    h6: pTag,
    select: formTags,
    input: formTags,
    output: formTags,
    button: formTags,
    datalist: formTags,
    textarea: formTags,
    option: new Set(["option"]),
    optgroup: new Set(["optgroup", "option"]),
    dd: new Set(["dt", "dd"]),
    dt: new Set(["dt", "dd"]),
    address: pTag,
    article: pTag,
    aside: pTag,
    blockquote: pTag,
    details: pTag,
    div: pTag,
    dl: pTag,
    fieldset: pTag,
    figcaption: pTag,
    figure: pTag,
    footer: pTag,
    form: pTag,
    header: pTag,
    hr: pTag,
    main: pTag,
    nav: pTag,
    ol: pTag,
    pre: pTag,
    section: pTag,
    table: pTag,
    ul: pTag,
    rt: new Set(["rt", "rp"]),
    rp: new Set(["rt", "rp"]),
    tbody: new Set(["thead", "tbody"]),
    tfoot: new Set(["thead", "tbody"])
};

const voidElements = new Set([
    "area",
    "base",
    "basefont",
    "br",
    "col",
    "command",
    "embed",
    "frame",
    "hr",
    "img",
    "input",
    "isindex",
    "keygen",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr"
]);

const foreignContextElements = new Set(["math", "svg"]);

const htmlIntegrationElements = new Set([
    "mi",
    "mo",
    "mn",
    "ms",
    "mtext",
    "annotation-xml",
    "foreignObject",
    "desc",
    "title"
]);

export interface ParserOptions {
    /***
     * Indicates whether special tags (<script> and <style>) should get special treatment
     * and if "empty" tags (eg. <br>) can have children.  If `false`, the content of special tags
     * will be text only. For feeds and other XML content (documents that don't consist of HTML),
     * set this to `true`. Default: `false`.
     */
    xmlMode?: boolean;

    /***
     * If set to true, entities within the document will be decoded. Defaults to `false`.
     */
    decodeEntities?: boolean;

    /***
     * If set to true, all tags will be lowercased. If xmlMode is disabled, this defaults to `true`.
     */
    lowerCaseTags?: boolean;

    /***
     * If set to `true`, all attribute names will be lowercased. This has noticeable impact on speed, so it defaults to `false`.
     */
    lowerCaseAttributeNames?: boolean;

    /***
     * If set to true, CDATA sections will be recognized as text even if the xmlMode option is not enabled.
     * NOTE: If xmlMode is set to `true` then CDATA sections will always be recognized as text.
     */
    recognizeCDATA?: boolean;

    /***
     * If set to `true`, self-closing tags will trigger the onclosetag event even if xmlMode is not set to `true`.
     * NOTE: If xmlMode is set to `true` then self-closing tags will always be recognized.
     */
    recognizeSelfClosing?: boolean;

    /**
     * Allows the default tokenizer to be overwritten.
     */
    Tokenizer?: typeof Tokenizer;
}

export interface Handler {
    onparserinit(parser: Parser): void;

    /***
     * Resets the handler back to starting state
     */
    onreset(): void;

    /***
     * Signals the handler that parsing is done
     */
    onend(): void;
    onerror(error: Error): void;
    onclosetag(name: string): void;
    onopentagname(name: string): void;
    onattribute(name: string, value: string): void;
    onopentag(name: string, attribs: { [s: string]: string }): void;
    ontext(data: string): void;
    oncomment(data: string): void;
    oncdatastart(): void;
    oncdataend(): void;
    oncommentend(): void;
    onprocessinginstruction(name: string, data: string): void;
}

const reNameEnd = /\s|\//;

export class Parser extends EventEmitter {
    _tagname = "";
    _attribname = "";
    _attribvalue = "";
    _attribs: null | { [key: string]: string } = null;
    _stack: string[] = [];
    _foreignContext: boolean[] = [];
    startIndex = 0;
    endIndex: number | null = null;
    _cbs: Partial<Handler>;
    _options: ParserOptions;
    _lowerCaseTagNames: boolean;
    _lowerCaseAttributeNames: boolean;
    _tokenizer: Tokenizer;

    constructor(cbs: Partial<Handler> | null, options?: ParserOptions) {
        super();

        this._options = options || {};
        this._cbs = cbs || {};
        this._tagname = "";
        this._attribname = "";
        this._attribvalue = "";
        this._attribs = null;
        this._stack = [];
        this._foreignContext = [];
        this.startIndex = 0;
        this.endIndex = null;
        this._lowerCaseTagNames =
            "lowerCaseTags" in this._options
                ? !!this._options.lowerCaseTags
                : !this._options.xmlMode;
        this._lowerCaseAttributeNames =
            "lowerCaseAttributeNames" in this._options
                ? !!this._options.lowerCaseAttributeNames
                : !this._options.xmlMode;
        this._tokenizer = new (this._options.Tokenizer || Tokenizer)(
            this._options,
            this
        );
        if (this._cbs.onparserinit) this._cbs.onparserinit(this);
    }

    _updatePosition(initialOffset: number) {
        if (this.endIndex === null) {
            if (this._tokenizer._sectionStart <= initialOffset) {
                this.startIndex = 0;
            } else {
                this.startIndex = this._tokenizer._sectionStart - initialOffset;
            }
        } else this.startIndex = this.endIndex + 1;
        this.endIndex = this._tokenizer.getAbsoluteIndex();
    }

    //Tokenizer event handlers
    ontext(data: string) {
        this._updatePosition(1);
        this.endIndex = this.endIndex === null ? 0 : this.endIndex + 1;
        if (this._cbs.ontext) this._cbs.ontext(data);
    }

    onopentagname(name: string) {
        if (this._lowerCaseTagNames) {
            name = name.toLowerCase();
        }
        this._tagname = name;
        if (
            !this._options.xmlMode &&
            Object.prototype.hasOwnProperty.call(openImpliesClose, name)
        ) {
            for (
                let el;
                (openImpliesClose as any)[name].has(
                    (el = this._stack[this._stack.length - 1])
                );
                this.onclosetag(el)
            );
        }
        if (this._options.xmlMode || !voidElements.has(name)) {
            this._stack.push(name);
            if (foreignContextElements.has(name)) {
                this._foreignContext.push(true);
            } else if (htmlIntegrationElements.has(name)) {
                this._foreignContext.push(false);
            }
        }
        if (this._cbs.onopentagname) this._cbs.onopentagname(name);
        if (this._cbs.onopentag) this._attribs = {};
    }

    onopentagend() {
        this._updatePosition(1);
        if (this._attribs) {
            if (this._cbs.onopentag) {
                this._cbs.onopentag(this._tagname, this._attribs);
            }
            this._attribs = null;
        }
        if (
            !this._options.xmlMode &&
            this._cbs.onclosetag &&
            voidElements.has(this._tagname)
        ) {
            this._cbs.onclosetag(this._tagname);
        }
        this._tagname = "";
    }

    onclosetag(name: string) {
        // When this is true, the onclosetag event will always be emitted
        // for closing tags (eg </div>) even if that tag was not previously
        // open. This is needed because we reconstruct the HTML based on
        // fragments that don't necessarily contain the opening tag.
        // Without this patch, onopentagname would not be emitted, and
        // so the closing tag would disappear from the output.
        let alwaysClose = true;

        this._updatePosition(1);
        if (this._lowerCaseTagNames) {
            name = name.toLowerCase();
        }
        if (
            foreignContextElements.has(name) ||
            htmlIntegrationElements.has(name)
        ) {
            this._foreignContext.pop();
        }
        if (
            this._stack.length &&
            (this._options.xmlMode || !voidElements.has(name))
        ) {
            let pos = this._stack.lastIndexOf(name);
            if (pos !== -1) {
                if (this._cbs.onclosetag) {
                    pos = this._stack.length - pos;
                    while (pos--) this._cbs.onclosetag((this._stack as any).pop());
                } else this._stack.length = pos;
            } else if (name === "p" && !this._options.xmlMode) {
                this.onopentagname(name);
                this._closeCurrentTag();
            } else if (!this._stack.length && alwaysClose) {
                if (this._cbs.onclosetag) this._cbs.onclosetag(name);
            }
        } else if (!this._options.xmlMode && (name === "br" || name === "p")) {
            this.onopentagname(name);
            this._closeCurrentTag();
        } else if (!this._stack.length && alwaysClose && this._cbs.onclosetag) {
            this._cbs.onclosetag(name);
        }
    }

    onselfclosingtag() {
        if (
            this._options.xmlMode ||
            this._options.recognizeSelfClosing ||
            this._foreignContext[this._foreignContext.length - 1]
        ) {
            this._closeCurrentTag();
        } else {
            this.onopentagend();
        }
    }

    _closeCurrentTag() {
        const name = this._tagname;
        this.onopentagend();
        //self-closing tags will be on the top of the stack
        //(cheaper check than in onclosetag)
        if (this._stack[this._stack.length - 1] === name) {
            if (this._cbs.onclosetag) {
                this._cbs.onclosetag(name);
            }
            this._stack.pop();
        }
    }

    onattribname(name: string) {
        if (this._lowerCaseAttributeNames) {
            name = name.toLowerCase();
        }
        this._attribname = name;
    }

    onattribdata(value: string) {
        this._attribvalue += value;
    }

    onattribend() {
        if (this._cbs.onattribute)
            this._cbs.onattribute(this._attribname, this._attribvalue);
        if (
            this._attribs &&
            !Object.prototype.hasOwnProperty.call(
                this._attribs,
                this._attribname
            )
        ) {
            this._attribs[this._attribname] = this._attribvalue;
        }
        this._attribname = "";
        this._attribvalue = "";
    }

    _getInstructionName(value: string) {
        const idx = value.search(reNameEnd);
        let name = idx < 0 ? value : value.substr(0, idx);

        if (this._lowerCaseTagNames) {
            name = name.toLowerCase();
        }

        return name;
    }

    ondeclaration(value: string) {
        if (this._cbs.onprocessinginstruction) {
            const name = this._getInstructionName(value);
            this._cbs.onprocessinginstruction(`!${name}`, `!${value}`);
        }
    }

    onprocessinginstruction(value: string) {
        if (this._cbs.onprocessinginstruction) {
            const name = this._getInstructionName(value);
            this._cbs.onprocessinginstruction(`?${name}`, `?${value}`);
        }
    }

    oncomment(value: string) {
        this._updatePosition(4);
        if (this._cbs.oncomment) this._cbs.oncomment(value);
        if (this._cbs.oncommentend) this._cbs.oncommentend();
    }

    oncdata(value: string) {
        this._updatePosition(1);
        if (this._options.xmlMode || this._options.recognizeCDATA) {
            if (this._cbs.oncdatastart) this._cbs.oncdatastart();
            if (this._cbs.ontext) this._cbs.ontext(value);
            if (this._cbs.oncdataend) this._cbs.oncdataend();
        } else {
            this.oncomment(`[CDATA[${value}]]`);
        }
    }

    onerror(err: Error) {
        if (this._cbs.onerror) this._cbs.onerror(err);
    }

    onend() {
        if (this._cbs.onclosetag) {
            // Prevent the parser from auto-closing tags. Since we deal with fragments that
            // maybe contain the opening tag but not the closing one, we don't want that
            // closing tag to be auto-added.
            // for (
            //     let i = this._stack.length;
            //     i > 0;
            //     this._cbs.onclosetag(this._stack[--i])
            // );
        }
        if (this._cbs.onend) this._cbs.onend();
    }

    //Resets the parser to a blank state, ready to parse a new HTML document
    reset() {
        if (this._cbs.onreset) this._cbs.onreset();
        this._tokenizer.reset();
        this._tagname = "";
        this._attribname = "";
        this._attribs = null;
        this._stack = [];
        if (this._cbs.onparserinit) this._cbs.onparserinit(this);
    }

    //Parses a complete HTML document and pushes it to the handler
    parseComplete(data: string) {
        this.reset();
        this.end(data);
    }

    write(chunk: string) {
        this._tokenizer.write(chunk);
    }

    end(chunk?: string) {
        this._tokenizer.end(chunk);
    }

    pause() {
        this._tokenizer.pause();
    }

    resume() {
        this._tokenizer.resume();
    }

    // Aliases for backwards compatibility
    parseChunk = Parser.prototype.write;
    done = Parser.prototype.end;
}
