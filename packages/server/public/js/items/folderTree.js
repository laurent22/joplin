(function() {
	'use strict';

	function onReady(fn) {
		if (document.readyState === 'complete' || document.readyState === 'interactive') {
			setTimeout(fn, 1);
		} else {
			document.addEventListener('DOMContentLoaded', fn);
		}
	}

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

		const navigate = function(node) {
			if (!node || !node.data || !node.data.url) return;
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
						active.setActive(true, { noEvents: true, focusTree: false });
						active.makeVisible({ noAnimation: true, noEvents: true });
						setActiveTreeItem(active, false);
					}
				}
			},
			activate: function(e) {
				setActiveTreeItem(e.node, true);
			},
			render: function(e) {
				renderTreeItem(e);
			},
			expand: function(e) {
				updateExpandedState(e.node);
				announceExpandedState(e.node);
			},
			collapse: function(e) {
				updateExpandedState(e.node);
				announceExpandedState(e.node);
			},
			click: function(e) {
				if (e.node && !e.node.folder) {
					if (e.event && e.event.preventDefault) e.event.preventDefault();
					navigate(e.node);
				}
			},
			keydown: function(e) {
				if (e.event && e.event.key === 'Enter' && e.node && !e.node.folder) {
					e.event.preventDefault();
					navigate(e.node);
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

	onReady(() => {
		initTree();
		initSidebarToggle();
	});
})();
