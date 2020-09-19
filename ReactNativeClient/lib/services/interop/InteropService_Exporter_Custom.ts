import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import { CustomExportContext, ExportOptions } from './types';

export default class InteropService_Exporter_Custom extends InteropService_Exporter_Base {

	private customContext_:CustomExportContext;
	private handler_:any = null;

	constructor(handler:any) {
		super();
		this.handler_ = handler;
	}

	async init(destPath:string, options:ExportOptions) {
		this.customContext_ = {
			destPath: destPath,
			options: options,
		};

		if (this.handler_.init) return this.handler_.init(this.customContext_);
	}

	async processItem(itemType:number, item:any) {
		if (this.handler_.processItem) return this.handler_.processItem(this.customContext_, itemType, item);
	}

	async processResource(resource:any, filePath:string) {
		if (this.handler_.processResource) return this.handler_.processResource(this.customContext_, resource, filePath);
	}

	async close() {
		if (this.handler_.close) return this.handler_.close(this.customContext_);
	}
}
