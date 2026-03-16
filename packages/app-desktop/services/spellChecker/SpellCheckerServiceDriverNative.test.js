"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mockAddWordToSpellCheckerDictionary = jest.fn();
jest.doMock('../bridge', () => ({
    __esModule: true,
    default: () => ({
        mainWindow: () => ({
            webContents: {
                session: {
                    addWordToSpellCheckerDictionary: mockAddWordToSpellCheckerDictionary,
                },
            },
        }),
    }),
}));
const fs_extra_1 = require("fs-extra");
const os_1 = require("os");
const path_1 = require("path");
const SpellCheckerServiceDriverNative_1 = require("./SpellCheckerServiceDriverNative");
const dictionaryFilename = 'Custom Dictionary.txt';
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 100));
describe('SpellCheckerServiceDriverNative', () => {
    let profileDir;
    let driver;
    beforeEach(async () => {
        profileDir = await (0, fs_extra_1.mkdtemp)((0, path_1.join)((0, os_1.tmpdir)(), 'joplin-spell-test-'));
        driver = new SpellCheckerServiceDriverNative_1.default(profileDir);
        mockAddWordToSpellCheckerDictionary.mockClear();
    });
    afterEach(async () => {
        await (0, fs_extra_1.remove)(profileDir);
    });
    test('should save word to profile directory', async () => {
        driver.addWordToSpellCheckerDictionary('', 'joplin');
        await flushPromises();
        const content = await (0, fs_extra_1.readFile)((0, path_1.join)(profileDir, dictionaryFilename), 'utf8');
        expect(content).toBe('joplin\n');
    });
    test('should load saved words from profile directory into Electron session', async () => {
        await (0, fs_extra_1.writeFile)((0, path_1.join)(profileDir, dictionaryFilename), 'joplin\nnote\n', 'utf8');
        await driver.loadSavedWords();
        expect(mockAddWordToSpellCheckerDictionary).toHaveBeenCalledWith('joplin');
        expect(mockAddWordToSpellCheckerDictionary).toHaveBeenCalledWith('note');
    });
    test('should not write duplicate word to file', async () => {
        driver.addWordToSpellCheckerDictionary('', 'joplin');
        await flushPromises();
        driver.addWordToSpellCheckerDictionary('', 'joplin');
        await flushPromises();
        const words = (await (0, fs_extra_1.readFile)((0, path_1.join)(profileDir, dictionaryFilename), 'utf8'))
            .split('\n')
            .filter(w => w.length > 0);
        expect(words).toEqual(['joplin']);
    });
});
//# sourceMappingURL=SpellCheckerServiceDriverNative.test.js.map