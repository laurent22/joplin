import { getPluginList } from './versionInfo';
import Plugin from '@joplin/lib/services/plugins/Plugin';

const plugin1 = new Plugin(
	'',
	{
		manifest_version: 1,
		id: 'abc',
		name: 'abc',
		version: '1.0',
		app_min_version: '1.0',
	},
	'',
	() => { },
	''
);

const plugin2 = new Plugin(
	'',
	{
		manifest_version: 2,
		id: 'abc',
		name: 'abc',
		version: '1.2',
		app_min_version: '1.2',
	},
	'',
	() => { },
	''
);

const plugin3 = new Plugin(
	'',
	{
		manifest_version: 2,
		id: 'abc',
		name: 'abc',
		version: '1.2',
		app_min_version: '1.2',
	},
	'',
	() => { },
	''
);




describe('getPluginList', () => {
	it('should return an empty array if no plugins are provided', () => {
		expect(getPluginList({})).toEqual([]);
	});

	it('should return the desired output', () => {
		expect(getPluginList({ plugin1, plugin2, plugin3 })).toEqual(['   abc:1.0','   abc:1.2','   abc:1.2']);
	});
});
