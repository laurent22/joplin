import * as React from 'react';

interface Props {
	text: React.ReactNode;
	id?: string;
}

const SettingDescription: React.FC<Props> = props => {
	return <div className={`setting-description ${!props.text ? '-empty' : ''}`} id={props.id}>{props.text}</div>;
};

export default SettingDescription;
