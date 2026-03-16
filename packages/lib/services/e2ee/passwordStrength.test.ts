import { getPasswordStrength, passwordStrengthLabels } from './passwordStrength';

describe('e2ee/passwordStrength', () => {

	it('should return score 0 for an empty password', () => {
		const result = getPasswordStrength('');
		expect(result.score).toBe(0);
		expect(result.feedback.warning).toBe('');
		expect(result.feedback.suggestions).toEqual([]);
	});

	it('should return a low score for a very weak password', () => {
		const result = getPasswordStrength('password');
		expect(result.score).toBeLessThanOrEqual(1);
	});

	it('should return a low score for a short numeric password', () => {
		const result = getPasswordStrength('1234');
		expect(result.score).toBeLessThanOrEqual(1);
	});

	it('should return a higher score for a moderately complex password', () => {
		const result = getPasswordStrength('MyP@ssw0rd!');
		expect(result.score).toBeGreaterThanOrEqual(2);
	});

	it('should return a high score for a strong password', () => {
		const result = getPasswordStrength('j8$Kq!2mZx@pL9&vR');
		expect(result.score).toBeGreaterThanOrEqual(3);
	});

	it('should return feedback suggestions for weak passwords', () => {
		const result = getPasswordStrength('aaa');
		expect(result.feedback).toBeDefined();
		expect(typeof result.feedback.warning).toBe('string');
		expect(Array.isArray(result.feedback.suggestions)).toBe(true);
	});

	it('should have labels defined for all scores 0 through 4', () => {
		for (let i = 0; i <= 4; i++) {
			expect(passwordStrengthLabels[i]).toBeDefined();
			expect(typeof passwordStrengthLabels[i]).toBe('string');
		}
	});

});
