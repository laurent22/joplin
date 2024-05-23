import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import shim from '@joplin/lib/shim';
import * as React from 'react';
import { View } from 'react-native';
import { _ } from '@joplin/lib/locale';
import RecommendedChip from './RecommendedChip';
import { Chip } from 'react-native-paper';
import { PluginCallback } from '../utils/usePluginCallbacks';

interface Props {
	themeId: number;
	item: PluginItem;
	hasErrors: boolean;
	isCompatible: boolean;

	onShowPluginLog?: PluginCallback;
}

const PluginChips: React.FC<Props> = props => {
	const item = props.item;

	const renderErrorsChip = () => {
		if (!props.hasErrors) return null;

		return (
			<Chip
				icon='alert'
				mode='flat'
				onPress={() => props.onShowPluginLog({ item })}
			>
				{_('Error')}
			</Chip>
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
		return <Chip icon='code-tags-check'>{_('Built-in')}</Chip>;
	};

	const renderIncompatibleChip = () => {
		if (props.isCompatible) return null;
		return (
			<Chip
				icon='alert'
				onPress={() => {
					void shim.showMessageBox(
						PluginService.instance().describeIncompatibility(props.item.manifest),
						{ buttons: [_('OK')] },
					);
				}}
			>{_('Incompatible')}</Chip>
		);
	};

	return <View style={{ flexDirection: 'row', transform: [{ scale: 0.9 }], transformOrigin: 'left' }}>
		{renderIncompatibleChip()}
		{renderErrorsChip()}
		{renderRecommendedChip()}
		{renderBuiltInChip()}
	</View>;
};

export default PluginChips;
