import Setting from '../../models/Setting';

const isAutoMergeEnabled = () => {
	return Setting.value('sync.autoMergeConflicts');
};

export default isAutoMergeEnabled;
