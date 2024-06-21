import Logger from '@joplin/utils/Logger';
import time from '../../time';
import { formatMsToRelative } from '@joplin/utils/time';
import { TagEntity } from '../database/types';
import { ListRendererDependency, RenderNoteView } from '../plugins/api/noteListType';

const logger = Logger.create('renderViewProps');

export interface RenderViewPropsOptions {
	// Note that we don't render the title here, because it requires the mark.js package which is
	// only available on the `app-desktop` package. So the caller needs to pre-render the title and
	// pass it as an option.
	noteTitleHtml: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const renderViewProp = (name: ListRendererDependency, value: any, options: RenderViewPropsOptions): string => {
	const renderers: Partial<Record<ListRendererDependency, ()=> string>> = {
		'note.user_updated_time': () => formatMsToRelative(value),
		'note.user_created_time': () => formatMsToRelative(value),
		'note.updated_time': () => formatMsToRelative(value),
		'note.created_time': () => formatMsToRelative(value),
		'note.todo_completed': () => value ? time.formatMsToLocal(value) : '',
		'note.todo_due': () => value ? time.formatMsToLocal(value) : '',
		'note.tags': () => value ? value.map((t: TagEntity) => t.title).join(', ') : '',
		'note.title': () => options.noteTitleHtml,
	};

	try {
		const renderer = renderers[name];
		if (renderer) return renderer();
	} catch (error) {
		// If the input value doesn't have the expected format, it may have been changed by the
		// user. In that case we return the value without rendering it.
		logger.warn('Could not render property:', name, 'With value:', value, 'Error:', error);
		return value;
	}

	return value;
};

const renderViewProps = async (view: RenderNoteView, parentPath: string[], options: RenderViewPropsOptions) => {
	for (const [name, value] of Object.entries(view)) {
		const currentPath = parentPath.concat([name]);
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			await renderViewProps(value, currentPath, options);
		} else {
			view[name] = renderViewProp(currentPath.join('.') as ListRendererDependency, value, options);
		}
	}
};

export default renderViewProps;
