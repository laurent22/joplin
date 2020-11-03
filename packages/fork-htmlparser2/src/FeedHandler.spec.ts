//Runs tests for feeds

import * as helper from "./__fixtures__/test-helper";
import { FeedHandler, parseFeed } from "./FeedHandler";
import fs from "fs";
import path from "path";

const documents = path.join(__dirname, "__fixtures__", "Documents");

helper.createSuite("Feeds", (test, cb) => {
    const file = fs.readFileSync(path.join(documents, test.file), "utf8");
    const handler: FeedHandler = new FeedHandler(err => cb(err, handler.feed));

    helper.writeToParser(handler, { xmlMode: true }, file);
});

describe("parseFeed", () => {
    test("(rssFeed)", async () => {
        const file = path.join(documents, "RSS_Example.xml");
        const rss = await fs.promises.readFile(file, "utf8");
        const feed = parseFeed(rss);

        expect(feed).toMatchSnapshot();
    });
});
