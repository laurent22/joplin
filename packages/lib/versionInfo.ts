import { _ } from './locale';
import Setting from './models/Setting';
import { reg } from './registry';
import { Plugins } from './services/plugins/PluginService';
import shim from './shim';

export interface PackageInfo {
	name: string;
	version: string;
	description: string;
	build: {
		appId: string;
	};
	git?: {
		branch: string;
		hash: string;
	};
}

interface PluginList {
	completeList: string;
	summary: string;
}

function getPluginLists(plugins: Plugins): PluginList {
	const pluginList = [];
	if (Object.keys(plugins).length > 0) {
		for (const pluginId in plugins) {
			pluginList.push(`${plugins[pluginId].manifest.name}: ${plugins[pluginId].manifest.version}`);
		}
	}

	pluginList.sort(Intl.Collator().compare);

	let completeList = '';
	let summary = '';
	if (pluginList.length > 0) {
		completeList = ['\n', ...pluginList].join('\n');

		if (pluginList.length > 20) {
			summary = [
				'\n',
				...[...pluginList].filter((_, index) => index < 20),
				'...',
			].join('\n');
		} else {
			summary = completeList;
		}
	}

	return {
		completeList,
		summary,
	};
}

export default function versionInfo(packageInfo: PackageInfo, plugins: Plugins) {
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
		_('%s %s (%s, %s)', p.name, p.version, Setting.value('env'), shim.platformName()),
		'',
		_('Client ID: %s', Setting.value('clientId')),
		_('Sync Version: %s', Setting.value('syncVersion')),
		_('Profile Version: %s', reg.db().version()),
		_('Keychain Supported: %s', Setting.value('keychain.supported') >= 1 ? _('Yes') : _('No')),
	];

	if (gitInfo) {
		body.push(`\n${gitInfo}`);
	}

	const pluginList = getPluginLists(plugins);

	return {
		header: header.join('\n'),
		body: body.join('\n').concat(pluginList.completeList),
		message: header.concat(body).join('\n').concat(pluginList.summary),
	};
}
