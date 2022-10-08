import { _ } from './locale';
import Setting from './models/Setting';
import { reg } from './registry';
import { Plugins } from '@joplin/lib/services/plugins/PluginService';

export default function versionInfo(packageInfo: any, plugins?: Plugins) {
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

	if (plugins) {
		const pluginsList = Object.values(plugins).map(
			element => `${element.manifest.name} ${element.manifest.id} ${element.manifest.version}`
		);

		body.push(
			'',
			pluginsList.length ? 'Plugins Installed:' : 'No Plugin Installed',
			...pluginsList
		);
	}

	return {
		header: header.join('\n'),
		body: body.join('\n'),
		message: header.concat(body).join('\n'),
	};
}
