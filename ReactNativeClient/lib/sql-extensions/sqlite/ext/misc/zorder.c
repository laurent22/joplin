/*
** 2018-02-09
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
** SQL functions for z-order (Morton code) transformations.
**
**      zorder(X0,X0,..,xN)      Generate an N+1 dimension Morton code
**
**      unzorder(Z,N,I)          Extract the I-th dimension from N-dimensional
**                               Morton code Z.
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <assert.h>
#include <string.h>

/*
** Functions:     zorder(X0,X1,....)
**
** Convert integers X0, X1, ... into morton code.
**
** The output is a signed 64-bit integer.  If any argument is too large,
** an error is thrown.
*/
static void zorderFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  sqlite3_int64 z, x[63];
  int i, j;
  z = 0;
  for(i=0; i<argc; i++){
    x[i] = sqlite3_value_int64(argv[i]);
  }
  if( argc>0 ){
    for(i=0; i<63; i++){
      j = i%argc;
      z |= (x[j]&1)<<i;
      x[j] >>= 1;
    }
  }
  sqlite3_result_int64(context, z);
  for(i=0; i<argc; i++){
    if( x[i] ){
      sqlite3_result_error(context, "parameter too large", -1);
    }
  }
}


/*
** Functions:     unzorder(Z,N,I)
**
** Assuming that Z is an N-dimensional Morton code, extract the I-th
** dimension.
*/
static void unzorderFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  sqlite3_int64 z, n, i, x;
  int j, k;
  z = sqlite3_value_int64(argv[0]);
  n = sqlite3_value_int64(argv[1]);
  i = sqlite3_value_int64(argv[2]);
  x = 0;
  for(k=0, j=i; j<63; j+=n, k++){
    x |= ((z>>j)&1)<<k;
  }
  sqlite3_result_int64(context, x);
}


#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_zorder_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  rc = sqlite3_create_function(db, "zorder", -1, SQLITE_UTF8, 0,
                               zorderFunc, 0, 0);
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_function(db, "unzorder", 3, SQLITE_UTF8, 0,
                               unzorderFunc, 0, 0);
  }
  return rc;
}
