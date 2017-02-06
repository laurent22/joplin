#ifndef FOLDER_H
#define FOLDER_H

#include <stable.h>
#include "models/item.h"
#include "models/note.h"

namespace jop {

class Folder : public Item {

	Q_OBJECT

public:

	Folder();

	static int count(const QString& parentId);
	static std::vector<std::unique_ptr<Folder>> all(const QString& orderBy = "title");
	static std::vector<std::unique_ptr<Folder>> pathToFolders(const QString& path, bool returnLast, int& errorCode);
	static QString pathBaseName(const QString& path);
	static std::unique_ptr<Folder> root();

	//Table table() const;
	bool primaryKeyIsUuid() const;
	bool trackChanges() const;
	int noteCount() const;
	std::vector<std::unique_ptr<Note>> notes(const QString& orderBy, int limit, int offset = 0) const;
	std::vector<std::unique_ptr<BaseModel>> children(const QString &orderBy = QString("title"), int limit = 0, int offset = 0) const;
	int noteIndexById(const QString& orderBy, const QString &id) const;
	QString displayTitle() const;

};

}

#endif // FOLDER_H
