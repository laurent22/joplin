
import * as React from 'react';
import Button, { ButtonLevel } from '../../Button/Button';
import { _ } from '@joplin/lib/locale';

interface Props {
	onClick: ()=> void;
	advancedSettingsVisible: boolean;
	'aria-controls': string;
}

const ToggleAdvancedSettingsButton: React.FunctionComponent<Props> = props => {
	const iconName = props.advancedSettingsVisible ? 'fa fa-angle-down' : 'fa fa-angle-right';
	return (
		<div style={{ marginBottom: 10 }}>
			<Button
				level={ButtonLevel.Secondary}
				onClick={props.onClick}
				iconName={iconName}

				aria-controls={props['aria-controls']}
				aria-expanded={props.advancedSettingsVisible}

				title={_('Show Advanced Settings')}
			/>
		</div>
	);
};
export default ToggleAdvancedSettingsButton;
