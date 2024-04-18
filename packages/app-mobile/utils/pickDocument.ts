import shim from '@joplin/lib/shim';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import { openDocument } from '@joplin/react-native-saf-x';
import Logger from '@joplin/utils/Logger';

interface SelectedDocument {
	type: string;
	mime: string;
	uri: string;
	fileName: string;
}

const logger = Logger.create('pickDocument');

const pickDocument = async (multiple: boolean): Promise<SelectedDocument[]> => {
	let result: SelectedDocument[] = [];
	try {
		if (shim.fsDriver().isUsingAndroidSAF()) {
			const openDocResult = await openDocument({ multiple });
			if (!openDocResult) {
				throw new Error('User canceled document picker');
			}
			result = openDocResult.map(r => {
				const converted: SelectedDocument = {
					type: r.mime,
					fileName: r.name,
					mime: r.mime,
					uri: r.uri,
				};

				return converted;
			});
		} else {
			let docPickerResult: DocumentPickerResponse[] = [];
			if (multiple) {
				docPickerResult = await DocumentPicker.pick({ allowMultiSelection: true });
			} else {
				docPickerResult = [await DocumentPicker.pickSingle()];
			}

			result = docPickerResult.map(r => {
				return {
					mime: '',
					type: r.type,
					uri: r.uri,
					fileName: r.name,
				};
			});
		}
	} catch (error) {
		if (DocumentPicker.isCancel(error) || error?.message?.includes('cancel')) {
			logger.info('user has cancelled');
			return [];
		} else {
			throw error;
		}
	}

	return result;
};

export default pickDocument;
