import * as React from 'react';
import { highlightSearchText } from '../configScreenUtils';

interface Props {
	text: string;
	searchQuery?: string;
}

const SettingHeader: React.FC<Props> = props => {
	return (
		<div className='setting-header'>
			<label>{highlightSearchText(props.text, props.searchQuery || '')}</label>
		</div>
	);
};

export default SettingHeader;
