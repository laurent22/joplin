import { rtrimSlashes } from '@joplin/lib/path-utils';

function removeBranch(commit: string): string {
	if (!commit) return '';

	if (commit.indexOf(':') >= 0) {
		const s = commit.split(':');
		return s[1];
	}

	return commit;
}

const formatRepoUrl = (url: string): string => {
	if (!url) return url;
	if (url.endsWith('.git')) return url.substring(0, url.length - 4);
	return url;
};

export default function(manifest: any, previousManifest: any = null): string {
	// "repository_url": "https://github.com/JackGruber/joplin-plugin-copytags",
	// "_publish_commit": "master:b52b01f6d3b709a811ac214253636a7c207c87dd",

	// https://github.com/JackGruber/joplin-plugin-copytags/compare/9ec4a476a54440ac43422c34e179dcabfca1e5a0..b52b01f6d3b709a811ac214253636a7c207c87dd

	const repoUrl: string = formatRepoUrl(manifest.repository_url);
	const commit: string = removeBranch(manifest._publish_commit);
	const previousCommit: string = previousManifest ? removeBranch(previousManifest._publish_commit) : '';

	if (!repoUrl) return null;
	if (!commit && !previousCommit) return repoUrl;
	if (commit && !previousCommit) return `${rtrimSlashes(repoUrl)}/tree/${commit}`;

	return `${rtrimSlashes(repoUrl)}/compare/${previousCommit}..${commit}`;
}
