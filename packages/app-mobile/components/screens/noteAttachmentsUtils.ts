import Resource, { NoteAttachmentSortDirection, NoteAttachmentSortField } from '@joplin/lib/models/Resource';
import markdownUtils from '@joplin/lib/markdownUtils';
import { ResourceEntity } from '@joplin/lib/services/database/types';

interface NoteAttachmentSortState {
	sortField: NoteAttachmentSortField;
	sortDirection: NoteAttachmentSortDirection;
}

export const nextSortState = (currentField: NoteAttachmentSortField, currentDirection: NoteAttachmentSortDirection, nextField: NoteAttachmentSortField): NoteAttachmentSortState => {
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
	return `![${markdownUtils.escapeTitleText(resourceTitle)}](:/${resource.id})`;
};
