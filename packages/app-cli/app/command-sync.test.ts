import { encryptionService, loadEncryptionMasterKey, msleep, setupDatabaseAndSynchronizer, switchClient, syncTargetId, withWarningSilenced } from '@joplin/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
import ShareService from '@joplin/lib/services/share/ShareService';
import BaseItem from '@joplin/lib/models/BaseItem';
import Command = require('./command-sync');
import { loadMasterKeysFromSettings, resolveE2eeEnabledStateConflict, setupAndEnableEncryption } from '@joplin/lib/services/e2ee/utils';
import { fetchSyncInfo, uploadSyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import { cliUtils } from './cli-utils';
import { reg } from '@joplin/lib/registry';

const setUpCommand = () => {
	const output: string[] = [];
	const stdout = (content: string) => {
		output.push(...content.split('\n'));
	};
	cliUtils.setStdout(stdout);

	const command = setupCommandForTesting(Command, stdout);
	return {
		command,
		output,
	};
};

describe('command-sync', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();
		BaseItem.shareService_ = ShareService.instance();
	});

	it('should prompt the user when E2EE is disabled remotely', async () => {
		const masterKey = await loadEncryptionMasterKey();
		await setupAndEnableEncryption(encryptionService(), masterKey, '11111');
		await loadMasterKeysFromSettings(encryptionService());

		const synchronize = async () => {
			const { command, output } = setUpCommand();
			await command.action({ options: {} });
			return output.join('\n');
		};
		await synchronize();

		const synchronizer = await reg.syncTarget(syncTargetId()).synchronizer();

		await msleep(1);
		const remoteInfo = await fetchSyncInfo(synchronizer.api());
		remoteInfo.e2ee = false;
		await uploadSyncInfo(synchronizer.api(), remoteInfo);
		await msleep(1);

		const requestReEnableRegex = /Encryption has been disabled remotely: Run either "e2ee disable" .* or "e2ee re-enable"/i;
		await withWarningSilenced(/There was some errors|E2EE conflict/, async () => {
			expect(await synchronize()).toMatch(requestReEnableRegex);
		});

		// Should not display the message after resolving the conflict
		await resolveE2eeEnabledStateConflict(encryptionService(), true, jest.fn());
		expect(await synchronize()).not.toMatch(requestReEnableRegex);
	});
});

