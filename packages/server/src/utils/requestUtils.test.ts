import { PassThrough } from 'stream';
import { IncomingMessage } from 'http';
import { writeFile, pathExists } from 'fs-extra';
import { tmpdir } from 'os';
import { join } from 'path';
import { formParse, removeUploadedFiles } from './requestUtils';
import { ErrorPayloadTooLarge } from './errors';
import { MB } from './bytes';

const makeRequest = (headers: Record<string, string>) => {
	return Object.assign(new PassThrough(), { headers }) as unknown as IncomingMessage & PassThrough;
};

describe('requestUtils', () => {

	test.each([
		['a Content-Length over the limit', { 'content-length': `${20 * MB}` }],
		['no Content-Length and more data than the limit', {}],
	])('should reject a JSON body with %s', async (_case, extraHeaders) => {
		const req = makeRequest({ 'content-type': 'application/json', 'transfer-encoding': 'chunked', ...extraHeaders });
		const promise = formParse(req);
		for (let i = 0; i < 12; i++) req.write(Buffer.alloc(MB, 'a'));
		req.end();

		await expect(promise).rejects.toMatchObject({ httpCode: ErrorPayloadTooLarge.httpCode });
	});

	test('should remove uploaded files', async () => {
		const filePath = join(tmpdir(), `upload-test-${Date.now()}`);
		await writeFile(filePath, 'uploaded');
		const req = Object.assign(makeRequest({}), { __parsed: { fields: {}, files: { file: { filepath: filePath } } } });

		await removeUploadedFiles(req);

		expect(await pathExists(filePath)).toBe(false);
	});

});
