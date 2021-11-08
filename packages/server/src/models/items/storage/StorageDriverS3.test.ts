// Note that these tests require an S3 bucket to be set, with the credentials
// defined in the below config file. If the credentials are missing, all the
// tests are skipped.

import { afterAllTests, beforeAllDb, beforeEachDb, expectNotThrow, expectThrow, readCredentialFile } from '../../../utils/testing/testUtils';
import { StorageDriverType } from '../../../utils/types';
import StorageDriverS3 from './StorageDriverS3';
import { shouldDeleteContent, shouldNotCreateItemIfContentNotSaved, shouldNotUpdateItemIfContentNotSaved, shouldWriteToContentAndReadItBack } from './testUtils';

const s3Config = async () => {
	const s = await readCredentialFile('server-s3-test-units.json', '');
	if (!s) return null;
	return JSON.parse(s);
};

const newDriver = async () => {
	return new StorageDriverS3(1, {
		type: StorageDriverType.S3,
		...await s3Config(),
	});
};

const configIsSet = async () => {
	const c = await s3Config();
	return !!c;
};

describe('StorageDriverS3', function() {

	beforeAll(async () => {
		if (!(await configIsSet())) {
			return;
		} else {
			console.warn('Running S3 unit tests on live environment!');
			await beforeAllDb('StorageDriverS3');
		}
	});

	afterAll(async () => {
		if (!(await configIsSet())) return;
		await afterAllTests();
	});

	beforeEach(async () => {
		if (!(await configIsSet())) return;
		await beforeEachDb();
	});

	test('should write to content and read it back', async function() {
		if (!(await configIsSet())) return;
		const driver = await newDriver();
		await shouldWriteToContentAndReadItBack(driver);
	});

	test('should delete the content', async function() {
		if (!(await configIsSet())) return;
		const driver = await newDriver();
		await shouldDeleteContent(driver);
	});

	test('should not create the item if the content cannot be saved', async function() {
		if (!(await configIsSet())) return;
		const driver = await newDriver();
		await shouldNotCreateItemIfContentNotSaved(driver);
	});

	test('should not update the item if the content cannot be saved', async function() {
		if (!(await configIsSet())) return;
		const driver = await newDriver();
		await shouldNotUpdateItemIfContentNotSaved(driver);
	});

	test('should fail if the item row does not exist', async function() {
		if (!(await configIsSet())) return;
		const driver = await newDriver();
		await expectThrow(async () => driver.read('oops'));
	});

	test('should do nothing if deleting non-existing row', async function() {
		if (!(await configIsSet())) return;
		const driver = await newDriver();
		await expectNotThrow(async () => driver.delete('oops'));
	});

});
