import SyncTargetRegistry from '../../../SyncTargetRegistry';

const shouldShowMissingPasswordWarning = (syncTargetId: number, settings: any) => {
	// List of sync targets that expect a non-empty password setting
	const targetsExpectingPassword = [
		'webdav', 'nextcloud', 'amazon_s3', 'joplinServer', 'joplinCloud',
	].map(name => SyncTargetRegistry.nameToId(name));

	const expectsPassword = targetsExpectingPassword.includes(syncTargetId);
	return expectsPassword && settings[`sync.${syncTargetId}.password`] === '';
};

export default shouldShowMissingPasswordWarning;
