/*
** Link this program against an SQLite library of unknown provenance in order
** to display the compile-time maximum values for various settings.
*/
#include "sqlite3.h"
#include <stdio.h>

static const struct {
  int eCode;
  char *zName;
} aLimit[] = {
  { SQLITE_LIMIT_LENGTH,                "SQLITE_MAX_LENGTH"               },
  { SQLITE_LIMIT_SQL_LENGTH,            "SQLITE_MAX_SQL_LENGTH"           },
  { SQLITE_LIMIT_COLUMN,                "SQLITE_MAX_COLUMN"               },
  { SQLITE_LIMIT_EXPR_DEPTH,            "SQLITE_MAX_EXPR_DEPTH"           },
  { SQLITE_LIMIT_COMPOUND_SELECT,       "SQLITE_MAX_COMPOUND_SELECT"      },
  { SQLITE_LIMIT_VDBE_OP,               "SQLITE_MAX_VDBE_OP"              },
  { SQLITE_LIMIT_FUNCTION_ARG,          "SQLITE_MAX_FUNCTION_ARG"         },
  { SQLITE_LIMIT_ATTACHED,              "SQLITE_MAX_ATTACHED"             },
  { SQLITE_LIMIT_LIKE_PATTERN_LENGTH,   "SQLITE_MAX_LIKE_PATTERN_LENGTH"  },
  { SQLITE_LIMIT_VARIABLE_NUMBER,       "SQLITE_MAX_VARIABLE_NUMBER"      },
  { SQLITE_LIMIT_TRIGGER_DEPTH,         "SQLITE_MAX_TRIGGER_DEPTH"        },
  { SQLITE_LIMIT_WORKER_THREADS,        "SQLITE_MAX_WORKER_THREADS"       },
};

static int maxLimit(sqlite3 *db, int eCode){
  int iOrig = sqlite3_limit(db, eCode, 0x7fffffff);
  return sqlite3_limit(db, eCode, iOrig);
}

int main(int argc, char **argv){
  sqlite3 *db;
  int j, rc;
  rc = sqlite3_open(":memory:", &db);
  if( rc==SQLITE_OK ){
    for(j=0; j<sizeof(aLimit)/sizeof(aLimit[0]); j++){
      printf("%-35s %10d\n", aLimit[j].zName, maxLimit(db, aLimit[j].eCode));
    }
    sqlite3_close(db);
  } 
}
