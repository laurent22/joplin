import { databaseSchema } from '../../database/types';
import validateField from './validateField';

describe('validateField', () => {
	it('should allow all fields used in the Joplin database', () => {
		for (const tableName in databaseSchema) {
			for (const fieldName in databaseSchema[tableName]) {
				expect(validateField(fieldName)).toBe(fieldName);
			}
		}
	});

	it('should disallow fields containing quotes and/or spaces', () => {
		expect(() => validateField('test test')).toThrow();
		expect(() => validateField('"TEST"')).toThrow();
	});
});
