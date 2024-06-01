import { ResourceEntity } from '../../database/types';
import * as yaml from 'js-yaml';

const resourceToMetadataYml = (resource: ResourceEntity) => {
	const result: Partial<ResourceEntity> = {};

	result.id = resource.id;
	if ('title' in resource) {
		result.title = resource.title;
	}
	if ('ocr_text' in resource) {
		result.ocr_text = resource.ocr_text;
	}

	const fieldOrder = ['title', 'id', 'ocr_text'];
	return yaml.dump(result, { sortKeys: (a, b) => fieldOrder.indexOf(a) - fieldOrder.indexOf(b) });
};

export default resourceToMetadataYml;
