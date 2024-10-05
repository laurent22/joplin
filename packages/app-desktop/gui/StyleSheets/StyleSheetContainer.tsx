// This component is perhaps a bit of a hack but the approach should be
// reliable. It converts the current (JS) theme to CSS, and add it to the HEAD
// tag. The component itself doesn't render anything where it's located (just an
// empty invisible DIV), so it means it could be put anywhere and would have the
// same effect.
//
// It's still reliable because the lifecyle of adding the CSS and removing on
// unmount is handled properly. There should only be one such component on the
// page.

import * as React from 'react';

import { useEffect, useState } from 'react';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import themeToCss from '@joplin/lib/services/style/themeToCss';
import { themeStyle } from '@joplin/lib/theme';
import useDom from '../hooks/useDom';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';

interface Props {
	themeId: number;
	editorFontSetting: string;
}

const editorFontFromSettings = (settingValue: string) => {
	const fontFamilies = [];
	if (settingValue) fontFamilies.push(`"${settingValue}"`);
	fontFamilies.push('\'Avenir Next\', Avenir, Arial, sans-serif');

	return fontFamilies;
};

const StyleSheetContainer: React.FC<Props> = props => {
	const [themeStyleSheetContent, setThemeStyleSheetContent] = useState('');
	const [editorStyleSheetContent, setEditorStyleSheetContent] = useState('');
	const [elementRef, setElementRef] = useState<HTMLElement|null>(null);
	const doc = useDom(elementRef);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const theme = themeStyle(props.themeId);
		const themeCss = themeToCss(theme);
		if (event.cancelled) return;
		setThemeStyleSheetContent(themeCss);
	}, [props.themeId]);


	useEffect(() => {
		const fontFamilies = editorFontFromSettings(props.editorFontSetting);
		setEditorStyleSheetContent(`
			/* The '*' and '!important' parts are necessary to make sure Russian text is displayed properly
			   https://github.com/laurent22/joplin/issues/155
			
			   Note: Be careful about the specificity here. Incorrect specificity can break monospaced fonts in tables. */
			.CodeMirror5 *, .cm-editor .cm-content { font-family: ${fontFamilies.join(', ')} !important; }
		`);
	}, [props.editorFontSetting]);

	useEffect(() => {
		if (!doc) return () => {};

		const element = doc.createElement('style');
		element.setAttribute('id', 'main-theme-stylesheet-container');
		doc.head.appendChild(element);
		element.appendChild(document.createTextNode(`
			/* Theme CSS */
			${themeStyleSheetContent}

			/* Editor font CSS */
			${editorStyleSheetContent}
		`));
		return () => {
			doc.head.removeChild(element);
		};
	}, [themeStyleSheetContent, editorStyleSheetContent, doc]);

	return <div ref={setElementRef} style={{ display: 'none' }}></div>;
};

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
		editorFontSetting: state.settings['style.editor.fontFamily'] as string,
	};
})(StyleSheetContainer);
