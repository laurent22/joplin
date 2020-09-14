/*
** 2017-07-10
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
** This file implements an eponymous virtual table that returns suggested
** completions for a partial SQL input.
**
** Suggested usage:
**
**     SELECT DISTINCT candidate COLLATE nocase
**       FROM completion($prefix,$wholeline)
**      ORDER BY 1;
**
** The two query parameters are optional.  $prefix is the text of the
** current word being typed and that is to be completed.  $wholeline is
** the complete input line, used for context.
**
** The raw completion() table might return the same candidate multiple
** times, for example if the same column name is used to two or more
** tables.  And the candidates are returned in an arbitrary order.  Hence,
** the DISTINCT and ORDER BY are recommended.
**
** This virtual table operates at the speed of human typing, and so there
** is no attempt to make it fast.  Even a slow implementation will be much
** faster than any human can type.
**
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <assert.h>
#include <string.h>
#include <ctype.h>

#ifndef SQLITE_OMIT_VIRTUALTABLE

/* completion_vtab is a subclass of sqlite3_vtab which will
** serve as the underlying representation of a completion virtual table
*/
typedef struct completion_vtab completion_vtab;
struct completion_vtab {
  sqlite3_vtab base;  /* Base class - must be first */
  sqlite3 *db;        /* Database connection for this completion vtab */
};

/* completion_cursor is a subclass of sqlite3_vtab_cursor which will
** serve as the underlying representation of a cursor that scans
** over rows of the result
*/
typedef struct completion_cursor completion_cursor;
struct completion_cursor {
  sqlite3_vtab_cursor base;  /* Base class - must be first */
  sqlite3 *db;               /* Database connection for this cursor */
  int nPrefix, nLine;        /* Number of bytes in zPrefix and zLine */
  char *zPrefix;             /* The prefix for the word we want to complete */
  char *zLine;               /* The whole that we want to complete */
  const char *zCurrentRow;   /* Current output row */
  int szRow;                 /* Length of the zCurrentRow string */
  sqlite3_stmt *pStmt;       /* Current statement */
  sqlite3_int64 iRowid;      /* The rowid */
  int ePhase;                /* Current phase */
  int j;                     /* inter-phase counter */
};

/* Values for ePhase:
*/
#define COMPLETION_FIRST_PHASE   1
#define COMPLETION_KEYWORDS      1
#define COMPLETION_PRAGMAS       2
#define COMPLETION_FUNCTIONS     3
#define COMPLETION_COLLATIONS    4
#define COMPLETION_INDEXES       5
#define COMPLETION_TRIGGERS      6
#define COMPLETION_DATABASES     7
#define COMPLETION_TABLES        8    /* Also VIEWs and TRIGGERs */
#define COMPLETION_COLUMNS       9
#define COMPLETION_MODULES       10
#define COMPLETION_EOF           11

/*
** The completionConnect() method is invoked to create a new
** completion_vtab that describes the completion virtual table.
**
** Think of this routine as the constructor for completion_vtab objects.
**
** All this routine needs to do is:
**
**    (1) Allocate the completion_vtab object and initialize all fields.
**
**    (2) Tell SQLite (via the sqlite3_declare_vtab() interface) what the
**        result set of queries against completion will look like.
*/
static int completionConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  completion_vtab *pNew;
  int rc;

  (void)(pAux);    /* Unused parameter */
  (void)(argc);    /* Unused parameter */
  (void)(argv);    /* Unused parameter */
  (void)(pzErr);   /* Unused parameter */

/* Column numbers */
#define COMPLETION_COLUMN_CANDIDATE 0  /* Suggested completion of the input */
#define COMPLETION_COLUMN_PREFIX    1  /* Prefix of the word to be completed */
#define COMPLETION_COLUMN_WHOLELINE 2  /* Entire line seen so far */
#define COMPLETION_COLUMN_PHASE     3  /* ePhase - used for debugging only */

  sqlite3_vtab_config(db, SQLITE_VTAB_INNOCUOUS);
  rc = sqlite3_declare_vtab(db,
      "CREATE TABLE x("
      "  candidate TEXT,"
      "  prefix TEXT HIDDEN,"
      "  wholeline TEXT HIDDEN,"
      "  phase INT HIDDEN"        /* Used for debugging only */
      ")");
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
** This method is the destructor for completion_cursor objects.
*/
static int completionDisconnect(sqlite3_vtab *pVtab){
  sqlite3_free(pVtab);
  return SQLITE_OK;
}

