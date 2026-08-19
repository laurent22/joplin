import * as React from 'react';

interface Props {
	text: string|null;
	id?: string;
	renderText?: (text: string)=> React.ReactNode;
}

const SettingDescription: React.FC<Props> = props => {
	const renderedText = props.text && props.renderText ? props.renderText(props.text) : props.text;
	return <div className={`setting-description ${!props.text ? '-empty' : ''}`} id={props.id}>{renderedText}</div>;
};

export default SettingDescription;
