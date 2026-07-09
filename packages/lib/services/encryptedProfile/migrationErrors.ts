import { _ } from '../../locale';

export default (error: string) => {
	if (error.includes('Encrypted database verification failed')) {
		return _('Encrypted profile migration could not verify the encrypted database. Your original database.sqlite was restored from the backup.');
	}
	if (error.includes('Wrong key unexpectedly opened encrypted database')) {
		return _('Encrypted profile migration failed a security check. Your original database.sqlite was restored from the backup.');
	}
	if (error.includes('Database file does not exist')) {
		return _('Encrypted profile migration could not find database.sqlite in this profile.');
	}
	if (error.includes('No pending encrypted profile migration')) {
		return _('Encrypted profile migration is not scheduled for this profile.');
	}
	return _('Encrypted profile migration failed: %s. Your original database.sqlite was restored when possible.', error);
};
