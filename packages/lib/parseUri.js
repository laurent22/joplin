"use strict";
/* eslint no-useless-escape: 0*/
/* eslint prefer-const: 0*/
Object.defineProperty(exports, "__esModule", { value: true });
function parseUri(str) {
    const o = parseUri.options;
    const m = o.parser[o.strictMode ? 'strict' : 'loose'].exec(str);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uri = {};
    let i = 14;
    while (i--)
        uri[o.key[i]] = m ? (m[i] || '') : '';
    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, (_$0, $1, $2) => {
        if ($1)
            uri[o.q.name][$1] = $2;
    });
    return uri;
}
parseUri.options = {
    strictMode: false,
    key: ['source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'],
    q: {
        name: 'queryKey',
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g,
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/,
    },
};
exports.default = parseUri;
//# sourceMappingURL=parseUri.js.map