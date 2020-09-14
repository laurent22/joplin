/*
** 2017-12-17
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
** Utility functions sqlar_compress() and sqlar_uncompress(). Useful
** for working with sqlar archives and used by the shell tool's built-in
** sqlar support.
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <zlib.h>
#include <assert.h>

/*
** Implementation of the "sqlar_compress(X)" SQL function.
**
** If the type of X is SQLITE_BLOB, and compressing that blob using
** zlib utility function compress() yields a smaller blob, return the
** compressed blob. Otherwise, return a copy of X.
**
** SQLar uses the "zlib format" for compressed content.  The zlib format
** contains a two-byte identification header and a four-byte checksum at
** the end.  This is different from ZIP which uses the raw deflate format.
**
** Future enhancements to SQLar might add support for new compression formats.
** If so, those new formats will be identified by alternative headers in the
** compressed data.
*/
static void sqlarCompressFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  assert( argc==1 );
  if( sqlite3_value_type(argv[0])==SQLITE_BLOB ){
    const Bytef *pData = sqlite3_value_blob(argv[0]);
    uLong nData = sqlite3_value_bytes(argv[0]);
    uLongf nOut = compressBound(nData);
    Bytef *pOut;

    pOut = (Bytef*)sqlite3_malloc(nOut);
    if( pOut==0 ){
      sqlite3_result_error_nomem(context);
      return;
    }else{
      if( Z_OK!=compress(pOut, &nOut, pData, nData) ){
        sqlite3_result_error(context, "error in compress()", -1);
      }else if( nOut<nData ){
        sqlite3_result_blob(context, pOut, nOut, SQLITE_TRANSIENT);
      }else{
        sqlite3_result_value(context, argv[0]);
      }
      sqlite3_free(pOut);
    }
  }else{
    sqlite3_result_value(context, argv[0]);
  }
}

/*
** Implementation of the "sqlar_uncompress(X,SZ)" SQL function
**
** Parameter SZ is interpreted as an integer. If it is less than or
** equal to zero, then this function returns a copy of X. Or, if
** SZ is equal to the size of X when interpreted as a blob, also
** return a copy of X. Otherwise, decompress blob X using zlib
** utility function uncompress() and return the results (another
** blob).
*/
static void sqlarUncompressFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  uLong nData;
  uLongf sz;

  assert( argc==2 );
  sz = sqlite3_value_int(argv[1]);

  if( sz<=0 || sz==(nData = sqlite3_value_bytes(argv[0])) ){
    sqlite3_result_value(context, argv[0]);
  }else{
    const Bytef *pData= sqlite3_value_blob(argv[0]);
    Bytef *pOut = sqlite3_malloc(sz);
    if( Z_OK!=uncompress(pOut, &sz, pData, nData) ){
      sqlite3_result_error(context, "error in uncompress()", -1);
    }else{
      sqlite3_result_blob(context, pOut, sz, SQLITE_TRANSIENT);
    }
    sqlite3_free(pOut);
  }
}


#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_sqlar_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  rc = sqlite3_create_function(db, "sqlar_compress", 1, 
                               SQLITE_UTF8|SQLITE_INNOCUOUS, 0,
                               sqlarCompressFunc, 0, 0);
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_function(db, "sqlar_uncompress", 2,
                                 SQLITE_UTF8|SQLITE_INNOCUOUS, 0,
                                 sqlarUncompressFunc, 0, 0);
  }
  return rc;
}
