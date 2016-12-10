#ifndef FOLDERCOLLECTION_H
#define FOLDERCOLLECTION_H

#include <stable.h>
#include "model/folder.h"

namespace jop {

class FolderCollection {

public:

	FolderCollection();
	void add(const Folder* folder);

private:

	std::vector<Folder*> collection_;

};

}

#endif // FOLDERCOLLECTION_H
