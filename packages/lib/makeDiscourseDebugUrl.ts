import { PluginSettings } from './services/plugins/PluginService';
import type PluginService from './services/plugins/PluginService';
import versionInfo, { PackageInfo } from './versionInfo';

export const renderErrorBlock = (errors: (string | Error)[]): string => {
	if (!errors.length) return '';
	return `\`\`\`\n${errors.map(e => {
		if (typeof e === 'string') return e.trim();
		return e.message.trim() + e.stack ? `\n${e.stack}` : '';
	}).map(l => l.trim()).join('\n\n')}\n\`\`\``;
};

const getOsName = (platform: typeof process.platform) => {
	if (platform === 'win32') return 'Windows';
	if (platform === 'darwin') return 'macOS';
	if (platform === 'linux') return 'Linux';
	if (platform === 'android') return 'Android';
	return '';
};

export default (title: string, body: string, errors: (string | Error)[], packageInfo: PackageInfo, pluginService: PluginService, pluginSettings: PluginSettings) => {
	const v = versionInfo(packageInfo, pluginService.enabledPlugins(pluginSettings));

	const errorBlock = renderErrorBlock(errors);

	const query: Record<string, string> = {
		title,
		category: 'support',
		version: packageInfo.version,
		os: getOsName(process.platform),
		'desktop-about-content': v.body,
		content: `#### Body\n\n${body}${errorBlock ? `\n\n#### Errors\n\n${errorBlock}` : ''}`,
	};

	const queryString = Object.keys(query).map(k => `${k}=${encodeURIComponent(query[k])}`).join('&');

	const url = `https://discourse.joplinapp.org/new-topic?${queryString}`;
	return url;
};
