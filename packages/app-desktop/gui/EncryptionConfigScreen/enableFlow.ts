interface OpenDialogInput {
	hasMasterPassword: boolean;
	masterPasswordDialogOpen: boolean;
}

interface ResumeEnableInput {
	pendingEnableEncryption: boolean;
	wasMasterPasswordDialogOpen: boolean;
	masterPasswordDialogOpen: boolean;
	masterPassword: string;
}

export const shouldOpenMasterPasswordDialogForEnable = ({ hasMasterPassword, masterPasswordDialogOpen }: OpenDialogInput) => {
	return !hasMasterPassword && !masterPasswordDialogOpen;
};

export const shouldResumeEnableAfterMasterPasswordDialog = ({ pendingEnableEncryption, wasMasterPasswordDialogOpen, masterPasswordDialogOpen, masterPassword }: ResumeEnableInput) => {
	return pendingEnableEncryption && wasMasterPasswordDialogOpen && !masterPasswordDialogOpen && !!masterPassword;
};

export const shouldCancelPendingEnableAfterMasterPasswordDialog = ({ pendingEnableEncryption, wasMasterPasswordDialogOpen, masterPasswordDialogOpen, masterPassword }: ResumeEnableInput) => {
	return pendingEnableEncryption && wasMasterPasswordDialogOpen && !masterPasswordDialogOpen && !masterPassword;
};
