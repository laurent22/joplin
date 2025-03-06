import { EditorNoteStatuses } from '@joplin/lib/reducer';
import { RefObject } from 'react';
import usePrintToCallback from './usePrintToCallback';
import useWindowControl, { OnSetDialogState, WindowControl } from './useWindowControl';
import commands from '../commands';
import CommandService, { CommandRuntime, ComponentCommandSpec } from '@joplin/lib/services/CommandService';
import useNowEffect from '@joplin/lib/hooks/useNowEffect';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';

interface Props {
	documentRef: RefObject<Document|null>;
	customCss: string;
	plugins: PluginStates;
	editorNoteStatuses: EditorNoteStatuses;
	setDialogState: OnSetDialogState;
}

const useWindowCommands = ({ documentRef, customCss, plugins, editorNoteStatuses, setDialogState }: Props) => {
	const onPrintCallback = usePrintToCallback({
		customCss: customCss,
		editorNoteStatuses: editorNoteStatuses,
		plugins: plugins,
	});
	const windowControl = useWindowControl(setDialogState, onPrintCallback);

	// This effect needs to run as soon as possible. Certain components may fail to load if window
	// commands are not registered on their first render.
	useNowEffect(() => {
		const runtimeHandles = commands.map((command: ComponentCommandSpec<WindowControl>) => {
			const runtime: CommandRuntime = {
				getPriority: () => {
					return documentRef.current?.hasFocus() ? 1 : 0;
				},
				...command.runtime(windowControl),
			};
			return CommandService.instance().registerRuntime(
				command.declaration.name,
				runtime,
				true,
			);
		});

		return () => {
			for (const runtimeHandle of runtimeHandles) {
				runtimeHandle.deregister();
			}
		};
	}, [windowControl]);
};

export default useWindowCommands;
