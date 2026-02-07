import SyncTargetRegistry from '../../../SyncTargetRegistry';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const shouldShowMissingPasswordWarning = (syncTargetId: number, settings: any) => {
	const syncTargetClass = SyncTargetRegistry.classById(syncTargetId);

	// For sync targets that support OIDC auth, password is not required when using OIDC
	const authType = settings[`sync.${syncTargetId}.authType`];
	if (authType === 'oidc') {
		return false;
	}

	return syncTargetClass.requiresPassword() && !settings[`sync.${syncTargetId}.password`];
};

export default shouldShowMissingPasswordWarning;
