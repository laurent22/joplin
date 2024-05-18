import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import * as React from 'react';
import { useCallback, useState } from 'react';
import { IconButton } from 'react-native-paper';
import PluginInfoModal from '../PluginInfoModal';
import { PluginCallback } from './ActionButton';

interface Props {
	themeId: number;
	size: number;
	item: PluginItem;
	onModalDismiss?: ()=> void;

	onUpdate: PluginCallback;
	onDelete: PluginCallback;
	onToggle: PluginCallback;
}

const PluginInfoButton: React.FC<Props> = props => {
	const [showInfoModal, setShowInfoModal] = useState(false);
	const onInfoButtonPress = useCallback(() => {
		setShowInfoModal(true);
	}, []);

	const onModalDismiss = useCallback(() => {
		setShowInfoModal(false);
		props.onModalDismiss?.();
	}, [props.onModalDismiss]);

	return (
		<>
			<PluginInfoModal
				{...props}
				visible={showInfoModal}
				onModalDismiss={onModalDismiss}
			/>
			<IconButton
				size={props.size}
				icon='information'
				onPress={onInfoButtonPress}
			/>
		</>
	);
};

export default PluginInfoButton;
