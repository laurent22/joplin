import { pathExists } from 'fs-extra';
import { readFile, writeFile } from 'fs/promises';
import { gitHubLatestReleases, gitHubLinkify } from './tool-utils';
import { config, createPost, createTopic, getForumTopPostByExternalId, getTopicByExternalId, updatePost } from './utils/discourse';
import * as compareVersions from 'compare-versions';
import dayjs = require('dayjs');

interface State {
	processedReleases: Record<string, any>;
}

const stateFilePath = `${__dirname}/postPreReleasesToForum.json`;
const betaCategoryId = 10;

const loadState = async (): Promise<State> => {
	if (await pathExists(stateFilePath)) {
		const content = await readFile(stateFilePath, 'utf-8');
		return JSON.parse(content) as State;
	}
	return {
		processedReleases: {},
	};
};

const saveState = async (state: State) => {
	await writeFile(stateFilePath, JSON.stringify(state), 'utf-8');
};

const getMinorVersion = (fullVersion: string) => {
	const s = fullVersion.substring(1).split('.');
	return `${s[0]}.${s[1]}`;
};

const main = async () => {
	const argv = require('yargs').argv;
	config.key = argv._[0];
	config.username = argv._[1];

	const state = await loadState();
	const releases = await gitHubLatestReleases(1, 50);

	releases.sort((a, b) => {
		return compareVersions(a.tag_name, b.tag_name) <= 0 ? -1 : +1;
	});

	const startFromVersion = '2.13';

	for (const release of releases) {
		const minorVersion = getMinorVersion(release.tag_name);

		if (compareVersions(startFromVersion, minorVersion) > 0) continue;

		if (!state.processedReleases[release.tag_name]) {
			console.info(`Processing release ${release.tag_name}`);

			const externalId = `prerelease-${minorVersion.replace(/\./g, '-')}`;

			const postBody = `## [${release.tag_name}](${release.html_url})\n\n${gitHubLinkify(release.body)}`;

			let topic = await getTopicByExternalId(externalId);

			const topicTitle = `Pre-release v${minorVersion} is now available (Updated ${dayjs(new Date()).format('DD/MM/YYYY')})`;

			if (!topic) {
				console.info('No topic exists - creating one...');

				topic = await createTopic({
					title: topicTitle,
					raw: `Download the latest pre-release from here: <https://github.com/laurent22/joplin/releases>\n\n* * *\n\n${postBody}`,
					category: betaCategoryId,
					external_id: externalId,
				});
			} else {
				console.info('A topic exists - appending the new pre-release to it...');

				const topPost = await getForumTopPostByExternalId(externalId);

				await updatePost(topPost.id, {
					title: topicTitle,
					raw: `${topPost.raw}\n\n${postBody}`,
					edit_reason: 'Auto-updated by script',
				});

				await createPost(topic.id, {
					raw: postBody,
				});
			}

			state.processedReleases[release.tag_name] = true;

			await saveState(state);
		}
	}
};

main().catch((error) => {
	console.error('Fatal error', error);
	process.exit(1);
});
