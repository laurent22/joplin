import * as React from 'react';

interface Props {
	htmlFor: string|null;
	text: string;
}

const SettingLabel: React.FC<Props> = props => {
	return (
		<div className='setting-label'>
			<label htmlFor={props.htmlFor}>{props.text}</label>
		</div>
	);
};

export default SettingLabel;
