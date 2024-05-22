import { resourceMetadataExtension } from '../constants';
import shim from '../../../shim';
import * as yaml from 'js-yaml';
import { ResourceEntity } from '../../database/types';

const loadResourceMetadata = async (resourcePath: string): Promise<ResourceEntity> => {
	const metadataPath = `${resourcePath}${resourceMetadataExtension}`;
	const metadataString = await shim.fsDriver().readFile(metadataPath, 'utf8');
	const metadata = yaml.load(metadataString);
	if (typeof metadata !== 'object') {
		throw new Error('Wrong resource metadata format. Expected YAML object.');
	}

	if (!('id' in metadata) || typeof metadata.id !== 'string') {
		throw new Error('Expected metadata.id to be a string');
	}

	return { id: metadata.id };
};

export default loadResourceMetadata;
