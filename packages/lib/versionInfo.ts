import { _ } from './locale';
import Setting from './models/Setting';
import { reg } from './registry';
import PluginService, { Plugins } from '@joplin/lib/services/plugins/PluginService';

export function getPluginList(allPlugins: Plugins) {
	const plugins = [];
	if (Object.keys(allPlugins).length > 0) {
		for (const pluginId in allPlugins) {
			plugins.push(`   ${allPlugins[pluginId].manifest.name}:${allPlugins[pluginId].manifest.version}`);
		}
	}
	return plugins;
}

export default function versionInfo(packageInfo: any) {
	const p = packageInfo;
	let gitInfo = '';
	if ('git' in p) {
		gitInfo = _('Revision: %s (%s)', p.git.hash, p.git.branch);
		if (p.git.branch === 'HEAD') gitInfo = gitInfo.slice(0, -7);
	}
	const copyrightText = 'Copyright © 2016-YYYY Laurent Cozic';
	const now = new Date();

	const header = [
		p.description,
		'',
		copyrightText.replace('YYYY', `${now.getFullYear()}`),
	];

	const body = [
		_('%s %s (%s, %s)', p.name, p.version, Setting.value('env'), process.platform),
		'',
		_('Client ID: %s', Setting.value('clientId')),
		_('Sync Version: %s', Setting.value('syncVersion')),
		_('Profile Version: %s', reg.db().version()),
		_('Keychain Supported: %s', Setting.value('keychain.supported') >= 1 ? _('Yes') : _('No')),
	];

	if (gitInfo) {
		body.push(`\n${gitInfo}`);
		console.info(gitInfo);
	}

	return {
		header: header.join('\n'),
		body: body.join('\n'),
		plugins: getPluginList(PluginService.instance().plugins),
		message: header.concat(body).join('\n'),
	};
}
