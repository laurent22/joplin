import decodeCodePoint from "entities/lib/decode_codepoint";
import entityMap from "entities/lib/maps/entities.json";
import legacyMap from "entities/lib/maps/legacy.json";
import xmlMap from "entities/lib/maps/xml.json";

/** All the states the tokenizer can be in. */
const enum State {
    Text = 1,
    BeforeTagName, //after <
    InTagName,
    InSelfClosingTag,
    BeforeClosingTagName,
    InClosingTagName,
    AfterClosingTagName,

    //attributes
    BeforeAttributeName,
    InAttributeName,
    AfterAttributeName,
    BeforeAttributeValue,
    InAttributeValueDq, // "
    InAttributeValueSq, // '
    InAttributeValueNq,

    //declarations
    BeforeDeclaration, // !
    InDeclaration,

    //processing instructions
    InProcessingInstruction, // ?

    //comments
    BeforeComment,
    InComment,
    AfterComment1,
    AfterComment2,

    //cdata
    BeforeCdata1, // [
    BeforeCdata2, // C
    BeforeCdata3, // D
    BeforeCdata4, // A
    BeforeCdata5, // T
    BeforeCdata6, // A
    InCdata, // [
    AfterCdata1, // ]
    AfterCdata2, // ]

    //special tags
    BeforeSpecial, //S
    BeforeSpecialEnd, //S

    BeforeScript1, //C
    BeforeScript2, //R
    BeforeScript3, //I
    BeforeScript4, //P
    BeforeScript5, //T
    AfterScript1, //C
    AfterScript2, //R
    AfterScript3, //I
    AfterScript4, //P
    AfterScript5, //T

    BeforeStyle1, //T
    BeforeStyle2, //Y
    BeforeStyle3, //L
    BeforeStyle4, //E
    AfterStyle1, //T
    AfterStyle2, //Y
    AfterStyle3, //L
    AfterStyle4, //E

    BeforeEntity, //&
    BeforeNumericEntity, //#
    InNamedEntity,
    InNumericEntity,
    InHexEntity //X
}

const enum Special {
    None = 1,
    Script,
    Style
}

function whitespace(c: string): boolean {
    return c === " " || c === "\n" || c === "\t" || c === "\f" || c === "\r";
}

interface Callbacks {
    onattribdata(value: string): void; //TODO implement the new event
    onattribend(): void;
    onattribname(name: string): void;
    oncdata(data: string): void;
    onclosetag(name: string): void;
    oncomment(data: string): void;
    ondeclaration(content: string): void;
    onend(): void;
    onerror(error: Error, state?: State): void;
    onopentagend(): void;
    onopentagname(name: string): void;
    onprocessinginstruction(instruction: string): void;
    onselfclosingtag(): void;
    ontext(value: string): void;
}

function ifElseState(upper: string, SUCCESS: State, FAILURE: State) {
    const lower = upper.toLowerCase();

    if (upper === lower) {
        return (t: Tokenizer, c: string) => {
            if (c === lower) {
                t._state = SUCCESS;
            } else {
                t._state = FAILURE;
                t._index--;
            }
        };
    } else {
        return (t: Tokenizer, c: string) => {
            if (c === lower || c === upper) {
                t._state = SUCCESS;
            } else {
                t._state = FAILURE;
                t._index--;
            }
        };
    }
}

function consumeSpecialNameChar(upper: string, NEXT_STATE: State) {
    const lower = upper.toLowerCase();

    return (t: Tokenizer, c: string) => {
        if (c === lower || c === upper) {
            t._state = NEXT_STATE;
        } else {
            t._state = State.InTagName;
            t._index--; //consume the token again
        }
    };
}

const stateBeforeCdata1 = ifElseState(
    "C",
    State.BeforeCdata2,
    State.InDeclaration
);
const stateBeforeCdata2 = ifElseState(
    "D",
    State.BeforeCdata3,
    State.InDeclaration
);
const stateBeforeCdata3 = ifElseState(
    "A",
    State.BeforeCdata4,
    State.InDeclaration
);
const stateBeforeCdata4 = ifElseState(
    "T",
    State.BeforeCdata5,
    State.InDeclaration
);
const stateBeforeCdata5 = ifElseState(
    "A",
    State.BeforeCdata6,
    State.InDeclaration
);

