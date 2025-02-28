/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 *
 * Version: 5.2.0 (2020-02-13)
 */
(function(domGlobals) {
	'use strict';

	const global$1 = tinymce.util.Tools.resolve('tinymce.PluginManager');

	const global$2 = tinymce.util.Tools.resolve('tinymce.util.VK');

	const typeOf = function(x) {
		if (x === null) {
			return 'null';
		}
		const t = typeof x;
		if (t === 'object' && (Array.prototype.isPrototypeOf(x) || x.constructor && x.constructor.name === 'Array')) {
			return 'array';
		}
		if (t === 'object' && (String.prototype.isPrototypeOf(x) || x.constructor && x.constructor.name === 'String')) {
			return 'string';
		}
		return t;
	};
	const isType = function(type) {
		return function(value) {
			return typeOf(value) === type;
		};
	};
	const isString = isType('string');
	const isArray = isType('array');
	const isBoolean = isType('boolean');
	const isFunction = isType('function');

	const assumeExternalTargets = function(editor) {
		const externalTargets = editor.getParam('link_assume_external_targets', false);
		if (isBoolean(externalTargets) && externalTargets) {
			return 1;
		} else if (isString(externalTargets) && (externalTargets === 'http' || externalTargets === 'https')) {
			return externalTargets;
		}
		return 0;
	};
	const hasContextToolbar = function(editor) {
		return editor.getParam('link_context_toolbar', false, 'boolean');
	};
	const getLinkList = function(editor) {
		return editor.getParam('link_list');
	};
	const getDefaultLinkTarget = function(editor) {
		return editor.getParam('default_link_target');
	};
	const getTargetList = function(editor) {
		return editor.getParam('target_list', true);
	};
	const getRelList = function(editor) {
		return editor.getParam('rel_list', [], 'array');
	};
	const getLinkClassList = function(editor) {
		return editor.getParam('link_class_list', [], 'array');
	};
	const shouldShowLinkTitle = function(editor) {
		return editor.getParam('link_title', true, 'boolean');
	};
	const allowUnsafeLinkTarget = function(editor) {
		return editor.getParam('allow_unsafe_link_target', false, 'boolean');
	};
	const useQuickLink = function(editor) {
		return editor.getParam('link_quicklink', false, 'boolean');
	};
	const getDefaultLinkProtocol = function(editor) {
		return editor.getParam('link_default_protocol', 'http', 'string');
	};
	const Settings = {
		assumeExternalTargets: assumeExternalTargets,
		hasContextToolbar: hasContextToolbar,
		getLinkList: getLinkList,
		getDefaultLinkTarget: getDefaultLinkTarget,
		getTargetList: getTargetList,
		getRelList: getRelList,
		getLinkClassList: getLinkClassList,
		shouldShowLinkTitle: shouldShowLinkTitle,
		allowUnsafeLinkTarget: allowUnsafeLinkTarget,
		useQuickLink: useQuickLink,
		getDefaultLinkProtocol: getDefaultLinkProtocol,
	};

	const appendClickRemove = function(link, evt) {
		domGlobals.document.body.appendChild(link);
		link.dispatchEvent(evt);
		domGlobals.document.body.removeChild(link);
	};
	const open = function(url) {
		const link = domGlobals.document.createElement('a');
		link.target = '_blank';
		link.href = url;
		link.rel = 'noreferrer noopener';
		const evt = domGlobals.document.createEvent('MouseEvents');
		evt.initMouseEvent('click', true, true, domGlobals.window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
		appendClickRemove(link, evt);
	};
	const OpenUrl = { open: open };

	var __assign = function() {
		__assign = Object.assign || function __assign(t) {
			for (var s, i = 1, n = arguments.length; i < n; i++) {
				s = arguments[i];
				for (const p in s) {
					if (Object.prototype.hasOwnProperty.call(s, p)) { t[p] = s[p]; }
				}
			}
			return t;
		};
		return __assign.apply(this, arguments);
	};

	const noop = function() {
	};
	const constant = function(value) {
		return function() {
			return value;
		};
	};
	const never = constant(false);
	const always = constant(true);

	const none = function() {
		return NONE;
	};
	var NONE = function() {
		const eq = function(o) {
			return o.isNone();
		};
		const call = function(thunk) {
			return thunk();
		};
		const id = function(n) {
			return n;
		};
		const me = {
			fold: function(n, s) {
				return n();
			},
			is: never,
			isSome: never,
			isNone: always,
			getOr: id,
			getOrThunk: call,
			getOrDie: function(msg) {
				throw new Error(msg || 'error: getOrDie called on none.');
			},
			getOrNull: constant(null),
			getOrUndefined: constant(undefined),
			or: id,
			orThunk: call,
			map: none,
			each: noop,
			bind: none,
			exists: never,
			forall: always,
			filter: none,
			equals: eq,
			equals_: eq,
			toArray: function() {
				return [];
			},
			toString: constant('none()'),
		};
		if (Object.freeze) {
			Object.freeze(me);
		}
		return me;
	}();
	var some = function(a) {
		const constant_a = constant(a);
		const self = function() {
			return me;
		};
		const bind = function(f) {
			return f(a);
		};
		var me = {
			fold: function(n, s) {
				return s(a);
			},
			is: function(v) {
				return a === v;
			},
			isSome: always,
			isNone: never,
			getOr: constant_a,
			getOrThunk: constant_a,
			getOrDie: constant_a,
			getOrNull: constant_a,
			getOrUndefined: constant_a,
			or: self,
			orThunk: self,
			map: function(f) {
				return some(f(a));
			},
			each: function(f) {
				f(a);
			},
			bind: bind,
			exists: bind,
			forall: bind,
			filter: function(f) {
				return f(a) ? me : NONE;
			},
			toArray: function() {
				return [a];
			},
			toString: function() {
				return `some(${a})`;
			},
			equals: function(o) {
				return o.is(a);
			},
			equals_: function(o, elementEq) {
				return o.fold(never, function(b) {
					return elementEq(a, b);
				});
			},
		};
		return me;
	};
	const from = function(value) {
		return value === null || value === undefined ? NONE : some(value);
	};
	const Option = {
		some: some,
		none: none,
		from: from,
	};

	const nativeSlice = Array.prototype.slice;
	const nativeIndexOf = Array.prototype.indexOf;
	const nativePush = Array.prototype.push;
	const rawIndexOf = function(ts, t) {
		return nativeIndexOf.call(ts, t);
	};
	const contains = function(xs, x) {
		return rawIndexOf(xs, x) > -1;
	};
	const map = function(xs, f) {
		const len = xs.length;
		const r = new Array(len);
		for (let i = 0; i < len; i++) {
			const x = xs[i];
			r[i] = f(x, i);
		}
		return r;
	};
	const each = function(xs, f) {
		for (let i = 0, len = xs.length; i < len; i++) {
			const x = xs[i];
			f(x, i);
		}
	};
	const foldl = function(xs, f, acc) {
		each(xs, function(x) {
			acc = f(acc, x);
		});
		return acc;
	};
	const flatten = function(xs) {
		const r = [];
		for (let i = 0, len = xs.length; i < len; ++i) {
			if (!isArray(xs[i])) {
				throw new Error(`Arr.flatten item ${i} was not an array, input: ${xs}`);
			}
			nativePush.apply(r, xs[i]);
		}
		return r;
	};
	const bind = function(xs, f) {
		return flatten(map(xs, f));
	};
	const from$1 = isFunction(Array.from) ? Array.from : function(x) {
		return nativeSlice.call(x);
	};
	const findMap = function(arr, f) {
		for (let i = 0; i < arr.length; i++) {
			const r = f(arr[i], i);
			if (r.isSome()) {
				return r;
			}
		}
		return Option.none();
	};

	const global$3 = tinymce.util.Tools.resolve('tinymce.util.Tools');

	const hasProtocol = function(url) {
		return /^\w+:/i.test(url);
	};
	const getHref = function(elm) {
		const href = elm.getAttribute('data-mce-href');
		return href ? href : elm.getAttribute('href');
	};
	const applyRelTargetRules = function(rel, isUnsafe) {
		const rules = ['noopener'];
		const rels = rel ? rel.split(/\s+/) : [];
		const toString = function(rels) {
			return global$3.trim(rels.sort().join(' '));
		};
		const addTargetRules = function(rels) {
			rels = removeTargetRules(rels);
			return rels.length > 0 ? rels.concat(rules) : rules;
		};
		var removeTargetRules = function(rels) {
			return rels.filter(function(val) {
				return global$3.inArray(rules, val) === -1;
			});
		};
		const newRels = isUnsafe ? addTargetRules(rels) : removeTargetRules(rels);
		return newRels.length > 0 ? toString(newRels) : '';
	};
	const trimCaretContainers = function(text) {
		return text.replace(/\uFEFF/g, '');
	};
	const getAnchorElement = function(editor, selectedElm) {
		selectedElm = selectedElm || editor.selection.getNode();
		if (isImageFigure(selectedElm)) {
			return editor.dom.select('a[href]', selectedElm)[0];
		} else {
			return editor.dom.getParent(selectedElm, 'a[href]');
		}
	};
	const getAnchorText = function(selection, anchorElm) {
		const text = anchorElm ? anchorElm.innerText || anchorElm.textContent : selection.getContent({ format: 'text' });
		return trimCaretContainers(text);
	};
	const isLink = function(elm) {
		return elm && elm.nodeName === 'A' && !!elm.href;
	};
	const hasLinks = function(elements) {
		return global$3.grep(elements, isLink).length > 0;
	};
	const isOnlyTextSelected = function(html) {
		if (/</.test(html) && (!/^<a [^>]+>[^<]+<\/a>$/.test(html) || html.indexOf('href=') === -1)) {
			return false;
		}
		return true;
	};
	var isImageFigure = function(elm) {
		return elm && elm.nodeName === 'FIGURE' && /\bimage\b/i.test(elm.className);
	};
	const getLinkAttrs = function(data) {
		return foldl([
			'title',
			'rel',
			'class',
			'target',
		], function(acc, key) {
			data[key].each(function(value) {
				acc[key] = value.length > 0 ? value : null;
			});
			return acc;
		}, { href: data.href });
	};
	const handleExternalTargets = function(href, assumeExternalTargets) {
		if ((assumeExternalTargets === 'http' || assumeExternalTargets === 'https') && !hasProtocol(href)) {
			return `${assumeExternalTargets}://${href}`;
		}
		return href;
	};
	const applyLinkOverrides = function(editor, linkAttrs) {
		const newLinkAttrs = __assign({}, linkAttrs);
		if (!(Settings.getRelList(editor).length > 0) && Settings.allowUnsafeLinkTarget(editor) === false) {
			const newRel = applyRelTargetRules(newLinkAttrs.rel, newLinkAttrs.target === '_blank');
			newLinkAttrs.rel = newRel ? newRel : null;
		}
		if (Option.from(newLinkAttrs.target).isNone() && Settings.getTargetList(editor) === false) {
			newLinkAttrs.target = Settings.getDefaultLinkTarget(editor);
		}
		newLinkAttrs.href = handleExternalTargets(newLinkAttrs.href, Settings.assumeExternalTargets(editor));
		return newLinkAttrs;
	};
	const updateLink = function(editor, anchorElm, text, linkAttrs) {
		text.each(function(text) {
			if (anchorElm.hasOwnProperty('innerText')) {
				anchorElm.innerText = text;
			} else {
				anchorElm.textContent = text;
			}
		});
		editor.dom.setAttribs(anchorElm, linkAttrs);
		editor.selection.select(anchorElm);
	};
	const createLink = function(editor, selectedElm, text, linkAttrs) {
		if (isImageFigure(selectedElm)) {
			linkImageFigure(editor, selectedElm, linkAttrs);
		} else {
			text.fold(function() {
				editor.execCommand('mceInsertLink', false, linkAttrs);
			}, function(text) {
				editor.insertContent(editor.dom.createHTML('a', linkAttrs, editor.dom.encode(text)));
			});
		}
	};
	const link = function(editor, attachState, data) {
		const selectedElm = editor.selection.getNode();
		const anchorElm = getAnchorElement(editor, selectedElm);
		const linkAttrs = applyLinkOverrides(editor, getLinkAttrs(data));
		editor.undoManager.transact(function() {
			if (data.href === attachState.href) {
				attachState.attach();
			}
			if (anchorElm) {
				editor.focus();
				updateLink(editor, anchorElm, data.text, linkAttrs);
			} else {
				createLink(editor, selectedElm, data.text, linkAttrs);
			}
		});
	};
	const unlink = function(editor) {
		editor.undoManager.transact(function() {
			const node = editor.selection.getNode();
			if (isImageFigure(node)) {
				unlinkImageFigure(editor, node);
			} else {
				const anchorElm = editor.dom.getParent(node, 'a[href]', editor.getBody());
				if (anchorElm) {
					editor.dom.remove(anchorElm, true);
				}
			}
			editor.focus();
		});
	};
	var unlinkImageFigure = function(editor, fig) {
		const img = editor.dom.select('img', fig)[0];
		if (img) {
			const a = editor.dom.getParents(img, 'a[href]', fig)[0];
			if (a) {
				a.parentNode.insertBefore(img, a);
				editor.dom.remove(a);
			}
		}
	};
	var linkImageFigure = function(editor, fig, attrs) {
		const img = editor.dom.select('img', fig)[0];
		if (img) {
			const a = editor.dom.create('a', attrs);
			img.parentNode.insertBefore(a, img);
			a.appendChild(img);
		}
	};
	const Utils = {
		link: link,
		unlink: unlink,
		isLink: isLink,
		hasLinks: hasLinks,
		getHref: getHref,
		isOnlyTextSelected: isOnlyTextSelected,
		getAnchorElement: getAnchorElement,
		getAnchorText: getAnchorText,
		applyRelTargetRules: applyRelTargetRules,
		hasProtocol: hasProtocol,
	};

	const cat = function(arr) {
		const r = [];
		const push = function(x) {
			r.push(x);
		};
		for (let i = 0; i < arr.length; i++) {
			arr[i].each(push);
		}
		return r;
	};

	const getValue = function(item) {
		return isString(item.value) ? item.value : '';
	};
	const sanitizeList = function(list, extractValue) {
		const out = [];
		global$3.each(list, function(item) {
			const text = isString(item.text) ? item.text : isString(item.title) ? item.title : '';
			if (item.menu !== undefined) {} else {
				const value = extractValue(item);
				out.push({
					text: text,
					value: value,
				});
			}
		});
		return out;
	};
	const sanitizeWith = function(extracter) {
		if (extracter === void 0) {
			extracter = getValue;
		}
		return function(list) {
			return Option.from(list).map(function(list) {
				return sanitizeList(list, extracter);
			});
		};
	};
	const sanitize = function(list) {
		return sanitizeWith(getValue)(list);
	};
	const createUi = function(name, label) {
		return function(items) {
			return {
				name: name,
				type: 'selectbox',
				label: label,
				items: items,
			};
		};
	};
	const ListOptions = {
		sanitize: sanitize,
		sanitizeWith: sanitizeWith,
		createUi: createUi,
		getValue: getValue,
	};

	var Cell = function(initial) {
		let value = initial;
		const get = function() {
			return value;
		};
		const set = function(v) {
			value = v;
		};
		const clone = function() {
			return Cell(get());
		};
		return {
			get: get,
			set: set,
			clone: clone,
		};
	};

	const findTextByValue = function(value, catalog) {
		return findMap(catalog, function(item) {
			return Option.some(item).filter(function(i) {
				return i.value === value;
			});
		});
	};
	const getDelta = function(persistentText, fieldName, catalog, data) {
		const value = data[fieldName];
		const hasPersistentText = persistentText.length > 0;
		return value !== undefined ? findTextByValue(value, catalog).map(function(i) {
			return {
				url: {
					value: i.value,
					meta: {
						text: hasPersistentText ? persistentText : i.text,
						attach: noop,
					},
				},
				text: hasPersistentText ? persistentText : i.text,
			};
		}) : Option.none();
	};
	const findCatalog = function(settings, fieldName) {
		if (fieldName === 'link') {
			return settings.catalogs.link;
		} else if (fieldName === 'anchor') {
			return settings.catalogs.anchor;
		} else {
			return Option.none();
		}
	};
	const init = function(initialData, linkSettings) {
		const persistentText = Cell(initialData.text);
		const onUrlChange = function(data) {
			if (persistentText.get().length <= 0) {
				const urlText = data.url.meta.text !== undefined ? data.url.meta.text : data.url.value;
				const urlTitle = data.url.meta.title !== undefined ? data.url.meta.title : '';
				return Option.some({
					text: urlText,
					title: urlTitle,
				});
			} else {
				return Option.none();
			}
		};
		const onCatalogChange = function(data, change) {
			const catalog = findCatalog(linkSettings, change.name).getOr([]);
			return getDelta(persistentText.get(), change.name, catalog, data);
		};
		const onChange = function(getData, change) {
			if (change.name === 'url') {
				return onUrlChange(getData());
			} else if (contains([
				'anchor',
				'link',
			], change.name)) {
				return onCatalogChange(getData(), change);
			} else if (change.name === 'text') {
				persistentText.set(getData().text);
				return Option.none();
			} else {
				return Option.none();
			}
		};
		return { onChange: onChange };
	};
	const DialogChanges = {
		init: init,
		getDelta: getDelta,
	};

	const exports$1 = {}, module = { exports: exports$1 };
	(function(define, exports, module, require) {
		(function(f) {
			if (typeof exports === 'object' && typeof module !== 'undefined') {
				module.exports = f();
			} else if (typeof define === 'function' && define.amd) {
				define([], f);
			} else {
				let g;
				if (typeof window !== 'undefined') {
					g = window;
				} else if (typeof global !== 'undefined') {
					g = global;
				} else if (typeof self !== 'undefined') {
					g = self;
				} else {
					g = this;
				}
				g.EphoxContactWrapper = f();
			}
		}(function() {
			return function() {
				function r(e, n, t) {
					function o(i, f) {
						if (!n[i]) {
							if (!e[i]) {
								const c = 'function' == typeof require && require;
								if (!f && c) { return c(i, !0); }
								if (u) { return u(i, !0); }
								const a = new Error(`Cannot find module '${i}'`);
								throw a.code = 'MODULE_NOT_FOUND', a;
							}
							const p = n[i] = { exports: {} };
							e[i][0].call(p.exports, function(r) {
								const n = e[i][1][r];
								return o(n || r);
							}, p, p.exports, r, e, n, t);
						}
						return n[i].exports;
					}
					for (var u = 'function' == typeof require && require, i = 0; i < t.length; i++) { o(t[i]); }
					return o;
				}
				return r;
			}()({
				1: [
					function(require, module, exports) {
						const process = module.exports = {};
						let cachedSetTimeout;
						let cachedClearTimeout;
						function defaultSetTimout() {
							throw new Error('setTimeout has not been defined');
						}
						function defaultClearTimeout() {
							throw new Error('clearTimeout has not been defined');
						}
						(function() {
							try {
								if (typeof setTimeout === 'function') {
									cachedSetTimeout = setTimeout;
								} else {
									cachedSetTimeout = defaultSetTimout;
								}
							} catch (e) {
								cachedSetTimeout = defaultSetTimout;
							}
							try {
								if (typeof clearTimeout === 'function') {
									cachedClearTimeout = clearTimeout;
								} else {
									cachedClearTimeout = defaultClearTimeout;
								}
							} catch (e) {
								cachedClearTimeout = defaultClearTimeout;
							}
						}());
						function runTimeout(fun) {
							if (cachedSetTimeout === setTimeout) {
								return setTimeout(fun, 0);
							}
							if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
								cachedSetTimeout = setTimeout;
								return setTimeout(fun, 0);
							}
							try {
								return cachedSetTimeout(fun, 0);
							} catch (e) {
								try {
									return cachedSetTimeout.call(null, fun, 0);
								} catch (e) {
									return cachedSetTimeout.call(this, fun, 0);
								}
							}
						}
						function runClearTimeout(marker) {
							if (cachedClearTimeout === clearTimeout) {
								return clearTimeout(marker);
							}
							if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
								cachedClearTimeout = clearTimeout;
								return clearTimeout(marker);
							}
							try {
								return cachedClearTimeout(marker);
							} catch (e) {
								try {
									return cachedClearTimeout.call(null, marker);
								} catch (e) {
									return cachedClearTimeout.call(this, marker);
								}
							}
						}
						let queue = [];
						let draining = false;
						let currentQueue;
						let queueIndex = -1;
						function cleanUpNextTick() {
							if (!draining || !currentQueue) {
								return;
							}
							draining = false;
							if (currentQueue.length) {
								queue = currentQueue.concat(queue);
							} else {
								queueIndex = -1;
							}
							if (queue.length) {
								drainQueue();
							}
						}
						function drainQueue() {
							if (draining) {
								return;
							}
							const timeout = runTimeout(cleanUpNextTick);
							draining = true;
							let len = queue.length;
							while (len) {
								currentQueue = queue;
								queue = [];
								while (++queueIndex < len) {
									if (currentQueue) {
										currentQueue[queueIndex].run();
									}
								}
								queueIndex = -1;
								len = queue.length;
							}
							currentQueue = null;
							draining = false;
							runClearTimeout(timeout);
						}
						process.nextTick = function(fun) {
							const args = new Array(arguments.length - 1);
							if (arguments.length > 1) {
								for (let i = 1; i < arguments.length; i++) {
									args[i - 1] = arguments[i];
								}
							}
							queue.push(new Item(fun, args));
							if (queue.length === 1 && !draining) {
								runTimeout(drainQueue);
							}
						};
						function Item(fun, array) {
							this.fun = fun;
							this.array = array;
						}
						Item.prototype.run = function() {
							this.fun.apply(null, this.array);
						};
						process.title = 'browser';
						process.browser = true;
						process.env = {};
						process.argv = [];
						process.version = '';
						process.versions = {};
						function noop() {
						}
						process.on = noop;
						process.addListener = noop;
						process.once = noop;
						process.off = noop;
						process.removeListener = noop;
						process.removeAllListeners = noop;
						process.emit = noop;
						process.prependListener = noop;
						process.prependOnceListener = noop;
						process.listeners = function(name) {
							return [];
						};
						process.binding = function(name) {
							throw new Error('process.binding is not supported');
						};
						process.cwd = function() {
							return '/';
						};
						process.chdir = function(dir) {
							throw new Error('process.chdir is not supported');
						};
						process.umask = function() {
							return 0;
						};
					},
					{},
				],
				2: [
					function(require, module, exports) {
						(function(setImmediate) {
							(function(root) {
								const setTimeoutFunc = setTimeout;
								function noop() {
								}
								function bind(fn, thisArg) {
									return function() {
										fn.apply(thisArg, arguments);
									};
								}
								function Promise(fn) {
									if (typeof this !== 'object') { throw new TypeError('Promises must be constructed via new'); }
									if (typeof fn !== 'function') { throw new TypeError('not a function'); }
									this._state = 0;
									this._handled = false;
									this._value = undefined;
									this._deferreds = [];
									doResolve(fn, this);
								}
								function handle(self, deferred) {
									while (self._state === 3) {
										self = self._value;
									}
									if (self._state === 0) {
										self._deferreds.push(deferred);
										return;
									}
									self._handled = true;
									Promise._immediateFn(function() {
										const cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
										if (cb === null) {
											(self._state === 1 ? resolve : reject)(deferred.promise, self._value);
											return;
										}
										let ret;
										try {
											ret = cb(self._value);
										} catch (e) {
											reject(deferred.promise, e);
											return;
										}
										resolve(deferred.promise, ret);
									});
								}
								function resolve(self, newValue) {
									try {
										if (newValue === self) { throw new TypeError('A promise cannot be resolved with itself.'); }
										if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
											const then = newValue.then;
											if (newValue instanceof Promise) {
												self._state = 3;
												self._value = newValue;
												finale(self);
												return;
											} else if (typeof then === 'function') {
												doResolve(bind(then, newValue), self);
												return;
											}
										}
										self._state = 1;
										self._value = newValue;
										finale(self);
									} catch (e) {
										reject(self, e);
									}
								}
								function reject(self, newValue) {
									self._state = 2;
									self._value = newValue;
									finale(self);
								}
								function finale(self) {
									if (self._state === 2 && self._deferreds.length === 0) {
										Promise._immediateFn(function() {
											if (!self._handled) {
												Promise._unhandledRejectionFn(self._value);
											}
										});
									}
									for (let i = 0, len = self._deferreds.length; i < len; i++) {
										handle(self, self._deferreds[i]);
									}
									self._deferreds = null;
								}
								function Handler(onFulfilled, onRejected, promise) {
									this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
									this.onRejected = typeof onRejected === 'function' ? onRejected : null;
									this.promise = promise;
								}
								function doResolve(fn, self) {
									let done = false;
									try {
										fn(function(value) {
											if (done) { return; }
											done = true;
											resolve(self, value);
										}, function(reason) {
											if (done) { return; }
											done = true;
											reject(self, reason);
										});
									} catch (ex) {
										if (done) { return; }
										done = true;
										reject(self, ex);
									}
								}
								Promise.prototype['catch'] = function(onRejected) {
									return this.then(null, onRejected);
								};
								Promise.prototype.then = function(onFulfilled, onRejected) {
									const prom = new this.constructor(noop);
									handle(this, new Handler(onFulfilled, onRejected, prom));
									return prom;
								};
								Promise.all = function(arr) {
									const args = Array.prototype.slice.call(arr);
									return new Promise(function(resolve, reject) {
										if (args.length === 0) { return resolve([]); }
										let remaining = args.length;
										function res(i, val) {
											try {
												if (val && (typeof val === 'object' || typeof val === 'function')) {
													const then = val.then;
													if (typeof then === 'function') {
														then.call(val, function(val) {
															res(i, val);
														}, reject);
														return;
													}
												}
												args[i] = val;
												if (--remaining === 0) {
													resolve(args);
												}
											} catch (ex) {
												reject(ex);
											}
										}
										for (let i = 0; i < args.length; i++) {
											res(i, args[i]);
										}
									});
								};
								Promise.resolve = function(value) {
									if (value && typeof value === 'object' && value.constructor === Promise) {
										return value;
									}
									return new Promise(function(resolve) {
										resolve(value);
									});
								};
								Promise.reject = function(value) {
									return new Promise(function(resolve, reject) {
										reject(value);
									});
								};
								Promise.race = function(values) {
									return new Promise(function(resolve, reject) {
										for (let i = 0, len = values.length; i < len; i++) {
											values[i].then(resolve, reject);
										}
									});
								};
								Promise._immediateFn = typeof setImmediate === 'function' ? function(fn) {
									setImmediate(fn);
								} : function(fn) {
									setTimeoutFunc(fn, 0);
								};
								Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
									if (typeof console !== 'undefined' && console) {
										console.warn('Possible Unhandled Promise Rejection:', err);
									}
								};
								Promise._setImmediateFn = function _setImmediateFn(fn) {
									Promise._immediateFn = fn;
								};
								Promise._setUnhandledRejectionFn = function _setUnhandledRejectionFn(fn) {
									Promise._unhandledRejectionFn = fn;
								};
								if (typeof module !== 'undefined' && module.exports) {
									module.exports = Promise;
								} else if (!root.Promise) {
									root.Promise = Promise;
								}
							}(this));
						}.call(this, require('timers').setImmediate));
					},
					{ 'timers': 3 },
				],
				3: [
					function(require, module, exports) {
						(function(setImmediate, clearImmediate) {
							const nextTick = require('process/browser.js').nextTick;
							const apply = Function.prototype.apply;
							const slice = Array.prototype.slice;
							const immediateIds = {};
							let nextImmediateId = 0;
							exports.setTimeout = function() {
								return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
							};
							exports.setInterval = function() {
								return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
							};
							exports.clearTimeout = exports.clearInterval = function(timeout) {
								timeout.close();
							};
							function Timeout(id, clearFn) {
								this._id = id;
								this._clearFn = clearFn;
							}
							Timeout.prototype.unref = Timeout.prototype.ref = function() {
							};
							Timeout.prototype.close = function() {
								this._clearFn.call(window, this._id);
							};
							exports.enroll = function(item, msecs) {
								clearTimeout(item._idleTimeoutId);
								item._idleTimeout = msecs;
							};
							exports.unenroll = function(item) {
								clearTimeout(item._idleTimeoutId);
								item._idleTimeout = -1;
							};
							exports._unrefActive = exports.active = function(item) {
								clearTimeout(item._idleTimeoutId);
								const msecs = item._idleTimeout;
								if (msecs >= 0) {
									item._idleTimeoutId = setTimeout(function onTimeout() {
										if (item._onTimeout) { item._onTimeout(); }
									}, msecs);
								}
							};
							exports.setImmediate = typeof setImmediate === 'function' ? setImmediate : function(fn) {
								const id = nextImmediateId++;
								const args = arguments.length < 2 ? false : slice.call(arguments, 1);
								immediateIds[id] = true;
								nextTick(function onNextTick() {
									if (immediateIds[id]) {
										if (args) {
											fn.apply(null, args);
										} else {
											fn.call(null);
										}
										exports.clearImmediate(id);
									}
								});
								return id;
							};
							exports.clearImmediate = typeof clearImmediate === 'function' ? clearImmediate : function(id) {
								delete immediateIds[id];
							};
						}.call(this, require('timers').setImmediate, require('timers').clearImmediate));
					},
					{
						'process/browser.js': 1,
						'timers': 3,
					},
				],
				4: [
					function(require, module, exports) {
						const promisePolyfill = require('promise-polyfill');
						const Global = function() {
							if (typeof window !== 'undefined') {
								return window;
							} else {
								return Function('return this;')();
							}
						}();
						module.exports = { boltExport: Global.Promise || promisePolyfill };
					},
					{ 'promise-polyfill': 2 },
				],
			}, {}, [4])(4);
		}));
	}(undefined, exports$1, module, undefined));
	const Promise = module.exports.boltExport;

	var nu = function(baseFn) {
		let data = Option.none();
		let callbacks = [];
		const map = function(f) {
			return nu(function(nCallback) {
				get(function(data) {
					nCallback(f(data));
				});
			});
		};
		var get = function(nCallback) {
			if (isReady()) {
				call(nCallback);
			} else {
				callbacks.push(nCallback);
			}
		};
		const set = function(x) {
			data = Option.some(x);
			run(callbacks);
			callbacks = [];
		};
		var isReady = function() {
			return data.isSome();
		};
		var run = function(cbs) {
			each(cbs, call);
		};
		var call = function(cb) {
			data.each(function(x) {
				domGlobals.setTimeout(function() {
					cb(x);
				}, 0);
			});
		};
		baseFn(set);
		return {
			get: get,
			map: map,
			isReady: isReady,
		};
	};
	const pure = function(a) {
		return nu(function(callback) {
			callback(a);
		});
	};
	const LazyValue = {
		nu: nu,
		pure: pure,
	};

	const errorReporter = function(err) {
		domGlobals.setTimeout(function() {
			throw err;
		}, 0);
	};
	var make = function(run) {
		const get = function(callback) {
			run().then(callback, errorReporter);
		};
		const map = function(fab) {
			return make(function() {
				return run().then(fab);
			});
		};
		const bind = function(aFutureB) {
			return make(function() {
				return run().then(function(v) {
					return aFutureB(v).toPromise();
				});
			});
		};
		const anonBind = function(futureB) {
			return make(function() {
				return run().then(function() {
					return futureB.toPromise();
				});
			});
		};
		const toLazy = function() {
			return LazyValue.nu(get);
		};
		const toCached = function() {
			let cache = null;
			return make(function() {
				if (cache === null) {
					cache = run();
				}
				return cache;
			});
		};
		const toPromise = run;
		return {
			map: map,
			bind: bind,
			anonBind: anonBind,
			toLazy: toLazy,
			toCached: toCached,
			toPromise: toPromise,
			get: get,
		};
	};
	const nu$1 = function(baseFn) {
		return make(function() {
			return new Promise(baseFn);
		});
	};
	const pure$1 = function(a) {
		return make(function() {
			return Promise.resolve(a);
		});
	};
	const Future = {
		nu: nu$1,
		pure: pure$1,
	};

	const global$4 = tinymce.util.Tools.resolve('tinymce.util.Delay');

	const delayedConfirm = function(editor, message, callback) {
		const rng = editor.selection.getRng();
		global$4.setEditorTimeout(editor, function() {
			editor.windowManager.confirm(message, function(state) {
				editor.selection.setRng(rng);
				callback(state);
			});
		});
	};
	const tryEmailTransform = function(data) {
		const url = data.href;
		const suggestMailTo = url.indexOf('@') > 0 && url.indexOf('//') === -1 && url.indexOf('mailto:') === -1;
		return suggestMailTo ? Option.some({
			message: 'The URL you entered seems to be an email address. Do you want to add the required mailto: prefix?',
			preprocess: function(oldData) {
				return __assign(__assign({}, oldData), { href: `mailto:${url}` });
			},
		}) : Option.none();
	};
	const tryProtocolTransform = function(assumeExternalTargets, defaultLinkProtocol) {
		return function(data) {
			const url = data.href;
			const suggestProtocol = assumeExternalTargets === 1 && !Utils.hasProtocol(url) || assumeExternalTargets === 0 && /^\s*www[\.|\d\.]/i.test(url);
			return suggestProtocol ? Option.some({
				message: `The URL you entered seems to be an external link. Do you want to add the required ${defaultLinkProtocol}:// prefix?`,
				preprocess: function(oldData) {
					return __assign(__assign({}, oldData), { href: `${defaultLinkProtocol}://${url}` });
				},
			}) : Option.none();
		};
	};
	const preprocess = function(editor, data) {
		return findMap([
			tryEmailTransform,
			tryProtocolTransform(Settings.assumeExternalTargets(editor), Settings.getDefaultLinkProtocol(editor)),
		], function(f) {
			return f(data);
		}).fold(function() {
			return Future.pure(data);
		}, function(transform) {
			return Future.nu(function(callback) {
				delayedConfirm(editor, transform.message, function(state) {
					callback(state ? transform.preprocess(data) : data);
				});
			});
		});
	};
	const DialogConfirms = { preprocess: preprocess };

	const getAnchors = function(editor) {
		const anchorNodes = editor.dom.select('a:not([href])');
		const anchors = bind(anchorNodes, function(anchor) {
			const id = anchor.name || anchor.id;
			return id ? [{
				text: id,
				value: `#${id}`,
			}] : [];
		});
		return anchors.length > 0 ? Option.some([{
			text: 'None',
			value: '',
		}].concat(anchors)) : Option.none();
	};
	const AnchorListOptions = { getAnchors: getAnchors };

	const getClasses = function(editor) {
		const list = Settings.getLinkClassList(editor);
		if (list.length > 0) {
			return ListOptions.sanitize(list);
		}
		return Option.none();
	};
	const ClassListOptions = { getClasses: getClasses };

	const global$5 = tinymce.util.Tools.resolve('tinymce.util.XHR');

	const parseJson = function(text) {
		try {
			return Option.some(JSON.parse(text));
		} catch (err) {
			return Option.none();
		}
	};
	const getLinks = function(editor) {
		const extractor = function(item) {
			return editor.convertURL(item.value || item.url, 'href');
		};
		const linkList = Settings.getLinkList(editor);
		return Future.nu(function(callback) {
			if (isString(linkList)) {
				global$5.send({
					url: linkList,
					success: function(text) {
						return callback(parseJson(text));
					},
					error: function(_) {
						return callback(Option.none());
					},
				});
			} else if (isFunction(linkList)) {
				linkList(function(output) {
					return callback(Option.some(output));
				});
			} else {
				callback(Option.from(linkList));
			}
		}).map(function(optItems) {
			return optItems.bind(ListOptions.sanitizeWith(extractor)).map(function(items) {
				if (items.length > 0) {
					return [{
						text: 'None',
						value: '',
					}].concat(items);
				} else {
					return items;
				}
			});
		});
	};
	const LinkListOptions = { getLinks: getLinks };

	const getRels = function(editor, initialTarget) {
		const list = Settings.getRelList(editor);
		if (list.length > 0) {
			const isTargetBlank_1 = initialTarget.is('_blank');
			const enforceSafe = Settings.allowUnsafeLinkTarget(editor) === false;
			const safeRelExtractor = function(item) {
				return Utils.applyRelTargetRules(ListOptions.getValue(item), isTargetBlank_1);
			};
			const sanitizer = enforceSafe ? ListOptions.sanitizeWith(safeRelExtractor) : ListOptions.sanitize;
			return sanitizer(list);
		}
		return Option.none();
	};
	const RelOptions = { getRels: getRels };

	const fallbacks = [
		{
			text: 'Current window',
			value: '',
		},
		{
			text: 'New window',
			value: '_blank',
		},
	];
	const getTargets = function(editor) {
		const list = Settings.getTargetList(editor);
		if (isArray(list)) {
			return ListOptions.sanitize(list).orThunk(function() {
				return Option.some(fallbacks);
			});
		} else if (list === false) {
			return Option.none();
		}
		return Option.some(fallbacks);
	};
	const TargetOptions = { getTargets: getTargets };

	const nonEmptyAttr = function(dom, elem, name) {
		const val = dom.getAttrib(elem, name);
		return val !== null && val.length > 0 ? Option.some(val) : Option.none();
	};
	const extractFromAnchor = function(editor, anchor) {
		const dom = editor.dom;
		const onlyText = Utils.isOnlyTextSelected(editor.selection.getContent());
		const text = onlyText ? Option.some(Utils.getAnchorText(editor.selection, anchor)) : Option.none();
		const url = anchor ? Option.some(dom.getAttrib(anchor, 'href')) : Option.none();
		const target = anchor ? Option.from(dom.getAttrib(anchor, 'target')) : Option.none();
		const rel = nonEmptyAttr(dom, anchor, 'rel');
		const linkClass = nonEmptyAttr(dom, anchor, 'class');
		const title = nonEmptyAttr(dom, anchor, 'title');
		return {
			url: url,
			text: text,
			title: title,
			target: target,
			rel: rel,
			linkClass: linkClass,
		};
	};
	const collect = function(editor, linkNode) {
		return LinkListOptions.getLinks(editor).map(function(links) {
			const anchor = extractFromAnchor(editor, linkNode);
			return {
				anchor: anchor,
				catalogs: {
					targets: TargetOptions.getTargets(editor),
					rels: RelOptions.getRels(editor, anchor.target),
					classes: ClassListOptions.getClasses(editor),
					anchor: AnchorListOptions.getAnchors(editor),
					link: links,
				},
				optNode: Option.from(linkNode),
				flags: { titleEnabled: Settings.shouldShowLinkTitle(editor) },
			};
		});
	};
	const DialogInfo = { collect: collect };

	const handleSubmit = function(editor, info) {
		return function(api) {
			const data = api.getData();
			if (!data.url.value) {
				Utils.unlink(editor);
				api.close();
				return;
			}
			const getChangedValue = function(key) {
				return Option.from(data[key]).filter(function(value) {
					return !info.anchor[key].is(value);
				});
			};
			const changedData = {
				href: data.url.value,
				text: getChangedValue('text'),
				target: getChangedValue('target'),
				rel: getChangedValue('rel'),
				class: getChangedValue('linkClass'),
				title: getChangedValue('title'),
			};
			const attachState = {
				href: data.url.value,
				attach: data.url.meta !== undefined && data.url.meta.attach ? data.url.meta.attach : function() {
				},
			};
			DialogConfirms.preprocess(editor, changedData).get(function(pData) {
				Utils.link(editor, attachState, pData);
			});
			editor?.onLinkSubmit?.(changedData);
			api.close();
		};
	};
	const collectData = function(editor) {
		const anchorNode = Utils.getAnchorElement(editor);
		return DialogInfo.collect(editor, anchorNode);
	};
	const getInitialData = function(info, defaultTarget) {
		return {
			url: {
				value: info.anchor.url.getOr(''),
				meta: {
					attach: function() {
					},
					text: info.anchor.url.fold(function() {
						return '';
					}, function() {
						return info.anchor.text.getOr('');
					}),
					original: { value: info.anchor.url.getOr('') },
				},
			},
			text: info.anchor.text.getOr(''),
			title: info.anchor.title.getOr(''),
			anchor: info.anchor.url.getOr(''),
			link: info.anchor.url.getOr(''),
			rel: info.anchor.rel.getOr(''),
			target: info.anchor.target.or(defaultTarget).getOr(''),
			linkClass: info.anchor.linkClass.getOr(''),
		};
	};
	const makeDialog = function(settings, onSubmit, editor) {
		const urlInput = [{
			name: 'url',
			type: 'urlinput',
			filetype: 'file',
			label: 'URL',
		}];
		const displayText = settings.anchor.text.map(function() {
			return {
				name: 'text',
				type: 'input',
				label: 'Text to display',
			};
		}).toArray();
		const titleText = settings.flags.titleEnabled ? [{
			name: 'title',
			type: 'input',
			label: 'Title',
		}] : [];
		const defaultTarget = Option.from(Settings.getDefaultLinkTarget(editor));
		const initialData = getInitialData(settings, defaultTarget);
		const dialogDelta = DialogChanges.init(initialData, settings);
		const catalogs = settings.catalogs;
		const body = {
			type: 'panel',
			items: flatten([
				urlInput,
				displayText,
				titleText,
				cat([
					catalogs.anchor.map(ListOptions.createUi('anchor', 'Anchors')),
					catalogs.rels.map(ListOptions.createUi('rel', 'Rel')),
					catalogs.targets.map(ListOptions.createUi('target', 'Open link in...')),
					catalogs.link.map(ListOptions.createUi('link', 'Link list')),
					catalogs.classes.map(ListOptions.createUi('linkClass', 'Class')),
				]),
			]),
		};
		return {
			title: 'Insert/Edit Link',
			size: 'normal',
			body: body,
			buttons: [
				{
					type: 'cancel',
					name: 'cancel',
					text: 'Cancel',
				},
				{
					type: 'submit',
					name: 'save',
					text: 'Save',
					primary: true,
				},
			],
			initialData: initialData,
			onChange: function(api, _a) {
				const name = _a.name;
				dialogDelta.onChange(api.getData, { name: name }).each(function(newData) {
					api.setData(newData);
				});
			},
			onSubmit: onSubmit,
		};
	};
	const open$1 = function(editor) {
		const data = collectData(editor);
		data.map(function(info) {
			const onSubmit = handleSubmit(editor, info);
			return makeDialog(info, onSubmit, editor);
		}).get(function(spec) {
			editor.windowManager.open(spec);
		});
	};
	const Dialog = { open: open$1 };

	const getLink = function(editor, elm) {
		return editor.dom.getParent(elm, 'a[href]');
	};
	const getSelectedLink = function(editor) {
		return getLink(editor, editor.selection.getStart());
	};
	const hasOnlyAltModifier = function(e) {
		return e.altKey === true && e.shiftKey === false && e.ctrlKey === false && e.metaKey === false;
	};
	const gotoLink = function(editor, a) {
		if (a) {
			const href = Utils.getHref(a);
			if (/^#/.test(href)) {
				const targetEl = editor.$(href);
				if (targetEl.length) {
					editor.selection.scrollIntoView(targetEl[0], true);
				}
			} else {
				OpenUrl.open(a.href);
			}
		}
	};
	const openDialog = function(editor) {
		return function() {
			Dialog.open(editor);
		};
	};
	const gotoSelectedLink = function(editor) {
		return function() {
			gotoLink(editor, getSelectedLink(editor));
		};
	};
	const leftClickedOnAHref = function(editor) {
		return function(elm) {
			let sel, rng, node;
			if (Settings.hasContextToolbar(editor) && Utils.isLink(elm)) {
				sel = editor.selection;
				rng = sel.getRng();
				node = rng.startContainer;
				if (node.nodeType === 3 && sel.isCollapsed() && rng.startOffset > 0 && rng.startOffset < node.data.length) {
					return true;
				}
			}
			return false;
		};
	};
	const setupGotoLinks = function(editor) {
		editor.on('click', function(e) {
			const link = getLink(editor, e.target);
			if (link && global$2.metaKeyPressed(e)) {
				e.preventDefault();
				gotoLink(editor, link);
			}
		});
		editor.on('keydown', function(e) {
			const link = getSelectedLink(editor);
			if (link && e.keyCode === 13 && hasOnlyAltModifier(e)) {
				e.preventDefault();
				gotoLink(editor, link);
			}
		});
	};
	const toggleActiveState = function(editor) {
		return function(api) {
			const nodeChangeHandler = function(e) {
				return api.setActive(!editor.readonly && !!Utils.getAnchorElement(editor, e.element));
			};
			editor.on('NodeChange', nodeChangeHandler);
			return function() {
				return editor.off('NodeChange', nodeChangeHandler);
			};
		};
	};
	const toggleEnabledState = function(editor) {
		return function(api) {
			api.setDisabled(!Utils.hasLinks(editor.dom.getParents(editor.selection.getStart())));
			const nodeChangeHandler = function(e) {
				return api.setDisabled(!Utils.hasLinks(e.parents));
			};
			editor.on('NodeChange', nodeChangeHandler);
			return function() {
				return editor.off('NodeChange', nodeChangeHandler);
			};
		};
	};
	const Actions = {
		openDialog: openDialog,
		gotoSelectedLink: gotoSelectedLink,
		leftClickedOnAHref: leftClickedOnAHref,
		setupGotoLinks: setupGotoLinks,
		toggleActiveState: toggleActiveState,
		toggleEnabledState: toggleEnabledState,
	};

	const register = function(editor) {
		editor.addCommand('mceLink', function() {
			if (Settings.useQuickLink(editor)) {
				editor.fire('contexttoolbar-show', { toolbarKey: 'quicklink' });
			} else {
				Actions.openDialog(editor)();
			}
		});
	};
	const Commands = { register: register };

	const setup = function(editor) {
		editor.addShortcut('Meta+K', '', function() {
			editor.execCommand('mceLink');
		});
	};
	const Keyboard = { setup: setup };

	const setupButtons = function(editor) {
		editor.ui.registry.addToggleButton('link', {
			icon: 'link',
			tooltip: 'Insert/edit link',
			onAction: Actions.openDialog(editor),
			onSetup: Actions.toggleActiveState(editor),
		});
		editor.ui.registry.addButton('openlink', {
			icon: 'new-tab',
			tooltip: 'Open link',
			onAction: Actions.gotoSelectedLink(editor),
			onSetup: Actions.toggleEnabledState(editor),
		});
		editor.ui.registry.addButton('unlink', {
			icon: 'unlink',
			tooltip: 'Remove link',
			onAction: function() {
				return Utils.unlink(editor);
			},
			onSetup: Actions.toggleEnabledState(editor),
		});
	};
	const setupMenuItems = function(editor) {
		editor.ui.registry.addMenuItem('openlink', {
			text: 'Open link',
			icon: 'new-tab',
			onAction: Actions.gotoSelectedLink(editor),
			onSetup: Actions.toggleEnabledState(editor),
		});
		editor.ui.registry.addMenuItem('link', {
			icon: 'link',
			text: 'Link...',
			shortcut: 'Meta+K',
			onAction: Actions.openDialog(editor),
		});
		editor.ui.registry.addMenuItem('unlink', {
			icon: 'unlink',
			text: 'Remove link',
			onAction: function() {
				return Utils.unlink(editor);
			},
			onSetup: Actions.toggleEnabledState(editor),
		});
	};
	const setupContextMenu = function(editor) {
		const inLink = 'link unlink openlink';
		const noLink = 'link';
		editor.ui.registry.addContextMenu('link', {
			update: function(element) {
				return Utils.hasLinks(editor.dom.getParents(element, 'a')) ? inLink : noLink;
			},
		});
	};
	const setupContextToolbars = function(editor) {
		const collapseSelectionToEnd = function(editor) {
			editor.selection.collapse(false);
		};
		const onSetupLink = function(buttonApi) {
			const node = editor.selection.getNode();
			buttonApi.setDisabled(!Utils.getAnchorElement(editor, node));
			return function() {
			};
		};
		editor.ui.registry.addContextForm('quicklink', {
			launch: {
				type: 'contextformtogglebutton',
				icon: 'link',
				tooltip: 'Link',
				onSetup: Actions.toggleActiveState(editor),
			},
			label: 'Link',
			predicate: function(node) {
				return !!Utils.getAnchorElement(editor, node) && Settings.hasContextToolbar(editor);
			},
			initValue: function() {
				const elm = Utils.getAnchorElement(editor);
				return elm ? Utils.getHref(elm) : '';
			},
			commands: [
				{
					type: 'contextformtogglebutton',
					icon: 'link',
					tooltip: 'Link',
					primary: true,
					onSetup: function(buttonApi) {
						const node = editor.selection.getNode();
						buttonApi.setActive(!!Utils.getAnchorElement(editor, node));
						return Actions.toggleActiveState(editor)(buttonApi);
					},
					onAction: function(formApi) {
						const anchor = Utils.getAnchorElement(editor);
						const value = formApi.getValue();
						if (!anchor) {
							const attachState = {
								href: value,
								attach: function() {
								},
							};
							const onlyText = Utils.isOnlyTextSelected(editor.selection.getContent());
							const text = onlyText ? Option.some(Utils.getAnchorText(editor.selection, anchor)).filter(function(t) {
								return t.length > 0;
							}).or(Option.from(value)) : Option.none();
							Utils.link(editor, attachState, {
								href: value,
								text: text,
								title: Option.none(),
								rel: Option.none(),
								target: Option.none(),
								class: Option.none(),
							});
							formApi.hide();
						} else {
							editor.dom.setAttrib(anchor, 'href', value);
							collapseSelectionToEnd(editor);
							formApi.hide();
						}
					},
				},
				{
					type: 'contextformbutton',
					icon: 'unlink',
					tooltip: 'Remove link',
					onSetup: onSetupLink,
					onAction: function(formApi) {
						Utils.unlink(editor);
						formApi.hide();
					},
				},
				{
					type: 'contextformbutton',
					icon: 'new-tab',
					tooltip: 'Open link',
					onSetup: onSetupLink,
					onAction: function(formApi) {
						Actions.gotoSelectedLink(editor)();
						formApi.hide();
					},
				},
			],
		});
	};
	const Controls = {
		setupButtons: setupButtons,
		setupMenuItems: setupMenuItems,
		setupContextMenu: setupContextMenu,
		setupContextToolbars: setupContextToolbars,
	};

	function Plugin() {
		global$1.add('link', function(editor) {
			Controls.setupButtons(editor);
			Controls.setupMenuItems(editor);
			Controls.setupContextMenu(editor);
			Controls.setupContextToolbars(editor);
			Actions.setupGotoLinks(editor);
			Commands.register(editor);
			Keyboard.setup(editor);
		});
	}

	Plugin();

}(window));
