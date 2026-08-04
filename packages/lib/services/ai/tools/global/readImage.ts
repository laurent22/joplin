import { _ } from '../../../../locale';
import buildTool from '../utils/buildTool';
import { ToolError, ToolImageResponse } from '../types';
import Resource from '../../../../models/Resource';
import shim from '../../../../shim';
import { ResourceEntity } from '@joplin/renderer/types';
import isItemId from '../../../../models/utils/isItemId';

interface Input {
	id?: string;
	offset?: number;
	max_chars?: number;
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
	userDescription: (_input, output) => _('Read image: %s', output?.resource?.title ?? _('(untitled)')),
	description: 'View an image attachment. Use this to inspect the content of an image that\'s attached to a note or to generate ALT text. Returns the image data.',
	inputSchema: {
		type: 'object',
		properties: {
			id: { type: 'string', description: 'The attachment id (32-character hex).' },
		},
		required: ['id', 'resolution'],
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

		const fullPath = Resource.fullPath(resource);
		// Use a small default image size: Images can use a large number of tokens.
		const url = await shim.imageToDataUrl(fullPath, 256);
		return new ReadImageResponse(url, resource);
	},
});

export default tool;
