import versionInfo from './versionInfo';
import { reg } from './registry';
import { Plugins } from './services/plugins/PluginService';
import Plugin from './services/plugins/Plugin';
import Setting from './models/Setting';

jest.mock('./registry');

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

describe('versionInfo', () => {

	beforeAll(() => {
		(reg.db as jest.Mock).mockReturnValue(mockedDb);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should not list any plugin when no plugin is installed', () => {
		const v = versionInfo(packageInfo, {});
		expect(v.body).toMatch(/Revision:\s[a-z0-9]{3,}\s\([a-zA-Z0-9-_/.]{1,}\)$/);
		expect(v.message).toMatch(/Revision:\s[a-z0-9]{3,}\s\([a-zA-Z0-9-_/.]{1,}\)$/);
	});

	it('should list one plugin', () => {
		const plugin: Plugin = new Plugin(
			'',
			{
				manifest_version: 1,
				id: '1',
				name: 'Plugin1',
				version: '1',
				app_min_version: '1',
			},
			'',
			() => { },
			'',
		);

		const plugins: Plugins = {};
		plugins[plugin.manifest.id] = plugin;

		const v = versionInfo(packageInfo, plugins);
		expect(v.body).toMatch(/\n\nPlugin1: 1/);
		expect(v.message).toMatch(/\n\nPlugin1: 1/);
	});

	it('should show a list of three plugins', () => {
		const plugins: Plugins = {};
		for (let i = 1; i <= 3; i++) {
			const plugin: Plugin = new Plugin(
				'',
				{
					manifest_version: i,
					id: i.toString(),
					name: `Plugin${i}`,
					version: '1',
					app_min_version: '1',
				},
				'',
				() => { },
				'',
			);
			plugins[plugin.manifest.id] = plugin;
		}

		const v = versionInfo(packageInfo, plugins);

		expect(v.body).toMatch(/\n\nPlugin1: 1\nPlugin2: 1\nPlugin3: 1/);
		expect(v.message).toMatch(/\n\nPlugin1: 1\nPlugin2: 1\nPlugin3: 1/);
	});

	it('should show an abridged list of plugins in message and the full list in body', () => {
		const plugins: Plugins = {};
		for (let i = 1; i <= 21; i++) {
			const plugin: Plugin = new Plugin(
				'',
				{
					manifest_version: i,
					id: i.toString(),
					name: `Plugin${i}`,
					version: '1',
					app_min_version: '1',
				},
				'',
				() => { },
				'',
			);

			plugins[plugin.manifest.id] = plugin;
		}

		const v = versionInfo(packageInfo, plugins);

		// body should contain all 21 plugins
		for (let i = 1; i <= 21; i++) {
			expect(v.body).toContain(`Plugin${i}: 1`);
		}
		expect(v.body).not.toContain('...');

		// message should be abridged (20 plugins + ellipsis)
		expect(v.message).toContain('...');
		// Plugin21 is the last one alphabetically, so it should be truncated
		expect(v.message).not.toContain('Plugin9: 1');
	});

	it('should show sync target name', () => {
		// SyncTargetNone is registered in test-utils (loaded via jest.setup),
		// and sync.target defaults to 0 (None).
		const v = versionInfo(packageInfo, {});
		expect(v.body).toContain('Sync target: (None)');
	});

	it('should show Markdown editor by default', () => {
		// editor.codeView defaults to true → Markdown
		const v = versionInfo(packageInfo, {});
		expect(v.body).toContain('Editor: Markdown');
	});

	it('should show Rich Text editor when codeView is false', () => {
		const original = Setting.value('editor.codeView');
		Setting.setValue('editor.codeView', false);
		try {
			const v = versionInfo(packageInfo, {});
			expect(v.body).toContain('Editor: Rich Text');
		} finally {
			Setting.setValue('editor.codeView', original);
		}
	});
});
