import { useState, useCallback, useMemo } from 'react';
import { ToolbarButtonInfo } from '@joplin/lib/services/commands/ToolbarButtonUtils';

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

type ItemsState = {
	enabledItems: ReorderableItem[];
	disabledItems: ReorderableItem[];
};

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

	// Both lists are combined into one state object so that handleToggle can update them
	// atomically in a single functional updater. This eliminates the stale-closure race
	// that would occur if they were separate useState values (rapid double-taps could see
	// an outdated snapshot of enabledItems and toggle in the wrong direction).
	const [{ enabledItems, disabledItems }, setItems] = useState<ItemsState>(() => ({
		enabledItems: buildEnabledItems(initialSelectedCommandNames),
		disabledItems: buildDisabledItems(new Set(initialSelectedCommandNames.filter(n => n !== '-'))),
	}));

	const reinitialize = useCallback((selectedNames: string[]) => {
		setItems({
			enabledItems: buildEnabledItems(selectedNames),
			disabledItems: buildDisabledItems(new Set(selectedNames.filter(n => n !== '-'))),
		});
	}, [buildEnabledItems, buildDisabledItems]);

	const handleMoveUp = useCallback((index: number) => {
		setItems(prev => {
			if (index <= 0) return prev;
			const newEnabled = [...prev.enabledItems];
			[newEnabled[index - 1], newEnabled[index]] = [newEnabled[index], newEnabled[index - 1]];
			return { ...prev, enabledItems: newEnabled };
		});
	}, []);

	const handleMoveDown = useCallback((index: number) => {
		setItems(prev => {
			if (index >= prev.enabledItems.length - 1) return prev;
			const newEnabled = [...prev.enabledItems];
			[newEnabled[index], newEnabled[index + 1]] = [newEnabled[index + 1], newEnabled[index]];
			return { ...prev, enabledItems: newEnabled };
		});
	}, []);

	const handleToggle = useCallback((commandName: string) => {
		setItems(prev => {
			const isCurrentlyEnabled = prev.enabledItems.some(item => item.commandName === commandName);

			if (isCurrentlyEnabled) {
				const newEnabled = prev.enabledItems.filter(item => item.commandName !== commandName);
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
						const existing = prev.disabledItems.find(item => item.commandName === name);
						if (existing) newDisabled.push(existing);
					}
				}
				if (!inserted) newDisabled.push({ commandName, buttonInfo });

				return { enabledItems: newEnabled, disabledItems: newDisabled };
			} else {
				const buttonInfo = buttonInfoMap.get(commandName);
				if (!buttonInfo) return prev;
				return {
					enabledItems: [...prev.enabledItems, { commandName, buttonInfo }],
					disabledItems: prev.disabledItems.filter(item => item.commandName !== commandName),
				};
			}
		});
	}, [buttonInfoMap, allCommandNamesWithoutSeparators]);

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
