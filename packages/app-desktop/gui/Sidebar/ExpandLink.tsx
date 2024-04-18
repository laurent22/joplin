import * as React from 'react';
import { MouseEventHandler } from 'react';
import ExpandIcon from './ExpandIcon';

interface ExpandLinkProps {
	themeId: number;
	folderId: string;
	hasChildren: boolean;
	isExpanded: boolean;
	onClick: MouseEventHandler<HTMLElement>;
}

const ExpandLink: React.FC<ExpandLinkProps> = props => {
	return props.hasChildren ? (
		<a className='sidebar-expand-link' href="#" data-folder-id={props.folderId} onClick={props.onClick}>
			<ExpandIcon isVisible={true} isExpanded={props.isExpanded}/>
		</a>
	) : (
		<a className='sidebar-expand-link'><ExpandIcon isVisible={false} isExpanded={false}/></a>
	);
};

export default ExpandLink;
