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
		const pointerPositionStorageKey = 'folder-tree-pointer-position';
		const syntheticHoverClassName = 'is-pointer-hover';
		const treeRowSelector = '.wb-row[data-tree-item-type]';
		const accessSessionStorage = function(callback) {
			try {
				return callback(window.sessionStorage);
			} catch (error) {
				return null;
			}
		};
		let hoverPosition = accessSessionStorage(storage => JSON.parse(storage.getItem(pointerPositionStorageKey) || 'null'));

		const applySyntheticHoverAt = function(x, y) {
			if (typeof x !== 'number' || typeof y !== 'number') return;
			const target = document.elementFromPoint(x, y);
			const row = target ? target.closest(treeRowSelector) : null;
			const previousRow = container.querySelector(`.${syntheticHoverClassName}`);
			if (previousRow && previousRow !== row) previousRow.classList.remove(syntheticHoverClassName);
			if (row && container.contains(row)) row.classList.add(syntheticHoverClassName);
		};

		const savePointerPosition = function(event, nodeId) {
			if (!event || typeof event.clientX !== 'number' || typeof event.clientY !== 'number') return;
			const row = nodeId || !event.target.closest ? null : event.target.closest(treeRowSelector);
			const treeItem = row ? row.querySelector('[role="treeitem"]') : null;
			hoverPosition = {
				x: event.clientX,
				y: event.clientY,
				id: nodeId || (treeItem ? treeItem.id : null),
			};
			accessSessionStorage(storage => storage.setItem(pointerPositionStorageKey, JSON.stringify(hoverPosition)));
		};

		const navigate = function(node, event) {
			if (!node || !node.data || !node.data.url) return;
			savePointerPosition(event, rowId(node));
			accessSessionStorage(storage => storage.setItem(scrollStorageKey, String(container.scrollTop)));
			window.location.href = node.data.url;
		};

		const rowId = function(node) {
			return `folder-tree-item-${node.key}`;
		};

		let selectedTreeItem = null;
		const setSelectedTreeItem = function(treeItem) {
			if (selectedTreeItem && selectedTreeItem !== treeItem) {
				selectedTreeItem.setAttribute('aria-selected', 'false');
			}

			selectedTreeItem = treeItem;
			if (selectedTreeItem) selectedTreeItem.setAttribute('aria-selected', 'true');
		};

		const setActiveTreeItem = function(node, moveFocus) {
			if (!node) return;
			const nodeElement = document.getElementById(rowId(node));
			if (!nodeElement) return;

			container.setAttribute('aria-activedescendant', nodeElement.id);
			setSelectedTreeItem(nodeElement);
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
			e.nodeElem.id = rowId(e.node);
			const wasRowHovered = Boolean(hoverPosition && hoverPosition.id === e.nodeElem.id);
			row.classList.toggle(syntheticHoverClassName, wasRowHovered);
			const title = e.nodeElem.querySelector('.wb-title');
			if (title && title.scrollWidth > title.clientWidth) {
				title.setAttribute('title', e.node.title);
			} else if (title) {
				title.removeAttribute('title');
			}
			e.nodeElem.setAttribute('role', 'treeitem');
			if (e.node.hasFocus() || e.node.isActive() || container.getAttribute('aria-activedescendant') === e.nodeElem.id) {
				setSelectedTreeItem(e.nodeElem);
			} else {
				e.nodeElem.setAttribute('aria-selected', 'false');
			}
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
			init: function(e) {
				if (treeData.activeKey) {
					const active = e.tree.findKey(treeData.activeKey);
					if (active) {
						e.tree._setActiveNode(active);
						active.update();
						setActiveTreeItem(active, false);
					}
				}

				requestAnimationFrame(() => {
					container.scrollTop = Number(accessSessionStorage(storage => storage.getItem(scrollStorageKey))) || 0;
					requestAnimationFrame(() => {
						if (hoverPosition) applySyntheticHoverAt(hoverPosition.x, hoverPosition.y);
						container.classList.remove('is-initializing');
					});
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
				setActiveTreeItem(e.node, container.contains(document.activeElement));
				announceExpandedState(e.node);
			},
			click: function(e) {
				if (e.node && e.node.data.folder) {
					setActiveTreeItem(e.node, true);
					e.node.setExpanded(!e.node.isExpanded());
					return false;
				} else if (e.node) {
					if (e.event && e.event.preventDefault) e.event.preventDefault();
					navigate(e.node, e.event);
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

		const updateSyntheticHover = function(event) {
			savePointerPosition(event);
			const pointerLeftTree = event.type === 'pointerleave';
			const pointerX = pointerLeftTree ? -1 : event.clientX;
			const pointerY = pointerLeftTree ? -1 : event.clientY;
			applySyntheticHoverAt(pointerX, pointerY);
		};
		container.addEventListener('pointermove', updateSyntheticHover);
		container.addEventListener('pointerleave', updateSyntheticHover);

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

	onDocumentReady(initFolderTree);
})();
