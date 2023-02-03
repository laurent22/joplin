import versionInfo from './versionInfo';
import { reg } from './registry';
import PluginService, { Plugins } from './services/plugins/PluginService';
import Plugin from './services/plugins/Plugin';

jest.mock('./registry');
jest.mock('./services/plugins/PluginService');

const info = jest.spyOn(console, 'info').mockImplementation(() => {});

const mockedVersion = jest.fn(() => 'test');
const mockedDb = { version: mockedVersion };

const packageInfo = {
	'name': 'Joplin',
	'version': '2.10.5',
	'description': 'Joplin for Desktop',
	'repository': {
		'type': 'git',
		'url': 'git+https://github.com/laurent22/joplin.git',
	},
	'author': 'Laurent Cozic',
	'license': 'AGPL-3.0-or-later',
	'bugs': {
		'url': 'https://github.com/laurent22/joplin/issues',
	},
	'homepage': 'https://github.com/laurent22/joplin#readme',
	'build': {
		'appId': 'net.cozic.joplin-desktop',
	},
	'git': {
		'branch': 'dev',
		'hash': '1b527f2bb',
	},
};

const pluginServiceInstance = {
	plugins: jest.fn(),
};

describe('getPluginLists', function() {

	beforeAll(() => {
		(reg.db as jest.Mock).mockReturnValue(mockedDb);

		(PluginService.instance as jest.Mock).mockReturnValue(pluginServiceInstance);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should not list any plugin when no plugin is installed', () => {
		Object.defineProperty(pluginServiceInstance, 'plugins', {
			get: () => {
				const plugins: Plugins = {};
				return plugins;
			},
		});

		const v = versionInfo(packageInfo);
		expect(v.body).toMatch(/Revision:\s[a-z0-9]{3,}\s\([a-zA-Z0-9-_/.]{1,}\)$/);
		expect(v.message).toMatch(/Revision:\s[a-z0-9]{3,}\s\([a-zA-Z0-9-_/.]{1,}\)$/);
	});

	it('should list one plugin', () => {
		Object.defineProperty(pluginServiceInstance, 'plugins', {
			get: () => {
				const plugin: Plugin = new Plugin(
					'',
					{
						manifest_version: 1,
						id: '1',
						name: 'Plugin1',
						version: '1',
						app_min_version: '1' },
					'',
					() => {},
					''
				);

				const plugins: Plugins = {};
				plugins[plugin.manifest.id] = plugin;

				return plugins;
			},
		});

		const v = versionInfo(packageInfo);
		expect(v.body).toMatch(/\n\nPlugin1: 1/);
		expect(v.message).toMatch(/\n\nPlugin1: 1/);
	});

	it('should show a list of three plugins', () => {
		Object.defineProperty(pluginServiceInstance, 'plugins', {
			get: () => {
				const plugins: Plugins = {};
				for (let i = 1; i <= 3; i++) {
					const plugin: Plugin = new Plugin(
						'',
						{
							manifest_version: i,
							id: i.toString(),
							name: `Plugin${i}`,
							version: '1',
							app_min_version: '1' },
						'',
						() => {},
						''
					);
					plugins[plugin.manifest.id] = plugin;
				}
				return plugins;
			},
		});

		const v = versionInfo(packageInfo);

		expect(v.body).toMatch(/\n\nPlugin1: 1\nPlugin2: 1\nPlugin3: 1/);
		expect(v.message).toMatch(/\n\nPlugin1: 1\nPlugin2: 1\nPlugin3: 1/);
	});

	it('should show an abridged list of plugins in message and the full list in body', () => {
		Object.defineProperty(pluginServiceInstance, 'plugins', {
			get: () => {
				const plugins: Plugins = {};
				for (let i = 1; i <= 21; i++) {
					const plugin: Plugin = new Plugin(
						'',
						{
							manifest_version: i,
							id: i.toString(),
							name: `Plugin${i}`,
							version: '1',
							app_min_version: '1' },
						'',
						() => {},
						''
					);

					plugins[plugin.manifest.id] = plugin;
				}
				return plugins;
			},
		});

		const v = versionInfo(packageInfo);

		const body = '\n';
		for (let i = 1; i <= 21; i++) {
			body.concat(`\nPlugin${i}: 1`);
		}
		expect(v.body).toMatch(new RegExp(body));

		const message = '\n';
		for (let i = 1; i <= 20; i++) {
			message.concat(`\nPlugin${i}: 1`);
		}
		message.concat('\n...');
		expect(v.message).toMatch(new RegExp(message));
	});

	info.mockReset();
});
