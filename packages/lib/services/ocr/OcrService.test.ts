import { createNoteAndResource, ocrSampleDir, resourceFetcher, setupDatabaseAndSynchronizer, supportDir, switchClient, synchronizerStart } from '../../testing/test-utils';
import OcrDriverTesseract from './drivers/OcrDriverTesseract';
import OcrService from './OcrService';
import { supportedMimeTypes } from './OcrService';
import { createWorker } from 'tesseract.js';
import Resource from '../../models/Resource';
import { ResourceEntity, ResourceOcrStatus } from '../database/types';
import { msleep } from '@joplin/utils/time';
import Logger from '@joplin/utils/Logger';

const newService = () => {
	const driver = new OcrDriverTesseract({ createWorker });
	return new OcrService(driver);
};

describe('OcrService', () => {

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

		const service = newService();
		await service.processResources();

		const processedResource1: ResourceEntity = await Resource.load(resource1.id);
		expect(processedResource1.ocr_text).toBe(
			'This is a lot of 12 point text to test the\n' +
			'ocr code and see if it works on all types\n' +
			'of file format.\n' +
			'The quick brown dog jumped over the\n' +
			'lazy fox. The quick brown dog jumped\n' +
			'over the lazy fox. The quick brown dog\n' +
			'jumped over the lazy fox. The quick\n' +
			'brown dog jumped over the lazy fox.',
		);
		expect(processedResource1.ocr_status).toBe(ResourceOcrStatus.Done);
		expect(processedResource1.ocr_error).toBe('');

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
	});

	it('should process PDF resources', async () => {
		const { resource } = await createNoteAndResource({ path: `${ocrSampleDir}/dummy.pdf` });

		const service = newService();

		await service.processResources();

		const processedResource: ResourceEntity = await Resource.load(resource.id);
		expect(processedResource.ocr_text).toBe('Dummy PDF file');
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

		const service = newService();

		await service.processResources();

		{
			const resource: ResourceEntity = (await Resource.all())[0];
			expect(resource.ocr_text).toBe('');
			expect(resource.ocr_error).toBe('');
			expect(resource.ocr_status).toBe(ResourceOcrStatus.Todo);
		}

		await resourceFetcher().start();
		await resourceFetcher().waitForAllFinished();

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

		const service = newService();

		// The service will print a warnign so we disable it in tests
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

		await resourceFetcher().start();
		await resourceFetcher().waitForAllFinished();

		await service.processResources();

		{
			const resource: ResourceEntity = (await Resource.all())[0];
			expect(resource.ocr_text).toBe('Dummy PDF file');
			expect(resource.ocr_error).toBe('');
			expect(resource.ocr_status).toBe(ResourceOcrStatus.Done);
		}

		await service.dispose();
	});

	// it('should handle conflicts if two clients process the resources then sync', async () => {
	// 	const { resource } = await createNoteAndResource({ path: `${ocrSampleDir}/dummy.pdf` });

	// 	const service1 = newService();

	// 	await synchronizerStart();

	// 	await service1.processResources();

	// 	await switchClient(2);

	// 	await synchronizerStart();

	// 	await msleep(1);

	// 	const service2 = newService();

	// 	await service2.processResources();

	// 	console.info(await Resource.all());

	// 	// await synchronizerStart();

	// 	await service1.dispose();
	// 	await service2.dispose();
	// });

	// Use this to quickly test with specific images:

	// it('should process resources 2', async () => {
	// 	const { resource: resource1 } = await createNoteAndResource({ path: `${ocrSampleDir}/fed30c574db04d548b98631449f99727.png` });

	// 	const service = newService();
	// 	await service.processResources();

	// 	await service.dispose();
	// });

});
