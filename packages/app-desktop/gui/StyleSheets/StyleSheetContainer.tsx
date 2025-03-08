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

import { useEffect, useMemo, useState } from 'react';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import themeToCss from '@joplin/lib/services/style/themeToCss';
import { themeStyle } from '@joplin/lib/theme';
import useDocument from '../hooks/useDocument';
import { connect } from 'react-redux';
import { AppState } from '../../app.reducer';
import { ScrollbarSize } from '@joplin/lib/models/settings/builtInMetadata';

interface Props {
	themeId: number;
	scrollbarSize: ScrollbarSize;
	editorFontSetting: string;
	customChromeCssPaths: string[];
}

const editorFontFromSettings = (settingValue: string) => {
	const fontFamilies = [];
	if (settingValue) fontFamilies.push(`"${settingValue}"`);
	fontFamilies.push('\'Avenir Next\', Avenir, Arial, sans-serif');

	return fontFamilies;
};

const useThemeCss = (themeId: number) => {
	const [themeCss, setThemeCss] = useState('');

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const theme = themeStyle(themeId);
		const themeCss = themeToCss(theme);
		if (event.cancelled) return;
		setThemeCss(themeCss);
	}, [themeId]);

	return themeCss;
};

const useEditorCss = (editorFontSetting: string) => {
	return useMemo(() => {
		const fontFamilies = editorFontFromSettings(editorFontSetting);
		return `
			/* The '*' and '!important' parts are necessary to make sure Russian text is displayed properly
			   https://github.com/laurent22/joplin/issues/155
			
			   Note: Be careful about the specificity here. Incorrect specificity can break monospaced fonts in tables. */
			.CodeMirror5 *, .cm-editor .cm-content { font-family: ${fontFamilies.join(', ')} !important; }
		`;
	}, [editorFontSetting]);
};

const useLinkedCss = (doc: Document|null, cssPaths: string[]) => {
	useEffect(() => {
		if (!doc) return () => {};

		const elements: HTMLElement[] = [];
		for (const path of cssPaths) {
			const element = doc.createElement('link');
			element.rel = 'stylesheet';
			element.href = path;
			element.classList.add('dynamic-linked-stylesheet');
			doc.head.appendChild(element);

			elements.push(element);
		}

		return () => {
			for (const element of elements) {
				element.remove();
			}
		};
	}, [doc, cssPaths]);
};

const useAppliedCss = (doc: Document|null, css: string) => {
	useEffect(() => {
		if (!doc) return () => {};

		const element = doc.createElement('style');
		element.setAttribute('id', 'main-theme-stylesheet-container');
		doc.head.appendChild(element);
		element.appendChild(document.createTextNode(css));
		return () => {
			doc.head.removeChild(element);
		};
	}, [css, doc]);
};

const StyleSheetContainer: React.FC<Props> = props => {
	const [elementRef, setElementRef] = useState<HTMLElement|null>(null);
	const doc = useDocument(elementRef);

	const themeCss = useThemeCss(props.themeId);
	const editorCss = useEditorCss(props.editorFontSetting);

	useAppliedCss(doc, `
		/* Theme CSS */
		${themeCss}

		/* Base scrollbar size */
		:root {
			--scrollbar-size: ${Number(props.scrollbarSize)}px;
		}

		/* Editor font CSS */
		${editorCss}
	`);
	useLinkedCss(doc, props.customChromeCssPaths);

	return <div ref={setElementRef} style={{ display: 'none' }}></div>;
};

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
		editorFontSetting: state.settings['style.editor.fontFamily'] as string,
		scrollbarSize: state.settings['style.scrollbarSize'],
		customChromeCssPaths: state.customChromeCssPaths,
	};
})(StyleSheetContainer);
