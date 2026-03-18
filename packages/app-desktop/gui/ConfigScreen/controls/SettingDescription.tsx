import * as React from 'react';
import { highlightSearchText } from '../configScreenUtils';

interface Props {
	text: string;
	id?: string;
	searchQuery?: string;
}

const SettingDescription: React.FC<Props> = props => {
	return <div className={`setting-description ${!props.text ? '-empty' : ''}`} id={props.id}>{highlightSearchText(props.text, props.searchQuery || '')}</div>;
};

export default SettingDescription;
