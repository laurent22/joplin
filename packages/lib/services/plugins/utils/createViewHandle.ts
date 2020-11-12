import uuid from '../../../uuid';
import Plugin from '../Plugin';

export type ViewHandle = string;

export default function createViewHandle(plugin: Plugin): ViewHandle {
	return `plugin-view-${plugin.id}-${uuid.createNano()}`;
}
