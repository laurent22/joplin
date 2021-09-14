// /* eslint-disable no-unused-vars */

// require('app-module-path').addPath(__dirname);

// const { asyncTest, fileContentEqual, setupDatabase, checkThrow, revisionService, setupDatabaseAndSynchronizer, db, synchronizer, fileApi, sleep, clearDatabase, switchClient, syncTargetId, objectsEqual, checkThrowAsync } = require('test-utils.js');
// const KvStore = require('lib/services/KvStore.js');
// const UndoRedoService = require('lib/services/UndoRedoService.js').default;

// process.on('unhandledRejection', (reason, p) => {
// 	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
// });

// describe('services_UndoRedoService', function() {

// 	beforeEach(async (done) => {
// 		await setupDatabaseAndSynchronizer(1);
// 		await switchClient(1);
// 		done();
// 	});

// 	it('should undo and redo', asyncTest(async () => {
// 		const service = new UndoRedoService();

// 		expect(service.canUndo).toBe(false);
// 		expect(service.canRedo).toBe(false);

// 		service.push('test');
// 		expect(service.canUndo).toBe(true);
// 		expect(service.canRedo).toBe(false);
// 		service.push('test 2');
// 		service.push('test 3');

// 		expect(service.undo()).toBe('test 3');
// 		expect(service.canRedo).toBe(true);
// 		expect(service.undo()).toBe('test 2');
// 		expect(service.undo()).toBe('test');

// 		expect(checkThrow(() => service.undo())).toBe(true);

// 		expect(service.canUndo).toBe(false);
// 		expect(service.canRedo).toBe(true);

// 		expect(service.redo()).toBe('test');
// 		expect(service.canUndo).toBe(true);
// 		expect(service.redo()).toBe('test 2');
// 		expect(service.redo()).toBe('test 3');

// 		expect(service.canRedo).toBe(false);

// 		expect(checkThrow(() => service.redo())).toBe(true);
// 	}));

// 	it('should clear the redo stack when undoing', asyncTest(async () => {
// 		const service = new UndoRedoService();

// 		service.push('test');
// 		service.push('test 2');
// 		service.push('test 3');

// 		service.undo();
// 		expect(service.canRedo).toBe(true);

// 		service.push('test 4');
// 		expect(service.canRedo).toBe(false);

// 		expect(service.undo()).toBe('test 4');
// 		expect(service.undo()).toBe('test 2');
// 	}));

// 	it('should limit the size of the undo stack', asyncTest(async () => {
// 		const service = new UndoRedoService();

// 		for (let i = 0; i < 30; i++) {
// 			service.push(`test${i}`);
// 		}

// 		for (let i = 0; i < 20; i++) {
// 			service.undo();
// 		}

// 		expect(service.canUndo).toBe(false);
// 	}));

// });
