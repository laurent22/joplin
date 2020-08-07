class BaseService {
	logger() {
		if (this.instanceLogger_) return this.instanceLogger_;
		if (!BaseService.logger_) throw new Error('BaseService.logger_ not set!!');
		return BaseService.logger_;
	}

	setLogger(v) {
		this.instanceLogger_ = v;
	}
}

BaseService.logger_ = null;

module.exports = BaseService;
