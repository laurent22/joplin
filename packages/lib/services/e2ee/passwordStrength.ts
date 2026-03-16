import zxcvbn = require('zxcvbn');

export interface PasswordStrengthResult {
	score: 0 | 1 | 2 | 3 | 4;
	feedback: {
		warning: string;
		suggestions: string[];
	};
}

export const passwordStrengthLabels: Record<number, string> = {
	0: 'Very Weak',
	1: 'Weak',
	2: 'Fair',
	3: 'Strong',
	4: 'Very Strong',
};

export const getPasswordStrength = (password: string): PasswordStrengthResult => {
	if (!password) {
		return {
			score: 0,
			feedback: {
				warning: '',
				suggestions: [],
			},
		};
	}

	const result = zxcvbn(password);
	return {
		score: result.score,
		feedback: {
			warning: result.feedback.warning || '',
			suggestions: result.feedback.suggestions || [],
		},
	};
};
