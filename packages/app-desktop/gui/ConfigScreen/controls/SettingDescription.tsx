import * as React from 'react';

interface Props {
	text: string;
	id?: string;
}

const SettingDescription: React.FC<Props> = props => {
	return props.text ? <div className='setting-description' id={props.id}>{props.text}</div> : null;
};

export default SettingDescription;
