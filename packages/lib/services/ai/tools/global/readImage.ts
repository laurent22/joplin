import { _ } from '../../../../locale';
import buildTool from '../utils/buildTool';
import { ToolError, ToolImageResponse } from '../types';
import Resource from '../../../../models/Resource';
import shim from '../../../../shim';
import { ResourceEntity } from '@joplin/renderer/types';
import isItemId from '../../../../models/utils/isItemId';

interface Input {
	id?: string;
	resolution?: 'low'|'medium'|'high';
}

class ReadImageResponse extends ToolImageResponse {
	public constructor(dataUrl: string, public readonly resource: ResourceEntity) {
		super({
			dataUrl,
			mimeType: resource.mime,
			id: resource.id,
		});
	}
}

const tool = buildTool({
	id: 'read_image',
	userDescription: (_input, output) => {
		return _('Read image: %s', output?.resource?.title ?? _('(untitled)'));
	},
	description: 'View an image attachment. Use this to describe image content or text. Returns the image data.',
	inputSchema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'The attachment id (32-character hex).' },
			resolution: {
				type: 'string',
				enum: ['low', 'medium', 'high'],
				default: 'medium',
				description: 'The quality of the image. High resolution is better for OCR, but uses more tokens.',
			},
		},
		required: ['id'],
	},
	handler: async (input: Input): Promise<ReadImageResponse> => {
		if (!input.id) throw new ToolError('Missing "id" parameter');
		// Models sometimes try to pass the full resource link. Handle this gracefully:
		const id = input.id.replace(/^:?\//, '');
		if (!isItemId(id)) throw new ToolError(`Invalid ID: ${id}`);

		const resource = await Resource.load(id);
		if (!resource || resource.is_locked) {
			throw new ToolError(`Resource not found: ${id}`);
		}
		if (resource.encryption_applied) {
			throw new ToolError(`Resource is encrypted: ${id}`);
		}
		if (!resource.mime.startsWith('image/')) {
			throw new ToolError(`Unsupported image MIME type: ${resource.mime}`);
		}

		const resolution = input.resolution ?? 'medium';
		if (!['low', 'medium', 'high'].includes(resolution)) {
			throw new ToolError(`Invalid resolution: ${JSON.stringify(resolution)}`);
		}

		let maximumSize = 128;
		if (resolution === 'medium') {
			maximumSize = 256;
		} else if (resolution === 'high') {
			maximumSize = 512;
		}

		const fullPath = Resource.fullPath(resource);
		// Use a small default image size: Images can use a large number of tokens.
		const url = await shim.imageToDataUrl(fullPath, maximumSize);
		return new ReadImageResponse(url, resource);
	},
});

export default tool;
