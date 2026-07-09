import formatEncryptedProfileMigrationError from './migrationErrors';

describe('EncryptedProfile migration errors', () => {
	it('maps known migration failures to user-facing messages', () => {
		expect(formatEncryptedProfileMigrationError('Encrypted database verification failed.')).toContain('restored');
		expect(formatEncryptedProfileMigrationError('Wrong key unexpectedly opened encrypted database.')).toContain('security check');
		expect(formatEncryptedProfileMigrationError('Database file does not exist.')).toContain('could not find database.sqlite');
	});
});
