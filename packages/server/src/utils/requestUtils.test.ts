import { PassThrough } from 'stream';
import { IncomingMessage } from 'http';
import { pathExists } from 'fs-extra';
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

	test('should remove all uploaded files, including several with the same field name', async () => {
		const boundary = 'test-boundary';
		const part = (n: number) => `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="f${n}.txt"\r\nContent-Type: text/plain\r\n\r\ncontent ${n}\r\n`;
		const body = `${part(1)}${part(2)}--${boundary}--\r\n`;
		const req = makeRequest({ 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': `${Buffer.byteLength(body)}` });

		const promise = formParse(req);
		req.end(body);
		await promise;

		const filePaths = (req as unknown as { __uploadedFilePaths: string[] }).__uploadedFilePaths;
		expect(filePaths.length).toBe(2);
		for (const filePath of filePaths) expect(await pathExists(filePath)).toBe(true);

		await removeUploadedFiles(req);

		for (const filePath of filePaths) expect(await pathExists(filePath)).toBe(false);
	});

});
