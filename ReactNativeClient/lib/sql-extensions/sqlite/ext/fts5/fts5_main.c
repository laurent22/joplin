/*
** 2014 Jun 09
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
** This is an SQLite module implementing full-text search.
*/


#include "fts5Int.h"

/*
** This variable is set to false when running tests for which the on disk
** structures should not be corrupt. Otherwise, true. If it is false, extra
** assert() conditions in the fts5 code are activated - conditions that are
** only true if it is guaranteed that the fts5 database is not corrupt.
*/
int sqlite3_fts5_may_be_corrupt = 1;


typedef struct Fts5Auxdata Fts5Auxdata;
typedef struct Fts5Auxiliary Fts5Auxiliary;
typedef struct Fts5Cursor Fts5Cursor;
typedef struct Fts5FullTable Fts5FullTable;
typedef struct Fts5Sorter Fts5Sorter;
typedef struct Fts5TokenizerModule Fts5TokenizerModule;

/*
** NOTES ON TRANSACTIONS: 
**
** SQLite invokes the following virtual table methods as transactions are 
** opened and closed by the user:
**
**     xBegin():    Start of a new transaction.
**     xSync():     Initial part of two-phase commit.
**     xCommit():   Final part of two-phase commit.
**     xRollback(): Rollback the transaction.
**
** Anything that is required as part of a commit that may fail is performed
** in the xSync() callback. Current versions of SQLite ignore any errors 
** returned by xCommit().
**
** And as sub-transactions are opened/closed:
**
**     xSavepoint(int S):  Open savepoint S.
**     xRelease(int S):    Commit and close savepoint S.
**     xRollbackTo(int S): Rollback to start of savepoint S.
**
** During a write-transaction the fts5_index.c module may cache some data 
** in-memory. It is flushed to disk whenever xSync(), xRelease() or
** xSavepoint() is called. And discarded whenever xRollback() or xRollbackTo() 
** is called.
**
** Additionally, if SQLITE_DEBUG is defined, an instance of the following
** structure is used to record the current transaction state. This information
** is not required, but it is used in the assert() statements executed by
** function fts5CheckTransactionState() (see below).
*/
struct Fts5TransactionState {
  int eState;                     /* 0==closed, 1==open, 2==synced */
  int iSavepoint;                 /* Number of open savepoints (0 -> none) */
};

/*
** A single object of this type is allocated when the FTS5 module is 
** registered with a database handle. It is used to store pointers to
** all registered FTS5 extensions - tokenizers and auxiliary functions.
*/
struct Fts5Global {
  fts5_api api;                   /* User visible part of object (see fts5.h) */
  sqlite3 *db;                    /* Associated database connection */ 
  i64 iNextId;                    /* Used to allocate unique cursor ids */
  Fts5Auxiliary *pAux;            /* First in list of all aux. functions */
  Fts5TokenizerModule *pTok;      /* First in list of all tokenizer modules */
  Fts5TokenizerModule *pDfltTok;  /* Default tokenizer module */
  Fts5Cursor *pCsr;               /* First in list of all open cursors */
};

/*
** Each auxiliary function registered with the FTS5 module is represented
** by an object of the following type. All such objects are stored as part
** of the Fts5Global.pAux list.
*/
struct Fts5Auxiliary {
  Fts5Global *pGlobal;            /* Global context for this function */
  char *zFunc;                    /* Function name (nul-terminated) */
  void *pUserData;                /* User-data pointer */
  fts5_extension_function xFunc;  /* Callback function */
  void (*xDestroy)(void*);        /* Destructor function */
  Fts5Auxiliary *pNext;           /* Next registered auxiliary function */
};

/*
** Each tokenizer module registered with the FTS5 module is represented
** by an object of the following type. All such objects are stored as part
** of the Fts5Global.pTok list.
*/
struct Fts5TokenizerModule {
  char *zName;                    /* Name of tokenizer */
  void *pUserData;                /* User pointer passed to xCreate() */
  fts5_tokenizer x;               /* Tokenizer functions */
  void (*xDestroy)(void*);        /* Destructor function */
  Fts5TokenizerModule *pNext;     /* Next registered tokenizer module */
};

struct Fts5FullTable {
  Fts5Table p;                    /* Public class members from fts5Int.h */
  Fts5Storage *pStorage;          /* Document store */
  Fts5Global *pGlobal;            /* Global (connection wide) data */
  Fts5Cursor *pSortCsr;           /* Sort data from this cursor */
#ifdef SQLITE_DEBUG
  struct Fts5TransactionState ts;
#endif
};

struct Fts5MatchPhrase {
  Fts5Buffer *pPoslist;           /* Pointer to current poslist */
  int nTerm;                      /* Size of phrase in terms */
};

/*
** pStmt:
**   SELECT rowid, <fts> FROM <fts> ORDER BY +rank;
**
** aIdx[]:
**   There is one entry in the aIdx[] array for each phrase in the query,
**   the value of which is the offset within aPoslist[] following the last 
**   byte of the position list for the corresponding phrase.
*/
struct Fts5Sorter {
  sqlite3_stmt *pStmt;
  i64 iRowid;                     /* Current rowid */
  const u8 *aPoslist;             /* Position lists for current row */
  int nIdx;                       /* Number of entries in aIdx[] */
  int aIdx[1];                    /* Offsets into aPoslist for current row */
};


/*
** Virtual-table cursor object.
**
** iSpecial:
**   If this is a 'special' query (refer to function fts5SpecialMatch()), 
**   then this variable contains the result of the query. 
**
** iFirstRowid, iLastRowid:
**   These variables are only used for FTS5_PLAN_MATCH cursors. Assuming the
**   cursor iterates in ascending order of rowids, iFirstRowid is the lower
**   limit of rowids to return, and iLastRowid the upper. In other words, the
**   WHERE clause in the user's query might have been:
**
**       <tbl> MATCH <expr> AND rowid BETWEEN $iFirstRowid AND $iLastRowid
**
**   If the cursor iterates in descending order of rowid, iFirstRowid
**   is the upper limit (i.e. the "first" rowid visited) and iLastRowid
**   the lower.
*/
struct Fts5Cursor {
  sqlite3_vtab_cursor base;       /* Base class used by SQLite core */
  Fts5Cursor *pNext;              /* Next cursor in Fts5Cursor.pCsr list */
  int *aColumnSize;               /* Values for xColumnSize() */
  i64 iCsrId;                     /* Cursor id */

  /* Zero from this point onwards on cursor reset */
  int ePlan;                      /* FTS5_PLAN_XXX value */
  int bDesc;                      /* True for "ORDER BY rowid DESC" queries */
  i64 iFirstRowid;                /* Return no rowids earlier than this */
  i64 iLastRowid;                 /* Return no rowids later than this */
  sqlite3_stmt *pStmt;            /* Statement used to read %_content */
  Fts5Expr *pExpr;                /* Expression for MATCH queries */
  Fts5Sorter *pSorter;            /* Sorter for "ORDER BY rank" queries */
  int csrflags;                   /* Mask of cursor flags (see below) */
  i64 iSpecial;                   /* Result of special query */

  /* "rank" function. Populated on demand from vtab.xColumn(). */
  char *zRank;                    /* Custom rank function */
  char *zRankArgs;                /* Custom rank function args */
  Fts5Auxiliary *pRank;           /* Rank callback (or NULL) */
  int nRankArg;                   /* Number of trailing arguments for rank() */
  sqlite3_value **apRankArg;      /* Array of trailing arguments */
  sqlite3_stmt *pRankArgStmt;     /* Origin of objects in apRankArg[] */

  /* Auxiliary data storage */
  Fts5Auxiliary *pAux;            /* Currently executing extension function */
  Fts5Auxdata *pAuxdata;          /* First in linked list of saved aux-data */

  /* Cache used by auxiliary functions xInst() and xInstCount() */
  Fts5PoslistReader *aInstIter;   /* One for each phrase */
  int nInstAlloc;                 /* Size of aInst[] array (entries / 3) */
  int nInstCount;                 /* Number of phrase instances */
  int *aInst;                     /* 3 integers per phrase instance */
};

/*
** Bits that make up the "idxNum" parameter passed indirectly by 
** xBestIndex() to xFilter().
*/
#define FTS5_BI_MATCH        0x0001         /* <tbl> MATCH ? */
#define FTS5_BI_RANK         0x0002         /* rank MATCH ? */
#define FTS5_BI_ROWID_EQ     0x0004         /* rowid == ? */
#define FTS5_BI_ROWID_LE     0x0008         /* rowid <= ? */
#define FTS5_BI_ROWID_GE     0x0010         /* rowid >= ? */

#define FTS5_BI_ORDER_RANK   0x0020
#define FTS5_BI_ORDER_ROWID  0x0040
#define FTS5_BI_ORDER_DESC   0x0080

/*
** Values for Fts5Cursor.csrflags
*/
#define FTS5CSR_EOF               0x01
#define FTS5CSR_REQUIRE_CONTENT   0x02
#define FTS5CSR_REQUIRE_DOCSIZE   0x04
#define FTS5CSR_REQUIRE_INST      0x08
#define FTS5CSR_FREE_ZRANK        0x10
#define FTS5CSR_REQUIRE_RESEEK    0x20
#define FTS5CSR_REQUIRE_POSLIST   0x40

#define BitFlagAllTest(x,y) (((x) & (y))==(y))
#define BitFlagTest(x,y)    (((x) & (y))!=0)


/*
** Macros to Set(), Clear() and Test() cursor flags.
*/
#define CsrFlagSet(pCsr, flag)   ((pCsr)->csrflags |= (flag))
#define CsrFlagClear(pCsr, flag) ((pCsr)->csrflags &= ~(flag))
#define CsrFlagTest(pCsr, flag)  ((pCsr)->csrflags & (flag))

struct Fts5Auxdata {
  Fts5Auxiliary *pAux;            /* Extension to which this belongs */
  void *pPtr;                     /* Pointer value */
  void(*xDelete)(void*);          /* Destructor */
  Fts5Auxdata *pNext;             /* Next object in linked list */
};

#ifdef SQLITE_DEBUG
#define FTS5_BEGIN      1
#define FTS5_SYNC       2
#define FTS5_COMMIT     3
#define FTS5_ROLLBACK   4
#define FTS5_SAVEPOINT  5
#define FTS5_RELEASE    6
#define FTS5_ROLLBACKTO 7
static void fts5CheckTransactionState(Fts5FullTable *p, int op, int iSavepoint){
  switch( op ){
    case FTS5_BEGIN:
      assert( p->ts.eState==0 );
      p->ts.eState = 1;
      p->ts.iSavepoint = -1;
      break;

    case FTS5_SYNC:
      assert( p->ts.eState==1 );
      p->ts.eState = 2;
      break;

    case FTS5_COMMIT:
      assert( p->ts.eState==2 );
      p->ts.eState = 0;
      break;

    case FTS5_ROLLBACK:
      assert( p->ts.eState==1 || p->ts.eState==2 || p->ts.eState==0 );
      p->ts.eState = 0;
      break;

    case FTS5_SAVEPOINT:
      assert( p->ts.eState==1 );
      assert( iSavepoint>=0 );
      assert( iSavepoint>=p->ts.iSavepoint );
      p->ts.iSavepoint = iSavepoint;
      break;
      
    case FTS5_RELEASE:
      assert( p->ts.eState==1 );
      assert( iSavepoint>=0 );
      assert( iSavepoint<=p->ts.iSavepoint );
      p->ts.iSavepoint = iSavepoint-1;
      break;

    case FTS5_ROLLBACKTO:
      assert( p->ts.eState==1 );
      assert( iSavepoint>=-1 );
      /* The following assert() can fail if another vtab strikes an error
      ** within an xSavepoint() call then SQLite calls xRollbackTo() - without
      ** having called xSavepoint() on this vtab.  */
      /* assert( iSavepoint<=p->ts.iSavepoint ); */
      p->ts.iSavepoint = iSavepoint;
      break;
  }
}
#else
# define fts5CheckTransactionState(x,y,z)
#endif

/*
** Return true if pTab is a contentless table.
*/
static int fts5IsContentless(Fts5FullTable *pTab){
  return pTab->p.pConfig->eContent==FTS5_CONTENT_NONE;
}

/*
** Delete a virtual table handle allocated by fts5InitVtab(). 
*/
static void fts5FreeVtab(Fts5FullTable *pTab){
  if( pTab ){
    sqlite3Fts5IndexClose(pTab->p.pIndex);
    sqlite3Fts5StorageClose(pTab->pStorage);
    sqlite3Fts5ConfigFree(pTab->p.pConfig);
    sqlite3_free(pTab);
  }
}

/*
** The xDisconnect() virtual table method.
*/
static int fts5DisconnectMethod(sqlite3_vtab *pVtab){
  fts5FreeVtab((Fts5FullTable*)pVtab);
  return SQLITE_OK;
}

/*
** The xDestroy() virtual table method.
*/
static int fts5DestroyMethod(sqlite3_vtab *pVtab){
  Fts5Table *pTab = (Fts5Table*)pVtab;
  int rc = sqlite3Fts5DropAll(pTab->pConfig);
  if( rc==SQLITE_OK ){
    fts5FreeVtab((Fts5FullTable*)pVtab);
  }
  return rc;
}

