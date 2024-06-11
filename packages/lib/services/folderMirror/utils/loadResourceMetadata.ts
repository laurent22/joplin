import { resourceMetadataExtension } from '../constants';
import shim from '../../../shim';
import * as yaml from 'js-yaml';
import { ResourceEntity } from '../../database/types';
import { basename, extname } from 'path';
import debugLogger from './debugLogger';
import { fromFilename as mimeFromFilename } from '@joplin/lib/mime-utils';


const loadResourceMetadata = async (resourcePath: string): Promise<ResourceEntity> => {
	const metadataPath = `${resourcePath}${resourceMetadataExtension}`;

	const filename = basename(resourcePath);
	const extension = extname(resourcePath);
	const result: ResourceEntity = {
		mime: mimeFromFilename(filename),
		filename,
		title: filename.substring(0, filename.length - extension.length),
		// Internally, file_extension should not have a leading ".". Otherwise, the dot will
		// be repeated when saving.
		file_extension: extension.replace(/^\./, ''),
	};

	if (!await shim.fsDriver().exists(metadataPath)) {
		debugLogger.debug('Couldn\'t find metadata at path', metadataPath);
		return result;
	}

	const metadataString = await shim.fsDriver().readFile(metadataPath, 'utf8');
	const metadata = yaml.load(metadataString);
	if (typeof metadata !== 'object') {
		throw new Error('Wrong resource metadata format. Expected YAML object.');
	}

	if (!('id' in metadata) || typeof metadata.id !== 'string') {
		throw new Error('Expected metadata.id to be a string');
	}

	result.id = metadata.id;

	if ('title' in metadata) {
		result.title = `${metadata.title}`;
	}

	if ('ocr_text' in metadata) {
		result.ocr_text = `${metadata.ocr_text}`;
	}

	debugLogger.debug('Loaded metadata', result);
	return result;
};

export default loadResourceMetadata;
