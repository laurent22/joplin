/*
** 2011 Jan 27
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
** This file is not part of the production FTS code. It is only used for
** testing. It contains a virtual table implementation that provides direct 
** access to the full-text index of an FTS table. 
*/

#include "fts3Int.h"
#if !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_FTS3)
#ifdef SQLITE_TEST

#include <string.h>
#include <assert.h>
#include <stdlib.h>

typedef struct Fts3termTable Fts3termTable;
typedef struct Fts3termCursor Fts3termCursor;

struct Fts3termTable {
  sqlite3_vtab base;              /* Base class used by SQLite core */
  int iIndex;                     /* Index for Fts3Table.aIndex[] */
  Fts3Table *pFts3Tab;
};

struct Fts3termCursor {
  sqlite3_vtab_cursor base;       /* Base class used by SQLite core */
  Fts3MultiSegReader csr;        /* Must be right after "base" */
  Fts3SegFilter filter;

  int isEof;                      /* True if cursor is at EOF */
  char *pNext;

  sqlite3_int64 iRowid;           /* Current 'rowid' value */
  sqlite3_int64 iDocid;           /* Current 'docid' value */
  int iCol;                       /* Current 'col' value */
  int iPos;                       /* Current 'pos' value */
};

/*
** Schema of the terms table.
*/
#define FTS3_TERMS_SCHEMA "CREATE TABLE x(term, docid, col, pos)"

/*
** This function does all the work for both the xConnect and xCreate methods.
** These tables have no persistent representation of their own, so xConnect
** and xCreate are identical operations.
*/
static int fts3termConnectMethod(
  sqlite3 *db,                    /* Database connection */
  void *pCtx,                     /* Non-zero for an fts4prefix table */
  int argc,                       /* Number of elements in argv array */
  const char * const *argv,       /* xCreate/xConnect argument array */
  sqlite3_vtab **ppVtab,          /* OUT: New sqlite3_vtab object */
  char **pzErr                    /* OUT: sqlite3_malloc'd error message */
){
  char const *zDb;                /* Name of database (e.g. "main") */
  char const *zFts3;              /* Name of fts3 table */
  int nDb;                        /* Result of strlen(zDb) */
  int nFts3;                      /* Result of strlen(zFts3) */
  sqlite3_int64 nByte;            /* Bytes of space to allocate here */
  int rc;                         /* value returned by declare_vtab() */
  Fts3termTable *p;               /* Virtual table object to return */
  int iIndex = 0;

  UNUSED_PARAMETER(pCtx);
  if( argc==5 ){
    iIndex = atoi(argv[4]);
    argc--;
  }

  /* The user should specify a single argument - the name of an fts3 table. */
  if( argc!=4 ){
    sqlite3Fts3ErrMsg(pzErr,
        "wrong number of arguments to fts4term constructor"
    );
    return SQLITE_ERROR;
  }

  zDb = argv[1]; 
  nDb = (int)strlen(zDb);
  zFts3 = argv[3];
  nFts3 = (int)strlen(zFts3);

  rc = sqlite3_declare_vtab(db, FTS3_TERMS_SCHEMA);
  if( rc!=SQLITE_OK ) return rc;

  nByte = sizeof(Fts3termTable) + sizeof(Fts3Table) + nDb + nFts3 + 2;
  p = (Fts3termTable *)sqlite3_malloc64(nByte);
  if( !p ) return SQLITE_NOMEM;
  memset(p, 0, (size_t)nByte);

  p->pFts3Tab = (Fts3Table *)&p[1];
  p->pFts3Tab->zDb = (char *)&p->pFts3Tab[1];
  p->pFts3Tab->zName = &p->pFts3Tab->zDb[nDb+1];
  p->pFts3Tab->db = db;
  p->pFts3Tab->nIndex = iIndex+1;
  p->iIndex = iIndex;

  memcpy((char *)p->pFts3Tab->zDb, zDb, nDb);
  memcpy((char *)p->pFts3Tab->zName, zFts3, nFts3);
  sqlite3Fts3Dequote((char *)p->pFts3Tab->zName);

  *ppVtab = (sqlite3_vtab *)p;
  return SQLITE_OK;
}

/*
** This function does the work for both the xDisconnect and xDestroy methods.
** These tables have no persistent representation of their own, so xDisconnect
** and xDestroy are identical operations.
*/
static int fts3termDisconnectMethod(sqlite3_vtab *pVtab){
  Fts3termTable *p = (Fts3termTable *)pVtab;
  Fts3Table *pFts3 = p->pFts3Tab;
  int i;

  /* Free any prepared statements held */
  for(i=0; i<SizeofArray(pFts3->aStmt); i++){
    sqlite3_finalize(pFts3->aStmt[i]);
  }
  sqlite3_free(pFts3->zSegmentsTbl);
  sqlite3_free(p);
  return SQLITE_OK;
}

