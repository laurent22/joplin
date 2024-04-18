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

	const label = props.isExpanded ? _('Collapse') : _('Expand');
	return <i className={classNames.join(' ')} aria-label={props.isVisible ? label : undefined}></i>;
};

export default ExpandIcon;