/*
** This function is the implementation of both the xConnect and xCreate
** methods of the FTS3 virtual table.
**
** The argv[] array contains the following:
**
**   argv[0]   -> module name  ("fts5")
**   argv[1]   -> database name
**   argv[2]   -> table name
**   argv[...] -> "column name" and other module argument fields.
*/
static int fts5InitVtab(
  int bCreate,                    /* True for xCreate, false for xConnect */
  sqlite3 *db,                    /* The SQLite database connection */
  void *pAux,                     /* Hash table containing tokenizers */
  int argc,                       /* Number of elements in argv array */
  const char * const *argv,       /* xCreate/xConnect argument array */
  sqlite3_vtab **ppVTab,          /* Write the resulting vtab structure here */
  char **pzErr                    /* Write any error message here */
){
  Fts5Global *pGlobal = (Fts5Global*)pAux;
  const char **azConfig = (const char**)argv;
  int rc = SQLITE_OK;             /* Return code */
  Fts5Config *pConfig = 0;        /* Results of parsing argc/argv */
  Fts5FullTable *pTab = 0;        /* New virtual table object */

  /* Allocate the new vtab object and parse the configuration */
  pTab = (Fts5FullTable*)sqlite3Fts5MallocZero(&rc, sizeof(Fts5FullTable));
  if( rc==SQLITE_OK ){
    rc = sqlite3Fts5ConfigParse(pGlobal, db, argc, azConfig, &pConfig, pzErr);
    assert( (rc==SQLITE_OK && *pzErr==0) || pConfig==0 );
  }
  if( rc==SQLITE_OK ){
    pTab->p.pConfig = pConfig;
    pTab->pGlobal = pGlobal;
  }

  /* Open the index sub-system */
  if( rc==SQLITE_OK ){
    rc = sqlite3Fts5IndexOpen(pConfig, bCreate, &pTab->p.pIndex, pzErr);
  }

  /* Open the storage sub-system */
  if( rc==SQLITE_OK ){
    rc = sqlite3Fts5StorageOpen(
        pConfig, pTab->p.pIndex, bCreate, &pTab->pStorage, pzErr
    );
  }

  /* Call sqlite3_declare_vtab() */
  if( rc==SQLITE_OK ){
    rc = sqlite3Fts5ConfigDeclareVtab(pConfig);
  }

  /* Load the initial configuration */
  if( rc==SQLITE_OK ){
    assert( pConfig->pzErrmsg==0 );
    pConfig->pzErrmsg = pzErr;
    rc = sqlite3Fts5IndexLoadConfig(pTab->p.pIndex);
    sqlite3Fts5IndexRollback(pTab->p.pIndex);
    pConfig->pzErrmsg = 0;
  }

  if( rc!=SQLITE_OK ){
    fts5FreeVtab(pTab);
    pTab = 0;
  }else if( bCreate ){
    fts5CheckTransactionState(pTab, FTS5_BEGIN, 0);
  }
  *ppVTab = (sqlite3_vtab*)pTab;
  return rc;
}

/*
** The xConnect() and xCreate() methods for the virtual table. All the
** work is done in function fts5InitVtab().
*/
static int fts5ConnectMethod(
  sqlite3 *db,                    /* Database connection */
  void *pAux,                     /* Pointer to tokenizer hash table */
  int argc,                       /* Number of elements in argv array */
  const char * const *argv,       /* xCreate/xConnect argument array */
  sqlite3_vtab **ppVtab,          /* OUT: New sqlite3_vtab object */
  char **pzErr                    /* OUT: sqlite3_malloc'd error message */
){
  return fts5InitVtab(0, db, pAux, argc, argv, ppVtab, pzErr);
}
static int fts5CreateMethod(
  sqlite3 *db,                    /* Database connection */
  void *pAux,                     /* Pointer to tokenizer hash table */
  int argc,                       /* Number of elements in argv array */
  const char * const *argv,       /* xCreate/xConnect argument array */
  sqlite3_vtab **ppVtab,          /* OUT: New sqlite3_vtab object */
  char **pzErr                    /* OUT: sqlite3_malloc'd error message */
){
  return fts5InitVtab(1, db, pAux, argc, argv, ppVtab, pzErr);
}

/*
** The different query plans.
*/
#define FTS5_PLAN_MATCH          1       /* (<tbl> MATCH ?) */
#define FTS5_PLAN_SOURCE         2       /* A source cursor for SORTED_MATCH */
#define FTS5_PLAN_SPECIAL        3       /* An internal query */
#define FTS5_PLAN_SORTED_MATCH   4       /* (<tbl> MATCH ? ORDER BY rank) */
#define FTS5_PLAN_SCAN           5       /* No usable constraint */
#define FTS5_PLAN_ROWID          6       /* (rowid = ?) */

/*
** Set the SQLITE_INDEX_SCAN_UNIQUE flag in pIdxInfo->flags. Unless this
** extension is currently being used by a version of SQLite too old to
** support index-info flags. In that case this function is a no-op.
*/
static void fts5SetUniqueFlag(sqlite3_index_info *pIdxInfo){
#if SQLITE_VERSION_NUMBER>=3008012
#ifndef SQLITE_CORE
  if( sqlite3_libversion_number()>=3008012 )
#endif
  {
    pIdxInfo->idxFlags |= SQLITE_INDEX_SCAN_UNIQUE;
  }
#endif
}

/*
** Implementation of the xBestIndex method for FTS5 tables. Within the 
** WHERE constraint, it searches for the following:
**
**   1. A MATCH constraint against the table column.
**   2. A MATCH constraint against the "rank" column.
**   3. A MATCH constraint against some other column.
**   4. An == constraint against the rowid column.
**   5. A < or <= constraint against the rowid column.
**   6. A > or >= constraint against the rowid column.
**
** Within the ORDER BY, the following are supported:
**
**   5. ORDER BY rank [ASC|DESC]
**   6. ORDER BY rowid [ASC|DESC]
**
** Information for the xFilter call is passed via both the idxNum and 
** idxStr variables. Specifically, idxNum is a bitmask of the following
** flags used to encode the ORDER BY clause:
**
**     FTS5_BI_ORDER_RANK
**     FTS5_BI_ORDER_ROWID
**     FTS5_BI_ORDER_DESC
**
** idxStr is used to encode data from the WHERE clause. For each argument
** passed to the xFilter method, the following is appended to idxStr:
**
**   Match against table column:            "m"
**   Match against rank column:             "r"
**   Match against other column:            "<column-number>"
**   Equality constraint against the rowid: "="
**   A < or <= against the rowid:           "<"
**   A > or >= against the rowid:           ">"
**
** This function ensures that there is at most one "r" or "=". And that if
** there exists an "=" then there is no "<" or ">".
**
** Costs are assigned as follows:
**
**  a) If an unusable MATCH operator is present in the WHERE clause, the
**     cost is unconditionally set to 1e50 (a really big number).
**
**  a) If a MATCH operator is present, the cost depends on the other
**     constraints also present. As follows:
**
**       * No other constraints:         cost=1000.0
**       * One rowid range constraint:   cost=750.0
**       * Both rowid range constraints: cost=500.0
**       * An == rowid constraint:       cost=100.0
**
**  b) Otherwise, if there is no MATCH:
**
**       * No other constraints:         cost=1000000.0
**       * One rowid range constraint:   cost=750000.0
**       * Both rowid range constraints: cost=250000.0
**       * An == rowid constraint:       cost=10.0
**
** Costs are not modified by the ORDER BY clause.
*/
static int fts5BestIndexMethod(sqlite3_vtab *pVTab, sqlite3_index_info *pInfo){
  Fts5Table *pTab = (Fts5Table*)pVTab;
  Fts5Config *pConfig = pTab->pConfig;
  const int nCol = pConfig->nCol;
  int idxFlags = 0;               /* Parameter passed through to xFilter() */
  int i;

  char *idxStr;
  int iIdxStr = 0;
  int iCons = 0;

  int bSeenEq = 0;
  int bSeenGt = 0;
  int bSeenLt = 0;
  int bSeenMatch = 0;
  int bSeenRank = 0;


  assert( SQLITE_INDEX_CONSTRAINT_EQ<SQLITE_INDEX_CONSTRAINT_MATCH );
  assert( SQLITE_INDEX_CONSTRAINT_GT<SQLITE_INDEX_CONSTRAINT_MATCH );
  assert( SQLITE_INDEX_CONSTRAINT_LE<SQLITE_INDEX_CONSTRAINT_MATCH );
  assert( SQLITE_INDEX_CONSTRAINT_GE<SQLITE_INDEX_CONSTRAINT_MATCH );
  assert( SQLITE_INDEX_CONSTRAINT_LE<SQLITE_INDEX_CONSTRAINT_MATCH );

  if( pConfig->bLock ){
    pTab->base.zErrMsg = sqlite3_mprintf(
        "recursively defined fts5 content table"
    );
    return SQLITE_ERROR;
  }

  idxStr = (char*)sqlite3_malloc(pInfo->nConstraint * 6 + 1);
  if( idxStr==0 ) return SQLITE_NOMEM;
  pInfo->idxStr = idxStr;
  pInfo->needToFreeIdxStr = 1;

  for(i=0; i<pInfo->nConstraint; i++){
    struct sqlite3_index_constraint *p = &pInfo->aConstraint[i];
    int iCol = p->iColumn;
    if( p->op==SQLITE_INDEX_CONSTRAINT_MATCH
     || (p->op==SQLITE_INDEX_CONSTRAINT_EQ && iCol>=nCol)
    ){
      /* A MATCH operator or equivalent */
      if( p->usable==0 || iCol<0 ){
        /* As there exists an unusable MATCH constraint this is an 
        ** unusable plan. Set a prohibitively high cost. */
        pInfo->estimatedCost = 1e50;
        assert( iIdxStr < pInfo->nConstraint*6 + 1 );
        idxStr[iIdxStr] = 0;
        return SQLITE_OK;
      }else{
        if( iCol==nCol+1 ){
          if( bSeenRank ) continue;
          idxStr[iIdxStr++] = 'r';
          bSeenRank = 1;
        }else{
          bSeenMatch = 1;
          idxStr[iIdxStr++] = 'm';
          if( iCol<nCol ){
            sqlite3_snprintf(6, &idxStr[iIdxStr], "%d", iCol);
            idxStr += strlen(&idxStr[iIdxStr]);
            assert( idxStr[iIdxStr]=='\0' );
          }
        }
        pInfo->aConstraintUsage[i].argvIndex = ++iCons;
        pInfo->aConstraintUsage[i].omit = 1;
      }
    }
    else if( p->usable && bSeenEq==0 
      && p->op==SQLITE_INDEX_CONSTRAINT_EQ && iCol<0 
    ){
      idxStr[iIdxStr++] = '=';
      bSeenEq = 1;
      pInfo->aConstraintUsage[i].argvIndex = ++iCons;
    }
  }

  if( bSeenEq==0 ){
    for(i=0; i<pInfo->nConstraint; i++){
      struct sqlite3_index_constraint *p = &pInfo->aConstraint[i];
      if( p->iColumn<0 && p->usable ){
        int op = p->op;
        if( op==SQLITE_INDEX_CONSTRAINT_LT || op==SQLITE_INDEX_CONSTRAINT_LE ){
          if( bSeenLt ) continue;
          idxStr[iIdxStr++] = '<';
          pInfo->aConstraintUsage[i].argvIndex = ++iCons;
          bSeenLt = 1;
        }else
        if( op==SQLITE_INDEX_CONSTRAINT_GT || op==SQLITE_INDEX_CONSTRAINT_GE ){
          if( bSeenGt ) continue;
          idxStr[iIdxStr++] = '>';
          pInfo->aConstraintUsage[i].argvIndex = ++iCons;
          bSeenGt = 1;
        }
      }
    }
  }
  idxStr[iIdxStr] = '\0';

  /* Set idxFlags flags for the ORDER BY clause */
  if( pInfo->nOrderBy==1 ){
    int iSort = pInfo->aOrderBy[0].iColumn;
    if( iSort==(pConfig->nCol+1) && bSeenMatch ){
      idxFlags |= FTS5_BI_ORDER_RANK;
    }else if( iSort==-1 ){
      idxFlags |= FTS5_BI_ORDER_ROWID;
    }
    if( BitFlagTest(idxFlags, FTS5_BI_ORDER_RANK|FTS5_BI_ORDER_ROWID) ){
      pInfo->orderByConsumed = 1;
      if( pInfo->aOrderBy[0].desc ){
        idxFlags |= FTS5_BI_ORDER_DESC;
      }
    }
  }

  /* Calculate the estimated cost based on the flags set in idxFlags. */
  if( bSeenEq ){
    pInfo->estimatedCost = bSeenMatch ? 100.0 : 10.0;
    if( bSeenMatch==0 ) fts5SetUniqueFlag(pInfo);
  }else if( bSeenLt && bSeenGt ){
    pInfo->estimatedCost = bSeenMatch ? 500.0 : 250000.0;
  }else if( bSeenLt || bSeenGt ){
    pInfo->estimatedCost = bSeenMatch ? 750.0 : 750000.0;
  }else{
    pInfo->estimatedCost = bSeenMatch ? 1000.0 : 1000000.0;
  }

  pInfo->idxNum = idxFlags;
  return SQLITE_OK;
}

static int fts5NewTransaction(Fts5FullTable *pTab){
  Fts5Cursor *pCsr;
  for(pCsr=pTab->pGlobal->pCsr; pCsr; pCsr=pCsr->pNext){
    if( pCsr->base.pVtab==(sqlite3_vtab*)pTab ) return SQLITE_OK;
  }
  return sqlite3Fts5StorageReset(pTab->pStorage);
}

/*
** Implementation of xOpen method.
*/
static int fts5OpenMethod(sqlite3_vtab *pVTab, sqlite3_vtab_cursor **ppCsr){
  Fts5FullTable *pTab = (Fts5FullTable*)pVTab;
  Fts5Config *pConfig = pTab->p.pConfig;
  Fts5Cursor *pCsr = 0;           /* New cursor object */
  sqlite3_int64 nByte;            /* Bytes of space to allocate */
  int rc;                         /* Return code */

  rc = fts5NewTransaction(pTab);
  if( rc==SQLITE_OK ){
    nByte = sizeof(Fts5Cursor) + pConfig->nCol * sizeof(int);
    pCsr = (Fts5Cursor*)sqlite3_malloc64(nByte);
    if( pCsr ){
      Fts5Global *pGlobal = pTab->pGlobal;
      memset(pCsr, 0, (size_t)nByte);
      pCsr->aColumnSize = (int*)&pCsr[1];
      pCsr->pNext = pGlobal->pCsr;
      pGlobal->pCsr = pCsr;
      pCsr->iCsrId = ++pGlobal->iNextId;
    }else{
      rc = SQLITE_NOMEM;
    }
  }
  *ppCsr = (sqlite3_vtab_cursor*)pCsr;
  return rc;
}

