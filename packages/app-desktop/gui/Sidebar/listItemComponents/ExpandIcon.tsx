import * as React from 'react';
import { _ } from '@joplin/lib/locale';

type ExpandIconProps = {
	isExpanded: boolean;
	isVisible: true;
	targetTitle: string;
}|{
	isExpanded: boolean;
	isVisible: false;
	targetTitle?: string;
};

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
			return _('Collapse %s', props.targetTitle);
		}
		return _('Expand %s', props.targetTitle);
	};
	return <i className={classNames.join(' ')} aria-label={getLabel()}></i>;
};

export default ExpandIcon;
