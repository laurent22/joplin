import { _ } from './locale';
import { getPluginsArr } from './versionInfo';
import PluginService from '@joplin/lib/services/plugins/PluginService';

const plugins = getPluginsArr(PluginService.instance().plugins);

describe('versionInfo', function() {

	it('should return an array', (()=>{
		expect(Array.isArray(plugins)).toBe(true);
	}));

	it('should return an empty array', (() => {
		expect(plugins.length).toBe(0);
	}));

	it('should not push plugin to body if no plugin is found',(()=>{
		const body = [];
		if (plugins.length > 0) {
			body.push(`\n${_('Plugins:')}`);
			plugins.map((plugin)=>{
				body.push(`${plugin.name}: ${plugin.version}`);
			});
		}
		expect(body.length).toBe(0);


	}));

});
