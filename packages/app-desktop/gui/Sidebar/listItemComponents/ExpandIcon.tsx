import * as React from 'react';
import { _ } from '@joplin/lib/locale';

interface ExpandIconProps {
	isExpanded: boolean;
	isVisible: boolean;
}

const ExpandIcon: React.FC<ExpandIconProps> = props => {
	const classNames = ['sidebar-expand-icon'];
	if (props.isVisible) classNames.push('-visible');
	classNames.push(props.isExpanded ? 'fas fa-caret-down' : 'fas fa-caret-right');

	// Referencing the name of the item we expand/collapse is both good for accessibility
	// and makes writing tests easier.
	const getLabel = () => {
		if (!props.isVisible) {
			return undefined;
		}
		if (props.isExpanded) {
			return _('Expanded');
		}
		return _('Collapsed');
	};
	const label = getLabel();
	return <i
		className={classNames.join(' ')}
		aria-hidden={!props.isVisible}
		aria-label={label}
		role='img'
	></i>;
};

export default ExpandIcon;
