import { _ } from '@joplin/lib/locale';
import { QuickActionType } from './types';

interface QuickActionDef {
	type: QuickActionType;
	title: ()=> string;
	icon: string;
}

export const quickActionDefs: QuickActionDef[] = [
	{ type: 'newNote', title: () => _('New note'), icon: 'fa fa-pen' },
	{ type: 'newTodo', title: () => _('New to-do'), icon: 'fa fa-check-square' },
	{ type: 'newPhoto', title: () => _('New photo'), icon: 'fa fa-camera' },
	{ type: 'newResource', title: () => _('New attachment'), icon: 'fa fa-paperclip' },
	{ type: 'newDrawing', title: () => _('New drawing'), icon: 'fa fa-paint-brush' },
];

export const defForType = (type: QuickActionType): QuickActionDef => {
	const def = quickActionDefs.find(d => d.type === type);
	if (!def) throw new Error(`Unknown quick action type: ${type}`);
	return def;
};
