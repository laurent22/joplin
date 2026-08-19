import * as React from 'react';

interface Props {
	htmlFor: string|null;
	text: string;
	renderText?: (text: string)=> React.ReactNode;
}

const SettingLabel: React.FC<Props> = props => {
	return (
		<div className='setting-label'>
			<label htmlFor={props.htmlFor}>{props.renderText ? props.renderText(props.text) : props.text}</label>
		</div>
	);
};

export default SettingLabel;
