import { PluginManifest } from './types';

type ManifestSlice = Pick<PluginManifest, 'repository_url'|'homepage_url'>;
const getPluginIssueReportUrl = (pluginManifest: ManifestSlice): string|null => {
	const githubUrlExp = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/?]+)/;
	const gitlabUrlExp = /^https?:\/\/(?:www\.)?gitlab\.com\/([^/]+)\/([^/]+)/;

	let githubUrlMatch = null;
	let gitlabUrlMatch = null;
	const urls = [pluginManifest.repository_url, pluginManifest.homepage_url].filter(url => !!url);

	for (const url of urls) {
		githubUrlMatch ??= githubUrlExp.exec(url);
		gitlabUrlMatch ??= gitlabUrlExp.exec(url);
	}

	if (githubUrlMatch) {
		const organization = githubUrlMatch[1];
		// Some plugins include a trailing .git after the repository name
		const project = githubUrlMatch[2].replace(/\.git$/, '');
		return `https://github.com/${organization}/${project}/issues`;
	} else if (gitlabUrlMatch) {
		const organization = gitlabUrlMatch[1];
		const project = gitlabUrlMatch[2];
		return `https://gitlab.com/${organization}/${project}/-/issues`;
	}

	return null;
};

export default getPluginIssueReportUrl;
