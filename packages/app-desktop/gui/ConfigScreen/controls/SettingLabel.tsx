import * as React from 'react';
import { highlightSearchText } from '../configScreenUtils';

interface Props {
	htmlFor: string|null;
	text: string;
	searchQuery?: string;
}

const SettingLabel: React.FC<Props> = props => {
	return (
		<div className='setting-label'>
			<label htmlFor={props.htmlFor}>{highlightSearchText(props.text, props.searchQuery || '')}</label>
		</div>
	);
};

export default SettingLabel;