static int fts5StmtType(Fts5Cursor *pCsr){
  if( pCsr->ePlan==FTS5_PLAN_SCAN ){
    return (pCsr->bDesc) ? FTS5_STMT_SCAN_DESC : FTS5_STMT_SCAN_ASC;
  }
  return FTS5_STMT_LOOKUP;
}

/*
** This function is called after the cursor passed as the only argument
** is moved to point at a different row. It clears all cached data 
** specific to the previous row stored by the cursor object.
*/
static void fts5CsrNewrow(Fts5Cursor *pCsr){
  CsrFlagSet(pCsr, 
      FTS5CSR_REQUIRE_CONTENT 
    | FTS5CSR_REQUIRE_DOCSIZE 
    | FTS5CSR_REQUIRE_INST 
    | FTS5CSR_REQUIRE_POSLIST 
  );
}

static void fts5FreeCursorComponents(Fts5Cursor *pCsr){
  Fts5FullTable *pTab = (Fts5FullTable*)(pCsr->base.pVtab);
  Fts5Auxdata *pData;
  Fts5Auxdata *pNext;

  sqlite3_free(pCsr->aInstIter);
  sqlite3_free(pCsr->aInst);
  if( pCsr->pStmt ){
    int eStmt = fts5StmtType(pCsr);
    sqlite3Fts5StorageStmtRelease(pTab->pStorage, eStmt, pCsr->pStmt);
  }
  if( pCsr->pSorter ){
    Fts5Sorter *pSorter = pCsr->pSorter;
    sqlite3_finalize(pSorter->pStmt);
    sqlite3_free(pSorter);
  }

  if( pCsr->ePlan!=FTS5_PLAN_SOURCE ){
    sqlite3Fts5ExprFree(pCsr->pExpr);
  }

  for(pData=pCsr->pAuxdata; pData; pData=pNext){
    pNext = pData->pNext;
    if( pData->xDelete ) pData->xDelete(pData->pPtr);
    sqlite3_free(pData);
  }

  sqlite3_finalize(pCsr->pRankArgStmt);
  sqlite3_free(pCsr->apRankArg);

  if( CsrFlagTest(pCsr, FTS5CSR_FREE_ZRANK) ){
    sqlite3_free(pCsr->zRank);
    sqlite3_free(pCsr->zRankArgs);
  }

  sqlite3Fts5IndexCloseReader(pTab->p.pIndex);
  memset(&pCsr->ePlan, 0, sizeof(Fts5Cursor) - ((u8*)&pCsr->ePlan - (u8*)pCsr));
}


/*
** Close the cursor.  For additional information see the documentation
** on the xClose method of the virtual table interface.
*/
static int fts5CloseMethod(sqlite3_vtab_cursor *pCursor){
  if( pCursor ){
    Fts5FullTable *pTab = (Fts5FullTable*)(pCursor->pVtab);
    Fts5Cursor *pCsr = (Fts5Cursor*)pCursor;
    Fts5Cursor **pp;

    fts5FreeCursorComponents(pCsr);
    /* Remove the cursor from the Fts5Global.pCsr list */
    for(pp=&pTab->pGlobal->pCsr; (*pp)!=pCsr; pp=&(*pp)->pNext);
    *pp = pCsr->pNext;

    sqlite3_free(pCsr);
  }
  return SQLITE_OK;
}

static int fts5SorterNext(Fts5Cursor *pCsr){
  Fts5Sorter *pSorter = pCsr->pSorter;
  int rc;

  rc = sqlite3_step(pSorter->pStmt);
  if( rc==SQLITE_DONE ){
    rc = SQLITE_OK;
    CsrFlagSet(pCsr, FTS5CSR_EOF);
  }else if( rc==SQLITE_ROW ){
    const u8 *a;
    const u8 *aBlob;
    int nBlob;
    int i;
    int iOff = 0;
    rc = SQLITE_OK;

    pSorter->iRowid = sqlite3_column_int64(pSorter->pStmt, 0);
    nBlob = sqlite3_column_bytes(pSorter->pStmt, 1);
    aBlob = a = sqlite3_column_blob(pSorter->pStmt, 1);

    /* nBlob==0 in detail=none mode. */
    if( nBlob>0 ){
      for(i=0; i<(pSorter->nIdx-1); i++){
        int iVal;
        a += fts5GetVarint32(a, iVal);
        iOff += iVal;
        pSorter->aIdx[i] = iOff;
      }
      pSorter->aIdx[i] = &aBlob[nBlob] - a;
      pSorter->aPoslist = a;
    }

    fts5CsrNewrow(pCsr);
  }

  return rc;
}


/*
** Set the FTS5CSR_REQUIRE_RESEEK flag on all FTS5_PLAN_MATCH cursors 
** open on table pTab.
*/
static void fts5TripCursors(Fts5FullTable *pTab){
  Fts5Cursor *pCsr;
  for(pCsr=pTab->pGlobal->pCsr; pCsr; pCsr=pCsr->pNext){
    if( pCsr->ePlan==FTS5_PLAN_MATCH
     && pCsr->base.pVtab==(sqlite3_vtab*)pTab 
    ){
      CsrFlagSet(pCsr, FTS5CSR_REQUIRE_RESEEK);
    }
  }
}

/*
** If the REQUIRE_RESEEK flag is set on the cursor passed as the first
** argument, close and reopen all Fts5IndexIter iterators that the cursor 
** is using. Then attempt to move the cursor to a rowid equal to or laster
** (in the cursors sort order - ASC or DESC) than the current rowid. 
**
** If the new rowid is not equal to the old, set output parameter *pbSkip
** to 1 before returning. Otherwise, leave it unchanged.
**
** Return SQLITE_OK if successful or if no reseek was required, or an 
** error code if an error occurred.
*/
static int fts5CursorReseek(Fts5Cursor *pCsr, int *pbSkip){
  int rc = SQLITE_OK;
  assert( *pbSkip==0 );
  if( CsrFlagTest(pCsr, FTS5CSR_REQUIRE_RESEEK) ){
    Fts5FullTable *pTab = (Fts5FullTable*)(pCsr->base.pVtab);
    int bDesc = pCsr->bDesc;
    i64 iRowid = sqlite3Fts5ExprRowid(pCsr->pExpr);

    rc = sqlite3Fts5ExprFirst(pCsr->pExpr, pTab->p.pIndex, iRowid, bDesc);
    if( rc==SQLITE_OK &&  iRowid!=sqlite3Fts5ExprRowid(pCsr->pExpr) ){
      *pbSkip = 1;
    }

    CsrFlagClear(pCsr, FTS5CSR_REQUIRE_RESEEK);
    fts5CsrNewrow(pCsr);
    if( sqlite3Fts5ExprEof(pCsr->pExpr) ){
      CsrFlagSet(pCsr, FTS5CSR_EOF);
      *pbSkip = 1;
    }
  }
  return rc;
}


/*
** Advance the cursor to the next row in the table that matches the 
** search criteria.
**
** Return SQLITE_OK if nothing goes wrong.  SQLITE_OK is returned
** even if we reach end-of-file.  The fts5EofMethod() will be called
** subsequently to determine whether or not an EOF was hit.
*/
static int fts5NextMethod(sqlite3_vtab_cursor *pCursor){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCursor;
  int rc;

  assert( (pCsr->ePlan<3)==
          (pCsr->ePlan==FTS5_PLAN_MATCH || pCsr->ePlan==FTS5_PLAN_SOURCE) 
  );
  assert( !CsrFlagTest(pCsr, FTS5CSR_EOF) );

  if( pCsr->ePlan<3 ){
    int bSkip = 0;
    if( (rc = fts5CursorReseek(pCsr, &bSkip)) || bSkip ) return rc;
    rc = sqlite3Fts5ExprNext(pCsr->pExpr, pCsr->iLastRowid);
    CsrFlagSet(pCsr, sqlite3Fts5ExprEof(pCsr->pExpr));
    fts5CsrNewrow(pCsr);
  }else{
    switch( pCsr->ePlan ){
      case FTS5_PLAN_SPECIAL: {
        CsrFlagSet(pCsr, FTS5CSR_EOF);
        rc = SQLITE_OK;
        break;
      }
  
      case FTS5_PLAN_SORTED_MATCH: {
        rc = fts5SorterNext(pCsr);
        break;
      }
  
      default: {
        Fts5Config *pConfig = ((Fts5Table*)pCursor->pVtab)->pConfig;
        pConfig->bLock++;
        rc = sqlite3_step(pCsr->pStmt);
        pConfig->bLock--;
        if( rc!=SQLITE_ROW ){
          CsrFlagSet(pCsr, FTS5CSR_EOF);
          rc = sqlite3_reset(pCsr->pStmt);
          if( rc!=SQLITE_OK ){
            pCursor->pVtab->zErrMsg = sqlite3_mprintf(
                "%s", sqlite3_errmsg(pConfig->db)
            );
          }
        }else{
          rc = SQLITE_OK;
        }
        break;
      }
    }
  }
  
  return rc;
}


static int fts5PrepareStatement(
  sqlite3_stmt **ppStmt,
  Fts5Config *pConfig, 
  const char *zFmt,
  ...
){
  sqlite3_stmt *pRet = 0;
  int rc;
  char *zSql;
  va_list ap;

  va_start(ap, zFmt);
  zSql = sqlite3_vmprintf(zFmt, ap);
  if( zSql==0 ){
    rc = SQLITE_NOMEM; 
  }else{
    rc = sqlite3_prepare_v3(pConfig->db, zSql, -1, 
                            SQLITE_PREPARE_PERSISTENT, &pRet, 0);
    if( rc!=SQLITE_OK ){
      *pConfig->pzErrmsg = sqlite3_mprintf("%s", sqlite3_errmsg(pConfig->db));
    }
    sqlite3_free(zSql);
  }

  va_end(ap);
  *ppStmt = pRet;
  return rc;
} 

static int fts5CursorFirstSorted(
  Fts5FullTable *pTab, 
  Fts5Cursor *pCsr, 
  int bDesc
){
  Fts5Config *pConfig = pTab->p.pConfig;
  Fts5Sorter *pSorter;
  int nPhrase;
  sqlite3_int64 nByte;
  int rc;
  const char *zRank = pCsr->zRank;
  const char *zRankArgs = pCsr->zRankArgs;
  
  nPhrase = sqlite3Fts5ExprPhraseCount(pCsr->pExpr);
  nByte = sizeof(Fts5Sorter) + sizeof(int) * (nPhrase-1);
  pSorter = (Fts5Sorter*)sqlite3_malloc64(nByte);
  if( pSorter==0 ) return SQLITE_NOMEM;
  memset(pSorter, 0, (size_t)nByte);
  pSorter->nIdx = nPhrase;

  /* TODO: It would be better to have some system for reusing statement
  ** handles here, rather than preparing a new one for each query. But that
  ** is not possible as SQLite reference counts the virtual table objects.
  ** And since the statement required here reads from this very virtual 
  ** table, saving it creates a circular reference.
  **
  ** If SQLite a built-in statement cache, this wouldn't be a problem. */
  rc = fts5PrepareStatement(&pSorter->pStmt, pConfig,
      "SELECT rowid, rank FROM %Q.%Q ORDER BY %s(\"%w\"%s%s) %s",
      pConfig->zDb, pConfig->zName, zRank, pConfig->zName,
      (zRankArgs ? ", " : ""),
      (zRankArgs ? zRankArgs : ""),
      bDesc ? "DESC" : "ASC"
  );

  pCsr->pSorter = pSorter;
  if( rc==SQLITE_OK ){
    assert( pTab->pSortCsr==0 );
    pTab->pSortCsr = pCsr;
    rc = fts5SorterNext(pCsr);
    pTab->pSortCsr = 0;
  }

  if( rc!=SQLITE_OK ){
    sqlite3_finalize(pSorter->pStmt);
    sqlite3_free(pSorter);
    pCsr->pSorter = 0;
  }

  return rc;
}

static int fts5CursorFirst(Fts5FullTable *pTab, Fts5Cursor *pCsr, int bDesc){
  int rc;
  Fts5Expr *pExpr = pCsr->pExpr;
  rc = sqlite3Fts5ExprFirst(pExpr, pTab->p.pIndex, pCsr->iFirstRowid, bDesc);
  if( sqlite3Fts5ExprEof(pExpr) ){
    CsrFlagSet(pCsr, FTS5CSR_EOF);
  }
  fts5CsrNewrow(pCsr);
  return rc;
}

/*
** Process a "special" query. A special query is identified as one with a
** MATCH expression that begins with a '*' character. The remainder of
** the text passed to the MATCH operator are used as  the special query
** parameters.
*/
static int fts5SpecialMatch(
  Fts5FullTable *pTab, 
  Fts5Cursor *pCsr, 
  const char *zQuery
){
  int rc = SQLITE_OK;             /* Return code */
  const char *z = zQuery;         /* Special query text */
  int n;                          /* Number of bytes in text at z */

  while( z[0]==' ' ) z++;
  for(n=0; z[n] && z[n]!=' '; n++);

  assert( pTab->p.base.zErrMsg==0 );
  pCsr->ePlan = FTS5_PLAN_SPECIAL;

  if( n==5 && 0==sqlite3_strnicmp("reads", z, n) ){
    pCsr->iSpecial = sqlite3Fts5IndexReads(pTab->p.pIndex);
  }
  else if( n==2 && 0==sqlite3_strnicmp("id", z, n) ){
    pCsr->iSpecial = pCsr->iCsrId;
  }
  else{
    /* An unrecognized directive. Return an error message. */
    pTab->p.base.zErrMsg = sqlite3_mprintf("unknown special query: %.*s", n, z);
    rc = SQLITE_ERROR;
  }

  return rc;
}

