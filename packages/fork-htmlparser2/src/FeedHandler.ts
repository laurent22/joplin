import DomHandler, { DomHandlerOptions, Element } from "domhandler";
import * as DomUtils from "domutils";
import { Parser, ParserOptions } from "./Parser";

interface FeedItem {
    id?: string;
    title?: string;
    link?: string;
    description?: string;
    pubDate?: Date;
}

interface Feed {
    type?: string;
    id?: string;
    title?: string;
    link?: string;
    description?: string;
    updated?: Date;
    author?: string;
    items?: FeedItem[];
}

//TODO: Consume data as it is coming in
export class FeedHandler extends DomHandler {
    feed?: Feed;

    /**
     *
     * @param callback
     * @param options
     */
    constructor(
        callback?: ((error: Error | null) => void) | DomHandlerOptions,
        options?: DomHandlerOptions
    ) {
        if (typeof callback === "object" && callback !== null) {
            callback = undefined;
            options = callback;
        }
        super(callback, options);
    }

    onend() {
        const feed: Feed = {};
        const feedRoot = getOneElement(isValidFeed, this.dom);

        if (feedRoot) {
            if (feedRoot.name === "feed") {
                const childs = feedRoot.children;
                feed.type = "atom";
                addConditionally(feed, "id", "id", childs);
                addConditionally(feed, "title", "title", childs);
                const href = getAttribute(
                    "href",
                    getOneElement("link", childs)
                );
                if (href) {
                    feed.link = href;
                }
                addConditionally(feed, "description", "subtitle", childs);

                const updated = fetch("updated", childs);
                if (updated) {
                    feed.updated = new Date(updated);
                }

                addConditionally(feed, "author", "email", childs, true);
                feed.items = getElements("entry", childs).map(item => {
                    const entry: FeedItem = {};
                    const { children } = item;

                    addConditionally(entry, "id", "id", children);
                    addConditionally(entry, "title", "title", children);

                    const href = getAttribute(
                        "href",
                        getOneElement("link", children)
                    );
                    if (href) {
                        entry.link = href;
                    }

                    const description =
                        fetch("summary", children) ||
                        fetch("content", children);
                    if (description) {
                        entry.description = description;
                    }

                    const pubDate = fetch("updated", children);
                    if (pubDate) {
                        entry.pubDate = new Date(pubDate);
                    }

                    return entry;
                });
            } else {
                const childs = getOneElement("channel", feedRoot.children)
                    .children;
                feed.type = feedRoot.name.substr(0, 3);
                feed.id = "";

                addConditionally(feed, "title", "title", childs);
                addConditionally(feed, "link", "link", childs);
                addConditionally(feed, "description", "description", childs);

                const updated = fetch("lastBuildDate", childs);
                if (updated) {
                    feed.updated = new Date(updated);
                }

                addConditionally(
                    feed,
                    "author",
                    "managingEditor",
                    childs,
                    true
                );

                feed.items = getElements("item", feedRoot.children).map(
                    (item: Element) => {
                        const entry: FeedItem = {};
                        const { children } = item;
                        addConditionally(entry, "id", "guid", children);
                        addConditionally(entry, "title", "title", children);
                        addConditionally(entry, "link", "link", children);
                        addConditionally(
                            entry,
                            "description",
                            "description",
                            children
                        );
                        const pubDate = fetch("pubDate", children);
                        if (pubDate) entry.pubDate = new Date(pubDate);
                        return entry;
                    }
                );
            }
        }

        this.feed = feed;

        this.handleCallback(
            feedRoot ? null : Error("couldn't find root of feed")
        );
    }
}

function getElements(what: string, where: any) {
    return DomUtils.getElementsByTagName(what, where, true);
}
function getOneElement(
    what: string | ((name: string) => boolean),
    where: any
) {
    return DomUtils.getElementsByTagName(what, where, true, 1)[0];
}
function fetch(what: string, where: any, recurse = false): string {
    return DomUtils.getText(
        DomUtils.getElementsByTagName(what, where, recurse, 1)
    ).trim();
}

function getAttribute(name: string, elem: Element | null): string | null {
    if (!elem) {
        return null;
    }

    const { attribs } = elem;
    return attribs[name];
}

function addConditionally<T>(
    obj: T,
    prop: keyof T,
    what: string,
    where: any,
    recurse = false
) {
    const tmp = fetch(what, where, recurse);
    // @ts-ignore
    if (tmp) obj[prop] = tmp;
}

function isValidFeed(value: string) {
    return value === "rss" || value === "feed" || value === "rdf:RDF";
}

const defaultOptions = { xmlMode: true };

/**
 * Parse a feed.
 *
 * @param feed The feed that should be parsed, as a string.
 * @param options Optionally, options for parsing. When using this option, you probably want to set `xmlMode` to `true`.
 */
export function parseFeed(
    feed: string,
    options: ParserOptions & DomHandlerOptions = defaultOptions
): Feed | undefined {
    const handler = new FeedHandler(options);
    new Parser(handler, options).end(feed);
    return handler.feed;
}
