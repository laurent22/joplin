/*
** 2018-04-19
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
** This file implements a table-valued function:
**
**      prefixes('abcdefg')
**
** The function has a single (non-HIDDEN) column named prefix that takes
** on all prefixes of the string in its argument, including an empty string
** and the input string itself.  The order of prefixes is from longest
** to shortest.
*/
#if !defined(SQLITE_CORE) || !defined(SQLITE_OMIT_VIRTUALTABLE)
#if !defined(SQLITEINT_H)
#include "sqlite3ext.h"
#endif
SQLITE_EXTENSION_INIT1
#include <string.h>
#include <assert.h>

/* prefixes_vtab is a subclass of sqlite3_vtab which is
** underlying representation of the virtual table
*/
typedef struct prefixes_vtab prefixes_vtab;
struct prefixes_vtab {
  sqlite3_vtab base;  /* Base class - must be first */
  /* No additional fields are necessary */
};

/* prefixes_cursor is a subclass of sqlite3_vtab_cursor which will
** serve as the underlying representation of a cursor that scans
** over rows of the result
*/
typedef struct prefixes_cursor prefixes_cursor;
struct prefixes_cursor {
  sqlite3_vtab_cursor base;  /* Base class - must be first */
  sqlite3_int64 iRowid;      /* The rowid */
  char *zStr;                /* Original string to be prefixed */
  int nStr;                  /* Length of the string in bytes */
};

/*
** The prefixesConnect() method is invoked to create a new
** template virtual table.
**
** Think of this routine as the constructor for prefixes_vtab objects.
**
** All this routine needs to do is:
**
**    (1) Allocate the prefixes_vtab object and initialize all fields.
**
**    (2) Tell SQLite (via the sqlite3_declare_vtab() interface) what the
**        result set of queries against the virtual table will look like.
*/
static int prefixesConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  prefixes_vtab *pNew;
  int rc;

  rc = sqlite3_declare_vtab(db,
           "CREATE TABLE prefixes(prefix TEXT, original_string TEXT HIDDEN)"
       );
  if( rc==SQLITE_OK ){
    pNew = sqlite3_malloc( sizeof(*pNew) );
    *ppVtab = (sqlite3_vtab*)pNew;
    if( pNew==0 ) return SQLITE_NOMEM;
    memset(pNew, 0, sizeof(*pNew));
    sqlite3_vtab_config(db, SQLITE_VTAB_INNOCUOUS);
  }
  return rc;
}

/*
** This method is the destructor for prefixes_vtab objects.
*/
static int prefixesDisconnect(sqlite3_vtab *pVtab){
  prefixes_vtab *p = (prefixes_vtab*)pVtab;
  sqlite3_free(p);
  return SQLITE_OK;
}

/*
** Constructor for a new prefixes_cursor object.
*/
static int prefixesOpen(sqlite3_vtab *p, sqlite3_vtab_cursor **ppCursor){
  prefixes_cursor *pCur;
  pCur = sqlite3_malloc( sizeof(*pCur) );
  if( pCur==0 ) return SQLITE_NOMEM;
  memset(pCur, 0, sizeof(*pCur));
  *ppCursor = &pCur->base;
  return SQLITE_OK;
}

/*
** Destructor for a prefixes_cursor.
*/
static int prefixesClose(sqlite3_vtab_cursor *cur){
  prefixes_cursor *pCur = (prefixes_cursor*)cur;
  sqlite3_free(pCur->zStr);
  sqlite3_free(pCur);
  return SQLITE_OK;
}


/*
** Advance a prefixes_cursor to its next row of output.
*/
static int prefixesNext(sqlite3_vtab_cursor *cur){
  prefixes_cursor *pCur = (prefixes_cursor*)cur;
  pCur->iRowid++;
  return SQLITE_OK;
}

/*
** Return values of columns for the row at which the prefixes_cursor
** is currently pointing.
*/
static int prefixesColumn(
  sqlite3_vtab_cursor *cur,   /* The cursor */
  sqlite3_context *ctx,       /* First argument to sqlite3_result_...() */
  int i                       /* Which column to return */
){
  prefixes_cursor *pCur = (prefixes_cursor*)cur;
  switch( i ){
    case 0:
      sqlite3_result_text(ctx, pCur->zStr, pCur->nStr - (int)pCur->iRowid,
                          0); 
      break;
    default:
      sqlite3_result_text(ctx, pCur->zStr, pCur->nStr, 0);
      break;
  }
  return SQLITE_OK;
}

/*
** Return the rowid for the current row.  In this implementation, the
** rowid is the same as the output value.
*/
static int prefixesRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  prefixes_cursor *pCur = (prefixes_cursor*)cur;
  *pRowid = pCur->iRowid;
  return SQLITE_OK;
}

/*
** Return TRUE if the cursor has been moved off of the last
** row of output.
*/
static int prefixesEof(sqlite3_vtab_cursor *cur){
  prefixes_cursor *pCur = (prefixes_cursor*)cur;
  return pCur->iRowid>pCur->nStr;
}

