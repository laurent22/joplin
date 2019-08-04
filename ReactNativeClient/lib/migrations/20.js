const Resource = require('lib/models/Resource');
const Setting = require('lib/models/Setting');
const { shim } = require('lib/shim');
const { reg } = require('lib/registry.js');
const { fileExtension } = require('lib/path-utils.js');

const script = {};

script.exec = async function() {
	const stats = await shim.fsDriver().readDirStats(Setting.value('resourceDir'));

	let queries = [];
	for (const stat of stats) {
		if (fileExtension(stat.path) === 'crypted') continue;
		const resourceId = Resource.pathToId(stat.path);
		if (!resourceId) continue;

		queries.push({ sql: 'UPDATE resources SET `size` = ? WHERE id = ?', params: [stat.size, resourceId] });

		if (queries.length >= 1000) {
			await reg.db().transactionExecBatch(queries);
			queries = [];
		}
	}

	await reg.db().transactionExecBatch(queries);
};

module.exports = script;
