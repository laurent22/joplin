// enable file link URLs in MarkdownIt. Keeps other URL restrictions of MarkdownIt untouched.
// Format [link name](file://...)
export default function(url: string) {
	const BAD_PROTO_RE = /^(vbscript|javascript|data):/;
	const GOOD_DATA_RE = /^data:image\/(gif|png|jpeg|webp);/;

	// url should be normalized at this point, and existing entities are decoded
	const str = url.trim().toLowerCase();

	if (str.indexOf('data:image/svg+xml,') === 0) {
		return true;
	}

	return BAD_PROTO_RE.test(str) ? (!!GOOD_DATA_RE.test(str)) : true;
}