const stateBeforeScript1 = consumeSpecialNameChar("R", State.BeforeScript2);
const stateBeforeScript2 = consumeSpecialNameChar("I", State.BeforeScript3);
const stateBeforeScript3 = consumeSpecialNameChar("P", State.BeforeScript4);
const stateBeforeScript4 = consumeSpecialNameChar("T", State.BeforeScript5);

const stateAfterScript1 = ifElseState("R", State.AfterScript2, State.Text);
const stateAfterScript2 = ifElseState("I", State.AfterScript3, State.Text);
const stateAfterScript3 = ifElseState("P", State.AfterScript4, State.Text);
const stateAfterScript4 = ifElseState("T", State.AfterScript5, State.Text);

const stateBeforeStyle1 = consumeSpecialNameChar("Y", State.BeforeStyle2);
const stateBeforeStyle2 = consumeSpecialNameChar("L", State.BeforeStyle3);
const stateBeforeStyle3 = consumeSpecialNameChar("E", State.BeforeStyle4);

const stateAfterStyle1 = ifElseState("Y", State.AfterStyle2, State.Text);
const stateAfterStyle2 = ifElseState("L", State.AfterStyle3, State.Text);
const stateAfterStyle3 = ifElseState("E", State.AfterStyle4, State.Text);

const stateBeforeEntity = ifElseState(
    "#",
    State.BeforeNumericEntity,
    State.InNamedEntity
);
const stateBeforeNumericEntity = ifElseState(
    "X",
    State.InHexEntity,
    State.InNumericEntity
);

export default class Tokenizer {
    /** The current state the tokenizer is in. */
    _state = State.Text;
    /** The read buffer. */
    _buffer = "";
    /** The beginning of the section that is currently being read. */
    _sectionStart = 0;
    /** The index within the buffer that we are currently looking at. */
    _index = 0;
    /**
     * Data that has already been processed will be removed from the buffer occasionally.
     * `_bufferOffset` keeps track of how many characters have been removed, to make sure position information is accurate.
     */
    _bufferOffset = 0;
    /** Some behavior, eg. when decoding entities, is done while we are in another state. This keeps track of the other state type. */
    _baseState = State.Text;
    /** For special parsing behavior inside of script and style tags. */
    _special = Special.None;
    /** Indicates whether the tokenizer has been paused. */
    _running = true;
    /** Indicates whether the tokenizer has finished running / `.end` has been called. */
    _ended = false;

    _cbs: Callbacks;
    _xmlMode: boolean;
    _decodeEntities: boolean;

    constructor(
        options: { xmlMode?: boolean; decodeEntities?: boolean } | null,
        cbs: Callbacks
    ) {
        this._cbs = cbs;
        this._xmlMode = !!(options && options.xmlMode);
        this._decodeEntities = !!(options && options.decodeEntities);
    }

    reset() {
        this._state = State.Text;
        this._buffer = "";
        this._sectionStart = 0;
        this._index = 0;
        this._bufferOffset = 0;
        this._baseState = State.Text;
        this._special = Special.None;
        this._running = true;
        this._ended = false;
    }

