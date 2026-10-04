import Setting from '../../models/Setting';

// Controls the whole conflict resolution feature. Use this wherever the UI
// or related code should stay hidden until the feature is ready.
const isConflictResolutionEnabled = () => {
	return Setting.value('featureFlag.conflictResolution');
};

export default isConflictResolutionEnabled;
