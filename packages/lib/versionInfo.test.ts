import versionInfo, { getPluginsArr, PluginInfo } from './versionInfo';
import Plugin from '@joplin/lib/services/plugins/Plugin';

const TestPlugin1 = new Plugin(
	'',
	{
		manifest_version: 1,
		id: 'test-plugin-1',
		name: 'TestPlugin1',
		version: '0.1.2',
		app_min_version: '1.0.0',
	},
	'',
	()=>{},
	''
);
const TestPlugin2 = new Plugin(
	'',
	{
		manifest_version: 1,
		id: 'test-plugin-2',
		name: 'TestPlugin2',
		version: '0.2.1',
		app_min_version: '1.0.0',
	},
	'',
	()=>{},
	''
);

describe('versionInfo', function() {

	it('should return a empty array', () => {
		const pluginsObjEmpty = {};
		const plugins: PluginInfo[] = getPluginsArr(pluginsObjEmpty);
		expect(plugins.length).toBe(0);
	});

	it('should return correct information about plugin', () => {
		const plugins: PluginInfo[] = getPluginsArr({ TestPlugin1, TestPlugin2 });
		expect(plugins.length).toBe(2);
		expect(plugins[0].name).toBe('TestPlugin1');
		expect(plugins[0].version).toBe('0.1.2');
		expect(plugins[1].name).toBe('TestPlugin2');
		expect(plugins[1].version).toBe('0.2.1');
	});

	it('should check if the plugins are present', () => {
		const info = versionInfo({
			name: 'Joplin',
			version: '2.7.14',
			description: 'Joplin for Desktop',
		},{ TestPlugin1, TestPlugin2 }, 41).body.split('\n');

		expect(info[info.length - 3]).toBe('Plugins:');
		expect(info[info.length - 2]).toBe('TestPlugin1: 0.1.2');
		expect(info[info.length - 1]).toBe('TestPlugin2: 0.2.1');
	});

});
