// Note that these tests require an S3 bucket to be set, with the credentials
// defined in the below config file. If the credentials are missing, all the
// tests are skipped.

import { afterAllTests, beforeAllDb, beforeEachDb, readCredentialFileSync } from '../../../utils/testing/testUtils';
import { StorageDriverConfig, StorageDriverMode, StorageDriverType } from '../../../utils/types';
import { shouldDeleteContent, shouldNotCreateItemIfContentNotSaved, shouldNotUpdateItemIfContentNotSaved, shouldSupportFallbackDriver, shouldSupportFallbackDriverInReadWriteMode, shouldThrowNotFoundIfNotExist, shouldUpdateContentStorageIdAfterSwitchingDriver, shouldWriteToContentAndReadItBack } from './testUtils';

let s3config_: StorageDriverConfig;
const s = readCredentialFileSync('server-s3-test-units.json', '');
if (s) {
	const parse: any = JSON.parse(s);
	if ('enabled' in parse && parse.enabled === false) {
		// disable S3 tests
	} else {
		delete parse.enabled;
		s3config_ = parse;
	}
}

const newConfig = (): StorageDriverConfig => {
	return {
		type: StorageDriverType.S3,
		...s3config_,
	};
};

const configIsSet = () => {
	return !!s3config_;
};

describe('StorageDriverS3', () => {

	beforeAll(async () => {
		if (!(configIsSet())) {
			return;
		} else {
			console.warn('Running S3 unit tests on live environment!');
			await beforeAllDb('StorageDriverS3');
		}
	});

	afterAll(async () => {
		if (!(configIsSet())) return;
		await afterAllTests();
	});

	beforeEach(async () => {
		if (!(configIsSet())) return;
		await beforeEachDb();
	});

	if (configIsSet()) {
		shouldWriteToContentAndReadItBack(newConfig());
		shouldDeleteContent(newConfig());
		shouldNotCreateItemIfContentNotSaved(newConfig());
		shouldNotUpdateItemIfContentNotSaved(newConfig());
		shouldSupportFallbackDriver(newConfig(), { type: StorageDriverType.Memory });
		shouldSupportFallbackDriverInReadWriteMode(newConfig(), { type: StorageDriverType.Memory, mode: StorageDriverMode.ReadAndWrite });
		shouldUpdateContentStorageIdAfterSwitchingDriver(newConfig(), { type: StorageDriverType.Memory });
		shouldThrowNotFoundIfNotExist(newConfig());
	} else {
		it('should pass', () => {});
	}

});