#define FTS4AUX_EQ_CONSTRAINT 1
#define FTS4AUX_GE_CONSTRAINT 2
#define FTS4AUX_LE_CONSTRAINT 4

/*
** xBestIndex - Analyze a WHERE and ORDER BY clause.
*/
static int fts3termBestIndexMethod(
  sqlite3_vtab *pVTab, 
  sqlite3_index_info *pInfo
){
  UNUSED_PARAMETER(pVTab);

  /* This vtab naturally does "ORDER BY term, docid, col, pos".  */
  if( pInfo->nOrderBy ){
    int i;
    for(i=0; i<pInfo->nOrderBy; i++){
      if( pInfo->aOrderBy[i].iColumn!=i || pInfo->aOrderBy[i].desc ) break;
    }
    if( i==pInfo->nOrderBy ){
      pInfo->orderByConsumed = 1;
    }
  }

  return SQLITE_OK;
}

/*
** xOpen - Open a cursor.
*/
static int fts3termOpenMethod(sqlite3_vtab *pVTab, sqlite3_vtab_cursor **ppCsr){
  Fts3termCursor *pCsr;            /* Pointer to cursor object to return */

  UNUSED_PARAMETER(pVTab);

  pCsr = (Fts3termCursor *)sqlite3_malloc(sizeof(Fts3termCursor));
  if( !pCsr ) return SQLITE_NOMEM;
  memset(pCsr, 0, sizeof(Fts3termCursor));

  *ppCsr = (sqlite3_vtab_cursor *)pCsr;
  return SQLITE_OK;
}

/*
** xClose - Close a cursor.
*/
static int fts3termCloseMethod(sqlite3_vtab_cursor *pCursor){
  Fts3Table *pFts3 = ((Fts3termTable *)pCursor->pVtab)->pFts3Tab;
  Fts3termCursor *pCsr = (Fts3termCursor *)pCursor;

  sqlite3Fts3SegmentsClose(pFts3);
  sqlite3Fts3SegReaderFinish(&pCsr->csr);
  sqlite3_free(pCsr);
  return SQLITE_OK;
}

/*
** xNext - Advance the cursor to the next row, if any.
*/
static int fts3termNextMethod(sqlite3_vtab_cursor *pCursor){
  Fts3termCursor *pCsr = (Fts3termCursor *)pCursor;
  Fts3Table *pFts3 = ((Fts3termTable *)pCursor->pVtab)->pFts3Tab;
  int rc;
  sqlite3_int64 v;

  /* Increment our pretend rowid value. */
  pCsr->iRowid++;

  /* Advance to the next term in the full-text index. */
  if( pCsr->csr.aDoclist==0 
   || pCsr->pNext>=&pCsr->csr.aDoclist[pCsr->csr.nDoclist-1]
  ){
    rc = sqlite3Fts3SegReaderStep(pFts3, &pCsr->csr);
    if( rc!=SQLITE_ROW ){
      pCsr->isEof = 1;
      return rc;
    }

    pCsr->iCol = 0;
    pCsr->iPos = 0;
    pCsr->iDocid = 0;
    pCsr->pNext = pCsr->csr.aDoclist;

    /* Read docid */
    pCsr->pNext += sqlite3Fts3GetVarint(pCsr->pNext, &pCsr->iDocid);
  }

  pCsr->pNext += sqlite3Fts3GetVarint(pCsr->pNext, &v);
  if( v==0 ){
    pCsr->pNext += sqlite3Fts3GetVarint(pCsr->pNext, &v);
    pCsr->iDocid += v;
    pCsr->pNext += sqlite3Fts3GetVarint(pCsr->pNext, &v);
    pCsr->iCol = 0;
    pCsr->iPos = 0;
  }

  if( v==1 ){
    pCsr->pNext += sqlite3Fts3GetVarint(pCsr->pNext, &v);
    pCsr->iCol += (int)v;
    pCsr->iPos = 0;
    pCsr->pNext += sqlite3Fts3GetVarint(pCsr->pNext, &v);
  }

  pCsr->iPos += (int)(v - 2);

  return SQLITE_OK;
}

