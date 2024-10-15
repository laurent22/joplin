import * as React from 'react';
import { MouseEventHandler } from 'react';
import ExpandIcon from './ExpandIcon';
import EmptyExpandLink from './EmptyExpandLink';

interface ExpandLinkProps {
	folderId: string;
	folderTitle: string;
	hasChildren: boolean;
	isExpanded: boolean;
	className: string;
	onClick: MouseEventHandler<HTMLElement>;
}

const ExpandLink: React.FC<ExpandLinkProps> = props => {
	return props.hasChildren ? (
		<a className={`sidebar-expand-link ${props.className}`} data-folder-id={props.folderId} onClick={props.onClick} role='button'>
			<ExpandIcon isVisible={true} isExpanded={props.isExpanded} targetTitle={props.folderTitle}/>
		</a>
	) : (
		<EmptyExpandLink className={props.className}/>
	);
};

export default ExpandLink;
