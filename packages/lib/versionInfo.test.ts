import versionInfo from './versionInfo';
import Plugin from '@joplin/lib/services/plugins/Plugin';
import { reg } from './registry';

const db = {
	version: jest.fn().mockReturnValue(1),
};

const packageInfo = {
	'name': 'Joplin',
	'version': '2.9.8',
	'description': 'Joplin for Desktop',
	'repository': {
		'type': 'git',
		'url': 'git+https://github.com/laurent22/joplin.git',
	},
	'author': 'Laurent Cozic',
	'license': 'MIT',
	'bugs': {
		'url': 'https://github.com/laurent22/joplin/issues',
	},
	'homepage': 'https://github.com/laurent22/joplin#readme',
	'build': {
		'appId': 'net.cozic.joplin-desktop',
	},
};

const Plugin1 = new Plugin(
	'',
	{
		manifest_version: 1,
		id: 'plugin1',
		name: 'Plugin1',
		version: '0.0.1',
		app_min_version: '1.0.0',
	},
	'',
	()=>{},
	''
);

const Plugin2 = new Plugin(
	'',
	{
		manifest_version: 1,
		id: 'plugin2',
		name: 'Plugin2',
		version: '1.0.0',
		app_min_version: '1.0.0',
	},
	'',
	()=>{},
	''
);

const testPlugins = { Plugin1, Plugin2 };

describe('versionInfo', function() {
	beforeAll(() => {
		reg.setDb(db);
	});

	describe('when no plugin is installed', ()=>{
		const expected = expect.stringContaining('No Plugin Installed');
		it('should contain "No plugin installed"', ()=>{
			expect(versionInfo(packageInfo, {})).toEqual(expect.objectContaining({
				body: expected,
				message: expected,
			}));
		});
	});

	describe('when plugins are installed', ()=>{
		const expected = expect.stringContaining('Plugins Installed:\nPlugin1 plugin1 0.0.1\nPlugin2 plugin2 1.0.0');
		it('should contain list of the plugins', ()=>{
			expect(versionInfo(packageInfo, testPlugins)).toEqual(expect.objectContaining({
				body: expected,
				message: expected,
			}));
		});
	});
});
