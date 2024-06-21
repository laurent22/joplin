import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import * as React from 'react';
import ActionButton from './ActionButton';
import { PluginCallback } from '../utils/usePluginCallbacks';
import { InstallState } from '../PluginBox';
import { _ } from '@joplin/lib/locale';

interface Props {
	item: PluginItem;
	onInstall: PluginCallback;
	installState: InstallState;
	isCompatible: boolean;
}

const InstallButton: React.FC<Props> = props => {
	const installButtonTitle = () => {
		if (props.installState === InstallState.Installing) return _('Installing...');
		if (props.installState === InstallState.NotInstalled) return _('Install');
		if (props.installState === InstallState.Installed) return _('Installed');
		return `Invalid install state: ${props.installState}`;
	};

	return (
		<ActionButton
			item={props.item}
			onPress={props.onInstall}
			disabled={props.installState !== InstallState.NotInstalled || !props.isCompatible}
			loading={props.installState === InstallState.Installing}
			title={installButtonTitle()}
		/>
	);
};

export default InstallButton;
