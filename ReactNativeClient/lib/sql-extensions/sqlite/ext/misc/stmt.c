/*
** 2017-05-31
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
** This file demonstrates an eponymous virtual table that returns information
** about all prepared statements for the database connection.
**
** Usage example:
**
**     .load ./stmt
**     .mode line
**     .header on
**     SELECT * FROM stmt;
*/
#if !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_STMTVTAB)
#if !defined(SQLITEINT_H)
#include "sqlite3ext.h"
#endif
SQLITE_EXTENSION_INIT1
#include <assert.h>
#include <string.h>

#ifndef SQLITE_OMIT_VIRTUALTABLE

/* stmt_vtab is a subclass of sqlite3_vtab which will
** serve as the underlying representation of a stmt virtual table
*/
typedef struct stmt_vtab stmt_vtab;
struct stmt_vtab {
  sqlite3_vtab base;  /* Base class - must be first */
  sqlite3 *db;        /* Database connection for this stmt vtab */
};

/* stmt_cursor is a subclass of sqlite3_vtab_cursor which will
** serve as the underlying representation of a cursor that scans
** over rows of the result
*/
typedef struct stmt_cursor stmt_cursor;
struct stmt_cursor {
  sqlite3_vtab_cursor base;  /* Base class - must be first */
  sqlite3 *db;               /* Database connection for this cursor */
  sqlite3_stmt *pStmt;       /* Statement cursor is currently pointing at */
  sqlite3_int64 iRowid;      /* The rowid */
};

/*
** The stmtConnect() method is invoked to create a new
** stmt_vtab that describes the stmt virtual table.
**
** Think of this routine as the constructor for stmt_vtab objects.
**
** All this routine needs to do is:
**
**    (1) Allocate the stmt_vtab object and initialize all fields.
**
**    (2) Tell SQLite (via the sqlite3_declare_vtab() interface) what the
**        result set of queries against stmt will look like.
*/
static int stmtConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  stmt_vtab *pNew;
  int rc;

/* Column numbers */
#define STMT_COLUMN_SQL     0   /* SQL for the statement */
#define STMT_COLUMN_NCOL    1   /* Number of result columns */
#define STMT_COLUMN_RO      2   /* True if read-only */
#define STMT_COLUMN_BUSY    3   /* True if currently busy */
#define STMT_COLUMN_NSCAN   4   /* SQLITE_STMTSTATUS_FULLSCAN_STEP */
#define STMT_COLUMN_NSORT   5   /* SQLITE_STMTSTATUS_SORT */
#define STMT_COLUMN_NAIDX   6   /* SQLITE_STMTSTATUS_AUTOINDEX */
#define STMT_COLUMN_NSTEP   7   /* SQLITE_STMTSTATUS_VM_STEP */
#define STMT_COLUMN_REPREP  8   /* SQLITE_STMTSTATUS_REPREPARE */
#define STMT_COLUMN_RUN     9   /* SQLITE_STMTSTATUS_RUN */
#define STMT_COLUMN_MEM    10   /* SQLITE_STMTSTATUS_MEMUSED */


  rc = sqlite3_declare_vtab(db,
     "CREATE TABLE x(sql,ncol,ro,busy,nscan,nsort,naidx,nstep,"
                    "reprep,run,mem)");
  if( rc==SQLITE_OK ){
    pNew = sqlite3_malloc( sizeof(*pNew) );
    *ppVtab = (sqlite3_vtab*)pNew;
    if( pNew==0 ) return SQLITE_NOMEM;
    memset(pNew, 0, sizeof(*pNew));
    pNew->db = db;
  }
  return rc;
}

/*
** This method is the destructor for stmt_cursor objects.
*/
static int stmtDisconnect(sqlite3_vtab *pVtab){
  sqlite3_free(pVtab);
  return SQLITE_OK;
}

/*
** Constructor for a new stmt_cursor object.
*/
static int stmtOpen(sqlite3_vtab *p, sqlite3_vtab_cursor **ppCursor){
  stmt_cursor *pCur;
  pCur = sqlite3_malloc( sizeof(*pCur) );
  if( pCur==0 ) return SQLITE_NOMEM;
  memset(pCur, 0, sizeof(*pCur));
  pCur->db = ((stmt_vtab*)p)->db;
  *ppCursor = &pCur->base;
  return SQLITE_OK;
}

/*
** Destructor for a stmt_cursor.
*/
static int stmtClose(sqlite3_vtab_cursor *cur){
  sqlite3_free(cur);
  return SQLITE_OK;
}


/*
** Advance a stmt_cursor to its next row of output.
*/
static int stmtNext(sqlite3_vtab_cursor *cur){
  stmt_cursor *pCur = (stmt_cursor*)cur;
  pCur->iRowid++;
  pCur->pStmt = sqlite3_next_stmt(pCur->db, pCur->pStmt);
  return SQLITE_OK;
}

