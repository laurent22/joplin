import * as React from 'react';
import { highlightText } from '../searchUtils';

interface Props {
	htmlFor: string|null;
	text: string;
	searchQuery?: string;
}

const SettingLabel: React.FC<Props> = props => {
	const content = props.searchQuery ? highlightText(props.text, props.searchQuery) : props.text;
	return (
		<div className='setting-label'>
			<label htmlFor={props.htmlFor}>{content}</label>
		</div>
	);
};

export default SettingLabel;
