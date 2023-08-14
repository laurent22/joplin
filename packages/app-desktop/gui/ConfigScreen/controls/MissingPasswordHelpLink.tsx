import * as React from 'react';

import shim from '@joplin/lib/shim';
import bridge from '../../../bridge';
import StyledLink from '../../style/StyledLink';
import { _ } from '@joplin/lib/locale';

interface Props {
	theme: any;
}

const MissingPasswordHelpLink: React.FunctionComponent<Props> = props => {
	const openMissingPasswordFAQ = () =>
		bridge().openExternal('https://joplinapp.org/faq#why-did-my-sync-and-encryption-passwords-disappear-after-updating-joplin');

	const macInfoLink = (
		<StyledLink href="#"
			onClick={openMissingPasswordFAQ}
			style={props.theme.linkStyle}
		>
			{_('Help')}
		</StyledLink>
	);

	// The FAQ section related to missing passwords is specific to MacOS/ARM -- only show it
	// in that case.
	const showMacInfoLink = shim.isMac() && process.arch === 'arm64';

	return showMacInfoLink ? macInfoLink : null;
};

export default MissingPasswordHelpLink;
