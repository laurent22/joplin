import * as React from 'react';
import ExpandIcon from './ExpandIcon';

interface Props {
	className?: string;
}

const EmptyExpandLink: React.FC<Props> = props => {
	return <a className={`sidebar-expand-link ${props.className ?? ''}`}><ExpandIcon isVisible={false} isExpanded={false}/></a>;
};

export default EmptyExpandLink;
