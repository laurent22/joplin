#ifndef APPLICATION_H
#define APPLICATION_H

#include <stable.h>

#include "database.h"
#include "services/folderservice.h"
#include "models/foldermodel.h"

namespace jop {

class Application : public QGuiApplication {

	Q_OBJECT

public:

	Application(int &argc, char **argv);

private:

	QQuickView view_;
	Database db_;
	FolderService folderService_;
	FolderModel folderModel_;
	QString selectedFolderId() const;

public slots:

	void view_currentFolderChanged();

};

}

#endif // APPLICATION_H
