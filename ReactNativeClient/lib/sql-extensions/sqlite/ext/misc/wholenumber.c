/*
** 2011 April 02
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
** This file implements a virtual table that returns the whole numbers
** between 1 and 4294967295, inclusive.
**
** Example:
**
**     CREATE VIRTUAL TABLE nums USING wholenumber;
**     SELECT value FROM nums WHERE value<10;
**
** Results in:
**
**     1 2 3 4 5 6 7 8 9
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <assert.h>
#include <string.h>

#ifndef SQLITE_OMIT_VIRTUALTABLE


/* A wholenumber cursor object */
typedef struct wholenumber_cursor wholenumber_cursor;
struct wholenumber_cursor {
  sqlite3_vtab_cursor base;  /* Base class - must be first */
  sqlite3_int64 iValue;      /* Current value */
  sqlite3_int64 mxValue;     /* Maximum value */
};

/* Methods for the wholenumber module */
static int wholenumberConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  sqlite3_vtab *pNew;
  pNew = *ppVtab = sqlite3_malloc( sizeof(*pNew) );
  if( pNew==0 ) return SQLITE_NOMEM;
  sqlite3_declare_vtab(db, "CREATE TABLE x(value)");
  sqlite3_vtab_config(db, SQLITE_VTAB_INNOCUOUS);
  memset(pNew, 0, sizeof(*pNew));
  return SQLITE_OK;
}
/* Note that for this virtual table, the xCreate and xConnect
** methods are identical. */

static int wholenumberDisconnect(sqlite3_vtab *pVtab){
  sqlite3_free(pVtab);
  return SQLITE_OK;
}
/* The xDisconnect and xDestroy methods are also the same */


/*
** Open a new wholenumber cursor.
*/
static int wholenumberOpen(sqlite3_vtab *p, sqlite3_vtab_cursor **ppCursor){
  wholenumber_cursor *pCur;
  pCur = sqlite3_malloc( sizeof(*pCur) );
  if( pCur==0 ) return SQLITE_NOMEM;
  memset(pCur, 0, sizeof(*pCur));
  *ppCursor = &pCur->base;
  return SQLITE_OK;
}

/*
** Close a wholenumber cursor.
*/
static int wholenumberClose(sqlite3_vtab_cursor *cur){
  sqlite3_free(cur);
  return SQLITE_OK;
}


/*
** Advance a cursor to its next row of output
*/
static int wholenumberNext(sqlite3_vtab_cursor *cur){
  wholenumber_cursor *pCur = (wholenumber_cursor*)cur;
  pCur->iValue++;
  return SQLITE_OK;
}

/*
** Return the value associated with a wholenumber.
*/
static int wholenumberColumn(
  sqlite3_vtab_cursor *cur,
  sqlite3_context *ctx,
  int i
){
  wholenumber_cursor *pCur = (wholenumber_cursor*)cur;
  sqlite3_result_int64(ctx, pCur->iValue);
  return SQLITE_OK;
}

/*
** The rowid.
*/
static int wholenumberRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  wholenumber_cursor *pCur = (wholenumber_cursor*)cur;
  *pRowid = pCur->iValue;
  return SQLITE_OK;
}

/*
** When the wholenumber_cursor.rLimit value is 0 or less, that is a signal
** that the cursor has nothing more to output.
*/
static int wholenumberEof(sqlite3_vtab_cursor *cur){
  wholenumber_cursor *pCur = (wholenumber_cursor*)cur;
  return pCur->iValue>pCur->mxValue || pCur->iValue==0;
}

/*
** Called to "rewind" a cursor back to the beginning so that
** it starts its output over again.  Always called at least once
** prior to any wholenumberColumn, wholenumberRowid, or wholenumberEof call.
**
**    idxNum   Constraints
**    ------   ---------------------
**      0      (none)
**      1      value > $argv0
**      2      value >= $argv0
**      4      value < $argv0
**      8      value <= $argv0
**
**      5      value > $argv0 AND value < $argv1
**      6      value >= $argv0 AND value < $argv1
**      9      value > $argv0 AND value <= $argv1
**     10      value >= $argv0 AND value <= $argv1
*/
static int wholenumberFilter(
  sqlite3_vtab_cursor *pVtabCursor, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  wholenumber_cursor *pCur = (wholenumber_cursor *)pVtabCursor;
  sqlite3_int64 v;
  int i = 0;
  pCur->iValue = 1;
  pCur->mxValue = 0xffffffff;  /* 4294967295 */
  if( idxNum & 3 ){
    v = sqlite3_value_int64(argv[0]) + (idxNum&1);
    if( v>pCur->iValue && v<=pCur->mxValue ) pCur->iValue = v;
    i++;
  }
  if( idxNum & 12 ){
    v = sqlite3_value_int64(argv[i]) - ((idxNum>>2)&1);
    if( v>=pCur->iValue && v<pCur->mxValue ) pCur->mxValue = v;
  }
  return SQLITE_OK;
}

