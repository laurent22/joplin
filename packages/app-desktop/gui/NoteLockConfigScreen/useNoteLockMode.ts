import { useCallback, useEffect, useState } from 'react';

export enum ActionMode {
	Create = 'create',
	Change = 'change',
	Reset = 'reset',
}

const useNoteLockMode = (hasKey: boolean) => {
	const [mode, setMode] = useState<ActionMode>(hasKey ? ActionMode.Change : ActionMode.Create);
	const [currentPassword, setCurrentPassword] = useState('');
	const [password, setPassword] = useState('');
	const [passwordRepeat, setPasswordRepeat] = useState('');
	const [error, setError] = useState('');

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
		if (hasKey && mode === ActionMode.Create) onModeChange(ActionMode.Change);
		if (!hasKey && mode !== ActionMode.Create) onModeChange(ActionMode.Create);
	}, [hasKey, mode, onModeChange]);

	return {
		mode,
		onModeChange,
		clearForm,
		currentPassword,
		setCurrentPassword,
		password,
		setPassword,
		passwordRepeat,
		setPasswordRepeat,
		error,
		setError,
	};
};

export default useNoteLockMode;
