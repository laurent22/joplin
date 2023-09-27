import SyncTargetRegistry from '../../../SyncTargetRegistry';

const shouldShowMissingPasswordWarning = (syncTargetId: number, settings: any) => {
	const syncTargetClass = SyncTargetRegistry.classById(syncTargetId);

	return syncTargetClass.requiresPassword() && !settings[`sync.${syncTargetId}.password`];
};

export default shouldShowMissingPasswordWarning;
