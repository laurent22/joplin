import { shouldCancelPendingEnableAfterMasterPasswordDialog, shouldOpenMasterPasswordDialogForEnable, shouldResumeEnableAfterMasterPasswordDialog } from './enableFlow';

describe('enableFlow', () => {
	test('opens the master password dialog when enabling encryption without a stored master password', () => {
		expect(shouldOpenMasterPasswordDialogForEnable({
			hasMasterPassword: false,
			masterPasswordDialogOpen: false,
		})).toBe(true);
	});

	test('does not reopen the master password dialog if it is already open', () => {
		expect(shouldOpenMasterPasswordDialogForEnable({
			hasMasterPassword: false,
			masterPasswordDialogOpen: true,
		})).toBe(false);
	});

	test('does not open the master password dialog when a master password already exists', () => {
		expect(shouldOpenMasterPasswordDialogForEnable({
			hasMasterPassword: true,
			masterPasswordDialogOpen: false,
		})).toBe(false);
	});

	test('resumes enabling encryption after the dialog closes with a saved password', () => {
		expect(shouldResumeEnableAfterMasterPasswordDialog({
			pendingEnableEncryption: true,
			wasMasterPasswordDialogOpen: true,
			masterPasswordDialogOpen: false,
			masterPassword: 'new-password',
		})).toBe(true);
	});

	test('cancels the pending enable flow if the dialog closes without a password', () => {
		expect(shouldCancelPendingEnableAfterMasterPasswordDialog({
			pendingEnableEncryption: true,
			wasMasterPasswordDialogOpen: true,
			masterPasswordDialogOpen: false,
			masterPassword: '',
		})).toBe(true);
	});

	test('does not resume while the dialog is still open', () => {
		expect(shouldResumeEnableAfterMasterPasswordDialog({
			pendingEnableEncryption: true,
			wasMasterPasswordDialogOpen: true,
			masterPasswordDialogOpen: true,
			masterPassword: 'new-password',
		})).toBe(false);
	});
});