    _stateText(c: string) {
        if (c === "<") {
            if (this._index > this._sectionStart) {
                this._cbs.ontext(this._getSection());
            }
            this._state = State.BeforeTagName;
            this._sectionStart = this._index;
        } else if (
            this._decodeEntities &&
            this._special === Special.None &&
            c === "&"
        ) {
            if (this._index > this._sectionStart) {
                this._cbs.ontext(this._getSection());
            }
            this._baseState = State.Text;
            this._state = State.BeforeEntity;
            this._sectionStart = this._index;
        }
    }
    _stateBeforeTagName(c: string) {
        if (c === "/") {
            this._state = State.BeforeClosingTagName;
        } else if (c === "<") {
            this._cbs.ontext(this._getSection());
            this._sectionStart = this._index;
        } else if (
            c === ">" ||
            this._special !== Special.None ||
            whitespace(c)
        ) {
            this._state = State.Text;
        } else if (c === "!") {
            this._state = State.BeforeDeclaration;
            this._sectionStart = this._index + 1;
        } else if (c === "?") {
            this._state = State.InProcessingInstruction;
            this._sectionStart = this._index + 1;
        } else {
            this._state =
                !this._xmlMode && (c === "s" || c === "S")
                    ? State.BeforeSpecial
                    : State.InTagName;
            this._sectionStart = this._index;
        }
    }
    _stateInTagName(c: string) {
        if (c === "/" || c === ">" || whitespace(c)) {
            this._emitToken("onopentagname");
            this._state = State.BeforeAttributeName;
            this._index--;
        }
    }
    _stateBeforeClosingTagName(c: string) {
        if (whitespace(c)) {
            // ignore
        } else if (c === ">") {
            this._state = State.Text;
        } else if (this._special !== Special.None) {
            if (c === "s" || c === "S") {
                this._state = State.BeforeSpecialEnd;
            } else {
                this._state = State.Text;
                this._index--;
            }
        } else {
            this._state = State.InClosingTagName;
            this._sectionStart = this._index;
        }
    }
    _stateInClosingTagName(c: string) {
        if (c === ">" || whitespace(c)) {
            this._emitToken("onclosetag");
            this._state = State.AfterClosingTagName;
            this._index--;
        }
    }
    _stateAfterClosingTagName(c: string) {
        //skip everything until ">"
        if (c === ">") {
            this._state = State.Text;
            this._sectionStart = this._index + 1;
        }
    }
    _stateBeforeAttributeName(c: string) {
        if (c === ">") {
            this._cbs.onopentagend();
            this._state = State.Text;
            this._sectionStart = this._index + 1;
        } else if (c === "/") {
            this._state = State.InSelfClosingTag;
        } else if (!whitespace(c)) {
            this._state = State.InAttributeName;
            this._sectionStart = this._index;
        }
    }
    _stateInSelfClosingTag(c: string) {
        if (c === ">") {
            this._cbs.onselfclosingtag();
            this._state = State.Text;
            this._sectionStart = this._index + 1;
        } else if (!whitespace(c)) {
            this._state = State.BeforeAttributeName;
            this._index--;
        }
    }
    _stateInAttributeName(c: string) {
        if (c === "=" || c === "/" || c === ">" || whitespace(c)) {
            this._cbs.onattribname(this._getSection());
            this._sectionStart = -1;
            this._state = State.AfterAttributeName;
            this._index--;
        }
    }
    _stateAfterAttributeName(c: string) {
        if (c === "=") {
            this._state = State.BeforeAttributeValue;
        } else if (c === "/" || c === ">") {
            this._cbs.onattribend();
            this._state = State.BeforeAttributeName;
            this._index--;
        } else if (!whitespace(c)) {
            this._cbs.onattribend();
            this._state = State.InAttributeName;
            this._sectionStart = this._index;
        }
    }
    _stateBeforeAttributeValue(c: string) {
        if (c === '"') {
            this._state = State.InAttributeValueDq;
            this._sectionStart = this._index + 1;
        } else if (c === "'") {
            this._state = State.InAttributeValueSq;
            this._sectionStart = this._index + 1;
        } else if (!whitespace(c)) {
            this._state = State.InAttributeValueNq;
            this._sectionStart = this._index;
            this._index--; //reconsume token
        }
    }
    _stateInAttributeValueDoubleQuotes(c: string) {
        if (c === '"') {
            this._emitToken("onattribdata");
            this._cbs.onattribend();
            this._state = State.BeforeAttributeName;
        } else if (this._decodeEntities && c === "&") {
            this._emitToken("onattribdata");
            this._baseState = this._state;
            this._state = State.BeforeEntity;
            this._sectionStart = this._index;
        }
    }
    _stateInAttributeValueSingleQuotes(c: string) {
        if (c === "'") {
            this._emitToken("onattribdata");
            this._cbs.onattribend();
            this._state = State.BeforeAttributeName;
        } else if (this._decodeEntities && c === "&") {
            this._emitToken("onattribdata");
            this._baseState = this._state;
            this._state = State.BeforeEntity;
            this._sectionStart = this._index;
        }
    }
    _stateInAttributeValueNoQuotes(c: string) {
        if (whitespace(c) || c === ">") {
            this._emitToken("onattribdata");
            this._cbs.onattribend();
            this._state = State.BeforeAttributeName;
            this._index--;
        } else if (this._decodeEntities && c === "&") {
            this._emitToken("onattribdata");
            this._baseState = this._state;
            this._state = State.BeforeEntity;
            this._sectionStart = this._index;
        }
    }
    _stateBeforeDeclaration(c: string) {
        this._state =
            c === "["
                ? State.BeforeCdata1
                : c === "-"
                ? State.BeforeComment
                : State.InDeclaration;
    }
    _stateInDeclaration(c: string) {
        if (c === ">") {
            this._cbs.ondeclaration(this._getSection());
            this._state = State.Text;
            this._sectionStart = this._index + 1;
        }
    }
    _stateInProcessingInstruction(c: string) {
        if (c === ">") {
            this._cbs.onprocessinginstruction(this._getSection());
            this._state = State.Text;
            this._sectionStart = this._index + 1;
        }
    }
    _stateBeforeComment(c: string) {
        if (c === "-") {
            this._state = State.InComment;
            this._sectionStart = this._index + 1;
        } else {
            this._state = State.InDeclaration;
        }
    }
    _stateInComment(c: string) {
        if (c === "-") this._state = State.AfterComment1;
    }
    _stateAfterComment1(c: string) {
        if (c === "-") {
            this._state = State.AfterComment2;
        } else {
            this._state = State.InComment;
        }
    }
    _stateAfterComment2(c: string) {
        if (c === ">") {
            //remove 2 trailing chars
            this._cbs.oncomment(
                this._buffer.substring(this._sectionStart, this._index - 2)
            );
            this._state = State.Text;
            this._sectionStart = this._index + 1;
        } else if (c !== "-") {
            this._state = State.InComment;
        }
        // else: stay in AFTER_COMMENT_2 (`--->`)
    }
    _stateBeforeCdata6(c: string) {
        if (c === "[") {
            this._state = State.InCdata;
            this._sectionStart = this._index + 1;
        } else {
            this._state = State.InDeclaration;
            this._index--;
        }
    }
    _stateInCdata(c: string) {
        if (c === "]") this._state = State.AfterCdata1;
    }
    _stateAfterCdata1(c: string) {
        if (c === "]") this._state = State.AfterCdata2;
        else this._state = State.InCdata;
    }
    _stateAfterCdata2(c: string) {
        if (c === ">") {
            //remove 2 trailing chars
            this._cbs.oncdata(
                this._buffer.substring(this._sectionStart, this._index - 2)
            );
            this._state = State.Text;
            this._sectionStart = this._index + 1;
        } else if (c !== "]") {
            this._state = State.InCdata;
        }
        //else: stay in AFTER_CDATA_2 (`]]]>`)
    }
    _stateBeforeSpecial(c: string) {
        if (c === "c" || c === "C") {
            this._state = State.BeforeScript1;
        } else if (c === "t" || c === "T") {
            this._state = State.BeforeStyle1;
        } else {
            this._state = State.InTagName;
            this._index--; //consume the token again
        }
    }
    _stateBeforeSpecialEnd(c: string) {
        if (this._special === Special.Script && (c === "c" || c === "C")) {
            this._state = State.AfterScript1;
        } else if (
            this._special === Special.Style &&
            (c === "t" || c === "T")
        ) {
            this._state = State.AfterStyle1;
        } else this._state = State.Text;
    }
    _stateBeforeScript5(c: string) {
        if (c === "/" || c === ">" || whitespace(c)) {
            this._special = Special.Script;
        }
        this._state = State.InTagName;
        this._index--; //consume the token again
    }
    _stateAfterScript5(c: string) {
        if (c === ">" || whitespace(c)) {
            this._special = Special.None;
            this._state = State.InClosingTagName;
            this._sectionStart = this._index - 6;
            this._index--; //reconsume the token
        } else this._state = State.Text;
    }
    _stateBeforeStyle4(c: string) {
        if (c === "/" || c === ">" || whitespace(c)) {
            this._special = Special.Style;
        }
        this._state = State.InTagName;
        this._index--; //consume the token again
    }
    _stateAfterStyle4(c: string) {
        if (c === ">" || whitespace(c)) {
            this._special = Special.None;
            this._state = State.InClosingTagName;
            this._sectionStart = this._index - 5;
            this._index--; //reconsume the token
        } else this._state = State.Text;
    }
    //for entities terminated with a semicolon
    _parseNamedEntityStrict() {
        //offset = 1
        if (this._sectionStart + 1 < this._index) {
            const entity = this._buffer.substring(
                    this._sectionStart + 1,
                    this._index
                ),
                map = this._xmlMode ? xmlMap : entityMap;
            if (Object.prototype.hasOwnProperty.call(map, entity)) {
                this._emitPartial((map as any)[entity]);
                this._sectionStart = this._index + 1;
            }
        }
    }
    //parses legacy entities (without trailing semicolon)
    _parseLegacyEntity() {
        const start = this._sectionStart + 1;
        let limit = this._index - start;
        if (limit > 6) limit = 6; // The max length of legacy entities is 6
        while (limit >= 2) {
            // The min length of legacy entities is 2
            const entity = this._buffer.substr(start, limit);
            if (Object.prototype.hasOwnProperty.call(legacyMap, entity)) {
                this._emitPartial((legacyMap as any)[entity]);
                this._sectionStart += limit + 1;
                return;
            } else {
                limit--;
            }
        }
    }
    _stateInNamedEntity(c: string) {
        if (c === ";") {
            this._parseNamedEntityStrict();
            if (this._sectionStart + 1 < this._index && !this._xmlMode) {
                this._parseLegacyEntity();
            }
            this._state = this._baseState;
        } else if (
            (c < "a" || c > "z") &&
            (c < "A" || c > "Z") &&
            (c < "0" || c > "9")
        ) {
            if (this._xmlMode || this._sectionStart + 1 === this._index) {
                // ignore
            } else if (this._baseState !== State.Text) {
                if (c !== "=") {
                    this._parseNamedEntityStrict();
                }
            } else {
                this._parseLegacyEntity();
            }
            this._state = this._baseState;
            this._index--;
        }
    }
    _decodeNumericEntity(offset: number, base: number) {
        const sectionStart = this._sectionStart + offset;
        if (sectionStart !== this._index) {
            //parse entity
            const entity = this._buffer.substring(sectionStart, this._index);
            const parsed = parseInt(entity, base);
            this._emitPartial(decodeCodePoint(parsed));
            this._sectionStart = this._index;
        } else {
            this._sectionStart--;
        }
        this._state = this._baseState;
    }
    _stateInNumericEntity(c: string) {
        if (c === ";") {
            this._decodeNumericEntity(2, 10);
            this._sectionStart++;
        } else if (c < "0" || c > "9") {
            if (!this._xmlMode) {
                this._decodeNumericEntity(2, 10);
            } else {
                this._state = this._baseState;
            }
            this._index--;
        }
    }
    _stateInHexEntity(c: string) {
        if (c === ";") {
            this._decodeNumericEntity(3, 16);
            this._sectionStart++;
        } else if (
            (c < "a" || c > "f") &&
            (c < "A" || c > "F") &&
            (c < "0" || c > "9")
        ) {
            if (!this._xmlMode) {
                this._decodeNumericEntity(3, 16);
            } else {
                this._state = this._baseState;
            }
            this._index--;
        }
    }

