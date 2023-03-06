import { ExportContext } from '../plugins/api/types';
import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import { ExportOptions, Module } from './types';

export default class InteropService_Exporter_Custom extends InteropService_Exporter_Base {

	private customContext_: ExportContext;
	private module_: Module = null;

	public constructor(module: Module) {
		super();
		this.module_ = module;
	}

	public async init(destPath: string, options: ExportOptions) {
		this.customContext_ = {
			destPath: destPath,
			options: options,
		};

		return this.module_.onInit(this.customContext_);
	}

	public async processItem(itemType: number, item: any) {
		return this.module_.onProcessItem(this.customContext_, itemType, item);
	}

	public async processResource(resource: any, filePath: string) {
		return this.module_.onProcessResource(this.customContext_, resource, filePath);
	}

	public async close() {
		return this.module_.onClose(this.customContext_);
	}
}
