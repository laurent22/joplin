import SyncTargetRegistry from '../../../SyncTargetRegistry';
import shouldShowMissingPasswordWarning from './shouldShowMissingPasswordWarning';

// Maps targets to whether each target requires a password.
// A subset of all sync targets.
const targetToRequiresPassword: Record<string, boolean> = {
	'nextcloud': true,
	'webdav': true,
	'amazon_s3': true,
	'joplinServer': true,
	'joplinCloud': true,
	'onedrive': false,
	'dropbox': false,
};

describe('shouldShowMissingPasswordWarning', () => {
	it('should return true when sync target requires a password and the password is missing', () => {
		for (const targetName in targetToRequiresPassword) {
			const targetId = SyncTargetRegistry.nameToId(targetName);
			const expected = targetToRequiresPassword[targetName];

			expect(shouldShowMissingPasswordWarning(targetId, {})).toBe(expected);

			// Should also consider an empty string to be missing
			const settings = {
				[`sync.${targetId}.password`]: '',
			};
			expect(shouldShowMissingPasswordWarning(targetId, settings)).toBe(expected);
		}
	});

	it('should return false when a password is present', () => {
		for (const targetName in targetToRequiresPassword) {
			const targetId = SyncTargetRegistry.nameToId(targetName);
			const settings = {
				[`sync.${targetId}.password`]: 'some nonempty',
			};

			expect(shouldShowMissingPasswordWarning(targetId, settings)).toBe(false);
		}
	});
});