    _cleanup() {
        if (this._sectionStart < 0) {
            this._buffer = "";
            this._bufferOffset += this._index;
            this._index = 0;
        } else if (this._running) {
            if (this._state === State.Text) {
                if (this._sectionStart !== this._index) {
                    this._cbs.ontext(this._buffer.substr(this._sectionStart));
                }
                this._buffer = "";
                this._bufferOffset += this._index;
                this._index = 0;
            } else if (this._sectionStart === this._index) {
                //the section just started
                this._buffer = "";
                this._bufferOffset += this._index;
                this._index = 0;
            } else {
                //remove everything unnecessary
                this._buffer = this._buffer.substr(this._sectionStart);
                this._index -= this._sectionStart;
                this._bufferOffset += this._sectionStart;
            }
            this._sectionStart = 0;
        }
    }

    //TODO make events conditional
    write(chunk: string) {
        if (this._ended) this._cbs.onerror(Error(".write() after done!"));
        this._buffer += chunk;
        this._parse();
    }

    // Iterates through the buffer, calling the function corresponding to the current state.
    // States that are more likely to be hit are higher up, as a performance improvement.
    _parse() {
        while (this._index < this._buffer.length && this._running) {
            const c = this._buffer.charAt(this._index);
            if (this._state === State.Text) {
                this._stateText(c);
            } else if (this._state === State.InAttributeValueDq) {
                this._stateInAttributeValueDoubleQuotes(c);
            } else if (this._state === State.InAttributeName) {
                this._stateInAttributeName(c);
            } else if (this._state === State.InComment) {
                this._stateInComment(c);
            } else if (this._state === State.BeforeAttributeName) {
                this._stateBeforeAttributeName(c);
            } else if (this._state === State.InTagName) {
                this._stateInTagName(c);
            } else if (this._state === State.InClosingTagName) {
                this._stateInClosingTagName(c);
            } else if (this._state === State.BeforeTagName) {
                this._stateBeforeTagName(c);
            } else if (this._state === State.AfterAttributeName) {
                this._stateAfterAttributeName(c);
            } else if (this._state === State.InAttributeValueSq) {
                this._stateInAttributeValueSingleQuotes(c);
            } else if (this._state === State.BeforeAttributeValue) {
                this._stateBeforeAttributeValue(c);
            } else if (this._state === State.BeforeClosingTagName) {
                this._stateBeforeClosingTagName(c);
            } else if (this._state === State.AfterClosingTagName) {
                this._stateAfterClosingTagName(c);
            } else if (this._state === State.BeforeSpecial) {
                this._stateBeforeSpecial(c);
            } else if (this._state === State.AfterComment1) {
                this._stateAfterComment1(c);
            } else if (this._state === State.InAttributeValueNq) {
                this._stateInAttributeValueNoQuotes(c);
            } else if (this._state === State.InSelfClosingTag) {
                this._stateInSelfClosingTag(c);
            } else if (this._state === State.InDeclaration) {
                this._stateInDeclaration(c);
            } else if (this._state === State.BeforeDeclaration) {
                this._stateBeforeDeclaration(c);
            } else if (this._state === State.AfterComment2) {
                this._stateAfterComment2(c);
            } else if (this._state === State.BeforeComment) {
                this._stateBeforeComment(c);
            } else if (this._state === State.BeforeSpecialEnd) {
                this._stateBeforeSpecialEnd(c);
            } else if (this._state === State.AfterScript1) {
                stateAfterScript1(this, c);
            } else if (this._state === State.AfterScript2) {
                stateAfterScript2(this, c);
            } else if (this._state === State.AfterScript3) {
                stateAfterScript3(this, c);
            } else if (this._state === State.BeforeScript1) {
                stateBeforeScript1(this, c);
            } else if (this._state === State.BeforeScript2) {
                stateBeforeScript2(this, c);
            } else if (this._state === State.BeforeScript3) {
                stateBeforeScript3(this, c);
            } else if (this._state === State.BeforeScript4) {
                stateBeforeScript4(this, c);
            } else if (this._state === State.BeforeScript5) {
                this._stateBeforeScript5(c);
            } else if (this._state === State.AfterScript4) {
                stateAfterScript4(this, c);
            } else if (this._state === State.AfterScript5) {
                this._stateAfterScript5(c);
            } else if (this._state === State.BeforeStyle1) {
                stateBeforeStyle1(this, c);
            } else if (this._state === State.InCdata) {
                this._stateInCdata(c);
            } else if (this._state === State.BeforeStyle2) {
                stateBeforeStyle2(this, c);
            } else if (this._state === State.BeforeStyle3) {
                stateBeforeStyle3(this, c);
            } else if (this._state === State.BeforeStyle4) {
                this._stateBeforeStyle4(c);
            } else if (this._state === State.AfterStyle1) {
                stateAfterStyle1(this, c);
            } else if (this._state === State.AfterStyle2) {
                stateAfterStyle2(this, c);
            } else if (this._state === State.AfterStyle3) {
                stateAfterStyle3(this, c);
            } else if (this._state === State.AfterStyle4) {
                this._stateAfterStyle4(c);
            } else if (this._state === State.InProcessingInstruction) {
                this._stateInProcessingInstruction(c);
            } else if (this._state === State.InNamedEntity) {
                this._stateInNamedEntity(c);
            } else if (this._state === State.BeforeCdata1) {
                stateBeforeCdata1(this, c);
            } else if (this._state === State.BeforeEntity) {
                stateBeforeEntity(this, c);
            } else if (this._state === State.BeforeCdata2) {
                stateBeforeCdata2(this, c);
            } else if (this._state === State.BeforeCdata3) {
                stateBeforeCdata3(this, c);
            } else if (this._state === State.AfterCdata1) {
                this._stateAfterCdata1(c);
            } else if (this._state === State.AfterCdata2) {
                this._stateAfterCdata2(c);
            } else if (this._state === State.BeforeCdata4) {
                stateBeforeCdata4(this, c);
            } else if (this._state === State.BeforeCdata5) {
                stateBeforeCdata5(this, c);
            } else if (this._state === State.BeforeCdata6) {
                this._stateBeforeCdata6(c);
            } else if (this._state === State.InHexEntity) {
                this._stateInHexEntity(c);
            } else if (this._state === State.InNumericEntity) {
                this._stateInNumericEntity(c);
            } else if (this._state === State.BeforeNumericEntity) {
                stateBeforeNumericEntity(this, c);
            } else {
                this._cbs.onerror(Error("unknown _state"), this._state);
            }
            this._index++;
        }
        this._cleanup();
    }
    pause() {
        this._running = false;
    }
    resume() {
        this._running = true;
        if (this._index < this._buffer.length) {
            this._parse();
        }
        if (this._ended) {
            this._finish();
        }
    }
    end(chunk?: string) {
        if (this._ended) this._cbs.onerror(Error(".end() after done!"));
        if (chunk) this.write(chunk);
        this._ended = true;
        if (this._running) this._finish();
    }
    _finish() {
        //if there is remaining data, emit it in a reasonable way
        if (this._sectionStart < this._index) {
            this._handleTrailingData();
        }
        this._cbs.onend();
    }
    _handleTrailingData() {
        const data = this._buffer.substr(this._sectionStart);
        if (
            this._state === State.InCdata ||
            this._state === State.AfterCdata1 ||
            this._state === State.AfterCdata2
        ) {
            this._cbs.oncdata(data);
        } else if (
            this._state === State.InComment ||
            this._state === State.AfterComment1 ||
            this._state === State.AfterComment2
        ) {
            this._cbs.oncomment(data);
        } else if (this._state === State.InNamedEntity && !this._xmlMode) {
            this._parseLegacyEntity();
            if (this._sectionStart < this._index) {
                this._state = this._baseState;
                this._handleTrailingData();
            }
        } else if (this._state === State.InNumericEntity && !this._xmlMode) {
            this._decodeNumericEntity(2, 10);
            if (this._sectionStart < this._index) {
                this._state = this._baseState;
                this._handleTrailingData();
            }
        } else if (this._state === State.InHexEntity && !this._xmlMode) {
            this._decodeNumericEntity(3, 16);
            if (this._sectionStart < this._index) {
                this._state = this._baseState;
                this._handleTrailingData();
            }
        } else if (
            this._state !== State.InTagName &&
            this._state !== State.BeforeAttributeName &&
            this._state !== State.BeforeAttributeValue &&
            this._state !== State.AfterAttributeName &&
            this._state !== State.InAttributeName &&
            this._state !== State.InAttributeValueSq &&
            this._state !== State.InAttributeValueDq &&
            this._state !== State.InAttributeValueNq &&
            this._state !== State.InClosingTagName
        ) {
            this._cbs.ontext(data);
        }
        //else, ignore remaining data
        //TODO add a way to remove current tag
    }
    getAbsoluteIndex(): number {
        return this._bufferOffset + this._index;
    }
    _getSection(): string {
        return this._buffer.substring(this._sectionStart, this._index);
    }
    _emitToken(name: "onopentagname" | "onclosetag" | "onattribdata") {
        this._cbs[name](this._getSection());
        this._sectionStart = -1;
    }
    _emitPartial(value: string) {
        if (this._baseState !== State.Text) {
            this._cbs.onattribdata(value); //TODO implement the new event
        } else {
            this._cbs.ontext(value);
        }
    }
}
