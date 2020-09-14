/*
** 2018-09-27
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
** from sqlite3_status64() and sqlite3_db_status().
**
** Usage example:
**
**     .load ./memstat
**     .mode quote
**     .header on
**     SELECT * FROM memstat;
*/
#if !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_MEMSTATVTAB)
#if !defined(SQLITEINT_H)
#include "sqlite3ext.h"
#endif
SQLITE_EXTENSION_INIT1
#include <assert.h>
#include <string.h>

#ifndef SQLITE_OMIT_VIRTUALTABLE

/* memstat_vtab is a subclass of sqlite3_vtab which will
** serve as the underlying representation of a memstat virtual table
*/
typedef struct memstat_vtab memstat_vtab;
struct memstat_vtab {
  sqlite3_vtab base;  /* Base class - must be first */
  sqlite3 *db;        /* Database connection for this memstat vtab */
};

/* memstat_cursor is a subclass of sqlite3_vtab_cursor which will
** serve as the underlying representation of a cursor that scans
** over rows of the result
*/
typedef struct memstat_cursor memstat_cursor;
struct memstat_cursor {
  sqlite3_vtab_cursor base;  /* Base class - must be first */
  sqlite3 *db;               /* Database connection for this cursor */
  int iRowid;                /* Current row in aMemstatColumn[] */
  int iDb;                   /* Which schema we are looking at */
  int nDb;                   /* Number of schemas */
  char **azDb;               /* Names of all schemas */
  sqlite3_int64 aVal[2];     /* Result values */
};

/*
** The memstatConnect() method is invoked to create a new
** memstat_vtab that describes the memstat virtual table.
**
** Think of this routine as the constructor for memstat_vtab objects.
**
** All this routine needs to do is:
**
**    (1) Allocate the memstat_vtab object and initialize all fields.
**
**    (2) Tell SQLite (via the sqlite3_declare_vtab() interface) what the
**        result set of queries against memstat will look like.
*/
static int memstatConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  memstat_vtab *pNew;
  int rc;

/* Column numbers */
#define MSV_COLUMN_NAME    0   /* Name of quantity being measured */
#define MSV_COLUMN_SCHEMA  1   /* schema name */
#define MSV_COLUMN_VALUE   2   /* Current value */
#define MSV_COLUMN_HIWTR   3   /* Highwater mark */

  rc = sqlite3_declare_vtab(db,"CREATE TABLE x(name,schema,value,hiwtr)");
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
** This method is the destructor for memstat_cursor objects.
*/
static int memstatDisconnect(sqlite3_vtab *pVtab){
  sqlite3_free(pVtab);
  return SQLITE_OK;
}

/*
** Constructor for a new memstat_cursor object.
*/
static int memstatOpen(sqlite3_vtab *p, sqlite3_vtab_cursor **ppCursor){
  memstat_cursor *pCur;
  pCur = sqlite3_malloc( sizeof(*pCur) );
  if( pCur==0 ) return SQLITE_NOMEM;
  memset(pCur, 0, sizeof(*pCur));
  pCur->db = ((memstat_vtab*)p)->db;
  *ppCursor = &pCur->base;
  return SQLITE_OK;
}

/*
** Clear all the schema names from a cursor
*/
static void memstatClearSchema(memstat_cursor *pCur){
  int i;
  if( pCur->azDb==0 ) return;
  for(i=0; i<pCur->nDb; i++){
    sqlite3_free(pCur->azDb[i]);
  }
  sqlite3_free(pCur->azDb);
  pCur->azDb = 0;
  pCur->nDb = 0;
}

