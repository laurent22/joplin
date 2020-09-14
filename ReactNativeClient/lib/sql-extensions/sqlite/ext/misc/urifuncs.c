/*
** 2020-01-11
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
******************************************************************************
**
** This SQLite extension implements various SQL functions used to access
** the following SQLite C-language APIs:
**
**         sqlite3_uri_parameter()
**         sqlite3_uri_boolean()
**         sqlite3_uri_int64()
**         sqlite3_uri_key()
**         sqlite3_filename_database()
**         sqlite3_filename_journal()
**         sqlite3_filename_wal()
**         sqlite3_db_filename()
**
** These SQL functions are for testing and demonstration purposes only.
**
**
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <assert.h>
#include <string.h>

/*
** SQL function:    sqlite3_db_filename(SCHEMA) 
**
** Return the filename corresponding to SCHEMA.
*/
static void func_db_filename(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *zSchema = (const char*)sqlite3_value_text(argv[0]);
  sqlite3 *db = sqlite3_context_db_handle(context);
  const char *zFile = sqlite3_db_filename(db, zSchema);
  sqlite3_result_text(context, zFile, -1, SQLITE_TRANSIENT);
}

/*
** SQL function:    sqlite3_uri_parameter(SCHEMA,NAME) 
**
** Return the value of the NAME query parameter to the database for SCHEMA
*/
static void func_uri_parameter(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *zSchema = (const char*)sqlite3_value_text(argv[0]);
  sqlite3 *db = sqlite3_context_db_handle(context);
  const char *zName = (const char*)sqlite3_value_text(argv[1]);
  const char *zFile = sqlite3_db_filename(db, zSchema);
  const char *zRes = sqlite3_uri_parameter(zFile, zName);
  sqlite3_result_text(context, zRes, -1, SQLITE_TRANSIENT);
}

/*
** SQL function:    sqlite3_uri_boolean(SCHEMA,NAME,DEFAULT) 
**
** Return the boolean value of the NAME query parameter to
** the database for SCHEMA
*/
static void func_uri_boolean(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *zSchema = (const char*)sqlite3_value_text(argv[0]);
  sqlite3 *db = sqlite3_context_db_handle(context);
  const char *zName = (const char*)sqlite3_value_text(argv[1]);
  const char *zFile = sqlite3_db_filename(db, zSchema);
  int iDflt = sqlite3_value_int(argv[2]);
  int iRes = sqlite3_uri_boolean(zFile, zName, iDflt);
  sqlite3_result_int(context, iRes);
}

/*
** SQL function:    sqlite3_uri_key(SCHEMA,N)
**
** Return the name of the Nth query parameter
*/
static void func_uri_key(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *zSchema = (const char*)sqlite3_value_text(argv[0]);
  sqlite3 *db = sqlite3_context_db_handle(context);
  int N = sqlite3_value_int(argv[1]);
  const char *zFile = sqlite3_db_filename(db, zSchema);
  const char *zRes = sqlite3_uri_key(zFile, N);
  sqlite3_result_text(context, zRes, -1, SQLITE_TRANSIENT);
}

/*
** SQL function:    sqlite3_uri_int64(SCHEMA,NAME,DEFAULT) 
**
** Return the int64 value of the NAME query parameter to
** the database for SCHEMA
*/
static void func_uri_int64(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *zSchema = (const char*)sqlite3_value_text(argv[0]);
  sqlite3 *db = sqlite3_context_db_handle(context);
  const char *zName = (const char*)sqlite3_value_text(argv[1]);
  const char *zFile = sqlite3_db_filename(db, zSchema);
  sqlite3_int64 iDflt = sqlite3_value_int64(argv[2]);
  sqlite3_int64 iRes = sqlite3_uri_int64(zFile, zName, iDflt);
  sqlite3_result_int64(context, iRes);
}

/*
** SQL function:    sqlite3_filename_database(SCHEMA)
**
** Return the database filename for SCHEMA
*/
static void func_filename_database(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *zSchema = (const char*)sqlite3_value_text(argv[0]);
  sqlite3 *db = sqlite3_context_db_handle(context);
  const char *zFile = sqlite3_db_filename(db, zSchema);
  const char *zRes = zFile ? sqlite3_filename_database(zFile) : 0;
  sqlite3_result_text(context, zRes, -1, SQLITE_TRANSIENT);
}

/*
** SQL function:    sqlite3_filename_journal(SCHEMA)
**
** Return the rollback journal filename for SCHEMA
*/
static void func_filename_journal(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *zSchema = (const char*)sqlite3_value_text(argv[0]);
  sqlite3 *db = sqlite3_context_db_handle(context);
  const char *zFile = sqlite3_db_filename(db, zSchema);
  const char *zRes = zFile ? sqlite3_filename_journal(zFile) : 0;
  sqlite3_result_text(context, zRes, -1, SQLITE_TRANSIENT);
}

/*
** SQL function:    sqlite3_filename_wal(SCHEMA)
**
** Return the WAL filename for SCHEMA
*/
static void func_filename_wal(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *zSchema = (const char*)sqlite3_value_text(argv[0]);
  sqlite3 *db = sqlite3_context_db_handle(context);
  const char *zFile = sqlite3_db_filename(db, zSchema);
  const char *zRes = zFile ? sqlite3_filename_wal(zFile) : 0;
  sqlite3_result_text(context, zRes, -1, SQLITE_TRANSIENT);
}

#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_urifuncs_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  static const struct {
    const char *zFuncName;
    int nArg;
    void (*xFunc)(sqlite3_context*,int,sqlite3_value**);
  } aFunc[] = {
    { "sqlite3_db_filename",       1, func_db_filename       },
    { "sqlite3_uri_parameter",     2, func_uri_parameter     },
    { "sqlite3_uri_boolean",       3, func_uri_boolean       },
    { "sqlite3_uri_int64",         3, func_uri_int64         },
    { "sqlite3_uri_key",           2, func_uri_key           },
    { "sqlite3_filename_database", 1, func_filename_database },
    { "sqlite3_filename_journal",  1, func_filename_journal  },
    { "sqlite3_filename_wal",      1, func_filename_wal      },
  };
  int rc = SQLITE_OK;
  int i;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  for(i=0; rc==SQLITE_OK && i<sizeof(aFunc)/sizeof(aFunc[0]); i++){
    rc = sqlite3_create_function(db, aFunc[i].zFuncName, aFunc[i].nArg,
                     SQLITE_UTF8, 0,
                     aFunc[i].xFunc, 0, 0);
  }
  return rc;
}
