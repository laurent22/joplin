import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import shim from '@joplin/lib/shim';
import * as React from 'react';
import { View, ViewStyle } from 'react-native';
import { _ } from '@joplin/lib/locale';
import { PluginCallback } from '../utils/usePluginCallbacks';
import PluginChip from './PluginChip';
import { themeStyle } from '../../../../global-style';

interface Props {
	themeId: number;
	item: PluginItem;
	hasErrors: boolean;
	isCompatible: boolean;
	canUpdate: boolean;
	showInstalledChip: boolean;

	onShowPluginLog?: PluginCallback;
}

const containerStyle: ViewStyle = {
	flexDirection: 'row',
	gap: 4,

	// Smaller than default chip size
	transform: [{ scale: 0.84 }],
	transformOrigin: 'left',
};

const PluginChips: React.FC<Props> = props => {
	const item = props.item;

	const theme = themeStyle(props.themeId);

	const renderErrorsChip = () => {
		if (!props.hasErrors) return null;

		return (
			<PluginChip
				color={theme.colorError2}
				icon='alert'
				onPress={() => props.onShowPluginLog({ item })}
			>
				{_('Error')}
			</PluginChip>
		);
	};

	const renderBuiltInChip = () => {
		if (!props.item.builtIn) {
			return null;
		}
		return <PluginChip icon='code-tags-check'>{_('Built-in')}</PluginChip>;
	};

	const renderIncompatibleChip = () => {
		if (props.isCompatible) return null;
		return (
			<PluginChip
				color={theme.color3}
				icon='alert'
				onPress={() => {
					void shim.showMessageBox(
						PluginService.instance().describeIncompatibility(props.item.manifest),
						{ buttons: [_('OK')] },
					);
				}}
			>{_('Incompatible')}</PluginChip>
		);
	};

	const renderUpdatableChip = () => {
		if (!props.isCompatible || !props.canUpdate) return null;

		return (
			<PluginChip>{_('Update available')}</PluginChip>
		);
	};

	const renderDisabledChip = () => {
		if (props.item.enabled || !props.item.installed) {
			return null;
		}
		return <PluginChip faded={true}>{_('Disabled')}</PluginChip>;
	};

	const renderInstalledChip = () => {
		if (!props.showInstalledChip) {
			return null;
		}
		return <PluginChip faded={true}>{_('Installed')}</PluginChip>;
	};

	const renderDevChip = () => {
		if (!item.devMode) {
			return null;
		}
		return <PluginChip faded={true}>{_('Dev')}</PluginChip>;
	};

	return <View style={containerStyle}>
		{renderIncompatibleChip()}
		{renderInstalledChip()}
		{renderErrorsChip()}
		{renderBuiltInChip()}
		{renderUpdatableChip()}
		{renderDevChip()}
		{renderDisabledChip()}
	</View>;
};

export default PluginChips;
