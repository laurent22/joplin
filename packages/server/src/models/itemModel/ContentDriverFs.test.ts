import { pathExists, remove } from 'fs-extra';
import { expectNotThrow, expectThrow, tempDirPath } from '../../utils/testing/testUtils';
import ContentDriverFs from './ContentDriverFs';

let basePath_: string = '';

const newDriver = () => {
	return new ContentDriverFs({ basePath: basePath_ });
};

describe('ContentDriverFs', function() {

	beforeEach(async () => {
		basePath_ = tempDirPath();
	});

	afterEach(async () => {
		await remove(basePath_);
		basePath_ = '';
	});

	test('should write to a file and read it back', async function() {
		const driver = newDriver();
		await driver.write('testing', Buffer.from('testing'));
		const content = await driver.read('testing');
		expect(content.toString()).toBe('testing');
	});

	test('should automatically create the base path', async function() {
		expect(await pathExists(basePath_)).toBe(false);
		const driver = newDriver();
		await driver.write('testing', Buffer.from('testing'));
		expect(await pathExists(basePath_)).toBe(true);
	});

	test('should delete a file', async function() {
		const driver = newDriver();
		await driver.write('testing', Buffer.from('testing'));
		expect((await driver.read('testing')).toString()).toBe('testing');
		await driver.delete('testing');
		await expectThrow(async () => driver.read('testing'), 'ENOENT');
	});

	test('should throw if the file does not exist when reading it', async function() {
		const driver = newDriver();
		await expectThrow(async () => driver.read('testread'), 'ENOENT');
	});

	test('should not throw if deleting a file that does not exist', async function() {
		const driver = newDriver();
		await expectNotThrow(async () => driver.delete('notthere'));
	});

});
