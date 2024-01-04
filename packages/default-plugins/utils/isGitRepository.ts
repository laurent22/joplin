import { GitSourceData, PluginSource } from '../types';

const isGitRepositoy = (source: PluginSource): source is GitSourceData => {
	return (source as any).cloneUrl !== undefined;
};
export default isGitRepositoy;
