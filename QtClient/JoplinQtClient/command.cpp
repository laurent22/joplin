#include "command.h"

namespace jop {

Command::Command(const QStringList &arguments) : name_("help"), args_(arguments) {
	args_.removeFirst();
	if (args_.size() >= 1) {
		name_ = args_.takeFirst();
	}
}

QString Command::name() const {
	return name_;
}

std::map<QString, QString> Command::flags() const {
	return flags_;
}

QStringList Command::args() const {
	return args_;
}

}
