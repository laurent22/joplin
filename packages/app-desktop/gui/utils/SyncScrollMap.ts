import shim from '@joplin/lib/shim';

// SyncScrollMap is used for synchronous scrolling between Markdown Editor and Viewer.
// It has the mapping information between the line numbers of a Markdown text and
// the scroll positions (percents) of the elements in the HTML document transformed
// from the Markdown text.
// To see the detail of synchronous scrolling, refer the following design document.
// https://github.com/laurent22/joplin/pull/5512#issuecomment-931277022

export interface SyncScrollMap {
	line: number[];
	percent: number[];
	viewHeight: number;
}

// Map creation utility class
export class SyncScrollMapper {
	private map_: SyncScrollMap = null;
	private refreshTimeoutId_: any = null;
	private refreshTime_ = 0;

	// Invalidates an outdated SyncScrollMap.
	// For a performance reason, too frequent refresh requests are
	// skippend and delayed. If forced is true, refreshing is immediately performed.
	public refresh(forced: boolean) {
		const elapsed = this.refreshTime_ ? Date.now() - this.refreshTime_ : 10 * 1000;
		if (!forced && (elapsed < 200 || this.refreshTimeoutId_)) {
			// to avoid too frequent recreations of a sync-scroll map.
			if (this.refreshTimeoutId_) {
				shim.clearTimeout(this.refreshTimeoutId_);
				this.refreshTimeoutId_ = null;
			}
			this.refreshTimeoutId_ = shim.setTimeout(() => {
				this.refreshTimeoutId_ = null;
				this.map_ = null;
				this.refreshTime_ = Date.now();
			}, 200);
		} else {
			this.map_ = null;
			this.refreshTime_ = Date.now();
		}
	}

	// Creates a new SyncScrollMap or reuses an existing one.
	public get(doc: Document): SyncScrollMap {
		// Returns a cached translation map between editor's scroll percenet
		// and viewer's scroll percent. Both attributes (line and percent) of
		// the returned map are sorted respectively.
		// Since creating this map is costly for each scroll event, it is cached.
		// When some update events which outdate it such as switching a note or
		// editing a note, it has to be invalidated (using refresh()),
		// and a new map will be created at a next scroll event.
		if (!doc) return null;
		const contentElement = doc.getElementById('joplin-container-content');
		if (!contentElement) return null;
		const height = Math.max(1, contentElement.scrollHeight - contentElement.clientHeight);
		if (this.map_) {
			// check whether map_ is obsolete
			if (this.map_.viewHeight === height) return this.map_;
			this.map_ = null;
		}
		// Since getBoundingClientRect() returns a relative position,
		// the offset of the origin is needed to get its aboslute position.
		const offset = doc.getElementById('rendered-md')?.getBoundingClientRect().top;
		if (!offset) return null;
		// Mapping information between editor's lines and viewer's elements is
		// embedded into elements by the renderer.
		// See also renderer/MdToHtml/rules/source_map.ts.
		const elems = doc.getElementsByClassName('maps-to-line');
		const map: SyncScrollMap = { line: [0], percent: [0], viewHeight: height };
		// Each map entry is total-ordered.
		let last = 0;
		for (let i = 0; i < elems.length; i++) {
			const top = elems[i].getBoundingClientRect().top - offset;
			const line = Number(elems[i].getAttribute('source-line'));
			const percent = Math.max(0, Math.min(1, top / height));
			if (map.line[last] < line && map.percent[last] < percent) {
				map.line.push(line);
				map.percent.push(percent);
				last += 1;
			}
		}
		if (map.percent[last] < 1) {
			map.line.push(1e10);
			map.percent.push(1);
		} else {
			map.line[last] = 1e10;
		}
		this.map_ = map;
		return map;
	}
}
