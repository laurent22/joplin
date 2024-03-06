import { GitSourceData, PluginSource } from '../types';

const isGitRepository = (source: PluginSource): source is GitSourceData => {
	return (source as any).cloneUrl !== undefined;
};
export default isGitRepository;
