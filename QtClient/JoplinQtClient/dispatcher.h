#ifndef DISPATCHER_H
#define DISPATCHER_H

namespace jop {

class Dispatcher : public QObject {

	Q_OBJECT

public:

	Dispatcher();
	//static Dispatcher& instance();

signals:

	void folderCreated(const QString& id);

private:

	//static Dispatcher& instance_;

};

Dispatcher& dispatcher();

}

#endif // DISPATCHER_H