/*
** Constructor for a new completion_cursor object.
*/
static int completionOpen(sqlite3_vtab *p, sqlite3_vtab_cursor **ppCursor){
  completion_cursor *pCur;
  pCur = sqlite3_malloc( sizeof(*pCur) );
  if( pCur==0 ) return SQLITE_NOMEM;
  memset(pCur, 0, sizeof(*pCur));
  pCur->db = ((completion_vtab*)p)->db;
  *ppCursor = &pCur->base;
  return SQLITE_OK;
}

/*
** Reset the completion_cursor.
*/
static void completionCursorReset(completion_cursor *pCur){
  sqlite3_free(pCur->zPrefix);   pCur->zPrefix = 0;  pCur->nPrefix = 0;
  sqlite3_free(pCur->zLine);     pCur->zLine = 0;    pCur->nLine = 0;
  sqlite3_finalize(pCur->pStmt); pCur->pStmt = 0;
  pCur->j = 0;
}

/*
** Destructor for a completion_cursor.
*/
static int completionClose(sqlite3_vtab_cursor *cur){
  completionCursorReset((completion_cursor*)cur);
  sqlite3_free(cur);
  return SQLITE_OK;
}

/*
** Advance a completion_cursor to its next row of output.
**
** The ->ePhase, ->j, and ->pStmt fields of the completion_cursor object
** record the current state of the scan.  This routine sets ->zCurrentRow
** to the current row of output and then returns.  If no more rows remain,
** then ->ePhase is set to COMPLETION_EOF which will signal the virtual
** table that has reached the end of its scan.
**
** The current implementation just lists potential identifiers and
** keywords and filters them by zPrefix.  Future enhancements should
** take zLine into account to try to restrict the set of identifiers and
** keywords based on what would be legal at the current point of input.
*/
static int completionNext(sqlite3_vtab_cursor *cur){
  completion_cursor *pCur = (completion_cursor*)cur;
  int eNextPhase = 0;  /* Next phase to try if current phase reaches end */
  int iCol = -1;       /* If >=0, step pCur->pStmt and use the i-th column */
  pCur->iRowid++;
  while( pCur->ePhase!=COMPLETION_EOF ){
    switch( pCur->ePhase ){
      case COMPLETION_KEYWORDS: {
        if( pCur->j >= sqlite3_keyword_count() ){
          pCur->zCurrentRow = 0;
          pCur->ePhase = COMPLETION_DATABASES;
        }else{
          sqlite3_keyword_name(pCur->j++, &pCur->zCurrentRow, &pCur->szRow);
        }
        iCol = -1;
        break;
      }
      case COMPLETION_DATABASES: {
        if( pCur->pStmt==0 ){
          sqlite3_prepare_v2(pCur->db, "PRAGMA database_list", -1,
                             &pCur->pStmt, 0);
        }
        iCol = 1;
        eNextPhase = COMPLETION_TABLES;
        break;
      }
      case COMPLETION_TABLES: {
        if( pCur->pStmt==0 ){
          sqlite3_stmt *pS2;
          char *zSql = 0;
          const char *zSep = "";
          sqlite3_prepare_v2(pCur->db, "PRAGMA database_list", -1, &pS2, 0);
          while( sqlite3_step(pS2)==SQLITE_ROW ){
            const char *zDb = (const char*)sqlite3_column_text(pS2, 1);
            zSql = sqlite3_mprintf(
               "%z%s"
               "SELECT name FROM \"%w\".sqlite_schema",
               zSql, zSep, zDb
            );
            if( zSql==0 ) return SQLITE_NOMEM;
            zSep = " UNION ";
          }
          sqlite3_finalize(pS2);
          sqlite3_prepare_v2(pCur->db, zSql, -1, &pCur->pStmt, 0);
          sqlite3_free(zSql);
        }
        iCol = 0;
        eNextPhase = COMPLETION_COLUMNS;
        break;
      }
      case COMPLETION_COLUMNS: {
        if( pCur->pStmt==0 ){
          sqlite3_stmt *pS2;
          char *zSql = 0;
          const char *zSep = "";
          sqlite3_prepare_v2(pCur->db, "PRAGMA database_list", -1, &pS2, 0);
          while( sqlite3_step(pS2)==SQLITE_ROW ){
            const char *zDb = (const char*)sqlite3_column_text(pS2, 1);
            zSql = sqlite3_mprintf(
               "%z%s"
               "SELECT pti.name FROM \"%w\".sqlite_schema AS sm"
                       " JOIN pragma_table_info(sm.name,%Q) AS pti"
               " WHERE sm.type='table'",
               zSql, zSep, zDb, zDb
            );
            if( zSql==0 ) return SQLITE_NOMEM;
            zSep = " UNION ";
          }
          sqlite3_finalize(pS2);
          sqlite3_prepare_v2(pCur->db, zSql, -1, &pCur->pStmt, 0);
          sqlite3_free(zSql);
        }
        iCol = 0;
        eNextPhase = COMPLETION_EOF;
        break;
      }
    }
    if( iCol<0 ){
      /* This case is when the phase presets zCurrentRow */
      if( pCur->zCurrentRow==0 ) continue;
    }else{
      if( sqlite3_step(pCur->pStmt)==SQLITE_ROW ){
        /* Extract the next row of content */
        pCur->zCurrentRow = (const char*)sqlite3_column_text(pCur->pStmt, iCol);
        pCur->szRow = sqlite3_column_bytes(pCur->pStmt, iCol);
      }else{
        /* When all rows are finished, advance to the next phase */
        sqlite3_finalize(pCur->pStmt);
        pCur->pStmt = 0;
        pCur->ePhase = eNextPhase;
        continue;
      }
    }
    if( pCur->nPrefix==0 ) break;
    if( pCur->nPrefix<=pCur->szRow
     && sqlite3_strnicmp(pCur->zPrefix, pCur->zCurrentRow, pCur->nPrefix)==0
    ){
      break;
    }
  }

  return SQLITE_OK;
}

