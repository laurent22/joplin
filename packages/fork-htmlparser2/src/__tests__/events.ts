import * as helper from "../__fixtures__/test-helper";

helper.createSuite("Events", (test, cb) =>
    helper.writeToParser(
        helper.getEventCollector(cb),
        test.options.parser,
        test.html
    )
);
