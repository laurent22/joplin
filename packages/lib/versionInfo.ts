import { _ } from './locale';
import Setting from './models/Setting';
import { reg } from './registry';

export default function versionInfo(packageInfo: any) {
	const p = packageInfo;
	let gitInfo = '';
	if ('git' in p) {
		gitInfo = _('Revision: %s (%s)', p.git.hash, p.git.branch);
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
		message: header.concat(body).join('\n'),
	};
}
