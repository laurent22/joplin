class JoplinError extends Error {

	constructor(message, code = null) {
		super(message);
		this.code_ = code;
	}

	get code() {
		return this.code_;
	}

}

module.exports = JoplinError;