
import * as React from 'react';
import { TextStyle, Text, StyleProp } from 'react-native';

import { FontAwesome5 } from '@react-native-vector-icons/fontawesome5';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { Ionicons } from '@react-native-vector-icons/ionicons';

interface Props {
	name: string;
	style: StyleProp<TextStyle>;

	// If `null` is given, the content must be labeled elsewhere.
	accessibilityLabel: string|null;

	allowFontScaling?: boolean;
}

const Icon: React.FC<Props> = props => {
	// Matches:
	//  1. A prefix of word characters (\w+)
	//  2. A suffix of non-spaces (\S+)
	// An "fa-" at the beginning of the suffix is ignored.
	const nameMatch = props.name.match(/^(\w+)\s+(?:fa-)?(\S+)$/);

	const namePrefix = nameMatch ? nameMatch[1] : '';
	const nameSuffix = nameMatch ? nameMatch[2] : props.name;

	// If there's no label, make sure that the screen reader doesn't try
	// to read the characters from the icon font (they don't make sense
	// without the icon font applied).
	const accessibilityHidden = props.accessibilityLabel === null;
	const importantForAccessibility = accessibilityHidden ? 'no-hide-descendants' : 'yes';

	const sharedProps = {
		importantForAccessibility, // Android
		accessibilityElementsHidden: accessibilityHidden, // iOS
		'aria-hidden': accessibilityHidden, // Web
		accessibilityLabel: props.accessibilityLabel,
		style: props.style,
		allowFontScaling: props.allowFontScaling,
	};

	if (namePrefix.match(/^fa[bsr]?$/)) {
		let iconStyle = 'solid';
		if (namePrefix.startsWith('fab')) {
			iconStyle = 'brand';
		} else if (namePrefix.startsWith('fas')) {
			iconStyle = 'solid';
		}

		return (
			<FontAwesome5
				name={nameSuffix}
				iconStyle={iconStyle}
				{...sharedProps}
			/>
		);
	} else if (namePrefix === 'material') {
		return <MaterialDesignIcons name={nameSuffix} {...sharedProps}/>;
	} else if (namePrefix === 'ionicon') {
		return <Ionicons name={nameSuffix} {...sharedProps}/>;
	} else if (namePrefix === 'text') {
		return (
			<Text
				style={props.style}
				aria-hidden={accessibilityHidden}
				importantForAccessibility={importantForAccessibility}
				accessibilityElementsHidden={accessibilityHidden}
			>
				{nameSuffix}
			</Text>
		);
	} else {
		return <FontAwesome5 name='cog' {...sharedProps}/>;
	}
};

export default Icon;
