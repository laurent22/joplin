#ifndef APPLICATION_H
#define APPLICATION_H

#include <stable.h>

#include "database.h"
#include "models/foldermodel.h"
#include "models/notecollection.h"
#include "models/foldercollection.h"
#include "models/notemodel.h"
#include "models/qmlnote.h"
#include "webapi.h"
#include "synchronizer.h"

namespace jop {

class Application : public QGuiApplication {

	Q_OBJECT

public:

	Application(int &argc, char **argv);

private:

	QQuickView view_;
	Database db_;
	NoteCollection noteCollection_;
	FolderModel folderModel_;
	NoteModel noteModel_;
	QString selectedFolderId() const;
	QString selectedNoteId() const;
	QmlNote selectedQmlNote_;
	WebApi api_;
	Synchronizer synchronizer_;

	void afterSessionInitialization();

public slots:

	void view_currentFolderChanged();
	void view_currentNoteChanged();
	void view_addNoteButtonClicked();
	void view_addFolderButtonClicked();
	void api_requestDone(const QJsonObject& response, const QString& tag);

};

}

#endif // APPLICATION_H
