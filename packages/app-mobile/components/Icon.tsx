
import * as React from 'react';
import { TextStyle, Text } from 'react-native';

const FontAwesomeIcon = require('react-native-vector-icons/FontAwesome5').default;
const AntIcon = require('react-native-vector-icons/AntDesign').default;
const MaterialCommunityIcon = require('react-native-vector-icons/MaterialCommunityIcons').default;
const Ionicon = require('react-native-vector-icons/Ionicons').default;

interface Props {
	name: string;
	style: TextStyle;

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
		importantForAccessibility,
		'aria-hidden': accessibilityHidden,
		accessibilityLabel: props.accessibilityLabel,
		style: props.style,
		allowFontScaling: props.allowFontScaling,
	};

	if (namePrefix.match(/^fa[bsr]?$/)) {
		return (
			<FontAwesomeIcon
				brand={namePrefix.startsWith('fab')}
				solid={namePrefix.startsWith('fas')}
				name={nameSuffix}
				{...sharedProps}
			/>
		);
	} else if (namePrefix === 'ant') {
		return <AntIcon name={nameSuffix} {...sharedProps}/>;
	} else if (namePrefix === 'material') {
		return <MaterialCommunityIcon name={nameSuffix} {...sharedProps}/>;
	} else if (namePrefix === 'ionicon') {
		return <Ionicon name={nameSuffix} {...sharedProps}/>;
	} else if (namePrefix === 'text') {
		return (
			<Text
				style={props.style}
				aria-hidden={accessibilityHidden}
				importantForAccessibility={importantForAccessibility}
			>
				{nameSuffix}
			</Text>
		);
	} else {
		return <FontAwesomeIcon name='cog' {...sharedProps}/>;
	}
};

export default Icon;