/*
** Search for an auxiliary function named zName that can be used with table
** pTab. If one is found, return a pointer to the corresponding Fts5Auxiliary
** structure. Otherwise, if no such function exists, return NULL.
*/
static Fts5Auxiliary *fts5FindAuxiliary(Fts5FullTable *pTab, const char *zName){
  Fts5Auxiliary *pAux;

  for(pAux=pTab->pGlobal->pAux; pAux; pAux=pAux->pNext){
    if( sqlite3_stricmp(zName, pAux->zFunc)==0 ) return pAux;
  }

  /* No function of the specified name was found. Return 0. */
  return 0;
}


static int fts5FindRankFunction(Fts5Cursor *pCsr){
  Fts5FullTable *pTab = (Fts5FullTable*)(pCsr->base.pVtab);
  Fts5Config *pConfig = pTab->p.pConfig;
  int rc = SQLITE_OK;
  Fts5Auxiliary *pAux = 0;
  const char *zRank = pCsr->zRank;
  const char *zRankArgs = pCsr->zRankArgs;

  if( zRankArgs ){
    char *zSql = sqlite3Fts5Mprintf(&rc, "SELECT %s", zRankArgs);
    if( zSql ){
      sqlite3_stmt *pStmt = 0;
      rc = sqlite3_prepare_v3(pConfig->db, zSql, -1,
                              SQLITE_PREPARE_PERSISTENT, &pStmt, 0);
      sqlite3_free(zSql);
      assert( rc==SQLITE_OK || pCsr->pRankArgStmt==0 );
      if( rc==SQLITE_OK ){
        if( SQLITE_ROW==sqlite3_step(pStmt) ){
          sqlite3_int64 nByte;
          pCsr->nRankArg = sqlite3_column_count(pStmt);
          nByte = sizeof(sqlite3_value*)*pCsr->nRankArg;
          pCsr->apRankArg = (sqlite3_value**)sqlite3Fts5MallocZero(&rc, nByte);
          if( rc==SQLITE_OK ){
            int i;
            for(i=0; i<pCsr->nRankArg; i++){
              pCsr->apRankArg[i] = sqlite3_column_value(pStmt, i);
            }
          }
          pCsr->pRankArgStmt = pStmt;
        }else{
          rc = sqlite3_finalize(pStmt);
          assert( rc!=SQLITE_OK );
        }
      }
    }
  }

  if( rc==SQLITE_OK ){
    pAux = fts5FindAuxiliary(pTab, zRank);
    if( pAux==0 ){
      assert( pTab->p.base.zErrMsg==0 );
      pTab->p.base.zErrMsg = sqlite3_mprintf("no such function: %s", zRank);
      rc = SQLITE_ERROR;
    }
  }

  pCsr->pRank = pAux;
  return rc;
}


static int fts5CursorParseRank(
  Fts5Config *pConfig,
  Fts5Cursor *pCsr, 
  sqlite3_value *pRank
){
  int rc = SQLITE_OK;
  if( pRank ){
    const char *z = (const char*)sqlite3_value_text(pRank);
    char *zRank = 0;
    char *zRankArgs = 0;

    if( z==0 ){
      if( sqlite3_value_type(pRank)==SQLITE_NULL ) rc = SQLITE_ERROR;
    }else{
      rc = sqlite3Fts5ConfigParseRank(z, &zRank, &zRankArgs);
    }
    if( rc==SQLITE_OK ){
      pCsr->zRank = zRank;
      pCsr->zRankArgs = zRankArgs;
      CsrFlagSet(pCsr, FTS5CSR_FREE_ZRANK);
    }else if( rc==SQLITE_ERROR ){
      pCsr->base.pVtab->zErrMsg = sqlite3_mprintf(
          "parse error in rank function: %s", z
      );
    }
  }else{
    if( pConfig->zRank ){
      pCsr->zRank = (char*)pConfig->zRank;
      pCsr->zRankArgs = (char*)pConfig->zRankArgs;
    }else{
      pCsr->zRank = (char*)FTS5_DEFAULT_RANK;
      pCsr->zRankArgs = 0;
    }
  }
  return rc;
}

static i64 fts5GetRowidLimit(sqlite3_value *pVal, i64 iDefault){
  if( pVal ){
    int eType = sqlite3_value_numeric_type(pVal);
    if( eType==SQLITE_INTEGER ){
      return sqlite3_value_int64(pVal);
    }
  }
  return iDefault;
}

/*
** This is the xFilter interface for the virtual table.  See
** the virtual table xFilter method documentation for additional
** information.
** 
** There are three possible query strategies:
**
**   1. Full-text search using a MATCH operator.
**   2. A by-rowid lookup.
**   3. A full-table scan.
*/
static int fts5FilterMethod(
  sqlite3_vtab_cursor *pCursor,   /* The cursor used for this query */
  int idxNum,                     /* Strategy index */
  const char *idxStr,             /* Unused */
  int nVal,                       /* Number of elements in apVal */
  sqlite3_value **apVal           /* Arguments for the indexing scheme */
){
  Fts5FullTable *pTab = (Fts5FullTable*)(pCursor->pVtab);
  Fts5Config *pConfig = pTab->p.pConfig;
  Fts5Cursor *pCsr = (Fts5Cursor*)pCursor;
  int rc = SQLITE_OK;             /* Error code */
  int bDesc;                      /* True if ORDER BY [rank|rowid] DESC */
  int bOrderByRank;               /* True if ORDER BY rank */
  sqlite3_value *pRank = 0;       /* rank MATCH ? expression (or NULL) */
  sqlite3_value *pRowidEq = 0;    /* rowid = ? expression (or NULL) */
  sqlite3_value *pRowidLe = 0;    /* rowid <= ? expression (or NULL) */
  sqlite3_value *pRowidGe = 0;    /* rowid >= ? expression (or NULL) */
  int iCol;                       /* Column on LHS of MATCH operator */
  char **pzErrmsg = pConfig->pzErrmsg;
  int i;
  int iIdxStr = 0;
  Fts5Expr *pExpr = 0;

  if( pConfig->bLock ){
    pTab->p.base.zErrMsg = sqlite3_mprintf(
        "recursively defined fts5 content table"
    );
    return SQLITE_ERROR;
  }

  if( pCsr->ePlan ){
    fts5FreeCursorComponents(pCsr);
    memset(&pCsr->ePlan, 0, sizeof(Fts5Cursor) - ((u8*)&pCsr->ePlan-(u8*)pCsr));
  }

  assert( pCsr->pStmt==0 );
  assert( pCsr->pExpr==0 );
  assert( pCsr->csrflags==0 );
  assert( pCsr->pRank==0 );
  assert( pCsr->zRank==0 );
  assert( pCsr->zRankArgs==0 );
  assert( pTab->pSortCsr==0 || nVal==0 );

  assert( pzErrmsg==0 || pzErrmsg==&pTab->p.base.zErrMsg );
  pConfig->pzErrmsg = &pTab->p.base.zErrMsg;

  /* Decode the arguments passed through to this function. */
  for(i=0; i<nVal; i++){
    switch( idxStr[iIdxStr++] ){
      case 'r':
        pRank = apVal[i];
        break;
      case 'm': {
        const char *zText = (const char*)sqlite3_value_text(apVal[i]);
        if( zText==0 ) zText = "";

        if( idxStr[iIdxStr]>='0' && idxStr[iIdxStr]<='9' ){
          iCol = 0;
          do{
            iCol = iCol*10 + (idxStr[iIdxStr]-'0');
            iIdxStr++;
          }while( idxStr[iIdxStr]>='0' && idxStr[iIdxStr]<='9' );
        }else{
          iCol = pConfig->nCol;
        }

        if( zText[0]=='*' ){
          /* The user has issued a query of the form "MATCH '*...'". This
          ** indicates that the MATCH expression is not a full text query,
          ** but a request for an internal parameter.  */
          rc = fts5SpecialMatch(pTab, pCsr, &zText[1]);
          goto filter_out;
        }else{
          char **pzErr = &pTab->p.base.zErrMsg;
          rc = sqlite3Fts5ExprNew(pConfig, iCol, zText, &pExpr, pzErr);
          if( rc==SQLITE_OK ){
            rc = sqlite3Fts5ExprAnd(&pCsr->pExpr, pExpr);
            pExpr = 0;
          }
          if( rc!=SQLITE_OK ) goto filter_out;
        }

        break;
      }
      case '=':
        pRowidEq = apVal[i];
        break;
      case '<':
        pRowidLe = apVal[i];
        break;
      default: assert( idxStr[iIdxStr-1]=='>' );
        pRowidGe = apVal[i];
        break;
    }
  }
  bOrderByRank = ((idxNum & FTS5_BI_ORDER_RANK) ? 1 : 0);
  pCsr->bDesc = bDesc = ((idxNum & FTS5_BI_ORDER_DESC) ? 1 : 0);

  /* Set the cursor upper and lower rowid limits. Only some strategies 
  ** actually use them. This is ok, as the xBestIndex() method leaves the
  ** sqlite3_index_constraint.omit flag clear for range constraints
  ** on the rowid field.  */
  if( pRowidEq ){
    pRowidLe = pRowidGe = pRowidEq;
  }
  if( bDesc ){
    pCsr->iFirstRowid = fts5GetRowidLimit(pRowidLe, LARGEST_INT64);
    pCsr->iLastRowid = fts5GetRowidLimit(pRowidGe, SMALLEST_INT64);
  }else{
    pCsr->iLastRowid = fts5GetRowidLimit(pRowidLe, LARGEST_INT64);
    pCsr->iFirstRowid = fts5GetRowidLimit(pRowidGe, SMALLEST_INT64);
  }

  if( pTab->pSortCsr ){
    /* If pSortCsr is non-NULL, then this call is being made as part of 
    ** processing for a "... MATCH <expr> ORDER BY rank" query (ePlan is
    ** set to FTS5_PLAN_SORTED_MATCH). pSortCsr is the cursor that will
    ** return results to the user for this query. The current cursor 
    ** (pCursor) is used to execute the query issued by function 
    ** fts5CursorFirstSorted() above.  */
    assert( pRowidEq==0 && pRowidLe==0 && pRowidGe==0 && pRank==0 );
    assert( nVal==0 && bOrderByRank==0 && bDesc==0 );
    assert( pCsr->iLastRowid==LARGEST_INT64 );
    assert( pCsr->iFirstRowid==SMALLEST_INT64 );
    if( pTab->pSortCsr->bDesc ){
      pCsr->iLastRowid = pTab->pSortCsr->iFirstRowid;
      pCsr->iFirstRowid = pTab->pSortCsr->iLastRowid;
    }else{
      pCsr->iLastRowid = pTab->pSortCsr->iLastRowid;
      pCsr->iFirstRowid = pTab->pSortCsr->iFirstRowid;
    }
    pCsr->ePlan = FTS5_PLAN_SOURCE;
    pCsr->pExpr = pTab->pSortCsr->pExpr;
    rc = fts5CursorFirst(pTab, pCsr, bDesc);
  }else if( pCsr->pExpr ){
    rc = fts5CursorParseRank(pConfig, pCsr, pRank);
    if( rc==SQLITE_OK ){
      if( bOrderByRank ){
        pCsr->ePlan = FTS5_PLAN_SORTED_MATCH;
        rc = fts5CursorFirstSorted(pTab, pCsr, bDesc);
      }else{
        pCsr->ePlan = FTS5_PLAN_MATCH;
        rc = fts5CursorFirst(pTab, pCsr, bDesc);
      }
    }
  }else if( pConfig->zContent==0 ){
    *pConfig->pzErrmsg = sqlite3_mprintf(
        "%s: table does not support scanning", pConfig->zName
    );
    rc = SQLITE_ERROR;
  }else{
    /* This is either a full-table scan (ePlan==FTS5_PLAN_SCAN) or a lookup
    ** by rowid (ePlan==FTS5_PLAN_ROWID).  */
    pCsr->ePlan = (pRowidEq ? FTS5_PLAN_ROWID : FTS5_PLAN_SCAN);
    rc = sqlite3Fts5StorageStmt(
        pTab->pStorage, fts5StmtType(pCsr), &pCsr->pStmt, &pTab->p.base.zErrMsg
    );
    if( rc==SQLITE_OK ){
      if( pCsr->ePlan==FTS5_PLAN_ROWID ){
        sqlite3_bind_value(pCsr->pStmt, 1, pRowidEq);
      }else{
        sqlite3_bind_int64(pCsr->pStmt, 1, pCsr->iFirstRowid);
        sqlite3_bind_int64(pCsr->pStmt, 2, pCsr->iLastRowid);
      }
      rc = fts5NextMethod(pCursor);
    }
  }

 filter_out:
  sqlite3Fts5ExprFree(pExpr);
  pConfig->pzErrmsg = pzErrmsg;
  return rc;
}

/* 
** This is the xEof method of the virtual table. SQLite calls this 
** routine to find out if it has reached the end of a result set.
*/
static int fts5EofMethod(sqlite3_vtab_cursor *pCursor){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCursor;
  return (CsrFlagTest(pCsr, FTS5CSR_EOF) ? 1 : 0);
}

/*
** Return the rowid that the cursor currently points to.
*/
static i64 fts5CursorRowid(Fts5Cursor *pCsr){
  assert( pCsr->ePlan==FTS5_PLAN_MATCH 
       || pCsr->ePlan==FTS5_PLAN_SORTED_MATCH 
       || pCsr->ePlan==FTS5_PLAN_SOURCE 
  );
  if( pCsr->pSorter ){
    return pCsr->pSorter->iRowid;
  }else{
    return sqlite3Fts5ExprRowid(pCsr->pExpr);
  }
}

