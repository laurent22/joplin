import usePrevious from '@joplin/lib/hooks/usePrevious';
import { MarkupLanguage } from '@joplin/renderer';
import { useEffect, useRef, useState } from 'react';
import Logger from '@joplin/utils/Logger';
import { ResourceEntity, ResourceLocalStateEntity } from '@joplin/lib/services/database/types';
import { RendererControl, RenderOptions } from '../../../contentScripts/rendererBundle/types';
import Resource from '@joplin/lib/models/Resource';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';


export interface ResourceInfo {
	localState: ResourceLocalStateEntity;
	item: ResourceEntity;
}

interface Props {
	renderer: RendererControl;

	noteBody: string;
	noteMarkupLanguage: MarkupLanguage;
	themeId: number;
	fontSize: number;

	highlightedKeywords: string[];
	noteResources: Record<string, ResourceInfo>;
	noteHash: string;
	initialScrollPercent: number|undefined;

	paddingBottom: number;
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

const useResourceLoadCounter = (noteResources: Record<string, ResourceInfo>) => {
	const [lastResourceLoadCounter, setLastResourceLoadCounter] = useState(0);
	const lastDownloadCount = useRef(-1);
	useEffect(() => {
		let downloadedCount = 0;
		for (const resource of Object.values(noteResources)) {
			if (resource.localState.fetch_status === Resource.FETCH_STATUS_DONE) {
				downloadedCount ++;
			}
		}

		if (lastDownloadCount.current !== -1 && lastDownloadCount.current < downloadedCount) {
			setLastResourceLoadCounter(counter => counter + 1);
		}
		lastDownloadCount.current = downloadedCount;
	}, [noteResources]);

	return lastResourceLoadCounter;
};

const useRerenderHandler = (props: Props) => {
	const resourceDownloadRerenderCounter = useResourceLoadCounter(props.noteResources);
	useEffect(() => {
		// Whenever a resource state changes, for example when it goes from "not downloaded" to "downloaded", the "noteResources"
		// props changes, thus triggering a render. The **content** of this noteResources array however is not changed because
		// it doesn't contain info about the resource download state. Because of that, if we were to use the markupToHtml() cache
		// it wouldn't re-render at all.
		props.renderer.clearCache(props.noteMarkupLanguage);
	}, [resourceDownloadRerenderCounter, props.renderer, props.noteMarkupLanguage]);

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
		props.noteHash, props.noteResources, props.themeId, props.paddingBottom, resourceDownloadRerenderCounter,
		props.fontSize,
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

	useAsyncEffect(async (event) => {
		if (onlyNoteBodyHasChanged && onlyCheckboxesHaveChanged) {
			logger.info('Only a checkbox has changed - not updating HTML');
			return;
		}

		const config: RenderOptions = {
			themeId: props.themeId,
			themeOverrides: {
				bodyPaddingTop: '0.8em',
				bodyPaddingBottom: props.paddingBottom,
				noteViewerFontSize: props.fontSize,
			},
			highlightedKeywords: props.highlightedKeywords,
			resources: props.noteResources,
			pluginAssetContainerSelector: '#joplin-container-pluginAssetsContainer',
			removeUnusedPluginAssets: true,

			// If the hash changed, we don't set initial scroll -- we want to scroll to the hash
			// instead.
			initialScrollPercent: (previousHash && hashChanged) ? undefined : props.initialScrollPercent,
			noteHash: props.noteHash,
		};

		try {
			logger.debug('Starting render...');

			await props.renderer.rerenderToBody({
				language: props.noteMarkupLanguage,
				markup: props.noteBody,
			}, config, event);

			logger.debug('Render complete.');
		} catch (error) {
			logger.error('Render failed:', error);
		}
	}, effectDependencies);
};

export default useRerenderHandler;