/*
** Return values of columns for the row at which the stmt_cursor
** is currently pointing.
*/
static int stmtColumn(
  sqlite3_vtab_cursor *cur,   /* The cursor */
  sqlite3_context *ctx,       /* First argument to sqlite3_result_...() */
  int i                       /* Which column to return */
){
  stmt_cursor *pCur = (stmt_cursor*)cur;
  switch( i ){
    case STMT_COLUMN_SQL: {
      sqlite3_result_text(ctx, sqlite3_sql(pCur->pStmt), -1, SQLITE_TRANSIENT);
      break;
    }
    case STMT_COLUMN_NCOL: {
      sqlite3_result_int(ctx, sqlite3_column_count(pCur->pStmt));
      break;
    }
    case STMT_COLUMN_RO: {
      sqlite3_result_int(ctx, sqlite3_stmt_readonly(pCur->pStmt));
      break;
    }
    case STMT_COLUMN_BUSY: {
      sqlite3_result_int(ctx, sqlite3_stmt_busy(pCur->pStmt));
      break;
    }
    default: {
      assert( i==STMT_COLUMN_MEM );
      i = SQLITE_STMTSTATUS_MEMUSED + 
            STMT_COLUMN_NSCAN - SQLITE_STMTSTATUS_FULLSCAN_STEP;
      /* Fall thru */
    }
    case STMT_COLUMN_NSCAN:
    case STMT_COLUMN_NSORT:
    case STMT_COLUMN_NAIDX:
    case STMT_COLUMN_NSTEP:
    case STMT_COLUMN_REPREP:
    case STMT_COLUMN_RUN: {
      sqlite3_result_int(ctx, sqlite3_stmt_status(pCur->pStmt,
                      i-STMT_COLUMN_NSCAN+SQLITE_STMTSTATUS_FULLSCAN_STEP, 0));
      break;
    }
  }
  return SQLITE_OK;
}

/*
** Return the rowid for the current row.  In this implementation, the
** rowid is the same as the output value.
*/
static int stmtRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  stmt_cursor *pCur = (stmt_cursor*)cur;
  *pRowid = pCur->iRowid;
  return SQLITE_OK;
}

/*
** Return TRUE if the cursor has been moved off of the last
** row of output.
*/
static int stmtEof(sqlite3_vtab_cursor *cur){
  stmt_cursor *pCur = (stmt_cursor*)cur;
  return pCur->pStmt==0;
}

/*
** This method is called to "rewind" the stmt_cursor object back
** to the first row of output.  This method is always called at least
** once prior to any call to stmtColumn() or stmtRowid() or 
** stmtEof().
*/
static int stmtFilter(
  sqlite3_vtab_cursor *pVtabCursor, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  stmt_cursor *pCur = (stmt_cursor *)pVtabCursor;
  pCur->pStmt = 0;
  pCur->iRowid = 0;
  return stmtNext(pVtabCursor);
}

/*
** SQLite will invoke this method one or more times while planning a query
** that uses the stmt virtual table.  This routine needs to create
** a query plan for each invocation and compute an estimated cost for that
** plan.
*/
static int stmtBestIndex(
  sqlite3_vtab *tab,
  sqlite3_index_info *pIdxInfo
){
  pIdxInfo->estimatedCost = (double)500;
  pIdxInfo->estimatedRows = 500;
  return SQLITE_OK;
}

/*
** This following structure defines all the methods for the 
** stmt virtual table.
*/
static sqlite3_module stmtModule = {
  0,                         /* iVersion */
  0,                         /* xCreate */
  stmtConnect,               /* xConnect */
  stmtBestIndex,             /* xBestIndex */
  stmtDisconnect,            /* xDisconnect */
  0,                         /* xDestroy */
  stmtOpen,                  /* xOpen - open a cursor */
  stmtClose,                 /* xClose - close a cursor */
  stmtFilter,                /* xFilter - configure scan constraints */
  stmtNext,                  /* xNext - advance a cursor */
  stmtEof,                   /* xEof - check for end of scan */
  stmtColumn,                /* xColumn - read data */
  stmtRowid,                 /* xRowid - read data */
  0,                         /* xUpdate */
  0,                         /* xBegin */
  0,                         /* xSync */
  0,                         /* xCommit */
  0,                         /* xRollback */
  0,                         /* xFindMethod */
  0,                         /* xRename */
  0,                         /* xSavepoint */
  0,                         /* xRelease */
  0,                         /* xRollbackTo */
  0,                         /* xShadowName */
};

#endif /* SQLITE_OMIT_VIRTUALTABLE */

int sqlite3StmtVtabInit(sqlite3 *db){
  int rc = SQLITE_OK;
#ifndef SQLITE_OMIT_VIRTUALTABLE
  rc = sqlite3_create_module(db, "sqlite_stmt", &stmtModule, 0);
#endif
  return rc;
}

#ifndef SQLITE_CORE
#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_stmt_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
#ifndef SQLITE_OMIT_VIRTUALTABLE
  rc = sqlite3StmtVtabInit(db);
#endif
  return rc;
}
#endif /* SQLITE_CORE */
#endif /* !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_STMTVTAB) */
