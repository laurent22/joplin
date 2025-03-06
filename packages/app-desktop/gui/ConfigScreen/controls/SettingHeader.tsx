import * as React from 'react';

interface Props {
	text: string;
}

const SettingHeader: React.FC<Props> = props => {
	return (
		<div className='setting-header'>
			<label>{props.text}</label>
		</div>
	);
};

export default SettingHeader;
