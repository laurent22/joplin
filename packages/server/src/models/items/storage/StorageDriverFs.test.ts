import { pathExists, remove } from 'fs-extra';
import { afterAllTests, beforeAllDb, beforeEachDb, expectNotThrow, expectThrow, tempDirPath } from '../../../utils/testing/testUtils';
import { StorageDriverConfig, StorageDriverType } from '../../../utils/types';
import StorageDriverFs from './StorageDriverFs';
import { shouldDeleteContent, shouldNotCreateItemIfContentNotSaved, shouldNotUpdateItemIfContentNotSaved, shouldWriteToContentAndReadItBack } from './testUtils';

let basePath_: string = '';

const newDriver = () => {
	return new StorageDriverFs(1, { path: basePath_ });
};

const newConfig = (): StorageDriverConfig => {
	return {
		type: StorageDriverType.Filesystem,
		path: basePath_,
	};
};

describe('StorageDriverFs', function() {

	beforeAll(async () => {
		await beforeAllDb('StorageDriverFs');
	});

	afterAll(async () => {
		await afterAllTests();
	});

	beforeEach(async () => {
		basePath_ = tempDirPath();
		await beforeEachDb();
	});

	afterEach(async () => {
		await remove(basePath_);
		basePath_ = '';
	});

	test('should write to content and read it back', async function() {
		await shouldWriteToContentAndReadItBack(newConfig());
	});

	test('should delete the content', async function() {
		await shouldDeleteContent(newConfig());
	});

	test('should not create the item if the content cannot be saved', async function() {
		await shouldNotCreateItemIfContentNotSaved(newConfig());
	});

	test('should not update the item if the content cannot be saved', async function() {
		await shouldNotUpdateItemIfContentNotSaved(newConfig());
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