/*
** This method is called to "rewind" the prefixes_cursor object back
** to the first row of output.  This method is always called at least
** once prior to any call to prefixesColumn() or prefixesRowid() or 
** prefixesEof().
*/
static int prefixesFilter(
  sqlite3_vtab_cursor *pVtabCursor, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  prefixes_cursor *pCur = (prefixes_cursor *)pVtabCursor;
  sqlite3_free(pCur->zStr);
  if( argc>0 ){
    pCur->zStr = sqlite3_mprintf("%s", sqlite3_value_text(argv[0]));
    pCur->nStr = pCur->zStr ? (int)strlen(pCur->zStr) : 0;
  }else{
    pCur->zStr = 0;
    pCur->nStr = 0;
  }
  pCur->iRowid = 0;
  return SQLITE_OK;
}

/*
** SQLite will invoke this method one or more times while planning a query
** that uses the virtual table.  This routine needs to create
** a query plan for each invocation and compute an estimated cost for that
** plan.
*/
static int prefixesBestIndex(
  sqlite3_vtab *tab,
  sqlite3_index_info *pIdxInfo
){
  /* Search for a usable equality constraint against column 1 
  ** (original_string) and use it if at all possible */
  int i;
  const struct sqlite3_index_constraint *p;

  for(i=0, p=pIdxInfo->aConstraint; i<pIdxInfo->nConstraint; i++, p++){
    if( p->iColumn!=1 ) continue;
    if( p->op!=SQLITE_INDEX_CONSTRAINT_EQ ) continue;
    if( !p->usable ) continue;
    pIdxInfo->aConstraintUsage[i].argvIndex = 1;
    pIdxInfo->aConstraintUsage[i].omit = 1;
    pIdxInfo->estimatedCost = (double)10;
    pIdxInfo->estimatedRows = 10;
    return SQLITE_OK;
  }
  pIdxInfo->estimatedCost = (double)1000000000;
  pIdxInfo->estimatedRows = 1000000000;
  return SQLITE_OK;
}

/*
** This following structure defines all the methods for the 
** virtual table.
*/
static sqlite3_module prefixesModule = {
  /* iVersion    */ 0,
  /* xCreate     */ 0,
  /* xConnect    */ prefixesConnect,
  /* xBestIndex  */ prefixesBestIndex,
  /* xDisconnect */ prefixesDisconnect,
  /* xDestroy    */ 0,
  /* xOpen       */ prefixesOpen,
  /* xClose      */ prefixesClose,
  /* xFilter     */ prefixesFilter,
  /* xNext       */ prefixesNext,
  /* xEof        */ prefixesEof,
  /* xColumn     */ prefixesColumn,
  /* xRowid      */ prefixesRowid,
  /* xUpdate     */ 0,
  /* xBegin      */ 0,
  /* xSync       */ 0,
  /* xCommit     */ 0,
  /* xRollback   */ 0,
  /* xFindMethod */ 0,
  /* xRename     */ 0,
  /* xSavepoint  */ 0,
  /* xRelease    */ 0,
  /* xRollbackTo */ 0,
  /* xShadowName */ 0
};

/*
** This is a copy of the SQLITE_SKIP_UTF8(zIn) macro in sqliteInt.h.
**
** Assuming zIn points to the first byte of a UTF-8 character,
** advance zIn to point to the first byte of the next UTF-8 character.
*/
#define PREFIX_SKIP_UTF8(zIn) {                        \
  if( (*(zIn++))>=0xc0 ){                              \
    while( (*zIn & 0xc0)==0x80 ){ zIn++; }             \
  }                                                    \
}

/*
** Implementation of function prefix_length(). This function accepts two
** strings as arguments and returns the length in characters (not bytes), 
** of the longest prefix shared by the two strings. For example:
**
**   prefix_length('abcdxxx', 'abcyy') == 3
**   prefix_length('abcdxxx', 'bcyyy') == 0
**   prefix_length('abcdxxx', 'ab')    == 2
**   prefix_length('ab',      'abcd')  == 2
**
** This function assumes the input is well-formed utf-8. If it is not,
** it is possible for this function to return -1.
*/
static void prefixLengthFunc(
  sqlite3_context *ctx,
  int nVal,
  sqlite3_value **apVal
){
  int nByte;                      /* Number of bytes to compare */
  int nRet = 0;                   /* Return value */
  const unsigned char *zL = sqlite3_value_text(apVal[0]);
  const unsigned char *zR = sqlite3_value_text(apVal[1]);
  int nL = sqlite3_value_bytes(apVal[0]);
  int nR = sqlite3_value_bytes(apVal[1]);
  int i;

  nByte = (nL > nR ? nL : nR);
  for(i=0; i<nByte; i++){
    if( zL[i]!=zR[i] ) break;
    if( (zL[i] & 0xC0)!=0x80 ) nRet++;
  }

  if( (zL[i] & 0xC0)==0x80 ) nRet--;
  sqlite3_result_int(ctx, nRet);
}

#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_prefixes_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  rc = sqlite3_create_module(db, "prefixes", &prefixesModule, 0);
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_function(
        db, "prefix_length", 2, SQLITE_UTF8, 0, prefixLengthFunc, 0, 0
    );
  }
  return rc;
}
#endif /* !defined(SQLITE_CORE) || !defined(SQLITE_OMIT_VIRTUALTABLE) */
