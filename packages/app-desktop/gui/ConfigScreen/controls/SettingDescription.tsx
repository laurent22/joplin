import * as React from 'react';
import { highlightText } from '../searchUtils';

interface Props {
	text: string;
	id?: string;
	searchQuery?: string;
}

const SettingDescription: React.FC<Props> = props => {
	const content = props.searchQuery && props.text ? highlightText(props.text, props.searchQuery) : props.text;
	return <div className={`setting-description ${!props.text ? '-empty' : ''}`} id={props.id}>{content}</div>;
};

export default SettingDescription;
