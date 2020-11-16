import Plugin from '../Plugin';

export type ViewHandle = string;

export default function createViewHandle(plugin: Plugin, id: string): ViewHandle {
	if (!id) throw new Error('A view ID must be provided');
	return `plugin-view-${plugin.id}-${id}`;
}
