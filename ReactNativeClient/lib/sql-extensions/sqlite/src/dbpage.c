/*
** 2017-10-11
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
** This file contains an implementation of the "sqlite_dbpage" virtual table.
**
** The sqlite_dbpage virtual table is used to read or write whole raw
** pages of the database file.  The pager interface is used so that 
** uncommitted changes and changes recorded in the WAL file are correctly
** retrieved.
**
** Usage example:
**
**    SELECT data FROM sqlite_dbpage('aux1') WHERE pgno=123;
**
** This is an eponymous virtual table so it does not need to be created before
** use.  The optional argument to the sqlite_dbpage() table name is the
** schema for the database file that is to be read.  The default schema is
** "main".
**
** The data field of sqlite_dbpage table can be updated.  The new
** value must be a BLOB which is the correct page size, otherwise the
** update fails.  Rows may not be deleted or inserted.
*/

#include "sqliteInt.h"   /* Requires access to internal data structures */
#if (defined(SQLITE_ENABLE_DBPAGE_VTAB) || defined(SQLITE_TEST)) \
    && !defined(SQLITE_OMIT_VIRTUALTABLE)

typedef struct DbpageTable DbpageTable;
typedef struct DbpageCursor DbpageCursor;

struct DbpageCursor {
  sqlite3_vtab_cursor base;       /* Base class.  Must be first */
  int pgno;                       /* Current page number */
  int mxPgno;                     /* Last page to visit on this scan */
  Pager *pPager;                  /* Pager being read/written */
  DbPage *pPage1;                 /* Page 1 of the database */
  int iDb;                        /* Index of database to analyze */
  int szPage;                     /* Size of each page in bytes */
};

struct DbpageTable {
  sqlite3_vtab base;              /* Base class.  Must be first */
  sqlite3 *db;                    /* The database */
};

/* Columns */
#define DBPAGE_COLUMN_PGNO    0
#define DBPAGE_COLUMN_DATA    1
#define DBPAGE_COLUMN_SCHEMA  2



/*
** Connect to or create a dbpagevfs virtual table.
*/
static int dbpageConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  DbpageTable *pTab = 0;
  int rc = SQLITE_OK;

  sqlite3_vtab_config(db, SQLITE_VTAB_DIRECTONLY);
  rc = sqlite3_declare_vtab(db, 
          "CREATE TABLE x(pgno INTEGER PRIMARY KEY, data BLOB, schema HIDDEN)");
  if( rc==SQLITE_OK ){
    pTab = (DbpageTable *)sqlite3_malloc64(sizeof(DbpageTable));
    if( pTab==0 ) rc = SQLITE_NOMEM_BKPT;
  }

  assert( rc==SQLITE_OK || pTab==0 );
  if( rc==SQLITE_OK ){
    memset(pTab, 0, sizeof(DbpageTable));
    pTab->db = db;
  }

  *ppVtab = (sqlite3_vtab*)pTab;
  return rc;
}

/*
** Disconnect from or destroy a dbpagevfs virtual table.
*/
static int dbpageDisconnect(sqlite3_vtab *pVtab){
  sqlite3_free(pVtab);
  return SQLITE_OK;
}

/*
** idxNum:
**
**     0     schema=main, full table scan
**     1     schema=main, pgno=?1
**     2     schema=?1, full table scan
**     3     schema=?1, pgno=?2
*/
static int dbpageBestIndex(sqlite3_vtab *tab, sqlite3_index_info *pIdxInfo){
  int i;
  int iPlan = 0;

  /* If there is a schema= constraint, it must be honored.  Report a
  ** ridiculously large estimated cost if the schema= constraint is
  ** unavailable
  */
  for(i=0; i<pIdxInfo->nConstraint; i++){
    struct sqlite3_index_constraint *p = &pIdxInfo->aConstraint[i];
    if( p->iColumn!=DBPAGE_COLUMN_SCHEMA ) continue;
    if( p->op!=SQLITE_INDEX_CONSTRAINT_EQ ) continue;
    if( !p->usable ){
      /* No solution. */
      return SQLITE_CONSTRAINT;
    }
    iPlan = 2;
    pIdxInfo->aConstraintUsage[i].argvIndex = 1;
    pIdxInfo->aConstraintUsage[i].omit = 1;
    break;
  }

  /* If we reach this point, it means that either there is no schema=
  ** constraint (in which case we use the "main" schema) or else the
  ** schema constraint was accepted.  Lower the estimated cost accordingly
  */
  pIdxInfo->estimatedCost = 1.0e6;

  /* Check for constraints against pgno */
  for(i=0; i<pIdxInfo->nConstraint; i++){
    struct sqlite3_index_constraint *p = &pIdxInfo->aConstraint[i];
    if( p->usable && p->iColumn<=0 && p->op==SQLITE_INDEX_CONSTRAINT_EQ ){
      pIdxInfo->estimatedRows = 1;
      pIdxInfo->idxFlags = SQLITE_INDEX_SCAN_UNIQUE;
      pIdxInfo->estimatedCost = 1.0;
      pIdxInfo->aConstraintUsage[i].argvIndex = iPlan ? 2 : 1;
      pIdxInfo->aConstraintUsage[i].omit = 1;
      iPlan |= 1;
      break;
    }
  }
  pIdxInfo->idxNum = iPlan;

  if( pIdxInfo->nOrderBy>=1
   && pIdxInfo->aOrderBy[0].iColumn<=0
   && pIdxInfo->aOrderBy[0].desc==0
  ){
    pIdxInfo->orderByConsumed = 1;
  }
  return SQLITE_OK;
}

