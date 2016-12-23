#ifndef FOLDERSERVICE_H
#define FOLDERSERVICE_H

#include <stable.h>
#include "database.h"
#include "models/folder.h"

namespace jop {

class FolderService {

public:

	FolderService();
	FolderService(Database& database);
	int count() const;
	Folder byId(const QString &id) const;
	//Folder partialAt(int index) const;
	const QList<Folder> overviewList() const;

private:

	Database database_;
	mutable QList<Folder> cache_;

};

}

#endif // FOLDERSERVICE_H
