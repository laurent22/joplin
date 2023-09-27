import { _ } from '../../locale';
import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import InteropService_Exporter_Raw from './InteropService_Exporter_Raw';
import shim from '../../shim';

export default class InteropService_Exporter_Jex extends InteropService_Exporter_Base {

	private tempDir_: string;
	private destPath_: string;
	private rawExporter_: InteropService_Exporter_Raw;

	public async init(destPath: string) {
		if (await shim.fsDriver().isDirectory(destPath)) throw new Error(`Path is a directory: ${destPath}`);

		this.tempDir_ = await this.temporaryDirectory_(false);
		this.destPath_ = destPath;
		this.rawExporter_ = new InteropService_Exporter_Raw();
		await this.rawExporter_.init(this.tempDir_);
	}

	public async processItem(itemType: number, item: any) {
		return this.rawExporter_.processItem(itemType, item);
	}

	public async processResource(resource: any, filePath: string) {
		return this.rawExporter_.processResource(resource, filePath);
	}

	public async close() {
		const stats = await shim.fsDriver().readDirStats(this.tempDir_, { recursive: true });
		const filePaths = stats.filter((a: any) => !a.isDirectory()).map((a: any) => a.path);

		if (!filePaths.length) throw new Error(_('There is no data to export.'));

		await shim.fsDriver().tarCreate({
			strict: true,
			portable: true,
			file: this.destPath_,
			cwd: this.tempDir_,
		}, filePaths);

		await shim.fsDriver().remove(this.tempDir_);
	}
}
