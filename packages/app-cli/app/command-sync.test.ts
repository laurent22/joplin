import { encryptionService, loadEncryptionMasterKey, msleep, setupDatabaseAndSynchronizer, switchClient, syncTargetId, withWarningSilenced } from '@joplin/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
import ShareService from '@joplin/lib/services/share/ShareService';
import BaseItem from '@joplin/lib/models/BaseItem';
import Command = require('./command-sync');
import { loadMasterKeysFromSettings, resolveE2eeEnabledStateConflict, setupAndEnableEncryption } from '@joplin/lib/services/e2ee/utils';
import { fetchSyncInfo, uploadSyncInfo } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
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
		reg.resetSyncTarget();

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

	it('should list items held back from a plaintext upload', async () => {
		const masterKey = await loadEncryptionMasterKey();
		await setupAndEnableEncryption(encryptionService(), masterKey, '11111');
		await loadMasterKeysFromSettings(encryptionService());

		const note = await Note.save({ title: 'published\nnote', is_shared: 1, parent_id: (await Folder.save({})).id });

		const { command, output } = setUpCommand();
		await command.action({ options: {} });

		expect(output).toContain('/!\\ Publishing is turned off while end-to-end encryption is on: 1 change wasn\'t uploaded.');
		expect(output).toContain(`  Note: "published note" (${note.id}): Published note`);
		expect(output).toContain('To upload them, run "config encryption.allowUnencryptedUploads true". Only do this if you use published notes or unencrypted shared notebooks.');
	});
});

