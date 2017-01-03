#ifndef ENUM_H
#define ENUM_H

#include <stable.h>

namespace jop {

enum Table { UndefinedTable, FoldersTable, NotesTable, ChangesTable };

// Note "DELETE" is a reserved keyword so we need to use "DEL"
enum HttpMethod { UndefinedMethod, HEAD, GET, PUT, POST, DEL, PATCH };

}

#endif // ENUM_H
