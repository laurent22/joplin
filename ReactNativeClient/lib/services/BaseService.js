class BaseService {
	logger() {
		if (!BaseService.logger_) throw new Error('BaseService.logger_ not set!!');
		return BaseService.logger_;
	}
}

BaseService.logger_ = null;

module.exports = BaseService;
