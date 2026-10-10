import { _ } from '../../locale';
import JoplinError from '../../JoplinError';
import { ErrorCode } from '../../errors';
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
	const answer = await shim.showMessageBox(_('A note lock key is required to update these notes, but hasn\'t been set up yet on your profile. Would you like to set one up now?'), {
		buttons: [_('Yes'), _('No')],
		cancelId: 1,
	});
	if (answer === 0) {
		prompts.goToNoteLockSetup();
	}
};

const cancelled = () => new JoplinError('Cancelled', ErrorCode.Cancelled);

// Returns false when the user cancels or has no note lock password to unlock with.
export const unlockNoteLockSession = async (prompts: NoteLockPrompts) => {
	if (!NoteLockKey.instance().load()) {
		await promptNoteLockSetup(prompts);
		return false;
	}

	while (!NoteLockSession.instance().isUnlocked()) {
		const password = await prompts.promptPassword(_('Enter your current note lock password'));
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
// Throws a cancelled error when the user cancels any step, so the whole import stops.
export const promptForImportedNoteLockKey = async (backupKey: MasterKeyEntity, prompts: NoteLockPrompts): Promise<DecryptedNoteLockKey|null> => {
	// Already under the profile's key, so the notes need no update.
	if (backupKey.id === NoteLockKey.instance().load()?.id) return null;

	const answer = await shim.showMessageBox(_('This backup contains notes locked with a different key. They must be updated now to use your current key, or they\'ll remain inaccessible and cannot be updated later. Would you like to update them?'), {
		buttons: [_('Yes'), _('No'), _('Cancel')],
		cancelId: 2,
	});
	if (answer === 1) return null;
	if (answer !== 0) throw cancelled();
	if (!await unlockNoteLockSession(prompts)) throw cancelled();

	while (true) {
		const password = await prompts.promptPassword(_('Enter the note lock password the backup was created with'));
		if (!password) throw cancelled();
		try {
			return await NoteLockKey.instance().decrypt(password, backupKey);
		} catch {
			await shim.showErrorDialog(_('Invalid password'));
		}
	}
};
