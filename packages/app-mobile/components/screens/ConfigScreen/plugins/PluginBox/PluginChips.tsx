import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import shim from '@joplin/lib/shim';
import * as React from 'react';
import { Alert, Linking, View } from 'react-native';
import { _ } from '@joplin/lib/locale';
import { Chip } from 'react-native-paper';
import { PluginCallback } from '../utils/usePluginCallbacks';
import StyledChip from './StyledChip';
import { themeStyle } from '../../../../global-style';

interface Props {
	themeId: number;
	item: PluginItem;
	hasErrors: boolean;
	isCompatible: boolean;
	canUpdate: boolean;

	onShowPluginLog?: PluginCallback;
}

const onRecommendedPress = () => {
	Alert.alert(
		'',
		_('The Joplin team has vetted this plugin and it meets our standards for security and performance.'),
		[
			{
				text: _('Learn more'),
				onPress: () => Linking.openURL('https://github.com/joplin/plugins/blob/master/readme/recommended.md'),
			},
			{
				text: _('OK'),
			},
		],
		{ cancelable: true },
	);
};

const PluginChips: React.FC<Props> = props => {
	const item = props.item;

	const theme = themeStyle(props.themeId);

	const renderErrorsChip = () => {
		if (!props.hasErrors) return null;

		return (
			<StyledChip
				background={theme.backgroundColor2}
				foreground={theme.colorError2}
				icon='alert'
				mode='flat'
				onPress={() => props.onShowPluginLog({ item })}
			>
				{_('Error')}
			</StyledChip>
		);
	};

	const renderRecommendedChip = () => {
		if (!props.item.manifest._recommended || !props.isCompatible) {
			return null;
		}
		return <StyledChip
			background={theme.searchMarkerBackgroundColor}
			foreground={theme.searchMarkerColor}
			icon='crown'
			onPress={onRecommendedPress}
		>{_('Recommended')}</StyledChip>;
	};

	const renderBuiltInChip = () => {
		if (!props.item.builtIn) {
			return null;
		}
		return <Chip icon='code-tags-check'>{_('Built-in')}</Chip>;
	};

	const renderIncompatibleChip = () => {
		if (props.isCompatible) return null;
		return (
			<StyledChip
				background={theme.backgroundColor3}
				foreground={theme.color3}
				icon='alert'
				onPress={() => {
					void shim.showMessageBox(
						PluginService.instance().describeIncompatibility(props.item.manifest),
						{ buttons: [_('OK')] },
					);
				}}
			>{_('Incompatible')}</StyledChip>
		);
	};

	const renderUpdatableChip = () => {
		if (!props.isCompatible || !props.canUpdate) return null;

		return (
			<Chip>{_('Update available')}</Chip>
		);
	};

	return <View style={{ flexDirection: 'row', transform: [{ scale: 0.84 }], transformOrigin: 'left' }}>
		{renderIncompatibleChip()}
		{renderErrorsChip()}
		{renderRecommendedChip()}
		{renderBuiltInChip()}
		{renderUpdatableChip()}
	</View>;
};

export default PluginChips;
