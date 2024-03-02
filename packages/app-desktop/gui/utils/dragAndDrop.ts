let globalDropEventCallback_: (()=> void)|null = null;

const onGlobalDrop = () => {
	const callback = globalDropEventCallback_;
	unregisterGlobalDragEndEvent();
	if (callback) callback();
};

export const registerGlobalDragEndEvent = (callback: ()=> void) => {
	if (globalDropEventCallback_) return;
	globalDropEventCallback_ = callback;
	document.addEventListener('dragend', onGlobalDrop);
};

export const unregisterGlobalDragEndEvent = () => {
	globalDropEventCallback_ = null;
	document.removeEventListener('dragend', onGlobalDrop);
};
