class MdToHtml_PluginBase {

	constructor() {
		this.enabled_ = true;
	}

	setEnabled(v) {
		this.enabled_ = v;
	}

	enabled() {
		return this.enabled_;
	}

	disabled() {
		return !this.enabled();
	}

}

module.exports = MdToHtml_PluginBase;