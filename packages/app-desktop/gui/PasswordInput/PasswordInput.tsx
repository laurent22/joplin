import * as React from 'react';
import { useState, useCallback } from 'react';
import StyledInput from '../style/StyledInput';
import { _ } from '@joplin/lib/locale';
import { ChangeEventHandler } from './types';

interface Props {
	value: string;
	inputId: string;
	onChange: ChangeEventHandler;

	'aria-invalid'?: boolean;
	'aria-errormessage'?: string;
}

const PasswordInput = (props: Props) => {
	const [showPassword, setShowPassword] = useState(false);

	const inputType = showPassword ? 'text' : 'password';
	const icon = showPassword ? 'far fa-eye-slash' : 'far fa-eye';
	const title = showPassword ? _('Hide password') : _('Show password');

	const onShowPassword = useCallback(() => {
		setShowPassword(current => !current);
	}, []);

	return (
		<div className="password-input">
			<StyledInput
				id={props.inputId}
				aria-errormessage={props['aria-errormessage']}
				aria-invalid={props['aria-invalid']}
				className="field"
				type={inputType}
				value={props.value}
				onChange={props.onChange}
			/>
			<button onClick={onShowPassword} className="showpasswordbutton">
				<i className={icon} role='img' aria-label={title} title={title}></i>
			</button>
		</div>
	);
};

export default PasswordInput;
