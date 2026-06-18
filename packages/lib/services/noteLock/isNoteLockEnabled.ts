import Setting, { Env } from '../../models/Setting';

const isNoteLockEnabled = () => {
	return Setting.value('env') === Env.Dev;
};

export default isNoteLockEnabled;
