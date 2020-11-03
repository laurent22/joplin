import { WritableStream } from "./WritableStream";

describe("WritableStream", () => {
    test("should decode fragmented unicode characters", () => {
        const ontext = jest.fn();
        const stream = new WritableStream({ ontext });

        stream.write(Buffer.from([0xe2, 0x82]));
        stream.write(Buffer.from([0xac]));
        stream.end();

        expect(ontext).toBeCalledWith("€");
    });
});