/*
** Return values of columns for the row at which the completion_cursor
** is currently pointing.
*/
static int completionColumn(
  sqlite3_vtab_cursor *cur,   /* The cursor */
  sqlite3_context *ctx,       /* First argument to sqlite3_result_...() */
  int i                       /* Which column to return */
){
  completion_cursor *pCur = (completion_cursor*)cur;
  switch( i ){
    case COMPLETION_COLUMN_CANDIDATE: {
      sqlite3_result_text(ctx, pCur->zCurrentRow, pCur->szRow,SQLITE_TRANSIENT);
      break;
    }
    case COMPLETION_COLUMN_PREFIX: {
      sqlite3_result_text(ctx, pCur->zPrefix, -1, SQLITE_TRANSIENT);
      break;
    }
    case COMPLETION_COLUMN_WHOLELINE: {
      sqlite3_result_text(ctx, pCur->zLine, -1, SQLITE_TRANSIENT);
      break;
    }
    case COMPLETION_COLUMN_PHASE: {
      sqlite3_result_int(ctx, pCur->ePhase);
      break;
    }
  }
  return SQLITE_OK;
}

/*
** Return the rowid for the current row.  In this implementation, the
** rowid is the same as the output value.
*/
static int completionRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  completion_cursor *pCur = (completion_cursor*)cur;
  *pRowid = pCur->iRowid;
  return SQLITE_OK;
}

/*
** Return TRUE if the cursor has been moved off of the last
** row of output.
*/
static int completionEof(sqlite3_vtab_cursor *cur){
  completion_cursor *pCur = (completion_cursor*)cur;
  return pCur->ePhase >= COMPLETION_EOF;
}

/*
** This method is called to "rewind" the completion_cursor object back
** to the first row of output.  This method is always called at least
** once prior to any call to completionColumn() or completionRowid() or 
** completionEof().
*/
static int completionFilter(
  sqlite3_vtab_cursor *pVtabCursor, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  completion_cursor *pCur = (completion_cursor *)pVtabCursor;
  int iArg = 0;
  (void)(idxStr);   /* Unused parameter */
  (void)(argc);     /* Unused parameter */
  completionCursorReset(pCur);
  if( idxNum & 1 ){
    pCur->nPrefix = sqlite3_value_bytes(argv[iArg]);
    if( pCur->nPrefix>0 ){
      pCur->zPrefix = sqlite3_mprintf("%s", sqlite3_value_text(argv[iArg]));
      if( pCur->zPrefix==0 ) return SQLITE_NOMEM;
    }
    iArg = 1;
  }
  if( idxNum & 2 ){
    pCur->nLine = sqlite3_value_bytes(argv[iArg]);
    if( pCur->nLine>0 ){
      pCur->zLine = sqlite3_mprintf("%s", sqlite3_value_text(argv[iArg]));
      if( pCur->zLine==0 ) return SQLITE_NOMEM;
    }
  }
  if( pCur->zLine!=0 && pCur->zPrefix==0 ){
    int i = pCur->nLine;
    while( i>0 && (isalnum(pCur->zLine[i-1]) || pCur->zLine[i-1]=='_') ){
      i--;
    }
    pCur->nPrefix = pCur->nLine - i;
    if( pCur->nPrefix>0 ){
      pCur->zPrefix = sqlite3_mprintf("%.*s", pCur->nPrefix, pCur->zLine + i);
      if( pCur->zPrefix==0 ) return SQLITE_NOMEM;
    }
  }
  pCur->iRowid = 0;
  pCur->ePhase = COMPLETION_FIRST_PHASE;
  return completionNext(pVtabCursor);
}

