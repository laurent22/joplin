import { PluginSettings } from './services/plugins/PluginService';
import type PluginService from './services/plugins/PluginService';
import versionInfo from './versionInfo';

const renderErrorBlock = (errors: any[]): string => {
	if (!errors.length) return '';
	return `\`\`\`\n${errors.map(e => typeof e === 'string' ? e.trim() : e.message.trim())}\n\`\`\``;
};

export default (title: string, body: string, errors: any[], packageInfo: any, pluginService: PluginService, pluginSettings: PluginSettings) => {
	const v = versionInfo(packageInfo, pluginService.enabledPlugins(pluginSettings));

	const errorBlock = renderErrorBlock(errors);

	const query: Record<string, string> = {
		title,
		body: `# About\n\n${v.body.trim()}\n\n# Body\n\n${body}${errorBlock ? `\n\n# Errors\n\n${errorBlock}` : ''}`,
		category: 'support',
	};

	const queryString = Object.keys(query).map(k => `${k}=${encodeURIComponent(query[k])}`).join('&');

	const url = `https://discourse.joplinapp.org/new-topic?${queryString}`;
	return url;
};
