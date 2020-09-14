/*
** 2016-08-09
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
**
** This file demonstrates how to create an SQL function that is a pass-through
** for integer values (it returns a copy of its argument) but also saves the
** value that is passed through into a C-language variable.  The address of
** the C-language variable is supplied as the second argument.
**
** This allows, for example, a counter to incremented and the original
** value retrieved, atomically, using a single statement:
**
**    UPDATE counterTab SET cnt=remember(cnt,$PTR)+1 WHERE id=$ID
**
** Prepare the above statement once.  Then to use it, bind the address
** of the output variable to $PTR using sqlite3_bind_pointer() with a
** pointer type of "carray" and bind the id of the counter to $ID and
** run the prepared statement.
**
** This implementation of the remember() function uses a "carray"
** pointer so that it can share pointers with the carray() extension.
**
** One can imagine doing similar things with floating-point values and
** strings, but this demonstration extension will stick to using just
** integers.
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <assert.h>

/*
**      remember(V,PTR)
**
** Return the integer value V.  Also save the value of V in a
** C-language variable whose address is PTR.
*/
static void rememberFunc(
  sqlite3_context *pCtx,
  int argc,
  sqlite3_value **argv
){
  sqlite3_int64 v;
  sqlite3_int64 *ptr;
  assert( argc==2 );
  v = sqlite3_value_int64(argv[0]);
  ptr = sqlite3_value_pointer(argv[1], "carray");
  if( ptr ) *ptr = v;
  sqlite3_result_int64(pCtx, v);
}

#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_remember_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  rc = sqlite3_create_function(db, "remember", 2, SQLITE_UTF8, 0,
                               rememberFunc, 0, 0);
  return rc;
}
