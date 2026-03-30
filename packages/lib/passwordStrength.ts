import zxcvbn = require('zxcvbn');
import * as crypto from 'crypto';

export interface PasswordStrengthResult {
	score: number;
	label: 'Weak' | 'Fair' | 'Strong';
	suggestions: string[];
	ruleIssues: string[];
	isCompromised: boolean;
}

// 🔹 Helper: map score → label
function getLabelFromScore(score: number): 'Weak' | 'Fair' | 'Strong' {
	if (score <= 1) return 'Weak';
	if (score === 2) return 'Fair';
	return 'Strong';
}

export async function checkPasswordStrength(password: string): Promise<PasswordStrengthResult> {
	if (!password) {
		return {
			score: 0,
			label: 'Weak',
			suggestions: [],
			ruleIssues: [],
			isCompromised: false,
		};
	}

	const result = zxcvbn(password);

	// 🔹 POLICY CHECK (user-focused rules)
	const ruleIssues: string[] = [];

	if (password.length < 8) {
		ruleIssues.push('At least 8 characters');
	}

	const hasUpper = /[A-Z]/.test(password);
	if (!hasUpper) {
		ruleIssues.push('Add at least one uppercase letter');
	}

	const hasNumber = /[0-9]/.test(password);
	if (!hasNumber) {
		ruleIssues.push('Add at least one digit (0–9)');
	}

	const hasSymbol = /[^A-Za-z0-9]/.test(password);
	if (!hasSymbol) {
		ruleIssues.push('Add a symbol');
	}


	const label = getLabelFromScore(result.score);

	// 🔹 BREACH CHECK (k-anonymity)
	let isCompromised = false;

	try {
		const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
		const prefix = sha1.slice(0, 5);
		const suffix = sha1.slice(5);

		const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
		const text = await res.text();

		const lines = text.split('\n');
		for (const line of lines) {
			const [hashSuffix] = line.split(':');
			if (hashSuffix === suffix) {
				isCompromised = true;
				break;
			}
		}
	} catch {
		// Fail silently (UX-friendly)
	}

	return {
		score: result.score, // original score (for bar)
		label, // adjusted label (for UX)
		suggestions: result.feedback?.suggestions?.slice(0, 2) || [],
		ruleIssues,
		isCompromised,
	};
}