/*
** xFilter - Initialize a cursor to point at the start of its data.
*/
static int fts3termFilterMethod(
  sqlite3_vtab_cursor *pCursor,   /* The cursor used for this query */
  int idxNum,                     /* Strategy index */
  const char *idxStr,             /* Unused */
  int nVal,                       /* Number of elements in apVal */
  sqlite3_value **apVal           /* Arguments for the indexing scheme */
){
  Fts3termCursor *pCsr = (Fts3termCursor *)pCursor;
  Fts3termTable *p = (Fts3termTable *)pCursor->pVtab;
  Fts3Table *pFts3 = p->pFts3Tab;
  int rc;

  UNUSED_PARAMETER(nVal);
  UNUSED_PARAMETER(idxNum);
  UNUSED_PARAMETER(idxStr);
  UNUSED_PARAMETER(apVal);

  assert( idxStr==0 && idxNum==0 );

  /* In case this cursor is being reused, close and zero it. */
  testcase(pCsr->filter.zTerm);
  sqlite3Fts3SegReaderFinish(&pCsr->csr);
  memset(&pCsr->csr, 0, ((u8*)&pCsr[1]) - (u8*)&pCsr->csr);

  pCsr->filter.flags = FTS3_SEGMENT_REQUIRE_POS|FTS3_SEGMENT_IGNORE_EMPTY;
  pCsr->filter.flags |= FTS3_SEGMENT_SCAN;

  rc = sqlite3Fts3SegReaderCursor(pFts3, 0, p->iIndex, FTS3_SEGCURSOR_ALL,
      pCsr->filter.zTerm, pCsr->filter.nTerm, 0, 1, &pCsr->csr
  );
  if( rc==SQLITE_OK ){
    rc = sqlite3Fts3SegReaderStart(pFts3, &pCsr->csr, &pCsr->filter);
  }
  if( rc==SQLITE_OK ){
    rc = fts3termNextMethod(pCursor);
  }
  return rc;
}

/*
** xEof - Return true if the cursor is at EOF, or false otherwise.
*/
static int fts3termEofMethod(sqlite3_vtab_cursor *pCursor){
  Fts3termCursor *pCsr = (Fts3termCursor *)pCursor;
  return pCsr->isEof;
}

/*
** xColumn - Return a column value.
*/
static int fts3termColumnMethod(
  sqlite3_vtab_cursor *pCursor,   /* Cursor to retrieve value from */
  sqlite3_context *pCtx,          /* Context for sqlite3_result_xxx() calls */
  int iCol                        /* Index of column to read value from */
){
  Fts3termCursor *p = (Fts3termCursor *)pCursor;

  assert( iCol>=0 && iCol<=3 );
  switch( iCol ){
    case 0:
      sqlite3_result_text(pCtx, p->csr.zTerm, p->csr.nTerm, SQLITE_TRANSIENT);
      break;
    case 1:
      sqlite3_result_int64(pCtx, p->iDocid);
      break;
    case 2:
      sqlite3_result_int64(pCtx, p->iCol);
      break;
    default:
      sqlite3_result_int64(pCtx, p->iPos);
      break;
  }

  return SQLITE_OK;
}

/*
** xRowid - Return the current rowid for the cursor.
*/
static int fts3termRowidMethod(
  sqlite3_vtab_cursor *pCursor,   /* Cursor to retrieve value from */
  sqlite_int64 *pRowid            /* OUT: Rowid value */
){
  Fts3termCursor *pCsr = (Fts3termCursor *)pCursor;
  *pRowid = pCsr->iRowid;
  return SQLITE_OK;
}

/*
** Register the fts3term module with database connection db. Return SQLITE_OK
** if successful or an error code if sqlite3_create_module() fails.
*/
int sqlite3Fts3InitTerm(sqlite3 *db){
  static const sqlite3_module fts3term_module = {
     0,                           /* iVersion      */
     fts3termConnectMethod,       /* xCreate       */
     fts3termConnectMethod,       /* xConnect      */
     fts3termBestIndexMethod,     /* xBestIndex    */
     fts3termDisconnectMethod,    /* xDisconnect   */
     fts3termDisconnectMethod,    /* xDestroy      */
     fts3termOpenMethod,          /* xOpen         */
     fts3termCloseMethod,         /* xClose        */
     fts3termFilterMethod,        /* xFilter       */
     fts3termNextMethod,          /* xNext         */
     fts3termEofMethod,           /* xEof          */
     fts3termColumnMethod,        /* xColumn       */
     fts3termRowidMethod,         /* xRowid        */
     0,                           /* xUpdate       */
     0,                           /* xBegin        */
     0,                           /* xSync         */
     0,                           /* xCommit       */
     0,                           /* xRollback     */
     0,                           /* xFindFunction */
     0,                           /* xRename       */
     0,                           /* xSavepoint    */
     0,                           /* xRelease      */
     0,                           /* xRollbackTo   */
     0                            /* xShadowName   */
  };
  int rc;                         /* Return code */

  rc = sqlite3_create_module(db, "fts4term", &fts3term_module, 0);
  return rc;
}

#endif
#endif /* !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_FTS3) */
