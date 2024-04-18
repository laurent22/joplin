import * as React from 'react';

import shim from '@joplin/lib/shim';
import bridge from '../../../services/bridge';
import StyledLink from '../../style/StyledLink';
import { ThemeStyle } from '@joplin/lib/theme';

interface Props {
	theme: ThemeStyle;
	text: string;
}

const openMissingPasswordFAQ = () =>
	bridge().openExternal('https://joplinapp.org/help/faq#why-did-my-sync-and-encryption-passwords-disappear-after-updating-joplin');

// A link to a specific part of the FAQ related to passwords being cleared when upgrading
// to a MacOS/ARM release.
const MacOSMissingPasswordHelpLink: React.FunctionComponent<Props> = props => {
	const macInfoLink = (
		<StyledLink href="#"
			onClick={openMissingPasswordFAQ}
			style={props.theme.urlStyle}
		>
			{props.text}
		</StyledLink>
	);

	// The FAQ section related to missing passwords is specific to MacOS/ARM -- only show it
	// in that case.
	const newArchitectureReleasedRecently = Date.now() <= Date.UTC(2023, 11); // 11 = December
	const showMacInfoLink = shim.isMac() && process.arch === 'arm64' && newArchitectureReleasedRecently;

	return showMacInfoLink ? macInfoLink : null;
};

export default MacOSMissingPasswordHelpLink;
