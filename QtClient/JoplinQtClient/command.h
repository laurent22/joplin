#ifndef COMMAND_H
#define COMMAND_H

#include <stable.h>

namespace jop {

class Command {

public:

	Command(const QStringList& arguments);
	QString name() const;
	std::map<QString, QString> flags() const;
	QStringList args() const;

private:

	QString name_;
	std::map<QString, QString> flags_;
	QStringList args_;

};

}

#endif // COMMAND_H
