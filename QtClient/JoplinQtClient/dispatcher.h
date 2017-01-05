#ifndef DISPATCHER_H
#define DISPATCHER_H

#include <stable.h>

namespace jop {

class Dispatcher : public QObject {

	Q_OBJECT

public:

	Dispatcher();
	void emitFolderCreated(const QString& folderId);
	void emitFolderUpdated(const QString& folderId);
	void emitFolderDeleted(const QString& folderId);

signals:

	void folderCreated(const QString& folderId);
	void folderUpdated(const QString& folderId);
	void folderDeleted(const QString& folderId);

};

Dispatcher& dispatcher();

}

#endif // DISPATCHER_H
