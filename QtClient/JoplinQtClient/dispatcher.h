#ifndef DISPATCHER_H
#define DISPATCHER_H

#include <stable.h>

namespace jop {

class Dispatcher : public QObject {

	Q_OBJECT

public:

	Dispatcher();

public slots:

	void emitFolderCreated(const QString& folderId);
	void emitFolderUpdated(const QString& folderId);
	void emitFolderDeleted(const QString& folderId);
	void emitLoginClicked(const QString& domain, const QString& email, const QString &password);
	void emitLoginStarted();
	void emitLoginFailed();
	void emitLoginSuccess();

signals:

	void folderCreated(const QString& folderId);
	void folderUpdated(const QString& folderId);
	void folderDeleted(const QString& folderId);
	void loginClicked(const QString& domain, const QString& email, const QString& password);
	void loginStarted();
	void loginFailed();
	void loginSuccess();

};

Dispatcher& dispatcher();

}

#endif // DISPATCHER_H
