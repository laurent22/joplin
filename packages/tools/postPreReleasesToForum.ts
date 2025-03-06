import { pathExists } from 'fs-extra';
import { readFile, writeFile } from 'fs/promises';
import { GitHubRelease, gitHubLatestReleases, gitHubLinkify } from './tool-utils';
import { config, createPost, createTopic, getForumTopPostByExternalId, getTopicByExternalId, trimPostToMaximumLength, updatePost } from './utils/discourse';
import { compareVersions } from 'compare-versions';
import dayjs = require('dayjs');
import { getRootDir } from '@joplin/utils';

interface State {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	processedReleases: Record<string, any>;
}

enum Platform {
	Desktop = 'Desktop',
	Android = 'Android',
	iOS = 'iOS',
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
	await writeFile(stateFilePath, JSON.stringify(state, null, '\t'), 'utf-8');
};

const getPatchVersion = (tagName: string) => {
	if (tagName.includes('-')) tagName = tagName.split('-')[1];
	return tagName.substring(1);
};

const getMinorVersion = (tagName: string) => {
	const s = getPatchVersion(tagName).split('.');
	return `${s[0]}.${s[1]}`;
};

const getExternalId = (platform: string, minorVersion: string) => {
	let prefix = '';
	if (platform !== Platform.Desktop) {
		prefix = `${platform.toLowerCase()}-`;
	}
	return `prerelease-${prefix}${minorVersion.replace(/\./g, '-')}`;
};

const getDownloadInfo = (platform: Platform) => {
	const infos: Record<Platform, string> = {
		[Platform.Desktop]: 'Download the latest pre-releases from here: <https://github.com/laurent22/joplin/releases>',
		[Platform.Android]: 'Download the latest pre-releases from here: <https://github.com/laurent22/joplin-android/tags>',
		[Platform.iOS]: 'In order to try the iOS pre-release, you will need to join the Joplin iOS beta program from here: <https://testflight.apple.com/join/p5iLVzrG>',
	};

	return infos[platform];
};

const getReleasesFromMarkdown = async (filePath: string) => {
	const content = await readFile(filePath, 'utf-8');
	const lines = content.split('\n');

	const releases: GitHubRelease[] = [];
	let currentRelease: GitHubRelease = null;

	for (let line of lines) {
		line = line.trim();
		if (!line) continue;

		if (line.startsWith('##')) {
			const matches = line.match(/## \[(.*?)\]/);
			if (!matches) throw new Error(`Could not parse version: ${line}`);
			const tag = matches[1];
			currentRelease = {
				tag_name: tag,
				body: '',
				assets: [],
				draft: false,
				html_url: `https://github.com/laurent22/joplin-android/releases/tag/${tag}`,
				prerelease: false,
				upload_url: '',
			};
			releases.push(currentRelease);
			continue;
		}

		if (currentRelease) {
			if (currentRelease.body) currentRelease.body += '\n';
			currentRelease.body += line;
		}
	}

	releases.sort((a, b) => compareVersions(getPatchVersion(a.tag_name), getPatchVersion(b.tag_name)));

	return releases;
};

const processReleases = async (releases: GitHubRelease[], platform: Platform, startFromVersion: string, state: State) => {
	for (const release of releases) {
		const minorVersion = getMinorVersion(release.tag_name);
		const patchVersion = getPatchVersion(release.tag_name);

		if (compareVersions(startFromVersion, minorVersion) > 0) continue;

		if (!state.processedReleases[release.tag_name]) {
			console.info(`Processing release ${release.tag_name}`);

			const externalId = getExternalId(platform, minorVersion);

			const postBody = `## [v${patchVersion}](${release.html_url})\n\n${gitHubLinkify(release.body)}`;

			let topic = await getTopicByExternalId(externalId);

			const topicTitle = `${platform} pre-release v${minorVersion} is now available (Updated ${dayjs(new Date()).format('DD/MM/YYYY')})`;

			if (!topic) {
				console.info('No topic exists - creating one...');

				topic = await createTopic({
					title: topicTitle,
					raw: `${getDownloadInfo(platform)}\n\n* * *\n\n${postBody}`,
					category: betaCategoryId,
					external_id: externalId,
				});
			} else {
				console.info('A topic exists - appending the new pre-release to it...');

				const topPost = await getForumTopPostByExternalId(externalId);

				await updatePost(topPost.id, {
					title: topicTitle,
					// With a large number of pre-releases, the top post can get very long
					// and needs to be trimmed.
					raw: trimPostToMaximumLength(
						`${topPost.raw}\n\n${postBody}`,
					),
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

	return state;
};

const main = async () => {
	const rootDir = await getRootDir();

	const argv = require('yargs').argv;
	config.key = argv._[0];
	config.username = argv._[1];

	let state = await loadState();

	{
		const releases = await gitHubLatestReleases(1, 50);
		releases.sort((a, b) => compareVersions(a.tag_name, b.tag_name));
		state = await processReleases(releases, Platform.Desktop, '2.13', state);
	}

	{
		const releases = await getReleasesFromMarkdown(`${rootDir}/readme/about/changelog/android.md`);
		state = await processReleases(releases, Platform.Android, '2.14', state);
	}

	{
		const releases = await getReleasesFromMarkdown(`${rootDir}/readme/about/changelog/ios.md`);
		await processReleases(releases, Platform.iOS, '12.14', state);
	}
};

main().catch((error) => {
	console.error('Fatal error', error);
	process.exit(1);
});
