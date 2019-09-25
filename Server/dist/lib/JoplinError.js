class JoplinError extends Error {
	constructor(message, code = null) {
		super(message);
		this.code = code;
	}
}

module.exports = JoplinError;
