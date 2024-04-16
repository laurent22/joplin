import { LogLevel } from '@joplin/utils/Logger';
import { _ } from '../../../locale';
import makeDiscourseDebugUrl from '../../../makeDiscourseDebugUrl';
import Setting from '../../../models/Setting';
import { PackageInfo } from '../../../versionInfo';
import PluginService from '../PluginService';
import { PluginManifest } from './types';
import { reg } from '../../../registry';

export interface ReportPluginIssueOption {
	key: string;

	mobileIcon: string;
	title: string;
	description?: string;
	url: string;
}

type ManifestSlice = Pick<PluginManifest, 'name'|'id'|'repository_url'|'homepage_url'>;
const getReportPluginInformation = async (pluginManifest: ManifestSlice, packageInfo: PackageInfo): Promise<ReportPluginIssueOption[]> => {
	const githubUrlExp = /^https?:\/\/(?:www\.)?github\.com\//;
	const gitlabUrlExp = /^https?:\/\/(?:www\.)?gitlab\.com\//;
	const isGitHubUrl = (url: string) => !!(githubUrlExp.exec(url));
	const isGitlabUrl = (url: string) => !!(gitlabUrlExp.exec(url));
	const getIssueTrackerOption = (): ReportPluginIssueOption => {
		const urls = [pluginManifest.homepage_url, pluginManifest.repository_url].filter(url => !!url);
		if (urls.length === 0) {
			return null;
		}

		const githubUrl = urls.find(url => isGitHubUrl(url));
		const gitlabUrl = urls.find(url => isGitlabUrl(url));

		if (githubUrl || gitlabUrl) {
			return {
				key: 'report-bug-on-repo',
				title: _('Report to maintainers on %s', githubUrl ? 'GitHub' : 'GitLab'),
				mobileIcon: 'source-branch',
				url: githubUrl ?? gitlabUrl,
			};
		} else if (pluginManifest.repository_url) {
			return {
				key: 'visit-repository',
				mobileIcon: 'bug',
				title: _('Visit the plugin\'s source code repository'),
				description: pluginManifest.repository_url,
				url: pluginManifest.repository_url,
			};
		}

		return null;
	};
	const getForumPostOption = async (): Promise<ReportPluginIssueOption> => {
		// We don't translate the post title because Joplin's Discourse is generally
		// in English.
		const postTitle = `Issue with plugin: ${pluginManifest.name}`;
		const forumTags = ['broken-plugin'];
		const postBody = 'Describe the issue here.';

		const pluginErrors = await reg.logger().lastEntries(
			100, { filter: pluginManifest.id, levels: [LogLevel.Error, LogLevel.Warn] },
		);

		return {
			key: 'report-to-forum',
			mobileIcon: 'chat',
			title: _('Report on the Joplin forum'),
			url: makeDiscourseDebugUrl(
				postTitle,
				postBody,
				forumTags,
				pluginErrors.map(error => [error.level, error.message].join(': ')),
				packageInfo,
				PluginService.instance(),
				Setting.value('plugins.states'),
			),
		};
	};
	const getSecurityVulnerabilityOption = (): ReportPluginIssueOption => {
		return {
			key: 'report-security-issue',
			mobileIcon: 'shield-bug',
			title: _('Report a security issue'),
			// TODO: Better URL and/or update SECURITY.md for information about vulnerabilities
			//       in plugins.
			url: 'https://github.com/laurent22/joplin/blob/dev/SECURITY.md',
		};
	};
	const options = [
		await getForumPostOption(),
		getIssueTrackerOption(),
		getSecurityVulnerabilityOption(),
	].filter(option => !!option);
	return options;
};

export default getReportPluginInformation;
