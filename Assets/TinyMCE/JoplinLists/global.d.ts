declare module 'tinymce/core/api/util/Tools' {
	const Tools:any;
    export default Tools;
}

declare module 'tinymce/core/api/Editor' {
    export default interface Editor {
    	on: Function,
    	off: Function,
    	execCommand: Function,
    	getBody: Function,
    	getParam: Function,
    	fire: Function,
    	nodeChanged: Function,
    	selection: any,
    	contentDocument: any,
    	dom: any,
    	schema: any,
    	undoManager: any,
    	ui: any,
    }
}

declare module 'tinymce/core/api/dom/BookmarkManager' {
	const BookmarkManager:any;
	export default BookmarkManager;
}

declare module 'tinymce/core/api/dom/DOMUtils' {
	const DOMUtils:any;
	export default DOMUtils;
}

declare module 'tinymce/core/api/dom/RangeUtils' {
	const RangeUtils:any;
	export default RangeUtils;
}

declare module 'tinymce/core/api/dom/TreeWalker' {
	const TreeWalker:any;
	export default TreeWalker;
}

declare module 'tinymce/core/api/util/VK' {
	const VK:any;
	export default VK;
}

declare module 'tinymce/core/api/dom/DomQuery' {
	const DomQuery:any;
	export default DomQuery;
}

declare module 'tinymce/core/api/PluginManager' {
	const PluginManager:any;
	export default PluginManager;
}
