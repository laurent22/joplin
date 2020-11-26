/* eslint-disable no-unused-vars */

require('app-module-path').addPath(__dirname);

const { uuid } = require('lib/uuid.js');
const { time } = require('lib/time-utils.js');
const { asyncTest, sleep, fileApi, fileContentEqual, checkThrowAsync } = require('test-utils.js');
const { shim } = require('lib/shim.js');
const fs = require('fs-extra');
const Setting = require('lib/models/Setting.js');

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

const api = null;

// NOTE: These tests work with S3 and memory driver, but not
// with other targets like file system or Nextcloud.
// All this is tested in an indirect way in tests/synchronizer
// anyway.
// We keep the file here as it could be useful as a spec for
// what calls a sync target should support, but it would
// need to be fixed first.



// To test out an FileApi implementation:
// * add a SyncTarget for your driver in `test-utils.js`
// * set `syncTargetId_` to your New SyncTarget:
//   `const syncTargetId_ = SyncTargetRegistry.nameToId('memory');`
// describe('fileApi', function() {

// 	beforeEach(async (done) => {
// 		api = new fileApi();
// 		api.clearRoot();
// 		done();
// 	});

// 	describe('list', function() {
// 		it('should return items with relative path', asyncTest(async () => {
// 			await api.mkdir('.subfolder');
// 			await api.put('1', 'something on root 1');
// 			await api.put('.subfolder/1', 'something subfolder 1');
// 			await api.put('.subfolder/2', 'something subfolder 2');
// 			await api.put('.subfolder/3', 'something subfolder 3');
// 			sleep(0.8);

// 			const response = await api.list('.subfolder');
// 			const items = response.items;
// 			expect(items.length).toBe(3);
// 			expect(items[0].path).toBe('1');
// 			expect(items[0].updated_time).toMatch(/^\d+$/); // make sure it's using epoch timestamp
// 		}));

// 		it('should default to only files on root directory', asyncTest(async () => {
// 			await api.mkdir('.subfolder');
// 			await api.put('.subfolder/1', 'something subfolder 1');
// 			await api.put('file1', 'something 1');
// 			await api.put('file2', 'something 2');
// 			sleep(0.6);

// 			const response = await api.list();
// 			expect(response.items.length).toBe(2);
// 		}));
// 	}); // list

// 	describe('delete', function() {
// 		it('should not error if file does not exist', asyncTest(async () => {
// 			const hasThrown = await checkThrowAsync(async () => await api.delete('nonexistant_file'));
// 			expect(hasThrown).toBe(false);
// 		}));

// 		it('should delete specific file given full path', asyncTest(async () => {
// 			await api.mkdir('deleteDir');
// 			await api.put('deleteDir/1', 'something 1');
// 			await api.put('deleteDir/2', 'something 2');
// 			sleep(0.4);

// 			await api.delete('deleteDir/1');
// 			let response = await api.list('deleteDir');
// 			expect(response.items.length).toBe(1);
// 			response = await api.list('deleteDir/1');
// 			expect(response.items.length).toBe(0);
// 		}));
// 	}); // delete

// 	describe('get', function() {
// 		it('should return null if object does not exist', asyncTest(async () => {
// 			const response = await api.get('nonexistant_file');
// 			expect(response).toBe(null);
// 		}));

// 		it('should return UTF-8 encoded string by default', asyncTest(async () => {
// 			await api.put('testnote.md', 'something 2');

// 			const response = await api.get('testnote.md');
// 			expect(response).toBe('something 2');
// 		}));

// 		it('should return a Response object and writes file to options.path, if options.target is "file"', asyncTest(async () => {
// 			const localFilePath = `${Setting.value('tempDir')}/${uuid.create()}.md`;
// 			await api.put('testnote.md', 'something 2');
// 			sleep(0.2);

// 			const response = await api.get('testnote.md', { target: 'file', path: localFilePath });
// 			expect(typeof response).toBe('object');
// 			// expect(response.path).toBe(localFilePath);
// 			expect(fs.existsSync(localFilePath)).toBe(true);
// 			expect(fs.readFileSync(localFilePath, 'utf8')).toBe('something 2');
// 		}));
// 	}); // get

// 	describe('put', function() {
// 		it('should create file to remote path and content', asyncTest(async () => {
// 			await api.put('putTest.md', 'I am your content');
// 			sleep(0.2);

// 			const response = await api.get('putTest.md');
// 			expect(response).toBe('I am your content');
// 		}));

// 		it('should upload file in options.path to remote path, if options.source is "file"', asyncTest(async () => {
// 			const localFilePath = `${Setting.value('tempDir')}/${uuid.create()}.md`;
// 			fs.writeFileSync(localFilePath, 'I am the local file.');

// 			await api.put('testfile', 'ignore me', { source: 'file', path: localFilePath });
// 			sleep(0.2);

// 			const response = await api.get('testfile');
// 			expect(response).toBe('I am the local file.');
// 		}));
// 	}); // put

// });
