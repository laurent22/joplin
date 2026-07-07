import Setting from '../../models/Setting';

const isNoteLockEnabled = () => {
	return Setting.value('featureFlag.noteLock');
};

export default isNoteLockEnabled;
