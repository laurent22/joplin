// This component is perhaps a bit of a hack but the approach should be
// reliable. It converts the current (JS) theme to CSS, and add it to the HEAD
// tag. The component itself doesn't render anything where it's located (just an
// empty invisible DIV), so it means it could be put anywhere and would have the
// same effect.
//
// It's still reliable because the lifecyle of adding the CSS and removing on
// unmout is handled properly. There should only be one such component on the
// page.

import { useEffect, useState } from 'react';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import themeToCss from '@joplin/lib/services/style/themeToCss';
import { themeById } from '@joplin/lib/theme';

interface Props {
	themeId: any;
}

export default function(props: Props): any {
	const [styleSheetContent, setStyleSheetContent] = useState('');

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const theme = themeById(props.themeId);
		const themeCss = themeToCss(theme);
		if (event.cancelled) return;
		setStyleSheetContent(themeCss);
	}, [props.themeId]);

	useEffect(() => {
		const element = document.createElement('style');
		element.setAttribute('id', 'main-theme-stylesheet-container');
		document.head.appendChild(element);
		element.appendChild(document.createTextNode(styleSheetContent));
		return () => {
			document.head.removeChild(element);
		};
	}, [styleSheetContent]);

	return null; // <div style={{ display: 'none' }}></div>;
}
