"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("./url");
describe('utils/url', () => {
    it('should convert a file URI to a file path', (() => __awaiter(void 0, void 0, void 0, function* () {
        // Tests imported from https://github.com/TooTallNate/file-uri-to-path/tree/master/test
        const testCases = {
            'file://host/path': '//host/path',
            'file://localhost/etc/fstab': '/etc/fstab',
            'file:///etc/fstab': '/etc/fstab',
            'file:///c:/WINDOWS/clock.avi': 'c:/WINDOWS/clock.avi',
            'file://localhost/c|/WINDOWS/clock.avi': 'c:/WINDOWS/clock.avi',
            'file:///c|/WINDOWS/clock.avi': 'c:/WINDOWS/clock.avi',
            'file://localhost/c:/WINDOWS/clock.avi': 'c:/WINDOWS/clock.avi',
            'file://hostname/path/to/the%20file.txt': '//hostname/path/to/the file.txt',
            'file:///c:/path/to/the%20file.txt': 'c:/path/to/the file.txt',
            'file:///C:/Documents%20and%20Settings/davris/FileSchemeURIs.doc': 'C:/Documents and Settings/davris/FileSchemeURIs.doc',
            'file:///C:/caf%C3%A9/%C3%A5r/d%C3%BCnn/%E7%89%9B%E9%93%83/Ph%E1%BB%9F/%F0%9F%98%B5.exe': 'C:/café/år/dünn/牛铃/Phở/😵.exe',
        };
        for (const [input, expected] of Object.entries(testCases)) {
            const actual = (0, url_1.fileUriToPath)(input);
            expect(actual).toBe(expected);
        }
        expect((0, url_1.fileUriToPath)('file://c:/not/quite/right')).toBe('c:/not/quite/right');
        expect((0, url_1.fileUriToPath)('file:///d:/better')).toBe('d:/better');
        expect((0, url_1.fileUriToPath)('file:///c:/AUTOEXEC.BAT', 'win32')).toBe('c:\\AUTOEXEC.BAT');
    })));
});
//# sourceMappingURL=url.test.js.map