/*
** Fill in the azDb[] array for the cursor.
*/
static int memstatFindSchemas(memstat_cursor *pCur){
  sqlite3_stmt *pStmt = 0;
  int rc;
  if( pCur->nDb ) return SQLITE_OK;
  rc = sqlite3_prepare_v2(pCur->db, "PRAGMA database_list", -1, &pStmt, 0);
  if( rc ){
    sqlite3_finalize(pStmt);
    return rc;
  }
  while( sqlite3_step(pStmt)==SQLITE_ROW ){
    char **az, *z;
    az = sqlite3_realloc64(pCur->azDb, sizeof(char*)*(pCur->nDb+1));
    if( az==0 ){
      memstatClearSchema(pCur);
      return SQLITE_NOMEM;
    }
    pCur->azDb = az;
    z = sqlite3_mprintf("%s", sqlite3_column_text(pStmt, 1));
    if( z==0 ){
      memstatClearSchema(pCur);
      return SQLITE_NOMEM;
    }
    pCur->azDb[pCur->nDb] = z;
    pCur->nDb++;
  }
  sqlite3_finalize(pStmt);
  return SQLITE_OK;
}


/*
** Destructor for a memstat_cursor.
*/
static int memstatClose(sqlite3_vtab_cursor *cur){
  memstat_cursor *pCur = (memstat_cursor*)cur;
  memstatClearSchema(pCur);
  sqlite3_free(cur);
  return SQLITE_OK;
}


/*
** Allowed values for aMemstatColumn[].eType
*/
#define MSV_GSTAT   0          /* sqlite3_status64() information */
#define MSV_DB      1          /* sqlite3_db_status() information */
#define MSV_ZIPVFS  2          /* ZIPVFS file-control with 64-bit return */

/*
** An array of quantities that can be measured and reported by
** this virtual table
*/
static const struct MemstatColumns {
  const char *zName;    /* Symbolic name */
  unsigned char eType;  /* Type of interface */
  unsigned char mNull;  /* Bitmask of which columns are NULL */
                        /* 2: dbname,  4: current,  8: hiwtr */
  int eOp;              /* Opcode */
} aMemstatColumn[] = {
 {"MEMORY_USED",            MSV_GSTAT,  2, SQLITE_STATUS_MEMORY_USED          },
 {"MALLOC_SIZE",            MSV_GSTAT,  6, SQLITE_STATUS_MALLOC_SIZE          },
 {"MALLOC_COUNT",           MSV_GSTAT,  2, SQLITE_STATUS_MALLOC_COUNT         },
 {"PAGECACHE_USED",         MSV_GSTAT,  2, SQLITE_STATUS_PAGECACHE_USED       },
 {"PAGECACHE_OVERFLOW",     MSV_GSTAT,  2, SQLITE_STATUS_PAGECACHE_OVERFLOW   },
 {"PAGECACHE_SIZE",         MSV_GSTAT,  6, SQLITE_STATUS_PAGECACHE_SIZE       },
 {"PARSER_STACK",           MSV_GSTAT,  6, SQLITE_STATUS_PARSER_STACK         },
 {"DB_LOOKASIDE_USED",      MSV_DB,     2, SQLITE_DBSTATUS_LOOKASIDE_USED     },
 {"DB_LOOKASIDE_HIT",       MSV_DB,     6, SQLITE_DBSTATUS_LOOKASIDE_HIT      },
 {"DB_LOOKASIDE_MISS_SIZE", MSV_DB,     6, SQLITE_DBSTATUS_LOOKASIDE_MISS_SIZE},
 {"DB_LOOKASIDE_MISS_FULL", MSV_DB,     6, SQLITE_DBSTATUS_LOOKASIDE_MISS_FULL},
 {"DB_CACHE_USED",          MSV_DB,    10, SQLITE_DBSTATUS_CACHE_USED         },
#if SQLITE_VERSION_NUMBER >= 3140000
 {"DB_CACHE_USED_SHARED",   MSV_DB,    10, SQLITE_DBSTATUS_CACHE_USED_SHARED  },
#endif
 {"DB_SCHEMA_USED",         MSV_DB,    10, SQLITE_DBSTATUS_SCHEMA_USED        },
 {"DB_STMT_USED",           MSV_DB,    10, SQLITE_DBSTATUS_STMT_USED          },
 {"DB_CACHE_HIT",           MSV_DB,    10, SQLITE_DBSTATUS_CACHE_HIT          },
 {"DB_CACHE_MISS",          MSV_DB,    10, SQLITE_DBSTATUS_CACHE_MISS         },
 {"DB_CACHE_WRITE",         MSV_DB,    10, SQLITE_DBSTATUS_CACHE_WRITE        },
#if SQLITE_VERSION_NUMBER >= 3230000
 {"DB_CACHE_SPILL",         MSV_DB,    10, SQLITE_DBSTATUS_CACHE_SPILL        },
#endif
 {"DB_DEFERRED_FKS",        MSV_DB,    10, SQLITE_DBSTATUS_DEFERRED_FKS       },
#ifdef SQLITE_ENABLE_ZIPVFS
 {"ZIPVFS_CACHE_USED",      MSV_ZIPVFS, 8, 231454 },
 {"ZIPVFS_CACHE_HIT",       MSV_ZIPVFS, 8, 231455 },
 {"ZIPVFS_CACHE_MISS",      MSV_ZIPVFS, 8, 231456 },
 {"ZIPVFS_CACHE_WRITE",     MSV_ZIPVFS, 8, 231457 },
 {"ZIPVFS_DIRECT_READ",     MSV_ZIPVFS, 8, 231458 },
 {"ZIPVFS_DIRECT_BYTES",    MSV_ZIPVFS, 8, 231459 },
#endif /* SQLITE_ENABLE_ZIPVFS */
};
#define MSV_NROW (sizeof(aMemstatColumn)/sizeof(aMemstatColumn[0]))

