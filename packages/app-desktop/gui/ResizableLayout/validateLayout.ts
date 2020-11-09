import { LayoutItem } from './ResizableLayout';

export default function validateLayout(layout:LayoutItem) {
	if (layout.children && layout.children.length > 1 && !layout.direction) throw new Error('Layout `direction` property must be specified when `children` property is present, and there is more than one child');
	if ((layout.resizableBottom || layout.resizableRight) && !layout.children) throw new Error('Only containers can be made resizable, not leaf items');

	if (layout.children) {
		for (const child of layout.children) {
			validateLayout(child);
		}
	}
}
