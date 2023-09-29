import { createNoteAndResource, ocrSampleDir, setupDatabaseAndSynchronizer, supportDir, switchClient } from '../../testing/test-utils';
import OcrDriverTesseract from './drivers/OcrDriverTesseract';
import OcrService from './OcrService';
import { createWorker } from 'tesseract.js';
import Resource from '../../models/Resource';
import { ResourceEntity, ResourceOcrStatus } from '../database/types';

const newService = () => {
	const driver = new OcrDriverTesseract({ createWorker });
	return new OcrService(driver);
};

describe('OcrService', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should process resources', async () => {
		const { resource: resource1 } = await createNoteAndResource({ path: `${ocrSampleDir}/testocr.png` });
		const { resource: resource2 } = await createNoteAndResource({ path: `${supportDir}/photo.jpg` });
		const { resource: resource3 } = await createNoteAndResource({ path: `${ocrSampleDir}/with_bullets.png` });

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
		expect(Resource.parseOcrWords(processedResource1.ocr_words).length).toBe(60);

		const processedResource2: ResourceEntity = await Resource.load(resource2.id);
		expect(processedResource2.ocr_text).toBe('');
		expect(processedResource2.ocr_status).toBe(ResourceOcrStatus.Done);
		expect(processedResource2.ocr_error).toBe('');
		expect(Resource.parseOcrWords(processedResource2.ocr_words).length).toBe(0);

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
		expect(Resource.parseOcrWords(processedResource3.ocr_words).length).toBe(114);

		await service.dispose();
	});

});