/* 
** This is the xRowid method. The SQLite core calls this routine to
** retrieve the rowid for the current row of the result set. fts5
** exposes %_content.rowid as the rowid for the virtual table. The
** rowid should be written to *pRowid.
*/
static int fts5RowidMethod(sqlite3_vtab_cursor *pCursor, sqlite_int64 *pRowid){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCursor;
  int ePlan = pCsr->ePlan;
  
  assert( CsrFlagTest(pCsr, FTS5CSR_EOF)==0 );
  switch( ePlan ){
    case FTS5_PLAN_SPECIAL:
      *pRowid = 0;
      break;

    case FTS5_PLAN_SOURCE:
    case FTS5_PLAN_MATCH:
    case FTS5_PLAN_SORTED_MATCH:
      *pRowid = fts5CursorRowid(pCsr);
      break;

    default:
      *pRowid = sqlite3_column_int64(pCsr->pStmt, 0);
      break;
  }

  return SQLITE_OK;
}

/*
** If the cursor requires seeking (bSeekRequired flag is set), seek it.
** Return SQLITE_OK if no error occurs, or an SQLite error code otherwise.
**
** If argument bErrormsg is true and an error occurs, an error message may
** be left in sqlite3_vtab.zErrMsg.
*/
static int fts5SeekCursor(Fts5Cursor *pCsr, int bErrormsg){
  int rc = SQLITE_OK;

  /* If the cursor does not yet have a statement handle, obtain one now. */ 
  if( pCsr->pStmt==0 ){
    Fts5FullTable *pTab = (Fts5FullTable*)(pCsr->base.pVtab);
    int eStmt = fts5StmtType(pCsr);
    rc = sqlite3Fts5StorageStmt(
        pTab->pStorage, eStmt, &pCsr->pStmt, (bErrormsg?&pTab->p.base.zErrMsg:0)
    );
    assert( rc!=SQLITE_OK || pTab->p.base.zErrMsg==0 );
    assert( CsrFlagTest(pCsr, FTS5CSR_REQUIRE_CONTENT) );
  }

  if( rc==SQLITE_OK && CsrFlagTest(pCsr, FTS5CSR_REQUIRE_CONTENT) ){
    Fts5Table *pTab = (Fts5Table*)(pCsr->base.pVtab);
    assert( pCsr->pExpr );
    sqlite3_reset(pCsr->pStmt);
    sqlite3_bind_int64(pCsr->pStmt, 1, fts5CursorRowid(pCsr));
    pTab->pConfig->bLock++;
    rc = sqlite3_step(pCsr->pStmt);
    pTab->pConfig->bLock--;
    if( rc==SQLITE_ROW ){
      rc = SQLITE_OK;
      CsrFlagClear(pCsr, FTS5CSR_REQUIRE_CONTENT);
    }else{
      rc = sqlite3_reset(pCsr->pStmt);
      if( rc==SQLITE_OK ){
        rc = FTS5_CORRUPT;
      }else if( pTab->pConfig->pzErrmsg ){
        *pTab->pConfig->pzErrmsg = sqlite3_mprintf(
            "%s", sqlite3_errmsg(pTab->pConfig->db)
        );
      }
    }
  }
  return rc;
}

static void fts5SetVtabError(Fts5FullTable *p, const char *zFormat, ...){
  va_list ap;                     /* ... printf arguments */
  va_start(ap, zFormat);
  assert( p->p.base.zErrMsg==0 );
  p->p.base.zErrMsg = sqlite3_vmprintf(zFormat, ap);
  va_end(ap);
}

/*
** This function is called to handle an FTS INSERT command. In other words,
** an INSERT statement of the form:
**
**     INSERT INTO fts(fts) VALUES($pCmd)
**     INSERT INTO fts(fts, rank) VALUES($pCmd, $pVal)
**
** Argument pVal is the value assigned to column "fts" by the INSERT 
** statement. This function returns SQLITE_OK if successful, or an SQLite
** error code if an error occurs.
**
** The commands implemented by this function are documented in the "Special
** INSERT Directives" section of the documentation. It should be updated if
** more commands are added to this function.
*/
static int fts5SpecialInsert(
  Fts5FullTable *pTab,            /* Fts5 table object */
  const char *zCmd,               /* Text inserted into table-name column */
  sqlite3_value *pVal             /* Value inserted into rank column */
){
  Fts5Config *pConfig = pTab->p.pConfig;
  int rc = SQLITE_OK;
  int bError = 0;

  if( 0==sqlite3_stricmp("delete-all", zCmd) ){
    if( pConfig->eContent==FTS5_CONTENT_NORMAL ){
      fts5SetVtabError(pTab, 
          "'delete-all' may only be used with a "
          "contentless or external content fts5 table"
      );
      rc = SQLITE_ERROR;
    }else{
      rc = sqlite3Fts5StorageDeleteAll(pTab->pStorage);
    }
  }else if( 0==sqlite3_stricmp("rebuild", zCmd) ){
    if( pConfig->eContent==FTS5_CONTENT_NONE ){
      fts5SetVtabError(pTab, 
          "'rebuild' may not be used with a contentless fts5 table"
      );
      rc = SQLITE_ERROR;
    }else{
      rc = sqlite3Fts5StorageRebuild(pTab->pStorage);
    }
  }else if( 0==sqlite3_stricmp("optimize", zCmd) ){
    rc = sqlite3Fts5StorageOptimize(pTab->pStorage);
  }else if( 0==sqlite3_stricmp("merge", zCmd) ){
    int nMerge = sqlite3_value_int(pVal);
    rc = sqlite3Fts5StorageMerge(pTab->pStorage, nMerge);
  }else if( 0==sqlite3_stricmp("integrity-check", zCmd) ){
    rc = sqlite3Fts5StorageIntegrity(pTab->pStorage);
#ifdef SQLITE_DEBUG
  }else if( 0==sqlite3_stricmp("prefix-index", zCmd) ){
    pConfig->bPrefixIndex = sqlite3_value_int(pVal);
#endif
  }else{
    rc = sqlite3Fts5IndexLoadConfig(pTab->p.pIndex);
    if( rc==SQLITE_OK ){
      rc = sqlite3Fts5ConfigSetValue(pTab->p.pConfig, zCmd, pVal, &bError);
    }
    if( rc==SQLITE_OK ){
      if( bError ){
        rc = SQLITE_ERROR;
      }else{
        rc = sqlite3Fts5StorageConfigValue(pTab->pStorage, zCmd, pVal, 0);
      }
    }
  }
  return rc;
}

static int fts5SpecialDelete(
  Fts5FullTable *pTab, 
  sqlite3_value **apVal
){
  int rc = SQLITE_OK;
  int eType1 = sqlite3_value_type(apVal[1]);
  if( eType1==SQLITE_INTEGER ){
    sqlite3_int64 iDel = sqlite3_value_int64(apVal[1]);
    rc = sqlite3Fts5StorageDelete(pTab->pStorage, iDel, &apVal[2]);
  }
  return rc;
}

static void fts5StorageInsert(
  int *pRc, 
  Fts5FullTable *pTab, 
  sqlite3_value **apVal, 
  i64 *piRowid
){
  int rc = *pRc;
  if( rc==SQLITE_OK ){
    rc = sqlite3Fts5StorageContentInsert(pTab->pStorage, apVal, piRowid);
  }
  if( rc==SQLITE_OK ){
    rc = sqlite3Fts5StorageIndexInsert(pTab->pStorage, apVal, *piRowid);
  }
  *pRc = rc;
}

/* 
** This function is the implementation of the xUpdate callback used by 
** FTS3 virtual tables. It is invoked by SQLite each time a row is to be
** inserted, updated or deleted.
**
** A delete specifies a single argument - the rowid of the row to remove.
** 
** Update and insert operations pass:
**
**   1. The "old" rowid, or NULL.
**   2. The "new" rowid.
**   3. Values for each of the nCol matchable columns.
**   4. Values for the two hidden columns (<tablename> and "rank").
*/
static int fts5UpdateMethod(
  sqlite3_vtab *pVtab,            /* Virtual table handle */
  int nArg,                       /* Size of argument array */
  sqlite3_value **apVal,          /* Array of arguments */
  sqlite_int64 *pRowid            /* OUT: The affected (or effected) rowid */
){
  Fts5FullTable *pTab = (Fts5FullTable*)pVtab;
  Fts5Config *pConfig = pTab->p.pConfig;
  int eType0;                     /* value_type() of apVal[0] */
  int rc = SQLITE_OK;             /* Return code */

  /* A transaction must be open when this is called. */
  assert( pTab->ts.eState==1 );

  assert( pVtab->zErrMsg==0 );
  assert( nArg==1 || nArg==(2+pConfig->nCol+2) );
  assert( sqlite3_value_type(apVal[0])==SQLITE_INTEGER 
       || sqlite3_value_type(apVal[0])==SQLITE_NULL 
  );
  assert( pTab->p.pConfig->pzErrmsg==0 );
  pTab->p.pConfig->pzErrmsg = &pTab->p.base.zErrMsg;

  /* Put any active cursors into REQUIRE_SEEK state. */
  fts5TripCursors(pTab);

  eType0 = sqlite3_value_type(apVal[0]);
  if( eType0==SQLITE_NULL 
   && sqlite3_value_type(apVal[2+pConfig->nCol])!=SQLITE_NULL 
  ){
    /* A "special" INSERT op. These are handled separately. */
    const char *z = (const char*)sqlite3_value_text(apVal[2+pConfig->nCol]);
    if( pConfig->eContent!=FTS5_CONTENT_NORMAL 
      && 0==sqlite3_stricmp("delete", z) 
    ){
      rc = fts5SpecialDelete(pTab, apVal);
    }else{
      rc = fts5SpecialInsert(pTab, z, apVal[2 + pConfig->nCol + 1]);
    }
  }else{
    /* A regular INSERT, UPDATE or DELETE statement. The trick here is that
    ** any conflict on the rowid value must be detected before any 
    ** modifications are made to the database file. There are 4 cases:
    **
    **   1) DELETE
    **   2) UPDATE (rowid not modified)
    **   3) UPDATE (rowid modified)
    **   4) INSERT
    **
    ** Cases 3 and 4 may violate the rowid constraint.
    */
    int eConflict = SQLITE_ABORT;
    if( pConfig->eContent==FTS5_CONTENT_NORMAL ){
      eConflict = sqlite3_vtab_on_conflict(pConfig->db);
    }

    assert( eType0==SQLITE_INTEGER || eType0==SQLITE_NULL );
    assert( nArg!=1 || eType0==SQLITE_INTEGER );

    /* Filter out attempts to run UPDATE or DELETE on contentless tables.
    ** This is not suported.  */
    if( eType0==SQLITE_INTEGER && fts5IsContentless(pTab) ){
      pTab->p.base.zErrMsg = sqlite3_mprintf(
          "cannot %s contentless fts5 table: %s", 
          (nArg>1 ? "UPDATE" : "DELETE from"), pConfig->zName
      );
      rc = SQLITE_ERROR;
    }

    /* DELETE */
    else if( nArg==1 ){
      i64 iDel = sqlite3_value_int64(apVal[0]);  /* Rowid to delete */
      rc = sqlite3Fts5StorageDelete(pTab->pStorage, iDel, 0);
    }

    /* INSERT or UPDATE */
    else{
      int eType1 = sqlite3_value_numeric_type(apVal[1]);

      if( eType1!=SQLITE_INTEGER && eType1!=SQLITE_NULL ){
        rc = SQLITE_MISMATCH;
      }

      else if( eType0!=SQLITE_INTEGER ){     
        /* If this is a REPLACE, first remove the current entry (if any) */
        if( eConflict==SQLITE_REPLACE && eType1==SQLITE_INTEGER ){
          i64 iNew = sqlite3_value_int64(apVal[1]);  /* Rowid to delete */
          rc = sqlite3Fts5StorageDelete(pTab->pStorage, iNew, 0);
        }
        fts5StorageInsert(&rc, pTab, apVal, pRowid);
      }

      /* UPDATE */
      else{
        i64 iOld = sqlite3_value_int64(apVal[0]);  /* Old rowid */
        i64 iNew = sqlite3_value_int64(apVal[1]);  /* New rowid */
        if( eType1==SQLITE_INTEGER && iOld!=iNew ){
          if( eConflict==SQLITE_REPLACE ){
            rc = sqlite3Fts5StorageDelete(pTab->pStorage, iOld, 0);
            if( rc==SQLITE_OK ){
              rc = sqlite3Fts5StorageDelete(pTab->pStorage, iNew, 0);
            }
            fts5StorageInsert(&rc, pTab, apVal, pRowid);
          }else{
            rc = sqlite3Fts5StorageContentInsert(pTab->pStorage, apVal, pRowid);
            if( rc==SQLITE_OK ){
              rc = sqlite3Fts5StorageDelete(pTab->pStorage, iOld, 0);
            }
            if( rc==SQLITE_OK ){
              rc = sqlite3Fts5StorageIndexInsert(pTab->pStorage, apVal,*pRowid);
            }
          }
        }else{
          rc = sqlite3Fts5StorageDelete(pTab->pStorage, iOld, 0);
          fts5StorageInsert(&rc, pTab, apVal, pRowid);
        }
      }
    }
  }

  pTab->p.pConfig->pzErrmsg = 0;
  return rc;
}

/*
** Implementation of xSync() method. 
*/
static int fts5SyncMethod(sqlite3_vtab *pVtab){
  int rc;
  Fts5FullTable *pTab = (Fts5FullTable*)pVtab;
  fts5CheckTransactionState(pTab, FTS5_SYNC, 0);
  pTab->p.pConfig->pzErrmsg = &pTab->p.base.zErrMsg;
  fts5TripCursors(pTab);
  rc = sqlite3Fts5StorageSync(pTab->pStorage);
  pTab->p.pConfig->pzErrmsg = 0;
  return rc;
}

/*
** Implementation of xBegin() method. 
*/
static int fts5BeginMethod(sqlite3_vtab *pVtab){
  fts5CheckTransactionState((Fts5FullTable*)pVtab, FTS5_BEGIN, 0);
  fts5NewTransaction((Fts5FullTable*)pVtab);
  return SQLITE_OK;
}

/*
** Implementation of xCommit() method. This is a no-op. The contents of
** the pending-terms hash-table have already been flushed into the database
** by fts5SyncMethod().
*/
static int fts5CommitMethod(sqlite3_vtab *pVtab){
  UNUSED_PARAM(pVtab);  /* Call below is a no-op for NDEBUG builds */
  fts5CheckTransactionState((Fts5FullTable*)pVtab, FTS5_COMMIT, 0);
  return SQLITE_OK;
}

