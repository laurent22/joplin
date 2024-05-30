import { resourceMetadataExtension } from '../constants';
import shim from '../../../shim';
import * as yaml from 'js-yaml';
import { ResourceEntity } from '../../database/types';
import { basename, extname } from 'path';
const mimeUtils = require('@joplin/lib/mime-utils.js').mime;


const loadResourceMetadata = async (resourcePath: string): Promise<ResourceEntity> => {
	const metadataPath = `${resourcePath}${resourceMetadataExtension}`;

	const filename = basename(resourcePath);
	const result: ResourceEntity = {
		mime: mimeUtils.fromFilename(),
		filename,
		file_extension: extname(resourcePath),
	};

	if (!await shim.fsDriver().exists(metadataPath)) {
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

	return result;
};

export default loadResourceMetadata;
