export const itemAnchorRefs_: any = {
	current: {},
};

export default (itemId: string) => {
	if (itemAnchorRefs_.current[itemId] && itemAnchorRefs_.current[itemId].current) return itemAnchorRefs_.current[itemId].current;
	return null;
};
