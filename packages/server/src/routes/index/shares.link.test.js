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
const types_1 = require("../../services/database/types");
const routeHandler_1 = require("../../middleware/routeHandler");
const errors_1 = require("../../utils/errors");
const apiUtils_1 = require("../../utils/testing/apiUtils");
const fileApiUtils_1 = require("../../utils/testing/fileApiUtils");
const testUtils_1 = require("../../utils/testing/testUtils");
const resourceSize = 2720;
const resourceContents = {
    image: `Test Image

id: 96765a68655f4446b3dbad7d41b6566e
mime: image/jpeg
filename: 
created_time: 2020-10-15T10:37:58.090Z
updated_time: 2020-10-15T10:37:58.090Z
user_created_time: 2020-10-15T10:37:58.090Z
user_updated_time: 2020-10-15T10:37:58.090Z
file_extension: jpg
encryption_cipher_text: 
encryption_applied: 0
encryption_blob_encrypted: 0
size: ${resourceSize}
is_shared: 0
type_: 4`,
};
function getShareContent(shareId, query = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, testUtils_1.koaAppContext)({
            request: {
                method: 'GET',
                url: `/shares/${shareId}`,
                query,
            },
        });
        yield (0, routeHandler_1.default)(context);
        yield (0, testUtils_1.checkContextError)(context);
        return context.response.body;
    });
}
describe('shares.link', function () {
    beforeAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeAllDb)('shares.link');
    }));
    afterAll(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.afterAllTests)();
    }));
    beforeEach(() => __awaiter(this, void 0, void 0, function* () {
        yield (0, testUtils_1.beforeEachDb)();
    }));
    test('should display a simple note', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)();
            const noteItem = yield (0, testUtils_1.createNote)(session.id, {
                title: 'Testing title',
                body: 'Testing body',
            });
            const share = yield (0, apiUtils_1.postApi)(session.id, 'shares', {
                type: types_1.ShareType.Note,
                note_id: noteItem.jop_id,
            });
            const bodyHtml = yield getShareContent(share.id);
            // Check that a few important strings are present
            expect(bodyHtml).toContain('rendered-md'); // Means we have the HTML body
            expect(bodyHtml).toContain('Testing title'); // Means the note has been rendered
            expect(bodyHtml).toContain('Testing body');
            expect(bodyHtml).toContain('<title>Testing title'); // Means the page title is set to the note title
        });
    });
    test('should load plugins', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)();
            const noteItem = yield (0, testUtils_1.createNote)(session.id, {
                body: '$\\sqrt{3x-1}+(1+x)^2$',
            });
            const share = yield (0, apiUtils_1.postApi)(session.id, 'shares', {
                type: types_1.ShareType.Note,
                note_id: noteItem.jop_id,
            });
            const bodyHtml = yield getShareContent(share.id);
            expect(bodyHtml).toContain('class="katex-mathml"');
        });
    });
    test('should render attached images', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)();
            const noteItem = yield (0, testUtils_1.createNote)(session.id, {
                id: '00000000000000000000000000000001',
                body: '![my image](:/96765a68655f4446b3dbad7d41b6566e)',
            });
            yield (0, testUtils_1.createItem)(session.id, 'root:/96765a68655f4446b3dbad7d41b6566e.md:', resourceContents.image);
            yield (0, testUtils_1.createItem)(session.id, 'root:/.resource/96765a68655f4446b3dbad7d41b6566e:', yield (0, fileApiUtils_1.testImageBuffer)());
            const share = yield (0, apiUtils_1.postApi)(session.id, 'shares', {
                type: types_1.ShareType.Note,
                note_id: noteItem.jop_id,
            });
            const bodyHtml = yield getShareContent(share.id);
            // We should get an image like this:
            //
            // <img data-from-md data-resource-id="96765a68655f4446b3dbad7d41b6566e" src="http://localhost:22300/shares/TJsBi9Is1SsJXPRw5MW9HkItiq0PDu6x?resource_id=96765a68655f4446b3dbad7d41b6566e&amp;t=1602758278090" title=""/>
            const doc = (0, testUtils_1.parseHtml)(bodyHtml);
            const image = doc.querySelector('img[data-resource-id="96765a68655f4446b3dbad7d41b6566e"]');
            expect(image.getAttribute('src')).toBe(`http://localhost:22300/shares/${share.id}?resource_id=96765a68655f4446b3dbad7d41b6566e&t=1602758278090`);
            // If we try to get the resource, via the share link, we should get the
            // full image.
            const resourceContent = yield getShareContent(share.id, {
                resource_id: '96765a68655f4446b3dbad7d41b6566e',
                t: '1602758278090',
            });
            expect(resourceContent.byteLength).toBe(resourceSize);
        });
    });
    test('should share a linked note', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)();
            const linkedNote1 = yield (0, testUtils_1.createNote)(session.id, {
                id: '000000000000000000000000000000C1',
            });
            const resource = yield (0, testUtils_1.createResource)(session.id, {
                id: '000000000000000000000000000000E1',
            }, 'test');
            const linkedNote2 = yield (0, testUtils_1.createNote)(session.id, {
                id: '000000000000000000000000000000C2',
                body: `[](:/${resource.jop_id})`,
            });
            const rootNote = yield (0, testUtils_1.createNote)(session.id, {
                id: '00000000000000000000000000000001',
                body: `[](:/${linkedNote1.jop_id}) [](:/${linkedNote2.jop_id})`,
            });
            const share = yield (0, apiUtils_1.postApi)(session.id, 'shares', {
                type: types_1.ShareType.Note,
                note_id: rootNote.jop_id,
                recursive: 1,
            });
            const bodyHtml = yield getShareContent(share.id, { note_id: '000000000000000000000000000000C2' });
            const doc = (0, testUtils_1.parseHtml)(bodyHtml);
            const image = doc.querySelector('a[data-resource-id="000000000000000000000000000000E1"]');
            expect(image.getAttribute('href')).toBe(`http://localhost:22300/shares/${share.id}?resource_id=000000000000000000000000000000E1&t=1602758278090`);
            const resourceContent = yield getShareContent(share.id, { resource_id: '000000000000000000000000000000E1' });
            expect(resourceContent.toString()).toBe('test');
        });
    });
    test('should not share items that are not linked to a shared note', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)();
            const notSharedResource = yield (0, testUtils_1.createResource)(session.id, {
                id: '000000000000000000000000000000E2',
            }, 'test2');
            yield (0, testUtils_1.createNote)(session.id, {
                id: '000000000000000000000000000000C5',
                body: `[](:/${notSharedResource.jop_id})`,
            });
            const rootNote = yield (0, testUtils_1.createNote)(session.id, {
                id: '00000000000000000000000000000001',
            });
            const share = yield (0, apiUtils_1.postApi)(session.id, 'shares', {
                type: types_1.ShareType.Note,
                note_id: rootNote.jop_id,
                recursive: 1,
            });
            yield (0, testUtils_1.expectNotThrow)(() => __awaiter(this, void 0, void 0, function* () { return getShareContent(share.id, { note_id: '00000000000000000000000000000001' }); }));
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return getShareContent(share.id, { note_id: '000000000000000000000000000000C5' }); }), errors_1.ErrorNotFound.httpCode);
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return getShareContent(share.id, { note_id: '000000000000000000000000000000E2' }); }), errors_1.ErrorNotFound.httpCode);
        });
    });
    test('should not share linked notes if the "recursive" field is not set', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)();
            const linkedNote1 = yield (0, testUtils_1.createNote)(session.id, {
                id: '000000000000000000000000000000C1',
            });
            const rootNote = yield (0, testUtils_1.createNote)(session.id, {
                id: '00000000000000000000000000000001',
                body: `[](:/${linkedNote1.jop_id})`,
            });
            const share = yield (0, apiUtils_1.postApi)(session.id, 'shares', {
                type: types_1.ShareType.Note,
                note_id: rootNote.jop_id,
            });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return getShareContent(share.id, { note_id: '000000000000000000000000000000C1' }); }), errors_1.ErrorForbidden.httpCode);
        });
    });
    test('should not throw an error if the note contains links to non-existing items', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { session } = yield (0, testUtils_1.createUserAndSession)();
            {
                const noteItem = yield (0, testUtils_1.createNote)(session.id, {
                    id: '00000000000000000000000000000001',
                    body: '![my image](:/96765a68655f4446b3dbad7d41b6566e)',
                });
                const share = yield (0, apiUtils_1.postApi)(session.id, 'shares', {
                    type: types_1.ShareType.Note,
                    note_id: noteItem.jop_id,
                });
                yield (0, testUtils_1.expectNotThrow)(() => __awaiter(this, void 0, void 0, function* () { return getShareContent(share.id); }));
            }
            {
                const noteItem = yield (0, testUtils_1.createNote)(session.id, {
                    id: '00000000000000000000000000000002',
                    body: '[missing too](:/531a2a839a2c493a88c45e39c6cb9ed4)',
                });
                const share = yield (0, apiUtils_1.postApi)(session.id, 'shares', {
                    type: types_1.ShareType.Note,
                    note_id: noteItem.jop_id,
                });
                yield (0, testUtils_1.expectNotThrow)(() => __awaiter(this, void 0, void 0, function* () { return getShareContent(share.id); }));
            }
        });
    });
    test('should throw an error if owner of share is disabled', function () {
        return __awaiter(this, void 0, void 0, function* () {
            const { user, session } = yield (0, testUtils_1.createUserAndSession)();
            const noteItem = yield (0, testUtils_1.createNote)(session.id, {
                id: '00000000000000000000000000000001',
                body: 'testing',
            });
            const share = yield (0, apiUtils_1.postApi)(session.id, 'shares', {
                type: types_1.ShareType.Note,
                note_id: noteItem.jop_id,
            });
            yield (0, testUtils_1.models)().user().save({
                id: user.id,
                enabled: 0,
            });
            yield (0, testUtils_1.expectHttpError)(() => __awaiter(this, void 0, void 0, function* () { return getShareContent(share.id); }), errors_1.ErrorForbidden.httpCode);
        });
    });
});
//# sourceMappingURL=shares.link.test.js.map