// scrollmap is used for synchronous scrolling between Markdown Editor and Viewer.
// It has the mapping information between the line numbers of a Markdown text and
// the scroll positions (percents) of the elements in the HTML document transformed
// from the Markdown text.
// To see the detail of synchronous scrolling, refer the following design document.
// <s> Replace me! https://github.com/laurent22/joplin/pull/5512#issuecomment-931277022 </s>

const scrollmap = {
	map_: null,
	lineCount_: 0,
};

scrollmap.create = (lineCount) => {
	// Creates a translation map between editor's line number
	// and viewer's scroll percent. Both attributes (line and percent) of
	// the returned map are sorted respectively.
	// For each document change, this function should be called.
	// Since creating this map is costly for each scroll event,
	// it is cached and re-created as needed. Whenever the layout
	// of the document changes, it has to be invalidated by refresh().
	scrollmap.lineCount_ = lineCount;
	scrollmap.refresh();
};

scrollmap.refresh = () => {
	scrollmap.map_ = null;
};

scrollmap.get_ = () => {
	if (scrollmap.map_) return scrollmap.map_;
	const contentElement = document.getElementById('joplin-container-content');
	if (!contentElement) return null;
	const height = Math.max(1, contentElement.scrollHeight - contentElement.clientHeight);
	// Since getBoundingClientRect() returns a relative position,
	// the offset of the origin is needed to get its aboslute position.
	const firstElem = document.getElementById('rendered-md');
	if (!firstElem) return null;
	const offset = firstElem.getBoundingClientRect().top;
	// Mapping information between editor's lines and viewer's elements is
	// embedded into elements by the renderer.
	// See also renderer/MdToHtml/rules/source_map.ts.
	const elems = document.getElementsByClassName('maps-to-line');
	if (elems.length === 0) return null;
	const map = { line: [0], percent: [0], viewHeight: height, lineCount: 0 };
	// Each map entry is total-ordered.
	let last = 0;
	for (let i = 0; i < elems.length; i++) {
		const rect = elems[i].getBoundingClientRect();
		const top = rect.top - offset;
		const line = Number(elems[i].getAttribute('source-line'));
		const percent = Math.max(0, Math.min(1, top / height));
		if (map.line[last] < line && map.percent[last] < percent) {
			map.line.push(line);
			map.percent.push(percent);
			last += 1;
		}
		const bottom = rect.bottom - offset;
		const lineEnd = Number(elems[i].getAttribute('source-line-end'));
		const percentEnd = Math.max(0, Math.min(1, bottom / height));
		if (map.line[last] < lineEnd && map.percent[last] < percentEnd) {
			map.line.push(lineEnd);
			map.percent.push(percentEnd);
			last += 1;
		}
	}
	const lineCount = scrollmap.lineCount_;
	if (lineCount) {
		map.lineCount = lineCount;
	} else {
		if (map.lineCount < map.line[last]) map.lineCount = map.line[last];
	}
	if (map.percent[last] < 1) {
		map.line.push(lineCount || 1e10);
		map.percent.push(1);
	} else {
		map.line[last] = lineCount || 1e10;
	}
	scrollmap.map_ = map;
	return map;
};

scrollmap.isPresent = () => {
	const map = scrollmap.get_();
	return !!map;
};

scrollmap.translateLV_ = (percent, l2v = true) => {
	// If the input is out of (0,1) or not number, it is not translated.
	if (!(0 < percent && percent < 1)) return percent;
	const map = scrollmap.get_();
	if (!map || map.line.length <= 2) return percent; // No translation
	const lineCount = map.lineCount;
	const values = l2v ? map.line : map.percent;
	const target = l2v ? percent * lineCount : percent;
	// Binary search (rightmost): finds where map[r-1][field] <= target < map[r][field]
	let l = 1, r = values.length - 1;
	while (l < r) {
		const m = Math.floor(l + (r - l) / 2);
		if (target < values[m]) r = m; else l = m + 1;
	}
	const lineU = map.line[r - 1];
	const lineL = Math.min(lineCount, map.line[r]);
	const vPercentU = map.percent[r - 1];
	const vPercentL = map.percent[r];
	let linInterp, result;
	if (l2v) {
		linInterp = (percent * lineCount - lineU) / (lineL - lineU);
		result = vPercentU + (vPercentL - vPercentU) * linInterp;
	} else {
		linInterp = (percent - vPercentU) / (vPercentL - vPercentU);
		result = (lineU + (lineL - lineU) * linInterp) / lineCount;
	}
	return Math.max(0, Math.min(1, result));
};

scrollmap.translateL2V = (lPercent) => {
	return scrollmap.translateLV_(lPercent, true);
};

scrollmap.translateV2L = (vPercent) => {
	return scrollmap.translateLV_(vPercent, false);
};
