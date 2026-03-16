import * as React from 'react';
import { _ } from '@joplin/lib/locale';

interface Props {
	password: string;
}

const PasswordStrengthIndicator: React.FC<Props> = (props: Props) => {
	const { password } = props;

	const calculateStrength = (passwd: string): number => {
		if (!passwd) return -1;
		let score = 0;
		if (passwd.length >= 8) score += 1;
		if (passwd.match(/[a-z]/) && passwd.match(/[A-Z]/)) score += 1;
		if (passwd.match(/[0-9]/)) score += 1;
		if (passwd.match(/[^a-zA-Z0-9]/)) score += 1;
		// Map score from 0-4 to a 0-3 range for UI classes
		return Math.min(Math.max(score - 1, 0), 3);
	};

	const strength = calculateStrength(password);

	if (strength === -1) {
		return null; // Don't show if password is empty
	}

	const getStrengthLabel = (str: number) => {
		switch (str) {
		case 0: return _('Weak');
		case 1: return _('Fair');
		case 2: return _('Good');
		case 3: return _('Strong');
		default: return '';
		}
	};

	return (
		<div className='password-strength-indicator'>
			<div className='strength-meter'>
				<div className={`strength-bar strength-${strength}`}></div>
			</div>
			<span className='strength-label'>{getStrengthLabel(strength)}</span>
		</div>
	);
};

export default PasswordStrengthIndicator;
