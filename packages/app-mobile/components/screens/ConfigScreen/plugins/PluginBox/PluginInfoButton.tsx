import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import * as React from 'react';
import { useCallback, useState } from 'react';
import { IconButton } from 'react-native-paper';
import PluginInfoModal from '../PluginInfoModal';

interface Props {
	themeId: number;
	size: number;
	item: PluginItem;
	onModalDismiss?: ()=> void;
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
			{showInfoModal ? <PluginInfoModal {...props} visible={true} onModalDismiss={onModalDismiss} /> : null}
			<IconButton
				size={props.size}
				icon='information'
				onPress={onInfoButtonPress}
			/>
		</>
	);
};

export default PluginInfoButton;
