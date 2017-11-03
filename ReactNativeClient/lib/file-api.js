const { isHidden } = require('lib/path-utils.js');
const { Logger } = require('lib/logger.js');

class FileApi {

	constructor(baseDir, driver) {
		this.baseDir_ = baseDir;
		this.driver_ = driver;
		this.logger_ = new Logger();
		this.syncTargetId_ = null;
	}

	driver() {
		return this.driver_;
	}

	setSyncTargetId(v) {
		this.syncTargetId_ = v;
	}

	syncTargetId() {
		if (this.syncTargetId_ === null) throw new Error('syncTargetId has not been set!!');
		return this.syncTargetId_;
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	fullPath_(path) {
		let output = this.baseDir_;
		if (path != '') output += '/' + path;
		return output;
	}

	// DRIVER MUST RETURN PATHS RELATIVE TO `path`
	list(path = '', options = null) {
		if (!options) options = {};
		if (!('includeHidden' in options)) options.includeHidden = false;
		if (!('context' in options)) options.context = null;

		this.logger().debug('list ' + this.baseDir_);

		return this.driver_.list(this.baseDir_, options).then((result) => {
			if (!options.includeHidden) {
				let temp = [];
				for (let i = 0; i < result.items.length; i++) {
					if (!isHidden(result.items[i].path)) temp.push(result.items[i]);
				}
				result.items = temp;
			}
			return result;
		});
	}

	setTimestamp(path, timestampMs) {
		this.logger().debug('setTimestamp ' + this.fullPath_(path));
		return this.driver_.setTimestamp(this.fullPath_(path), timestampMs);
	}

	mkdir(path) {
		this.logger().debug('mkdir ' + this.fullPath_(path));
		return this.driver_.mkdir(this.fullPath_(path));
	}

	stat(path) {
		this.logger().debug('stat ' + this.fullPath_(path));
		return this.driver_.stat(this.fullPath_(path)).then((output) => {
			if (!output) return output;
			output.path = path;
			return output;
		});
	}

	get(path, options = null) {
		if (!options) options = {};
		if (!options.encoding) options.encoding = 'utf8';
		this.logger().debug('get ' + this.fullPath_(path));
		return this.driver_.get(this.fullPath_(path), options);
	}

	put(path, content, options = null) {
		this.logger().debug('put ' + this.fullPath_(path));
		return this.driver_.put(this.fullPath_(path), content, options);
	}

	delete(path) {
		this.logger().debug('delete ' + this.fullPath_(path));
		return this.driver_.delete(this.fullPath_(path));
	}

	move(oldPath, newPath) {
		this.logger().debug('move ' + this.fullPath_(oldPath) + ' => ' + this.fullPath_(newPath));
		return this.driver_.move(this.fullPath_(oldPath), this.fullPath_(newPath));
	}

	format() {
		return this.driver_.format();
	}

	delta(path, options = null) {
		this.logger().debug('delta ' + this.fullPath_(path));
		return this.driver_.delta(this.fullPath_(path), options);
	}

}

module.exports = { FileApi };