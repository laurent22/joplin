/*
** 2017 October 11
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
** This module exports a single C function:
**
**   int sqlite3_check_freelist(sqlite3 *db, const char *zDb);
**
** This function checks the free-list in database zDb (one of "main", 
** "temp", etc.) and reports any errors by invoking the sqlite3_log()
** function. It returns SQLITE_OK if successful, or an SQLite error
** code otherwise. It is not an error if the free-list is corrupted but
** no IO or OOM errors occur.
**
** If this file is compiled and loaded as an SQLite loadable extension,
** it adds an SQL function "checkfreelist" to the database handle, to
** be invoked as follows:
**
**   SELECT checkfreelist(<database-name>);
**
** This function performs the same checks as sqlite3_check_freelist(),
** except that it returns all error messages as a single text value,
** separated by newline characters. If the freelist is not corrupted
** in any way, an empty string is returned.
**
** To compile this module for use as an SQLite loadable extension:
**
**   gcc -Os -fPIC -shared checkfreelist.c -o checkfreelist.so
*/

#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1

#ifndef SQLITE_AMALGAMATION
# include <string.h>
# include <stdio.h>
# include <stdlib.h>
# include <assert.h>
# define ALWAYS(X)  1
# define NEVER(X)   0
  typedef unsigned char u8;
  typedef unsigned short u16;
  typedef unsigned int u32;
#define get4byte(x) (        \
    ((u32)((x)[0])<<24) +    \
    ((u32)((x)[1])<<16) +    \
    ((u32)((x)[2])<<8) +     \
    ((u32)((x)[3]))          \
)
#endif

/*
** Execute a single PRAGMA statement and return the integer value returned
** via output parameter (*pnOut).
**
** The SQL statement passed as the third argument should be a printf-style
** format string containing a single "%s" which will be replace by the
** value passed as the second argument. e.g.
**
**   sqlGetInteger(db, "main", "PRAGMA %s.page_count", pnOut)
**
** executes "PRAGMA main.page_count" and stores the results in (*pnOut).
*/
static int sqlGetInteger(
  sqlite3 *db,                    /* Database handle */
  const char *zDb,                /* Database name ("main", "temp" etc.) */
  const char *zFmt,               /* SQL statement format */
  u32 *pnOut                      /* OUT: Integer value */
){
  int rc, rc2;
  char *zSql;
  sqlite3_stmt *pStmt = 0;
  int bOk = 0;

  zSql = sqlite3_mprintf(zFmt, zDb);
  if( zSql==0 ){
    rc = SQLITE_NOMEM;
  }else{
    rc = sqlite3_prepare_v2(db, zSql, -1, &pStmt, 0);
    sqlite3_free(zSql);
  }

  if( rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pStmt) ){
    *pnOut = (u32)sqlite3_column_int(pStmt, 0);
    bOk = 1;
  }

  rc2 = sqlite3_finalize(pStmt);
  if( rc==SQLITE_OK ) rc = rc2;
  if( rc==SQLITE_OK && bOk==0 ) rc = SQLITE_ERROR;
  return rc;
}

/*
** Argument zFmt must be a printf-style format string and must be 
** followed by its required arguments. If argument pzOut is NULL, 
** then the results of printf()ing the format string are passed to
** sqlite3_log(). Otherwise, they are appended to the string
** at (*pzOut).
*/
static int checkFreelistError(char **pzOut, const char *zFmt, ...){
  int rc = SQLITE_OK;
  char *zErr = 0;
  va_list ap;

  va_start(ap, zFmt);
  zErr = sqlite3_vmprintf(zFmt, ap);
  if( zErr==0 ){
    rc = SQLITE_NOMEM;
  }else{
    if( pzOut ){
      *pzOut = sqlite3_mprintf("%s%z%s", *pzOut?"\n":"", *pzOut, zErr);
      if( *pzOut==0 ) rc = SQLITE_NOMEM;
    }else{
      sqlite3_log(SQLITE_ERROR, "checkfreelist: %s", zErr);
    }
    sqlite3_free(zErr);
  }
  va_end(ap);
  return rc;
}