/*
** Open a new dbpagevfs cursor.
*/
static int dbpageOpen(sqlite3_vtab *pVTab, sqlite3_vtab_cursor **ppCursor){
  DbpageCursor *pCsr;

  pCsr = (DbpageCursor *)sqlite3_malloc64(sizeof(DbpageCursor));
  if( pCsr==0 ){
    return SQLITE_NOMEM_BKPT;
  }else{
    memset(pCsr, 0, sizeof(DbpageCursor));
    pCsr->base.pVtab = pVTab;
    pCsr->pgno = -1;
  }

  *ppCursor = (sqlite3_vtab_cursor *)pCsr;
  return SQLITE_OK;
}

/*
** Close a dbpagevfs cursor.
*/
static int dbpageClose(sqlite3_vtab_cursor *pCursor){
  DbpageCursor *pCsr = (DbpageCursor *)pCursor;
  if( pCsr->pPage1 ) sqlite3PagerUnrefPageOne(pCsr->pPage1);
  sqlite3_free(pCsr);
  return SQLITE_OK;
}

/*
** Move a dbpagevfs cursor to the next entry in the file.
*/
static int dbpageNext(sqlite3_vtab_cursor *pCursor){
  int rc = SQLITE_OK;
  DbpageCursor *pCsr = (DbpageCursor *)pCursor;
  pCsr->pgno++;
  return rc;
}

static int dbpageEof(sqlite3_vtab_cursor *pCursor){
  DbpageCursor *pCsr = (DbpageCursor *)pCursor;
  return pCsr->pgno > pCsr->mxPgno;
}

/*
** idxNum:
**
**     0     schema=main, full table scan
**     1     schema=main, pgno=?1
**     2     schema=?1, full table scan
**     3     schema=?1, pgno=?2
**
** idxStr is not used
*/
static int dbpageFilter(
  sqlite3_vtab_cursor *pCursor, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  DbpageCursor *pCsr = (DbpageCursor *)pCursor;
  DbpageTable *pTab = (DbpageTable *)pCursor->pVtab;
  int rc;
  sqlite3 *db = pTab->db;
  Btree *pBt;

  /* Default setting is no rows of result */
  pCsr->pgno = 1; 
  pCsr->mxPgno = 0;

  if( idxNum & 2 ){
    const char *zSchema;
    assert( argc>=1 );
    zSchema = (const char*)sqlite3_value_text(argv[0]);
    pCsr->iDb = sqlite3FindDbName(db, zSchema);
    if( pCsr->iDb<0 ) return SQLITE_OK;
  }else{
    pCsr->iDb = 0;
  }
  pBt = db->aDb[pCsr->iDb].pBt;
  if( pBt==0 ) return SQLITE_OK;
  pCsr->pPager = sqlite3BtreePager(pBt);
  pCsr->szPage = sqlite3BtreeGetPageSize(pBt);
  pCsr->mxPgno = sqlite3BtreeLastPage(pBt);
  if( idxNum & 1 ){
    assert( argc>(idxNum>>1) );
    pCsr->pgno = sqlite3_value_int(argv[idxNum>>1]);
    if( pCsr->pgno<1 || pCsr->pgno>pCsr->mxPgno ){
      pCsr->pgno = 1;
      pCsr->mxPgno = 0;
    }else{
      pCsr->mxPgno = pCsr->pgno;
    }
  }else{
    assert( pCsr->pgno==1 );
  }
  if( pCsr->pPage1 ) sqlite3PagerUnrefPageOne(pCsr->pPage1);
  rc = sqlite3PagerGet(pCsr->pPager, 1, &pCsr->pPage1, 0);
  return rc;
}

static int dbpageColumn(
  sqlite3_vtab_cursor *pCursor, 
  sqlite3_context *ctx, 
  int i
){
  DbpageCursor *pCsr = (DbpageCursor *)pCursor;
  int rc = SQLITE_OK;
  switch( i ){
    case 0: {           /* pgno */
      sqlite3_result_int(ctx, pCsr->pgno);
      break;
    }
    case 1: {           /* data */
      DbPage *pDbPage = 0;
      rc = sqlite3PagerGet(pCsr->pPager, pCsr->pgno, (DbPage**)&pDbPage, 0);
      if( rc==SQLITE_OK ){
        sqlite3_result_blob(ctx, sqlite3PagerGetData(pDbPage), pCsr->szPage,
                            SQLITE_TRANSIENT);
      }
      sqlite3PagerUnref(pDbPage);
      break;
    }
    default: {          /* schema */
      sqlite3 *db = sqlite3_context_db_handle(ctx);
      sqlite3_result_text(ctx, db->aDb[pCsr->iDb].zDbSName, -1, SQLITE_STATIC);
      break;
    }
  }
  return SQLITE_OK;
}

