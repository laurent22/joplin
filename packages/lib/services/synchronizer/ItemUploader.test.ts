import { FileApi } from "../../file-api";
import Note from "../../models/Note";
import { setupDatabaseAndSynchronizer, switchClient } from "../../testing/test-utils";
import ItemUploader, { ApiCallFunction } from "./ItemUploader";

function newFakeApi():FileApi {
	return { supportsMultiPut: true } as any;
}

function newFakeApiCall(callRecorder:any[]):ApiCallFunction {
	const apiCall = async (callName:string, ...args:any[]):Promise<any> => {
		callRecorder.push({ callName, args });
	}
	return apiCall;
}

describe('synchronizer_ItemUplader', function() {

	beforeEach(async (done) => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
		done();
	});

	it('should batch uploads and use the cache afterwards', (async () => {
		// const callRecorder:any[] = [];
		// const itemUploader = new ItemUploader(newFakeApi(), newFakeApiCall(callRecorder));

		// const notes = [
		// 	await Note.save({ title: '1' }),
		// 	await Note.save({ title: '2' }),
		// ];

		// await itemUploader.preUploadItems(notes);

		// console.info(callRecorder);
	}));

});
