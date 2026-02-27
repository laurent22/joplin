import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import Setting from '@joplin/lib/models/Setting';

export interface ReorderableItem {
	commandName: string;
	buttonInfo: ToolbarButtonInfo;
}

interface UseToolbarEditorStateProps {
	initialSelectedCommandNames: string[];
	allCommandNames: string[];
	allButtonInfos: ToolbarButtonInfo[];
}

interface UseToolbarEditorStateResult {
	enabledItems: ReorderableItem[];
	disabledItems: ReorderableItem[];
	handleMoveUp: (index: number)=> void;
	handleMoveDown: (index: number)=> void;
	handleToggle: (commandName: string)=> void;
	reinitialize: (selectedNames: string[])=> void;
}

const useToolbarEditorState = (props: UseToolbarEditorStateProps): UseToolbarEditorStateResult => {
	const { initialSelectedCommandNames, allCommandNames, allButtonInfos } = props;

	// Build a lookup map from command name to button info
	const buttonInfoMap = useMemo(() => {
		const map = new Map<string, ToolbarButtonInfo>();
		for (const info of allButtonInfos) {
			if (info.type === 'button') {
				map.set(info.name, info);
			}
		}
		return map;
	}, [allButtonInfos]);

	// Filter out separators from allCommandNames for building the disabled list
	const allCommandNamesWithoutSeparators = useMemo(() => {
		return allCommandNames.filter(name => name !== '-');
	}, [allCommandNames]);

	// Build initial enabled items from selectedCommandNames (filtering separators)
	const buildEnabledItems = useCallback((selectedNames: string[]): ReorderableItem[] => {
		const items: ReorderableItem[] = [];
		for (const name of selectedNames) {
			if (name === '-') continue;
			const buttonInfo = buttonInfoMap.get(name);
			if (buttonInfo) {
				items.push({ commandName: name, buttonInfo });
			}
		}
		return items;
	}, [buttonInfoMap]);

	// Build disabled items: commands in allCommandNames but not in enabled, preserving default order
	const buildDisabledItems = useCallback((enabledNames: Set<string>): ReorderableItem[] => {
		const items: ReorderableItem[] = [];
		for (const name of allCommandNamesWithoutSeparators) {
			if (!enabledNames.has(name)) {
				const buttonInfo = buttonInfoMap.get(name);
				if (buttonInfo) {
					items.push({ commandName: name, buttonInfo });
				}
			}
		}
		return items;
	}, [allCommandNamesWithoutSeparators, buttonInfoMap]);

	// Initialize state
	const [enabledItems, setEnabledItems] = useState<ReorderableItem[]>(() => {
		return buildEnabledItems(initialSelectedCommandNames);
	});

	const [disabledItems, setDisabledItems] = useState<ReorderableItem[]>(() => {
		const enabledNames = new Set(initialSelectedCommandNames.filter(n => n !== '-'));
		return buildDisabledItems(enabledNames);
	});

	// Save to settings after enabledItems changes, but skip on initial mount and after
	// reinitialize — those are state restores, not user edits, and must not overwrite settings.
	const isInitialMount = useRef(true);
	const skipSaveCount = useRef(0);
	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false;
			return;
		}
		if (skipSaveCount.current > 0) {
			skipSaveCount.current = 0;
			return;
		}
		const commandNames = enabledItems.map(item => item.commandName);
		Setting.setValue('editor.toolbarButtons', commandNames);
	}, [enabledItems]);

	const reinitialize = useCallback((selectedNames: string[]) => {
		skipSaveCount.current++;
		setEnabledItems(buildEnabledItems(selectedNames));
		const enabledNames = new Set(selectedNames.filter(n => n !== '-'));
		setDisabledItems(buildDisabledItems(enabledNames));
	}, [buildEnabledItems, buildDisabledItems]);

	const handleMoveUp = useCallback((index: number) => {
		setEnabledItems(prev => {
			if (index <= 0) return prev;

			const newItems = [...prev];
			[newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
			return newItems;
		});
	}, []);

	const handleMoveDown = useCallback((index: number) => {
		setEnabledItems(prev => {
			if (index >= prev.length - 1) return prev;

			const newItems = [...prev];
			[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
			return newItems;
		});
	}, []);

	const handleToggle = useCallback((commandName: string) => {
		const isCurrentlyEnabled = enabledItems.some(item => item.commandName === commandName);

		if (isCurrentlyEnabled) {
			// Remove from enabled, add to disabled in default-relative order
			setEnabledItems(prev => prev.filter(item => item.commandName !== commandName));

			setDisabledItems(prev => {
				const buttonInfo = buttonInfoMap.get(commandName);
				if (!buttonInfo) return prev;

				// Insert in default-relative order
				const newDisabled: ReorderableItem[] = [];
				let inserted = false;
				for (const name of allCommandNamesWithoutSeparators) {
					if (name === commandName) {
						newDisabled.push({ commandName, buttonInfo });
						inserted = true;
					} else {
						const existing = prev.find(item => item.commandName === name);
						if (existing) {
							newDisabled.push(existing);
						}
					}
				}
				if (!inserted) {
					newDisabled.push({ commandName, buttonInfo });
				}
				return newDisabled;
			});
		} else {
			// Remove from disabled, append to end of enabled
			const buttonInfo = buttonInfoMap.get(commandName);
			if (!buttonInfo) return;

			setDisabledItems(prev => prev.filter(item => item.commandName !== commandName));
			setEnabledItems(prev => [...prev, { commandName, buttonInfo }]);
		}
	}, [enabledItems, buttonInfoMap, allCommandNamesWithoutSeparators]);

	return {
		enabledItems,
		disabledItems,
		handleMoveUp,
		handleMoveDown,
		handleToggle,
		reinitialize,
	};
};

export default useToolbarEditorState;
