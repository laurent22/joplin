import Resource, { NoteResourceSortDirection, NoteResourceSortField } from '@joplin/lib/models/Resource';
import markdownUtils from '@joplin/lib/markdownUtils';
import { ResourceEntity } from '@joplin/lib/services/database/types';

interface NoteResourceSortState {
	sortField: NoteResourceSortField;
	sortDirection: NoteResourceSortDirection;
}

export const nextSortState = (currentField: NoteResourceSortField, currentDirection: NoteResourceSortDirection, nextField: NoteResourceSortField): NoteResourceSortState => {
	if (nextField === currentField) {
		return {
			sortField: currentField,
			sortDirection: currentDirection === 'asc' ? 'desc' : 'asc',
		};
	}

	return {
		sortField: nextField,
		sortDirection: 'desc',
	};
};

export const buildResourceMarkdownLink = (resource: ResourceEntity) => {
	if (!resource.id) return '';

	const fallbackTitle = Resource.friendlySafeFilename(resource);
	const resourceTitle = resource.title ? resource.title : fallbackTitle;
	const escapedTitle = markdownUtils.escapeTitleText(resourceTitle);
	const prefix = Resource.isSupportedImageMimeType(resource.mime || '') ? '!' : '';
	return `${prefix}[${escapedTitle}](:/${resource.id})`;
};
