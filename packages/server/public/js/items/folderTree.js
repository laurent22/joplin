(function() {
	'use strict';

	function initTree() {
		const container = document.getElementById('folder-tree');
		if (!container) return;
		if (!window.mar10 || !window.mar10.Wunderbaum) return;

		const dataEl = document.getElementById('folder-tree-data');
		if (!dataEl) return;

		let treeData;
		try {
			treeData = JSON.parse(dataEl.content.textContent || '{}');
		} catch (error) {
			return;
		}

		const collapsedNotebooksStorageKey = `folder-tree-collapsed:${window.location.pathname}`;
		const loadCollapsedNotebookKeys = function() {
			try {
				const keys = JSON.parse(window.sessionStorage.getItem(collapsedNotebooksStorageKey) || '[]');
				return new Set(Array.isArray(keys) ? keys.filter(key => typeof key === 'string') : []);
			} catch (error) {
				return new Set();
			}
		};
		const collapsedNotebookKeys = loadCollapsedNotebookKeys();
		const saveCollapsedNotebookKeys = function() {
			try {
				if (collapsedNotebookKeys.size) {
					window.sessionStorage.setItem(collapsedNotebooksStorageKey, JSON.stringify([...collapsedNotebookKeys]));
				} else {
					window.sessionStorage.removeItem(collapsedNotebooksStorageKey);
				}
			} catch (error) {
				// Ignore unavailable browser storage.
			}
		};
		const restoreCollapsedNotebooks = function(nodes) {
			for (const node of nodes) {
				if (node.folder && collapsedNotebookKeys.has(node.key)) node.expanded = false;
				if (node.children) restoreCollapsedNotebooks(node.children);
			}
		};
		restoreCollapsedNotebooks(treeData.source || []);
		const scrollStorageKey = `folder-tree-scroll:${window.location.pathname}`;
		const accessSessionStorage = function(callback) {
			try {
				return callback(window.sessionStorage);
			} catch (error) {
				return null;
			}
		};

		const navigate = function(node) {
			if (!node || !node.data || !node.data.url) return;
			accessSessionStorage(storage => storage.setItem(scrollStorageKey, String(container.scrollTop)));
			window.location.href = node.data.url;
		};

		const rowId = function(node) {
			return `folder-tree-item-${node.key}`;
		};

		const setActiveTreeItem = function(node, moveFocus) {
			if (!node) return;
			const nodeElement = document.getElementById(rowId(node));
			if (!nodeElement) return;

			container.setAttribute('aria-activedescendant', nodeElement.id);
			if (moveFocus) node.tree.setFocus();
		};

		container.setAttribute('role', 'tree');
		container.setAttribute('aria-label', 'Notebook navigation');

		const liveRegion = document.createElement('div');
		liveRegion.className = 'sr-only';
		liveRegion.setAttribute('role', 'status');
		liveRegion.setAttribute('aria-atomic', 'true');
		container.after(liveRegion);

		const updateTreeItemLabel = function(node, treeItem) {
			const siblings = node.parent ? node.parent.children || [] : [];
			const position = siblings.indexOf(node) + 1;
			const stateText = node.isExpandable() ? `, ${node.isExpanded() ? 'expanded' : 'collapsed'}` : '';
			treeItem.setAttribute('aria-label', `${node.title}${stateText}, ${position} of ${siblings.length}`);
		};

		const updateExpandedState = function(node, nodeElem) {
			const treeItem = nodeElem || document.getElementById(rowId(node));
			if (!treeItem) return;

			treeItem.removeAttribute('aria-expanded');
			updateTreeItemLabel(node, treeItem);
		};

		const announceExpandedState = function(node) {
			liveRegion.textContent = `${node.title} ${node.isExpanded() ? 'expanded' : 'collapsed'}`;
		};

		const renderTreeItem = function(e) {
			const row = e.nodeElem ? e.nodeElem.closest('.wb-row') : null;
			if (!row) return;

			const siblings = e.node.parent ? e.node.parent.children || [] : [];
			const position = siblings.indexOf(e.node) + 1;
			row.setAttribute('role', 'presentation');
			row.dataset.treeItemType = e.node.data.url ? 'note' : 'folder';
			const title = e.nodeElem.querySelector('.wb-title');
			if (title && title.scrollWidth > title.clientWidth) {
				title.setAttribute('title', e.node.title);
			} else if (title) {
				title.removeAttribute('title');
			}
			e.nodeElem.id = rowId(e.node);
			e.nodeElem.setAttribute('role', 'treeitem');
			// Added to fix screen reader on Safari
			e.nodeElem.setAttribute('aria-roledescription', 'outline row');
			e.nodeElem.setAttribute('aria-level', e.node.getLevel());
			e.nodeElem.setAttribute('aria-posinset', position);
			e.nodeElem.setAttribute('aria-setsize', siblings.length);

			updateExpandedState(e.node, e.nodeElem);
			if (e.node.hasFocus() || e.node.isActive()) {
				setActiveTreeItem(e.node, false);
			}
		};

		new window.mar10.Wunderbaum({
			element: container,
			adjustHeight: false,
			header: false,
			rowHeightPx: 40,
			source: treeData.source || [],
			navigationModeOption: 'row',
			emptyChildListExpandable: true,
			icon: false,
			iconMap: {
				expanderExpanded: 'fas fa-chevron-down',
				expanderCollapsed: 'fas fa-chevron-right',
				expanderLazy: 'fas fa-chevron-right',
				doc: 'fas fa-sticky-note',
				folder: 'fas fa-folder',
				folderOpen: 'fas fa-folder-open',
				folderLazy: 'fas fa-folder',
			},
			init: async function(e) {
				const scrollTop = Number(accessSessionStorage(storage => storage.getItem(scrollStorageKey))) || 0;
				if (treeData.activeKey) {
					const active = e.tree.findKey(treeData.activeKey);
					if (active) {
						await active.setActive(true, { noEvents: true, focusTree: false });
						container.scrollTop = scrollTop;
						setActiveTreeItem(active, false);
					}
				}

				requestAnimationFrame(() => {
					requestAnimationFrame(() => container.classList.remove('is-initializing'));
				});
			},
			activate: function(e) {
				setActiveTreeItem(e.node, true);
			},
			render: function(e) {
				renderTreeItem(e);
			},
			expand: function(e) {
				if (e.flag) {
					collapsedNotebookKeys.delete(e.node.key);
				} else {
					collapsedNotebookKeys.add(e.node.key);
				}
				saveCollapsedNotebookKeys();
				updateExpandedState(e.node);
				announceExpandedState(e.node);
			},
			click: function(e) {
				if (e.node && e.node.data.folder) {
					e.node.setExpanded(!e.node.isExpanded());
					return false;
				} else if (e.node) {
					if (e.event && e.event.preventDefault) e.event.preventDefault();
					navigate(e.node);
					return false;
				}
			},
			dblclick: function() {
				return false;
			},
			keydown: function(e) {
				if (e.event && e.event.key === 'Enter' && e.node && !e.node.folder) {
					e.event.preventDefault();
					navigate(e.node);
					return false;
				}
			},
		});

		const listContainer = container.querySelector('.wb-list-container');
		const nodeList = container.querySelector('.wb-node-list');
		if (listContainer) listContainer.setAttribute('role', 'presentation');
		if (nodeList) nodeList.setAttribute('role', 'presentation');
	}

	function initSidebarToggle() {
		const toggle = document.querySelector('.folder-tree-toggle');
		const sidebar = document.getElementById('folder-tree-sidebar');
		if (!toggle || !sidebar) return;

		toggle.addEventListener('click', () => {
			const isOpen = sidebar.classList.toggle('is-open');
			toggle.classList.toggle('is-active', isOpen);
			toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
		});
	}

	const initFolderTree = function() {
		initTree();
		initSidebarToggle();
	};

	const initWhenLayoutReady = function() {
		const footer = document.querySelector('body > .footer');
		// The next node is added after the footer is fully parsed.
		if (!footer || !footer.nextSibling) return false;

		initFolderTree();
		return true;
	};

	if (!initWhenLayoutReady()) {
		const layoutObserver = new MutationObserver(() => {
			if (initWhenLayoutReady()) layoutObserver.disconnect();
		});

		layoutObserver.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	}
})();
