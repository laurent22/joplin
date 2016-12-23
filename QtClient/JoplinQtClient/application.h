#ifndef APPLICATION_H
#define APPLICATION_H

#include <stable.h>

#include "database.h"
#include "services/folderservice.h"
#include "services/noteservice.h"
#include "models/foldermodel.h"
#include "models/notecollection.h"
#include "services/notecache.h"
#include "models/notemodel.h"
#include "models/qmlnote.h"

namespace jop {

class Application : public QGuiApplication {

	Q_OBJECT

public:

	Application(int &argc, char **argv);

private:

	QQuickView view_;
	Database db_;
	FolderService folderService_;
	NoteCollection noteCollection_;
	NoteService noteService_;
	FolderModel folderModel_;
	NoteModel noteModel_;
	QString selectedFolderId() const;
	QString selectedNoteId() const;
	NoteCache noteCache_;
	QmlNote selectedQmlNote_;

public slots:

	void view_currentFolderChanged();
	void view_currentNoteChanged();

};

}

#endif // APPLICATION_H
