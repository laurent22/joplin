#ifndef CHANGE_H
#define CHANGE_H

#include <stable.h>

#include "database.h"

namespace jop {

class Change {

public:

	Change(Database& database);

private:

	Database& database_;

};

}

#endif // CHANGE_H
