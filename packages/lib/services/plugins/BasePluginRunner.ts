import Plugin from './Plugin';
import BaseService from '../BaseService';
import Global from './api/Global';

export default abstract class BasePluginRunner extends BaseService {

	async run(plugin: Plugin, sandbox: Global): Promise<void> {
		throw new Error(`Not implemented: ${plugin} / ${sandbox}`);
	}

}
