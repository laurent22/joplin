import shim from '@joplin/lib/shim';
import { DocumentPickerResponse, pick, isErrorWithCode } from '@react-native-documents/picker';
import { openDocument } from '@joplin/react-native-saf-x';
import Logger from '@joplin/utils/Logger';
import type FsDriverWeb from './fs-driver/fs-driver-rn.web';
import uuid from '@joplin/lib/uuid';

interface SelectedDocument {
	type: string;
	mime: string;
	uri: string;
	fileName: string;
}

const logger = Logger.create('pickDocument');

interface Options {
	multiple?: boolean;
	preferCamera?: boolean;
}

const pickDocument = async ({ multiple = false, preferCamera = false }: Options = {}): Promise<SelectedDocument[]> => {
	let result: SelectedDocument[] = [];
	try {
		if (shim.mobilePlatform() === 'web') {
			await new Promise<void>((resolve, reject) => {
				const input = document.createElement('input');
				input.type = 'file';
				input.style.display = 'none';
				input.multiple = multiple;
				if (preferCamera) {
					input.capture = 'environment';
					input.accept = 'image/*';
				}
				document.body.appendChild(input);

				input.onchange = async () => {
					try {
						const fsDriver = shim.fsDriver() as FsDriverWeb;
						if (input.files.length > 0) {
							for (const file of input.files) {
								const path = `/tmp/${uuid.create()}`;
								await fsDriver.createReadOnlyVirtualFile(path, file);

								result.push({
									type: file.type,
									mime: file.type,
									uri: path,
									fileName: file.name,
								});
							}
						}
						resolve();
					} catch (error) {
						reject(error);
					} finally {
						input.remove();
					}
				};

				input.oncancel = () => {
					input.remove();
					resolve();
				};

				input.click();
			});
		} else if (shim.fsDriver().isUsingAndroidSAF()) {
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
				docPickerResult = await pick({ allowMultiSelection: true });
			} else {
				docPickerResult = await pick();
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
		if ((isErrorWithCode(error) && error.code === 'OPERATION_CANCELED') || error?.message?.includes('cancel')) {
			logger.info('user has cancelled');
			return [];
		} else {
			throw error;
		}
	}

	return result;
};

export default pickDocument;