/*
** SQLite will invoke this method one or more times while planning a query
** that uses the completion virtual table.  This routine needs to create
** a query plan for each invocation and compute an estimated cost for that
** plan.
**
** There are two hidden parameters that act as arguments to the table-valued
** function:  "prefix" and "wholeline".  Bit 0 of idxNum is set if "prefix"
** is available and bit 1 is set if "wholeline" is available.
*/
static int completionBestIndex(
  sqlite3_vtab *tab,
  sqlite3_index_info *pIdxInfo
){
  int i;                 /* Loop over constraints */
  int idxNum = 0;        /* The query plan bitmask */
  int prefixIdx = -1;    /* Index of the start= constraint, or -1 if none */
  int wholelineIdx = -1; /* Index of the stop= constraint, or -1 if none */
  int nArg = 0;          /* Number of arguments that completeFilter() expects */
  const struct sqlite3_index_constraint *pConstraint;

  (void)(tab);    /* Unused parameter */
  pConstraint = pIdxInfo->aConstraint;
  for(i=0; i<pIdxInfo->nConstraint; i++, pConstraint++){
    if( pConstraint->usable==0 ) continue;
    if( pConstraint->op!=SQLITE_INDEX_CONSTRAINT_EQ ) continue;
    switch( pConstraint->iColumn ){
      case COMPLETION_COLUMN_PREFIX:
        prefixIdx = i;
        idxNum |= 1;
        break;
      case COMPLETION_COLUMN_WHOLELINE:
        wholelineIdx = i;
        idxNum |= 2;
        break;
    }
  }
  if( prefixIdx>=0 ){
    pIdxInfo->aConstraintUsage[prefixIdx].argvIndex = ++nArg;
    pIdxInfo->aConstraintUsage[prefixIdx].omit = 1;
  }
  if( wholelineIdx>=0 ){
    pIdxInfo->aConstraintUsage[wholelineIdx].argvIndex = ++nArg;
    pIdxInfo->aConstraintUsage[wholelineIdx].omit = 1;
  }
  pIdxInfo->idxNum = idxNum;
  pIdxInfo->estimatedCost = (double)5000 - 1000*nArg;
  pIdxInfo->estimatedRows = 500 - 100*nArg;
  return SQLITE_OK;
}

/*
** This following structure defines all the methods for the 
** completion virtual table.
*/
static sqlite3_module completionModule = {
  0,                         /* iVersion */
  0,                         /* xCreate */
  completionConnect,         /* xConnect */
  completionBestIndex,       /* xBestIndex */
  completionDisconnect,      /* xDisconnect */
  0,                         /* xDestroy */
  completionOpen,            /* xOpen - open a cursor */
  completionClose,           /* xClose - close a cursor */
  completionFilter,          /* xFilter - configure scan constraints */
  completionNext,            /* xNext - advance a cursor */
  completionEof,             /* xEof - check for end of scan */
  completionColumn,          /* xColumn - read data */
  completionRowid,           /* xRowid - read data */
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
  0                          /* xShadowName */
};

#endif /* SQLITE_OMIT_VIRTUALTABLE */

int sqlite3CompletionVtabInit(sqlite3 *db){
  int rc = SQLITE_OK;
#ifndef SQLITE_OMIT_VIRTUALTABLE
  rc = sqlite3_create_module(db, "completion", &completionModule, 0);
#endif
  return rc;
}

#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_completion_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)(pzErrMsg);  /* Unused parameter */
#ifndef SQLITE_OMIT_VIRTUALTABLE
  rc = sqlite3CompletionVtabInit(db);
#endif
  return rc;
}
