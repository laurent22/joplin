import { afterAllCleanUp, setupDatabaseAndSynchronizer, switchClient, fileApi } from './testing/test-utils';

describe('file-api-driver', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await fileApi().clearRoot();
	});

	afterAll(async () => {
		await afterAllCleanUp();
	});

	it('should create a file', (async () => {
		await fileApi().put('test.txt', 'testing');
		const content = await fileApi().get('test.txt');
		expect(content).toBe('testing');
	}));

	it('should get a file info', (async () => {
		await fileApi().put('test1.txt', 'testing');
		await fileApi().mkdir('sub');
		await fileApi().put('sub/test2.txt', 'testing');

		// Note: Although the stat object includes an "isDir" property, this is
		// not actually used by the synchronizer so not required by any sync
		// target.

		{
			const stat = await fileApi().stat('test1.txt');
			expect(stat.path).toBe('test1.txt');
			expect(!!stat.updated_time).toBe(true);
			expect(stat.isDir).toBe(false);
		}

		{
			const stat = await fileApi().stat('sub/test2.txt');
			expect(stat.path).toBe('sub/test2.txt');
			expect(!!stat.updated_time).toBe(true);
			expect(stat.isDir).toBe(false);
		}
	}));

	it('should create a file in a subdirectory', (async () => {
		await fileApi().mkdir('subdir');
		await fileApi().put('subdir/test.txt', 'testing');
		const content = await fileApi().get('subdir/test.txt');
		expect(content).toBe('testing');
	}));

	it('should list files', (async () => {
		await fileApi().mkdir('subdir');
		await fileApi().put('subdir/test1.txt', 'testing1');
		await fileApi().put('subdir/test2.txt', 'testing2');
		const files = await fileApi().list('subdir');
		expect(files.items.length).toBe(2);
		expect(files.items.map((f: any) => f.path).sort()).toEqual(['test1.txt', 'test2.txt'].sort());
	}));

	it('should delete a file', (async () => {
		await fileApi().put('test1.txt', 'testing1');
		await fileApi().delete('test1.txt');
		const files = await fileApi().list('');
		expect(files.items.length).toBe(0);
	}));

});
