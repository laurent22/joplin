import Setting from '../../models/Setting';

// True when non-overlapping note changes should be merged automatically on a sync
// conflict.
const isAutoMergeEnabled = () => {
	return Setting.value('sync.autoMergeConflicts');
};

export default isAutoMergeEnabled;