/*
** Implementation of xRollback(). Discard the contents of the pending-terms
** hash-table. Any changes made to the database are reverted by SQLite.
*/
static int fts5RollbackMethod(sqlite3_vtab *pVtab){
  int rc;
  Fts5FullTable *pTab = (Fts5FullTable*)pVtab;
  fts5CheckTransactionState(pTab, FTS5_ROLLBACK, 0);
  rc = sqlite3Fts5StorageRollback(pTab->pStorage);
  return rc;
}

static int fts5CsrPoslist(Fts5Cursor*, int, const u8**, int*);

static void *fts5ApiUserData(Fts5Context *pCtx){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  return pCsr->pAux->pUserData;
}

static int fts5ApiColumnCount(Fts5Context *pCtx){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  return ((Fts5Table*)(pCsr->base.pVtab))->pConfig->nCol;
}

static int fts5ApiColumnTotalSize(
  Fts5Context *pCtx, 
  int iCol, 
  sqlite3_int64 *pnToken
){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  Fts5FullTable *pTab = (Fts5FullTable*)(pCsr->base.pVtab);
  return sqlite3Fts5StorageSize(pTab->pStorage, iCol, pnToken);
}

static int fts5ApiRowCount(Fts5Context *pCtx, i64 *pnRow){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  Fts5FullTable *pTab = (Fts5FullTable*)(pCsr->base.pVtab);
  return sqlite3Fts5StorageRowCount(pTab->pStorage, pnRow);
}

static int fts5ApiTokenize(
  Fts5Context *pCtx, 
  const char *pText, int nText, 
  void *pUserData,
  int (*xToken)(void*, int, const char*, int, int, int)
){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  Fts5Table *pTab = (Fts5Table*)(pCsr->base.pVtab);
  return sqlite3Fts5Tokenize(
      pTab->pConfig, FTS5_TOKENIZE_AUX, pText, nText, pUserData, xToken
  );
}

static int fts5ApiPhraseCount(Fts5Context *pCtx){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  return sqlite3Fts5ExprPhraseCount(pCsr->pExpr);
}

static int fts5ApiPhraseSize(Fts5Context *pCtx, int iPhrase){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  return sqlite3Fts5ExprPhraseSize(pCsr->pExpr, iPhrase);
}

static int fts5ApiColumnText(
  Fts5Context *pCtx, 
  int iCol, 
  const char **pz, 
  int *pn
){
  int rc = SQLITE_OK;
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  if( fts5IsContentless((Fts5FullTable*)(pCsr->base.pVtab)) 
   || pCsr->ePlan==FTS5_PLAN_SPECIAL 
  ){
    *pz = 0;
    *pn = 0;
  }else{
    rc = fts5SeekCursor(pCsr, 0);
    if( rc==SQLITE_OK ){
      *pz = (const char*)sqlite3_column_text(pCsr->pStmt, iCol+1);
      *pn = sqlite3_column_bytes(pCsr->pStmt, iCol+1);
    }
  }
  return rc;
}

static int fts5CsrPoslist(
  Fts5Cursor *pCsr, 
  int iPhrase, 
  const u8 **pa,
  int *pn
){
  Fts5Config *pConfig = ((Fts5Table*)(pCsr->base.pVtab))->pConfig;
  int rc = SQLITE_OK;
  int bLive = (pCsr->pSorter==0);

  if( CsrFlagTest(pCsr, FTS5CSR_REQUIRE_POSLIST) ){

    if( pConfig->eDetail!=FTS5_DETAIL_FULL ){
      Fts5PoslistPopulator *aPopulator;
      int i;
      aPopulator = sqlite3Fts5ExprClearPoslists(pCsr->pExpr, bLive);
      if( aPopulator==0 ) rc = SQLITE_NOMEM;
      for(i=0; i<pConfig->nCol && rc==SQLITE_OK; i++){
        int n; const char *z;
        rc = fts5ApiColumnText((Fts5Context*)pCsr, i, &z, &n);
        if( rc==SQLITE_OK ){
          rc = sqlite3Fts5ExprPopulatePoslists(
              pConfig, pCsr->pExpr, aPopulator, i, z, n
          );
        }
      }
      sqlite3_free(aPopulator);

      if( pCsr->pSorter ){
        sqlite3Fts5ExprCheckPoslists(pCsr->pExpr, pCsr->pSorter->iRowid);
      }
    }
    CsrFlagClear(pCsr, FTS5CSR_REQUIRE_POSLIST);
  }

  if( pCsr->pSorter && pConfig->eDetail==FTS5_DETAIL_FULL ){
    Fts5Sorter *pSorter = pCsr->pSorter;
    int i1 = (iPhrase==0 ? 0 : pSorter->aIdx[iPhrase-1]);
    *pn = pSorter->aIdx[iPhrase] - i1;
    *pa = &pSorter->aPoslist[i1];
  }else{
    *pn = sqlite3Fts5ExprPoslist(pCsr->pExpr, iPhrase, pa);
  }

  return rc;
}

/*
** Ensure that the Fts5Cursor.nInstCount and aInst[] variables are populated
** correctly for the current view. Return SQLITE_OK if successful, or an
** SQLite error code otherwise.
*/
static int fts5CacheInstArray(Fts5Cursor *pCsr){
  int rc = SQLITE_OK;
  Fts5PoslistReader *aIter;       /* One iterator for each phrase */
  int nIter;                      /* Number of iterators/phrases */
  int nCol = ((Fts5Table*)pCsr->base.pVtab)->pConfig->nCol;
  
  nIter = sqlite3Fts5ExprPhraseCount(pCsr->pExpr);
  if( pCsr->aInstIter==0 ){
    sqlite3_int64 nByte = sizeof(Fts5PoslistReader) * nIter;
    pCsr->aInstIter = (Fts5PoslistReader*)sqlite3Fts5MallocZero(&rc, nByte);
  }
  aIter = pCsr->aInstIter;

  if( aIter ){
    int nInst = 0;                /* Number instances seen so far */
    int i;

    /* Initialize all iterators */
    for(i=0; i<nIter && rc==SQLITE_OK; i++){
      const u8 *a;
      int n; 
      rc = fts5CsrPoslist(pCsr, i, &a, &n);
      if( rc==SQLITE_OK ){
        sqlite3Fts5PoslistReaderInit(a, n, &aIter[i]);
      }
    }

    if( rc==SQLITE_OK ){
      while( 1 ){
        int *aInst;
        int iBest = -1;
        for(i=0; i<nIter; i++){
          if( (aIter[i].bEof==0) 
              && (iBest<0 || aIter[i].iPos<aIter[iBest].iPos) 
            ){
            iBest = i;
          }
        }
        if( iBest<0 ) break;

        nInst++;
        if( nInst>=pCsr->nInstAlloc ){
          pCsr->nInstAlloc = pCsr->nInstAlloc ? pCsr->nInstAlloc*2 : 32;
          aInst = (int*)sqlite3_realloc64(
              pCsr->aInst, pCsr->nInstAlloc*sizeof(int)*3
              );
          if( aInst ){
            pCsr->aInst = aInst;
          }else{
            rc = SQLITE_NOMEM;
            break;
          }
        }

        aInst = &pCsr->aInst[3 * (nInst-1)];
        aInst[0] = iBest;
        aInst[1] = FTS5_POS2COLUMN(aIter[iBest].iPos);
        aInst[2] = FTS5_POS2OFFSET(aIter[iBest].iPos);
        if( aInst[1]<0 || aInst[1]>=nCol ){
          rc = FTS5_CORRUPT;
          break;
        }
        sqlite3Fts5PoslistReaderNext(&aIter[iBest]);
      }
    }

    pCsr->nInstCount = nInst;
    CsrFlagClear(pCsr, FTS5CSR_REQUIRE_INST);
  }
  return rc;
}

static int fts5ApiInstCount(Fts5Context *pCtx, int *pnInst){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  int rc = SQLITE_OK;
  if( CsrFlagTest(pCsr, FTS5CSR_REQUIRE_INST)==0 
   || SQLITE_OK==(rc = fts5CacheInstArray(pCsr)) ){
    *pnInst = pCsr->nInstCount;
  }
  return rc;
}

static int fts5ApiInst(
  Fts5Context *pCtx, 
  int iIdx, 
  int *piPhrase, 
  int *piCol, 
  int *piOff
){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  int rc = SQLITE_OK;
  if( CsrFlagTest(pCsr, FTS5CSR_REQUIRE_INST)==0 
   || SQLITE_OK==(rc = fts5CacheInstArray(pCsr)) 
  ){
    if( iIdx<0 || iIdx>=pCsr->nInstCount ){
      rc = SQLITE_RANGE;
#if 0
    }else if( fts5IsOffsetless((Fts5Table*)pCsr->base.pVtab) ){
      *piPhrase = pCsr->aInst[iIdx*3];
      *piCol = pCsr->aInst[iIdx*3 + 2];
      *piOff = -1;
#endif
    }else{
      *piPhrase = pCsr->aInst[iIdx*3];
      *piCol = pCsr->aInst[iIdx*3 + 1];
      *piOff = pCsr->aInst[iIdx*3 + 2];
    }
  }
  return rc;
}

static sqlite3_int64 fts5ApiRowid(Fts5Context *pCtx){
  return fts5CursorRowid((Fts5Cursor*)pCtx);
}

static int fts5ColumnSizeCb(
  void *pContext,                 /* Pointer to int */
  int tflags,
  const char *pUnused,            /* Buffer containing token */
  int nUnused,                    /* Size of token in bytes */
  int iUnused1,                   /* Start offset of token */
  int iUnused2                    /* End offset of token */
){
  int *pCnt = (int*)pContext;
  UNUSED_PARAM2(pUnused, nUnused);
  UNUSED_PARAM2(iUnused1, iUnused2);
  if( (tflags & FTS5_TOKEN_COLOCATED)==0 ){
    (*pCnt)++;
  }
  return SQLITE_OK;
}

static int fts5ApiColumnSize(Fts5Context *pCtx, int iCol, int *pnToken){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  Fts5FullTable *pTab = (Fts5FullTable*)(pCsr->base.pVtab);
  Fts5Config *pConfig = pTab->p.pConfig;
  int rc = SQLITE_OK;

  if( CsrFlagTest(pCsr, FTS5CSR_REQUIRE_DOCSIZE) ){
    if( pConfig->bColumnsize ){
      i64 iRowid = fts5CursorRowid(pCsr);
      rc = sqlite3Fts5StorageDocsize(pTab->pStorage, iRowid, pCsr->aColumnSize);
    }else if( pConfig->zContent==0 ){
      int i;
      for(i=0; i<pConfig->nCol; i++){
        if( pConfig->abUnindexed[i]==0 ){
          pCsr->aColumnSize[i] = -1;
        }
      }
    }else{
      int i;
      for(i=0; rc==SQLITE_OK && i<pConfig->nCol; i++){
        if( pConfig->abUnindexed[i]==0 ){
          const char *z; int n;
          void *p = (void*)(&pCsr->aColumnSize[i]);
          pCsr->aColumnSize[i] = 0;
          rc = fts5ApiColumnText(pCtx, i, &z, &n);
          if( rc==SQLITE_OK ){
            rc = sqlite3Fts5Tokenize(
                pConfig, FTS5_TOKENIZE_AUX, z, n, p, fts5ColumnSizeCb
            );
          }
        }
      }
    }
    CsrFlagClear(pCsr, FTS5CSR_REQUIRE_DOCSIZE);
  }
  if( iCol<0 ){
    int i;
    *pnToken = 0;
    for(i=0; i<pConfig->nCol; i++){
      *pnToken += pCsr->aColumnSize[i];
    }
  }else if( iCol<pConfig->nCol ){
    *pnToken = pCsr->aColumnSize[iCol];
  }else{
    *pnToken = 0;
    rc = SQLITE_RANGE;
  }
  return rc;
}

/*
** Implementation of the xSetAuxdata() method.
*/
static int fts5ApiSetAuxdata(
  Fts5Context *pCtx,              /* Fts5 context */
  void *pPtr,                     /* Pointer to save as auxdata */
  void(*xDelete)(void*)           /* Destructor for pPtr (or NULL) */
){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  Fts5Auxdata *pData;

  /* Search through the cursors list of Fts5Auxdata objects for one that
  ** corresponds to the currently executing auxiliary function.  */
  for(pData=pCsr->pAuxdata; pData; pData=pData->pNext){
    if( pData->pAux==pCsr->pAux ) break;
  }

  if( pData ){
    if( pData->xDelete ){
      pData->xDelete(pData->pPtr);
    }
  }else{
    int rc = SQLITE_OK;
    pData = (Fts5Auxdata*)sqlite3Fts5MallocZero(&rc, sizeof(Fts5Auxdata));
    if( pData==0 ){
      if( xDelete ) xDelete(pPtr);
      return rc;
    }
    pData->pAux = pCsr->pAux;
    pData->pNext = pCsr->pAuxdata;
    pCsr->pAuxdata = pData;
  }

  pData->xDelete = xDelete;
  pData->pPtr = pPtr;
  return SQLITE_OK;
}

static void *fts5ApiGetAuxdata(Fts5Context *pCtx, int bClear){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  Fts5Auxdata *pData;
  void *pRet = 0;

  for(pData=pCsr->pAuxdata; pData; pData=pData->pNext){
    if( pData->pAux==pCsr->pAux ) break;
  }

  if( pData ){
    pRet = pData->pPtr;
    if( bClear ){
      pData->pPtr = 0;
      pData->xDelete = 0;
    }
  }

  return pRet;
}

