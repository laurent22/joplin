/*
** 2014-09-21
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
** This SQLite extension adds a debug "authorizer" callback to the database
** connection.  The callback merely writes the authorization request to
** standard output and returns SQLITE_OK.
**
** This extension can be used (for example) in the command-line shell to
** trace the operation of the authorizer.
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <stdio.h>

/*
** Display the authorization request
*/
static int authCallback(
  void *pClientData,
  int op,
  const char *z1,
  const char *z2,
  const char *z3,
  const char *z4
){
  const char *zOp;
  char zOpSpace[50];
  switch( op ){
    case SQLITE_CREATE_INDEX:        zOp = "CREATE_INDEX";        break;
    case SQLITE_CREATE_TABLE:        zOp = "CREATE_TABLE";        break;
    case SQLITE_CREATE_TEMP_INDEX:   zOp = "CREATE_TEMP_INDEX";   break;
    case SQLITE_CREATE_TEMP_TABLE:   zOp = "CREATE_TEMP_TABLE";   break;
    case SQLITE_CREATE_TEMP_TRIGGER: zOp = "CREATE_TEMP_TRIGGER"; break;
    case SQLITE_CREATE_TEMP_VIEW:    zOp = "CREATE_TEMP_VIEW";    break;
    case SQLITE_CREATE_TRIGGER:      zOp = "CREATE_TRIGGER";      break;
    case SQLITE_CREATE_VIEW:         zOp = "CREATE_VIEW";         break;
    case SQLITE_DELETE:              zOp = "DELETE";              break;
    case SQLITE_DROP_INDEX:          zOp = "DROP_INDEX";          break;
    case SQLITE_DROP_TABLE:          zOp = "DROP_TABLE";          break;
    case SQLITE_DROP_TEMP_INDEX:     zOp = "DROP_TEMP_INDEX";     break;
    case SQLITE_DROP_TEMP_TABLE:     zOp = "DROP_TEMP_TABLE";     break;
    case SQLITE_DROP_TEMP_TRIGGER:   zOp = "DROP_TEMP_TRIGGER";   break;
    case SQLITE_DROP_TEMP_VIEW:      zOp = "DROP_TEMP_VIEW";      break;
    case SQLITE_DROP_TRIGGER:        zOp = "DROP_TRIGGER";        break;
    case SQLITE_DROP_VIEW:           zOp = "DROP_VIEW";           break;
    case SQLITE_INSERT:              zOp = "INSERT";              break;
    case SQLITE_PRAGMA:              zOp = "PRAGMA";              break;
    case SQLITE_READ:                zOp = "READ";                break;
    case SQLITE_SELECT:              zOp = "SELECT";              break;
    case SQLITE_TRANSACTION:         zOp = "TRANSACTION";         break;
    case SQLITE_UPDATE:              zOp = "UPDATE";              break;
    case SQLITE_ATTACH:              zOp = "ATTACH";              break;
    case SQLITE_DETACH:              zOp = "DETACH";              break;
    case SQLITE_ALTER_TABLE:         zOp = "ALTER_TABLE";         break;
    case SQLITE_REINDEX:             zOp = "REINDEX";             break;
    case SQLITE_ANALYZE:             zOp = "ANALYZE";             break;
    case SQLITE_CREATE_VTABLE:       zOp = "CREATE_VTABLE";       break;
    case SQLITE_DROP_VTABLE:         zOp = "DROP_VTABLE";         break;
    case SQLITE_FUNCTION:            zOp = "FUNCTION";            break;
    case SQLITE_SAVEPOINT:           zOp = "SAVEPOINT";           break;
    case SQLITE_COPY:                zOp = "COPY";                break;
    case SQLITE_RECURSIVE:           zOp = "RECURSIVE";           break;


    default: {
      sqlite3_snprintf(sizeof(zOpSpace), zOpSpace, "%d", op);
      zOp = zOpSpace;
      break;
    }
  }
  if( z1==0 ) z1 = "NULL";
  if( z2==0 ) z2 = "NULL";
  if( z3==0 ) z3 = "NULL";
  if( z4==0 ) z4 = "NULL";
  printf("AUTH: %s,%s,%s,%s,%s\n", zOp, z1, z2, z3, z4);
  return SQLITE_OK;
}



#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_showauth_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  rc = sqlite3_set_authorizer(db, authCallback, 0);
  return rc;
}
