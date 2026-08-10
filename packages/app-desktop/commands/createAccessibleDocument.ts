import { CommandRuntime, CommandDeclaration } from '@joplin/lib/services/CommandService';
import Resource from '@joplin/lib/models/Resource';
import Setting from '@joplin/lib/models/Setting';
import shim from '@joplin/lib/shim';
import { _ } from '@joplin/lib/locale';
import { ResourceOcrStatus } from '@joplin/lib/services/database/types';
import bridge from '../services/bridge';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('createAccessibleDocument');

export const declaration: CommandDeclaration = {
	name: 'createAccessibleDocument',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: unknown, resourceId: string) => {
			const resource = await Resource.load(resourceId);
			if (!resource) {
				bridge().showErrorMessageBox(_('Resource not found'));
				return;
			}

			const resourcePath = Resource.fullPath(resource);

			if (resource.mime !== 'application/pdf') {
				bridge().showInfoMessageBox(_('This feature is only available for PDF files.'));
				return;
			}

			if (resource.ocr_status !== ResourceOcrStatus.Done) {
				bridge().showInfoMessageBox(_('OCR is not complete. Please wait for OCR to finish before creating an accessible document.'));
				return;
			}

			const ocrDetails = resource.ocr_details;

			// If ocr_details is missing (legacy PDF processed before this feature),
			// automatically re-run OCR to get the coordinate data
			if (!ocrDetails) {
				const result = await bridge().showMessageBox(_('OCR needs to run to generate an accessible document. This may take a moment. Would you like to continue?'), {
					buttons: [_('Run OCR'), _('Cancel')],
				});

				if (result === 1) return; // User cancelled

				// Trigger OCR re-run with TodoAccessible status to request full OCR details
				await Resource.save({
					id: resource.id,
					ocr_status: ResourceOcrStatus.TodoAccessible,
					ocr_details: '',
					ocr_error: '',
					ocr_text: '',
				});

				bridge().showInfoMessageBox(_('OCR has been queued. Please wait for it to complete and then try again.'));
				return;
			}

			// Show save dialog
			const defaultFilename = `${(resource.filename || resource.title || resource.id).replace(/\.pdf$/i, '')}_accessible.pdf`;
			const outputPath = await bridge().showSaveDialog({
				defaultPath: defaultFilename,
				filters: [{ name: 'PDF', extensions: ['pdf'] }],
			});

			if (!outputPath) return;

			try {
				await shim.createAccessiblePdf(resourcePath, ocrDetails, outputPath, Setting.value('tempDir'));
				await bridge().openItem(outputPath);
			} catch (error) {
				logger.error(error);
				bridge().showErrorMessageBox(_('Failed to create accessible document: %s', error.message));
			}
		},
	};
};