static int dbpageRowid(sqlite3_vtab_cursor *pCursor, sqlite_int64 *pRowid){
  DbpageCursor *pCsr = (DbpageCursor *)pCursor;
  *pRowid = pCsr->pgno;
  return SQLITE_OK;
}

static int dbpageUpdate(
  sqlite3_vtab *pVtab,
  int argc,
  sqlite3_value **argv,
  sqlite_int64 *pRowid
){
  DbpageTable *pTab = (DbpageTable *)pVtab;
  Pgno pgno;
  DbPage *pDbPage = 0;
  int rc = SQLITE_OK;
  char *zErr = 0;
  const char *zSchema;
  int iDb;
  Btree *pBt;
  Pager *pPager;
  int szPage;

  if( pTab->db->flags & SQLITE_Defensive ){
    zErr = "read-only";
    goto update_fail;
  }
  if( argc==1 ){
    zErr = "cannot delete";
    goto update_fail;
  }
  pgno = sqlite3_value_int(argv[0]);
  if( (Pgno)sqlite3_value_int(argv[1])!=pgno ){
    zErr = "cannot insert";
    goto update_fail;
  }
  zSchema = (const char*)sqlite3_value_text(argv[4]);
  iDb = zSchema ? sqlite3FindDbName(pTab->db, zSchema) : -1;
  if( iDb<0 ){
    zErr = "no such schema";
    goto update_fail;
  }
  pBt = pTab->db->aDb[iDb].pBt;
  if( pgno<1 || pBt==0 || pgno>(int)sqlite3BtreeLastPage(pBt) ){
    zErr = "bad page number";
    goto update_fail;
  }
  szPage = sqlite3BtreeGetPageSize(pBt);
  if( sqlite3_value_type(argv[3])!=SQLITE_BLOB 
   || sqlite3_value_bytes(argv[3])!=szPage
  ){
    zErr = "bad page value";
    goto update_fail;
  }
  pPager = sqlite3BtreePager(pBt);
  rc = sqlite3PagerGet(pPager, pgno, (DbPage**)&pDbPage, 0);
  if( rc==SQLITE_OK ){
    rc = sqlite3PagerWrite(pDbPage);
    if( rc==SQLITE_OK ){
      memcpy(sqlite3PagerGetData(pDbPage),
             sqlite3_value_blob(argv[3]),
             szPage);
    }
  }
  sqlite3PagerUnref(pDbPage);
  return rc;

update_fail:
  sqlite3_free(pVtab->zErrMsg);
  pVtab->zErrMsg = sqlite3_mprintf("%s", zErr);
  return SQLITE_ERROR;
}

/* Since we do not know in advance which database files will be
** written by the sqlite_dbpage virtual table, start a write transaction
** on them all.
*/
static int dbpageBegin(sqlite3_vtab *pVtab){
  DbpageTable *pTab = (DbpageTable *)pVtab;
  sqlite3 *db = pTab->db;
  int i;
  for(i=0; i<db->nDb; i++){
    Btree *pBt = db->aDb[i].pBt;
    if( pBt ) sqlite3BtreeBeginTrans(pBt, 1, 0);
  }
  return SQLITE_OK;
}


/*
** Invoke this routine to register the "dbpage" virtual table module
*/
int sqlite3DbpageRegister(sqlite3 *db){
  static sqlite3_module dbpage_module = {
    0,                            /* iVersion */
    dbpageConnect,                /* xCreate */
    dbpageConnect,                /* xConnect */
    dbpageBestIndex,              /* xBestIndex */
    dbpageDisconnect,             /* xDisconnect */
    dbpageDisconnect,             /* xDestroy */
    dbpageOpen,                   /* xOpen - open a cursor */
    dbpageClose,                  /* xClose - close a cursor */
    dbpageFilter,                 /* xFilter - configure scan constraints */
    dbpageNext,                   /* xNext - advance a cursor */
    dbpageEof,                    /* xEof - check for end of scan */
    dbpageColumn,                 /* xColumn - read data */
    dbpageRowid,                  /* xRowid - read data */
    dbpageUpdate,                 /* xUpdate */
    dbpageBegin,                  /* xBegin */
    0,                            /* xSync */
    0,                            /* xCommit */
    0,                            /* xRollback */
    0,                            /* xFindMethod */
    0,                            /* xRename */
    0,                            /* xSavepoint */
    0,                            /* xRelease */
    0,                            /* xRollbackTo */
    0                             /* xShadowName */
  };
  return sqlite3_create_module(db, "sqlite_dbpage", &dbpage_module, 0);
}
#elif defined(SQLITE_ENABLE_DBPAGE_VTAB)
int sqlite3DbpageRegister(sqlite3 *db){ return SQLITE_OK; }
#endif /* SQLITE_ENABLE_DBSTAT_VTAB */
