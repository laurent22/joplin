import { execCommand } from '@joplin/utils';

const getCurrentCommitHash = async () => {
	return (await execCommand(['git', 'rev-parse', '--verify', 'HEAD^{commit}'])).trim();
};

export default getCurrentCommitHash;
