import { parseDOM, createDomStream } from ".";
import { Element } from "domhandler";

// Add an `attributes` prop to the Element for now, to make it possible for Jest to render DOM nodes.
Object.defineProperty(Element.prototype, "attributes", {
    get() {
        return Object.keys(this.attribs).map(name => ({
            name,
            value: this.attribs[name]
        }));
    },
    configurable: true,
    enumerable: false
});

describe("Index", () => {
    test("parseDOM", () => {
        const dom = parseDOM("<a foo><b><c><?foo>Yay!");
        expect(dom).toMatchSnapshot();
    });

    test("createDomStream", done => {
        const domStream = createDomStream((err, dom) => {
            expect(err).toBeNull();
            expect(dom).toMatchSnapshot();

            done();
        });

        for (const c of "&amp;This is text<!-- and comments --><tags>") {
            domStream.write(c);
        }

        domStream.end();
    });
});
