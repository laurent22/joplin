"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const JoplinServerApi_1 = require("./JoplinServerApi");
const shim_1 = require("./shim");
describe('JoplinServerApi', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });
    test('should pass ignoreTlsErrors to uploadBlob requests', async (_url, options) => {
        const uploadBlobSpy = jest.spyOn(shim_1.default, 'uploadBlob').mockImplementation(async (_url, options) => {
            return {
                ok: true,
                status: 200,
                headers: options.headers,
                text: async () => 'ok',
            };
        });
        jest.spyOn(shim_1.default, 'fsDriver').mockImplementation(() => {
            return {
                stat: async () => ({ size: 7 }),
            };
        });
        const api = new JoplinServerApi_1.default({
            baseUrl: () => 'https://joplin.lan',
            userContentBaseUrl: () => 'https://joplinusercontent.lan',
            username: () => '',
            password: () => '',
            apiKey: () => '',
            session: () => ({ id: 'session-id', user_id: 'user-id' }),
            ignoreTlsErrors: () => true,
        });
        await api.exec('PUT', 'api/items/root:/.resource/test:/content', null, null, { 'Content-Type': 'application/octet-stream' }, { source: 'file', path: '/tmp/test-resource', responseFormat: 'text' });
        expect(uploadBlobSpy).toHaveBeenCalledTimes(1);
        expect(uploadBlobSpy).toHaveBeenCalledWith('https://joplin.lan/api/items/root:/.resource/test:/content', expect.objectContaining({
            method: 'PUT',
            path: '/tmp/test-resource',
            ignoreTlsErrors: true,
            headers: expect.objectContaining({
                'Content-Type': 'application/octet-stream',
                'Content-Length': '7',
                'X-API-AUTH': 'session-id',
                'X-API-MIN-VERSION': '2.6.0',
            }),
        }));
    });
});
//# sourceMappingURL=JoplinServerApi.test.js.map
