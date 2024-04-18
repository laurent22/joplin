import SyncTargetRegistry from '../../../SyncTargetRegistry';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const shouldShowMissingPasswordWarning = (syncTargetId: number, settings: any) => {
	const syncTargetClass = SyncTargetRegistry.classById(syncTargetId);

	return syncTargetClass.requiresPassword() && !settings[`sync.${syncTargetId}.password`];
};

export default shouldShowMissingPasswordWarning;
