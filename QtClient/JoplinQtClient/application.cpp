#include "application.h"

#include "models/folder.h"
#include "database.h"
#include "models/foldermodel.h"
#include "services/folderservice.h"

using namespace jop;

Application::Application(int &argc, char **argv) : QGuiApplication(argc, argv) {
	db_ = Database("D:/Web/www/joplin/QtClient/data/notes.sqlite");
	folderService_ = FolderService(db_);
	folderModel_.setService(folderService_);

	noteService_ = NoteService(db_);
	noteModel_.setService(noteService_);

	view_.setResizeMode(QQuickView::SizeRootObjectToView);
	QQmlContext *ctxt = view_.rootContext();
	ctxt->setContextProperty("folderListModel", &folderModel_);
	ctxt->setContextProperty("noteListModel", &noteModel_);
	ctxt->setContextProperty("noteModel", &selectedQmlNote_);

	view_.setSource(QUrl("qrc:/main.qml"));

	QObject* rootObject = (QObject*)view_.rootObject();

	connect(rootObject, SIGNAL(currentFolderChanged()), this, SLOT(view_currentFolderChanged()));
	connect(rootObject, SIGNAL(currentNoteChanged()), this, SLOT(view_currentNoteChanged()));

	view_.show();
}

QString Application::selectedFolderId() const {
	QObject* rootObject = (QObject*)view_.rootObject();

	int index = rootObject->property("currentFolderIndex").toInt();
	QModelIndex modelIndex = folderModel_.index(index);
	return folderModel_.data(modelIndex, FolderModel::IdRole).toString();
}

QString Application::selectedNoteId() const {
	QObject* rootObject = (QObject*)view_.rootObject();

	int index = rootObject->property("currentNoteIndex").toInt();
	QModelIndex modelIndex = noteModel_.index(index);
	return noteModel_.data(modelIndex, NoteModel::IdRole).toString();
}

void Application::view_currentFolderChanged() {
	QString folderId = selectedFolderId();
	noteCollection_ = NoteCollection(db_, folderId, "title ASC");
	noteModel_.setCollection(noteCollection_);
}

void Application::view_currentNoteChanged() {
	QString noteId = selectedNoteId();
	Note note = noteCollection_.byId(noteId);
	selectedQmlNote_.setNote(note);
}
