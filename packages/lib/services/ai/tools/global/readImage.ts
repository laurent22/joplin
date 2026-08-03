import { _ } from '../../../../locale';
import buildTool from '../utils/buildTool';
import { ToolError, ToolImageResponse } from '../types';
import Resource from '../../../../models/Resource';
import shim from '../../../../shim';
import { ResourceEntity } from '@joplin/renderer/types';

interface Input {
	id?: string;
	offset?: number;
	max_chars?: number;
}

class ReadImageResponse extends ToolImageResponse {
	public constructor(dataUrl: string, public readonly resource: ResourceEntity) {
		super(dataUrl, resource.mime);
	}
}

const tool = buildTool({
	id: 'read_image',
	userDescription: (_input, output) => _('Read image: %s', output?.resource?.title ?? _('(untitled)')),
	description: 'Read a single image attachment by id.',
	inputSchema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'The attachment id (32-character hex).' },
		},
		required: ['id'],
	},
	handler: async (input: Input): Promise<ReadImageResponse> => {
		if (!input.id) throw new ToolError('Missing "id" parameter');

		const resource = await Resource.load(input.id);
		if (!resource || resource.is_locked) {
			throw new ToolError(`Resource not found: ${input.id}`);
		}
		if (resource.encryption_applied) {
			throw new ToolError(`Resource is encrypted: ${input.id}`);
		}
		if (!resource.mime.startsWith('image/')) {
			throw new ToolError(`Unsupported image MIME type: ${resource.mime}`);
		}

		const fullPath = Resource.fullPath(resource);
		const url = await shim.imageToDataUrl(fullPath, 256);
		return new ReadImageResponse(url, resource);
	},
});

export default tool;
