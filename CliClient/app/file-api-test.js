import { FileApi } from 'src/file-api.js';
import { FileApiDriverLocal } from 'src/file-api-driver-local.js';
import { Database } from 'src/database.js';
import { DatabaseDriverNode } from 'src/database-driver-node.js';
import { Log } from 'src/log.js';

const fs = require('fs');

// let driver = new FileApiDriverLocal();
// let api = new FileApi('/home/laurent/Temp/TestImport', driver);

// api.list('/').then((items) => {
// 	console.info(items);
// }).then(() => {
// 	return api.get('un.txt');
// }).then((content) => {
// 	console.info(content);
// }).then(() => {
// 	return api.mkdir('TESTING');
// }).then(() => {
// 	return api.put('un.txt', 'testing change');
// }).then(() => {
// 	return api.delete('deux.txt');
// }).catch((error) => {
// 	console.error('ERROR', error);
// });

Log.setLevel(Log.LEVEL_DEBUG);

let db = new Database(new DatabaseDriverNode());
db.setDebugMode(true);
db.open({ name: '/home/laurent/Temp/test.sqlite3' }).then(() => {
	return db.selectAll('SELECT * FROM table_fields');
}).then((rows) => {
	
});

	//'/home/laurent/Temp/TestImport'


// var sqlite3 = require('sqlite3').verbose();
// var db = new sqlite3.Database(':memory:');

// db.run("CREATE TABLE lorem (info TEXT)", () => {
// 	db.exec('INSERT INTO lorem VALUES "un"', () => {
// 		db.exec('INSERT INTO lorem VALUES "deux"', () => {
// 			let st = db.prepare("SELECT rowid AS id, info FROM lorem", () => {
// 				st.get((error, row) => {
// 					console.info(row);
// 				});
// 			});
// 		});
// 	});
// });

// var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
// for (var i = 0; i < 10; i++) {
// stmt.run("Ipsum " + i);
// }
// stmt.finalize();

// let st = db.prepare("SELECT rowid AS id, info FROM lorem");
// st.get({}, (row) => {
// console.info('xx',row);
// });


// st.finalize();


//db.serialize(function() {
 //  db.run("CREATE TABLE lorem (info TEXT)");

 //  var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
 //  for (var i = 0; i < 10; i++) {
 //      stmt.run("Ipsum " + i);
 //  }
 //  stmt.finalize();

 //  let st = db.prepare("SELECT rowid AS id, info FROM lorem");
	// st.get({}, (row) => {
	// 	console.info('xx',row);
	// });


	// st.finalize();

  // db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
  //     console.log(row.id + ": " + row.info);
  // });
//});

//db.close();