static void fts5ApiPhraseNext(
  Fts5Context *pUnused, 
  Fts5PhraseIter *pIter, 
  int *piCol, int *piOff
){
  UNUSED_PARAM(pUnused);
  if( pIter->a>=pIter->b ){
    *piCol = -1;
    *piOff = -1;
  }else{
    int iVal;
    pIter->a += fts5GetVarint32(pIter->a, iVal);
    if( iVal==1 ){
      pIter->a += fts5GetVarint32(pIter->a, iVal);
      *piCol = iVal;
      *piOff = 0;
      pIter->a += fts5GetVarint32(pIter->a, iVal);
    }
    *piOff += (iVal-2);
  }
}

static int fts5ApiPhraseFirst(
  Fts5Context *pCtx, 
  int iPhrase, 
  Fts5PhraseIter *pIter, 
  int *piCol, int *piOff
){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  int n;
  int rc = fts5CsrPoslist(pCsr, iPhrase, &pIter->a, &n);
  if( rc==SQLITE_OK ){
    pIter->b = &pIter->a[n];
    *piCol = 0;
    *piOff = 0;
    fts5ApiPhraseNext(pCtx, pIter, piCol, piOff);
  }
  return rc;
}

static void fts5ApiPhraseNextColumn(
  Fts5Context *pCtx, 
  Fts5PhraseIter *pIter, 
  int *piCol
){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  Fts5Config *pConfig = ((Fts5Table*)(pCsr->base.pVtab))->pConfig;

  if( pConfig->eDetail==FTS5_DETAIL_COLUMNS ){
    if( pIter->a>=pIter->b ){
      *piCol = -1;
    }else{
      int iIncr;
      pIter->a += fts5GetVarint32(&pIter->a[0], iIncr);
      *piCol += (iIncr-2);
    }
  }else{
    while( 1 ){
      int dummy;
      if( pIter->a>=pIter->b ){
        *piCol = -1;
        return;
      }
      if( pIter->a[0]==0x01 ) break;
      pIter->a += fts5GetVarint32(pIter->a, dummy);
    }
    pIter->a += 1 + fts5GetVarint32(&pIter->a[1], *piCol);
  }
}

static int fts5ApiPhraseFirstColumn(
  Fts5Context *pCtx, 
  int iPhrase, 
  Fts5PhraseIter *pIter, 
  int *piCol
){
  int rc = SQLITE_OK;
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  Fts5Config *pConfig = ((Fts5Table*)(pCsr->base.pVtab))->pConfig;

  if( pConfig->eDetail==FTS5_DETAIL_COLUMNS ){
    Fts5Sorter *pSorter = pCsr->pSorter;
    int n;
    if( pSorter ){
      int i1 = (iPhrase==0 ? 0 : pSorter->aIdx[iPhrase-1]);
      n = pSorter->aIdx[iPhrase] - i1;
      pIter->a = &pSorter->aPoslist[i1];
    }else{
      rc = sqlite3Fts5ExprPhraseCollist(pCsr->pExpr, iPhrase, &pIter->a, &n);
    }
    if( rc==SQLITE_OK ){
      pIter->b = &pIter->a[n];
      *piCol = 0;
      fts5ApiPhraseNextColumn(pCtx, pIter, piCol);
    }
  }else{
    int n;
    rc = fts5CsrPoslist(pCsr, iPhrase, &pIter->a, &n);
    if( rc==SQLITE_OK ){
      pIter->b = &pIter->a[n];
      if( n<=0 ){
        *piCol = -1;
      }else if( pIter->a[0]==0x01 ){
        pIter->a += 1 + fts5GetVarint32(&pIter->a[1], *piCol);
      }else{
        *piCol = 0;
      }
    }
  }

  return rc;
}


static int fts5ApiQueryPhrase(Fts5Context*, int, void*, 
    int(*)(const Fts5ExtensionApi*, Fts5Context*, void*)
);

static const Fts5ExtensionApi sFts5Api = {
  2,                            /* iVersion */
  fts5ApiUserData,
  fts5ApiColumnCount,
  fts5ApiRowCount,
  fts5ApiColumnTotalSize,
  fts5ApiTokenize,
  fts5ApiPhraseCount,
  fts5ApiPhraseSize,
  fts5ApiInstCount,
  fts5ApiInst,
  fts5ApiRowid,
  fts5ApiColumnText,
  fts5ApiColumnSize,
  fts5ApiQueryPhrase,
  fts5ApiSetAuxdata,
  fts5ApiGetAuxdata,
  fts5ApiPhraseFirst,
  fts5ApiPhraseNext,
  fts5ApiPhraseFirstColumn,
  fts5ApiPhraseNextColumn,
};

/*
** Implementation of API function xQueryPhrase().
*/
static int fts5ApiQueryPhrase(
  Fts5Context *pCtx, 
  int iPhrase, 
  void *pUserData,
  int(*xCallback)(const Fts5ExtensionApi*, Fts5Context*, void*)
){
  Fts5Cursor *pCsr = (Fts5Cursor*)pCtx;
  Fts5FullTable *pTab = (Fts5FullTable*)(pCsr->base.pVtab);
  int rc;
  Fts5Cursor *pNew = 0;

  rc = fts5OpenMethod(pCsr->base.pVtab, (sqlite3_vtab_cursor**)&pNew);
  if( rc==SQLITE_OK ){
    pNew->ePlan = FTS5_PLAN_MATCH;
    pNew->iFirstRowid = SMALLEST_INT64;
    pNew->iLastRowid = LARGEST_INT64;
    pNew->base.pVtab = (sqlite3_vtab*)pTab;
    rc = sqlite3Fts5ExprClonePhrase(pCsr->pExpr, iPhrase, &pNew->pExpr);
  }

  if( rc==SQLITE_OK ){
    for(rc = fts5CursorFirst(pTab, pNew, 0);
        rc==SQLITE_OK && CsrFlagTest(pNew, FTS5CSR_EOF)==0;
        rc = fts5NextMethod((sqlite3_vtab_cursor*)pNew)
    ){
      rc = xCallback(&sFts5Api, (Fts5Context*)pNew, pUserData);
      if( rc!=SQLITE_OK ){
        if( rc==SQLITE_DONE ) rc = SQLITE_OK;
        break;
      }
    }
  }

  fts5CloseMethod((sqlite3_vtab_cursor*)pNew);
  return rc;
}

static void fts5ApiInvoke(
  Fts5Auxiliary *pAux,
  Fts5Cursor *pCsr,
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  assert( pCsr->pAux==0 );
  pCsr->pAux = pAux;
  pAux->xFunc(&sFts5Api, (Fts5Context*)pCsr, context, argc, argv);
  pCsr->pAux = 0;
}

static Fts5Cursor *fts5CursorFromCsrid(Fts5Global *pGlobal, i64 iCsrId){
  Fts5Cursor *pCsr;
  for(pCsr=pGlobal->pCsr; pCsr; pCsr=pCsr->pNext){
    if( pCsr->iCsrId==iCsrId ) break;
  }
  return pCsr;
}

static void fts5ApiCallback(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){

  Fts5Auxiliary *pAux;
  Fts5Cursor *pCsr;
  i64 iCsrId;

  assert( argc>=1 );
  pAux = (Fts5Auxiliary*)sqlite3_user_data(context);
  iCsrId = sqlite3_value_int64(argv[0]);

  pCsr = fts5CursorFromCsrid(pAux->pGlobal, iCsrId);
  if( pCsr==0 || pCsr->ePlan==0 ){
    char *zErr = sqlite3_mprintf("no such cursor: %lld", iCsrId);
    sqlite3_result_error(context, zErr, -1);
    sqlite3_free(zErr);
  }else{
    fts5ApiInvoke(pAux, pCsr, context, argc-1, &argv[1]);
  }
}


/*
** Given cursor id iId, return a pointer to the corresponding Fts5Table 
** object. Or NULL If the cursor id does not exist.
*/
Fts5Table *sqlite3Fts5TableFromCsrid(
  Fts5Global *pGlobal,            /* FTS5 global context for db handle */
  i64 iCsrId                      /* Id of cursor to find */
){
  Fts5Cursor *pCsr;
  pCsr = fts5CursorFromCsrid(pGlobal, iCsrId);
  if( pCsr ){
    return (Fts5Table*)pCsr->base.pVtab;
  }
  return 0;
}

/*
** Return a "position-list blob" corresponding to the current position of
** cursor pCsr via sqlite3_result_blob(). A position-list blob contains
** the current position-list for each phrase in the query associated with
** cursor pCsr.
**
** A position-list blob begins with (nPhrase-1) varints, where nPhrase is
** the number of phrases in the query. Following the varints are the
** concatenated position lists for each phrase, in order.
**
** The first varint (if it exists) contains the size of the position list
** for phrase 0. The second (same disclaimer) contains the size of position
** list 1. And so on. There is no size field for the final position list,
** as it can be derived from the total size of the blob.
*/
static int fts5PoslistBlob(sqlite3_context *pCtx, Fts5Cursor *pCsr){
  int i;
  int rc = SQLITE_OK;
  int nPhrase = sqlite3Fts5ExprPhraseCount(pCsr->pExpr);
  Fts5Buffer val;

  memset(&val, 0, sizeof(Fts5Buffer));
  switch( ((Fts5Table*)(pCsr->base.pVtab))->pConfig->eDetail ){
    case FTS5_DETAIL_FULL:

      /* Append the varints */
      for(i=0; i<(nPhrase-1); i++){
        const u8 *dummy;
        int nByte = sqlite3Fts5ExprPoslist(pCsr->pExpr, i, &dummy);
        sqlite3Fts5BufferAppendVarint(&rc, &val, nByte);
      }

      /* Append the position lists */
      for(i=0; i<nPhrase; i++){
        const u8 *pPoslist;
        int nPoslist;
        nPoslist = sqlite3Fts5ExprPoslist(pCsr->pExpr, i, &pPoslist);
        sqlite3Fts5BufferAppendBlob(&rc, &val, nPoslist, pPoslist);
      }
      break;

    case FTS5_DETAIL_COLUMNS:

      /* Append the varints */
      for(i=0; rc==SQLITE_OK && i<(nPhrase-1); i++){
        const u8 *dummy;
        int nByte;
        rc = sqlite3Fts5ExprPhraseCollist(pCsr->pExpr, i, &dummy, &nByte);
        sqlite3Fts5BufferAppendVarint(&rc, &val, nByte);
      }

      /* Append the position lists */
      for(i=0; rc==SQLITE_OK && i<nPhrase; i++){
        const u8 *pPoslist;
        int nPoslist;
        rc = sqlite3Fts5ExprPhraseCollist(pCsr->pExpr, i, &pPoslist, &nPoslist);
        sqlite3Fts5BufferAppendBlob(&rc, &val, nPoslist, pPoslist);
      }
      break;

    default:
      break;
  }

  sqlite3_result_blob(pCtx, val.p, val.n, sqlite3_free);
  return rc;
}

/* 
** This is the xColumn method, called by SQLite to request a value from
** the row that the supplied cursor currently points to.
*/
static int fts5ColumnMethod(
  sqlite3_vtab_cursor *pCursor,   /* Cursor to retrieve value from */
  sqlite3_context *pCtx,          /* Context for sqlite3_result_xxx() calls */
  int iCol                        /* Index of column to read value from */
){
  Fts5FullTable *pTab = (Fts5FullTable*)(pCursor->pVtab);
  Fts5Config *pConfig = pTab->p.pConfig;
  Fts5Cursor *pCsr = (Fts5Cursor*)pCursor;
  int rc = SQLITE_OK;
  
  assert( CsrFlagTest(pCsr, FTS5CSR_EOF)==0 );

  if( pCsr->ePlan==FTS5_PLAN_SPECIAL ){
    if( iCol==pConfig->nCol ){
      sqlite3_result_int64(pCtx, pCsr->iSpecial);
    }
  }else

  if( iCol==pConfig->nCol ){
    /* User is requesting the value of the special column with the same name
    ** as the table. Return the cursor integer id number. This value is only
    ** useful in that it may be passed as the first argument to an FTS5
    ** auxiliary function.  */
    sqlite3_result_int64(pCtx, pCsr->iCsrId);
  }else if( iCol==pConfig->nCol+1 ){

    /* The value of the "rank" column. */
    if( pCsr->ePlan==FTS5_PLAN_SOURCE ){
      fts5PoslistBlob(pCtx, pCsr);
    }else if( 
        pCsr->ePlan==FTS5_PLAN_MATCH
     || pCsr->ePlan==FTS5_PLAN_SORTED_MATCH
    ){
      if( pCsr->pRank || SQLITE_OK==(rc = fts5FindRankFunction(pCsr)) ){
        fts5ApiInvoke(pCsr->pRank, pCsr, pCtx, pCsr->nRankArg, pCsr->apRankArg);
      }
    }
  }else if( !fts5IsContentless(pTab) ){
    pConfig->pzErrmsg = &pTab->p.base.zErrMsg;
    rc = fts5SeekCursor(pCsr, 1);
    if( rc==SQLITE_OK ){
      sqlite3_result_value(pCtx, sqlite3_column_value(pCsr->pStmt, iCol+1));
    }
    pConfig->pzErrmsg = 0;
  }
  return rc;
}


/*
** This routine implements the xFindFunction method for the FTS3
** virtual table.
*/
static int fts5FindFunctionMethod(
  sqlite3_vtab *pVtab,            /* Virtual table handle */
  int nUnused,                    /* Number of SQL function arguments */
  const char *zName,              /* Name of SQL function */
  void (**pxFunc)(sqlite3_context*,int,sqlite3_value**), /* OUT: Result */
  void **ppArg                    /* OUT: User data for *pxFunc */
){
  Fts5FullTable *pTab = (Fts5FullTable*)pVtab;
  Fts5Auxiliary *pAux;

  UNUSED_PARAM(nUnused);
  pAux = fts5FindAuxiliary(pTab, zName);
  if( pAux ){
    *pxFunc = fts5ApiCallback;
    *ppArg = (void*)pAux;
    return 1;
  }

  /* No function of the specified name was found. Return 0. */
  return 0;
}

