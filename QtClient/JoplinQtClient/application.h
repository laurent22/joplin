#ifndef APPLICATION_H
#define APPLICATION_H

#include <stable.h>

#include "database.h"
#include "models/foldermodel.h"
#include "models/notemodel.h"
#include "webapi.h"
#include "synchronizer.h"
#include "window.h"
#include "folderlistcontroller.h"

namespace jop {

class Application : public QGuiApplication {

	Q_OBJECT

public:

	Application(int &argc, char **argv);
	~Application();
	void login(const QString& email, const QString& password);

private:

	Window view_;
	FolderModel folderModel_;
	NoteModel noteModel_;
	QString selectedFolderId() const;
	QString selectedNoteId() const;
	WebApi api_;
	Synchronizer synchronizer_;
	QTimer synchronizerTimer_;
	FolderListController itemListController_;

	void afterSessionInitialization();

public slots:

	void view_currentFolderChanged();
	void view_currentNoteChanged();
	void view_addNoteButtonClicked();
	void view_addFolderButtonClicked();
	void view_syncButtonClicked();

	void api_requestDone(const QJsonObject& response, const QString& tag);

	void dispatcher_loginClicked(const QString &domain, const QString &email, const QString &password);
	void dispatcher_logoutClicked();

	void synchronizerTimer_timeout();

};

}

#endif // APPLICATION_H
