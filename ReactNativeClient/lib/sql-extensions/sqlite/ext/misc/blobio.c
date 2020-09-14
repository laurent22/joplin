/*
** 2019-03-30
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
** An SQL function that uses the incremental BLOB I/O mechanism of SQLite
** to read or write part of a blob.  This is intended for debugging use
** in the CLI.
**
**      readblob(SCHEMA,TABLE,COLUMN,ROWID,OFFSET,N)
**
** Returns N bytes of the blob starting at OFFSET.
**
**      writeblob(SCHEMA,TABLE,COLUMN,ROWID,OFFSET,NEWDATA)
**
** NEWDATA must be a blob.  The content of NEWDATA overwrites the
** existing BLOB data at SCHEMA.TABLE.COLUMN for row ROWID beginning
** at OFFSET bytes into the blob.
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <assert.h>
#include <string.h>

static void readblobFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  sqlite3_blob *pBlob = 0;
  const char *zSchema;
  const char *zTable;
  const char *zColumn;
  sqlite3_int64 iRowid;
  int iOfst;
  unsigned char *aData;
  int nData;
  sqlite3 *db;
  int rc;

  zSchema = (const char*)sqlite3_value_text(argv[0]);
  zTable = (const char*)sqlite3_value_text(argv[1]);
  if( zTable==0 ){
    sqlite3_result_error(context, "bad table name", -1);
    return;
  }
  zColumn = (const char*)sqlite3_value_text(argv[2]);
  if( zTable==0 ){
    sqlite3_result_error(context, "bad column name", -1);
    return;
  }
  iRowid = sqlite3_value_int64(argv[3]);
  iOfst = sqlite3_value_int(argv[4]);
  nData = sqlite3_value_int(argv[5]);
  if( nData<=0 ) return;
  aData = sqlite3_malloc64( nData+1 );
  if( aData==0 ){
    sqlite3_result_error_nomem(context);
    return;
  }
  db = sqlite3_context_db_handle(context);
  rc = sqlite3_blob_open(db, zSchema, zTable, zColumn, iRowid, 0, &pBlob);
  if( rc ){
    sqlite3_free(aData);
    sqlite3_result_error(context, "cannot open BLOB pointer", -1);
    return;
  }
  rc = sqlite3_blob_read(pBlob, aData, nData, iOfst);
  sqlite3_blob_close(pBlob);
  if( rc ){
    sqlite3_free(aData);
    sqlite3_result_error(context, "BLOB read failed", -1);
  }else{
    sqlite3_result_blob(context, aData, nData, sqlite3_free);
  }
}    

static void writeblobFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  sqlite3_blob *pBlob = 0;
  const char *zSchema;
  const char *zTable;
  const char *zColumn;
  sqlite3_int64 iRowid;
  int iOfst;
  unsigned char *aData;
  int nData;
  sqlite3 *db;
  int rc;

  zSchema = (const char*)sqlite3_value_text(argv[0]);
  zTable = (const char*)sqlite3_value_text(argv[1]);
  if( zTable==0 ){
    sqlite3_result_error(context, "bad table name", -1);
    return;
  }
  zColumn = (const char*)sqlite3_value_text(argv[2]);
  if( zTable==0 ){
    sqlite3_result_error(context, "bad column name", -1);
    return;
  }
  iRowid = sqlite3_value_int64(argv[3]);
  iOfst = sqlite3_value_int(argv[4]);
  if( sqlite3_value_type(argv[5])!=SQLITE_BLOB ){
    sqlite3_result_error(context, "6th argument must be a BLOB", -1);
    return;
  }
  nData = sqlite3_value_bytes(argv[5]);
  aData = (unsigned char *)sqlite3_value_blob(argv[5]);
  db = sqlite3_context_db_handle(context);
  rc = sqlite3_blob_open(db, zSchema, zTable, zColumn, iRowid, 1, &pBlob);
  if( rc ){
    sqlite3_result_error(context, "cannot open BLOB pointer", -1);
    return;
  }
  rc = sqlite3_blob_write(pBlob, aData, nData, iOfst);
  sqlite3_blob_close(pBlob);
  if( rc ){
    sqlite3_result_error(context, "BLOB write failed", -1);
  }
}    


#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_blobio_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  rc = sqlite3_create_function(db, "readblob", 6, SQLITE_UTF8, 0,
                               readblobFunc, 0, 0);
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_function(db, "writeblob", 6, SQLITE_UTF8, 0,
                               writeblobFunc, 0, 0);
  }
  return rc;
}
