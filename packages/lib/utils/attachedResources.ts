import BaseModel from '../BaseModel';
import Note from '../models/Note';
import Resource from '../models/Resource';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
let resourceCache_: any = {};

export function clearResourceCache() {
	resourceCache_ = {};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default async function attachedResources(noteBody: string): Promise<any> {
	if (!noteBody) return {};
	const resourceIds = await Note.linkedItemIdsByType(BaseModel.TYPE_RESOURCE, noteBody);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const output: any = {};
	for (let i = 0; i < resourceIds.length; i++) {
		const id = resourceIds[i];

		if (resourceCache_[id]) {
			output[id] = resourceCache_[id];
		} else {
			const resource = await Resource.load(id);
			const localState = await Resource.localState(resource);

			const o = {
				item: resource,
				localState: localState,
			};

			// eslint-disable-next-line require-atomic-updates
			resourceCache_[id] = o;
			output[id] = o;
		}
	}

	return output;
}
