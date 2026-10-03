import { _ } from '../../locale';
import shim from '../../shim';
import { MasterKeyEntity } from '../e2ee/types';
import NoteLockKey, { DecryptedNoteLockKey } from './NoteLockKey';
import NoteLockSession from './NoteLockSession';

// Shared by desktop and mobile, which each supply their own password prompt and settings navigation.
export interface NoteLockPrompts {
	promptPassword: (label: string)=> Promise<string|null>;
	goToNoteLockSetup: ()=> void;
}

const promptNoteLockSetup = async (prompts: NoteLockPrompts) => {
	if (await shim.showConfirmationDialog(_('Unlocking these notes requires the note lock password, which has not been set up yet. Set it up now?'))) {
		prompts.goToNoteLockSetup();
	}
};

// Returns false when the user cancels or has no note lock password to unlock with.
export const unlockNoteLockSession = async (prompts: NoteLockPrompts) => {
	if (!NoteLockKey.instance().load()) {
		await promptNoteLockSetup(prompts);
		return false;
	}

	while (!NoteLockSession.instance().isUnlocked()) {
		const password = await prompts.promptPassword(_('Enter your note lock password'));
		if (!password) return false;
		try {
			await NoteLockSession.instance().unlock(password);
		} catch {
			await shim.showErrorDialog(_('Invalid password'));
		}
	}
	return true;
};

// Returns the backup's key decrypted, to re-encrypt its locked notes for this profile, or null to import them unchanged.
export const promptForImportedNoteLockKey = async (backupKey: MasterKeyEntity, prompts: NoteLockPrompts): Promise<DecryptedNoteLockKey|null> => {
	const sameKey = backupKey.id === NoteLockKey.instance().load()?.id;
	if (sameKey && NoteLockSession.instance().isUnlocked()) return null;

	if (!await shim.showConfirmationDialog(_('This backup contains locked notes. Would you like to unlock them?'))) return null;
	if (!await unlockNoteLockSession(prompts) || sameKey) return null;

	while (true) {
		const password = await prompts.promptPassword(_('Enter the note lock password the backup was created with'));
		if (!password) return null;
		try {
			return await NoteLockKey.instance().decrypt(password, backupKey);
		} catch {
			await shim.showErrorDialog(_('Invalid password'));
		}
	}
};
