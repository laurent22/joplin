import Setting from '../../models/Setting';
import shim from '../../shim';
import { encryptionService, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import EncryptionService from '../e2ee/EncryptionService';
import NoteLockKey from './NoteLockKey';
import NoteLockService from './NoteLockService';
import NoteLockSession from './NoteLockSession';
import { promptForImportedNoteLockKey } from './noteLockPrompts';

const makePrompts = (passwords: (string|null)[]) => ({
	promptPassword: jest.fn(async () => passwords.shift() ?? null),
	goToNoteLockSetup: jest.fn(),
});

describe('noteLockPrompts', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		NoteLockService.destroyInstance();
		NoteLockSession.destroyInstance();
		NoteLockKey.destroyInstance();
		EncryptionService.instance_ = encryptionService();
		Setting.setValue('featureFlag.noteLock', true);
		shim.showConfirmationDialog = jest.fn(async () => true);
		shim.showErrorDialog = jest.fn(async () => {});
	});

	it('should not prompt for a backup of this profile while the session is unlocked', async () => {
		const key = await NoteLockKey.instance().create('local');
		await NoteLockSession.instance().unlock('local');
		const prompts = makePrompts([]);

		expect(await promptForImportedNoteLockKey(key, prompts)).toBeNull();
		expect(shim.showConfirmationDialog).not.toHaveBeenCalled();
	});

	it('should only unlock the session for a backup of this profile', async () => {
		const key = await NoteLockKey.instance().create('local');
		const prompts = makePrompts(['wrong', 'local']);

		expect(await promptForImportedNoteLockKey(key, prompts)).toBeNull();
		expect(NoteLockSession.instance().isUnlocked()).toBe(true);
		expect(prompts.promptPassword).toHaveBeenCalledTimes(2);
		expect(shim.showErrorDialog).toHaveBeenCalledWith('Invalid password');
	});

	it('should unlock the session, then decrypt the key of a backup from another profile', async () => {
		const backupKey = { ...await encryptionService().generateMasterKey('backup'), id: 'backup' };
		await NoteLockKey.instance().create('local');
		const prompts = makePrompts(['local', 'wrong', 'backup']);

		expect((await promptForImportedNoteLockKey(backupKey, prompts)).id).toBe(backupKey.id);
		expect(NoteLockSession.instance().isUnlocked()).toBe(true);
		expect(shim.showErrorDialog).toHaveBeenCalledTimes(1);
	});

	it('should offer the note lock setup when no password is set up', async () => {
		const backupKey = { ...await encryptionService().generateMasterKey('backup'), id: 'backup' };
		const prompts = makePrompts([]);

		expect(await promptForImportedNoteLockKey(backupKey, prompts)).toBeNull();
		expect(prompts.goToNoteLockSetup).toHaveBeenCalled();
		expect(prompts.promptPassword).not.toHaveBeenCalled();
	});

	it('should import unchanged when the user does not want to unlock', async () => {
		const key = await NoteLockKey.instance().create('local');
		shim.showConfirmationDialog = jest.fn(async () => false);
		const prompts = makePrompts([]);

		expect(await promptForImportedNoteLockKey(key, prompts)).toBeNull();
		expect(prompts.promptPassword).not.toHaveBeenCalled();
	});

});
