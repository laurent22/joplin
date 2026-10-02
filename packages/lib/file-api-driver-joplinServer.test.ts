import FileApiDriverJoplinServer from './file-api-driver-joplinServer';
import JoplinServerApi from './JoplinServerApi';

// Errors as they are returned by JoplinServerApi when the server rejects a
// request - see JoplinServerApi.exec()
const serverError = (httpCode: number, message: string) => {
	const error = new Error(message) as Error & { code: number; httpCode: number };
	error.code = httpCode;
	error.httpCode = httpCode;
	return error;
};

const newDriver = (execHandler: ()=> unknown) => {
	const api = { exec: execHandler } as unknown as JoplinServerApi;
	return new FileApiDriverJoplinServer(api);
};

describe('file-api-driver-joplinServer', () => {

	test.each([
		[409, 'Conflict'],
		[413, 'Payload too large'],
		[422, 'Item 1.md cannot be saved because its body contains a null byte'],
	])('should convert a %s error on put() to a rejectedByTarget error', async (httpCode, message) => {
		const driver = newDriver(() => {
			throw serverError(httpCode, message);
		});

		await expect(driver.put('1.md', 'content')).rejects.toMatchObject({
			code: 'rejectedByTarget',
			message,
		});
	});

	test('should not convert unrelated errors on put()', async () => {
		const driver = newDriver(() => {
			throw serverError(500, 'Internal server error');
		});

		// Such errors must keep bubbling up so that the sync is retried later
		await expect(driver.put('1.md', 'content')).rejects.toMatchObject({
			code: 500,
		});
	});

	test('should flag items rejected by the target in a multiPut() response', async () => {
		const driver = newDriver(() => ({
			items: {
				'1.md': { error: serverError(422, 'body contains a null byte') },
				'2.md': { error: serverError(500, 'Internal server error') },
				'3.md': {},
			},
		}));

		const output = await driver.multiPut([]);

		expect(output.items['1.md'].error.code).toBe('rejectedByTarget');
		expect(output.items['2.md'].error.code).toBe(500);
		expect(output.items['3.md'].error).toBeUndefined();
	});

});
