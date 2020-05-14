/* eslint-disable no-unused-vars */
/* eslint prefer-const: 0*/

// require('app-module-path').addPath(__dirname);

// const SearchEngine = require('lib/services/SearchEngine');
// const Note = require('lib/models/Note');
// const {
// 	fileContentEqual,
// 	setupDatabase,
// 	setupDatabaseAndSynchronizer,
// 	asyncTest,
// 	db,
// 	synchronizer,
// 	fileApi,
// 	sleep,
// 	clearDatabase,
// 	switchClient,
// 	syncTargetId,
// 	objectsEqual,
// 	checkThrowAsync,
// 	TestApp,
// } = require('test-utils.js');

// let testApp = null;
// let engine = null;

// describe('services_SearchFilter', function() {
// 	beforeEach(async (done) => {

// 		await setupDatabaseAndSynchronizer(1);
// 		await switchClient(1);
// 		engine = new SearchEngine();
// 		engine.setDb(db());

// 		done();
// 	});

// 	afterEach(async (done) => {
// 		if (testApp !== null) await testApp.destroy();
// 		testApp = null;
// 		done();
// 	});

// 	it(
// 		'should filter on title with one word',
// 		asyncTest(async () => {
// 			let rows;

// 			const n1 = await Note.save({
// 				title: 'conversation',
// 				body: 'blah blah blah',
// 			});
// 			await testApp.wait();

// 			const n2 = await Note.save({
// 				title: 'not working',
// 				body: 'yada yada yada',
// 			});

// 			await testApp.wait();

// 			//   const n3 = await Note.save({ title: "Агентство Рейтер" });
// 			//   const n4 = await Note.save({ title: "Dog" });
// 			//   const n5 = await Note.save({ title: "СООБЩИЛО" });

// 			await engine.syncTables();

// 			rows = await engine.search('title:conversation');
// 			expect(rows.length).toBe(1);
// 		})
// 	);
// });
