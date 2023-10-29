"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandToString_1 = require("./commandToString");
describe('commandToString', () => {
    it('should convert a command array to a string', () => {
        const testCases = [
            ['ls', ['-la'], 'ls -la'],
            ['docker', ['--profile', 'with spaces'], 'docker --profile "with spaces"'],
            ['', [], ''],
            ['', [''], ''],
        ];
        for (const [commandName, args, expected] of testCases) {
            const actual = (0, commandToString_1.default)(commandName, args);
            expect(actual).toBe(expected);
        }
    });
});
//# sourceMappingURL=commandToString.test.js.map