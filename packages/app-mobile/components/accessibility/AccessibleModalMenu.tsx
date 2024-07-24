import * as React from 'react';
import { View } from 'react-native';
import Modal from '../Modal';
import { useCallback, useState } from 'react';
import { _ } from '@joplin/lib/locale';
import { PrimaryButton, SecondaryButton } from '../buttons';

interface MenuItem {
	label: string;
	onPress?: ()=> void;
}

interface Props {
	label: string;
	onPress: ()=> void;
	actions: MenuItem[]|null;
}

// react-native-paper's floating action button menu is inaccessible on web
// (can't be activated by a screen reader, and, in some cases, by the tab key).
// This component provides an alternative.

const AccessibleModalMenu: React.FC<Props> = props => {
	const [open, setOpen] = useState(false);

	const onClick = useCallback(() => {
		if (props.onPress) {
			props.onPress();
		} else {
			setOpen(!open);
		}
	}, [open, props.onPress]);

	const options: React.ReactElement[] = [];
	for (const action of (props.actions ?? [])) {
		options.push(
			<PrimaryButton key={action.label} onPress={action.onPress}>
				{action.label}
			</PrimaryButton>,
		);
	}

	const modal = (
		<Modal visible={open}>
			{options}
			<SecondaryButton onPress={onClick}>{_('Close menu')}</SecondaryButton>
		</Modal>
	);

	return <View style={{ height: 0, overflow: 'visible' }}>
		{modal}
		<SecondaryButton onPress={onClick}>{props.label}</SecondaryButton>
	</View>;
};

export default AccessibleModalMenu;
