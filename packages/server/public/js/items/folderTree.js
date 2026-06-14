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

		const setActiveDescendant = function(node) {
			if (!node) return;
			const row = document.getElementById(rowId(node));
			if (row) container.setAttribute('aria-activedescendant', row.id);
		};

		container.setAttribute('role', 'tree');
		container.setAttribute('aria-label', 'Notebook navigation');

		const renderTreeItem = function(e) {
			const row = e.nodeElem ? e.nodeElem.closest('.wb-row') : null;
			if (!row) return;

			row.id = rowId(e.node);
			row.setAttribute('role', 'treeitem');
			if (e.node.hasFocus() || e.node.isActive()) {
				setActiveDescendant(e.node);
			}
		};

		new window.mar10.Wunderbaum({
			element: container,
			header: false,
			rowHeightPx: 40,
			source: treeData.source || [],
			navigationModeOption: 'row',
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
						setActiveDescendant(active);
					}
				}
			},
			activate: function(e) {
				setActiveDescendant(e.node);
			},
			render: function(e) {
				renderTreeItem(e);
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
