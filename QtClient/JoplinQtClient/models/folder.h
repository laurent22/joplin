#ifndef FOLDER_H
#define FOLDER_H

#include <stable.h>
#include "models/item.h"

namespace jop {

class Folder : public Item {

public:

	Folder();

	static int count();
	static QVector<Folder> all(const QString& orderBy);

	Table table() const;
	bool primaryKeyIsUuid() const;
	bool trackChanges() const;

private:

};

}

#endif // FOLDER_H