/*
** Search for terms of these forms:
**
**  (1)  value > $value
**  (2)  value >= $value
**  (4)  value < $value
**  (8)  value <= $value
**
** idxNum is an ORed combination of 1 or 2 with 4 or 8.
*/
static int wholenumberBestIndex(
  sqlite3_vtab *tab,
  sqlite3_index_info *pIdxInfo
){
  int i;
  int idxNum = 0;
  int argvIdx = 1;
  int ltIdx = -1;
  int gtIdx = -1;
  const struct sqlite3_index_constraint *pConstraint;
  pConstraint = pIdxInfo->aConstraint;
  for(i=0; i<pIdxInfo->nConstraint; i++, pConstraint++){
    if( pConstraint->usable==0 ) continue;
    if( (idxNum & 3)==0 && pConstraint->op==SQLITE_INDEX_CONSTRAINT_GT ){
      idxNum |= 1;
      ltIdx = i;
    }
    if( (idxNum & 3)==0 && pConstraint->op==SQLITE_INDEX_CONSTRAINT_GE ){
      idxNum |= 2;
      ltIdx = i;
    }
    if( (idxNum & 12)==0 && pConstraint->op==SQLITE_INDEX_CONSTRAINT_LT ){
      idxNum |= 4;
      gtIdx = i;
    }
    if( (idxNum & 12)==0 && pConstraint->op==SQLITE_INDEX_CONSTRAINT_LE ){
      idxNum |= 8;
      gtIdx = i;
    }
  }
  pIdxInfo->idxNum = idxNum;
  if( ltIdx>=0 ){
    pIdxInfo->aConstraintUsage[ltIdx].argvIndex = argvIdx++;
    pIdxInfo->aConstraintUsage[ltIdx].omit = 1;
  }
  if( gtIdx>=0 ){
    pIdxInfo->aConstraintUsage[gtIdx].argvIndex = argvIdx;
    pIdxInfo->aConstraintUsage[gtIdx].omit = 1;
  }
  if( pIdxInfo->nOrderBy==1
   && pIdxInfo->aOrderBy[0].desc==0
  ){
    pIdxInfo->orderByConsumed = 1;
  }
  if( (idxNum & 12)==0 ){
    pIdxInfo->estimatedCost = (double)100000000;
  }else if( (idxNum & 3)==0 ){
    pIdxInfo->estimatedCost = (double)5;
  }else{
    pIdxInfo->estimatedCost = (double)1;
  }
  return SQLITE_OK;
}

/*
** A virtual table module that provides read-only access to a
** Tcl global variable namespace.
*/
static sqlite3_module wholenumberModule = {
  0,                         /* iVersion */
  wholenumberConnect,
  wholenumberConnect,
  wholenumberBestIndex,
  wholenumberDisconnect, 
  wholenumberDisconnect,
  wholenumberOpen,           /* xOpen - open a cursor */
  wholenumberClose,          /* xClose - close a cursor */
  wholenumberFilter,         /* xFilter - configure scan constraints */
  wholenumberNext,           /* xNext - advance a cursor */
  wholenumberEof,            /* xEof - check for end of scan */
  wholenumberColumn,         /* xColumn - read data */
  wholenumberRowid,          /* xRowid - read data */
  0,                         /* xUpdate */
  0,                         /* xBegin */
  0,                         /* xSync */
  0,                         /* xCommit */
  0,                         /* xRollback */
  0,                         /* xFindMethod */
  0,                         /* xRename */
};

#endif /* SQLITE_OMIT_VIRTUALTABLE */

#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_wholenumber_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
#ifndef SQLITE_OMIT_VIRTUALTABLE
  rc = sqlite3_create_module(db, "wholenumber", &wholenumberModule, 0);
#endif
  return rc;
}
