
import * as React from 'react';
import { TextStyle } from 'react-native';
const FontAwesomeIcon = require('react-native-vector-icons/FontAwesome5').default;

interface Props {
	name: string;
	style: TextStyle;
}

const Icon: React.FC<Props> = props => {
	// Matches:
	//  1. A prefix of word characters (\w+)
	//  2. A suffix of non-spaces (\S+)
	// An "fa-" at the beginning of the suffix is ignored.
	const nameMatch = props.name.match(/^(\w+)\s+(?:fa-)?(\S+)$/);

	const namePrefix = nameMatch ? nameMatch[1] : '';
	const nameSuffix = nameMatch ? nameMatch[2] : props.name;

	return (
		<FontAwesomeIcon
			brand={namePrefix.startsWith('fab')}
			solid={namePrefix.startsWith('fas')}
			name={nameSuffix}
			style={props.style}
		/>
	);
};

export default Icon;
