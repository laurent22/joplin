import { Synchronizer } from 'src/synchronizer.js';
import { FileApi } from 'src/file-api.js';
import { FileApiDriverMemory } from 'src/file-api-driver-memory.js';

describe("syncActions", function() {

	let fileDriver = new FileApiDriverMemory();
	let fileApi = new FileApi('/root', fileDriver);
	let synchronizer = new Synchronizer(null, fileApi);

	it("and so is a spec", function() {
		let localItems = [];
		localItems.push({ path: 'test', isDir: true, updatedTime: 1497370000 });
		localItems.push({ path: 'test/un', updatedTime: 1497370000 });
		localItems.push({ path: 'test/deux', updatedTime: 1497370000 });

		let remoteItems = [];

		let actions = synchronizer.syncActions(localItems, remoteItems, 0);

		expect(actions.length).toBe(3);
		



		// synchronizer.format();
		// synchronizer.mkdir('test');
		// synchronizer.touch('test/un');
		// synchronizer.touch('test/deux');
		// synchronizer.touch('test/trois');
	});
});