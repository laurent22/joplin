import { createNoteAndResource, newOcrService, ocrSampleDir, resourceFetcher, setupDatabaseAndSynchronizer, supportDir, switchClient, synchronizerStart } from '../../testing/test-utils';
import { supportedMimeTypes } from './OcrService';
import Resource from '../../models/Resource';
import { ResourceEntity, ResourceOcrStatus } from '../database/types';
import { msleep } from '@joplin/utils/time';
import Logger from '@joplin/utils/Logger';

describe('OcrService', () => {

	jest.retryTimes(2);

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await setupDatabaseAndSynchronizer(2);
		await switchClient(1);
	});

	it('should process resources', async () => {
		const { resource: resource1 } = await createNoteAndResource({ path: `${ocrSampleDir}/testocr.png` });
		const { resource: resource2 } = await createNoteAndResource({ path: `${supportDir}/photo.jpg` });
		const { resource: resource3 } = await createNoteAndResource({ path: `${ocrSampleDir}/with_bullets.png` });

		// Wait to make sure that updated_time is updated
		await msleep(1);

		expect(await Resource.needOcrCount(supportedMimeTypes)).toBe(3);

		const service = newOcrService();
		await service.processResources();

		const expectedText = 'This is a lot of 12 point text to test the\n' +
			'ocr code and see if it works on all types\n' +
			'of file format.\n' +
			'The quick brown dog jumped over the\n' +
			'lazy fox. The quick brown dog jumped\n' +
			'over the lazy fox. The quick brown dog\n' +
			'jumped over the lazy fox. The quick\n' +
			'brown dog jumped over the lazy fox.';
		const processedResource1: ResourceEntity = await Resource.load(resource1.id);
		expect(processedResource1.ocr_text).toBe(expectedText);
		expect(processedResource1.ocr_status).toBe(ResourceOcrStatus.Done);
		expect(processedResource1.ocr_error).toBe('');

		const details = Resource.unserializeOcrDetails(processedResource1.ocr_details);
		const lines = details.map(l => l.words.map(w => w.t).join(' ')).join('\n');
		expect(lines).toBe(expectedText);
		expect(details[0].words[0].t).toBe('This');
		expect(details[0].words[0]).toEqual({ 't': 'This', 'bb': [36, 96, 92, 116], 'bl': [36, 96, 116, 116] });

		// Also check that the resource blob has not been updated
		expect(processedResource1.blob_updated_time).toBe(resource1.blob_updated_time);
		expect(processedResource1.updated_time).toBeGreaterThan(resource1.updated_time);

		const processedResource2: ResourceEntity = await Resource.load(resource2.id);
		expect(processedResource2.ocr_text).toBe('');
		expect(processedResource2.ocr_status).toBe(ResourceOcrStatus.Done);
		expect(processedResource2.ocr_error).toBe('');

		const processedResource3: ResourceEntity = await Resource.load(resource3.id);
		expect(processedResource3.ocr_text).toBe('Declaration\n' +
			'| declare that:\n' +
			'® | will arrive in the UK within the next 48 hours\n' +
			'® | understand | have to provide proof of a negative COVID 19 test prior to departure to the UK (unless\n' +
			'exempt)\n' +
			'® | have provided my seat number, if relevant\n' +
			'® The information | have entered in this form is correct\n' +
			'® | understand it could be a criminal offence to provide false details and | may be prosecuted\n' +
			'If any of your information changes once you have submitted your details, such as travel details, seat number, or\n' +
			'contact information, you must complete a new form.\n' +
			'| confirm that | understand and agree with the above declarations.',
		);
		expect(processedResource3.ocr_status).toBe(ResourceOcrStatus.Done);
		expect(processedResource3.ocr_error).toBe('');

		// Also check that the resource blob has not been updated
		expect(processedResource2.blob_updated_time).toBe(resource2.blob_updated_time);
		expect(processedResource2.updated_time).toBeGreaterThan(resource2.updated_time);

		await service.dispose();

		// On CI these tests can randomly throw the error "Exceeded timeout of
		// 90000 ms for a test.". So for now increase the timeout and if that's
		// not sufficient it means the test is simply stuck, and we should use
		// `jest.retryTimes(2)`
	}, 60000 * 5);

	test.each([
		// Use embedded text (skip OCR)
		['dummy.pdf', 'Dummy PDF file'],
		['multi_page__embedded_text.pdf', 'This is a test.\nTesting...\nThis PDF has 3 pages.\nThis is page 3.'],
		['multi_page__no_embedded_text.pdf', 'This is a multi-page PDF\nwith no embedded text.\nPage 2: more text.\nThe third page.'],
	])('should process PDF resources', async (samplePath: string, expectedText: string) => {
		const { resource } = await createNoteAndResource({ path: `${ocrSampleDir}/${samplePath}` });

		const service = newOcrService();

		await service.processResources();

		const processedResource: ResourceEntity = await Resource.load(resource.id);
		expect(processedResource.ocr_text).toBe(expectedText);
		expect(processedResource.ocr_status).toBe(ResourceOcrStatus.Done);
		expect(processedResource.ocr_error).toBe('');

		await service.dispose();
	});

	it('should handle case where resource blob has not yet been downloaded', async () => {
		await createNoteAndResource({ path: `${ocrSampleDir}/dummy.pdf` });

		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();

		await msleep(1);

		const service = newOcrService();

		await service.processResources();

		{
			const resource: ResourceEntity = (await Resource.all())[0];
			expect(resource.ocr_text).toBe('');
			expect(resource.ocr_error).toBe('');
			expect(resource.ocr_status).toBe(ResourceOcrStatus.Todo);
		}

		await resourceFetcher().startAndWait();

		await service.processResources();

		{
			const resource: ResourceEntity = (await Resource.all())[0];
			expect(resource.ocr_text).toBe('Dummy PDF file');
			expect(resource.ocr_error).toBe('');
			expect(resource.ocr_status).toBe(ResourceOcrStatus.Done);
		}

		await service.dispose();
	});

	it('should handle case where resource blob cannot be downloaded', async () => {
		await createNoteAndResource({ path: `${ocrSampleDir}/dummy.pdf` });

		await synchronizerStart();

		await switchClient(2);

		await synchronizerStart();

		const resource: ResourceEntity = (await Resource.all())[0];

		// ----------------------------------------------------------------
		// Fetch status is an error so OCR status will be an error too
		// ----------------------------------------------------------------

		await Resource.setLocalState(resource.id, {
			resource_id: resource.id,
			fetch_status: Resource.FETCH_STATUS_ERROR,
			fetch_error: 'cannot be downloaded',
		});

		const service = newOcrService();

		// The service will print a warning so we disable it in tests
		Logger.globalLogger.enabled = false;
		await service.processResources();
		Logger.globalLogger.enabled = true;

		{
			const resource: ResourceEntity = (await Resource.all())[0];
			expect(resource.ocr_text).toBe('');
			expect(resource.ocr_error).toContain('Cannot process resource');
			expect(resource.ocr_error).toContain('cannot be downloaded');
			expect(resource.ocr_status).toBe(ResourceOcrStatus.Error);
		}

		// ----------------------------------------------------------------
		// After the fetch status is reset and the resource downloaded, it
		// should also retry OCR and succeed.
		// ----------------------------------------------------------------

		await Resource.resetFetchErrorStatus(resource.id);

		await resourceFetcher().startAndWait();

		await service.processResources();

		{
			const resource: ResourceEntity = (await Resource.all())[0];
			expect(resource.ocr_text).toBe('Dummy PDF file');
			expect(resource.ocr_error).toBe('');
			expect(resource.ocr_status).toBe(ResourceOcrStatus.Done);
		}

		await service.dispose();
	});

	it('should handle conflicts if two clients process the same resource then sync', async () => {
		await createNoteAndResource({ path: `${ocrSampleDir}/dummy.pdf` });

		const service1 = newOcrService();
		await synchronizerStart();
		await service1.processResources();

		await switchClient(2);

		await synchronizerStart();
		await msleep(1);
		await resourceFetcher().startAndWait();
		const service2 = newOcrService();
		await service2.processResources();
		await synchronizerStart();
		const expectedResourceUpdatedTime = (await Resource.all())[0].updated_time;

		await switchClient(1);

		await synchronizerStart();

		// A conflict happened during sync, but it is resolved by keeping the
		// remote version.

		expect((await Resource.all()).length).toBe(1);

		{
			const resource: ResourceEntity = (await Resource.all())[0];
			expect(resource.ocr_text).toBe('Dummy PDF file');
			expect(resource.ocr_error).toBe('');
			expect(resource.ocr_status).toBe(ResourceOcrStatus.Done);
			expect(resource.updated_time).toBe(expectedResourceUpdatedTime);
		}

		await service1.dispose();
		await service2.dispose();
	});

	// Use this to quickly test with specific images:

	// it('should process resources 2', async () => {
	// 	await createNoteAndResource({ path: `${require('os').homedir()}/Desktop/AllClients.png` });

	// 	const service = newOcrService();
	// 	await service.processResources();

	// 	console.info(await Resource.all());

	// 	await service.dispose();
	// });

});
