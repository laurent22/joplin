import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import shim from '@joplin/lib/shim';
import * as React from 'react';
import { View } from 'react-native';
import SmallChip from './SmallChip';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import { PluginCallback } from './ActionButton';
import RecommendedChip from './RecommendedChip';

interface Props {
	themeId: number;
	item: PluginItem;
	hasErrors: boolean;
	isCompatible: boolean;

	onShowPluginLog?: PluginCallback;
}

const PluginChips: React.FC<Props> = props => {
	const item = props.item;
	const theme = themeStyle(props.themeId);

	const renderErrorsChip = () => {
		if (!props.hasErrors) return null;

		return (
			<SmallChip
				foreground={theme.colorWarn}
				background={theme.warningBackgroundColor}
				icon='alert'
				onPress={() => props.onShowPluginLog({ item })}
			>
				{_('Error')}
			</SmallChip>
		);
	};

	const renderRecommendedChip = () => {
		if (!props.item.manifest._recommended || !props.isCompatible) {
			return null;
		}
		return <RecommendedChip themeId={props.themeId}/>;
	};

	const renderBuiltInChip = () => {
		if (!props.item.builtIn) {
			return null;
		}
		return <SmallChip icon='code-tags-check'>{_('Built-in')}</SmallChip>;
	};

	const renderIncompatibleChip = () => {
		if (props.isCompatible) return null;
		return (
			<SmallChip
				icon='alert'
				onPress={() => {
					void shim.showMessageBox(
						PluginService.instance().describeIncompatibility(props.item.manifest),
						{ buttons: [_('OK')] },
					);
				}}
			>{_('Incompatible')}</SmallChip>
		);
	};

	return <View style={{ flexDirection: 'row' }}>
		{renderIncompatibleChip()}
		{renderErrorsChip()}
		{renderRecommendedChip()}
		{renderBuiltInChip()}
	</View>;
};

export default PluginChips;
