const Setting = require('lib/models/Setting.js');
const { _ } = require('lib/locale.js');
const { reg } = require('lib/registry.js');

export default function versionInfo(packageInfo:any) {
	const p = packageInfo;
	let gitInfo = '';
	if ('git' in p) {
		gitInfo = _('Revision: %s (%s)', p.git.hash, p.git.branch);
	}
	const copyrightText = 'Copyright © 2016-YYYY Laurent Cozic';
	const now = new Date();
	const message = [
		p.description,
		'',
		copyrightText.replace('YYYY', `${now.getFullYear()}`),
		_('%s %s (%s, %s)', p.name, p.version, Setting.value('env'), process.platform),
		'',
		_('Client ID: %s', Setting.value('clientId')),
		_('Sync Version: %s', Setting.value('syncVersion')),
		_('Profile Version: %s', reg.db().version()),
		_('Keychain Supported: %s', Setting.value('keychain.supported') >= 1 ? _('Yes') : _('No')),
	];
	if (gitInfo) {
		message.push(`\n${gitInfo}`);
		console.info(gitInfo);
	}

	return {
		message: message.join('\n'),
	};
}
