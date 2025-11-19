import { RefObject, useEffect, useMemo, useRef } from 'react';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import { Platform } from 'react-native';
import { SetUpResult } from '../types';
import { themeStyle } from '../../components/global-style';
import Logger from '@joplin/utils/Logger';
import { WebViewControl } from '../../components/ExtendedWebView/types';
import { MainProcessApi, OnScrollCallback, RendererControl, RendererProcessApi, RendererWebViewOptions, RenderOptions } from './types';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import RNToWebViewMessenger from '../../utils/ipc/RNToWebViewMessenger';
import useEditPopup from './utils/useEditPopup';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { RenderSettings } from './contentScript/Renderer';
import resolvePathWithinDir from '@joplin/lib/utils/resolvePathWithinDir';
import Resource from '@joplin/lib/models/Resource';
import { ResourceInfos } from '@joplin/renderer/types';
import useContentScripts from './utils/useContentScripts';
import uuid from '@joplin/lib/uuid';
import AsyncActionQueue from '@joplin/lib/AsyncActionQueue';

const logger = Logger.create('renderer/useWebViewSetup');

interface Props {
	webviewRef: RefObject<WebViewControl>;
	onBodyScroll: OnScrollCallback|null;
	onPostMessage: (message: string)=> void;
	pluginStates: PluginStates;

	themeId: number;
}

const useSource = (tempDirPath: string) => {
	const injectedJs = useMemo(() => {
		const subValues = Setting.subValues('markdown.plugin', Setting.toPlainObject());
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const pluginOptions: any = {};
		for (const n in subValues) {
			pluginOptions[n] = { enabled: subValues[n] };
		}

		const rendererWebViewStaticOptions: RendererWebViewOptions = {
			settings: {
				safeMode: Setting.value('isSafeMode'),
				tempDir: tempDirPath,
				resourceDir: Setting.value('resourceDir'),
				resourceDownloadMode: Setting.value('sync.resourceDownloadMode'),
			},
			// Web needs files to be transferred manually, since image SRCs can't reference
			// the Origin Private File System.
			useTransferredFiles: Platform.OS === 'web',
			pluginOptions,
		};

		return `
			if (!window.rendererJsLoaded) {
				window.rendererJsLoaded = true;

				${shim.injectedJs('webviewLib')}
				${shim.injectedJs('rendererBundle')}

				rendererBundle.initialize(${JSON.stringify(rendererWebViewStaticOptions)});
			}
		`;
	}, [tempDirPath]);

	return { css: '', injectedJs };
};

const onPostPluginMessage = async (contentScriptId: string, message: unknown) => {
	logger.debug(`Handling message from content script: ${contentScriptId}:`, message);

	const pluginService = PluginService.instance();
	const pluginId = pluginService.pluginIdByContentScriptId(contentScriptId);
	if (!pluginId) {
		throw new Error(`Plugin not found for content script with ID ${contentScriptId}`);
	}

	const plugin = pluginService.pluginById(pluginId);
	return plugin.emitContentScriptMessage(contentScriptId, message);
};

type UseMessengerProps = Props & { tempDirPath: string };

const useMessenger = (props: UseMessengerProps) => {
	const onScrollRef = useRef(props.onBodyScroll);
	onScrollRef.current = props.onBodyScroll;

	const onPostMessageRef = useRef(props.onPostMessage);
	onPostMessageRef.current = props.onPostMessage;

	const messenger = useMemo(() => {
		const fsDriver = shim.fsDriver();
		const localApi = {
			onScroll: (fraction: number) => onScrollRef.current?.(fraction),
			onPostMessage: (message: string) => onPostMessageRef.current?.(message),
			onPostPluginMessage,
			fsDriver: {
				writeFile: async (path: string, content: string, encoding?: string) => {
					if (!await fsDriver.exists(props.tempDirPath)) {
						await fsDriver.mkdir(props.tempDirPath);
					}
					// To avoid giving the WebView access to the entire main tempDir,
					// we use props.tempDir (which should be different).
					path = fsDriver.resolveRelativePathWithinDir(props.tempDirPath, path);
					return await fsDriver.writeFile(path, content, encoding);
				},
				exists: fsDriver.exists,
				cacheCssToFile: fsDriver.cacheCssToFile,
			},
		};
		return new RNToWebViewMessenger<MainProcessApi, RendererProcessApi>(
			'renderer', props.webviewRef, localApi,
		);
	}, [props.webviewRef, props.tempDirPath]);

	return messenger;
};

const useTempDirPath = () => {
	// The renderer can write to whichever temporary directory is chosen here. As such,
	// use a subdirectory of the main temporary directory for security reasons.
	const tempDirPath = useMemo(() => {
		return `${Setting.value('tempDir')}/${uuid.createNano()}`;
	}, []);

	useEffect(() => {
		return () => {
			void (async () => {
				if (await shim.fsDriver().exists(tempDirPath)) {
					await shim.fsDriver().remove(tempDirPath);
				}
			})();
		};
	}, [tempDirPath]);

	return tempDirPath;
};

type Result = SetUpResult<RendererControl> & {
	hasPluginScripts: boolean;
};

