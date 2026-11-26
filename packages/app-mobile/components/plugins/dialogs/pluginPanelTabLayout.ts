export const minOverflowTabWidth = 160;

export const getTabLayout = (naturalContentWidth: number, selectorWidth: number, tabCount: number) => {
	const overflow = selectorWidth > 0 && naturalContentWidth > selectorWidth + 1;
	const tabWidth = Math.max(minOverflowTabWidth, selectorWidth / Math.max(tabCount, 1));
	return { overflow, tabWidth };
};

export const getSelectedTabScrollOffset = (tabWidth: number, tabCount: number, selectedIndex: number, selectorWidth: number, currentOffset: number) => {
	if (selectedIndex < 0 || selectedIndex >= tabCount) return currentOffset;

	const selectedStart = selectedIndex * tabWidth;
	const selectedEnd = selectedStart + tabWidth;
	let target = currentOffset;
	if (selectedStart < target) target = selectedStart;
	if (selectedEnd > target + selectorWidth) target = selectedEnd - selectorWidth;
	return Math.max(0, Math.min(target, tabCount * tabWidth - selectorWidth));
};
