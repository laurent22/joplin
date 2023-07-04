import { Parser, Handler, ParserOptions } from "../Parser";
import { CollectingHandler } from "../CollectingHandler";
import { DomHandlerOptions } from "..";
import fs from "fs";
import path from "path";

export function writeToParser(
    handler: Partial<Handler>,
    options: ParserOptions | undefined,
    data: string
) {
    const parser = new Parser(handler, options);
    // First, try to run the test via chunks
    for (let i = 0; i < data.length; i++) {
        parser.write(data.charAt(i));
    }
    parser.end();
    // Then, parse everything
    parser.parseComplete(data);
}

interface Event {
    event: string;
    data: unknown[];
}

// Returns a tree structure
export function getEventCollector(
    cb: (error: Error | null, events?: Event[]) => void
) {
    const handler = new CollectingHandler({
        onerror: cb,
        onend() {
            cb(null, handler.events.reduce(eventReducer, []));
        }
    });

    return handler;
}

function eventReducer(events: Event[], arr: [string, ...unknown[]]): Event[] {
    if (
        arr[0] === "onerror" ||
        arr[0] === "onend" ||
        arr[0] === "onparserinit"
    ) {
        // ignore
    } else if (
        arr[0] === "ontext" &&
        events.length &&
        events[events.length - 1].event === "text"
    ) {
        // Combine text nodes
        (events as any)[events.length - 1].data[0] += arr[1];
    } else {
        events.push({
            event: arr[0].substr(2),
            data: arr.slice(1)
        });
    }

    return events;
}

function getCallback(file: TestFile, done: (err?: Error | null) => void) {
    let repeated = false;

    return (err: null | Error, actual?: {} | {}[]) => {
        expect(err).toBeNull();
        if (file.useSnapshot) {
            expect(actual).toMatchSnapshot();
        } else {
            expect(actual).toEqual(file.expected);
        }

        if (repeated) done();
        else repeated = true;
    };
}

interface TestFile {
    name: string;
    options: {
        parser?: ParserOptions;
        handler?: DomHandlerOptions;
    } & Partial<ParserOptions>;
    html: string;
    file: string;
    useSnapshot?: boolean;
    expected?: {} | {}[];
}

export function createSuite(
    name: string,
    getResult: (
        file: TestFile,
        done: (error: Error | null, actual?: {} | {}[]) => void
    ) => void
) {
    describe(name, readDir);

    function readDir() {
        const dir = path.join(__dirname, name);

        fs.readdirSync(dir)
            .filter(file => !file.startsWith(".") && !file.startsWith("_"))
            .map(name => path.join(dir, name))
            .map(require)
            .forEach(runTest);
    }

    function runTest(file: TestFile) {
        test(file.name, done => getResult(file, getCallback(file, done)));
    }
}
