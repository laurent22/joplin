"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Api_1 = __importStar(require("../Api"));
const Note_1 = __importDefault(require("../../../models/Note"));
const Revision_1 = __importDefault(require("../../../models/Revision"));
const Setting_1 = __importDefault(require("../../../models/Setting"));
const BaseModel_1 = __importDefault(require("../../../BaseModel"));
const test_utils_1 = require("../../../testing/test-utils");
const createNoteAndRevision = async (isLocked) => {
    const note = await Note_1.default.save({ title: 'note', body: 'body', is_locked: isLocked });
    const revision = await Revision_1.default.save({
        item_type: BaseModel_1.default.TYPE_NOTE,
        item_id: note.id,
        item_updated_time: note.updated_time,
        parent_id: '',
        title_diff: '[]',
        body_diff: '[]',
        metadata_diff: '{"new":{},"deleted":[]}',
        is_locked: isLocked,
    });
    return { note, revision };
};
describe('routes/revisions', () => {
    beforeEach(async () => {
        await (0, test_utils_1.setupDatabaseAndSynchronizer)(1);
        await (0, test_utils_1.switchClient)(1);
    });
    test('should block load and save of a locked revision', async () => {
        Setting_1.default.setValue('featureFlag.noteLock', true);
        const api = new Api_1.default();
        const { revision } = await createNoteAndRevision(1);
        await expect(api.route(Api_1.RequestMethod.GET, `revisions/${revision.id}`)).rejects.toThrow('locked revision');
        await expect(api.route(Api_1.RequestMethod.PUT, `revisions/${revision.id}`, null, JSON.stringify({ title_diff: '[]' }))).rejects.toThrow('locked revision');
        expect(await Revision_1.default.load(revision.id)).toBeTruthy();
    });
    test('should still allow deleting the revisions of a locked note', async () => {
        Setting_1.default.setValue('featureFlag.noteLock', true);
        const api = new Api_1.default();
        const { revision } = await createNoteAndRevision(1);
        await api.route(Api_1.RequestMethod.DELETE, `revisions/${revision.id}`);
        expect(await Revision_1.default.load(revision.id)).toBeFalsy();
    });
    test('should exclude the revisions of locked notes from the collection response', async () => {
        Setting_1.default.setValue('featureFlag.noteLock', true);
        const api = new Api_1.default();
        await createNoteAndRevision(1);
        const { revision: plainRevision } = await createNoteAndRevision(0);
        const response = await api.route(Api_1.RequestMethod.GET, 'revisions');
        expect(response.items.map((r) => r.id)).toEqual([plainRevision.id]);
        Setting_1.default.setValue('featureFlag.noteLock', false);
        expect((await api.route(Api_1.RequestMethod.GET, 'revisions')).items.length).toBe(2);
    });
    test.each([
        { label: 'the note is not locked', flagEnabled: true, isLocked: 0 },
        { label: 'note lock is disabled', flagEnabled: false, isLocked: 1 },
    ])('should allow revision access when $label', async ({ flagEnabled, isLocked }) => {
        Setting_1.default.setValue('featureFlag.noteLock', flagEnabled);
        const api = new Api_1.default();
        const { revision } = await createNoteAndRevision(isLocked);
        const response = await api.route(Api_1.RequestMethod.GET, `revisions/${revision.id}`);
        expect(response.id).toBe(revision.id);
    });
});
//# sourceMappingURL=revisions.test.js.map