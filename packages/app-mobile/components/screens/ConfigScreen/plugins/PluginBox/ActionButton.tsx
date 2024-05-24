import * as React from 'react';
import { useCallback } from 'react';
import { ItemEvent, PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import { Button, ButtonProps } from 'react-native-paper';

export type PluginCallback = (event: ItemEvent)=> void;

interface Props extends Omit<ButtonProps, 'item'|'onPress'|'children'> {
	item: PluginItem;
	onPress?: PluginCallback;
	title: string;
}

const ActionButton: React.FC<Props> = props => {
	const onPress = useCallback(() => {
		props.onPress?.({ item: props.item });
	}, [props.onPress, props.item]);

	// Include additional information about the button when using a screen
	// reader (helps make it clear which plugin a delete/enable button).
	//
	// Because this is being read by a screen reader and to reduce load on
	// translators, the method of joining the title and manifest name is not
	// marked as translatable.
	const accessibilityLabel = `${props.title}  ${props.item.manifest.name}`;
	return (
		<Button
			{...props}
			onPress={onPress}
			accessibilityLabel={accessibilityLabel}
		>{props.title}</Button>
	);
};

export default ActionButton;
