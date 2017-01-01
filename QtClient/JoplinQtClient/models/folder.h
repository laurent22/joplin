#ifndef FOLDER_H
#define FOLDER_H

#include <stable.h>
#include "models/item.h"

namespace jop {

class Folder : public Item {

public:

	Folder();
	bool isNew() const;
	bool save();
	bool dispose();

	static int count();
	static QVector<Folder> all(const QString& orderBy);

private:

};

}

#endif // FOLDER_H
