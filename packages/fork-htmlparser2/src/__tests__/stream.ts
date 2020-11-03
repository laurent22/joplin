import * as helper from "../__fixtures__/test-helper";
import { WritableStream } from "../WritableStream";
import fs from "fs";
import path from "path";

helper.createSuite("Stream", (test, cb) => {
    const filePath = path.join(
        __dirname,
        "..",
        "__fixtures__",
        "Documents",
        test.file
    );

    fs.createReadStream(filePath)
        .pipe(
            new WritableStream(
                helper.getEventCollector((err, events) => {
                    cb(err, events);

                    const handler = helper.getEventCollector(cb);
                    const stream = new WritableStream(handler, test.options);

                    fs.readFile(filePath, (err, data) => {
                        if (err) throw err;
                        stream.end(data);
                    });
                }),
                test.options
            )
        )
        .on("error", cb);
});