/*
** Advance a memstat_cursor to its next row of output.
*/
static int memstatNext(sqlite3_vtab_cursor *cur){
  memstat_cursor *pCur = (memstat_cursor*)cur;
  int i;
  assert( pCur->iRowid<=MSV_NROW );
  while(1){
    i = (int)pCur->iRowid - 1;
    if( i<0 || (aMemstatColumn[i].mNull & 2)!=0 || (++pCur->iDb)>=pCur->nDb ){
      pCur->iRowid++;
      if( pCur->iRowid>MSV_NROW ) return SQLITE_OK;  /* End of the table */
      pCur->iDb = 0;
      i++;
    }
    pCur->aVal[0] = 0;
    pCur->aVal[1] = 0;    
    switch( aMemstatColumn[i].eType ){
      case MSV_GSTAT: {
        if( sqlite3_libversion_number()>=3010000 ){
          sqlite3_status64(aMemstatColumn[i].eOp,
                           &pCur->aVal[0], &pCur->aVal[1],0);
        }else{
          int xCur, xHiwtr;
          sqlite3_status(aMemstatColumn[i].eOp, &xCur, &xHiwtr, 0);
          pCur->aVal[0] = xCur;
          pCur->aVal[1] = xHiwtr;
        }
        break;
      }
      case MSV_DB: {
        int xCur, xHiwtr;
        sqlite3_db_status(pCur->db, aMemstatColumn[i].eOp, &xCur, &xHiwtr, 0);
        pCur->aVal[0] = xCur;
        pCur->aVal[1] = xHiwtr;
        break;
      }
      case MSV_ZIPVFS: {
        int rc;
        rc = sqlite3_file_control(pCur->db, pCur->azDb[pCur->iDb],
                                  aMemstatColumn[i].eOp, (void*)&pCur->aVal[0]);
        if( rc!=SQLITE_OK ) continue;
        break;
      }
    }
    break;
  }
  return SQLITE_OK;
}
  

