import * as React from 'react';

import shim from '@joplin/lib/shim';
import bridge from '../../../services/bridge';
import StyledLink from '../../style/StyledLink';

interface Props {
	theme: any;
	text: string;
}

const openMissingPasswordFAQ = () =>
	bridge().openExternal('https://joplinapp.org/faq#why-did-my-sync-and-encryption-passwords-disappear-after-updating-joplin');

// A link to a specific part of the FAQ related to passwords being cleared when upgrading
// to a MacOS/ARM release.
const MissingPasswordHelpLink: React.FunctionComponent<Props> = props => {
	const macInfoLink = (
		<StyledLink href="#"
			onClick={openMissingPasswordFAQ}
			style={props.theme.linkStyle}
		>
			{props.text}
		</StyledLink>
	);

	// The FAQ section related to missing passwords is specific to MacOS/ARM -- only show it
	// in that case.
	const showMacInfoLink = shim.isMac() && process.arch === 'arm64';

	return showMacInfoLink ? macInfoLink : null;
};

export default MissingPasswordHelpLink;
