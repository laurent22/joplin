import * as React from 'react';

interface Props {
	text: string;
}

const SettingHeader: React.FC<Props> = props => {
	return (
		<div className='setting-header'>
			<span>{props.text}</span>
		</div>
	);
};

export default SettingHeader;