const useWebViewSetup = (props: Props): Result => {
	const tempDirPath = useTempDirPath();
	const { css, injectedJs } = useSource(tempDirPath);
	const { editPopupCss, createEditPopupSyntax, destroyEditPopupSyntax } = useEditPopup(props.themeId);

	const messenger = useMessenger({ ...props, tempDirPath });
	const pluginSettingKeysRef = useRef(new Set<string>());

	const contentScripts = useContentScripts(props.pluginStates);
	useEffect(() => {
		void messenger.remoteApi.renderer.setExtraContentScriptsAndRerender(contentScripts);
	}, [messenger, contentScripts]);

	const onRerenderRequestRef = useRef(()=>{});

	const rendererControl = useMemo((): RendererControl => {
		const renderer = messenger.remoteApi.renderer;

		const transferResources = async (resources: ResourceInfos) => {
			// On web, resources are virtual files and thus need to be transferred to the WebView.
			if (shim.mobilePlatform() === 'web') {
				for (const [resourceId, resource] of Object.entries(resources)) {
					try {
						await renderer.setResourceFile(
							resourceId,
							await shim.fsDriver().fileAtPath(Resource.fullPath(resource.item)),
						);
					} catch (error) {
						if (error.code !== 'ENOENT') {
							throw error;
						}

						// This can happen if a resource hasn't been downloaded yet
						logger.warn('Error: Resource file not found (ENOENT)', Resource.fullPath(resource.item), 'for ID', resource.item.id);
					}
				}
			}
		};

		const prepareRenderer = async (options: RenderOptions) => {
			const theme = themeStyle(options.themeId);

			const loadPluginSettings = () => {
				const output: Record<string, unknown> = Object.create(null);
				for (const key of pluginSettingKeysRef.current) {
					output[key] = Setting.value(`plugin-${key}`);
				}
				return output;
			};

			let settingsChanged = false;
			const getSettings = (): RenderSettings => ({
				...options,
				codeTheme: theme.codeThemeCss,
				// We .stringify the theme to avoid a JSON serialization error involving
				// the color package.
				theme: JSON.stringify({
					...theme,
					...options.themeOverrides,
				}),
				createEditPopupSyntax,
				destroyEditPopupSyntax,
				pluginSettings: loadPluginSettings(),
				requestPluginSetting: (pluginId: string, settingKey: string) => {
					const key = `${pluginId}.${settingKey}`;
					if (!pluginSettingKeysRef.current.has(key)) {
						pluginSettingKeysRef.current.add(key);
						onRerenderRequestRef.current();
						settingsChanged = true;
					}
				},
				readAssetBlob: (assetPath: string): Promise<Blob> => {
					// Built-in assets are in resourceDir, external plugin assets are in cacheDir.
					const assetsDirs = [Setting.value('resourceDir'), Setting.value('cacheDir')];

					let resolvedPath = null;
					for (const assetDir of assetsDirs) {
						resolvedPath ??= resolvePathWithinDir(assetDir, assetPath);
						if (resolvedPath) break;
					}

					if (!resolvedPath) {
						throw new Error(`Failed to load asset at ${assetPath} -- not in any of the allowed asset directories: ${assetsDirs.join(',')}.`);
					}
					return shim.fsDriver().fileAtPath(resolvedPath);
				},
				removeUnusedPluginAssets: options.removeUnusedPluginAssets,
				globalSettings: {
					'markdown.plugin.abc.options': Setting.value('markdown.plugin.abc.options'),
				},
			});

			await transferResources(options.resources);

			return {
				getSettings,
				getSettingsChanged() {
					return settingsChanged;
				},
			};
		};

		return {
			rerenderToBody: async (markup, options, cancelEvent) => {
				const { getSettings } = await prepareRenderer(options);
				if (cancelEvent?.cancelled) return null;

				const render = async () => {
					if (cancelEvent?.cancelled) return;

					await renderer.rerenderToBody(markup, getSettings());
				};

				const queue = new AsyncActionQueue();
				onRerenderRequestRef.current = async () => {
					queue.push(render);
				};

				return await render();
			},
			render: async (markup, options) => {
				const { getSettings, getSettingsChanged } = await prepareRenderer(options);
				const output = await renderer.render(markup, getSettings());

				if (getSettingsChanged()) {
					return await renderer.render(markup, getSettings());
				}
				return output;
			},
			clearCache: async markupLanguage => {
				await renderer.clearCache(markupLanguage);
			},
		};
	}, [createEditPopupSyntax, destroyEditPopupSyntax, messenger]);

	const hasPluginScripts = contentScripts.length > 0;
	return useMemo(() => {
		return {
			api: rendererControl,
			pageSetup: {
				css: `${css} ${editPopupCss}`,
				js: injectedJs,
			},
			webViewEventHandlers: {
				onLoadEnd: messenger.onWebViewLoaded,
				onMessage: messenger.onWebViewMessage,
			},
			hasPluginScripts,
		};
	}, [css, injectedJs, messenger, editPopupCss, rendererControl, hasPluginScripts]);
};

export default useWebViewSetup;
