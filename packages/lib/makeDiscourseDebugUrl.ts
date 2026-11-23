import { PluginSettings } from './services/plugins/PluginService';
import type PluginService from './services/plugins/PluginService';
import versionInfo, { PackageInfo } from './versionInfo';
import shim from './shim';

export const renderErrorBlock = (errors: (string | Error)[]): string => {
	if (!errors.length) return '';
	return `\`\`\`\n${errors.map(e => {
		if (typeof e === 'string') return e.trim();
		return e.message.trim() + e.stack ? `\n${e.stack}` : '';
	}).map(l => l.trim()).join('\n\n')}\n\`\`\``;
};

export default (title: string, body: string, errors: (string | Error)[], packageInfo: PackageInfo, pluginService: PluginService, pluginSettings: PluginSettings) => {
	const v = versionInfo(packageInfo, pluginService.enabledPlugins(pluginSettings));

	const errorBlock = renderErrorBlock(errors);

	const query: Record<string, string> = {
		title,
		category: 'support',
		version: packageInfo.version,
		os: shim.getOsName(process.platform),
		'desktop-about-content': v.body,
		content: `#### Body\n\n${body}${errorBlock ? `\n\n#### Errors\n\n${errorBlock}` : ''}`,
	};

	const queryString = Object.keys(query).map(k => `${k}=${encodeURIComponent(query[k])}`).join('&');

	const url = `https://discourse.joplinapp.org/new-topic?${queryString}`;
	return url;
};
