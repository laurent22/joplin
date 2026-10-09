import Setting from '../../models/Setting';
import shim from '../../shim';
import { encryptionService, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import EncryptionService from '../e2ee/EncryptionService';
import NoteLockKey from './NoteLockKey';
import NoteLockService from './NoteLockService';
import NoteLockSession from './NoteLockSession';
import { promptForImportedNoteLockKey } from './noteLockPrompts';
import { ErrorCode } from '../../errors';

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
		shim.showErrorDialog = jest.fn(async () => {});
	});

	const otherBackupKey = async () => ({ ...await encryptionService().generateMasterKey('backup'), id: 'backup' });

	// Answers the dialogs in order: the "update them?" question (0 Yes, 1 No, 2 Cancel), then the setup question (0 Yes, 1 No).
	const answer = (...responses: number[]) => {
		shim.showMessageBox = jest.fn(async () => responses.shift());
	};

	it('should import a backup of this profile as it is, without any prompt', async () => {
		const key = await NoteLockKey.instance().create('local');
		answer(0);
		const prompts = makePrompts([]);

		expect(await promptForImportedNoteLockKey(key, prompts)).toBeNull();
		expect(shim.showMessageBox).not.toHaveBeenCalled();
		expect(prompts.promptPassword).not.toHaveBeenCalled();
	});

	it('should unlock the session, then decrypt the key of a backup from another profile', async () => {
		const backupKey = await otherBackupKey();
		await NoteLockKey.instance().create('local');
		answer(0);
		const prompts = makePrompts(['local', 'wrong', 'backup']);

		expect((await promptForImportedNoteLockKey(backupKey, prompts)).id).toBe(backupKey.id);
		expect(NoteLockSession.instance().isUnlocked()).toBe(true);
		expect(prompts.promptPassword).toHaveBeenNthCalledWith(1, 'Enter your current note lock password');
		expect(shim.showErrorDialog).toHaveBeenCalledTimes(1);
	});

	it('should import unchanged when the user does not want to update the notes', async () => {
		const backupKey = await otherBackupKey();
		await NoteLockKey.instance().create('local');
		answer(1);
		const prompts = makePrompts([]);

		expect(await promptForImportedNoteLockKey(backupKey, prompts)).toBeNull();
		expect(prompts.promptPassword).not.toHaveBeenCalled();
	});

	it.each([
		['the question', []],
		['the current password', [null]],
		['the backup password', ['local', null]],
	])('should cancel the import when %s is cancelled', async (_step, passwords: (string|null)[]) => {
		const backupKey = await otherBackupKey();
		await NoteLockKey.instance().create('local');
		answer(passwords.length ? 0 : 2);

		await expect(promptForImportedNoteLockKey(backupKey, makePrompts(passwords))).rejects.toMatchObject({ code: ErrorCode.Cancelled });
	});

	it.each([
		['opens the note lock setup', true],
		['does not', false],
	])('should cancel the import when no note lock key is set up and the user %s', async (_label, opensSetup) => {
		const backupKey = await otherBackupKey();
		answer(0, opensSetup ? 0 : 1);
		const prompts = makePrompts([]);

		await expect(promptForImportedNoteLockKey(backupKey, prompts)).rejects.toMatchObject({ code: ErrorCode.Cancelled });
		expect(prompts.goToNoteLockSetup).toHaveBeenCalledTimes(opensSetup ? 1 : 0);
		expect(prompts.promptPassword).not.toHaveBeenCalled();
	});

});
