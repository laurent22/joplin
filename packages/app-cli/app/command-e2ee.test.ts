import { encryptionService, loadEncryptionMasterKey, setupDatabaseAndSynchronizer, switchClient, synchronizerStart, withWarningSilenced } from '@joplin/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
import Command = require('./command-e2ee');
import { formatPublicKeyFingerprint, generateKeyPairWithAlgorithm, ppkPublicKeyFingerprint } from '@joplin/lib/services/e2ee/ppk/ppk';
import { PublicKeyAlgorithm } from '@joplin/lib/services/e2ee/types';
import { localSyncInfo, saveLocalSyncInfo, setEncryptionEnabled } from '@joplin/lib/services/synchronizer/syncInfoUtils';
import Setting from '@joplin/lib/models/Setting';

const runSubcommand = async (subcommand: string) => {
	const stdout: string[] = [];
	const onStdout = (text: string) => {
		stdout.push(text);
	};

	const command = setupCommandForTesting(Command, onStdout);
	await command.action({
		command: subcommand,
		options: {},
	});
	return stdout.join('\n');
};

describe('command-e2ee', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();

		await loadEncryptionMasterKey();
		setEncryptionEnabled(true);
		Setting.setValue('encryption.masterPassword', '123456');
	});

	test('status subcommand should warn if the public-private key pair is invalid', async () => {
		const password = '123456';
		const ppk1 = await generateKeyPairWithAlgorithm(PublicKeyAlgorithm.RsaV2, encryptionService(), password);
		const ppk2 = await generateKeyPairWithAlgorithm(PublicKeyAlgorithm.RsaV2, encryptionService(), password);

		const syncInfo = localSyncInfo();
		syncInfo.ppk = {
			...ppk1,
			publicKey: ppk2.publicKey,
		};
		saveLocalSyncInfo(syncInfo);

		const statusLines = (await runSubcommand('status')).split('\n');

		expect(statusLines).toHaveLength(2);
		expect(statusLines[0]).toBe('Encryption is: Enabled');
		expect(statusLines[1]).toMatch(/^Invalid public-private key pair/);
	});

	test('public-key subcommand should print the public key fingerprint', async () => {
		expect(localSyncInfo().ppk).toBeFalsy();
		expect(await runSubcommand('public-key')).toBe('No public-private key pair.');

		// First sync should set up ppk
		await synchronizerStart();
		const ppk = localSyncInfo().ppk;
		expect(ppk).toBeTruthy();

		expect(await runSubcommand('public-key')).toBe(`Public key fingerprint: ${formatPublicKeyFingerprint(await ppkPublicKeyFingerprint(ppk))}`);
	});

	test('public-key subcommand should not print the fingerprint for an invalid key', async () => {
		await synchronizerStart();

		const syncInfo = localSyncInfo();
		syncInfo.ppk = {
			...syncInfo.ppk,
			publicKey: 'bad',
		};
		saveLocalSyncInfo(syncInfo);

		await withWarningSilenced(/Failed to get public key fingerprint/, async () => {
			expect(await runSubcommand('public-key')).toBe('Failed to get public key fingerprint: Key pair is not valid.');
		});
	});

});