/*
** Return values of columns for the row at which the memstat_cursor
** is currently pointing.
*/
static int memstatColumn(
  sqlite3_vtab_cursor *cur,   /* The cursor */
  sqlite3_context *ctx,       /* First argument to sqlite3_result_...() */
  int iCol                    /* Which column to return */
){
  memstat_cursor *pCur = (memstat_cursor*)cur;
  int i;
  assert( pCur->iRowid>0 && pCur->iRowid<=MSV_NROW );
  i = (int)pCur->iRowid - 1;
  if( (aMemstatColumn[i].mNull & (1<<iCol))!=0 ){
    return SQLITE_OK;
  }
  switch( iCol ){
    case MSV_COLUMN_NAME: {
      sqlite3_result_text(ctx, aMemstatColumn[i].zName, -1, SQLITE_STATIC);
      break;
    }
    case MSV_COLUMN_SCHEMA: {
      sqlite3_result_text(ctx, pCur->azDb[pCur->iDb], -1, 0);
      break;
    }
    case MSV_COLUMN_VALUE: {
      sqlite3_result_int64(ctx, pCur->aVal[0]);
      break;
    }
    case MSV_COLUMN_HIWTR: {
      sqlite3_result_int64(ctx, pCur->aVal[1]);
      break;
    }
  }
  return SQLITE_OK;
}

/*
** Return the rowid for the current row.  In this implementation, the
** rowid is the same as the output value.
*/
static int memstatRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  memstat_cursor *pCur = (memstat_cursor*)cur;
  *pRowid = pCur->iRowid*1000 + pCur->iDb;
  return SQLITE_OK;
}

/*
** Return TRUE if the cursor has been moved off of the last
** row of output.
*/
static int memstatEof(sqlite3_vtab_cursor *cur){
  memstat_cursor *pCur = (memstat_cursor*)cur;
  return pCur->iRowid>MSV_NROW;
}

/*
** This method is called to "rewind" the memstat_cursor object back
** to the first row of output.  This method is always called at least
** once prior to any call to memstatColumn() or memstatRowid() or 
** memstatEof().
*/
static int memstatFilter(
  sqlite3_vtab_cursor *pVtabCursor, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  memstat_cursor *pCur = (memstat_cursor *)pVtabCursor;
  int rc = memstatFindSchemas(pCur);
  if( rc ) return rc;
  pCur->iRowid = 0;
  pCur->iDb = 0;
  return memstatNext(pVtabCursor);
}

/*
** SQLite will invoke this method one or more times while planning a query
** that uses the memstat virtual table.  This routine needs to create
** a query plan for each invocation and compute an estimated cost for that
** plan.
*/
static int memstatBestIndex(
  sqlite3_vtab *tab,
  sqlite3_index_info *pIdxInfo
){
  pIdxInfo->estimatedCost = (double)500;
  pIdxInfo->estimatedRows = 500;
  return SQLITE_OK;
}

/*
** This following structure defines all the methods for the 
** memstat virtual table.
*/
static sqlite3_module memstatModule = {
  0,                         /* iVersion */
  0,                         /* xCreate */
  memstatConnect,            /* xConnect */
  memstatBestIndex,          /* xBestIndex */
  memstatDisconnect,         /* xDisconnect */
  0,                         /* xDestroy */
  memstatOpen,               /* xOpen - open a cursor */
  memstatClose,              /* xClose - close a cursor */
  memstatFilter,             /* xFilter - configure scan constraints */
  memstatNext,               /* xNext - advance a cursor */
  memstatEof,                /* xEof - check for end of scan */
  memstatColumn,             /* xColumn - read data */
  memstatRowid,              /* xRowid - read data */
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

int sqlite3MemstatVtabInit(sqlite3 *db){
  int rc = SQLITE_OK;
#ifndef SQLITE_OMIT_VIRTUALTABLE
  rc = sqlite3_create_module(db, "sqlite_memstat", &memstatModule, 0);
#endif
  return rc;
}

#ifndef SQLITE_CORE
#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_memstat_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
#ifndef SQLITE_OMIT_VIRTUALTABLE
  rc = sqlite3MemstatVtabInit(db);
#endif
  return rc;
}
#endif /* SQLITE_CORE */
#endif /* !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_MEMSTATVTAB) */
