import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import Setting from '@joplin/lib/models/Setting';
import { _ } from '@joplin/lib/locale';

type TabInfo = {
	value: string;
	label: string;
};

const useSelectedTabId = (tabs: TabInfo[]) => {
	const rememberedTabIdRef = useRef<string>(Setting.value('ui.lastSelectedPluginPanel'));
	const restorePendingRef = useRef(!!rememberedTabIdRef.current);
	const tabsRef = useRef(tabs);
	useEffect(() => {
		tabsRef.current = tabs;
	}, [tabs]);
	const [selectedTabId, setSelectedTabId] = useState<string|undefined>(() =>
		tabs.find(tab => tab.value === rememberedTabIdRef.current)?.value ?? tabs[0]?.value,
	);

	useEffect(() => {
		if (restorePendingRef.current && tabs.some(tab => tab.value === rememberedTabIdRef.current)) {
			restorePendingRef.current = false;
			setSelectedTabId(rememberedTabIdRef.current);
		} else if (!tabs.some(tab => tab.value === selectedTabId)) {
			setSelectedTabId(tabs[0]?.value);
		}
	}, [tabs, selectedTabId]);

	const selectTab = useCallback((tabId: string) => {
		restorePendingRef.current = false;
		rememberedTabIdRef.current = tabId;
		Setting.setValue('ui.lastSelectedPluginPanel', tabId);
		setSelectedTabId(tabId);
	}, []);

	useEffect(() => {
		if (!selectedTabId) return;

		const tab = tabsRef.current.find(item => item.value === selectedTabId);
		if (tab) AccessibilityInfo.announceForAccessibility(_('%s tab opened', tab.label));
	}, [selectedTabId]);

	return { selectedTabId, setSelectedTabId: selectTab };
};

export default useSelectedTabId;
