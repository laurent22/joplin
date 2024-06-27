import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import usePrevious from '@joplin/lib/hooks/usePrevious';
import { themeStyle } from '@joplin/lib/theme';
import { MarkupLanguage } from '@joplin/renderer';
import useEditPopup from './useEditPopup';
import Renderer from '../bundledJs/Renderer';
import { useEffect, useState } from 'react';
import Logger from '@joplin/utils/Logger';
import { ExtraContentScriptSource } from '../bundledJs/types';
import Setting from '@joplin/lib/models/Setting';

interface Props {
	renderer: Renderer;

	noteBody: string;
	noteMarkupLanguage: MarkupLanguage;
	themeId: number;

	highlightedKeywords: string[];
	noteResources: string[];
	noteHash: string;
	initialScroll: number|undefined;

	paddingBottom: number;

	contentScripts: ExtraContentScriptSource[];
}

const onlyCheckboxHasChangedHack = (previousBody: string, newBody: string) => {
	if (previousBody.length !== newBody.length) return false;

	for (let i = 0; i < previousBody.length; i++) {
		const c1 = previousBody.charAt(i);
		const c2 = newBody.charAt(i);

		if (c1 !== c2) {
			if (c1 === ' ' && (c2 === 'x' || c2 === 'X')) continue;
			if (c2 === ' ' && (c1 === 'x' || c1 === 'X')) continue;
			return false;
		}
	}

	return true;
};

const logger = Logger.create('useRerenderHandler');

const useRerenderHandler = (props: Props) => {
	const { createEditPopupSyntax, destroyEditPopupSyntax, editPopupCss } = useEditPopup(props.themeId);
	const [lastResourceLoadCounter, setLastResourceLoadCounter] = useState(0);
	const [pluginSettingKeys, setPluginSettingKeys] = useState<Record<string, boolean>>({});

	// To address https://github.com/laurent22/joplin/issues/433
	//
	// If a checkbox in a note is ticked, the body changes, which normally would
	// trigger a re-render of this component, which has the unfortunate side
	// effect of making the view scroll back to the top. This re-rendering
	// however is unnecessary since the component is already visually updated via
	// JS. So here, if the note has not changed, we prevent the component from
	// updating. This fixes the above issue. A drawback of this is if the note
	// is updated via sync, this change will not be displayed immediately.
	//
	// 2022-05-03: However we sometimes need the HTML to be updated, even when
	// only the body has changed - for example when attaching a resource, or
	// when adding text via speech recognition. So the logic has been narrowed
	// down so that updates are skipped only when checkbox has been changed.
	// Checkboxes still work as expected, without making the note scroll, and
	// other text added to the note is displayed correctly.
	//
	// IMPORTANT: KEEP noteBody AS THE FIRST dependency in the array as the
	// below logic rely on this.
	const effectDependencies = [
		props.noteBody, props.noteMarkupLanguage, props.renderer, props.highlightedKeywords,
		props.noteHash, props.noteResources, props.themeId, props.paddingBottom, lastResourceLoadCounter,
		createEditPopupSyntax, destroyEditPopupSyntax, pluginSettingKeys,
	];
	const previousDeps = usePrevious(effectDependencies, []);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const changedDeps = effectDependencies.reduce((accum: any, dependency: any, index: any) => {
		if (dependency !== previousDeps[index]) {
			return { ...accum, [index]: true };
		}
		return accum;
	}, {});
	const onlyNoteBodyHasChanged = Object.keys(changedDeps).length === 1 && changedDeps[0];
	const previousBody = previousDeps[0] as string;
	const onlyCheckboxesHaveChanged = previousDeps[0] && changedDeps[0] && onlyCheckboxHasChangedHack(previousBody, props.noteBody);
	const previousHash = usePrevious(props.noteHash, '');
	const hashChanged = previousHash !== props.noteHash;

	useEffect(() => {
		// Whenever a resource state changes, for example when it goes from "not downloaded" to "downloaded", the "noteResources"
		// props changes, thus triggering a render. The **content** of this noteResources array however is not changed because
		// it doesn't contain info about the resource download state. Because of that, if we were to use the markupToHtml() cache
		// it wouldn't re-render at all.
		props.renderer.clearCache(props.noteMarkupLanguage);
	}, [lastResourceLoadCounter, props.renderer, props.noteMarkupLanguage]);

	useEffect(() => {
		void props.renderer.setExtraContentScriptsAndRerender(props.contentScripts);
	}, [props.contentScripts, props.renderer]);

	useAsyncEffect(async event => {
		if (onlyNoteBodyHasChanged && onlyCheckboxesHaveChanged) {
			logger.info('Only a checkbox has changed - not updating HTML');
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const pluginSettings: Record<string, any> = { };
		for (const key in pluginSettingKeys) {
			pluginSettings[key] = Setting.value(`plugin-${key}`);
		}
		let newPluginSettingKeys = pluginSettingKeys;

		const theme = themeStyle(props.themeId);
		const config = {
			// We .stringify the theme to avoid a JSON serialization error involving
			// the color package.
			theme: JSON.stringify({
				bodyPaddingTop: '0.8em',
				bodyPaddingBottom: props.paddingBottom,

				...theme,
			}),
			codeTheme: theme.codeThemeCss,

			onResourceLoaded: () => {
				// Force a rerender when a resource loads
				setLastResourceLoadCounter(lastResourceLoadCounter + 1);
			},
			highlightedKeywords: props.highlightedKeywords,
			resources: props.noteResources,

			// If the hash changed, we don't set initial scroll -- we want to scroll to the hash
			// instead.
			initialScroll: (previousHash && hashChanged) ? undefined : props.initialScroll,
			noteHash: props.noteHash,

			pluginSettings,
			requestPluginSetting: (pluginId: string, settingKey: string) => {
				// Don't trigger additional renders
				if (event.cancelled) return;

				const key = `${pluginId}.${settingKey}`;
				logger.debug(`Request plugin setting: plugin-${key}`);

				if (!(key in newPluginSettingKeys)) {
					newPluginSettingKeys = { ...newPluginSettingKeys, [`${pluginId}.${settingKey}`]: true };
					setPluginSettingKeys(newPluginSettingKeys);
				}
			},

			createEditPopupSyntax,
			destroyEditPopupSyntax,
		};

		try {
			logger.debug('Starting render...');

			await props.renderer.rerender({
				language: props.noteMarkupLanguage,
				markup: props.noteBody,
			}, config);

			logger.debug('Render complete.');
		} catch (error) {
			logger.error('Render failed:', error);
		}
	}, effectDependencies);

	useEffect(() => {
		props.renderer.setExtraCss('edit-popup', editPopupCss);
	}, [editPopupCss, props.renderer]);
};

export default useRerenderHandler;
