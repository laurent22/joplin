import shim from '../../../shim';
import { _ } from '../../../locale';
const { useCallback, useEffect, useState } = shim.react();

// WebCrypto reports a wrong password as an OperationError with an unhelpful generic message
export const noteLockPasswordErrorMessage = (error: unknown) => {
	if (!(error instanceof Error)) return String(error);
	if (error.name === 'OperationError') return _('Invalid password');
	return error.message;
};

export enum ActionMode {
	Collapsed = 'collapsed',
	Create = 'create',
	Change = 'change',
	Reset = 'reset',
}

const useNoteLockMode = (hasKey: boolean) => {
	const [mode, setMode] = useState<ActionMode>(hasKey ? ActionMode.Collapsed : ActionMode.Create);
	const [currentPassword, setCurrentPassword] = useState('');
	const [password, setPassword] = useState('');
	const [passwordRepeat, setPasswordRepeat] = useState('');
	const [error, setError] = useState('');
	const [saving, setSaving] = useState(false);

	const clearForm = useCallback(() => {
		setCurrentPassword('');
		setPassword('');
		setPasswordRepeat('');
		setError('');
	}, []);

	const onModeChange = useCallback((newMode: ActionMode) => {
		setMode(newMode);
		clearForm();
	}, [clearForm]);

	// The key can also appear or disappear through sync while this screen is open;
	// clear any drafted input along with the mode switch.
	useEffect(() => {
		if (hasKey && mode === ActionMode.Create) onModeChange(ActionMode.Collapsed);
		if (!hasKey && mode !== ActionMode.Create) onModeChange(ActionMode.Create);
	}, [hasKey, mode, onModeChange]);

	const passwordMismatch = !!passwordRepeat && password !== passwordRepeat;
	const canSave = !!password && !!passwordRepeat && !passwordMismatch && !saving && (mode !== ActionMode.Change || !!currentPassword);

	const forgotPasswordDescription = _('Only do this if you\'ve forgotten your current password. A new password will be created, and any notes locked with the old one will become permanently unreadable.');
	const resetPasswordTitle = `⚠️ ${_('Reset password')} ⚠️`;
	// The sync advice only applies to a first setup, where there may be nothing to lose yet.
	const passwordReminder = mode === ActionMode.Create ?
		_('Please make sure you remember your password. It cannot be recovered if lost, and any locked notes will become inaccessible. If you have already set up the note lock password on another device, there is no need to set it again, as the information required to access your locked notes is updated when you set up sync.') :
		_('Please make sure you remember your password. It cannot be recovered if lost, and any locked notes will become inaccessible.');

	let title = _('Password setup');
	if (mode === ActionMode.Reset) title = resetPasswordTitle;
	if (mode === ActionMode.Change) title = _('Change note lock password');
	if (mode === ActionMode.Collapsed) title = _('Manage password');

	return {
		mode,
		onModeChange,
		currentPassword,
		setCurrentPassword,
		password,
		setPassword,
		passwordRepeat,
		setPasswordRepeat,
		error,
		setError,
		saving,
		setSaving,
		passwordMismatch,
		canSave,
		forgotPasswordDescription,
		resetPasswordTitle,
		passwordReminder,
		title,
	};
};

export default useNoteLockMode;
