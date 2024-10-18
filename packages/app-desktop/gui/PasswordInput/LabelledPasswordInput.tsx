import * as React from 'react';
import PasswordInput from './PasswordInput';
import { useId } from 'react';
import { ChangeEventHandler } from './types';
import { _ } from '@joplin/lib/locale';

interface Props {
	labelText: string;
	value: string;
	onChange: ChangeEventHandler;
	valid?: boolean;
}

const LabelledPasswordInput: React.FC<Props> = props => {
	const inputId = useId();
	const statusIconId = useId();

	const canRenderStatusIcon = (props.valid ?? null) !== null && props.value;
	const renderStatusIcon = () => {
		if (!canRenderStatusIcon) return null;
		let title, classNames;
		if (props.valid) {
			title = _('Valid');
			classNames = 'fas fa-check -valid';
		} else {
			title = _('Invalid');
			classNames = 'fas fa-times -invalid';
		}
		return <i
			className={`password-status-icon ${classNames}`}
			id={statusIconId}

			role='img'
			aria-label={title}
			title={title}

			aria-live='polite'
		></i>;
	};

	return <div className='labelled-password-input form-input-group'>
		<label htmlFor={inputId}>{props.labelText}</label>
		<div className='password'>
			<PasswordInput
				inputId={inputId}
				aria-invalid={canRenderStatusIcon ? !props.valid : undefined}
				aria-errormessage={canRenderStatusIcon ? statusIconId : undefined}
				value={props.value}
				onChange={props.onChange}
			/>
			{renderStatusIcon()}
		</div>
	</div>;
};

export default LabelledPasswordInput;
