import joplin from 'api';

function demoSqlite3() {
	const sqlite3 = joplin.plugins.require('sqlite3');

	var db = new sqlite3.Database(':memory:');

	db.serialize(function() {
		db.run("CREATE TABLE lorem (info TEXT)");

		var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
		for (var i = 0; i < 10; i++) {
			stmt.run("Ipsum " + i);
		}
		stmt.finalize();

		db.each("SELECT rowid AS id, info FROM lorem", function(_err, row) {
			console.log(row.id + ": " + row.info);
		});
	});

	db.close();
}

async function demoFsExtra() {
	const fs = joplin.plugins.require('fs-extra');

	const pluginDir = await joplin.plugins.dataDir();
	console.info('Checking if "' + pluginDir + '" exists:', await fs.pathExists(pluginDir));
}

joplin.plugins.register({
	onStart: async function() {
		console.info('Trying fs-extra package...');
		await demoFsExtra();

		console.info('Trying Sqlite3 package...');
		demoSqlite3();
	},
});
