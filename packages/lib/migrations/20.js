const Resource = require('../models/Resource').default;
const Setting = require('../models/Setting').default;
const shim = require('../shim').default;
const { reg } = require('../registry');
const { fileExtension } = require('../path-utils');

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