static int checkFreelist(
  sqlite3 *db, 
  const char *zDb,
  char **pzOut
){
  /* This query returns one row for each page on the free list. Each row has
  ** two columns - the page number and page content.  */
  const char *zTrunk = 
    "WITH freelist_trunk(i, d, n) AS ("
      "SELECT 1, NULL, sqlite_readint32(data, 32) "
      "FROM sqlite_dbpage(:1) WHERE pgno=1 "
        "UNION ALL "
      "SELECT n, data, sqlite_readint32(data) "
      "FROM freelist_trunk, sqlite_dbpage(:1) WHERE pgno=n "
    ")"
    "SELECT i, d FROM freelist_trunk WHERE i!=1;";

  int rc, rc2;                    /* Return code */
  sqlite3_stmt *pTrunk = 0;       /* Compilation of zTrunk */
  u32 nPage = 0;                  /* Number of pages in db */
  u32 nExpected = 0;              /* Expected number of free pages */
  u32 nFree = 0;                  /* Number of pages on free list */

  if( zDb==0 ) zDb = "main";

  if( (rc = sqlGetInteger(db, zDb, "PRAGMA %s.page_count", &nPage))
   || (rc = sqlGetInteger(db, zDb, "PRAGMA %s.freelist_count", &nExpected))
  ){
    return rc;
  }

  rc = sqlite3_prepare_v2(db, zTrunk, -1, &pTrunk, 0);
  if( rc!=SQLITE_OK ) return rc;
  sqlite3_bind_text(pTrunk, 1, zDb, -1, SQLITE_STATIC);
  while( rc==SQLITE_OK && sqlite3_step(pTrunk)==SQLITE_ROW ){
    u32 i;
    u32 iTrunk = (u32)sqlite3_column_int(pTrunk, 0);
    const u8 *aData = (const u8*)sqlite3_column_blob(pTrunk, 1);
    u32 nData = (u32)sqlite3_column_bytes(pTrunk, 1);
    u32 iNext = get4byte(&aData[0]);
    u32 nLeaf = get4byte(&aData[4]);

    if( nLeaf>((nData/4)-2-6) ){
      rc = checkFreelistError(pzOut, 
          "leaf count out of range (%d) on trunk page %d", 
          (int)nLeaf, (int)iTrunk
      );
      nLeaf = (nData/4) - 2 - 6;
    }

    nFree += 1+nLeaf;
    if( iNext>nPage ){
      rc = checkFreelistError(pzOut, 
          "trunk page %d is out of range", (int)iNext
      );
    }

    for(i=0; rc==SQLITE_OK && i<nLeaf; i++){
      u32 iLeaf = get4byte(&aData[8 + 4*i]);
      if( iLeaf==0 || iLeaf>nPage ){
        rc = checkFreelistError(pzOut,
            "leaf page %d is out of range (child %d of trunk page %d)", 
            (int)iLeaf, (int)i, (int)iTrunk
        );
      }
    }
  }

  if( rc==SQLITE_OK && nFree!=nExpected ){
    rc = checkFreelistError(pzOut,
        "free-list count mismatch: actual=%d header=%d", 
        (int)nFree, (int)nExpected
    );
  }

  rc2 = sqlite3_finalize(pTrunk);
  if( rc==SQLITE_OK ) rc = rc2;
  return rc;
}

int sqlite3_check_freelist(sqlite3 *db, const char *zDb){
  return checkFreelist(db, zDb, 0);
}

static void checkfreelist_function(
  sqlite3_context *pCtx,
  int nArg,
  sqlite3_value **apArg
){
  const char *zDb;
  int rc;
  char *zOut = 0;
  sqlite3 *db = sqlite3_context_db_handle(pCtx);

  assert( nArg==1 );
  zDb = (const char*)sqlite3_value_text(apArg[0]);
  rc = checkFreelist(db, zDb, &zOut);
  if( rc==SQLITE_OK ){
    sqlite3_result_text(pCtx, zOut?zOut:"ok", -1, SQLITE_TRANSIENT);
  }else{
    sqlite3_result_error_code(pCtx, rc);
  }

  sqlite3_free(zOut);
}

/*
** An SQL function invoked as follows:
**
**   sqlite_readint32(BLOB)           -- Decode 32-bit integer from start of blob
*/
static void readint_function(
  sqlite3_context *pCtx,
  int nArg,
  sqlite3_value **apArg
){
  const u8 *zBlob;
  int nBlob;
  int iOff = 0;
  u32 iRet = 0;

  if( nArg!=1 && nArg!=2 ){
    sqlite3_result_error(
        pCtx, "wrong number of arguments to function sqlite_readint32()", -1
    );
    return;
  }
  if( nArg==2 ){
    iOff = sqlite3_value_int(apArg[1]);
  }

  zBlob = sqlite3_value_blob(apArg[0]);
  nBlob = sqlite3_value_bytes(apArg[0]);

  if( nBlob>=(iOff+4) ){
    iRet = get4byte(&zBlob[iOff]);
  }

  sqlite3_result_int64(pCtx, (sqlite3_int64)iRet);
}

/*
** Register the SQL functions.
*/
static int cflRegister(sqlite3 *db){
  int rc = sqlite3_create_function(
      db, "sqlite_readint32", -1, SQLITE_UTF8, 0, readint_function, 0, 0
  );
  if( rc!=SQLITE_OK ) return rc;
  rc = sqlite3_create_function(
      db, "checkfreelist", 1, SQLITE_UTF8, 0, checkfreelist_function, 0, 0
  );
  return rc;
}

/*
** Extension load function.
*/
#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_checkfreelist_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  SQLITE_EXTENSION_INIT2(pApi);
  return cflRegister(db);
}
