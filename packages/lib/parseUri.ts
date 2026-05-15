/* eslint no-useless-escape: 0*/
/* eslint prefer-const: 0*/

// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

interface ParseUriOptions {
	strictMode: boolean;
	key: string[];
	q: {
		name: string;
		parser: RegExp;
	};
	parser: {
		strict: RegExp;
		loose: RegExp;
	};
}

interface Uri {
	[key: string]: string | Record<string, string>;
	queryKey: Record<string, string>;
}

function parseUri(str: string): Uri {
	const o = parseUri.options;
	const m = o.parser[o.strictMode ? 'strict' : 'loose'].exec(str);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const uri: any = {};
	let i = 14;

	while (i--) uri[o.key[i]] = m ? (m[i] || '') : '';

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, (_$0: string, $1: string, $2: string) => {
		if ($1) uri[o.q.name][$1] = $2;
	});

	return uri as Uri;
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
} as ParseUriOptions;

export default parseUri;
