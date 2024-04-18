import * as React from 'react';
import ExpandIcon from './ExpandIcon';

interface Props {
}

const EmptyExpandLink: React.FC<Props> = _props => {
	return <a className='sidebar-expand-link'><ExpandIcon isVisible={false} isExpanded={false}/></a>;
};

export default EmptyExpandLink;
