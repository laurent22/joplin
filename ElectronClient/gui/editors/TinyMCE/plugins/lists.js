(function (PluginManager, domGlobals, RangeUtils, TreeWalker, VK, DomQuery, Tools, DOMUtils, BookmarkManager) {
    'use strict';

    PluginManager = PluginManager && Object.prototype.hasOwnProperty.call(PluginManager, 'default') ? PluginManager['default'] : PluginManager;
    RangeUtils = RangeUtils && Object.prototype.hasOwnProperty.call(RangeUtils, 'default') ? RangeUtils['default'] : RangeUtils;
    TreeWalker = TreeWalker && Object.prototype.hasOwnProperty.call(TreeWalker, 'default') ? TreeWalker['default'] : TreeWalker;
    VK = VK && Object.prototype.hasOwnProperty.call(VK, 'default') ? VK['default'] : VK;
    DomQuery = DomQuery && Object.prototype.hasOwnProperty.call(DomQuery, 'default') ? DomQuery['default'] : DomQuery;
    Tools = Tools && Object.prototype.hasOwnProperty.call(Tools, 'default') ? Tools['default'] : Tools;
    DOMUtils = DOMUtils && Object.prototype.hasOwnProperty.call(DOMUtils, 'default') ? DOMUtils['default'] : DOMUtils;
    BookmarkManager = BookmarkManager && Object.prototype.hasOwnProperty.call(BookmarkManager, 'default') ? BookmarkManager['default'] : BookmarkManager;

    var noop = function () {
    };
    var constant = function (value) {
      return function () {
        return value;
      };
    };
    var not = function (f) {
      return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return !f.apply(null, args);
      };
    };
    var never = constant(false);
    var always = constant(true);

    var none = function () {
      return NONE;
    };
    var NONE = function () {
      var eq = function (o) {
        return o.isNone();
      };
      var call = function (thunk) {
        return thunk();
      };
      var id = function (n) {
        return n;
      };
      var me = {
        fold: function (n, s) {
          return n();
        },
        is: never,
        isSome: never,
        isNone: always,
        getOr: id,
        getOrThunk: call,
        getOrDie: function (msg) {
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
        toArray: function () {
          return [];
        },
        toString: constant('none()')
      };
      if (Object.freeze) {
        Object.freeze(me);
      }
      return me;
    }();
    var some = function (a) {
      var constant_a = constant(a);
      var self = function () {
        return me;
      };
      var bind = function (f) {
        return f(a);
      };
      var me = {
        fold: function (n, s) {
          return s(a);
        },
        is: function (v) {
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
        map: function (f) {
          return some(f(a));
        },
        each: function (f) {
          f(a);
        },
        bind: bind,
        exists: bind,
        forall: bind,
        filter: function (f) {
          return f(a) ? me : NONE;
        },
        toArray: function () {
          return [a];
        },
        toString: function () {
          return 'some(' + a + ')';
        },
        equals: function (o) {
          return o.is(a);
        },
        equals_: function (o, elementEq) {
          return o.fold(never, function (b) {
            return elementEq(a, b);
          });
        }
      };
      return me;
    };
    var from = function (value) {
      return value === null || value === undefined ? NONE : some(value);
    };
    var Option = {
      some: some,
      none: none,
      from: from
    };

    var typeOf = function (x) {
      if (x === null) {
        return 'null';
      }
      var t = typeof x;
      if (t === 'object' && (Array.prototype.isPrototypeOf(x) || x.constructor && x.constructor.name === 'Array')) {
        return 'array';
      }
      if (t === 'object' && (String.prototype.isPrototypeOf(x) || x.constructor && x.constructor.name === 'String')) {
        return 'string';
      }
      return t;
    };
    var isType = function (type) {
      return function (value) {
        return typeOf(value) === type;
      };
    };
    var isString = isType('string');
    var isArray = isType('array');
    var isBoolean = isType('boolean');
    var isFunction = isType('function');
    var isNumber = isType('number');

    var nativeSlice = Array.prototype.slice;
    var nativePush = Array.prototype.push;
    var map = function (xs, f) {
      var len = xs.length;
      var r = new Array(len);
      for (var i = 0; i < len; i++) {
        var x = xs[i];
        r[i] = f(x, i);
      }
      return r;
    };
    var each = function (xs, f) {
      for (var i = 0, len = xs.length; i < len; i++) {
        var x = xs[i];
        f(x, i);
      }
    };
    var filter = function (xs, pred) {
      var r = [];
      for (var i = 0, len = xs.length; i < len; i++) {
        var x = xs[i];
        if (pred(x, i)) {
          r.push(x);
        }
      }
      return r;
    };
    var groupBy = function (xs, f) {
      if (xs.length === 0) {
        return [];
      } else {
        var wasType = f(xs[0]);
        var r = [];
        var group = [];
        for (var i = 0, len = xs.length; i < len; i++) {
          var x = xs[i];
          var type = f(x);
          if (type !== wasType) {
            r.push(group);
            group = [];
          }
          wasType = type;
          group.push(x);
        }
        if (group.length !== 0) {
          r.push(group);
        }
        return r;
      }
    };
    var foldl = function (xs, f, acc) {
      each(xs, function (x) {
        acc = f(acc, x);
      });
      return acc;
    };
    var find = function (xs, pred) {
      for (var i = 0, len = xs.length; i < len; i++) {
        var x = xs[i];
        if (pred(x, i)) {
          return Option.some(x);
        }
      }
      return Option.none();
    };
    var flatten = function (xs) {
      var r = [];
      for (var i = 0, len = xs.length; i < len; ++i) {
        if (!isArray(xs[i])) {
          throw new Error('Arr.flatten item ' + i + ' was not an array, input: ' + xs);
        }
        nativePush.apply(r, xs[i]);
      }
      return r;
    };
    var bind = function (xs, f) {
      return flatten(map(xs, f));
    };
    var reverse = function (xs) {
      var r = nativeSlice.call(xs, 0);
      r.reverse();
      return r;
    };
    var head = function (xs) {
      return xs.length === 0 ? Option.none() : Option.some(xs[0]);
    };
    var last = function (xs) {
      return xs.length === 0 ? Option.none() : Option.some(xs[xs.length - 1]);
    };
    var from$1 = isFunction(Array.from) ? Array.from : function (x) {
      return nativeSlice.call(x);
    };

    var compareDocumentPosition = function (a, b, match) {
      return (a.compareDocumentPosition(b) & match) !== 0;
    };
    var documentPositionPreceding = function (a, b) {
      return compareDocumentPosition(a, b, domGlobals.Node.DOCUMENT_POSITION_PRECEDING);
    };
    var documentPositionContainedBy = function (a, b) {
      return compareDocumentPosition(a, b, domGlobals.Node.DOCUMENT_POSITION_CONTAINED_BY);
    };
    var Node = {
      documentPositionPreceding: documentPositionPreceding,
      documentPositionContainedBy: documentPositionContainedBy
    };

    var __assign = function () {
      __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p))
              t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };

    var Cell = function (initial) {
      var value = initial;
      var get = function () {
        return value;
      };
      var set = function (v) {
        value = v;
      };
      var clone = function () {
        return Cell(get());
      };
      return {
        get: get,
        set: set,
        clone: clone
      };
    };

    var firstMatch = function (regexes, s) {
      for (var i = 0; i < regexes.length; i++) {
        var x = regexes[i];
        if (x.test(s)) {
          return x;
        }
      }
      return undefined;
    };
    var find$1 = function (regexes, agent) {
      var r = firstMatch(regexes, agent);
      if (!r) {
        return {
          major: 0,
          minor: 0
        };
      }
      var group = function (i) {
        return Number(agent.replace(r, '$' + i));
      };
      return nu(group(1), group(2));
    };
    var detect = function (versionRegexes, agent) {
      var cleanedAgent = String(agent).toLowerCase();
      if (versionRegexes.length === 0) {
        return unknown();
      }
      return find$1(versionRegexes, cleanedAgent);
    };
    var unknown = function () {
      return nu(0, 0);
    };
    var nu = function (major, minor) {
      return {
        major: major,
        minor: minor
      };
    };
    var Version = {
      nu: nu,
      detect: detect,
      unknown: unknown
    };

    var edge = 'Edge';
    var chrome = 'Chrome';
    var ie = 'IE';
    var opera = 'Opera';
    var firefox = 'Firefox';
    var safari = 'Safari';
    var isBrowser = function (name, current) {
      return function () {
        return current === name;
      };
    };
    var unknown$1 = function () {
      return nu$1({
        current: undefined,
        version: Version.unknown()
      });
    };
    var nu$1 = function (info) {
      var current = info.current;
      var version = info.version;
      return {
        current: current,
        version: version,
        isEdge: isBrowser(edge, current),
        isChrome: isBrowser(chrome, current),
        isIE: isBrowser(ie, current),
        isOpera: isBrowser(opera, current),
        isFirefox: isBrowser(firefox, current),
        isSafari: isBrowser(safari, current)
      };
    };
    var Browser = {
      unknown: unknown$1,
      nu: nu$1,
      edge: constant(edge),
      chrome: constant(chrome),
      ie: constant(ie),
      opera: constant(opera),
      firefox: constant(firefox),
      safari: constant(safari)
    };

    var windows = 'Windows';
    var ios = 'iOS';
    var android = 'Android';
    var linux = 'Linux';
    var osx = 'OSX';
    var solaris = 'Solaris';
    var freebsd = 'FreeBSD';
    var chromeos = 'ChromeOS';
    var isOS = function (name, current) {
      return function () {
        return current === name;
      };
    };
    var unknown$2 = function () {
      return nu$2({
        current: undefined,
        version: Version.unknown()
      });
    };
    var nu$2 = function (info) {
      var current = info.current;
      var version = info.version;
      return {
        current: current,
        version: version,
        isWindows: isOS(windows, current),
        isiOS: isOS(ios, current),
        isAndroid: isOS(android, current),
        isOSX: isOS(osx, current),
        isLinux: isOS(linux, current),
        isSolaris: isOS(solaris, current),
        isFreeBSD: isOS(freebsd, current),
        isChromeOS: isOS(chromeos, current)
      };
    };
    var OperatingSystem = {
      unknown: unknown$2,
      nu: nu$2,
      windows: constant(windows),
      ios: constant(ios),
      android: constant(android),
      linux: constant(linux),
      osx: constant(osx),
      solaris: constant(solaris),
      freebsd: constant(freebsd),
      chromeos: constant(chromeos)
    };

    var DeviceType = function (os, browser, userAgent, mediaMatch) {
      var isiPad = os.isiOS() && /ipad/i.test(userAgent) === true;
      var isiPhone = os.isiOS() && !isiPad;
      var isMobile = os.isiOS() || os.isAndroid();
      var isTouch = isMobile || mediaMatch('(pointer:coarse)');
      var isTablet = isiPad || !isiPhone && isMobile && mediaMatch('(min-device-width:768px)');
      var isPhone = isiPhone || isMobile && !isTablet;
      var iOSwebview = browser.isSafari() && os.isiOS() && /safari/i.test(userAgent) === false;
      var isDesktop = !isPhone && !isTablet && !iOSwebview;
      return {
        isiPad: constant(isiPad),
        isiPhone: constant(isiPhone),
        isTablet: constant(isTablet),
        isPhone: constant(isPhone),
        isTouch: constant(isTouch),
        isAndroid: os.isAndroid,
        isiOS: os.isiOS,
        isWebView: constant(iOSwebview),
        isDesktop: constant(isDesktop)
      };
    };

    var detect$1 = function (candidates, userAgent) {
      var agent = String(userAgent).toLowerCase();
      return find(candidates, function (candidate) {
        return candidate.search(agent);
      });
    };
    var detectBrowser = function (browsers, userAgent) {
      return detect$1(browsers, userAgent).map(function (browser) {
        var version = Version.detect(browser.versionRegexes, userAgent);
        return {
          current: browser.name,
          version: version
        };
      });
    };
    var detectOs = function (oses, userAgent) {
      return detect$1(oses, userAgent).map(function (os) {
        var version = Version.detect(os.versionRegexes, userAgent);
        return {
          current: os.name,
          version: version
        };
      });
    };
    var UaString = {
      detectBrowser: detectBrowser,
      detectOs: detectOs
    };

    var contains = function (str, substr) {
      return str.indexOf(substr) !== -1;
    };

    var normalVersionRegex = /.*?version\/\ ?([0-9]+)\.([0-9]+).*/;
    var checkContains = function (target) {
      return function (uastring) {
        return contains(uastring, target);
      };
    };
    var browsers = [
      {
        name: 'Edge',
        versionRegexes: [/.*?edge\/ ?([0-9]+)\.([0-9]+)$/],
        search: function (uastring) {
          return contains(uastring, 'edge/') && contains(uastring, 'chrome') && contains(uastring, 'safari') && contains(uastring, 'applewebkit');
        }
      },
      {
        name: 'Chrome',
        versionRegexes: [
          /.*?chrome\/([0-9]+)\.([0-9]+).*/,
          normalVersionRegex
        ],
        search: function (uastring) {
          return contains(uastring, 'chrome') && !contains(uastring, 'chromeframe');
        }
      },
      {
        name: 'IE',
        versionRegexes: [
          /.*?msie\ ?([0-9]+)\.([0-9]+).*/,
          /.*?rv:([0-9]+)\.([0-9]+).*/
        ],
        search: function (uastring) {
          return contains(uastring, 'msie') || contains(uastring, 'trident');
        }
      },
      {
        name: 'Opera',
        versionRegexes: [
          normalVersionRegex,
          /.*?opera\/([0-9]+)\.([0-9]+).*/
        ],
        search: checkContains('opera')
      },
      {
        name: 'Firefox',
        versionRegexes: [/.*?firefox\/\ ?([0-9]+)\.([0-9]+).*/],
        search: checkContains('firefox')
      },
      {
        name: 'Safari',
        versionRegexes: [
          normalVersionRegex,
          /.*?cpu os ([0-9]+)_([0-9]+).*/
        ],
        search: function (uastring) {
          return (contains(uastring, 'safari') || contains(uastring, 'mobile/')) && contains(uastring, 'applewebkit');
        }
      }
    ];
    var oses = [
      {
        name: 'Windows',
        search: checkContains('win'),
        versionRegexes: [/.*?windows\ nt\ ?([0-9]+)\.([0-9]+).*/]
      },
      {
        name: 'iOS',
        search: function (uastring) {
          return contains(uastring, 'iphone') || contains(uastring, 'ipad');
        },
        versionRegexes: [
          /.*?version\/\ ?([0-9]+)\.([0-9]+).*/,
          /.*cpu os ([0-9]+)_([0-9]+).*/,
          /.*cpu iphone os ([0-9]+)_([0-9]+).*/
        ]
      },
      {
        name: 'Android',
        search: checkContains('android'),
        versionRegexes: [/.*?android\ ?([0-9]+)\.([0-9]+).*/]
      },
      {
        name: 'OSX',
        search: checkContains('mac os x'),
        versionRegexes: [/.*?mac\ os\ x\ ?([0-9]+)_([0-9]+).*/]
      },
      {
        name: 'Linux',
        search: checkContains('linux'),
        versionRegexes: []
      },
      {
        name: 'Solaris',
        search: checkContains('sunos'),
        versionRegexes: []
      },
      {
        name: 'FreeBSD',
        search: checkContains('freebsd'),
        versionRegexes: []
      },
      {
        name: 'ChromeOS',
        search: checkContains('cros'),
        versionRegexes: [/.*?chrome\/([0-9]+)\.([0-9]+).*/]
      }
    ];
    var PlatformInfo = {
      browsers: constant(browsers),
      oses: constant(oses)
    };

    var detect$2 = function (userAgent, mediaMatch) {
      var browsers = PlatformInfo.browsers();
      var oses = PlatformInfo.oses();
      var browser = UaString.detectBrowser(browsers, userAgent).fold(Browser.unknown, Browser.nu);
      var os = UaString.detectOs(oses, userAgent).fold(OperatingSystem.unknown, OperatingSystem.nu);
      var deviceType = DeviceType(os, browser, userAgent, mediaMatch);
      return {
        browser: browser,
        os: os,
        deviceType: deviceType
      };
    };
    var PlatformDetection = { detect: detect$2 };

    var mediaMatch = function (query) {
      return domGlobals.window.matchMedia(query).matches;
    };
    var platform = Cell(PlatformDetection.detect(domGlobals.navigator.userAgent, mediaMatch));
    var detect$3 = function () {
      return platform.get();
    };

    var fromHtml = function (html, scope) {
      var doc = scope || domGlobals.document;
      var div = doc.createElement('div');
      div.innerHTML = html;
      if (!div.hasChildNodes() || div.childNodes.length > 1) {
        domGlobals.console.error('HTML does not have a single root node', html);
        throw new Error('HTML must have a single root node');
      }
      return fromDom(div.childNodes[0]);
    };
    var fromTag = function (tag, scope) {
      var doc = scope || domGlobals.document;
      var node = doc.createElement(tag);
      return fromDom(node);
    };
    var fromText = function (text, scope) {
      var doc = scope || domGlobals.document;
      var node = doc.createTextNode(text);
      return fromDom(node);
    };
    var fromDom = function (node) {
      if (node === null || node === undefined) {
        throw new Error('Node cannot be null or undefined');
      }
      return { dom: constant(node) };
    };
    var fromPoint = function (docElm, x, y) {
      var doc = docElm.dom();
      return Option.from(doc.elementFromPoint(x, y)).map(fromDom);
    };
    var Element = {
      fromHtml: fromHtml,
      fromTag: fromTag,
      fromText: fromText,
      fromDom: fromDom,
      fromPoint: fromPoint
    };

    var ATTRIBUTE = domGlobals.Node.ATTRIBUTE_NODE;
    var CDATA_SECTION = domGlobals.Node.CDATA_SECTION_NODE;
    var COMMENT = domGlobals.Node.COMMENT_NODE;
    var DOCUMENT = domGlobals.Node.DOCUMENT_NODE;
    var DOCUMENT_TYPE = domGlobals.Node.DOCUMENT_TYPE_NODE;
    var DOCUMENT_FRAGMENT = domGlobals.Node.DOCUMENT_FRAGMENT_NODE;
    var ELEMENT = domGlobals.Node.ELEMENT_NODE;
    var TEXT = domGlobals.Node.TEXT_NODE;
    var PROCESSING_INSTRUCTION = domGlobals.Node.PROCESSING_INSTRUCTION_NODE;
    var ENTITY_REFERENCE = domGlobals.Node.ENTITY_REFERENCE_NODE;
    var ENTITY = domGlobals.Node.ENTITY_NODE;
    var NOTATION = domGlobals.Node.NOTATION_NODE;

    var ELEMENT$1 = ELEMENT;
    var is = function (element, selector) {
      var dom = element.dom();
      if (dom.nodeType !== ELEMENT$1) {
        return false;
      } else {
        var elem = dom;
        if (elem.matches !== undefined) {
          return elem.matches(selector);
        } else if (elem.msMatchesSelector !== undefined) {
          return elem.msMatchesSelector(selector);
        } else if (elem.webkitMatchesSelector !== undefined) {
          return elem.webkitMatchesSelector(selector);
        } else if (elem.mozMatchesSelector !== undefined) {
          return elem.mozMatchesSelector(selector);
        } else {
          throw new Error('Browser lacks native selectors');
        }
      }
    };

    var eq = function (e1, e2) {
      return e1.dom() === e2.dom();
    };
    var regularContains = function (e1, e2) {
      var d1 = e1.dom();
      var d2 = e2.dom();
      return d1 === d2 ? false : d1.contains(d2);
    };
    var ieContains = function (e1, e2) {
      return Node.documentPositionContainedBy(e1.dom(), e2.dom());
    };
    var browser = detect$3().browser;
    var contains$1 = browser.isIE() ? ieContains : regularContains;
    var is$1 = is;

    var lift2 = function (oa, ob, f) {
      return oa.isSome() && ob.isSome() ? Option.some(f(oa.getOrDie(), ob.getOrDie())) : Option.none();
    };

    var fromElements = function (elements, scope) {
      var doc = scope || domGlobals.document;
      var fragment = doc.createDocumentFragment();
      each(elements, function (element) {
        fragment.appendChild(element.dom());
      });
      return Element.fromDom(fragment);
    };

    var Immutable = function () {
      var fields = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        fields[_i] = arguments[_i];
      }
      return function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          values[_i] = arguments[_i];
        }
        if (fields.length !== values.length) {
          throw new Error('Wrong number of arguments to struct. Expected "[' + fields.length + ']", got ' + values.length + ' arguments');
        }
        var struct = {};
        each(fields, function (name, i) {
          struct[name] = constant(values[i]);
        });
        return struct;
      };
    };

    var keys = Object.keys;
    var each$1 = function (obj, f) {
      var props = keys(obj);
      for (var k = 0, len = props.length; k < len; k++) {
        var i = props[k];
        var x = obj[i];
        f(x, i);
      }
    };

    var parent = function (element) {
      return Option.from(element.dom().parentNode).map(Element.fromDom);
    };
    var children = function (element) {
      return map(element.dom().childNodes, Element.fromDom);
    };
    var child = function (element, index) {
      var cs = element.dom().childNodes;
      return Option.from(cs[index]).map(Element.fromDom);
    };
    var firstChild = function (element) {
      return child(element, 0);
    };
    var lastChild = function (element) {
      return child(element, element.dom().childNodes.length - 1);
    };
    var spot = Immutable('element', 'offset');

    var before = function (marker, element) {
      var parent$1 = parent(marker);
      parent$1.each(function (v) {
        v.dom().insertBefore(element.dom(), marker.dom());
      });
    };
    var append = function (parent, element) {
      parent.dom().appendChild(element.dom());
    };

    var before$1 = function (marker, elements) {
      each(elements, function (x) {
        before(marker, x);
      });
    };
    var append$1 = function (parent, elements) {
      each(elements, function (x) {
        append(parent, x);
      });
    };

    var remove = function (element) {
      var dom = element.dom();
      if (dom.parentNode !== null) {
        dom.parentNode.removeChild(dom);
      }
    };

    var fireListEvent = function (editor, action, element) {
      return editor.fire('ListMutation', {
        action: action,
        element: element
      });
    };

    var Global = typeof domGlobals.window !== 'undefined' ? domGlobals.window : Function('return this;')();

    var isTextNode = function (node) {
      return node && node.nodeType === 3;
    };
    var isListNode = function (node) {
      return node && /^(OL|UL|DL)$/.test(node.nodeName);
    };
    var isOlUlNode = function (node) {
      return node && /^(OL|UL)$/.test(node.nodeName);
    };
    var isListItemNode = function (node) {
      return node && /^(LI|DT|DD)$/.test(node.nodeName);
    };
    var isDlItemNode = function (node) {
      return node && /^(DT|DD)$/.test(node.nodeName);
    };
    var isTableCellNode = function (node) {
      return node && /^(TH|TD)$/.test(node.nodeName);
    };
    var isBr = function (node) {
      return node && node.nodeName === 'BR';
    };
    var isFirstChild = function (node) {
      return node.parentNode.firstChild === node;
    };
    var isTextBlock = function (editor, node) {
      return node && !!editor.schema.getTextBlockElements()[node.nodeName];
    };
    var isBlock = function (node, blockElements) {
      return node && node.nodeName in blockElements;
    };
    var isBogusBr = function (dom, node) {
      if (!isBr(node)) {
        return false;
      }
      if (dom.isBlock(node.nextSibling) && !isBr(node.previousSibling)) {
        return true;
      }
      return false;
    };
    var isEmpty = function (dom, elm, keepBookmarks) {
      var empty = dom.isEmpty(elm);
      if (keepBookmarks && dom.select('span[data-mce-type=bookmark]', elm).length > 0) {
        return false;
      }
      return empty;
    };
    var isChildOfBody = function (dom, elm) {
      return dom.isChildOf(elm, dom.getRoot());
    };

    var getParentList = function (editor) {
      var selectionStart = editor.selection.getStart(true);
      return editor.dom.getParent(selectionStart, 'OL,UL,DL', getClosestListRootElm(editor, selectionStart));
    };
    var isParentListSelected = function (parentList, selectedBlocks) {
      return parentList && selectedBlocks.length === 1 && selectedBlocks[0] === parentList;
    };
    var findSubLists = function (parentList) {
      return Tools.grep(parentList.querySelectorAll('ol,ul,dl'), function (elm) {
        return isListNode(elm);
      });
    };
    var getSelectedSubLists = function (editor) {
      var parentList = getParentList(editor);
      var selectedBlocks = editor.selection.getSelectedBlocks();
      if (isParentListSelected(parentList, selectedBlocks)) {
        return findSubLists(parentList);
      } else {
        return Tools.grep(selectedBlocks, function (elm) {
          return isListNode(elm) && parentList !== elm;
        });
      }
    };
    var findParentListItemsNodes = function (editor, elms) {
      var listItemsElms = Tools.map(elms, function (elm) {
        var parentLi = editor.dom.getParent(elm, 'li,dd,dt', getClosestListRootElm(editor, elm));
        return parentLi ? parentLi : elm;
      });
      return DomQuery.unique(listItemsElms);
    };
    var getSelectedListItems = function (editor) {
      var selectedBlocks = editor.selection.getSelectedBlocks();
      return Tools.grep(findParentListItemsNodes(editor, selectedBlocks), function (block) {
        return isListItemNode(block);
      });
    };
    var getSelectedDlItems = function (editor) {
      return filter(getSelectedListItems(editor), isDlItemNode);
    };
    var getClosestListRootElm = function (editor, elm) {
      var parentTableCell = editor.dom.getParents(elm, 'TD,TH');
      var root = parentTableCell.length > 0 ? parentTableCell[0] : editor.getBody();
      return root;
    };
    var findLastParentListNode = function (editor, elm) {
      var parentLists = editor.dom.getParents(elm, 'ol,ul', getClosestListRootElm(editor, elm));
      return last(parentLists);
    };
    var getSelectedLists = function (editor) {
      var firstList = findLastParentListNode(editor, editor.selection.getStart());
      var subsequentLists = filter(editor.selection.getSelectedBlocks(), isOlUlNode);
      return firstList.toArray().concat(subsequentLists);
    };
    var getSelectedListRoots = function (editor) {
      var selectedLists = getSelectedLists(editor);
      return getUniqueListRoots(editor, selectedLists);
    };
    var getUniqueListRoots = function (editor, lists) {
      var listRoots = map(lists, function (list) {
        return findLastParentListNode(editor, list).getOr(list);
      });
      return DomQuery.unique(listRoots);
    };

    var shouldIndentOnTab = function (editor) {
      return editor.getParam('lists_indent_on_tab', true);
    };
    var getForcedRootBlock = function (editor) {
      var block = editor.getParam('forced_root_block', 'p');
      if (block === false) {
        return '';
      } else if (block === true) {
        return 'p';
      } else {
        return block;
      }
    };
    var getForcedRootBlockAttrs = function (editor) {
      return editor.getParam('forced_root_block_attrs', {});
    };

    var createTextBlock = function (editor, contentNode) {
      var dom = editor.dom;
      var blockElements = editor.schema.getBlockElements();
      var fragment = dom.createFragment();
      var blockName = getForcedRootBlock(editor);
      var node, textBlock, hasContentNode;
      if (blockName) {
        textBlock = dom.create(blockName);
        if (textBlock.tagName === blockName.toUpperCase()) {
          dom.setAttribs(textBlock, getForcedRootBlockAttrs(editor));
        }
        if (!isBlock(contentNode.firstChild, blockElements)) {
          fragment.appendChild(textBlock);
        }
      }
      if (contentNode) {
        while (node = contentNode.firstChild) {
          var nodeName = node.nodeName;
          if (!hasContentNode && (nodeName !== 'SPAN' || node.getAttribute('data-mce-type') !== 'bookmark')) {
            hasContentNode = true;
          }
          if (isBlock(node, blockElements)) {
            fragment.appendChild(node);
            textBlock = null;
          } else {
            if (blockName) {
              if (!textBlock) {
                textBlock = dom.create(blockName);
                fragment.appendChild(textBlock);
              }
              textBlock.appendChild(node);
            } else {
              fragment.appendChild(node);
            }
          }
        }
      }
      if (!blockName) {
        fragment.appendChild(dom.create('br'));
      } else {
        if (!hasContentNode) {
          textBlock.appendChild(dom.create('br', { 'data-mce-bogus': '1' }));
        }
      }
      return fragment;
    };

    var name = function (element) {
      var r = element.dom().nodeName;
      return r.toLowerCase();
    };
    var type = function (element) {
      return element.dom().nodeType;
    };
    var isType$1 = function (t) {
      return function (element) {
        return type(element) === t;
      };
    };
    var isElement = isType$1(ELEMENT);

    var rawSet = function (dom, key, value) {
      if (isString(value) || isBoolean(value) || isNumber(value)) {
        dom.setAttribute(key, value + '');
      } else {
        domGlobals.console.error('Invalid call to Attr.set. Key ', key, ':: Value ', value, ':: Element ', dom);
        throw new Error('Attribute value was not simple');
      }
    };
    var setAll = function (element, attrs) {
      var dom = element.dom();
      each$1(attrs, function (v, k) {
        rawSet(dom, k, v);
      });
    };
    var clone = function (element) {
      return foldl(element.dom().attributes, function (acc, attr) {
        acc[attr.name] = attr.value;
        return acc;
      }, {});
    };

    var isSupported = function (dom) {
      return dom.style !== undefined && isFunction(dom.style.getPropertyValue);
    };

    var internalSet = function (dom, property, value) {
      if (!isString(value)) {
        domGlobals.console.error('Invalid call to CSS.set. Property ', property, ':: Value ', value, ':: Element ', dom);
        throw new Error('CSS value must be a string: ' + value);
      }
      if (isSupported(dom)) {
        dom.style.setProperty(property, value);
      }
    };
    var set = function (element, property, value) {
      var dom = element.dom();
      internalSet(dom, property, value);
    };

    var clone$1 = function (original, isDeep) {
      return Element.fromDom(original.dom().cloneNode(isDeep));
    };
    var deep = function (original) {
      return clone$1(original, true);
    };
    var shallowAs = function (original, tag) {
      var nu = Element.fromTag(tag);
      var attributes = clone(original);
      setAll(nu, attributes);
      return nu;
    };
    var mutate = function (original, tag) {
      var nu = shallowAs(original, tag);
      before(original, nu);
      var children$1 = children(original);
      append$1(nu, children$1);
      remove(original);
      return nu;
    };

    var joinSegment = function (parent, child) {
      append(parent.item, child.list);
    };
    var joinSegments = function (segments) {
      for (var i = 1; i < segments.length; i++) {
        joinSegment(segments[i - 1], segments[i]);
      }
    };
    var appendSegments = function (head$1, tail) {
      lift2(last(head$1), head(tail), joinSegment);
    };
    var createSegment = function (scope, listType) {
      var segment = {
        list: Element.fromTag(listType, scope),
        item: Element.fromTag('li', scope)
      };
      append(segment.list, segment.item);
      return segment;
    };
    var createSegments = function (scope, entry, size) {
      var segments = [];
      for (var i = 0; i < size; i++) {
        segments.push(createSegment(scope, entry.listType));
      }
      return segments;
    };
    var populateSegments = function (segments, entry) {
      for (var i = 0; i < segments.length - 1; i++) {
        set(segments[i].item, 'list-style-type', 'none');
      }
      last(segments).each(function (segment) {
        setAll(segment.list, entry.listAttributes);
        setAll(segment.item, entry.itemAttributes);
        append$1(segment.item, entry.content);
      });
    };
    var normalizeSegment = function (segment, entry) {
      if (name(segment.list) !== entry.listType) {
        segment.list = mutate(segment.list, entry.listType);
      }
      setAll(segment.list, entry.listAttributes);
    };
    var createItem = function (scope, attr, content) {
      var item = Element.fromTag('li', scope);
      setAll(item, attr);
      append$1(item, content);
      return item;
    };
    var appendItem = function (segment, item) {
      append(segment.list, item);
      segment.item = item;
    };
    var writeShallow = function (scope, cast, entry) {
      var newCast = cast.slice(0, entry.depth);
      last(newCast).each(function (segment) {
        var item = createItem(scope, entry.itemAttributes, entry.content);
        appendItem(segment, item);
        normalizeSegment(segment, entry);
      });
      return newCast;
    };
    var writeDeep = function (scope, cast, entry) {
      var segments = createSegments(scope, entry, entry.depth - cast.length);
      joinSegments(segments);
      populateSegments(segments, entry);
      appendSegments(cast, segments);
      return cast.concat(segments);
    };
    var composeList = function (scope, entries) {
      var cast = foldl(entries, function (cast, entry) {
        return entry.depth > cast.length ? writeDeep(scope, cast, entry) : writeShallow(scope, cast, entry);
      }, []);
      return head(cast).map(function (segment) {
        return segment.list;
      });
    };

    var isList = function (el) {
      return is$1(el, 'OL,UL');
    };
    var hasFirstChildList = function (el) {
      return firstChild(el).map(isList).getOr(false);
    };
    var hasLastChildList = function (el) {
      return lastChild(el).map(isList).getOr(false);
    };

    var isIndented = function (entry) {
      return entry.depth > 0;
    };
    var isSelected = function (entry) {
      return entry.isSelected;
    };
    var cloneItemContent = function (li) {
      var children$1 = children(li);
      var content = hasLastChildList(li) ? children$1.slice(0, -1) : children$1;
      return map(content, deep);
    };
    var createEntry = function (li, depth, isSelected) {
      return parent(li).filter(isElement).map(function (list) {
        return {
          depth: depth,
          isSelected: isSelected,
          content: cloneItemContent(li),
          itemAttributes: clone(li),
          listAttributes: clone(list),
          listType: name(list)
        };
      });
    };

    var indentEntry = function (indentation, entry) {
      switch (indentation) {
      case 'Indent':
        entry.depth++;
        break;
      case 'Outdent':
        entry.depth--;
        break;
      case 'Flatten':
        entry.depth = 0;
      }
    };

    var cloneListProperties = function (target, source) {
      target.listType = source.listType;
      target.listAttributes = __assign({}, source.listAttributes);
    };
    var previousSiblingEntry = function (entries, start) {
      var depth = entries[start].depth;
      for (var i = start - 1; i >= 0; i--) {
        if (entries[i].depth === depth) {
          return Option.some(entries[i]);
        }
        if (entries[i].depth < depth) {
          break;
        }
      }
      return Option.none();
    };
    var normalizeEntries = function (entries) {
      each(entries, function (entry, i) {
        previousSiblingEntry(entries, i).each(function (matchingEntry) {
          cloneListProperties(entry, matchingEntry);
        });
      });
    };

    var parseItem = function (depth, itemSelection, selectionState, item) {
      return firstChild(item).filter(isList).fold(function () {
        itemSelection.each(function (selection) {
          if (eq(selection.start, item)) {
            selectionState.set(true);
          }
        });
        var currentItemEntry = createEntry(item, depth, selectionState.get());
        itemSelection.each(function (selection) {
          if (eq(selection.end, item)) {
            selectionState.set(false);
          }
        });
        var childListEntries = lastChild(item).filter(isList).map(function (list) {
          return parseList(depth, itemSelection, selectionState, list);
        }).getOr([]);
        return currentItemEntry.toArray().concat(childListEntries);
      }, function (list) {
        return parseList(depth, itemSelection, selectionState, list);
      });
    };
    var parseList = function (depth, itemSelection, selectionState, list) {
      return bind(children(list), function (element) {
        var parser = isList(element) ? parseList : parseItem;
        var newDepth = depth + 1;
        return parser(newDepth, itemSelection, selectionState, element);
      });
    };
    var parseLists = function (lists, itemSelection) {
      var selectionState = Cell(false);
      var initialDepth = 0;
      return map(lists, function (list) {
        return {
          sourceList: list,
          entries: parseList(initialDepth, itemSelection, selectionState, list)
        };
      });
    };

    var outdentedComposer = function (editor, entries) {
      return map(entries, function (entry) {
        var content = fromElements(entry.content);
        return Element.fromDom(createTextBlock(editor, content.dom()));
      });
    };
    var indentedComposer = function (editor, entries) {
      normalizeEntries(entries);
      return composeList(editor.contentDocument, entries).toArray();
    };
    var composeEntries = function (editor, entries) {
      return bind(groupBy(entries, isIndented), function (entries) {
        var groupIsIndented = head(entries).map(isIndented).getOr(false);
        return groupIsIndented ? indentedComposer(editor, entries) : outdentedComposer(editor, entries);
      });
    };
    var indentSelectedEntries = function (entries, indentation) {
      each(filter(entries, isSelected), function (entry) {
        return indentEntry(indentation, entry);
      });
    };
    var getItemSelection = function (editor) {
      var selectedListItems = map(getSelectedListItems(editor), Element.fromDom);
      return lift2(find(selectedListItems, not(hasFirstChildList)), find(reverse(selectedListItems), not(hasFirstChildList)), function (start, end) {
        return {
          start: start,
          end: end
        };
      });
    };
    var listIndentation = function (editor, lists, indentation) {
      var entrySets = parseLists(lists, getItemSelection(editor));
      each(entrySets, function (entrySet) {
        indentSelectedEntries(entrySet.entries, indentation);
        var composedLists = composeEntries(editor, entrySet.entries);
        each(composedLists, function (composedList) {
          fireListEvent(editor, indentation === 'Indent' ? 'IndentList' : 'OutdentList', composedList.dom());
        });
        before$1(entrySet.sourceList, composedLists);
        remove(entrySet.sourceList);
      });
    };

    var DOM = DOMUtils.DOM;
    var splitList = function (editor, ul, li) {
      var tmpRng, fragment, bookmarks, node, newBlock;
      var removeAndKeepBookmarks = function (targetNode) {
        Tools.each(bookmarks, function (node) {
          targetNode.parentNode.insertBefore(node, li.parentNode);
        });
        DOM.remove(targetNode);
      };
      bookmarks = DOM.select('span[data-mce-type="bookmark"]', ul);
      newBlock = createTextBlock(editor, li);
      tmpRng = DOM.createRng();
      tmpRng.setStartAfter(li);
      tmpRng.setEndAfter(ul);
      fragment = tmpRng.extractContents();
      for (node = fragment.firstChild; node; node = node.firstChild) {
        if (node.nodeName === 'LI' && editor.dom.isEmpty(node)) {
          DOM.remove(node);
          break;
        }
      }
      if (!editor.dom.isEmpty(fragment)) {
        DOM.insertAfter(fragment, ul);
      }
      DOM.insertAfter(newBlock, ul);
      if (isEmpty(editor.dom, li.parentNode)) {
        removeAndKeepBookmarks(li.parentNode);
      }
      DOM.remove(li);
      if (isEmpty(editor.dom, ul)) {
        DOM.remove(ul);
      }
    };

    var outdentDlItem = function (editor, item) {
      if (is$1(item, 'dd')) {
        mutate(item, 'dt');
      } else if (is$1(item, 'dt')) {
        parent(item).each(function (dl) {
          return splitList(editor, dl.dom(), item.dom());
        });
      }
    };
    var indentDlItem = function (item) {
      if (is$1(item, 'dt')) {
        mutate(item, 'dd');
      }
    };
    var dlIndentation = function (editor, indentation, dlItems) {
      if (indentation === 'Indent') {
        each(dlItems, indentDlItem);
      } else {
        each(dlItems, function (item) {
          return outdentDlItem(editor, item);
        });
      }
    };

    var getNormalizedPoint = function (container, offset) {
      if (isTextNode(container)) {
        return {
          container: container,
          offset: offset
        };
      }
      var node = RangeUtils.getNode(container, offset);
      if (isTextNode(node)) {
        return {
          container: node,
          offset: offset >= container.childNodes.length ? node.data.length : 0
        };
      } else if (node.previousSibling && isTextNode(node.previousSibling)) {
        return {
          container: node.previousSibling,
          offset: node.previousSibling.data.length
        };
      } else if (node.nextSibling && isTextNode(node.nextSibling)) {
        return {
          container: node.nextSibling,
          offset: 0
        };
      }
      return {
        container: container,
        offset: offset
      };
    };
    var normalizeRange = function (rng) {
      var outRng = rng.cloneRange();
      var rangeStart = getNormalizedPoint(rng.startContainer, rng.startOffset);
      outRng.setStart(rangeStart.container, rangeStart.offset);
      var rangeEnd = getNormalizedPoint(rng.endContainer, rng.endOffset);
      outRng.setEnd(rangeEnd.container, rangeEnd.offset);
      return outRng;
    };

    var selectionIndentation = function (editor, indentation) {
      var lists = map(getSelectedListRoots(editor), Element.fromDom);
      var dlItems = map(getSelectedDlItems(editor), Element.fromDom);
      var isHandled = false;
      if (lists.length || dlItems.length) {
        var bookmark = editor.selection.getBookmark();
        listIndentation(editor, lists, indentation);
        dlIndentation(editor, indentation, dlItems);
        editor.selection.moveToBookmark(bookmark);
        editor.selection.setRng(normalizeRange(editor.selection.getRng()));
        editor.nodeChanged();
        isHandled = true;
      }
      return isHandled;
    };
    var indentListSelection = function (editor) {
      return selectionIndentation(editor, 'Indent');
    };
    var outdentListSelection = function (editor) {
      return selectionIndentation(editor, 'Outdent');
    };
    var flattenListSelection = function (editor) {
      return selectionIndentation(editor, 'Flatten');
    };

    var DOM$1 = DOMUtils.DOM;
    var createBookmark = function (rng) {
      var bookmark = {};
      var setupEndPoint = function (start) {
        var offsetNode, container, offset;
        container = rng[start ? 'startContainer' : 'endContainer'];
        offset = rng[start ? 'startOffset' : 'endOffset'];
        if (container.nodeType === 1) {
          offsetNode = DOM$1.create('span', { 'data-mce-type': 'bookmark' });
          if (container.hasChildNodes()) {
            offset = Math.min(offset, container.childNodes.length - 1);
            if (start) {
              container.insertBefore(offsetNode, container.childNodes[offset]);
            } else {
              DOM$1.insertAfter(offsetNode, container.childNodes[offset]);
            }
          } else {
            container.appendChild(offsetNode);
          }
          container = offsetNode;
          offset = 0;
        }
        bookmark[start ? 'startContainer' : 'endContainer'] = container;
        bookmark[start ? 'startOffset' : 'endOffset'] = offset;
      };
      setupEndPoint(true);
      if (!rng.collapsed) {
        setupEndPoint();
      }
      return bookmark;
    };
    var resolveBookmark = function (bookmark) {
      function restoreEndPoint(start) {
        var container, offset, node;
        var nodeIndex = function (container) {
          var node = container.parentNode.firstChild, idx = 0;
          while (node) {
            if (node === container) {
              return idx;
            }
            if (node.nodeType !== 1 || node.getAttribute('data-mce-type') !== 'bookmark') {
              idx++;
            }
            node = node.nextSibling;
          }
          return -1;
        };
        container = node = bookmark[start ? 'startContainer' : 'endContainer'];
        offset = bookmark[start ? 'startOffset' : 'endOffset'];
        if (!container) {
          return;
        }
        if (container.nodeType === 1) {
          offset = nodeIndex(container);
          container = container.parentNode;
          DOM$1.remove(node);
          if (!container.hasChildNodes() && DOM$1.isBlock(container)) {
            container.appendChild(DOM$1.create('br'));
          }
        }
        bookmark[start ? 'startContainer' : 'endContainer'] = container;
        bookmark[start ? 'startOffset' : 'endOffset'] = offset;
      }
      restoreEndPoint(true);
      restoreEndPoint();
      var rng = DOM$1.createRng();
      rng.setStart(bookmark.startContainer, bookmark.startOffset);
      if (bookmark.endContainer) {
        rng.setEnd(bookmark.endContainer, bookmark.endOffset);
      }
      return normalizeRange(rng);
    };

    var isCustomList = function (list) {
      return /\btox\-/.test(list.className) || /joplinChecklist/.test(list.className);
    };

    var listToggleActionFromListName = function (listName) {
      switch (listName) {
      case 'UL':
        return 'ToggleUlList';
      case 'OL':
        return 'ToggleOlList';
      case 'DL':
        return 'ToggleDLList';
      }
    };

    function isCheckboxListItem(element) {
      return element.classList && element.classList.contains('joplin-checklist');
    }
    function findContainerListTypeFromEvent(event) {
      if (isCheckboxListItem(event.element))
        return 'joplinChecklist';
      for (var _i = 0, _a = event.parents; _i < _a.length; _i++) {
        var parent = _a[_i];
        if (isCheckboxListItem(parent))
          return 'joplinChecklist';
      }
      return 'regular';
    }
    function findContainerListTypeFromElement(element) {
      while (element) {
        if (element.nodeName === 'UL' || element.nodName === 'OL') {
          return isCheckboxListItem(element) ? 'joplinChecklist' : 'regular';
        }
        element = element.parentNode;
      }
      return 'regular';
    }
    function addJoplinChecklistCommands(editor, ToggleList) {
      editor.addCommand('ToggleJoplinChecklistItem', function (ui, detail) {
        var element = detail.element;
        if (element.nodeName !== 'LI')
          return;
        var listType = findContainerListTypeFromElement(element);
        if (listType === 'joplinChecklist') {
          if (!element.classList || !element.classList.contains('checked')) {
            element.classList.add('checked');
          } else {
            element.classList.remove('checked');
          }
        }
      });
      editor.addCommand('InsertJoplinChecklist', function (ui, detail) {
        detail = Object.assign({}, detail, { listType: 'joplinChecklist' });
        ToggleList.toggleList(editor, 'UL', detail);
      });
    }

    var updateListStyle = function (dom, el, detail) {
      var type = detail['list-style-type'] ? detail['list-style-type'] : null;
      dom.setStyle(el, 'list-style-type', type);
    };
    var setAttribs = function (elm, attrs) {
      Tools.each(attrs, function (value, key) {
        elm.setAttribute(key, value);
      });
    };
    var updateListAttrs = function (dom, el, detail) {
      setAttribs(el, detail['list-attributes']);
      Tools.each(dom.select('li', el), function (li) {
        setAttribs(li, detail['list-item-attributes']);
      });
    };
    var updateListWithDetails = function (dom, el, detail) {
      updateListStyle(dom, el, detail);
      updateListAttrs(dom, el, detail);
      if (detail.listType === 'joplinChecklist') {
        el.classList.add('joplin-checklist');
      } else {
        el.classList.remove('joplin-checklist');
      }
    };
    var removeStyles = function (dom, element, styles) {
      Tools.each(styles, function (style) {
        var _a;
        return dom.setStyle(element, (_a = {}, _a[style] = '', _a));
      });
    };
    var getEndPointNode = function (editor, rng, start, root) {
      var container, offset;
      container = rng[start ? 'startContainer' : 'endContainer'];
      offset = rng[start ? 'startOffset' : 'endOffset'];
      if (container.nodeType === 1) {
        container = container.childNodes[Math.min(offset, container.childNodes.length - 1)] || container;
      }
      if (!start && isBr(container.nextSibling)) {
        container = container.nextSibling;
      }
      while (container.parentNode !== root) {
        if (isTextBlock(editor, container)) {
          return container;
        }
        if (/^(TD|TH)$/.test(container.parentNode.nodeName)) {
          return container;
        }
        container = container.parentNode;
      }
      return container;
    };
    var getSelectedTextBlocks = function (editor, rng, root) {
      var textBlocks = [], dom = editor.dom;
      var startNode = getEndPointNode(editor, rng, true, root);
      var endNode = getEndPointNode(editor, rng, false, root);
      var block;
      var siblings = [];
      for (var node = startNode; node; node = node.nextSibling) {
        siblings.push(node);
        if (node === endNode) {
          break;
        }
      }
      Tools.each(siblings, function (node) {
        if (isTextBlock(editor, node)) {
          textBlocks.push(node);
          block = null;
          return;
        }
        if (dom.isBlock(node) || isBr(node)) {
          if (isBr(node)) {
            dom.remove(node);
          }
          block = null;
          return;
        }
        var nextSibling = node.nextSibling;
        if (BookmarkManager.isBookmarkNode(node)) {
          if (isTextBlock(editor, nextSibling) || !nextSibling && node.parentNode === root) {
            block = null;
            return;
          }
        }
        if (!block) {
          block = dom.create('p');
          node.parentNode.insertBefore(block, node);
          textBlocks.push(block);
        }
        block.appendChild(node);
      });
      return textBlocks;
    };
    var hasCompatibleStyle = function (dom, sib, detail) {
      var sibStyle = dom.getStyle(sib, 'list-style-type');
      var detailStyle = detail ? detail['list-style-type'] : '';
      detailStyle = detailStyle === null ? '' : detailStyle;
      return sibStyle === detailStyle;
    };
    var applyList = function (editor, listName, detail) {
      if (detail === void 0) {
        detail = {};
      }
      console.info('applyList', listName, detail);
      var rng = editor.selection.getRng(true);
      var bookmark;
      var listItemName = 'LI';
      var root = getClosestListRootElm(editor, editor.selection.getStart(true));
      var dom = editor.dom;
      if (dom.getContentEditable(editor.selection.getNode()) === 'false') {
        return;
      }
      listName = listName.toUpperCase();
      if (listName === 'DL') {
        listItemName = 'DT';
      }
      bookmark = createBookmark(rng);
      Tools.each(getSelectedTextBlocks(editor, rng, root), function (block) {
        var listBlock, sibling;
        sibling = block.previousSibling;
        if (sibling && isListNode(sibling) && sibling.nodeName === listName && hasCompatibleStyle(dom, sibling, detail)) {
          console.info('applyList 1');
          listBlock = sibling;
          block = dom.rename(block, listItemName);
          sibling.appendChild(block);
        } else {
          console.info('applyList 2');
          listBlock = dom.create(listName);
          if (detail.listType === 'joplinChecklist') {
            listBlock.classList.add('joplin-checklist');
          } else {
            listBlock.classList.remove('joplin-checklist');
          }
          block.parentNode.insertBefore(listBlock, block);
          listBlock.appendChild(block);
          block = dom.rename(block, listItemName);
        }
        removeStyles(dom, block, [
          'margin',
          'margin-right',
          'margin-bottom',
          'margin-left',
          'margin-top',
          'padding',
          'padding-right',
          'padding-bottom',
          'padding-left',
          'padding-top'
        ]);
        updateListWithDetails(dom, listBlock, detail);
        mergeWithAdjacentLists(editor.dom, listBlock);
      });
      editor.selection.setRng(resolveBookmark(bookmark));
    };
    var isValidLists = function (list1, list2) {
      return list1 && list2 && isListNode(list1) && list1.nodeName === list2.nodeName;
    };
    var hasSameListStyle = function (dom, list1, list2) {
      var targetStyle = dom.getStyle(list1, 'list-style-type', true);
      var style = dom.getStyle(list2, 'list-style-type', true);
      return targetStyle === style;
    };
    var hasSameClasses = function (elm1, elm2) {
      return elm1.className === elm2.className;
    };
    var shouldMerge = function (dom, list1, list2) {
      return isValidLists(list1, list2) && hasSameListStyle(dom, list1, list2) && hasSameClasses(list1, list2);
    };
    var mergeWithAdjacentLists = function (dom, listBlock) {
      var sibling, node;
      sibling = listBlock.nextSibling;
      if (shouldMerge(dom, listBlock, sibling)) {
        while (node = sibling.firstChild) {
          listBlock.appendChild(node);
        }
        dom.remove(sibling);
      }
      sibling = listBlock.previousSibling;
      if (shouldMerge(dom, listBlock, sibling)) {
        while (node = sibling.lastChild) {
          listBlock.insertBefore(node, listBlock.firstChild);
        }
        dom.remove(sibling);
      }
    };
    var updateList = function (editor, list, listName, detail) {
      if (list.nodeName !== listName) {
        console.info('updateList 1', list, listName, detail);
        var newList = editor.dom.rename(list, listName);
        updateListWithDetails(editor.dom, newList, detail);
        fireListEvent(editor, listToggleActionFromListName(listName), newList);
      } else {
        console.info('updateList 2', list, listName, detail);
        updateListWithDetails(editor.dom, list, detail);
        fireListEvent(editor, listToggleActionFromListName(listName), list);
      }
    };
    var toggleMultipleLists = function (editor, parentList, lists, listName, detail) {
      console.info('-- toggleMultipleLists', lists, listName, detail);
      if (parentList.nodeName === listName && !hasListStyleDetail(detail)) {
        flattenListSelection(editor);
      } else {
        var bookmark = createBookmark(editor.selection.getRng(true));
        Tools.each([parentList].concat(lists), function (elm) {
          updateList(editor, elm, listName, detail);
        });
        editor.selection.setRng(resolveBookmark(bookmark));
      }
    };
    var hasListStyleDetail = function (detail) {
      return 'list-style-type' in detail;
    };
    var toggleSingleList = function (editor, parentList, listName, detail) {
      console.info('-- toggleSingleList', listName, detail);
      if (parentList === editor.getBody()) {
        return;
      }
      if (parentList) {
        console.info('toggleSingleList 1');
        var listType = findContainerListTypeFromElement(parentList);
        console.info('List type', listType, '(detail)', detail);
        if (parentList.nodeName === listName && !hasListStyleDetail(detail) && !isCustomList(parentList) && listType === detail.listType) {
          console.info('toggleSingleList 2');
          flattenListSelection(editor);
        } else {
          console.info('toggleSingleList 3');
          var bookmark = createBookmark(editor.selection.getRng(true));
          updateListWithDetails(editor.dom, parentList, detail);
          var newList = editor.dom.rename(parentList, listName);
          mergeWithAdjacentLists(editor.dom, newList);
          editor.selection.setRng(resolveBookmark(bookmark));
          fireListEvent(editor, listToggleActionFromListName(listName), newList);
        }
      } else {
        console.info('toggleSingleList 4');
        applyList(editor, listName, detail);
        fireListEvent(editor, listToggleActionFromListName(listName), parentList);
      }
    };
    var toggleList = function (editor, listName, detail) {
      console.info('==== TOGGLE LIST', listName, detail);
      var parentList = getParentList(editor);
      var selectedSubLists = getSelectedSubLists(editor);
      detail = __assign({ listType: 'regular' }, detail);
      if (parentList && selectedSubLists.length > 0) {
        toggleMultipleLists(editor, parentList, selectedSubLists, listName, detail);
      } else {
        toggleSingleList(editor, parentList, listName, detail);
      }
    };

    var ToggleList = /*#__PURE__*/Object.freeze({
        __proto__: null,
        toggleList: toggleList,
        mergeWithAdjacentLists: mergeWithAdjacentLists
    });

    var DOM$2 = DOMUtils.DOM;
    var normalizeList = function (dom, ul) {
      var sibling;
      var parentNode = ul.parentNode;
      if (parentNode.nodeName === 'LI' && parentNode.firstChild === ul) {
        sibling = parentNode.previousSibling;
        if (sibling && sibling.nodeName === 'LI') {
          sibling.appendChild(ul);
          if (isEmpty(dom, parentNode)) {
            DOM$2.remove(parentNode);
          }
        } else {
          DOM$2.setStyle(parentNode, 'listStyleType', 'none');
        }
      }
      if (isListNode(parentNode)) {
        sibling = parentNode.previousSibling;
        if (sibling && sibling.nodeName === 'LI') {
          sibling.appendChild(ul);
        }
      }
    };
    var normalizeLists = function (dom, element) {
      Tools.each(Tools.grep(dom.select('ol,ul', element)), function (ul) {
        normalizeList(dom, ul);
      });
    };

    var findNextCaretContainer = function (editor, rng, isForward, root) {
      var node = rng.startContainer;
      var offset = rng.startOffset;
      if (isTextNode(node) && (isForward ? offset < node.data.length : offset > 0)) {
        return node;
      }
      var nonEmptyBlocks = editor.schema.getNonEmptyElements();
      if (node.nodeType === 1) {
        node = RangeUtils.getNode(node, offset);
      }
      var walker = new TreeWalker(node, root);
      if (isForward) {
        if (isBogusBr(editor.dom, node)) {
          walker.next();
        }
      }
      while (node = walker[isForward ? 'next' : 'prev2']()) {
        if (node.nodeName === 'LI' && !node.hasChildNodes()) {
          return node;
        }
        if (nonEmptyBlocks[node.nodeName]) {
          return node;
        }
        if (isTextNode(node) && node.data.length > 0) {
          return node;
        }
      }
    };
    var hasOnlyOneBlockChild = function (dom, elm) {
      var childNodes = elm.childNodes;
      return childNodes.length === 1 && !isListNode(childNodes[0]) && dom.isBlock(childNodes[0]);
    };
    var unwrapSingleBlockChild = function (dom, elm) {
      if (hasOnlyOneBlockChild(dom, elm)) {
        dom.remove(elm.firstChild, true);
      }
    };
    var moveChildren = function (dom, fromElm, toElm) {
      var node, targetElm;
      targetElm = hasOnlyOneBlockChild(dom, toElm) ? toElm.firstChild : toElm;
      unwrapSingleBlockChild(dom, fromElm);
      if (!isEmpty(dom, fromElm, true)) {
        while (node = fromElm.firstChild) {
          targetElm.appendChild(node);
        }
      }
    };
    var mergeLiElements = function (dom, fromElm, toElm) {
      var node, listNode;
      var ul = fromElm.parentNode;
      if (!isChildOfBody(dom, fromElm) || !isChildOfBody(dom, toElm)) {
        return;
      }
      if (isListNode(toElm.lastChild)) {
        listNode = toElm.lastChild;
      }
      if (ul === toElm.lastChild) {
        if (isBr(ul.previousSibling)) {
          dom.remove(ul.previousSibling);
        }
      }
      node = toElm.lastChild;
      if (node && isBr(node) && fromElm.hasChildNodes()) {
        dom.remove(node);
      }
      if (isEmpty(dom, toElm, true)) {
        dom.$(toElm).empty();
      }
      moveChildren(dom, fromElm, toElm);
      if (listNode) {
        toElm.appendChild(listNode);
      }
      var contains = contains$1(Element.fromDom(toElm), Element.fromDom(fromElm));
      var nestedLists = contains ? dom.getParents(fromElm, isListNode, toElm) : [];
      dom.remove(fromElm);
      each(nestedLists, function (list) {
        if (isEmpty(dom, list) && list !== dom.getRoot()) {
          dom.remove(list);
        }
      });
    };
    var mergeIntoEmptyLi = function (editor, fromLi, toLi) {
      editor.dom.$(toLi).empty();
      mergeLiElements(editor.dom, fromLi, toLi);
      editor.selection.setCursorLocation(toLi);
    };
    var mergeForward = function (editor, rng, fromLi, toLi) {
      var dom = editor.dom;
      if (dom.isEmpty(toLi)) {
        mergeIntoEmptyLi(editor, fromLi, toLi);
      } else {
        var bookmark = createBookmark(rng);
        mergeLiElements(dom, fromLi, toLi);
        editor.selection.setRng(resolveBookmark(bookmark));
      }
    };
    var mergeBackward = function (editor, rng, fromLi, toLi) {
      var bookmark = createBookmark(rng);
      mergeLiElements(editor.dom, fromLi, toLi);
      var resolvedBookmark = resolveBookmark(bookmark);
      editor.selection.setRng(resolvedBookmark);
    };
    var backspaceDeleteFromListToListCaret = function (editor, isForward) {
      var dom = editor.dom, selection = editor.selection;
      var selectionStartElm = selection.getStart();
      var root = getClosestListRootElm(editor, selectionStartElm);
      var li = dom.getParent(selection.getStart(), 'LI', root);
      if (li) {
        var ul = li.parentNode;
        if (ul === editor.getBody() && isEmpty(dom, ul)) {
          return true;
        }
        var rng_1 = normalizeRange(selection.getRng());
        var otherLi_1 = dom.getParent(findNextCaretContainer(editor, rng_1, isForward, root), 'LI', root);
        if (otherLi_1 && otherLi_1 !== li) {
          editor.undoManager.transact(function () {
            if (isForward) {
              mergeForward(editor, rng_1, otherLi_1, li);
            } else {
              if (isFirstChild(li)) {
                outdentListSelection(editor);
              } else {
                mergeBackward(editor, rng_1, li, otherLi_1);
              }
            }
          });
          return true;
        } else if (!otherLi_1) {
          if (!isForward && rng_1.startOffset === 0 && rng_1.endOffset === 0) {
            editor.undoManager.transact(function () {
              flattenListSelection(editor);
            });
            return true;
          }
        }
      }
      return false;
    };
    var removeBlock = function (dom, block, root) {
      var parentBlock = dom.getParent(block.parentNode, dom.isBlock, root);
      dom.remove(block);
      if (parentBlock && dom.isEmpty(parentBlock)) {
        dom.remove(parentBlock);
      }
    };
    var backspaceDeleteIntoListCaret = function (editor, isForward) {
      var dom = editor.dom;
      var selectionStartElm = editor.selection.getStart();
      var root = getClosestListRootElm(editor, selectionStartElm);
      var block = dom.getParent(selectionStartElm, dom.isBlock, root);
      if (block && dom.isEmpty(block)) {
        var rng = normalizeRange(editor.selection.getRng());
        var otherLi_2 = dom.getParent(findNextCaretContainer(editor, rng, isForward, root), 'LI', root);
        if (otherLi_2) {
          editor.undoManager.transact(function () {
            removeBlock(dom, block, root);
            mergeWithAdjacentLists(dom, otherLi_2.parentNode);
            editor.selection.select(otherLi_2, true);
            editor.selection.collapse(isForward);
          });
          return true;
        }
      }
      return false;
    };
    var backspaceDeleteCaret = function (editor, isForward) {
      return backspaceDeleteFromListToListCaret(editor, isForward) || backspaceDeleteIntoListCaret(editor, isForward);
    };
    var backspaceDeleteRange = function (editor) {
      var selectionStartElm = editor.selection.getStart();
      var root = getClosestListRootElm(editor, selectionStartElm);
      var startListParent = editor.dom.getParent(selectionStartElm, 'LI,DT,DD', root);
      if (startListParent || getSelectedListItems(editor).length > 0) {
        editor.undoManager.transact(function () {
          editor.execCommand('Delete');
          normalizeLists(editor.dom, editor.getBody());
        });
        return true;
      }
      return false;
    };
    var backspaceDelete = function (editor, isForward) {
      return editor.selection.isCollapsed() ? backspaceDeleteCaret(editor, isForward) : backspaceDeleteRange(editor);
    };
    var setup = function (editor) {
      editor.on('keydown', function (e) {
        if (e.keyCode === VK.BACKSPACE) {
          if (backspaceDelete(editor, false)) {
            e.preventDefault();
          }
        } else if (e.keyCode === VK.DELETE) {
          if (backspaceDelete(editor, true)) {
            e.preventDefault();
          }
        }
      });
    };

    var get = function (editor) {
      return {
        backspaceDelete: function (isForward) {
          backspaceDelete(editor, isForward);
        }
      };
    };

    var queryListCommandState = function (editor, listName) {
      return function () {
        var parentList = editor.dom.getParent(editor.selection.getStart(), 'UL,OL,DL');
        return parentList && parentList.nodeName === listName;
      };
    };
    var register = function (editor) {
      editor.on('BeforeExecCommand', function (e) {
        var cmd = e.command.toLowerCase();
        if (cmd === 'indent') {
          indentListSelection(editor);
        } else if (cmd === 'outdent') {
          outdentListSelection(editor);
        }
      });
      editor.addCommand('InsertUnorderedList', function (ui, detail) {
        toggleList(editor, 'UL', detail);
      });
      editor.addCommand('InsertOrderedList', function (ui, detail) {
        toggleList(editor, 'OL', detail);
      });
      editor.addCommand('InsertDefinitionList', function (ui, detail) {
        toggleList(editor, 'DL', detail);
      });
      editor.addCommand('RemoveList', function () {
        flattenListSelection(editor);
      });
      editor.addQueryStateHandler('InsertUnorderedList', queryListCommandState(editor, 'UL'));
      editor.addQueryStateHandler('InsertOrderedList', queryListCommandState(editor, 'OL'));
      editor.addQueryStateHandler('InsertDefinitionList', queryListCommandState(editor, 'DL'));
      addJoplinChecklistCommands(editor, ToggleList);
    };

    var setupTabKey = function (editor) {
      editor.on('keydown', function (e) {
        if (e.keyCode !== VK.TAB || VK.metaKeyPressed(e)) {
          return;
        }
        editor.undoManager.transact(function () {
          if (e.shiftKey ? outdentListSelection(editor) : indentListSelection(editor)) {
            e.preventDefault();
          }
        });
      });
    };
    var setup$1 = function (editor) {
      if (shouldIndentOnTab(editor)) {
        setupTabKey(editor);
      }
      setup(editor);
    };

    var findIndex = function (list, predicate) {
      for (var index = 0; index < list.length; index++) {
        var element = list[index];
        if (predicate(element)) {
          return index;
        }
      }
      return -1;
    };
    var editorListMutationHandler = function (event) {
      console.info('editorListMutationHandler', event);
    };
    var listState = function (editor, listName, options) {
      if (options === void 0) {
        options = {};
      }
      options = __assign({ listType: 'regular' }, options);
      return function (buttonApi) {
        var nodeChangeHandler = function (e) {
          var tableCellIndex = findIndex(e.parents, isTableCellNode);
          var parents = tableCellIndex !== -1 ? e.parents.slice(0, tableCellIndex) : e.parents;
          var lists = Tools.grep(parents, isListNode);
          var listType = findContainerListTypeFromEvent(e);
          buttonApi.setActive(listType === options.listType && lists.length > 0 && lists[0].nodeName === listName && !isCustomList(lists[0]));
        };
        var editorClickHandler = function (event) {
          editor.execCommand('ToggleJoplinChecklistItem', false, { element: event.target });
        };
        if (options.listType === 'joplinChecklist') {
          editor.on('click', editorClickHandler);
          editor.on('ListMutation', editorListMutationHandler);
        }
        editor.on('NodeChange', nodeChangeHandler);
        return function () {
          if (options.listType === 'joplinChecklist') {
            editor.off('click', editorClickHandler);
            editor.off('ListMutation', editorListMutationHandler);
          }
          editor.off('NodeChange', nodeChangeHandler);
        };
      };
    };
    var register$1 = function (editor) {
      var hasPlugin = function (editor, plugin) {
        var plugins = editor.settings.plugins ? editor.settings.plugins : '';
        return Tools.inArray(plugins.split(/[ ,]/), plugin) !== -1;
      };
      var exec = function (command) {
        return function () {
          return editor.execCommand(command);
        };
      };
      if (!hasPlugin(editor, 'advlist')) {
        editor.ui.registry.addToggleButton('numlist', {
          icon: 'ordered-list',
          active: false,
          tooltip: 'Numbered list',
          onAction: exec('InsertOrderedList'),
          onSetup: listState(editor, 'OL')
        });
        editor.ui.registry.addToggleButton('bullist', {
          icon: 'unordered-list',
          active: false,
          tooltip: 'Bullet list',
          onAction: exec('InsertUnorderedList'),
          onSetup: listState(editor, 'UL')
        });
        editor.ui.registry.addToggleButton('joplinChecklist', {
          icon: 'checklist',
          active: false,
          tooltip: 'Checkbox list',
          onAction: exec('InsertJoplinChecklist'),
          onSetup: listState(editor, 'UL', { listType: 'joplinChecklist' })
        });
      }
    };

    function Plugin () {
      PluginManager.add('joplinLists', function (editor) {
        setup$1(editor);
        register$1(editor);
        register(editor);
        return get(editor);
      });
    }

    Plugin();

}(tinymce.PluginManager, window, tinymce.dom.RangeUtils, tinymce.dom.TreeWalker, tinymce.util.VK, tinymce.dom.DomQuery, tinymce.util.Tools, tinymce.dom.DOMUtils, tinymce.dom.BookmarkManager));