/*
** Implementation of FTS5 xRename method. Rename an fts5 table.
*/
static int fts5RenameMethod(
  sqlite3_vtab *pVtab,            /* Virtual table handle */
  const char *zName               /* New name of table */
){
  Fts5FullTable *pTab = (Fts5FullTable*)pVtab;
  return sqlite3Fts5StorageRename(pTab->pStorage, zName);
}

int sqlite3Fts5FlushToDisk(Fts5Table *pTab){
  fts5TripCursors((Fts5FullTable*)pTab);
  return sqlite3Fts5StorageSync(((Fts5FullTable*)pTab)->pStorage);
}

/*
** The xSavepoint() method.
**
** Flush the contents of the pending-terms table to disk.
*/
static int fts5SavepointMethod(sqlite3_vtab *pVtab, int iSavepoint){
  UNUSED_PARAM(iSavepoint);  /* Call below is a no-op for NDEBUG builds */
  fts5CheckTransactionState((Fts5FullTable*)pVtab, FTS5_SAVEPOINT, iSavepoint);
  return sqlite3Fts5FlushToDisk((Fts5Table*)pVtab);
}

/*
** The xRelease() method.
**
** This is a no-op.
*/
static int fts5ReleaseMethod(sqlite3_vtab *pVtab, int iSavepoint){
  UNUSED_PARAM(iSavepoint);  /* Call below is a no-op for NDEBUG builds */
  fts5CheckTransactionState((Fts5FullTable*)pVtab, FTS5_RELEASE, iSavepoint);
  return sqlite3Fts5FlushToDisk((Fts5Table*)pVtab);
}

/*
** The xRollbackTo() method.
**
** Discard the contents of the pending terms table.
*/
static int fts5RollbackToMethod(sqlite3_vtab *pVtab, int iSavepoint){
  Fts5FullTable *pTab = (Fts5FullTable*)pVtab;
  UNUSED_PARAM(iSavepoint);  /* Call below is a no-op for NDEBUG builds */
  fts5CheckTransactionState(pTab, FTS5_ROLLBACKTO, iSavepoint);
  fts5TripCursors(pTab);
  return sqlite3Fts5StorageRollback(pTab->pStorage);
}

/*
** Register a new auxiliary function with global context pGlobal.
*/
static int fts5CreateAux(
  fts5_api *pApi,                 /* Global context (one per db handle) */
  const char *zName,              /* Name of new function */
  void *pUserData,                /* User data for aux. function */
  fts5_extension_function xFunc,  /* Aux. function implementation */
  void(*xDestroy)(void*)          /* Destructor for pUserData */
){
  Fts5Global *pGlobal = (Fts5Global*)pApi;
  int rc = sqlite3_overload_function(pGlobal->db, zName, -1);
  if( rc==SQLITE_OK ){
    Fts5Auxiliary *pAux;
    sqlite3_int64 nName;            /* Size of zName in bytes, including \0 */
    sqlite3_int64 nByte;            /* Bytes of space to allocate */

    nName = strlen(zName) + 1;
    nByte = sizeof(Fts5Auxiliary) + nName;
    pAux = (Fts5Auxiliary*)sqlite3_malloc64(nByte);
    if( pAux ){
      memset(pAux, 0, (size_t)nByte);
      pAux->zFunc = (char*)&pAux[1];
      memcpy(pAux->zFunc, zName, nName);
      pAux->pGlobal = pGlobal;
      pAux->pUserData = pUserData;
      pAux->xFunc = xFunc;
      pAux->xDestroy = xDestroy;
      pAux->pNext = pGlobal->pAux;
      pGlobal->pAux = pAux;
    }else{
      rc = SQLITE_NOMEM;
    }
  }

  return rc;
}

/*
** Register a new tokenizer. This is the implementation of the 
** fts5_api.xCreateTokenizer() method.
*/
static int fts5CreateTokenizer(
  fts5_api *pApi,                 /* Global context (one per db handle) */
  const char *zName,              /* Name of new function */
  void *pUserData,                /* User data for aux. function */
  fts5_tokenizer *pTokenizer,     /* Tokenizer implementation */
  void(*xDestroy)(void*)          /* Destructor for pUserData */
){
  Fts5Global *pGlobal = (Fts5Global*)pApi;
  Fts5TokenizerModule *pNew;
  sqlite3_int64 nName;            /* Size of zName and its \0 terminator */
  sqlite3_int64 nByte;            /* Bytes of space to allocate */
  int rc = SQLITE_OK;

  nName = strlen(zName) + 1;
  nByte = sizeof(Fts5TokenizerModule) + nName;
  pNew = (Fts5TokenizerModule*)sqlite3_malloc64(nByte);
  if( pNew ){
    memset(pNew, 0, (size_t)nByte);
    pNew->zName = (char*)&pNew[1];
    memcpy(pNew->zName, zName, nName);
    pNew->pUserData = pUserData;
    pNew->x = *pTokenizer;
    pNew->xDestroy = xDestroy;
    pNew->pNext = pGlobal->pTok;
    pGlobal->pTok = pNew;
    if( pNew->pNext==0 ){
      pGlobal->pDfltTok = pNew;
    }
  }else{
    rc = SQLITE_NOMEM;
  }

  return rc;
}

static Fts5TokenizerModule *fts5LocateTokenizer(
  Fts5Global *pGlobal, 
  const char *zName
){
  Fts5TokenizerModule *pMod = 0;

  if( zName==0 ){
    pMod = pGlobal->pDfltTok;
  }else{
    for(pMod=pGlobal->pTok; pMod; pMod=pMod->pNext){
      if( sqlite3_stricmp(zName, pMod->zName)==0 ) break;
    }
  }

  return pMod;
}

/*
** Find a tokenizer. This is the implementation of the 
** fts5_api.xFindTokenizer() method.
*/
static int fts5FindTokenizer(
  fts5_api *pApi,                 /* Global context (one per db handle) */
  const char *zName,              /* Name of new function */
  void **ppUserData,
  fts5_tokenizer *pTokenizer      /* Populate this object */
){
  int rc = SQLITE_OK;
  Fts5TokenizerModule *pMod;

  pMod = fts5LocateTokenizer((Fts5Global*)pApi, zName);
  if( pMod ){
    *pTokenizer = pMod->x;
    *ppUserData = pMod->pUserData;
  }else{
    memset(pTokenizer, 0, sizeof(fts5_tokenizer));
    rc = SQLITE_ERROR;
  }

  return rc;
}

int sqlite3Fts5GetTokenizer(
  Fts5Global *pGlobal, 
  const char **azArg,
  int nArg,
  Fts5Tokenizer **ppTok,
  fts5_tokenizer **ppTokApi,
  char **pzErr
){
  Fts5TokenizerModule *pMod;
  int rc = SQLITE_OK;

  pMod = fts5LocateTokenizer(pGlobal, nArg==0 ? 0 : azArg[0]);
  if( pMod==0 ){
    assert( nArg>0 );
    rc = SQLITE_ERROR;
    *pzErr = sqlite3_mprintf("no such tokenizer: %s", azArg[0]);
  }else{
    rc = pMod->x.xCreate(pMod->pUserData, &azArg[1], (nArg?nArg-1:0), ppTok);
    *ppTokApi = &pMod->x;
    if( rc!=SQLITE_OK && pzErr ){
      *pzErr = sqlite3_mprintf("error in tokenizer constructor");
    }
  }

  if( rc!=SQLITE_OK ){
    *ppTokApi = 0;
    *ppTok = 0;
  }

  return rc;
}

static void fts5ModuleDestroy(void *pCtx){
  Fts5TokenizerModule *pTok, *pNextTok;
  Fts5Auxiliary *pAux, *pNextAux;
  Fts5Global *pGlobal = (Fts5Global*)pCtx;

  for(pAux=pGlobal->pAux; pAux; pAux=pNextAux){
    pNextAux = pAux->pNext;
    if( pAux->xDestroy ) pAux->xDestroy(pAux->pUserData);
    sqlite3_free(pAux);
  }

  for(pTok=pGlobal->pTok; pTok; pTok=pNextTok){
    pNextTok = pTok->pNext;
    if( pTok->xDestroy ) pTok->xDestroy(pTok->pUserData);
    sqlite3_free(pTok);
  }

  sqlite3_free(pGlobal);
}

static void fts5Fts5Func(
  sqlite3_context *pCtx,          /* Function call context */
  int nArg,                       /* Number of args */
  sqlite3_value **apArg           /* Function arguments */
){
  Fts5Global *pGlobal = (Fts5Global*)sqlite3_user_data(pCtx);
  fts5_api **ppApi;
  UNUSED_PARAM(nArg);
  assert( nArg==1 );
  ppApi = (fts5_api**)sqlite3_value_pointer(apArg[0], "fts5_api_ptr");
  if( ppApi ) *ppApi = &pGlobal->api;
}

/*
** Implementation of fts5_source_id() function.
*/
static void fts5SourceIdFunc(
  sqlite3_context *pCtx,          /* Function call context */
  int nArg,                       /* Number of args */
  sqlite3_value **apUnused        /* Function arguments */
){
  assert( nArg==0 );
  UNUSED_PARAM2(nArg, apUnused);
  sqlite3_result_text(pCtx, "--FTS5-SOURCE-ID--", -1, SQLITE_TRANSIENT);
}

/*
** Return true if zName is the extension on one of the shadow tables used
** by this module.
*/
static int fts5ShadowName(const char *zName){
  static const char *azName[] = {
    "config", "content", "data", "docsize", "idx"
  };
  unsigned int i;
  for(i=0; i<sizeof(azName)/sizeof(azName[0]); i++){
    if( sqlite3_stricmp(zName, azName[i])==0 ) return 1;
  }
  return 0;
}

static int fts5Init(sqlite3 *db){
  static const sqlite3_module fts5Mod = {
    /* iVersion      */ 3,
    /* xCreate       */ fts5CreateMethod,
    /* xConnect      */ fts5ConnectMethod,
    /* xBestIndex    */ fts5BestIndexMethod,
    /* xDisconnect   */ fts5DisconnectMethod,
    /* xDestroy      */ fts5DestroyMethod,
    /* xOpen         */ fts5OpenMethod,
    /* xClose        */ fts5CloseMethod,
    /* xFilter       */ fts5FilterMethod,
    /* xNext         */ fts5NextMethod,
    /* xEof          */ fts5EofMethod,
    /* xColumn       */ fts5ColumnMethod,
    /* xRowid        */ fts5RowidMethod,
    /* xUpdate       */ fts5UpdateMethod,
    /* xBegin        */ fts5BeginMethod,
    /* xSync         */ fts5SyncMethod,
    /* xCommit       */ fts5CommitMethod,
    /* xRollback     */ fts5RollbackMethod,
    /* xFindFunction */ fts5FindFunctionMethod,
    /* xRename       */ fts5RenameMethod,
    /* xSavepoint    */ fts5SavepointMethod,
    /* xRelease      */ fts5ReleaseMethod,
    /* xRollbackTo   */ fts5RollbackToMethod,
    /* xShadowName   */ fts5ShadowName
  };

  int rc;
  Fts5Global *pGlobal = 0;

  pGlobal = (Fts5Global*)sqlite3_malloc(sizeof(Fts5Global));
  if( pGlobal==0 ){
    rc = SQLITE_NOMEM;
  }else{
    void *p = (void*)pGlobal;
    memset(pGlobal, 0, sizeof(Fts5Global));
    pGlobal->db = db;
    pGlobal->api.iVersion = 2;
    pGlobal->api.xCreateFunction = fts5CreateAux;
    pGlobal->api.xCreateTokenizer = fts5CreateTokenizer;
    pGlobal->api.xFindTokenizer = fts5FindTokenizer;
    rc = sqlite3_create_module_v2(db, "fts5", &fts5Mod, p, fts5ModuleDestroy);
    if( rc==SQLITE_OK ) rc = sqlite3Fts5IndexInit(db);
    if( rc==SQLITE_OK ) rc = sqlite3Fts5ExprInit(pGlobal, db);
    if( rc==SQLITE_OK ) rc = sqlite3Fts5AuxInit(&pGlobal->api);
    if( rc==SQLITE_OK ) rc = sqlite3Fts5TokenizerInit(&pGlobal->api);
    if( rc==SQLITE_OK ) rc = sqlite3Fts5VocabInit(pGlobal, db);
    if( rc==SQLITE_OK ){
      rc = sqlite3_create_function(
          db, "fts5", 1, SQLITE_UTF8, p, fts5Fts5Func, 0, 0
      );
    }
    if( rc==SQLITE_OK ){
      rc = sqlite3_create_function(
          db, "fts5_source_id", 0, SQLITE_UTF8, p, fts5SourceIdFunc, 0, 0
      );
    }
  }

  /* If SQLITE_FTS5_ENABLE_TEST_MI is defined, assume that the file
  ** fts5_test_mi.c is compiled and linked into the executable. And call
  ** its entry point to enable the matchinfo() demo.  */
#ifdef SQLITE_FTS5_ENABLE_TEST_MI
  if( rc==SQLITE_OK ){
    extern int sqlite3Fts5TestRegisterMatchinfo(sqlite3*);
    rc = sqlite3Fts5TestRegisterMatchinfo(db);
  }
#endif

  return rc;
}

/*
** The following functions are used to register the module with SQLite. If
** this module is being built as part of the SQLite core (SQLITE_CORE is
** defined), then sqlite3_open() will call sqlite3Fts5Init() directly.
**
** Or, if this module is being built as a loadable extension, 
** sqlite3Fts5Init() is omitted and the two standard entry points
** sqlite3_fts_init() and sqlite3_fts5_init() defined instead.
*/
#ifndef SQLITE_CORE
#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_fts_init(
  sqlite3 *db,
  char **pzErrMsg,
  const sqlite3_api_routines *pApi
){
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  return fts5Init(db);
}

#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_fts5_init(
  sqlite3 *db,
  char **pzErrMsg,
  const sqlite3_api_routines *pApi
){
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  return fts5Init(db);
}
#else
int sqlite3Fts5Init(sqlite3 *db){
  return fts5Init(db);
}
#endif
