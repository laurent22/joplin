import { useState, useCallback } from 'react';
import StyledInput from '../style/StyledInput';
import { _ } from '@joplin/lib/locale';

export interface ChangeEvent {
	value: string;
}

type ChangeEventHandler = (event: ChangeEvent)=> void;

interface Props {
	value: string;
	onChange: ChangeEventHandler;
}

export const PasswordInput = (props: Props) => {
	const [showPassword, setShowPassword] = useState(false);

	const inputType = showPassword ? 'text' : 'password';
	const icon = showPassword ? 'far fa-eye-slash' : 'far fa-eye';
	const title = showPassword ? _('Hide password') : _('Show password');

	const onShowPassword = useCallback(() => {
		setShowPassword(current => !current);
	}, []);

	return (
		<div className="password-input">
			<StyledInput className="field" type={inputType} value={props.value} onChange={props.onChange}/>
			<button onClick={onShowPassword} className="showpasswordbutton">
				<i className={icon} role='img' aria-label={title} title={title}></i>
			</button>
		</div>
	);
};
