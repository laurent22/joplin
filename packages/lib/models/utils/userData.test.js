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
const test_utils_1 = require("../../testing/test-utils");
const Folder_1 = require("../Folder");
const Note_1 = require("../Note");
const userData_1 = require("./userData");
const loadOptions = { fields: ['id', 'parent_id', 'user_data', 'updated_time'] };
describe('utils/userData', () => {
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, test_utils_1.setupDatabaseAndSynchronizer)(1);
        yield (0, test_utils_1.switchClient)(1);
    }));
    it('should set and get user data', () => __awaiter(void 0, void 0, void 0, function* () {
        const folder = yield Folder_1.default.save({});
        let note = yield Note_1.default.save({ parent_id: folder.id });
        note = yield Note_1.default.load(note.id, loadOptions);
        yield (0, test_utils_1.msleep)(5);
        yield (0, userData_1.setNoteUserData)(note, 'org.joplin', 'my-key', 'something');
        const noteReloaded = yield Note_1.default.load(note.id);
        expect((0, userData_1.getNoteUserData)(noteReloaded, 'org.joplin', 'my-key')).toBe('something');
        // Check that the updated_time has been updated (for sync purposes), but
        // not the user_updated_time.
        expect(noteReloaded.updated_time).toBeGreaterThan(note.updated_time);
        expect(noteReloaded.user_updated_time).toBe(note.updated_time);
        // Check for non-existing props
        expect((0, userData_1.getNoteUserData)(noteReloaded, 'org.doesntexist', 'my-key')).toBe(undefined);
        expect((0, userData_1.getNoteUserData)(noteReloaded, 'org.joplin', 'doesntexist')).toBe(undefined);
    }));
    it('should delete user data', () => __awaiter(void 0, void 0, void 0, function* () {
        const folder = yield Folder_1.default.save({});
        let note = yield Note_1.default.save({ parent_id: folder.id });
        note = yield Note_1.default.load(note.id, loadOptions);
        yield (0, userData_1.setNoteUserData)(note, 'org.joplin', 'my-key', 'something');
        let noteReloaded = yield Note_1.default.load(note.id);
        expect((0, userData_1.getNoteUserData)(noteReloaded, 'org.joplin', 'my-key')).toBe('something');
        noteReloaded = yield (0, userData_1.deleteNoteUserData)(noteReloaded, 'org.joplin', 'my-key');
        expect((0, userData_1.getNoteUserData)(noteReloaded, 'org.joplin', 'my-key')).toBe(undefined);
        // Check that it works if we set it again
        yield (0, userData_1.setNoteUserData)(note, 'org.joplin', 'my-key', 'something else');
        noteReloaded = yield Note_1.default.load(noteReloaded.id, loadOptions);
        expect((0, userData_1.getNoteUserData)(noteReloaded, 'org.joplin', 'my-key')).toBe('something else');
    }));
    it('should merge user data', () => __awaiter(void 0, void 0, void 0, function* () {
        const testCases = [
            [
                {
                    'org.joplin': {
                        'k1': {
                            v: 123,
                            t: 0,
                        },
                        'k3': {
                            v: 789,
                            t: 5,
                        },
                        'k4': {
                            v: 789,
                            t: 5,
                        },
                    },
                    'com.example': {},
                },
                {
                    'org.joplin': {
                        'k1': {
                            v: 456,
                            t: 1,
                        },
                        'k2': {
                            v: 'abc',
                            t: 5,
                        },
                        'k4': {
                            v: 111,
                            t: 0,
                        },
                    },
                },
                {
                    'org.joplin': {
                        'k1': {
                            v: 456,
                            t: 1,
                        },
                        'k2': {
                            v: 'abc',
                            t: 5,
                        },
                        'k3': {
                            v: 789,
                            t: 5,
                        },
                        'k4': {
                            v: 789,
                            t: 5,
                        },
                    },
                    'com.example': {},
                },
            ],
            [
                // Client 2 delete a prop
                // Later, client 1 update that prop
                // Then data is merged
                // => In that case, the data is restored using client 1 data
                {
                    'org.joplin': {
                        'k1': {
                            v: 123,
                            t: 10,
                        },
                    },
                },
                {
                    'org.joplin': {
                        'k1': {
                            v: 0,
                            t: 0,
                            d: 1,
                        },
                    },
                },
                {
                    'org.joplin': {
                        'k1': {
                            v: 123,
                            t: 10,
                        },
                    },
                },
            ],
            [
                // Client 1 update a prop
                // Later, client 2 delete a prop
                // Then data is merged
                // => In that case, the data is deleted and the update from client 1 is lost
                {
                    'org.joplin': {
                        'k1': {
                            v: 123,
                            t: 0,
                        },
                    },
                },
                {
                    'org.joplin': {
                        'k1': {
                            v: 0,
                            t: 10,
                            d: 1,
                        },
                    },
                },
                {
                    'org.joplin': {
                        'k1': {
                            v: 0,
                            t: 10,
                            d: 1,
                        },
                    },
                },
            ],
        ];
        for (const [target, source, expected] of testCases) {
            const actual = (0, userData_1.mergeUserData)(target, source);
            expect(actual).toEqual(expected);
        }
    }));
});
//# sourceMappingURL=userData.test.js.map