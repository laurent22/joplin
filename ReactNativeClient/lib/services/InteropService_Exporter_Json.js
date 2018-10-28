const InteropService_Exporter_Base = require('lib/services/InteropService_Exporter_Base');
const { basename, filename } = require('lib/path-utils.js');
const { shim } = require('lib/shim');

class InteropService_Exporter_Json extends InteropService_Exporter_Base {

	async init(destDir) {
		this.destDir_ = destDir;
		this.resourceDir_ = destDir ? destDir + '/resources' : null;

		await shim.fsDriver().mkdir(this.destDir_);
		await shim.fsDriver().mkdir(this.resourceDir_);
	}

	async processItem(ItemClass, item) {
		const obj = await this.buildPlainObjectForJson_(ItemClass, item);
		const fileName = this.getNameWithDifferentExtension_(ItemClass, item, ".json");
		const filePath = this.destDir_ + '/' + fileName;
		const serialized = JSON.stringify(obj);
		await shim.fsDriver().writeFile(filePath, serialized, 'utf-8');
	}

	async processResource(resource, filePath) {
		const destResourcePath = this.resourceDir_ + '/' + basename(filePath);
		await shim.fsDriver().copy(filePath, destResourcePath);
	}

	async close() {}

	async buildPlainObjectForJson_(ItemClass, item) {
		let output = {};
		let shownKeys = ItemClass.fieldNames();
		shownKeys.push('type_');

		item = ItemClass.filter(item);

		if ('title' in item && shownKeys.indexOf('title') >= 0) {
			output.title = item.title;
		}

		if ('body' in item && shownKeys.indexOf('body') >= 0) {
			output.body = item.body;
		}

		output.props = {};

		for (let i = 0; i < shownKeys.length; i++) {
			let key = shownKeys[i];
			if (key == 'title' || key == 'body') continue;

			let value = null;
			if (typeof key === 'function') {
				let r = await key();
				key = r.key;
				value = r.value;
			} else {
				value = ItemClass.serialize_format(key, item[key]);
			}

			output.props[key] = value;
		}

		return output;
	}

	getNameWithDifferentExtension_(ItemClass, item, newExtension) {
		// e.g., from abc.md to abc.json
		const fileName = ItemClass.systemPath(item);
		const split = fileName.split(/\./g);
		if (split.length === 2) {
			return split[0] + newExtension;
		} else {
			ItemClass.logger().warn("Expected systemPath to look like 'abc.md', but got", fileName);
			ItemClass.logger().warn("we'll export to", fileName + newExtension);
			return fileName + newExtension;
		}
	}
}

module.exports = InteropService_Exporter_Json;