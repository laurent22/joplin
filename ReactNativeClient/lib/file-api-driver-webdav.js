const BaseItem = require('lib/models/BaseItem.js');
const { time } = require('lib/time-utils.js');

class FileApiDriverWebDav { 

	constructor(api) {
		this.api_ = api;
	}

	api() {
		return this.api_;
	}

	async stat(path) {
		const result = await this.api().execPropFind(path, [
			'd:getlastmodified',
			'd:resourcetype',
		]);

		return this.metadataFromStat_(result, path);
	}

	metadataFromStat_(stat, path) {
		const isCollection = this.api().stringFromJson(stat, ['d:multistatus', 'd:response', 0, 'd:propstat', 0, 'd:prop', 0, 'd:resourcetype', 0, 'd:collection', 0]);
		const lastModifiedString = this.api().stringFromJson(stat, ['d:multistatus', 'd:response', 0, 'd:propstat', 0, 'd:prop', 0, 'd:getlastmodified', 0]);

		if (!lastModifiedString) throw new Error('Could not get lastModified date: ' + JSON.stringify(stat));

		const lastModifiedDate = new Date(lastModifiedString);
		if (isNaN(lastModifiedDate.getTime())) throw new Error('Invalid date: ' + lastModifiedString);

		return {
			path: path,
			created_time: lastModifiedDate.getTime(),
			updated_time: lastModifiedDate.getTime(),
			isDir: isCollection === '',
		};
	}

	metadataFromStats_(stats) {
		let output = [];
		for (let i = 0; i < stats.length; i++) {
			const mdStat = this.metadataFromStat_(stats[i]);
			output.push(mdStat);
		}
		return output;
	}

	async setTimestamp(path, timestampMs) {

	}

	async delta(path, options) {
		// const itemIds = await options.allItemIdsHandler();

		// try {
		// 	const stats = await this.fsDriver().readDirStats(path);
		// 	let output = this.metadataFromStats_(stats);

		// 	if (!Array.isArray(itemIds)) throw new Error('Delta API not supported - local IDs must be provided');

		// 	let deletedItems = [];
		// 	for (let i = 0; i < itemIds.length; i++) {
		// 		const itemId = itemIds[i];
		// 		let found = false;
		// 		for (let j = 0; j < output.length; j++) {
		// 			const item = output[j];
		// 			if (BaseItem.pathToId(item.path) == itemId) {
		// 				found = true;
		// 				break;
		// 			}
		// 		}

		// 		if (!found) {
		// 			deletedItems.push({
		// 				path: BaseItem.systemPath(itemId),
		// 				isDeleted: true,
		// 			});
		// 		}
		// 	}

		// 	output = output.concat(deletedItems);

		// 	return {
		// 		hasMore: false,
		// 		context: null,
		// 		items: output,
		// 	};
		// } catch(error) {
		// 	throw this.fsErrorToJsError_(error, path);
		// }
	}

	async list(path, options) {

	}

	async get(path, options) {

	}

	async mkdir(path) {

	}

	async put(path, content, options = null) {

	}

	async delete(path) {

	}

	async move(oldPath, newPath) {
		
	}

	format() {
		throw new Error('Not supported');
	}

}

module.exports = { FileApiDriverWebDav };