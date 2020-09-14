/*
** 2009 Oct 23
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
** This file is part of the SQLite FTS3 extension module. Specifically,
** this file contains code to insert, update and delete rows from FTS3
** tables. It also contains code to merge FTS3 b-tree segments. Some
** of the sub-routines used to merge segments are also used by the query 
** code in fts3.c.
*/

#include "fts3Int.h"
#if !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_FTS3)

#include <string.h>
#include <assert.h>
#include <stdlib.h>
#include <stdio.h>

#define FTS_MAX_APPENDABLE_HEIGHT 16

/*
** When full-text index nodes are loaded from disk, the buffer that they
** are loaded into has the following number of bytes of padding at the end 
** of it. i.e. if a full-text index node is 900 bytes in size, then a buffer
** of 920 bytes is allocated for it.
**
** This means that if we have a pointer into a buffer containing node data,
** it is always safe to read up to two varints from it without risking an
** overread, even if the node data is corrupted.
*/
#define FTS3_NODE_PADDING (FTS3_VARINT_MAX*2)

/*
** Under certain circumstances, b-tree nodes (doclists) can be loaded into
** memory incrementally instead of all at once. This can be a big performance
** win (reduced IO and CPU) if SQLite stops calling the virtual table xNext()
** method before retrieving all query results (as may happen, for example,
** if a query has a LIMIT clause).
**
** Incremental loading is used for b-tree nodes FTS3_NODE_CHUNK_THRESHOLD 
** bytes and larger. Nodes are loaded in chunks of FTS3_NODE_CHUNKSIZE bytes.
** The code is written so that the hard lower-limit for each of these values 
** is 1. Clearly such small values would be inefficient, but can be useful 
** for testing purposes.
**
** If this module is built with SQLITE_TEST defined, these constants may
** be overridden at runtime for testing purposes. File fts3_test.c contains
** a Tcl interface to read and write the values.
*/
#ifdef SQLITE_TEST
int test_fts3_node_chunksize = (4*1024);
int test_fts3_node_chunk_threshold = (4*1024)*4;
# define FTS3_NODE_CHUNKSIZE       test_fts3_node_chunksize
# define FTS3_NODE_CHUNK_THRESHOLD test_fts3_node_chunk_threshold
#else
# define FTS3_NODE_CHUNKSIZE (4*1024) 
# define FTS3_NODE_CHUNK_THRESHOLD (FTS3_NODE_CHUNKSIZE*4)
#endif

/*
** The values that may be meaningfully bound to the :1 parameter in
** statements SQL_REPLACE_STAT and SQL_SELECT_STAT.
*/
#define FTS_STAT_DOCTOTAL      0
#define FTS_STAT_INCRMERGEHINT 1
#define FTS_STAT_AUTOINCRMERGE 2

/*
** If FTS_LOG_MERGES is defined, call sqlite3_log() to report each automatic
** and incremental merge operation that takes place. This is used for 
** debugging FTS only, it should not usually be turned on in production
** systems.
*/
#ifdef FTS3_LOG_MERGES
static void fts3LogMerge(int nMerge, sqlite3_int64 iAbsLevel){
  sqlite3_log(SQLITE_OK, "%d-way merge from level %d", nMerge, (int)iAbsLevel);
}
#else
#define fts3LogMerge(x, y)
#endif


typedef struct PendingList PendingList;
typedef struct SegmentNode SegmentNode;
typedef struct SegmentWriter SegmentWriter;

/*
** An instance of the following data structure is used to build doclists
** incrementally. See function fts3PendingListAppend() for details.
*/
struct PendingList {
  int nData;
  char *aData;
  int nSpace;
  sqlite3_int64 iLastDocid;
  sqlite3_int64 iLastCol;
  sqlite3_int64 iLastPos;
};


/*
** Each cursor has a (possibly empty) linked list of the following objects.
*/
struct Fts3DeferredToken {
  Fts3PhraseToken *pToken;        /* Pointer to corresponding expr token */
  int iCol;                       /* Column token must occur in */
  Fts3DeferredToken *pNext;       /* Next in list of deferred tokens */
  PendingList *pList;             /* Doclist is assembled here */
};

/*
** An instance of this structure is used to iterate through the terms on
** a contiguous set of segment b-tree leaf nodes. Although the details of
** this structure are only manipulated by code in this file, opaque handles
** of type Fts3SegReader* are also used by code in fts3.c to iterate through
** terms when querying the full-text index. See functions:
**
**   sqlite3Fts3SegReaderNew()
**   sqlite3Fts3SegReaderFree()
**   sqlite3Fts3SegReaderIterate()
**
** Methods used to manipulate Fts3SegReader structures:
**
**   fts3SegReaderNext()
**   fts3SegReaderFirstDocid()
**   fts3SegReaderNextDocid()
*/
struct Fts3SegReader {
  int iIdx;                       /* Index within level, or 0x7FFFFFFF for PT */
  u8 bLookup;                     /* True for a lookup only */
  u8 rootOnly;                    /* True for a root-only reader */

  sqlite3_int64 iStartBlock;      /* Rowid of first leaf block to traverse */
  sqlite3_int64 iLeafEndBlock;    /* Rowid of final leaf block to traverse */
  sqlite3_int64 iEndBlock;        /* Rowid of final block in segment (or 0) */
  sqlite3_int64 iCurrentBlock;    /* Current leaf block (or 0) */

  char *aNode;                    /* Pointer to node data (or NULL) */
  int nNode;                      /* Size of buffer at aNode (or 0) */
  int nPopulate;                  /* If >0, bytes of buffer aNode[] loaded */
  sqlite3_blob *pBlob;            /* If not NULL, blob handle to read node */

  Fts3HashElem **ppNextElem;

  /* Variables set by fts3SegReaderNext(). These may be read directly
  ** by the caller. They are valid from the time SegmentReaderNew() returns
  ** until SegmentReaderNext() returns something other than SQLITE_OK
  ** (i.e. SQLITE_DONE).
  */
  int nTerm;                      /* Number of bytes in current term */
  char *zTerm;                    /* Pointer to current term */
  int nTermAlloc;                 /* Allocated size of zTerm buffer */
  char *aDoclist;                 /* Pointer to doclist of current entry */
  int nDoclist;                   /* Size of doclist in current entry */

  /* The following variables are used by fts3SegReaderNextDocid() to iterate 
  ** through the current doclist (aDoclist/nDoclist).
  */
  char *pOffsetList;
  int nOffsetList;                /* For descending pending seg-readers only */
  sqlite3_int64 iDocid;
};

#define fts3SegReaderIsPending(p) ((p)->ppNextElem!=0)
#define fts3SegReaderIsRootOnly(p) ((p)->rootOnly!=0)

/*
** An instance of this structure is used to create a segment b-tree in the
** database. The internal details of this type are only accessed by the
** following functions:
**
**   fts3SegWriterAdd()
**   fts3SegWriterFlush()
**   fts3SegWriterFree()
*/
struct SegmentWriter {
  SegmentNode *pTree;             /* Pointer to interior tree structure */
  sqlite3_int64 iFirst;           /* First slot in %_segments written */
  sqlite3_int64 iFree;            /* Next free slot in %_segments */
  char *zTerm;                    /* Pointer to previous term buffer */
  int nTerm;                      /* Number of bytes in zTerm */
  int nMalloc;                    /* Size of malloc'd buffer at zMalloc */
  char *zMalloc;                  /* Malloc'd space (possibly) used for zTerm */
  int nSize;                      /* Size of allocation at aData */
  int nData;                      /* Bytes of data in aData */
  char *aData;                    /* Pointer to block from malloc() */
  i64 nLeafData;                  /* Number of bytes of leaf data written */
};

/*
** Type SegmentNode is used by the following three functions to create
** the interior part of the segment b+-tree structures (everything except
** the leaf nodes). These functions and type are only ever used by code
** within the fts3SegWriterXXX() family of functions described above.
**
**   fts3NodeAddTerm()
**   fts3NodeWrite()
**   fts3NodeFree()
**
** When a b+tree is written to the database (either as a result of a merge
** or the pending-terms table being flushed), leaves are written into the 
** database file as soon as they are completely populated. The interior of
** the tree is assembled in memory and written out only once all leaves have
** been populated and stored. This is Ok, as the b+-tree fanout is usually
** very large, meaning that the interior of the tree consumes relatively 
** little memory.
*/
struct SegmentNode {
  SegmentNode *pParent;           /* Parent node (or NULL for root node) */
  SegmentNode *pRight;            /* Pointer to right-sibling */
  SegmentNode *pLeftmost;         /* Pointer to left-most node of this depth */
  int nEntry;                     /* Number of terms written to node so far */
  char *zTerm;                    /* Pointer to previous term buffer */
  int nTerm;                      /* Number of bytes in zTerm */
  int nMalloc;                    /* Size of malloc'd buffer at zMalloc */
  char *zMalloc;                  /* Malloc'd space (possibly) used for zTerm */
  int nData;                      /* Bytes of valid data so far */
  char *aData;                    /* Node data */
};

/*
** Valid values for the second argument to fts3SqlStmt().
*/
#define SQL_DELETE_CONTENT             0
#define SQL_IS_EMPTY                   1
#define SQL_DELETE_ALL_CONTENT         2 
#define SQL_DELETE_ALL_SEGMENTS        3
#define SQL_DELETE_ALL_SEGDIR          4
#define SQL_DELETE_ALL_DOCSIZE         5
#define SQL_DELETE_ALL_STAT            6
#define SQL_SELECT_CONTENT_BY_ROWID    7
#define SQL_NEXT_SEGMENT_INDEX         8
#define SQL_INSERT_SEGMENTS            9
#define SQL_NEXT_SEGMENTS_ID          10
#define SQL_INSERT_SEGDIR             11
#define SQL_SELECT_LEVEL              12
#define SQL_SELECT_LEVEL_RANGE        13
#define SQL_SELECT_LEVEL_COUNT        14
#define SQL_SELECT_SEGDIR_MAX_LEVEL   15
#define SQL_DELETE_SEGDIR_LEVEL       16
#define SQL_DELETE_SEGMENTS_RANGE     17
#define SQL_CONTENT_INSERT            18
#define SQL_DELETE_DOCSIZE            19
#define SQL_REPLACE_DOCSIZE           20
#define SQL_SELECT_DOCSIZE            21
#define SQL_SELECT_STAT               22
#define SQL_REPLACE_STAT              23

#define SQL_SELECT_ALL_PREFIX_LEVEL   24
#define SQL_DELETE_ALL_TERMS_SEGDIR   25
#define SQL_DELETE_SEGDIR_RANGE       26
#define SQL_SELECT_ALL_LANGID         27
#define SQL_FIND_MERGE_LEVEL          28
#define SQL_MAX_LEAF_NODE_ESTIMATE    29
#define SQL_DELETE_SEGDIR_ENTRY       30
#define SQL_SHIFT_SEGDIR_ENTRY        31
#define SQL_SELECT_SEGDIR             32
#define SQL_CHOMP_SEGDIR              33
#define SQL_SEGMENT_IS_APPENDABLE     34
#define SQL_SELECT_INDEXES            35
#define SQL_SELECT_MXLEVEL            36

#define SQL_SELECT_LEVEL_RANGE2       37
#define SQL_UPDATE_LEVEL_IDX          38
#define SQL_UPDATE_LEVEL              39

/*
** This function is used to obtain an SQLite prepared statement handle
** for the statement identified by the second argument. If successful,
** *pp is set to the requested statement handle and SQLITE_OK returned.
** Otherwise, an SQLite error code is returned and *pp is set to 0.
**
** If argument apVal is not NULL, then it must point to an array with
** at least as many entries as the requested statement has bound 
** parameters. The values are bound to the statements parameters before
** returning.
*/
static int fts3SqlStmt(
  Fts3Table *p,                   /* Virtual table handle */
  int eStmt,                      /* One of the SQL_XXX constants above */
  sqlite3_stmt **pp,              /* OUT: Statement handle */
  sqlite3_value **apVal           /* Values to bind to statement */
){
  const char *azSql[] = {
/* 0  */  "DELETE FROM %Q.'%q_content' WHERE rowid = ?",
/* 1  */  "SELECT NOT EXISTS(SELECT docid FROM %Q.'%q_content' WHERE rowid!=?)",
/* 2  */  "DELETE FROM %Q.'%q_content'",
/* 3  */  "DELETE FROM %Q.'%q_segments'",
/* 4  */  "DELETE FROM %Q.'%q_segdir'",
/* 5  */  "DELETE FROM %Q.'%q_docsize'",
/* 6  */  "DELETE FROM %Q.'%q_stat'",
/* 7  */  "SELECT %s WHERE rowid=?",
/* 8  */  "SELECT (SELECT max(idx) FROM %Q.'%q_segdir' WHERE level = ?) + 1",
/* 9  */  "REPLACE INTO %Q.'%q_segments'(blockid, block) VALUES(?, ?)",
/* 10 */  "SELECT coalesce((SELECT max(blockid) FROM %Q.'%q_segments') + 1, 1)",
/* 11 */  "REPLACE INTO %Q.'%q_segdir' VALUES(?,?,?,?,?,?)",

          /* Return segments in order from oldest to newest.*/ 
/* 12 */  "SELECT idx, start_block, leaves_end_block, end_block, root "
            "FROM %Q.'%q_segdir' WHERE level = ? ORDER BY idx ASC",
/* 13 */  "SELECT idx, start_block, leaves_end_block, end_block, root "
            "FROM %Q.'%q_segdir' WHERE level BETWEEN ? AND ?"
            "ORDER BY level DESC, idx ASC",

/* 14 */  "SELECT count(*) FROM %Q.'%q_segdir' WHERE level = ?",
/* 15 */  "SELECT max(level) FROM %Q.'%q_segdir' WHERE level BETWEEN ? AND ?",

/* 16 */  "DELETE FROM %Q.'%q_segdir' WHERE level = ?",
/* 17 */  "DELETE FROM %Q.'%q_segments' WHERE blockid BETWEEN ? AND ?",
/* 18 */  "INSERT INTO %Q.'%q_content' VALUES(%s)",
/* 19 */  "DELETE FROM %Q.'%q_docsize' WHERE docid = ?",
/* 20 */  "REPLACE INTO %Q.'%q_docsize' VALUES(?,?)",
/* 21 */  "SELECT size FROM %Q.'%q_docsize' WHERE docid=?",
/* 22 */  "SELECT value FROM %Q.'%q_stat' WHERE id=?",
/* 23 */  "REPLACE INTO %Q.'%q_stat' VALUES(?,?)",
/* 24 */  "",
/* 25 */  "",

/* 26 */ "DELETE FROM %Q.'%q_segdir' WHERE level BETWEEN ? AND ?",
/* 27 */ "SELECT ? UNION SELECT level / (1024 * ?) FROM %Q.'%q_segdir'",

/* This statement is used to determine which level to read the input from
** when performing an incremental merge. It returns the absolute level number
** of the oldest level in the db that contains at least ? segments. Or,
** if no level in the FTS index contains more than ? segments, the statement
** returns zero rows.  */
/* 28 */ "SELECT level, count(*) AS cnt FROM %Q.'%q_segdir' "
         "  GROUP BY level HAVING cnt>=?"
         "  ORDER BY (level %% 1024) ASC, 2 DESC LIMIT 1",

/* Estimate the upper limit on the number of leaf nodes in a new segment
** created by merging the oldest :2 segments from absolute level :1. See 
** function sqlite3Fts3Incrmerge() for details.  */
/* 29 */ "SELECT 2 * total(1 + leaves_end_block - start_block) "
         "  FROM (SELECT * FROM %Q.'%q_segdir' "
         "        WHERE level = ? ORDER BY idx ASC LIMIT ?"
         "  )",

/* SQL_DELETE_SEGDIR_ENTRY
**   Delete the %_segdir entry on absolute level :1 with index :2.  */
/* 30 */ "DELETE FROM %Q.'%q_segdir' WHERE level = ? AND idx = ?",

/* SQL_SHIFT_SEGDIR_ENTRY
**   Modify the idx value for the segment with idx=:3 on absolute level :2
**   to :1.  */
/* 31 */ "UPDATE %Q.'%q_segdir' SET idx = ? WHERE level=? AND idx=?",

/* SQL_SELECT_SEGDIR
**   Read a single entry from the %_segdir table. The entry from absolute 
**   level :1 with index value :2.  */
/* 32 */  "SELECT idx, start_block, leaves_end_block, end_block, root "
            "FROM %Q.'%q_segdir' WHERE level = ? AND idx = ?",

/* SQL_CHOMP_SEGDIR
**   Update the start_block (:1) and root (:2) fields of the %_segdir
**   entry located on absolute level :3 with index :4.  */
/* 33 */  "UPDATE %Q.'%q_segdir' SET start_block = ?, root = ?"
            "WHERE level = ? AND idx = ?",

/* SQL_SEGMENT_IS_APPENDABLE
**   Return a single row if the segment with end_block=? is appendable. Or
**   no rows otherwise.  */
/* 34 */  "SELECT 1 FROM %Q.'%q_segments' WHERE blockid=? AND block IS NULL",

/* SQL_SELECT_INDEXES
**   Return the list of valid segment indexes for absolute level ?  */
/* 35 */  "SELECT idx FROM %Q.'%q_segdir' WHERE level=? ORDER BY 1 ASC",

/* SQL_SELECT_MXLEVEL
**   Return the largest relative level in the FTS index or indexes.  */
/* 36 */  "SELECT max( level %% 1024 ) FROM %Q.'%q_segdir'",

          /* Return segments in order from oldest to newest.*/ 
/* 37 */  "SELECT level, idx, end_block "
            "FROM %Q.'%q_segdir' WHERE level BETWEEN ? AND ? "
            "ORDER BY level DESC, idx ASC",

          /* Update statements used while promoting segments */
/* 38 */  "UPDATE OR FAIL %Q.'%q_segdir' SET level=-1,idx=? "
            "WHERE level=? AND idx=?",
/* 39 */  "UPDATE OR FAIL %Q.'%q_segdir' SET level=? WHERE level=-1"

  };
  int rc = SQLITE_OK;
  sqlite3_stmt *pStmt;

  assert( SizeofArray(azSql)==SizeofArray(p->aStmt) );
  assert( eStmt<SizeofArray(azSql) && eStmt>=0 );
  
  pStmt = p->aStmt[eStmt];
  if( !pStmt ){
    int f = SQLITE_PREPARE_PERSISTENT|SQLITE_PREPARE_NO_VTAB;
    char *zSql;
    if( eStmt==SQL_CONTENT_INSERT ){
      zSql = sqlite3_mprintf(azSql[eStmt], p->zDb, p->zName, p->zWriteExprlist);
    }else if( eStmt==SQL_SELECT_CONTENT_BY_ROWID ){
      f &= ~SQLITE_PREPARE_NO_VTAB;
      zSql = sqlite3_mprintf(azSql[eStmt], p->zReadExprlist);
    }else{
      zSql = sqlite3_mprintf(azSql[eStmt], p->zDb, p->zName);
    }
    if( !zSql ){
      rc = SQLITE_NOMEM;
    }else{
      rc = sqlite3_prepare_v3(p->db, zSql, -1, f, &pStmt, NULL);
      sqlite3_free(zSql);
      assert( rc==SQLITE_OK || pStmt==0 );
      p->aStmt[eStmt] = pStmt;
    }
  }
  if( apVal ){
    int i;
    int nParam = sqlite3_bind_parameter_count(pStmt);
    for(i=0; rc==SQLITE_OK && i<nParam; i++){
      rc = sqlite3_bind_value(pStmt, i+1, apVal[i]);
    }
  }
  *pp = pStmt;
  return rc;
}


static int fts3SelectDocsize(
  Fts3Table *pTab,                /* FTS3 table handle */
  sqlite3_int64 iDocid,           /* Docid to bind for SQL_SELECT_DOCSIZE */
  sqlite3_stmt **ppStmt           /* OUT: Statement handle */
){
  sqlite3_stmt *pStmt = 0;        /* Statement requested from fts3SqlStmt() */
  int rc;                         /* Return code */

  rc = fts3SqlStmt(pTab, SQL_SELECT_DOCSIZE, &pStmt, 0);
  if( rc==SQLITE_OK ){
    sqlite3_bind_int64(pStmt, 1, iDocid);
    rc = sqlite3_step(pStmt);
    if( rc!=SQLITE_ROW || sqlite3_column_type(pStmt, 0)!=SQLITE_BLOB ){
      rc = sqlite3_reset(pStmt);
      if( rc==SQLITE_OK ) rc = FTS_CORRUPT_VTAB;
      pStmt = 0;
    }else{
      rc = SQLITE_OK;
    }
  }

  *ppStmt = pStmt;
  return rc;
}

int sqlite3Fts3SelectDoctotal(
  Fts3Table *pTab,                /* Fts3 table handle */
  sqlite3_stmt **ppStmt           /* OUT: Statement handle */
){
  sqlite3_stmt *pStmt = 0;
  int rc;
  rc = fts3SqlStmt(pTab, SQL_SELECT_STAT, &pStmt, 0);
  if( rc==SQLITE_OK ){
    sqlite3_bind_int(pStmt, 1, FTS_STAT_DOCTOTAL);
    if( sqlite3_step(pStmt)!=SQLITE_ROW
     || sqlite3_column_type(pStmt, 0)!=SQLITE_BLOB
    ){
      rc = sqlite3_reset(pStmt);
      if( rc==SQLITE_OK ) rc = FTS_CORRUPT_VTAB;
      pStmt = 0;
    }
  }
  *ppStmt = pStmt;
  return rc;
}

int sqlite3Fts3SelectDocsize(
  Fts3Table *pTab,                /* Fts3 table handle */
  sqlite3_int64 iDocid,           /* Docid to read size data for */
  sqlite3_stmt **ppStmt           /* OUT: Statement handle */
){
  return fts3SelectDocsize(pTab, iDocid, ppStmt);
}

/*
** Similar to fts3SqlStmt(). Except, after binding the parameters in
** array apVal[] to the SQL statement identified by eStmt, the statement
** is executed.
**
** Returns SQLITE_OK if the statement is successfully executed, or an
** SQLite error code otherwise.
*/
static void fts3SqlExec(
  int *pRC,                /* Result code */
  Fts3Table *p,            /* The FTS3 table */
  int eStmt,               /* Index of statement to evaluate */
  sqlite3_value **apVal    /* Parameters to bind */
){
  sqlite3_stmt *pStmt;
  int rc;
  if( *pRC ) return;
  rc = fts3SqlStmt(p, eStmt, &pStmt, apVal); 
  if( rc==SQLITE_OK ){
    sqlite3_step(pStmt);
    rc = sqlite3_reset(pStmt);
  }
  *pRC = rc;
}


/*
** This function ensures that the caller has obtained an exclusive 
** shared-cache table-lock on the %_segdir table. This is required before 
** writing data to the fts3 table. If this lock is not acquired first, then
** the caller may end up attempting to take this lock as part of committing
** a transaction, causing SQLite to return SQLITE_LOCKED or 
** LOCKED_SHAREDCACHEto a COMMIT command.
**
** It is best to avoid this because if FTS3 returns any error when 
** committing a transaction, the whole transaction will be rolled back. 
** And this is not what users expect when they get SQLITE_LOCKED_SHAREDCACHE. 
** It can still happen if the user locks the underlying tables directly 
** instead of accessing them via FTS.
*/
static int fts3Writelock(Fts3Table *p){
  int rc = SQLITE_OK;
  
  if( p->nPendingData==0 ){
    sqlite3_stmt *pStmt;
    rc = fts3SqlStmt(p, SQL_DELETE_SEGDIR_LEVEL, &pStmt, 0);
    if( rc==SQLITE_OK ){
      sqlite3_bind_null(pStmt, 1);
      sqlite3_step(pStmt);
      rc = sqlite3_reset(pStmt);
    }
  }

  return rc;
}

/*
** FTS maintains a separate indexes for each language-id (a 32-bit integer).
** Within each language id, a separate index is maintained to store the
** document terms, and each configured prefix size (configured the FTS 
** "prefix=" option). And each index consists of multiple levels ("relative
** levels").
**
** All three of these values (the language id, the specific index and the
** level within the index) are encoded in 64-bit integer values stored
** in the %_segdir table on disk. This function is used to convert three
** separate component values into the single 64-bit integer value that
** can be used to query the %_segdir table.
**
** Specifically, each language-id/index combination is allocated 1024 
** 64-bit integer level values ("absolute levels"). The main terms index
** for language-id 0 is allocate values 0-1023. The first prefix index
** (if any) for language-id 0 is allocated values 1024-2047. And so on.
** Language 1 indexes are allocated immediately following language 0.
**
** So, for a system with nPrefix prefix indexes configured, the block of
** absolute levels that corresponds to language-id iLangid and index 
** iIndex starts at absolute level ((iLangid * (nPrefix+1) + iIndex) * 1024).
*/
static sqlite3_int64 getAbsoluteLevel(
  Fts3Table *p,                   /* FTS3 table handle */
  int iLangid,                    /* Language id */
  int iIndex,                     /* Index in p->aIndex[] */
  int iLevel                      /* Level of segments */
){
  sqlite3_int64 iBase;            /* First absolute level for iLangid/iIndex */
  assert_fts3_nc( iLangid>=0 );
  assert( p->nIndex>0 );
  assert( iIndex>=0 && iIndex<p->nIndex );

  iBase = ((sqlite3_int64)iLangid * p->nIndex + iIndex) * FTS3_SEGDIR_MAXLEVEL;
  return iBase + iLevel;
}

/*
** Set *ppStmt to a statement handle that may be used to iterate through
** all rows in the %_segdir table, from oldest to newest. If successful,
** return SQLITE_OK. If an error occurs while preparing the statement, 
** return an SQLite error code.
**
** There is only ever one instance of this SQL statement compiled for
** each FTS3 table.
**
** The statement returns the following columns from the %_segdir table:
**
**   0: idx
**   1: start_block
**   2: leaves_end_block
**   3: end_block
**   4: root
*/
int sqlite3Fts3AllSegdirs(
  Fts3Table *p,                   /* FTS3 table */
  int iLangid,                    /* Language being queried */
  int iIndex,                     /* Index for p->aIndex[] */
  int iLevel,                     /* Level to select (relative level) */
  sqlite3_stmt **ppStmt           /* OUT: Compiled statement */
){
  int rc;
  sqlite3_stmt *pStmt = 0;

  assert( iLevel==FTS3_SEGCURSOR_ALL || iLevel>=0 );
  assert( iLevel<FTS3_SEGDIR_MAXLEVEL );
  assert( iIndex>=0 && iIndex<p->nIndex );

  if( iLevel<0 ){
    /* "SELECT * FROM %_segdir WHERE level BETWEEN ? AND ? ORDER BY ..." */
    rc = fts3SqlStmt(p, SQL_SELECT_LEVEL_RANGE, &pStmt, 0);
    if( rc==SQLITE_OK ){ 
      sqlite3_bind_int64(pStmt, 1, getAbsoluteLevel(p, iLangid, iIndex, 0));
      sqlite3_bind_int64(pStmt, 2, 
          getAbsoluteLevel(p, iLangid, iIndex, FTS3_SEGDIR_MAXLEVEL-1)
      );
    }
  }else{
    /* "SELECT * FROM %_segdir WHERE level = ? ORDER BY ..." */
    rc = fts3SqlStmt(p, SQL_SELECT_LEVEL, &pStmt, 0);
    if( rc==SQLITE_OK ){ 
      sqlite3_bind_int64(pStmt, 1, getAbsoluteLevel(p, iLangid, iIndex,iLevel));
    }
  }
  *ppStmt = pStmt;
  return rc;
}


/*
** Append a single varint to a PendingList buffer. SQLITE_OK is returned
** if successful, or an SQLite error code otherwise.
**
** This function also serves to allocate the PendingList structure itself.
** For example, to create a new PendingList structure containing two
** varints:
**
**   PendingList *p = 0;
**   fts3PendingListAppendVarint(&p, 1);
**   fts3PendingListAppendVarint(&p, 2);
*/
static int fts3PendingListAppendVarint(
  PendingList **pp,               /* IN/OUT: Pointer to PendingList struct */
  sqlite3_int64 i                 /* Value to append to data */
){
  PendingList *p = *pp;

  /* Allocate or grow the PendingList as required. */
  if( !p ){
    p = sqlite3_malloc(sizeof(*p) + 100);
    if( !p ){
      return SQLITE_NOMEM;
    }
    p->nSpace = 100;
    p->aData = (char *)&p[1];
    p->nData = 0;
  }
  else if( p->nData+FTS3_VARINT_MAX+1>p->nSpace ){
    int nNew = p->nSpace * 2;
    p = sqlite3_realloc(p, sizeof(*p) + nNew);
    if( !p ){
      sqlite3_free(*pp);
      *pp = 0;
      return SQLITE_NOMEM;
    }
    p->nSpace = nNew;
    p->aData = (char *)&p[1];
  }

  /* Append the new serialized varint to the end of the list. */
  p->nData += sqlite3Fts3PutVarint(&p->aData[p->nData], i);
  p->aData[p->nData] = '\0';
  *pp = p;
  return SQLITE_OK;
}

/*
** Add a docid/column/position entry to a PendingList structure. Non-zero
** is returned if the structure is sqlite3_realloced as part of adding
** the entry. Otherwise, zero.
**
** If an OOM error occurs, *pRc is set to SQLITE_NOMEM before returning.
** Zero is always returned in this case. Otherwise, if no OOM error occurs,
** it is set to SQLITE_OK.
*/
static int fts3PendingListAppend(
  PendingList **pp,               /* IN/OUT: PendingList structure */
  sqlite3_int64 iDocid,           /* Docid for entry to add */
  sqlite3_int64 iCol,             /* Column for entry to add */
  sqlite3_int64 iPos,             /* Position of term for entry to add */
  int *pRc                        /* OUT: Return code */
){
  PendingList *p = *pp;
  int rc = SQLITE_OK;

  assert( !p || p->iLastDocid<=iDocid );

  if( !p || p->iLastDocid!=iDocid ){
    u64 iDelta = (u64)iDocid - (u64)(p ? p->iLastDocid : 0);
    if( p ){
      assert( p->nData<p->nSpace );
      assert( p->aData[p->nData]==0 );
      p->nData++;
    }
    if( SQLITE_OK!=(rc = fts3PendingListAppendVarint(&p, iDelta)) ){
      goto pendinglistappend_out;
    }
    p->iLastCol = -1;
    p->iLastPos = 0;
    p->iLastDocid = iDocid;
  }
  if( iCol>0 && p->iLastCol!=iCol ){
    if( SQLITE_OK!=(rc = fts3PendingListAppendVarint(&p, 1))
     || SQLITE_OK!=(rc = fts3PendingListAppendVarint(&p, iCol))
    ){
      goto pendinglistappend_out;
    }
    p->iLastCol = iCol;
    p->iLastPos = 0;
  }
  if( iCol>=0 ){
    assert( iPos>p->iLastPos || (iPos==0 && p->iLastPos==0) );
    rc = fts3PendingListAppendVarint(&p, 2+iPos-p->iLastPos);
    if( rc==SQLITE_OK ){
      p->iLastPos = iPos;
    }
  }

 pendinglistappend_out:
  *pRc = rc;
  if( p!=*pp ){
    *pp = p;
    return 1;
  }
  return 0;
}

/*
** Free a PendingList object allocated by fts3PendingListAppend().
*/
static void fts3PendingListDelete(PendingList *pList){
  sqlite3_free(pList);
}

/*
** Add an entry to one of the pending-terms hash tables.
*/
static int fts3PendingTermsAddOne(
  Fts3Table *p,
  int iCol,
  int iPos,
  Fts3Hash *pHash,                /* Pending terms hash table to add entry to */
  const char *zToken,
  int nToken
){
  PendingList *pList;
  int rc = SQLITE_OK;

  pList = (PendingList *)fts3HashFind(pHash, zToken, nToken);
  if( pList ){
    p->nPendingData -= (pList->nData + nToken + sizeof(Fts3HashElem));
  }
  if( fts3PendingListAppend(&pList, p->iPrevDocid, iCol, iPos, &rc) ){
    if( pList==fts3HashInsert(pHash, zToken, nToken, pList) ){
      /* Malloc failed while inserting the new entry. This can only 
      ** happen if there was no previous entry for this token.
      */
      assert( 0==fts3HashFind(pHash, zToken, nToken) );
      sqlite3_free(pList);
      rc = SQLITE_NOMEM;
    }
  }
  if( rc==SQLITE_OK ){
    p->nPendingData += (pList->nData + nToken + sizeof(Fts3HashElem));
  }
  return rc;
}

/*
** Tokenize the nul-terminated string zText and add all tokens to the
** pending-terms hash-table. The docid used is that currently stored in
** p->iPrevDocid, and the column is specified by argument iCol.
**
** If successful, SQLITE_OK is returned. Otherwise, an SQLite error code.
*/
static int fts3PendingTermsAdd(
  Fts3Table *p,                   /* Table into which text will be inserted */
  int iLangid,                    /* Language id to use */
  const char *zText,              /* Text of document to be inserted */
  int iCol,                       /* Column into which text is being inserted */
  u32 *pnWord                     /* IN/OUT: Incr. by number tokens inserted */
){
  int rc;
  int iStart = 0;
  int iEnd = 0;
  int iPos = 0;
  int nWord = 0;

  char const *zToken;
  int nToken = 0;

  sqlite3_tokenizer *pTokenizer = p->pTokenizer;
  sqlite3_tokenizer_module const *pModule = pTokenizer->pModule;
  sqlite3_tokenizer_cursor *pCsr;
  int (*xNext)(sqlite3_tokenizer_cursor *pCursor,
      const char**,int*,int*,int*,int*);

  assert( pTokenizer && pModule );

  /* If the user has inserted a NULL value, this function may be called with
  ** zText==0. In this case, add zero token entries to the hash table and 
  ** return early. */
  if( zText==0 ){
    *pnWord = 0;
    return SQLITE_OK;
  }

  rc = sqlite3Fts3OpenTokenizer(pTokenizer, iLangid, zText, -1, &pCsr);
  if( rc!=SQLITE_OK ){
    return rc;
  }

  xNext = pModule->xNext;
  while( SQLITE_OK==rc
      && SQLITE_OK==(rc = xNext(pCsr, &zToken, &nToken, &iStart, &iEnd, &iPos))
  ){
    int i;
    if( iPos>=nWord ) nWord = iPos+1;

    /* Positions cannot be negative; we use -1 as a terminator internally.
    ** Tokens must have a non-zero length.
    */
    if( iPos<0 || !zToken || nToken<=0 ){
      rc = SQLITE_ERROR;
      break;
    }

    /* Add the term to the terms index */
    rc = fts3PendingTermsAddOne(
        p, iCol, iPos, &p->aIndex[0].hPending, zToken, nToken
    );
    
    /* Add the term to each of the prefix indexes that it is not too 
    ** short for. */
    for(i=1; rc==SQLITE_OK && i<p->nIndex; i++){
      struct Fts3Index *pIndex = &p->aIndex[i];
      if( nToken<pIndex->nPrefix ) continue;
      rc = fts3PendingTermsAddOne(
          p, iCol, iPos, &pIndex->hPending, zToken, pIndex->nPrefix
      );
    }
  }

  pModule->xClose(pCsr);
  *pnWord += nWord;
  return (rc==SQLITE_DONE ? SQLITE_OK : rc);
}

/* 
** Calling this function indicates that subsequent calls to 
** fts3PendingTermsAdd() are to add term/position-list pairs for the
** contents of the document with docid iDocid.
*/
static int fts3PendingTermsDocid(
  Fts3Table *p,                   /* Full-text table handle */
  int bDelete,                    /* True if this op is a delete */
  int iLangid,                    /* Language id of row being written */
  sqlite_int64 iDocid             /* Docid of row being written */
){
  assert( iLangid>=0 );
  assert( bDelete==1 || bDelete==0 );

  /* TODO(shess) Explore whether partially flushing the buffer on
  ** forced-flush would provide better performance.  I suspect that if
  ** we ordered the doclists by size and flushed the largest until the
  ** buffer was half empty, that would let the less frequent terms
  ** generate longer doclists.
  */
  if( iDocid<p->iPrevDocid 
   || (iDocid==p->iPrevDocid && p->bPrevDelete==0)
   || p->iPrevLangid!=iLangid
   || p->nPendingData>p->nMaxPendingData 
  ){
    int rc = sqlite3Fts3PendingTermsFlush(p);
    if( rc!=SQLITE_OK ) return rc;
  }
  p->iPrevDocid = iDocid;
  p->iPrevLangid = iLangid;
  p->bPrevDelete = bDelete;
  return SQLITE_OK;
}

/*
** Discard the contents of the pending-terms hash tables. 
*/
void sqlite3Fts3PendingTermsClear(Fts3Table *p){
  int i;
  for(i=0; i<p->nIndex; i++){
    Fts3HashElem *pElem;
    Fts3Hash *pHash = &p->aIndex[i].hPending;
    for(pElem=fts3HashFirst(pHash); pElem; pElem=fts3HashNext(pElem)){
      PendingList *pList = (PendingList *)fts3HashData(pElem);
      fts3PendingListDelete(pList);
    }
    fts3HashClear(pHash);
  }
  p->nPendingData = 0;
}

/*
** This function is called by the xUpdate() method as part of an INSERT
** operation. It adds entries for each term in the new record to the
** pendingTerms hash table.
**
** Argument apVal is the same as the similarly named argument passed to
** fts3InsertData(). Parameter iDocid is the docid of the new row.
*/
static int fts3InsertTerms(
  Fts3Table *p, 
  int iLangid, 
  sqlite3_value **apVal, 
  u32 *aSz
){
  int i;                          /* Iterator variable */
  for(i=2; i<p->nColumn+2; i++){
    int iCol = i-2;
    if( p->abNotindexed[iCol]==0 ){
      const char *zText = (const char *)sqlite3_value_text(apVal[i]);
      int rc = fts3PendingTermsAdd(p, iLangid, zText, iCol, &aSz[iCol]);
      if( rc!=SQLITE_OK ){
        return rc;
      }
      aSz[p->nColumn] += sqlite3_value_bytes(apVal[i]);
    }
  }
  return SQLITE_OK;
}

/*
** This function is called by the xUpdate() method for an INSERT operation.
** The apVal parameter is passed a copy of the apVal argument passed by
** SQLite to the xUpdate() method. i.e:
**
**   apVal[0]                Not used for INSERT.
**   apVal[1]                rowid
**   apVal[2]                Left-most user-defined column
**   ...
**   apVal[p->nColumn+1]     Right-most user-defined column
**   apVal[p->nColumn+2]     Hidden column with same name as table
**   apVal[p->nColumn+3]     Hidden "docid" column (alias for rowid)
**   apVal[p->nColumn+4]     Hidden languageid column
*/
static int fts3InsertData(
  Fts3Table *p,                   /* Full-text table */
  sqlite3_value **apVal,          /* Array of values to insert */
  sqlite3_int64 *piDocid          /* OUT: Docid for row just inserted */
){
  int rc;                         /* Return code */
  sqlite3_stmt *pContentInsert;   /* INSERT INTO %_content VALUES(...) */

  if( p->zContentTbl ){
    sqlite3_value *pRowid = apVal[p->nColumn+3];
    if( sqlite3_value_type(pRowid)==SQLITE_NULL ){
      pRowid = apVal[1];
    }
    if( sqlite3_value_type(pRowid)!=SQLITE_INTEGER ){
      return SQLITE_CONSTRAINT;
    }
    *piDocid = sqlite3_value_int64(pRowid);
    return SQLITE_OK;
  }

  /* Locate the statement handle used to insert data into the %_content
  ** table. The SQL for this statement is:
  **
  **   INSERT INTO %_content VALUES(?, ?, ?, ...)
  **
  ** The statement features N '?' variables, where N is the number of user
  ** defined columns in the FTS3 table, plus one for the docid field.
  */
  rc = fts3SqlStmt(p, SQL_CONTENT_INSERT, &pContentInsert, &apVal[1]);
  if( rc==SQLITE_OK && p->zLanguageid ){
    rc = sqlite3_bind_int(
        pContentInsert, p->nColumn+2, 
        sqlite3_value_int(apVal[p->nColumn+4])
    );
  }
  if( rc!=SQLITE_OK ) return rc;

  /* There is a quirk here. The users INSERT statement may have specified
  ** a value for the "rowid" field, for the "docid" field, or for both.
  ** Which is a problem, since "rowid" and "docid" are aliases for the
  ** same value. For example:
  **
  **   INSERT INTO fts3tbl(rowid, docid) VALUES(1, 2);
  **
  ** In FTS3, this is an error. It is an error to specify non-NULL values
  ** for both docid and some other rowid alias.
  */
  if( SQLITE_NULL!=sqlite3_value_type(apVal[3+p->nColumn]) ){
    if( SQLITE_NULL==sqlite3_value_type(apVal[0])
     && SQLITE_NULL!=sqlite3_value_type(apVal[1])
    ){
      /* A rowid/docid conflict. */
      return SQLITE_ERROR;
    }
    rc = sqlite3_bind_value(pContentInsert, 1, apVal[3+p->nColumn]);
    if( rc!=SQLITE_OK ) return rc;
  }

  /* Execute the statement to insert the record. Set *piDocid to the 
  ** new docid value. 
  */
  sqlite3_step(pContentInsert);
  rc = sqlite3_reset(pContentInsert);

  *piDocid = sqlite3_last_insert_rowid(p->db);
  return rc;
}



/*
** Remove all data from the FTS3 table. Clear the hash table containing
** pending terms.
*/
static int fts3DeleteAll(Fts3Table *p, int bContent){
  int rc = SQLITE_OK;             /* Return code */

  /* Discard the contents of the pending-terms hash table. */
  sqlite3Fts3PendingTermsClear(p);

  /* Delete everything from the shadow tables. Except, leave %_content as
  ** is if bContent is false.  */
  assert( p->zContentTbl==0 || bContent==0 );
  if( bContent ) fts3SqlExec(&rc, p, SQL_DELETE_ALL_CONTENT, 0);
  fts3SqlExec(&rc, p, SQL_DELETE_ALL_SEGMENTS, 0);
  fts3SqlExec(&rc, p, SQL_DELETE_ALL_SEGDIR, 0);
  if( p->bHasDocsize ){
    fts3SqlExec(&rc, p, SQL_DELETE_ALL_DOCSIZE, 0);
  }
  if( p->bHasStat ){
    fts3SqlExec(&rc, p, SQL_DELETE_ALL_STAT, 0);
  }
  return rc;
}

/*
**
*/
static int langidFromSelect(Fts3Table *p, sqlite3_stmt *pSelect){
  int iLangid = 0;
  if( p->zLanguageid ) iLangid = sqlite3_column_int(pSelect, p->nColumn+1);
  return iLangid;
}

/*
** The first element in the apVal[] array is assumed to contain the docid
** (an integer) of a row about to be deleted. Remove all terms from the
** full-text index.
*/
static void fts3DeleteTerms( 
  int *pRC,               /* Result code */
  Fts3Table *p,           /* The FTS table to delete from */
  sqlite3_value *pRowid,  /* The docid to be deleted */
  u32 *aSz,               /* Sizes of deleted document written here */
  int *pbFound            /* OUT: Set to true if row really does exist */
){
  int rc;
  sqlite3_stmt *pSelect;

  assert( *pbFound==0 );
  if( *pRC ) return;
  rc = fts3SqlStmt(p, SQL_SELECT_CONTENT_BY_ROWID, &pSelect, &pRowid);
  if( rc==SQLITE_OK ){
    if( SQLITE_ROW==sqlite3_step(pSelect) ){
      int i;
      int iLangid = langidFromSelect(p, pSelect);
      i64 iDocid = sqlite3_column_int64(pSelect, 0);
      rc = fts3PendingTermsDocid(p, 1, iLangid, iDocid);
      for(i=1; rc==SQLITE_OK && i<=p->nColumn; i++){
        int iCol = i-1;
        if( p->abNotindexed[iCol]==0 ){
          const char *zText = (const char *)sqlite3_column_text(pSelect, i);
          rc = fts3PendingTermsAdd(p, iLangid, zText, -1, &aSz[iCol]);
          aSz[p->nColumn] += sqlite3_column_bytes(pSelect, i);
        }
      }
      if( rc!=SQLITE_OK ){
        sqlite3_reset(pSelect);
        *pRC = rc;
        return;
      }
      *pbFound = 1;
    }
    rc = sqlite3_reset(pSelect);
  }else{
    sqlite3_reset(pSelect);
  }
  *pRC = rc;
}

/*
** Forward declaration to account for the circular dependency between
** functions fts3SegmentMerge() and fts3AllocateSegdirIdx().
*/
static int fts3SegmentMerge(Fts3Table *, int, int, int);

/* 
** This function allocates a new level iLevel index in the segdir table.
** Usually, indexes are allocated within a level sequentially starting
** with 0, so the allocated index is one greater than the value returned
** by:
**
**   SELECT max(idx) FROM %_segdir WHERE level = :iLevel
**
** However, if there are already FTS3_MERGE_COUNT indexes at the requested
** level, they are merged into a single level (iLevel+1) segment and the 
** allocated index is 0.
**
** If successful, *piIdx is set to the allocated index slot and SQLITE_OK
** returned. Otherwise, an SQLite error code is returned.
*/
static int fts3AllocateSegdirIdx(
  Fts3Table *p, 
  int iLangid,                    /* Language id */
  int iIndex,                     /* Index for p->aIndex */
  int iLevel, 
  int *piIdx
){
  int rc;                         /* Return Code */
  sqlite3_stmt *pNextIdx;         /* Query for next idx at level iLevel */
  int iNext = 0;                  /* Result of query pNextIdx */

  assert( iLangid>=0 );
  assert( p->nIndex>=1 );

  /* Set variable iNext to the next available segdir index at level iLevel. */
  rc = fts3SqlStmt(p, SQL_NEXT_SEGMENT_INDEX, &pNextIdx, 0);
  if( rc==SQLITE_OK ){
    sqlite3_bind_int64(
        pNextIdx, 1, getAbsoluteLevel(p, iLangid, iIndex, iLevel)
    );
    if( SQLITE_ROW==sqlite3_step(pNextIdx) ){
      iNext = sqlite3_column_int(pNextIdx, 0);
    }
    rc = sqlite3_reset(pNextIdx);
  }

  if( rc==SQLITE_OK ){
    /* If iNext is FTS3_MERGE_COUNT, indicating that level iLevel is already
    ** full, merge all segments in level iLevel into a single iLevel+1
    ** segment and allocate (newly freed) index 0 at level iLevel. Otherwise,
    ** if iNext is less than FTS3_MERGE_COUNT, allocate index iNext.
    */
    if( iNext>=MergeCount(p) ){
      fts3LogMerge(16, getAbsoluteLevel(p, iLangid, iIndex, iLevel));
      rc = fts3SegmentMerge(p, iLangid, iIndex, iLevel);
      *piIdx = 0;
    }else{
      *piIdx = iNext;
    }
  }

  return rc;
}

/*
** The %_segments table is declared as follows:
**
**   CREATE TABLE %_segments(blockid INTEGER PRIMARY KEY, block BLOB)
**
** This function reads data from a single row of the %_segments table. The
** specific row is identified by the iBlockid parameter. If paBlob is not
** NULL, then a buffer is allocated using sqlite3_malloc() and populated
** with the contents of the blob stored in the "block" column of the 
** identified table row is. Whether or not paBlob is NULL, *pnBlob is set
** to the size of the blob in bytes before returning.
**
** If an error occurs, or the table does not contain the specified row,
** an SQLite error code is returned. Otherwise, SQLITE_OK is returned. If
** paBlob is non-NULL, then it is the responsibility of the caller to
** eventually free the returned buffer.
**
** This function may leave an open sqlite3_blob* handle in the
** Fts3Table.pSegments variable. This handle is reused by subsequent calls
** to this function. The handle may be closed by calling the
** sqlite3Fts3SegmentsClose() function. Reusing a blob handle is a handy
** performance improvement, but the blob handle should always be closed
** before control is returned to the user (to prevent a lock being held
** on the database file for longer than necessary). Thus, any virtual table
** method (xFilter etc.) that may directly or indirectly call this function
** must call sqlite3Fts3SegmentsClose() before returning.
*/
int sqlite3Fts3ReadBlock(
  Fts3Table *p,                   /* FTS3 table handle */
  sqlite3_int64 iBlockid,         /* Access the row with blockid=$iBlockid */
  char **paBlob,                  /* OUT: Blob data in malloc'd buffer */
  int *pnBlob,                    /* OUT: Size of blob data */
  int *pnLoad                     /* OUT: Bytes actually loaded */
){
  int rc;                         /* Return code */

  /* pnBlob must be non-NULL. paBlob may be NULL or non-NULL. */
  assert( pnBlob );

  if( p->pSegments ){
    rc = sqlite3_blob_reopen(p->pSegments, iBlockid);
  }else{
    if( 0==p->zSegmentsTbl ){
      p->zSegmentsTbl = sqlite3_mprintf("%s_segments", p->zName);
      if( 0==p->zSegmentsTbl ) return SQLITE_NOMEM;
    }
    rc = sqlite3_blob_open(
       p->db, p->zDb, p->zSegmentsTbl, "block", iBlockid, 0, &p->pSegments
    );
  }

  if( rc==SQLITE_OK ){
    int nByte = sqlite3_blob_bytes(p->pSegments);
    *pnBlob = nByte;
    if( paBlob ){
      char *aByte = sqlite3_malloc(nByte + FTS3_NODE_PADDING);
      if( !aByte ){
        rc = SQLITE_NOMEM;
      }else{
        if( pnLoad && nByte>(FTS3_NODE_CHUNK_THRESHOLD) ){
          nByte = FTS3_NODE_CHUNKSIZE;
          *pnLoad = nByte;
        }
        rc = sqlite3_blob_read(p->pSegments, aByte, nByte, 0);
        memset(&aByte[nByte], 0, FTS3_NODE_PADDING);
        if( rc!=SQLITE_OK ){
          sqlite3_free(aByte);
          aByte = 0;
        }
      }
      *paBlob = aByte;
    }
  }else if( rc==SQLITE_ERROR ){
    rc = FTS_CORRUPT_VTAB;
  }

  return rc;
}

/*
** Close the blob handle at p->pSegments, if it is open. See comments above
** the sqlite3Fts3ReadBlock() function for details.
*/
void sqlite3Fts3SegmentsClose(Fts3Table *p){
  sqlite3_blob_close(p->pSegments);
  p->pSegments = 0;
}
    
static int fts3SegReaderIncrRead(Fts3SegReader *pReader){
  int nRead;                      /* Number of bytes to read */
  int rc;                         /* Return code */

  nRead = MIN(pReader->nNode - pReader->nPopulate, FTS3_NODE_CHUNKSIZE);
  rc = sqlite3_blob_read(
      pReader->pBlob, 
      &pReader->aNode[pReader->nPopulate],
      nRead,
      pReader->nPopulate
  );

  if( rc==SQLITE_OK ){
    pReader->nPopulate += nRead;
    memset(&pReader->aNode[pReader->nPopulate], 0, FTS3_NODE_PADDING);
    if( pReader->nPopulate==pReader->nNode ){
      sqlite3_blob_close(pReader->pBlob);
      pReader->pBlob = 0;
      pReader->nPopulate = 0;
    }
  }
  return rc;
}

static int fts3SegReaderRequire(Fts3SegReader *pReader, char *pFrom, int nByte){
  int rc = SQLITE_OK;
  assert( !pReader->pBlob 
       || (pFrom>=pReader->aNode && pFrom<&pReader->aNode[pReader->nNode])
  );
  while( pReader->pBlob && rc==SQLITE_OK 
     &&  (pFrom - pReader->aNode + nByte)>pReader->nPopulate
  ){
    rc = fts3SegReaderIncrRead(pReader);
  }
  return rc;
}

/*
** Set an Fts3SegReader cursor to point at EOF.
*/
static void fts3SegReaderSetEof(Fts3SegReader *pSeg){
  if( !fts3SegReaderIsRootOnly(pSeg) ){
    sqlite3_free(pSeg->aNode);
    sqlite3_blob_close(pSeg->pBlob);
    pSeg->pBlob = 0;
  }
  pSeg->aNode = 0;
}

/*
** Move the iterator passed as the first argument to the next term in the
** segment. If successful, SQLITE_OK is returned. If there is no next term,
** SQLITE_DONE. Otherwise, an SQLite error code.
*/
static int fts3SegReaderNext(
  Fts3Table *p, 
  Fts3SegReader *pReader,
  int bIncr
){
  int rc;                         /* Return code of various sub-routines */
  char *pNext;                    /* Cursor variable */
  int nPrefix;                    /* Number of bytes in term prefix */
  int nSuffix;                    /* Number of bytes in term suffix */

  if( !pReader->aDoclist ){
    pNext = pReader->aNode;
  }else{
    pNext = &pReader->aDoclist[pReader->nDoclist];
  }

  if( !pNext || pNext>=&pReader->aNode[pReader->nNode] ){

    if( fts3SegReaderIsPending(pReader) ){
      Fts3HashElem *pElem = *(pReader->ppNextElem);
      sqlite3_free(pReader->aNode);
      pReader->aNode = 0;
      if( pElem ){
        char *aCopy;
        PendingList *pList = (PendingList *)fts3HashData(pElem);
        int nCopy = pList->nData+1;
        pReader->zTerm = (char *)fts3HashKey(pElem);
        pReader->nTerm = fts3HashKeysize(pElem);
        aCopy = (char*)sqlite3_malloc(nCopy);
        if( !aCopy ) return SQLITE_NOMEM;
        memcpy(aCopy, pList->aData, nCopy);
        pReader->nNode = pReader->nDoclist = nCopy;
        pReader->aNode = pReader->aDoclist = aCopy;
        pReader->ppNextElem++;
        assert( pReader->aNode );
      }
      return SQLITE_OK;
    }

    fts3SegReaderSetEof(pReader);

    /* If iCurrentBlock>=iLeafEndBlock, this is an EOF condition. All leaf 
    ** blocks have already been traversed.  */
#ifdef CORRUPT_DB
    assert( pReader->iCurrentBlock<=pReader->iLeafEndBlock || CORRUPT_DB );
#endif
    if( pReader->iCurrentBlock>=pReader->iLeafEndBlock ){
      return SQLITE_OK;
    }

    rc = sqlite3Fts3ReadBlock(
        p, ++pReader->iCurrentBlock, &pReader->aNode, &pReader->nNode, 
        (bIncr ? &pReader->nPopulate : 0)
    );
    if( rc!=SQLITE_OK ) return rc;
    assert( pReader->pBlob==0 );
    if( bIncr && pReader->nPopulate<pReader->nNode ){
      pReader->pBlob = p->pSegments;
      p->pSegments = 0;
    }
    pNext = pReader->aNode;
  }

  assert( !fts3SegReaderIsPending(pReader) );

  rc = fts3SegReaderRequire(pReader, pNext, FTS3_VARINT_MAX*2);
  if( rc!=SQLITE_OK ) return rc;
  
  /* Because of the FTS3_NODE_PADDING bytes of padding, the following is 
  ** safe (no risk of overread) even if the node data is corrupted. */
  pNext += fts3GetVarint32(pNext, &nPrefix);
  pNext += fts3GetVarint32(pNext, &nSuffix);
  if( nSuffix<=0 
   || (&pReader->aNode[pReader->nNode] - pNext)<nSuffix
   || nPrefix>pReader->nTerm
  ){
    return FTS_CORRUPT_VTAB;
  }

  /* Both nPrefix and nSuffix were read by fts3GetVarint32() and so are
  ** between 0 and 0x7FFFFFFF. But the sum of the two may cause integer
  ** overflow - hence the (i64) casts.  */
  if( (i64)nPrefix+nSuffix>(i64)pReader->nTermAlloc ){
    i64 nNew = ((i64)nPrefix+nSuffix)*2;
    char *zNew = sqlite3_realloc64(pReader->zTerm, nNew);
    if( !zNew ){
      return SQLITE_NOMEM;
    }
    pReader->zTerm = zNew;
    pReader->nTermAlloc = nNew;
  }

  rc = fts3SegReaderRequire(pReader, pNext, nSuffix+FTS3_VARINT_MAX);
  if( rc!=SQLITE_OK ) return rc;

  memcpy(&pReader->zTerm[nPrefix], pNext, nSuffix);
  pReader->nTerm = nPrefix+nSuffix;
  pNext += nSuffix;
  pNext += fts3GetVarint32(pNext, &pReader->nDoclist);
  pReader->aDoclist = pNext;
  pReader->pOffsetList = 0;

  /* Check that the doclist does not appear to extend past the end of the
  ** b-tree node. And that the final byte of the doclist is 0x00. If either 
  ** of these statements is untrue, then the data structure is corrupt.
  */
  if( pReader->nDoclist > pReader->nNode-(pReader->aDoclist-pReader->aNode)
   || (pReader->nPopulate==0 && pReader->aDoclist[pReader->nDoclist-1])
   || pReader->nDoclist==0
  ){
    return FTS_CORRUPT_VTAB;
  }
  return SQLITE_OK;
}

/*
** Set the SegReader to point to the first docid in the doclist associated
** with the current term.
*/
static int fts3SegReaderFirstDocid(Fts3Table *pTab, Fts3SegReader *pReader){
  int rc = SQLITE_OK;
  assert( pReader->aDoclist );
  assert( !pReader->pOffsetList );
  if( pTab->bDescIdx && fts3SegReaderIsPending(pReader) ){
    u8 bEof = 0;
    pReader->iDocid = 0;
    pReader->nOffsetList = 0;
    sqlite3Fts3DoclistPrev(0,
        pReader->aDoclist, pReader->nDoclist, &pReader->pOffsetList, 
        &pReader->iDocid, &pReader->nOffsetList, &bEof
    );
  }else{
    rc = fts3SegReaderRequire(pReader, pReader->aDoclist, FTS3_VARINT_MAX);
    if( rc==SQLITE_OK ){
      int n = sqlite3Fts3GetVarint(pReader->aDoclist, &pReader->iDocid);
      pReader->pOffsetList = &pReader->aDoclist[n];
    }
  }
  return rc;
}

/*
** Advance the SegReader to point to the next docid in the doclist
** associated with the current term.
** 
** If arguments ppOffsetList and pnOffsetList are not NULL, then 
** *ppOffsetList is set to point to the first column-offset list
** in the doclist entry (i.e. immediately past the docid varint).
** *pnOffsetList is set to the length of the set of column-offset
** lists, not including the nul-terminator byte. For example:
*/
static int fts3SegReaderNextDocid(
  Fts3Table *pTab,
  Fts3SegReader *pReader,         /* Reader to advance to next docid */
  char **ppOffsetList,            /* OUT: Pointer to current position-list */
  int *pnOffsetList               /* OUT: Length of *ppOffsetList in bytes */
){
  int rc = SQLITE_OK;
  char *p = pReader->pOffsetList;
  char c = 0;

  assert( p );

  if( pTab->bDescIdx && fts3SegReaderIsPending(pReader) ){
    /* A pending-terms seg-reader for an FTS4 table that uses order=desc.
    ** Pending-terms doclists are always built up in ascending order, so
    ** we have to iterate through them backwards here. */
    u8 bEof = 0;
    if( ppOffsetList ){
      *ppOffsetList = pReader->pOffsetList;
      *pnOffsetList = pReader->nOffsetList - 1;
    }
    sqlite3Fts3DoclistPrev(0,
        pReader->aDoclist, pReader->nDoclist, &p, &pReader->iDocid,
        &pReader->nOffsetList, &bEof
    );
    if( bEof ){
      pReader->pOffsetList = 0;
    }else{
      pReader->pOffsetList = p;
    }
  }else{
    char *pEnd = &pReader->aDoclist[pReader->nDoclist];

    /* Pointer p currently points at the first byte of an offset list. The
    ** following block advances it to point one byte past the end of
    ** the same offset list. */
    while( 1 ){
  
      /* The following line of code (and the "p++" below the while() loop) is
      ** normally all that is required to move pointer p to the desired 
      ** position. The exception is if this node is being loaded from disk
      ** incrementally and pointer "p" now points to the first byte past
      ** the populated part of pReader->aNode[].
      */
      while( *p | c ) c = *p++ & 0x80;
      assert( *p==0 );
  
      if( pReader->pBlob==0 || p<&pReader->aNode[pReader->nPopulate] ) break;
      rc = fts3SegReaderIncrRead(pReader);
      if( rc!=SQLITE_OK ) return rc;
    }
    p++;
  
    /* If required, populate the output variables with a pointer to and the
    ** size of the previous offset-list.
    */
    if( ppOffsetList ){
      *ppOffsetList = pReader->pOffsetList;
      *pnOffsetList = (int)(p - pReader->pOffsetList - 1);
    }

    /* List may have been edited in place by fts3EvalNearTrim() */
    while( p<pEnd && *p==0 ) p++;
  
    /* If there are no more entries in the doclist, set pOffsetList to
    ** NULL. Otherwise, set Fts3SegReader.iDocid to the next docid and
    ** Fts3SegReader.pOffsetList to point to the next offset list before
    ** returning.
    */
    if( p>=pEnd ){
      pReader->pOffsetList = 0;
    }else{
      rc = fts3SegReaderRequire(pReader, p, FTS3_VARINT_MAX);
      if( rc==SQLITE_OK ){
        u64 iDelta;
        pReader->pOffsetList = p + sqlite3Fts3GetVarintU(p, &iDelta);
        if( pTab->bDescIdx ){
          pReader->iDocid = (i64)((u64)pReader->iDocid - iDelta);
        }else{
          pReader->iDocid = (i64)((u64)pReader->iDocid + iDelta);
        }
      }
    }
  }

  return rc;
}


int sqlite3Fts3MsrOvfl(
  Fts3Cursor *pCsr, 
  Fts3MultiSegReader *pMsr,
  int *pnOvfl
){
  Fts3Table *p = (Fts3Table*)pCsr->base.pVtab;
  int nOvfl = 0;
  int ii;
  int rc = SQLITE_OK;
  int pgsz = p->nPgsz;

  assert( p->bFts4 );
  assert( pgsz>0 );

  for(ii=0; rc==SQLITE_OK && ii<pMsr->nSegment; ii++){
    Fts3SegReader *pReader = pMsr->apSegment[ii];
    if( !fts3SegReaderIsPending(pReader) 
     && !fts3SegReaderIsRootOnly(pReader) 
    ){
      sqlite3_int64 jj;
      for(jj=pReader->iStartBlock; jj<=pReader->iLeafEndBlock; jj++){
        int nBlob;
        rc = sqlite3Fts3ReadBlock(p, jj, 0, &nBlob, 0);
        if( rc!=SQLITE_OK ) break;
        if( (nBlob+35)>pgsz ){
          nOvfl += (nBlob + 34)/pgsz;
        }
      }
    }
  }
  *pnOvfl = nOvfl;
  return rc;
}

/*
** Free all allocations associated with the iterator passed as the 
** second argument.
*/
void sqlite3Fts3SegReaderFree(Fts3SegReader *pReader){
  if( pReader ){
    if( !fts3SegReaderIsPending(pReader) ){
      sqlite3_free(pReader->zTerm);
    }
    if( !fts3SegReaderIsRootOnly(pReader) ){
      sqlite3_free(pReader->aNode);
    }
    sqlite3_blob_close(pReader->pBlob);
  }
  sqlite3_free(pReader);
}

/*
** Allocate a new SegReader object.
*/
int sqlite3Fts3SegReaderNew(
  int iAge,                       /* Segment "age". */
  int bLookup,                    /* True for a lookup only */
  sqlite3_int64 iStartLeaf,       /* First leaf to traverse */
  sqlite3_int64 iEndLeaf,         /* Final leaf to traverse */
  sqlite3_int64 iEndBlock,        /* Final block of segment */
  const char *zRoot,              /* Buffer containing root node */
  int nRoot,                      /* Size of buffer containing root node */
  Fts3SegReader **ppReader        /* OUT: Allocated Fts3SegReader */
){
  Fts3SegReader *pReader;         /* Newly allocated SegReader object */
  int nExtra = 0;                 /* Bytes to allocate segment root node */

  assert( zRoot!=0 || nRoot==0 );
#ifdef CORRUPT_DB
  assert( zRoot!=0 || CORRUPT_DB );
#endif

  if( iStartLeaf==0 ){
    if( iEndLeaf!=0 ) return FTS_CORRUPT_VTAB;
    nExtra = nRoot + FTS3_NODE_PADDING;
  }

  pReader = (Fts3SegReader *)sqlite3_malloc(sizeof(Fts3SegReader) + nExtra);
  if( !pReader ){
    return SQLITE_NOMEM;
  }
  memset(pReader, 0, sizeof(Fts3SegReader));
  pReader->iIdx = iAge;
  pReader->bLookup = bLookup!=0;
  pReader->iStartBlock = iStartLeaf;
  pReader->iLeafEndBlock = iEndLeaf;
  pReader->iEndBlock = iEndBlock;

  if( nExtra ){
    /* The entire segment is stored in the root node. */
    pReader->aNode = (char *)&pReader[1];
    pReader->rootOnly = 1;
    pReader->nNode = nRoot;
    if( nRoot ) memcpy(pReader->aNode, zRoot, nRoot);
    memset(&pReader->aNode[nRoot], 0, FTS3_NODE_PADDING);
  }else{
    pReader->iCurrentBlock = iStartLeaf-1;
  }
  *ppReader = pReader;
  return SQLITE_OK;
}

/*
** This is a comparison function used as a qsort() callback when sorting
** an array of pending terms by term. This occurs as part of flushing
** the contents of the pending-terms hash table to the database.
*/
static int SQLITE_CDECL fts3CompareElemByTerm(
  const void *lhs,
  const void *rhs
){
  char *z1 = fts3HashKey(*(Fts3HashElem **)lhs);
  char *z2 = fts3HashKey(*(Fts3HashElem **)rhs);
  int n1 = fts3HashKeysize(*(Fts3HashElem **)lhs);
  int n2 = fts3HashKeysize(*(Fts3HashElem **)rhs);

  int n = (n1<n2 ? n1 : n2);
  int c = memcmp(z1, z2, n);
  if( c==0 ){
    c = n1 - n2;
  }
  return c;
}

/*
** This function is used to allocate an Fts3SegReader that iterates through
** a subset of the terms stored in the Fts3Table.pendingTerms array.
**
** If the isPrefixIter parameter is zero, then the returned SegReader iterates
** through each term in the pending-terms table. Or, if isPrefixIter is
** non-zero, it iterates through each term and its prefixes. For example, if
** the pending terms hash table contains the terms "sqlite", "mysql" and
** "firebird", then the iterator visits the following 'terms' (in the order
** shown):
**
**   f fi fir fire fireb firebi firebir firebird
**   m my mys mysq mysql
**   s sq sql sqli sqlit sqlite
**
** Whereas if isPrefixIter is zero, the terms visited are:
**
**   firebird mysql sqlite
*/
int sqlite3Fts3SegReaderPending(
  Fts3Table *p,                   /* Virtual table handle */
  int iIndex,                     /* Index for p->aIndex */
  const char *zTerm,              /* Term to search for */
  int nTerm,                      /* Size of buffer zTerm */
  int bPrefix,                    /* True for a prefix iterator */
  Fts3SegReader **ppReader        /* OUT: SegReader for pending-terms */
){
  Fts3SegReader *pReader = 0;     /* Fts3SegReader object to return */
  Fts3HashElem *pE;               /* Iterator variable */
  Fts3HashElem **aElem = 0;       /* Array of term hash entries to scan */
  int nElem = 0;                  /* Size of array at aElem */
  int rc = SQLITE_OK;             /* Return Code */
  Fts3Hash *pHash;

  pHash = &p->aIndex[iIndex].hPending;
  if( bPrefix ){
    int nAlloc = 0;               /* Size of allocated array at aElem */

    for(pE=fts3HashFirst(pHash); pE; pE=fts3HashNext(pE)){
      char *zKey = (char *)fts3HashKey(pE);
      int nKey = fts3HashKeysize(pE);
      if( nTerm==0 || (nKey>=nTerm && 0==memcmp(zKey, zTerm, nTerm)) ){
        if( nElem==nAlloc ){
          Fts3HashElem **aElem2;
          nAlloc += 16;
          aElem2 = (Fts3HashElem **)sqlite3_realloc(
              aElem, nAlloc*sizeof(Fts3HashElem *)
          );
          if( !aElem2 ){
            rc = SQLITE_NOMEM;
            nElem = 0;
            break;
          }
          aElem = aElem2;
        }

        aElem[nElem++] = pE;
      }
    }

    /* If more than one term matches the prefix, sort the Fts3HashElem
    ** objects in term order using qsort(). This uses the same comparison
    ** callback as is used when flushing terms to disk.
    */
    if( nElem>1 ){
      qsort(aElem, nElem, sizeof(Fts3HashElem *), fts3CompareElemByTerm);
    }

  }else{
    /* The query is a simple term lookup that matches at most one term in
    ** the index. All that is required is a straight hash-lookup. 
    **
    ** Because the stack address of pE may be accessed via the aElem pointer
    ** below, the "Fts3HashElem *pE" must be declared so that it is valid
    ** within this entire function, not just this "else{...}" block.
    */
    pE = fts3HashFindElem(pHash, zTerm, nTerm);
    if( pE ){
      aElem = &pE;
      nElem = 1;
    }
  }

  if( nElem>0 ){
    sqlite3_int64 nByte;
    nByte = sizeof(Fts3SegReader) + (nElem+1)*sizeof(Fts3HashElem *);
    pReader = (Fts3SegReader *)sqlite3_malloc64(nByte);
    if( !pReader ){
      rc = SQLITE_NOMEM;
    }else{
      memset(pReader, 0, nByte);
      pReader->iIdx = 0x7FFFFFFF;
      pReader->ppNextElem = (Fts3HashElem **)&pReader[1];
      memcpy(pReader->ppNextElem, aElem, nElem*sizeof(Fts3HashElem *));
    }
  }

  if( bPrefix ){
    sqlite3_free(aElem);
  }
  *ppReader = pReader;
  return rc;
}

/*
** Compare the entries pointed to by two Fts3SegReader structures. 
** Comparison is as follows:
**
**   1) EOF is greater than not EOF.
**
**   2) The current terms (if any) are compared using memcmp(). If one
**      term is a prefix of another, the longer term is considered the
**      larger.
**
**   3) By segment age. An older segment is considered larger.
*/
static int fts3SegReaderCmp(Fts3SegReader *pLhs, Fts3SegReader *pRhs){
  int rc;
  if( pLhs->aNode && pRhs->aNode ){
    int rc2 = pLhs->nTerm - pRhs->nTerm;
    if( rc2<0 ){
      rc = memcmp(pLhs->zTerm, pRhs->zTerm, pLhs->nTerm);
    }else{
      rc = memcmp(pLhs->zTerm, pRhs->zTerm, pRhs->nTerm);
    }
    if( rc==0 ){
      rc = rc2;
    }
  }else{
    rc = (pLhs->aNode==0) - (pRhs->aNode==0);
  }
  if( rc==0 ){
    rc = pRhs->iIdx - pLhs->iIdx;
  }
  assert( rc!=0 );
  return rc;
}

/*
** A different comparison function for SegReader structures. In this
** version, it is assumed that each SegReader points to an entry in
** a doclist for identical terms. Comparison is made as follows:
**
**   1) EOF (end of doclist in this case) is greater than not EOF.
**
**   2) By current docid.
**
**   3) By segment age. An older segment is considered larger.
*/
static int fts3SegReaderDoclistCmp(Fts3SegReader *pLhs, Fts3SegReader *pRhs){
  int rc = (pLhs->pOffsetList==0)-(pRhs->pOffsetList==0);
  if( rc==0 ){
    if( pLhs->iDocid==pRhs->iDocid ){
      rc = pRhs->iIdx - pLhs->iIdx;
    }else{
      rc = (pLhs->iDocid > pRhs->iDocid) ? 1 : -1;
    }
  }
  assert( pLhs->aNode && pRhs->aNode );
  return rc;
}
static int fts3SegReaderDoclistCmpRev(Fts3SegReader *pLhs, Fts3SegReader *pRhs){
  int rc = (pLhs->pOffsetList==0)-(pRhs->pOffsetList==0);
  if( rc==0 ){
    if( pLhs->iDocid==pRhs->iDocid ){
      rc = pRhs->iIdx - pLhs->iIdx;
    }else{
      rc = (pLhs->iDocid < pRhs->iDocid) ? 1 : -1;
    }
  }
  assert( pLhs->aNode && pRhs->aNode );
  return rc;
}

/*
** Compare the term that the Fts3SegReader object passed as the first argument
** points to with the term specified by arguments zTerm and nTerm. 
**
** If the pSeg iterator is already at EOF, return 0. Otherwise, return
** -ve if the pSeg term is less than zTerm/nTerm, 0 if the two terms are
** equal, or +ve if the pSeg term is greater than zTerm/nTerm.
*/
static int fts3SegReaderTermCmp(
  Fts3SegReader *pSeg,            /* Segment reader object */
  const char *zTerm,              /* Term to compare to */
  int nTerm                       /* Size of term zTerm in bytes */
){
  int res = 0;
  if( pSeg->aNode ){
    if( pSeg->nTerm>nTerm ){
      res = memcmp(pSeg->zTerm, zTerm, nTerm);
    }else{
      res = memcmp(pSeg->zTerm, zTerm, pSeg->nTerm);
    }
    if( res==0 ){
      res = pSeg->nTerm-nTerm;
    }
  }
  return res;
}

/*
** Argument apSegment is an array of nSegment elements. It is known that
** the final (nSegment-nSuspect) members are already in sorted order
** (according to the comparison function provided). This function shuffles
** the array around until all entries are in sorted order.
*/
static void fts3SegReaderSort(
  Fts3SegReader **apSegment,                     /* Array to sort entries of */
  int nSegment,                                  /* Size of apSegment array */
  int nSuspect,                                  /* Unsorted entry count */
  int (*xCmp)(Fts3SegReader *, Fts3SegReader *)  /* Comparison function */
){
  int i;                          /* Iterator variable */

  assert( nSuspect<=nSegment );

  if( nSuspect==nSegment ) nSuspect--;
  for(i=nSuspect-1; i>=0; i--){
    int j;
    for(j=i; j<(nSegment-1); j++){
      Fts3SegReader *pTmp;
      if( xCmp(apSegment[j], apSegment[j+1])<0 ) break;
      pTmp = apSegment[j+1];
      apSegment[j+1] = apSegment[j];
      apSegment[j] = pTmp;
    }
  }

#ifndef NDEBUG
  /* Check that the list really is sorted now. */
  for(i=0; i<(nSuspect-1); i++){
    assert( xCmp(apSegment[i], apSegment[i+1])<0 );
  }
#endif
}

/* 
** Insert a record into the %_segments table.
*/
static int fts3WriteSegment(
  Fts3Table *p,                   /* Virtual table handle */
  sqlite3_int64 iBlock,           /* Block id for new block */
  char *z,                        /* Pointer to buffer containing block data */
  int n                           /* Size of buffer z in bytes */
){
  sqlite3_stmt *pStmt;
  int rc = fts3SqlStmt(p, SQL_INSERT_SEGMENTS, &pStmt, 0);
  if( rc==SQLITE_OK ){
    sqlite3_bind_int64(pStmt, 1, iBlock);
    sqlite3_bind_blob(pStmt, 2, z, n, SQLITE_STATIC);
    sqlite3_step(pStmt);
    rc = sqlite3_reset(pStmt);
    sqlite3_bind_null(pStmt, 2);
  }
  return rc;
}

/*
** Find the largest relative level number in the table. If successful, set
** *pnMax to this value and return SQLITE_OK. Otherwise, if an error occurs,
** set *pnMax to zero and return an SQLite error code.
*/
int sqlite3Fts3MaxLevel(Fts3Table *p, int *pnMax){
  int rc;
  int mxLevel = 0;
  sqlite3_stmt *pStmt = 0;

  rc = fts3SqlStmt(p, SQL_SELECT_MXLEVEL, &pStmt, 0);
  if( rc==SQLITE_OK ){
    if( SQLITE_ROW==sqlite3_step(pStmt) ){
      mxLevel = sqlite3_column_int(pStmt, 0);
    }
    rc = sqlite3_reset(pStmt);
  }
  *pnMax = mxLevel;
  return rc;
}

/* 
** Insert a record into the %_segdir table.
*/
static int fts3WriteSegdir(
  Fts3Table *p,                   /* Virtual table handle */
  sqlite3_int64 iLevel,           /* Value for "level" field (absolute level) */
  int iIdx,                       /* Value for "idx" field */
  sqlite3_int64 iStartBlock,      /* Value for "start_block" field */
  sqlite3_int64 iLeafEndBlock,    /* Value for "leaves_end_block" field */
  sqlite3_int64 iEndBlock,        /* Value for "end_block" field */
  sqlite3_int64 nLeafData,        /* Bytes of leaf data in segment */
  char *zRoot,                    /* Blob value for "root" field */
  int nRoot                       /* Number of bytes in buffer zRoot */
){
  sqlite3_stmt *pStmt;
  int rc = fts3SqlStmt(p, SQL_INSERT_SEGDIR, &pStmt, 0);
  if( rc==SQLITE_OK ){
    sqlite3_bind_int64(pStmt, 1, iLevel);
    sqlite3_bind_int(pStmt, 2, iIdx);
    sqlite3_bind_int64(pStmt, 3, iStartBlock);
    sqlite3_bind_int64(pStmt, 4, iLeafEndBlock);
    if( nLeafData==0 ){
      sqlite3_bind_int64(pStmt, 5, iEndBlock);
    }else{
      char *zEnd = sqlite3_mprintf("%lld %lld", iEndBlock, nLeafData);
      if( !zEnd ) return SQLITE_NOMEM;
      sqlite3_bind_text(pStmt, 5, zEnd, -1, sqlite3_free);
    }
    sqlite3_bind_blob(pStmt, 6, zRoot, nRoot, SQLITE_STATIC);
    sqlite3_step(pStmt);
    rc = sqlite3_reset(pStmt);
    sqlite3_bind_null(pStmt, 6);
  }
  return rc;
}

/*
** Return the size of the common prefix (if any) shared by zPrev and
** zNext, in bytes. For example, 
**
**   fts3PrefixCompress("abc", 3, "abcdef", 6)   // returns 3
**   fts3PrefixCompress("abX", 3, "abcdef", 6)   // returns 2
**   fts3PrefixCompress("abX", 3, "Xbcdef", 6)   // returns 0
*/
static int fts3PrefixCompress(
  const char *zPrev,              /* Buffer containing previous term */
  int nPrev,                      /* Size of buffer zPrev in bytes */
  const char *zNext,              /* Buffer containing next term */
  int nNext                       /* Size of buffer zNext in bytes */
){
  int n;
  UNUSED_PARAMETER(nNext);
  for(n=0; n<nPrev && zPrev[n]==zNext[n]; n++);
  return n;
}

/*
** Add term zTerm to the SegmentNode. It is guaranteed that zTerm is larger
** (according to memcmp) than the previous term.
*/
static int fts3NodeAddTerm(
  Fts3Table *p,                   /* Virtual table handle */
  SegmentNode **ppTree,           /* IN/OUT: SegmentNode handle */ 
  int isCopyTerm,                 /* True if zTerm/nTerm is transient */
  const char *zTerm,              /* Pointer to buffer containing term */
  int nTerm                       /* Size of term in bytes */
){
  SegmentNode *pTree = *ppTree;
  int rc;
  SegmentNode *pNew;

  /* First try to append the term to the current node. Return early if 
  ** this is possible.
  */
  if( pTree ){
    int nData = pTree->nData;     /* Current size of node in bytes */
    int nReq = nData;             /* Required space after adding zTerm */
    int nPrefix;                  /* Number of bytes of prefix compression */
    int nSuffix;                  /* Suffix length */

    nPrefix = fts3PrefixCompress(pTree->zTerm, pTree->nTerm, zTerm, nTerm);
    nSuffix = nTerm-nPrefix;

    /* If nSuffix is zero or less, then zTerm/nTerm must be a prefix of 
    ** pWriter->zTerm/pWriter->nTerm. i.e. must be equal to or less than when
    ** compared with BINARY collation. This indicates corruption.  */
    if( nSuffix<=0 ) return FTS_CORRUPT_VTAB;

    nReq += sqlite3Fts3VarintLen(nPrefix)+sqlite3Fts3VarintLen(nSuffix)+nSuffix;
    if( nReq<=p->nNodeSize || !pTree->zTerm ){

      if( nReq>p->nNodeSize ){
        /* An unusual case: this is the first term to be added to the node
        ** and the static node buffer (p->nNodeSize bytes) is not large
        ** enough. Use a separately malloced buffer instead This wastes
        ** p->nNodeSize bytes, but since this scenario only comes about when
        ** the database contain two terms that share a prefix of almost 2KB, 
        ** this is not expected to be a serious problem. 
        */
        assert( pTree->aData==(char *)&pTree[1] );
        pTree->aData = (char *)sqlite3_malloc(nReq);
        if( !pTree->aData ){
          return SQLITE_NOMEM;
        }
      }

      if( pTree->zTerm ){
        /* There is no prefix-length field for first term in a node */
        nData += sqlite3Fts3PutVarint(&pTree->aData[nData], nPrefix);
      }

      nData += sqlite3Fts3PutVarint(&pTree->aData[nData], nSuffix);
      memcpy(&pTree->aData[nData], &zTerm[nPrefix], nSuffix);
      pTree->nData = nData + nSuffix;
      pTree->nEntry++;

      if( isCopyTerm ){
        if( pTree->nMalloc<nTerm ){
          char *zNew = sqlite3_realloc(pTree->zMalloc, nTerm*2);
          if( !zNew ){
            return SQLITE_NOMEM;
          }
          pTree->nMalloc = nTerm*2;
          pTree->zMalloc = zNew;
        }
        pTree->zTerm = pTree->zMalloc;
        memcpy(pTree->zTerm, zTerm, nTerm);
        pTree->nTerm = nTerm;
      }else{
        pTree->zTerm = (char *)zTerm;
        pTree->nTerm = nTerm;
      }
      return SQLITE_OK;
    }
  }

  /* If control flows to here, it was not possible to append zTerm to the
  ** current node. Create a new node (a right-sibling of the current node).
  ** If this is the first node in the tree, the term is added to it.
  **
  ** Otherwise, the term is not added to the new node, it is left empty for
  ** now. Instead, the term is inserted into the parent of pTree. If pTree 
  ** has no parent, one is created here.
  */
  pNew = (SegmentNode *)sqlite3_malloc(sizeof(SegmentNode) + p->nNodeSize);
  if( !pNew ){
    return SQLITE_NOMEM;
  }
  memset(pNew, 0, sizeof(SegmentNode));
  pNew->nData = 1 + FTS3_VARINT_MAX;
  pNew->aData = (char *)&pNew[1];

  if( pTree ){
    SegmentNode *pParent = pTree->pParent;
    rc = fts3NodeAddTerm(p, &pParent, isCopyTerm, zTerm, nTerm);
    if( pTree->pParent==0 ){
      pTree->pParent = pParent;
    }
    pTree->pRight = pNew;
    pNew->pLeftmost = pTree->pLeftmost;
    pNew->pParent = pParent;
    pNew->zMalloc = pTree->zMalloc;
    pNew->nMalloc = pTree->nMalloc;
    pTree->zMalloc = 0;
  }else{
    pNew->pLeftmost = pNew;
    rc = fts3NodeAddTerm(p, &pNew, isCopyTerm, zTerm, nTerm); 
  }

  *ppTree = pNew;
  return rc;
}

/*
** Helper function for fts3NodeWrite().
*/
static int fts3TreeFinishNode(
  SegmentNode *pTree, 
  int iHeight, 
  sqlite3_int64 iLeftChild
){
  int nStart;
  assert( iHeight>=1 && iHeight<128 );
  nStart = FTS3_VARINT_MAX - sqlite3Fts3VarintLen(iLeftChild);
  pTree->aData[nStart] = (char)iHeight;
  sqlite3Fts3PutVarint(&pTree->aData[nStart+1], iLeftChild);
  return nStart;
}

/*
** Write the buffer for the segment node pTree and all of its peers to the
** database. Then call this function recursively to write the parent of 
** pTree and its peers to the database. 
**
** Except, if pTree is a root node, do not write it to the database. Instead,
** set output variables *paRoot and *pnRoot to contain the root node.
**
** If successful, SQLITE_OK is returned and output variable *piLast is
** set to the largest blockid written to the database (or zero if no
** blocks were written to the db). Otherwise, an SQLite error code is 
** returned.
*/
static int fts3NodeWrite(
  Fts3Table *p,                   /* Virtual table handle */
  SegmentNode *pTree,             /* SegmentNode handle */
  int iHeight,                    /* Height of this node in tree */
  sqlite3_int64 iLeaf,            /* Block id of first leaf node */
  sqlite3_int64 iFree,            /* Block id of next free slot in %_segments */
  sqlite3_int64 *piLast,          /* OUT: Block id of last entry written */
  char **paRoot,                  /* OUT: Data for root node */
  int *pnRoot                     /* OUT: Size of root node in bytes */
){
  int rc = SQLITE_OK;

  if( !pTree->pParent ){
    /* Root node of the tree. */
    int nStart = fts3TreeFinishNode(pTree, iHeight, iLeaf);
    *piLast = iFree-1;
    *pnRoot = pTree->nData - nStart;
    *paRoot = &pTree->aData[nStart];
  }else{
    SegmentNode *pIter;
    sqlite3_int64 iNextFree = iFree;
    sqlite3_int64 iNextLeaf = iLeaf;
    for(pIter=pTree->pLeftmost; pIter && rc==SQLITE_OK; pIter=pIter->pRight){
      int nStart = fts3TreeFinishNode(pIter, iHeight, iNextLeaf);
      int nWrite = pIter->nData - nStart;
  
      rc = fts3WriteSegment(p, iNextFree, &pIter->aData[nStart], nWrite);
      iNextFree++;
      iNextLeaf += (pIter->nEntry+1);
    }
    if( rc==SQLITE_OK ){
      assert( iNextLeaf==iFree );
      rc = fts3NodeWrite(
          p, pTree->pParent, iHeight+1, iFree, iNextFree, piLast, paRoot, pnRoot
      );
    }
  }

  return rc;
}

/*
** Free all memory allocations associated with the tree pTree.
*/
static void fts3NodeFree(SegmentNode *pTree){
  if( pTree ){
    SegmentNode *p = pTree->pLeftmost;
    fts3NodeFree(p->pParent);
    while( p ){
      SegmentNode *pRight = p->pRight;
      if( p->aData!=(char *)&p[1] ){
        sqlite3_free(p->aData);
      }
      assert( pRight==0 || p->zMalloc==0 );
      sqlite3_free(p->zMalloc);
      sqlite3_free(p);
      p = pRight;
    }
  }
}

/*
** Add a term to the segment being constructed by the SegmentWriter object
** *ppWriter. When adding the first term to a segment, *ppWriter should
** be passed NULL. This function will allocate a new SegmentWriter object
** and return it via the input/output variable *ppWriter in this case.
**
** If successful, SQLITE_OK is returned. Otherwise, an SQLite error code.
*/
static int fts3SegWriterAdd(
  Fts3Table *p,                   /* Virtual table handle */
  SegmentWriter **ppWriter,       /* IN/OUT: SegmentWriter handle */ 
  int isCopyTerm,                 /* True if buffer zTerm must be copied */
  const char *zTerm,              /* Pointer to buffer containing term */
  int nTerm,                      /* Size of term in bytes */
  const char *aDoclist,           /* Pointer to buffer containing doclist */
  int nDoclist                    /* Size of doclist in bytes */
){
  int nPrefix;                    /* Size of term prefix in bytes */
  int nSuffix;                    /* Size of term suffix in bytes */
  int nReq;                       /* Number of bytes required on leaf page */
  int nData;
  SegmentWriter *pWriter = *ppWriter;

  if( !pWriter ){
    int rc;
    sqlite3_stmt *pStmt;

    /* Allocate the SegmentWriter structure */
    pWriter = (SegmentWriter *)sqlite3_malloc(sizeof(SegmentWriter));
    if( !pWriter ) return SQLITE_NOMEM;
    memset(pWriter, 0, sizeof(SegmentWriter));
    *ppWriter = pWriter;

    /* Allocate a buffer in which to accumulate data */
    pWriter->aData = (char *)sqlite3_malloc(p->nNodeSize);
    if( !pWriter->aData ) return SQLITE_NOMEM;
    pWriter->nSize = p->nNodeSize;

    /* Find the next free blockid in the %_segments table */
    rc = fts3SqlStmt(p, SQL_NEXT_SEGMENTS_ID, &pStmt, 0);
    if( rc!=SQLITE_OK ) return rc;
    if( SQLITE_ROW==sqlite3_step(pStmt) ){
      pWriter->iFree = sqlite3_column_int64(pStmt, 0);
      pWriter->iFirst = pWriter->iFree;
    }
    rc = sqlite3_reset(pStmt);
    if( rc!=SQLITE_OK ) return rc;
  }
  nData = pWriter->nData;

  nPrefix = fts3PrefixCompress(pWriter->zTerm, pWriter->nTerm, zTerm, nTerm);
  nSuffix = nTerm-nPrefix;

  /* If nSuffix is zero or less, then zTerm/nTerm must be a prefix of 
  ** pWriter->zTerm/pWriter->nTerm. i.e. must be equal to or less than when
  ** compared with BINARY collation. This indicates corruption.  */
  if( nSuffix<=0 ) return FTS_CORRUPT_VTAB;

  /* Figure out how many bytes are required by this new entry */
  nReq = sqlite3Fts3VarintLen(nPrefix) +    /* varint containing prefix size */
    sqlite3Fts3VarintLen(nSuffix) +         /* varint containing suffix size */
    nSuffix +                               /* Term suffix */
    sqlite3Fts3VarintLen(nDoclist) +        /* Size of doclist */
    nDoclist;                               /* Doclist data */

  if( nData>0 && nData+nReq>p->nNodeSize ){
    int rc;

    /* The current leaf node is full. Write it out to the database. */
    if( pWriter->iFree==LARGEST_INT64 ) return FTS_CORRUPT_VTAB;
    rc = fts3WriteSegment(p, pWriter->iFree++, pWriter->aData, nData);
    if( rc!=SQLITE_OK ) return rc;
    p->nLeafAdd++;

    /* Add the current term to the interior node tree. The term added to
    ** the interior tree must:
    **
    **   a) be greater than the largest term on the leaf node just written
    **      to the database (still available in pWriter->zTerm), and
    **
    **   b) be less than or equal to the term about to be added to the new
    **      leaf node (zTerm/nTerm).
    **
    ** In other words, it must be the prefix of zTerm 1 byte longer than
    ** the common prefix (if any) of zTerm and pWriter->zTerm.
    */
    assert( nPrefix<nTerm );
    rc = fts3NodeAddTerm(p, &pWriter->pTree, isCopyTerm, zTerm, nPrefix+1);
    if( rc!=SQLITE_OK ) return rc;

    nData = 0;
    pWriter->nTerm = 0;

    nPrefix = 0;
    nSuffix = nTerm;
    nReq = 1 +                              /* varint containing prefix size */
      sqlite3Fts3VarintLen(nTerm) +         /* varint containing suffix size */
      nTerm +                               /* Term suffix */
      sqlite3Fts3VarintLen(nDoclist) +      /* Size of doclist */
      nDoclist;                             /* Doclist data */
  }

  /* Increase the total number of bytes written to account for the new entry. */
  pWriter->nLeafData += nReq;

  /* If the buffer currently allocated is too small for this entry, realloc
  ** the buffer to make it large enough.
  */
  if( nReq>pWriter->nSize ){
    char *aNew = sqlite3_realloc(pWriter->aData, nReq);
    if( !aNew ) return SQLITE_NOMEM;
    pWriter->aData = aNew;
    pWriter->nSize = nReq;
  }
  assert( nData+nReq<=pWriter->nSize );

  /* Append the prefix-compressed term and doclist to the buffer. */
  nData += sqlite3Fts3PutVarint(&pWriter->aData[nData], nPrefix);
  nData += sqlite3Fts3PutVarint(&pWriter->aData[nData], nSuffix);
  assert( nSuffix>0 );
  memcpy(&pWriter->aData[nData], &zTerm[nPrefix], nSuffix);
  nData += nSuffix;
  nData += sqlite3Fts3PutVarint(&pWriter->aData[nData], nDoclist);
  assert( nDoclist>0 );
  memcpy(&pWriter->aData[nData], aDoclist, nDoclist);
  pWriter->nData = nData + nDoclist;

  /* Save the current term so that it can be used to prefix-compress the next.
  ** If the isCopyTerm parameter is true, then the buffer pointed to by
  ** zTerm is transient, so take a copy of the term data. Otherwise, just
  ** store a copy of the pointer.
  */
  if( isCopyTerm ){
    if( nTerm>pWriter->nMalloc ){
      char *zNew = sqlite3_realloc(pWriter->zMalloc, nTerm*2);
      if( !zNew ){
        return SQLITE_NOMEM;
      }
      pWriter->nMalloc = nTerm*2;
      pWriter->zMalloc = zNew;
      pWriter->zTerm = zNew;
    }
    assert( pWriter->zTerm==pWriter->zMalloc );
    assert( nTerm>0 );
    memcpy(pWriter->zTerm, zTerm, nTerm);
  }else{
    pWriter->zTerm = (char *)zTerm;
  }
  pWriter->nTerm = nTerm;

  return SQLITE_OK;
}

/*
** Flush all data associated with the SegmentWriter object pWriter to the
** database. This function must be called after all terms have been added
** to the segment using fts3SegWriterAdd(). If successful, SQLITE_OK is
** returned. Otherwise, an SQLite error code.
*/
static int fts3SegWriterFlush(
  Fts3Table *p,                   /* Virtual table handle */
  SegmentWriter *pWriter,         /* SegmentWriter to flush to the db */
  sqlite3_int64 iLevel,           /* Value for 'level' column of %_segdir */
  int iIdx                        /* Value for 'idx' column of %_segdir */
){
  int rc;                         /* Return code */
  if( pWriter->pTree ){
    sqlite3_int64 iLast = 0;      /* Largest block id written to database */
    sqlite3_int64 iLastLeaf;      /* Largest leaf block id written to db */
    char *zRoot = NULL;           /* Pointer to buffer containing root node */
    int nRoot = 0;                /* Size of buffer zRoot */

    iLastLeaf = pWriter->iFree;
    rc = fts3WriteSegment(p, pWriter->iFree++, pWriter->aData, pWriter->nData);
    if( rc==SQLITE_OK ){
      rc = fts3NodeWrite(p, pWriter->pTree, 1,
          pWriter->iFirst, pWriter->iFree, &iLast, &zRoot, &nRoot);
    }
    if( rc==SQLITE_OK ){
      rc = fts3WriteSegdir(p, iLevel, iIdx, 
          pWriter->iFirst, iLastLeaf, iLast, pWriter->nLeafData, zRoot, nRoot);
    }
  }else{
    /* The entire tree fits on the root node. Write it to the segdir table. */
    rc = fts3WriteSegdir(p, iLevel, iIdx, 
        0, 0, 0, pWriter->nLeafData, pWriter->aData, pWriter->nData);
  }
  p->nLeafAdd++;
  return rc;
}

/*
** Release all memory held by the SegmentWriter object passed as the 
** first argument.
*/
static void fts3SegWriterFree(SegmentWriter *pWriter){
  if( pWriter ){
    sqlite3_free(pWriter->aData);
    sqlite3_free(pWriter->zMalloc);
    fts3NodeFree(pWriter->pTree);
    sqlite3_free(pWriter);
  }
}

/*
** The first value in the apVal[] array is assumed to contain an integer.
** This function tests if there exist any documents with docid values that
** are different from that integer. i.e. if deleting the document with docid
** pRowid would mean the FTS3 table were empty.
**
** If successful, *pisEmpty is set to true if the table is empty except for
** document pRowid, or false otherwise, and SQLITE_OK is returned. If an
** error occurs, an SQLite error code is returned.
*/
static int fts3IsEmpty(Fts3Table *p, sqlite3_value *pRowid, int *pisEmpty){
  sqlite3_stmt *pStmt;
  int rc;
  if( p->zContentTbl ){
    /* If using the content=xxx option, assume the table is never empty */
    *pisEmpty = 0;
    rc = SQLITE_OK;
  }else{
    rc = fts3SqlStmt(p, SQL_IS_EMPTY, &pStmt, &pRowid);
    if( rc==SQLITE_OK ){
      if( SQLITE_ROW==sqlite3_step(pStmt) ){
        *pisEmpty = sqlite3_column_int(pStmt, 0);
      }
      rc = sqlite3_reset(pStmt);
    }
  }
  return rc;
}

/*
** Set *pnMax to the largest segment level in the database for the index
** iIndex.
**
** Segment levels are stored in the 'level' column of the %_segdir table.
**
** Return SQLITE_OK if successful, or an SQLite error code if not.
*/
static int fts3SegmentMaxLevel(
  Fts3Table *p, 
  int iLangid,
  int iIndex, 
  sqlite3_int64 *pnMax
){
  sqlite3_stmt *pStmt;
  int rc;
  assert( iIndex>=0 && iIndex<p->nIndex );

  /* Set pStmt to the compiled version of:
  **
  **   SELECT max(level) FROM %Q.'%q_segdir' WHERE level BETWEEN ? AND ?
  **
  ** (1024 is actually the value of macro FTS3_SEGDIR_PREFIXLEVEL_STR).
  */
  rc = fts3SqlStmt(p, SQL_SELECT_SEGDIR_MAX_LEVEL, &pStmt, 0);
  if( rc!=SQLITE_OK ) return rc;
  sqlite3_bind_int64(pStmt, 1, getAbsoluteLevel(p, iLangid, iIndex, 0));
  sqlite3_bind_int64(pStmt, 2, 
      getAbsoluteLevel(p, iLangid, iIndex, FTS3_SEGDIR_MAXLEVEL-1)
  );
  if( SQLITE_ROW==sqlite3_step(pStmt) ){
    *pnMax = sqlite3_column_int64(pStmt, 0);
  }
  return sqlite3_reset(pStmt);
}

/*
** iAbsLevel is an absolute level that may be assumed to exist within
** the database. This function checks if it is the largest level number
** within its index. Assuming no error occurs, *pbMax is set to 1 if
** iAbsLevel is indeed the largest level, or 0 otherwise, and SQLITE_OK
** is returned. If an error occurs, an error code is returned and the
** final value of *pbMax is undefined.
*/
static int fts3SegmentIsMaxLevel(Fts3Table *p, i64 iAbsLevel, int *pbMax){

  /* Set pStmt to the compiled version of:
  **
  **   SELECT max(level) FROM %Q.'%q_segdir' WHERE level BETWEEN ? AND ?
  **
  ** (1024 is actually the value of macro FTS3_SEGDIR_PREFIXLEVEL_STR).
  */
  sqlite3_stmt *pStmt;
  int rc = fts3SqlStmt(p, SQL_SELECT_SEGDIR_MAX_LEVEL, &pStmt, 0);
  if( rc!=SQLITE_OK ) return rc;
  sqlite3_bind_int64(pStmt, 1, iAbsLevel+1);
  sqlite3_bind_int64(pStmt, 2, 
      (((u64)iAbsLevel/FTS3_SEGDIR_MAXLEVEL)+1) * FTS3_SEGDIR_MAXLEVEL
  );

  *pbMax = 0;
  if( SQLITE_ROW==sqlite3_step(pStmt) ){
    *pbMax = sqlite3_column_type(pStmt, 0)==SQLITE_NULL;
  }
  return sqlite3_reset(pStmt);
}

/*
** Delete all entries in the %_segments table associated with the segment
** opened with seg-reader pSeg. This function does not affect the contents
** of the %_segdir table.
*/
static int fts3DeleteSegment(
  Fts3Table *p,                   /* FTS table handle */
  Fts3SegReader *pSeg             /* Segment to delete */
){
  int rc = SQLITE_OK;             /* Return code */
  if( pSeg->iStartBlock ){
    sqlite3_stmt *pDelete;        /* SQL statement to delete rows */
    rc = fts3SqlStmt(p, SQL_DELETE_SEGMENTS_RANGE, &pDelete, 0);
    if( rc==SQLITE_OK ){
      sqlite3_bind_int64(pDelete, 1, pSeg->iStartBlock);
      sqlite3_bind_int64(pDelete, 2, pSeg->iEndBlock);
      sqlite3_step(pDelete);
      rc = sqlite3_reset(pDelete);
    }
  }
  return rc;
}

/*
** This function is used after merging multiple segments into a single large
** segment to delete the old, now redundant, segment b-trees. Specifically,
** it:
** 
**   1) Deletes all %_segments entries for the segments associated with 
**      each of the SegReader objects in the array passed as the third 
**      argument, and
**
**   2) deletes all %_segdir entries with level iLevel, or all %_segdir
**      entries regardless of level if (iLevel<0).
**
** SQLITE_OK is returned if successful, otherwise an SQLite error code.
*/
static int fts3DeleteSegdir(
  Fts3Table *p,                   /* Virtual table handle */
  int iLangid,                    /* Language id */
  int iIndex,                     /* Index for p->aIndex */
  int iLevel,                     /* Level of %_segdir entries to delete */
  Fts3SegReader **apSegment,      /* Array of SegReader objects */
  int nReader                     /* Size of array apSegment */
){
  int rc = SQLITE_OK;             /* Return Code */
  int i;                          /* Iterator variable */
  sqlite3_stmt *pDelete = 0;      /* SQL statement to delete rows */

  for(i=0; rc==SQLITE_OK && i<nReader; i++){
    rc = fts3DeleteSegment(p, apSegment[i]);
  }
  if( rc!=SQLITE_OK ){
    return rc;
  }

  assert( iLevel>=0 || iLevel==FTS3_SEGCURSOR_ALL );
  if( iLevel==FTS3_SEGCURSOR_ALL ){
    rc = fts3SqlStmt(p, SQL_DELETE_SEGDIR_RANGE, &pDelete, 0);
    if( rc==SQLITE_OK ){
      sqlite3_bind_int64(pDelete, 1, getAbsoluteLevel(p, iLangid, iIndex, 0));
      sqlite3_bind_int64(pDelete, 2, 
          getAbsoluteLevel(p, iLangid, iIndex, FTS3_SEGDIR_MAXLEVEL-1)
      );
    }
  }else{
    rc = fts3SqlStmt(p, SQL_DELETE_SEGDIR_LEVEL, &pDelete, 0);
    if( rc==SQLITE_OK ){
      sqlite3_bind_int64(
          pDelete, 1, getAbsoluteLevel(p, iLangid, iIndex, iLevel)
      );
    }
  }

  if( rc==SQLITE_OK ){
    sqlite3_step(pDelete);
    rc = sqlite3_reset(pDelete);
  }

  return rc;
}

/*
** When this function is called, buffer *ppList (size *pnList bytes) contains 
** a position list that may (or may not) feature multiple columns. This
** function adjusts the pointer *ppList and the length *pnList so that they
** identify the subset of the position list that corresponds to column iCol.
**
** If there are no entries in the input position list for column iCol, then
** *pnList is set to zero before returning.
**
** If parameter bZero is non-zero, then any part of the input list following
** the end of the output list is zeroed before returning.
*/
static void fts3ColumnFilter(
  int iCol,                       /* Column to filter on */
  int bZero,                      /* Zero out anything following *ppList */
  char **ppList,                  /* IN/OUT: Pointer to position list */
  int *pnList                     /* IN/OUT: Size of buffer *ppList in bytes */
){
  char *pList = *ppList;
  int nList = *pnList;
  char *pEnd = &pList[nList];
  int iCurrent = 0;
  char *p = pList;

  assert( iCol>=0 );
  while( 1 ){
    char c = 0;
    while( p<pEnd && (c | *p)&0xFE ) c = *p++ & 0x80;
  
    if( iCol==iCurrent ){
      nList = (int)(p - pList);
      break;
    }

    nList -= (int)(p - pList);
    pList = p;
    if( nList<=0 ){
      break;
    }
    p = &pList[1];
    p += fts3GetVarint32(p, &iCurrent);
  }

  if( bZero && (pEnd - &pList[nList])>0){
    memset(&pList[nList], 0, pEnd - &pList[nList]);
  }
  *ppList = pList;
  *pnList = nList;
}

/*
** Cache data in the Fts3MultiSegReader.aBuffer[] buffer (overwriting any
** existing data). Grow the buffer if required.
**
** If successful, return SQLITE_OK. Otherwise, if an OOM error is encountered
** trying to resize the buffer, return SQLITE_NOMEM.
*/
static int fts3MsrBufferData(
  Fts3MultiSegReader *pMsr,       /* Multi-segment-reader handle */
  char *pList,
  int nList
){
  if( nList>pMsr->nBuffer ){
    char *pNew;
    pMsr->nBuffer = nList*2;
    pNew = (char *)sqlite3_realloc(pMsr->aBuffer, pMsr->nBuffer);
    if( !pNew ) return SQLITE_NOMEM;
    pMsr->aBuffer = pNew;
  }

  assert( nList>0 );
  memcpy(pMsr->aBuffer, pList, nList);
  return SQLITE_OK;
}

int sqlite3Fts3MsrIncrNext(
  Fts3Table *p,                   /* Virtual table handle */
  Fts3MultiSegReader *pMsr,       /* Multi-segment-reader handle */
  sqlite3_int64 *piDocid,         /* OUT: Docid value */
  char **paPoslist,               /* OUT: Pointer to position list */
  int *pnPoslist                  /* OUT: Size of position list in bytes */
){
  int nMerge = pMsr->nAdvance;
  Fts3SegReader **apSegment = pMsr->apSegment;
  int (*xCmp)(Fts3SegReader *, Fts3SegReader *) = (
    p->bDescIdx ? fts3SegReaderDoclistCmpRev : fts3SegReaderDoclistCmp
  );

  if( nMerge==0 ){
    *paPoslist = 0;
    return SQLITE_OK;
  }

  while( 1 ){
    Fts3SegReader *pSeg;
    pSeg = pMsr->apSegment[0];

    if( pSeg->pOffsetList==0 ){
      *paPoslist = 0;
      break;
    }else{
      int rc;
      char *pList;
      int nList;
      int j;
      sqlite3_int64 iDocid = apSegment[0]->iDocid;

      rc = fts3SegReaderNextDocid(p, apSegment[0], &pList, &nList);
      j = 1;
      while( rc==SQLITE_OK 
        && j<nMerge
        && apSegment[j]->pOffsetList
        && apSegment[j]->iDocid==iDocid
      ){
        rc = fts3SegReaderNextDocid(p, apSegment[j], 0, 0);
        j++;
      }
      if( rc!=SQLITE_OK ) return rc;
      fts3SegReaderSort(pMsr->apSegment, nMerge, j, xCmp);

      if( nList>0 && fts3SegReaderIsPending(apSegment[0]) ){
        rc = fts3MsrBufferData(pMsr, pList, nList+1);
        if( rc!=SQLITE_OK ) return rc;
        assert( (pMsr->aBuffer[nList] & 0xFE)==0x00 );
        pList = pMsr->aBuffer;
      }

      if( pMsr->iColFilter>=0 ){
        fts3ColumnFilter(pMsr->iColFilter, 1, &pList, &nList);
      }

      if( nList>0 ){
        *paPoslist = pList;
        *piDocid = iDocid;
        *pnPoslist = nList;
        break;
      }
    }
  }

  return SQLITE_OK;
}

static int fts3SegReaderStart(
  Fts3Table *p,                   /* Virtual table handle */
  Fts3MultiSegReader *pCsr,       /* Cursor object */
  const char *zTerm,              /* Term searched for (or NULL) */
  int nTerm                       /* Length of zTerm in bytes */
){
  int i;
  int nSeg = pCsr->nSegment;

  /* If the Fts3SegFilter defines a specific term (or term prefix) to search 
  ** for, then advance each segment iterator until it points to a term of
  ** equal or greater value than the specified term. This prevents many
  ** unnecessary merge/sort operations for the case where single segment
  ** b-tree leaf nodes contain more than one term.
  */
  for(i=0; pCsr->bRestart==0 && i<pCsr->nSegment; i++){
    int res = 0;
    Fts3SegReader *pSeg = pCsr->apSegment[i];
    do {
      int rc = fts3SegReaderNext(p, pSeg, 0);
      if( rc!=SQLITE_OK ) return rc;
    }while( zTerm && (res = fts3SegReaderTermCmp(pSeg, zTerm, nTerm))<0 );

    if( pSeg->bLookup && res!=0 ){
      fts3SegReaderSetEof(pSeg);
    }
  }
  fts3SegReaderSort(pCsr->apSegment, nSeg, nSeg, fts3SegReaderCmp);

  return SQLITE_OK;
}

int sqlite3Fts3SegReaderStart(
  Fts3Table *p,                   /* Virtual table handle */
  Fts3MultiSegReader *pCsr,       /* Cursor object */
  Fts3SegFilter *pFilter          /* Restrictions on range of iteration */
){
  pCsr->pFilter = pFilter;
  return fts3SegReaderStart(p, pCsr, pFilter->zTerm, pFilter->nTerm);
}

int sqlite3Fts3MsrIncrStart(
  Fts3Table *p,                   /* Virtual table handle */
  Fts3MultiSegReader *pCsr,       /* Cursor object */
  int iCol,                       /* Column to match on. */
  const char *zTerm,              /* Term to iterate through a doclist for */
  int nTerm                       /* Number of bytes in zTerm */
){
  int i;
  int rc;
  int nSegment = pCsr->nSegment;
  int (*xCmp)(Fts3SegReader *, Fts3SegReader *) = (
    p->bDescIdx ? fts3SegReaderDoclistCmpRev : fts3SegReaderDoclistCmp
  );

  assert( pCsr->pFilter==0 );
  assert( zTerm && nTerm>0 );

  /* Advance each segment iterator until it points to the term zTerm/nTerm. */
  rc = fts3SegReaderStart(p, pCsr, zTerm, nTerm);
  if( rc!=SQLITE_OK ) return rc;

  /* Determine how many of the segments actually point to zTerm/nTerm. */
  for(i=0; i<nSegment; i++){
    Fts3SegReader *pSeg = pCsr->apSegment[i];
    if( !pSeg->aNode || fts3SegReaderTermCmp(pSeg, zTerm, nTerm) ){
      break;
    }
  }
  pCsr->nAdvance = i;

  /* Advance each of the segments to point to the first docid. */
  for(i=0; i<pCsr->nAdvance; i++){
    rc = fts3SegReaderFirstDocid(p, pCsr->apSegment[i]);
    if( rc!=SQLITE_OK ) return rc;
  }
  fts3SegReaderSort(pCsr->apSegment, i, i, xCmp);

  assert( iCol<0 || iCol<p->nColumn );
  pCsr->iColFilter = iCol;

  return SQLITE_OK;
}

/*
** This function is called on a MultiSegReader that has been started using
** sqlite3Fts3MsrIncrStart(). One or more calls to MsrIncrNext() may also
** have been made. Calling this function puts the MultiSegReader in such
** a state that if the next two calls are:
**
**   sqlite3Fts3SegReaderStart()
**   sqlite3Fts3SegReaderStep()
**
** then the entire doclist for the term is available in 
** MultiSegReader.aDoclist/nDoclist.
*/
int sqlite3Fts3MsrIncrRestart(Fts3MultiSegReader *pCsr){
  int i;                          /* Used to iterate through segment-readers */

  assert( pCsr->zTerm==0 );
  assert( pCsr->nTerm==0 );
  assert( pCsr->aDoclist==0 );
  assert( pCsr->nDoclist==0 );

  pCsr->nAdvance = 0;
  pCsr->bRestart = 1;
  for(i=0; i<pCsr->nSegment; i++){
    pCsr->apSegment[i]->pOffsetList = 0;
    pCsr->apSegment[i]->nOffsetList = 0;
    pCsr->apSegment[i]->iDocid = 0;
  }

  return SQLITE_OK;
}

static int fts3GrowSegReaderBuffer(Fts3MultiSegReader *pCsr, int nReq){
  if( nReq>pCsr->nBuffer ){
    char *aNew;
    pCsr->nBuffer = nReq*2;
    aNew = sqlite3_realloc(pCsr->aBuffer, pCsr->nBuffer);
    if( !aNew ){
      return SQLITE_NOMEM;
    }
    pCsr->aBuffer = aNew;
  }
  return SQLITE_OK;
}


int sqlite3Fts3SegReaderStep(
  Fts3Table *p,                   /* Virtual table handle */
  Fts3MultiSegReader *pCsr        /* Cursor object */
){
  int rc = SQLITE_OK;

  int isIgnoreEmpty =  (pCsr->pFilter->flags & FTS3_SEGMENT_IGNORE_EMPTY);
  int isRequirePos =   (pCsr->pFilter->flags & FTS3_SEGMENT_REQUIRE_POS);
  int isColFilter =    (pCsr->pFilter->flags & FTS3_SEGMENT_COLUMN_FILTER);
  int isPrefix =       (pCsr->pFilter->flags & FTS3_SEGMENT_PREFIX);
  int isScan =         (pCsr->pFilter->flags & FTS3_SEGMENT_SCAN);
  int isFirst =        (pCsr->pFilter->flags & FTS3_SEGMENT_FIRST);

  Fts3SegReader **apSegment = pCsr->apSegment;
  int nSegment = pCsr->nSegment;
  Fts3SegFilter *pFilter = pCsr->pFilter;
  int (*xCmp)(Fts3SegReader *, Fts3SegReader *) = (
    p->bDescIdx ? fts3SegReaderDoclistCmpRev : fts3SegReaderDoclistCmp
  );

  if( pCsr->nSegment==0 ) return SQLITE_OK;

  do {
    int nMerge;
    int i;
  
    /* Advance the first pCsr->nAdvance entries in the apSegment[] array
    ** forward. Then sort the list in order of current term again.  
    */
    for(i=0; i<pCsr->nAdvance; i++){
      Fts3SegReader *pSeg = apSegment[i];
      if( pSeg->bLookup ){
        fts3SegReaderSetEof(pSeg);
      }else{
        rc = fts3SegReaderNext(p, pSeg, 0);
      }
      if( rc!=SQLITE_OK ) return rc;
    }
    fts3SegReaderSort(apSegment, nSegment, pCsr->nAdvance, fts3SegReaderCmp);
    pCsr->nAdvance = 0;

    /* If all the seg-readers are at EOF, we're finished. return SQLITE_OK. */
    assert( rc==SQLITE_OK );
    if( apSegment[0]->aNode==0 ) break;

    pCsr->nTerm = apSegment[0]->nTerm;
    pCsr->zTerm = apSegment[0]->zTerm;

    /* If this is a prefix-search, and if the term that apSegment[0] points
    ** to does not share a suffix with pFilter->zTerm/nTerm, then all 
    ** required callbacks have been made. In this case exit early.
    **
    ** Similarly, if this is a search for an exact match, and the first term
    ** of segment apSegment[0] is not a match, exit early.
    */
    if( pFilter->zTerm && !isScan ){
      if( pCsr->nTerm<pFilter->nTerm 
       || (!isPrefix && pCsr->nTerm>pFilter->nTerm)
       || memcmp(pCsr->zTerm, pFilter->zTerm, pFilter->nTerm) 
      ){
        break;
      }
    }

    nMerge = 1;
    while( nMerge<nSegment 
        && apSegment[nMerge]->aNode
        && apSegment[nMerge]->nTerm==pCsr->nTerm 
        && 0==memcmp(pCsr->zTerm, apSegment[nMerge]->zTerm, pCsr->nTerm)
    ){
      nMerge++;
    }

    assert( isIgnoreEmpty || (isRequirePos && !isColFilter) );
    if( nMerge==1 
     && !isIgnoreEmpty 
     && !isFirst 
     && (p->bDescIdx==0 || fts3SegReaderIsPending(apSegment[0])==0)
    ){
      pCsr->nDoclist = apSegment[0]->nDoclist;
      if( fts3SegReaderIsPending(apSegment[0]) ){
        rc = fts3MsrBufferData(pCsr, apSegment[0]->aDoclist, pCsr->nDoclist);
        pCsr->aDoclist = pCsr->aBuffer;
      }else{
        pCsr->aDoclist = apSegment[0]->aDoclist;
      }
      if( rc==SQLITE_OK ) rc = SQLITE_ROW;
    }else{
      int nDoclist = 0;           /* Size of doclist */
      sqlite3_int64 iPrev = 0;    /* Previous docid stored in doclist */

      /* The current term of the first nMerge entries in the array
      ** of Fts3SegReader objects is the same. The doclists must be merged
      ** and a single term returned with the merged doclist.
      */
      for(i=0; i<nMerge; i++){
        fts3SegReaderFirstDocid(p, apSegment[i]);
      }
      fts3SegReaderSort(apSegment, nMerge, nMerge, xCmp);
      while( apSegment[0]->pOffsetList ){
        int j;                    /* Number of segments that share a docid */
        char *pList = 0;
        int nList = 0;
        int nByte;
        sqlite3_int64 iDocid = apSegment[0]->iDocid;
        fts3SegReaderNextDocid(p, apSegment[0], &pList, &nList);
        j = 1;
        while( j<nMerge
            && apSegment[j]->pOffsetList
            && apSegment[j]->iDocid==iDocid
        ){
          fts3SegReaderNextDocid(p, apSegment[j], 0, 0);
          j++;
        }

        if( isColFilter ){
          fts3ColumnFilter(pFilter->iCol, 0, &pList, &nList);
        }

        if( !isIgnoreEmpty || nList>0 ){

          /* Calculate the 'docid' delta value to write into the merged 
          ** doclist. */
          sqlite3_int64 iDelta;
          if( p->bDescIdx && nDoclist>0 ){
            if( iPrev<=iDocid ) return FTS_CORRUPT_VTAB;
            iDelta = (i64)((u64)iPrev - (u64)iDocid);
          }else{
            if( nDoclist>0 && iPrev>=iDocid ) return FTS_CORRUPT_VTAB;
            iDelta = (i64)((u64)iDocid - (u64)iPrev);
          }

          nByte = sqlite3Fts3VarintLen(iDelta) + (isRequirePos?nList+1:0);

          rc = fts3GrowSegReaderBuffer(pCsr, nByte+nDoclist);
          if( rc ) return rc;

          if( isFirst ){
            char *a = &pCsr->aBuffer[nDoclist];
            int nWrite;
           
            nWrite = sqlite3Fts3FirstFilter(iDelta, pList, nList, a);
            if( nWrite ){
              iPrev = iDocid;
              nDoclist += nWrite;
            }
          }else{
            nDoclist += sqlite3Fts3PutVarint(&pCsr->aBuffer[nDoclist], iDelta);
            iPrev = iDocid;
            if( isRequirePos ){
              memcpy(&pCsr->aBuffer[nDoclist], pList, nList);
              nDoclist += nList;
              pCsr->aBuffer[nDoclist++] = '\0';
            }
          }
        }

        fts3SegReaderSort(apSegment, nMerge, j, xCmp);
      }
      if( nDoclist>0 ){
        rc = fts3GrowSegReaderBuffer(pCsr, nDoclist+FTS3_NODE_PADDING);
        if( rc ) return rc;
        memset(&pCsr->aBuffer[nDoclist], 0, FTS3_NODE_PADDING);
        pCsr->aDoclist = pCsr->aBuffer;
        pCsr->nDoclist = nDoclist;
        rc = SQLITE_ROW;
      }
    }
    pCsr->nAdvance = nMerge;
  }while( rc==SQLITE_OK );

  return rc;
}


void sqlite3Fts3SegReaderFinish(
  Fts3MultiSegReader *pCsr       /* Cursor object */
){
  if( pCsr ){
    int i;
    for(i=0; i<pCsr->nSegment; i++){
      sqlite3Fts3SegReaderFree(pCsr->apSegment[i]);
    }
    sqlite3_free(pCsr->apSegment);
    sqlite3_free(pCsr->aBuffer);

    pCsr->nSegment = 0;
    pCsr->apSegment = 0;
    pCsr->aBuffer = 0;
  }
}

/*
** Decode the "end_block" field, selected by column iCol of the SELECT 
** statement passed as the first argument. 
**
** The "end_block" field may contain either an integer, or a text field
** containing the text representation of two non-negative integers separated 
** by one or more space (0x20) characters. In the first case, set *piEndBlock 
** to the integer value and *pnByte to zero before returning. In the second, 
** set *piEndBlock to the first value and *pnByte to the second.
*/
static void fts3ReadEndBlockField(
  sqlite3_stmt *pStmt, 
  int iCol, 
  i64 *piEndBlock,
  i64 *pnByte
){
  const unsigned char *zText = sqlite3_column_text(pStmt, iCol);
  if( zText ){
    int i;
    int iMul = 1;
    u64 iVal = 0;
    for(i=0; zText[i]>='0' && zText[i]<='9'; i++){
      iVal = iVal*10 + (zText[i] - '0');
    }
    *piEndBlock = (i64)iVal;
    while( zText[i]==' ' ) i++;
    iVal = 0;
    if( zText[i]=='-' ){
      i++;
      iMul = -1;
    }
    for(/* no-op */; zText[i]>='0' && zText[i]<='9'; i++){
      iVal = iVal*10 + (zText[i] - '0');
    }
    *pnByte = ((i64)iVal * (i64)iMul);
  }
}


/*
** A segment of size nByte bytes has just been written to absolute level
** iAbsLevel. Promote any segments that should be promoted as a result.
*/
static int fts3PromoteSegments(
  Fts3Table *p,                   /* FTS table handle */
  sqlite3_int64 iAbsLevel,        /* Absolute level just updated */
  sqlite3_int64 nByte             /* Size of new segment at iAbsLevel */
){
  int rc = SQLITE_OK;
  sqlite3_stmt *pRange;

  rc = fts3SqlStmt(p, SQL_SELECT_LEVEL_RANGE2, &pRange, 0);

  if( rc==SQLITE_OK ){
    int bOk = 0;
    i64 iLast = (iAbsLevel/FTS3_SEGDIR_MAXLEVEL + 1) * FTS3_SEGDIR_MAXLEVEL - 1;
    i64 nLimit = (nByte*3)/2;

    /* Loop through all entries in the %_segdir table corresponding to 
    ** segments in this index on levels greater than iAbsLevel. If there is
    ** at least one such segment, and it is possible to determine that all 
    ** such segments are smaller than nLimit bytes in size, they will be 
    ** promoted to level iAbsLevel.  */
    sqlite3_bind_int64(pRange, 1, iAbsLevel+1);
    sqlite3_bind_int64(pRange, 2, iLast);
    while( SQLITE_ROW==sqlite3_step(pRange) ){
      i64 nSize = 0, dummy;
      fts3ReadEndBlockField(pRange, 2, &dummy, &nSize);
      if( nSize<=0 || nSize>nLimit ){
        /* If nSize==0, then the %_segdir.end_block field does not not 
        ** contain a size value. This happens if it was written by an
        ** old version of FTS. In this case it is not possible to determine
        ** the size of the segment, and so segment promotion does not
        ** take place.  */
        bOk = 0;
        break;
      }
      bOk = 1;
    }
    rc = sqlite3_reset(pRange);

    if( bOk ){
      int iIdx = 0;
      sqlite3_stmt *pUpdate1 = 0;
      sqlite3_stmt *pUpdate2 = 0;

      if( rc==SQLITE_OK ){
        rc = fts3SqlStmt(p, SQL_UPDATE_LEVEL_IDX, &pUpdate1, 0);
      }
      if( rc==SQLITE_OK ){
        rc = fts3SqlStmt(p, SQL_UPDATE_LEVEL, &pUpdate2, 0);
      }

      if( rc==SQLITE_OK ){

        /* Loop through all %_segdir entries for segments in this index with
        ** levels equal to or greater than iAbsLevel. As each entry is visited,
        ** updated it to set (level = -1) and (idx = N), where N is 0 for the
        ** oldest segment in the range, 1 for the next oldest, and so on.
        **
        ** In other words, move all segments being promoted to level -1,
        ** setting the "idx" fields as appropriate to keep them in the same
        ** order. The contents of level -1 (which is never used, except
        ** transiently here), will be moved back to level iAbsLevel below.  */
        sqlite3_bind_int64(pRange, 1, iAbsLevel);
        while( SQLITE_ROW==sqlite3_step(pRange) ){
          sqlite3_bind_int(pUpdate1, 1, iIdx++);
          sqlite3_bind_int(pUpdate1, 2, sqlite3_column_int(pRange, 0));
          sqlite3_bind_int(pUpdate1, 3, sqlite3_column_int(pRange, 1));
          sqlite3_step(pUpdate1);
          rc = sqlite3_reset(pUpdate1);
          if( rc!=SQLITE_OK ){
            sqlite3_reset(pRange);
            break;
          }
        }
      }
      if( rc==SQLITE_OK ){
        rc = sqlite3_reset(pRange);
      }

      /* Move level -1 to level iAbsLevel */
      if( rc==SQLITE_OK ){
        sqlite3_bind_int64(pUpdate2, 1, iAbsLevel);
        sqlite3_step(pUpdate2);
        rc = sqlite3_reset(pUpdate2);
      }
    }
  }


  return rc;
}

/*
** Merge all level iLevel segments in the database into a single 
** iLevel+1 segment. Or, if iLevel<0, merge all segments into a
** single segment with a level equal to the numerically largest level 
** currently present in the database.
**
** If this function is called with iLevel<0, but there is only one
** segment in the database, SQLITE_DONE is returned immediately. 
** Otherwise, if successful, SQLITE_OK is returned. If an error occurs, 
** an SQLite error code is returned.
*/
static int fts3SegmentMerge(
  Fts3Table *p, 
  int iLangid,                    /* Language id to merge */
  int iIndex,                     /* Index in p->aIndex[] to merge */
  int iLevel                      /* Level to merge */
){
  int rc;                         /* Return code */
  int iIdx = 0;                   /* Index of new segment */
  sqlite3_int64 iNewLevel = 0;    /* Level/index to create new segment at */
  SegmentWriter *pWriter = 0;     /* Used to write the new, merged, segment */
  Fts3SegFilter filter;           /* Segment term filter condition */
  Fts3MultiSegReader csr;         /* Cursor to iterate through level(s) */
  int bIgnoreEmpty = 0;           /* True to ignore empty segments */
  i64 iMaxLevel = 0;              /* Max level number for this index/langid */

  assert( iLevel==FTS3_SEGCURSOR_ALL
       || iLevel==FTS3_SEGCURSOR_PENDING
       || iLevel>=0
  );
  assert( iLevel<FTS3_SEGDIR_MAXLEVEL );
  assert( iIndex>=0 && iIndex<p->nIndex );

  rc = sqlite3Fts3SegReaderCursor(p, iLangid, iIndex, iLevel, 0, 0, 1, 0, &csr);
  if( rc!=SQLITE_OK || csr.nSegment==0 ) goto finished;

  if( iLevel!=FTS3_SEGCURSOR_PENDING ){
    rc = fts3SegmentMaxLevel(p, iLangid, iIndex, &iMaxLevel);
    if( rc!=SQLITE_OK ) goto finished;
  }

  if( iLevel==FTS3_SEGCURSOR_ALL ){
    /* This call is to merge all segments in the database to a single
    ** segment. The level of the new segment is equal to the numerically
    ** greatest segment level currently present in the database for this
    ** index. The idx of the new segment is always 0.  */
    if( csr.nSegment==1 && 0==fts3SegReaderIsPending(csr.apSegment[0]) ){
      rc = SQLITE_DONE;
      goto finished;
    }
    iNewLevel = iMaxLevel;
    bIgnoreEmpty = 1;

  }else{
    /* This call is to merge all segments at level iLevel. find the next
    ** available segment index at level iLevel+1. The call to
    ** fts3AllocateSegdirIdx() will merge the segments at level iLevel+1 to 
    ** a single iLevel+2 segment if necessary.  */
    assert( FTS3_SEGCURSOR_PENDING==-1 );
    iNewLevel = getAbsoluteLevel(p, iLangid, iIndex, iLevel+1);
    rc = fts3AllocateSegdirIdx(p, iLangid, iIndex, iLevel+1, &iIdx);
    bIgnoreEmpty = (iLevel!=FTS3_SEGCURSOR_PENDING) && (iNewLevel>iMaxLevel);
  }
  if( rc!=SQLITE_OK ) goto finished;

  assert( csr.nSegment>0 );
  assert_fts3_nc( iNewLevel>=getAbsoluteLevel(p, iLangid, iIndex, 0) );
  assert_fts3_nc( 
    iNewLevel<getAbsoluteLevel(p, iLangid, iIndex,FTS3_SEGDIR_MAXLEVEL) 
  );

  memset(&filter, 0, sizeof(Fts3SegFilter));
  filter.flags = FTS3_SEGMENT_REQUIRE_POS;
  filter.flags |= (bIgnoreEmpty ? FTS3_SEGMENT_IGNORE_EMPTY : 0);

  rc = sqlite3Fts3SegReaderStart(p, &csr, &filter);
  while( SQLITE_OK==rc ){
    rc = sqlite3Fts3SegReaderStep(p, &csr);
    if( rc!=SQLITE_ROW ) break;
    rc = fts3SegWriterAdd(p, &pWriter, 1, 
        csr.zTerm, csr.nTerm, csr.aDoclist, csr.nDoclist);
  }
  if( rc!=SQLITE_OK ) goto finished;
  assert_fts3_nc( pWriter || bIgnoreEmpty );

  if( iLevel!=FTS3_SEGCURSOR_PENDING ){
    rc = fts3DeleteSegdir(
        p, iLangid, iIndex, iLevel, csr.apSegment, csr.nSegment
    );
    if( rc!=SQLITE_OK ) goto finished;
  }
  if( pWriter ){
    rc = fts3SegWriterFlush(p, pWriter, iNewLevel, iIdx);
    if( rc==SQLITE_OK ){
      if( iLevel==FTS3_SEGCURSOR_PENDING || iNewLevel<iMaxLevel ){
        rc = fts3PromoteSegments(p, iNewLevel, pWriter->nLeafData);
      }
    }
  }

 finished:
  fts3SegWriterFree(pWriter);
  sqlite3Fts3SegReaderFinish(&csr);
  return rc;
}


/* 
** Flush the contents of pendingTerms to level 0 segments. 
*/
int sqlite3Fts3PendingTermsFlush(Fts3Table *p){
  int rc = SQLITE_OK;
  int i;
        
  for(i=0; rc==SQLITE_OK && i<p->nIndex; i++){
    rc = fts3SegmentMerge(p, p->iPrevLangid, i, FTS3_SEGCURSOR_PENDING);
    if( rc==SQLITE_DONE ) rc = SQLITE_OK;
  }
  sqlite3Fts3PendingTermsClear(p);

  /* Determine the auto-incr-merge setting if unknown.  If enabled,
  ** estimate the number of leaf blocks of content to be written
  */
  if( rc==SQLITE_OK && p->bHasStat
   && p->nAutoincrmerge==0xff && p->nLeafAdd>0
  ){
    sqlite3_stmt *pStmt = 0;
    rc = fts3SqlStmt(p, SQL_SELECT_STAT, &pStmt, 0);
    if( rc==SQLITE_OK ){
      sqlite3_bind_int(pStmt, 1, FTS_STAT_AUTOINCRMERGE);
      rc = sqlite3_step(pStmt);
      if( rc==SQLITE_ROW ){
        p->nAutoincrmerge = sqlite3_column_int(pStmt, 0);
        if( p->nAutoincrmerge==1 ) p->nAutoincrmerge = 8;
      }else if( rc==SQLITE_DONE ){
        p->nAutoincrmerge = 0;
      }
      rc = sqlite3_reset(pStmt);
    }
  }
  return rc;
}

/*
** Encode N integers as varints into a blob.
*/
static void fts3EncodeIntArray(
  int N,             /* The number of integers to encode */
  u32 *a,            /* The integer values */
  char *zBuf,        /* Write the BLOB here */
  int *pNBuf         /* Write number of bytes if zBuf[] used here */
){
  int i, j;
  for(i=j=0; i<N; i++){
    j += sqlite3Fts3PutVarint(&zBuf[j], (sqlite3_int64)a[i]);
  }
  *pNBuf = j;
}

/*
** Decode a blob of varints into N integers
*/
static void fts3DecodeIntArray(
  int N,             /* The number of integers to decode */
  u32 *a,            /* Write the integer values */
  const char *zBuf,  /* The BLOB containing the varints */
  int nBuf           /* size of the BLOB */
){
  int i = 0;
  if( nBuf && (zBuf[nBuf-1]&0x80)==0 ){
    int j;
    for(i=j=0; i<N && j<nBuf; i++){
      sqlite3_int64 x;
      j += sqlite3Fts3GetVarint(&zBuf[j], &x);
      a[i] = (u32)(x & 0xffffffff);
    }
  }
  while( i<N ) a[i++] = 0;
}

/*
** Insert the sizes (in tokens) for each column of the document
** with docid equal to p->iPrevDocid.  The sizes are encoded as
** a blob of varints.
*/
static void fts3InsertDocsize(
  int *pRC,                       /* Result code */
  Fts3Table *p,                   /* Table into which to insert */
  u32 *aSz                        /* Sizes of each column, in tokens */
){
  char *pBlob;             /* The BLOB encoding of the document size */
  int nBlob;               /* Number of bytes in the BLOB */
  sqlite3_stmt *pStmt;     /* Statement used to insert the encoding */
  int rc;                  /* Result code from subfunctions */

  if( *pRC ) return;
  pBlob = sqlite3_malloc64( 10*(sqlite3_int64)p->nColumn );
  if( pBlob==0 ){
    *pRC = SQLITE_NOMEM;
    return;
  }
  fts3EncodeIntArray(p->nColumn, aSz, pBlob, &nBlob);
  rc = fts3SqlStmt(p, SQL_REPLACE_DOCSIZE, &pStmt, 0);
  if( rc ){
    sqlite3_free(pBlob);
    *pRC = rc;
    return;
  }
  sqlite3_bind_int64(pStmt, 1, p->iPrevDocid);
  sqlite3_bind_blob(pStmt, 2, pBlob, nBlob, sqlite3_free);
  sqlite3_step(pStmt);
  *pRC = sqlite3_reset(pStmt);
}

/*
** Record 0 of the %_stat table contains a blob consisting of N varints,
** where N is the number of user defined columns in the fts3 table plus
** two. If nCol is the number of user defined columns, then values of the 
** varints are set as follows:
**
**   Varint 0:       Total number of rows in the table.
**
**   Varint 1..nCol: For each column, the total number of tokens stored in
**                   the column for all rows of the table.
**
**   Varint 1+nCol:  The total size, in bytes, of all text values in all
**                   columns of all rows of the table.
**
*/
static void fts3UpdateDocTotals(
  int *pRC,                       /* The result code */
  Fts3Table *p,                   /* Table being updated */
  u32 *aSzIns,                    /* Size increases */
  u32 *aSzDel,                    /* Size decreases */
  int nChng                       /* Change in the number of documents */
){
  char *pBlob;             /* Storage for BLOB written into %_stat */
  int nBlob;               /* Size of BLOB written into %_stat */
  u32 *a;                  /* Array of integers that becomes the BLOB */
  sqlite3_stmt *pStmt;     /* Statement for reading and writing */
  int i;                   /* Loop counter */
  int rc;                  /* Result code from subfunctions */

  const int nStat = p->nColumn+2;

  if( *pRC ) return;
  a = sqlite3_malloc64( (sizeof(u32)+10)*(sqlite3_int64)nStat );
  if( a==0 ){
    *pRC = SQLITE_NOMEM;
    return;
  }
  pBlob = (char*)&a[nStat];
  rc = fts3SqlStmt(p, SQL_SELECT_STAT, &pStmt, 0);
  if( rc ){
    sqlite3_free(a);
    *pRC = rc;
    return;
  }
  sqlite3_bind_int(pStmt, 1, FTS_STAT_DOCTOTAL);
  if( sqlite3_step(pStmt)==SQLITE_ROW ){
    fts3DecodeIntArray(nStat, a,
         sqlite3_column_blob(pStmt, 0),
         sqlite3_column_bytes(pStmt, 0));
  }else{
    memset(a, 0, sizeof(u32)*(nStat) );
  }
  rc = sqlite3_reset(pStmt);
  if( rc!=SQLITE_OK ){
    sqlite3_free(a);
    *pRC = rc;
    return;
  }
  if( nChng<0 && a[0]<(u32)(-nChng) ){
    a[0] = 0;
  }else{
    a[0] += nChng;
  }
  for(i=0; i<p->nColumn+1; i++){
    u32 x = a[i+1];
    if( x+aSzIns[i] < aSzDel[i] ){
      x = 0;
    }else{
      x = x + aSzIns[i] - aSzDel[i];
    }
    a[i+1] = x;
  }
  fts3EncodeIntArray(nStat, a, pBlob, &nBlob);
  rc = fts3SqlStmt(p, SQL_REPLACE_STAT, &pStmt, 0);
  if( rc ){
    sqlite3_free(a);
    *pRC = rc;
    return;
  }
  sqlite3_bind_int(pStmt, 1, FTS_STAT_DOCTOTAL);
  sqlite3_bind_blob(pStmt, 2, pBlob, nBlob, SQLITE_STATIC);
  sqlite3_step(pStmt);
  *pRC = sqlite3_reset(pStmt);
  sqlite3_bind_null(pStmt, 2);
  sqlite3_free(a);
}

/*
** Merge the entire database so that there is one segment for each 
** iIndex/iLangid combination.
*/
static int fts3DoOptimize(Fts3Table *p, int bReturnDone){
  int bSeenDone = 0;
  int rc;
  sqlite3_stmt *pAllLangid = 0;

  rc = sqlite3Fts3PendingTermsFlush(p);
  if( rc==SQLITE_OK ){
    rc = fts3SqlStmt(p, SQL_SELECT_ALL_LANGID, &pAllLangid, 0);
  }
  if( rc==SQLITE_OK ){
    int rc2;
    sqlite3_bind_int(pAllLangid, 1, p->iPrevLangid);
    sqlite3_bind_int(pAllLangid, 2, p->nIndex);
    while( sqlite3_step(pAllLangid)==SQLITE_ROW ){
      int i;
      int iLangid = sqlite3_column_int(pAllLangid, 0);
      for(i=0; rc==SQLITE_OK && i<p->nIndex; i++){
        rc = fts3SegmentMerge(p, iLangid, i, FTS3_SEGCURSOR_ALL);
        if( rc==SQLITE_DONE ){
          bSeenDone = 1;
          rc = SQLITE_OK;
        }
      }
    }
    rc2 = sqlite3_reset(pAllLangid);
    if( rc==SQLITE_OK ) rc = rc2;
  }

  sqlite3Fts3SegmentsClose(p);

  return (rc==SQLITE_OK && bReturnDone && bSeenDone) ? SQLITE_DONE : rc;
}

/*
** This function is called when the user executes the following statement:
**
**     INSERT INTO <tbl>(<tbl>) VALUES('rebuild');
**
** The entire FTS index is discarded and rebuilt. If the table is one 
** created using the content=xxx option, then the new index is based on
** the current contents of the xxx table. Otherwise, it is rebuilt based
** on the contents of the %_content table.
*/
static int fts3DoRebuild(Fts3Table *p){
  int rc;                         /* Return Code */

  rc = fts3DeleteAll(p, 0);
  if( rc==SQLITE_OK ){
    u32 *aSz = 0;
    u32 *aSzIns = 0;
    u32 *aSzDel = 0;
    sqlite3_stmt *pStmt = 0;
    int nEntry = 0;

    /* Compose and prepare an SQL statement to loop through the content table */
    char *zSql = sqlite3_mprintf("SELECT %s" , p->zReadExprlist);
    if( !zSql ){
      rc = SQLITE_NOMEM;
    }else{
      rc = sqlite3_prepare_v2(p->db, zSql, -1, &pStmt, 0);
      sqlite3_free(zSql);
    }

    if( rc==SQLITE_OK ){
      sqlite3_int64 nByte = sizeof(u32) * ((sqlite3_int64)p->nColumn+1)*3;
      aSz = (u32 *)sqlite3_malloc64(nByte);
      if( aSz==0 ){
        rc = SQLITE_NOMEM;
      }else{
        memset(aSz, 0, nByte);
        aSzIns = &aSz[p->nColumn+1];
        aSzDel = &aSzIns[p->nColumn+1];
      }
    }

    while( rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pStmt) ){
      int iCol;
      int iLangid = langidFromSelect(p, pStmt);
      rc = fts3PendingTermsDocid(p, 0, iLangid, sqlite3_column_int64(pStmt, 0));
      memset(aSz, 0, sizeof(aSz[0]) * (p->nColumn+1));
      for(iCol=0; rc==SQLITE_OK && iCol<p->nColumn; iCol++){
        if( p->abNotindexed[iCol]==0 ){
          const char *z = (const char *) sqlite3_column_text(pStmt, iCol+1);
          rc = fts3PendingTermsAdd(p, iLangid, z, iCol, &aSz[iCol]);
          aSz[p->nColumn] += sqlite3_column_bytes(pStmt, iCol+1);
        }
      }
      if( p->bHasDocsize ){
        fts3InsertDocsize(&rc, p, aSz);
      }
      if( rc!=SQLITE_OK ){
        sqlite3_finalize(pStmt);
        pStmt = 0;
      }else{
        nEntry++;
        for(iCol=0; iCol<=p->nColumn; iCol++){
          aSzIns[iCol] += aSz[iCol];
        }
      }
    }
    if( p->bFts4 ){
      fts3UpdateDocTotals(&rc, p, aSzIns, aSzDel, nEntry);
    }
    sqlite3_free(aSz);

    if( pStmt ){
      int rc2 = sqlite3_finalize(pStmt);
      if( rc==SQLITE_OK ){
        rc = rc2;
      }
    }
  }

  return rc;
}


/*
** This function opens a cursor used to read the input data for an 
** incremental merge operation. Specifically, it opens a cursor to scan
** the oldest nSeg segments (idx=0 through idx=(nSeg-1)) in absolute 
** level iAbsLevel.
*/
static int fts3IncrmergeCsr(
  Fts3Table *p,                   /* FTS3 table handle */
  sqlite3_int64 iAbsLevel,        /* Absolute level to open */
  int nSeg,                       /* Number of segments to merge */
  Fts3MultiSegReader *pCsr        /* Cursor object to populate */
){
  int rc;                         /* Return Code */
  sqlite3_stmt *pStmt = 0;        /* Statement used to read %_segdir entry */  
  sqlite3_int64 nByte;            /* Bytes allocated at pCsr->apSegment[] */

  /* Allocate space for the Fts3MultiSegReader.aCsr[] array */
  memset(pCsr, 0, sizeof(*pCsr));
  nByte = sizeof(Fts3SegReader *) * nSeg;
  pCsr->apSegment = (Fts3SegReader **)sqlite3_malloc64(nByte);

  if( pCsr->apSegment==0 ){
    rc = SQLITE_NOMEM;
  }else{
    memset(pCsr->apSegment, 0, nByte);
    rc = fts3SqlStmt(p, SQL_SELECT_LEVEL, &pStmt, 0);
  }
  if( rc==SQLITE_OK ){
    int i;
    int rc2;
    sqlite3_bind_int64(pStmt, 1, iAbsLevel);
    assert( pCsr->nSegment==0 );
    for(i=0; rc==SQLITE_OK && sqlite3_step(pStmt)==SQLITE_ROW && i<nSeg; i++){
      rc = sqlite3Fts3SegReaderNew(i, 0,
          sqlite3_column_int64(pStmt, 1),        /* segdir.start_block */
          sqlite3_column_int64(pStmt, 2),        /* segdir.leaves_end_block */
          sqlite3_column_int64(pStmt, 3),        /* segdir.end_block */
          sqlite3_column_blob(pStmt, 4),         /* segdir.root */
          sqlite3_column_bytes(pStmt, 4),        /* segdir.root */
          &pCsr->apSegment[i]
      );
      pCsr->nSegment++;
    }
    rc2 = sqlite3_reset(pStmt);
    if( rc==SQLITE_OK ) rc = rc2;
  }

  return rc;
}

typedef struct IncrmergeWriter IncrmergeWriter;
typedef struct NodeWriter NodeWriter;
typedef struct Blob Blob;
typedef struct NodeReader NodeReader;

/*
** An instance of the following structure is used as a dynamic buffer
** to build up nodes or other blobs of data in.
**
** The function blobGrowBuffer() is used to extend the allocation.
*/
struct Blob {
  char *a;                        /* Pointer to allocation */
  int n;                          /* Number of valid bytes of data in a[] */
  int nAlloc;                     /* Allocated size of a[] (nAlloc>=n) */
};

/*
** This structure is used to build up buffers containing segment b-tree 
** nodes (blocks).
*/
struct NodeWriter {
  sqlite3_int64 iBlock;           /* Current block id */
  Blob key;                       /* Last key written to the current block */
  Blob block;                     /* Current block image */
};

/*
** An object of this type contains the state required to create or append
** to an appendable b-tree segment.
*/
struct IncrmergeWriter {
  int nLeafEst;                   /* Space allocated for leaf blocks */
  int nWork;                      /* Number of leaf pages flushed */
  sqlite3_int64 iAbsLevel;        /* Absolute level of input segments */
  int iIdx;                       /* Index of *output* segment in iAbsLevel+1 */
  sqlite3_int64 iStart;           /* Block number of first allocated block */
  sqlite3_int64 iEnd;             /* Block number of last allocated block */
  sqlite3_int64 nLeafData;        /* Bytes of leaf page data so far */
  u8 bNoLeafData;                 /* If true, store 0 for segment size */
  NodeWriter aNodeWriter[FTS_MAX_APPENDABLE_HEIGHT];
};

/*
** An object of the following type is used to read data from a single
** FTS segment node. See the following functions:
**
**     nodeReaderInit()
**     nodeReaderNext()
**     nodeReaderRelease()
*/
struct NodeReader {
  const char *aNode;
  int nNode;
  int iOff;                       /* Current offset within aNode[] */

  /* Output variables. Containing the current node entry. */
  sqlite3_int64 iChild;           /* Pointer to child node */
  Blob term;                      /* Current term */
  const char *aDoclist;           /* Pointer to doclist */
  int nDoclist;                   /* Size of doclist in bytes */
};

/*
** If *pRc is not SQLITE_OK when this function is called, it is a no-op.
** Otherwise, if the allocation at pBlob->a is not already at least nMin
** bytes in size, extend (realloc) it to be so.
**
** If an OOM error occurs, set *pRc to SQLITE_NOMEM and leave pBlob->a
** unmodified. Otherwise, if the allocation succeeds, update pBlob->nAlloc
** to reflect the new size of the pBlob->a[] buffer.
*/
static void blobGrowBuffer(Blob *pBlob, int nMin, int *pRc){
  if( *pRc==SQLITE_OK && nMin>pBlob->nAlloc ){
    int nAlloc = nMin;
    char *a = (char *)sqlite3_realloc(pBlob->a, nAlloc);
    if( a ){
      pBlob->nAlloc = nAlloc;
      pBlob->a = a;
    }else{
      *pRc = SQLITE_NOMEM;
    }
  }
}

/*
** Attempt to advance the node-reader object passed as the first argument to
** the next entry on the node. 
**
** Return an error code if an error occurs (SQLITE_NOMEM is possible). 
** Otherwise return SQLITE_OK. If there is no next entry on the node
** (e.g. because the current entry is the last) set NodeReader->aNode to
** NULL to indicate EOF. Otherwise, populate the NodeReader structure output 
** variables for the new entry.
*/
static int nodeReaderNext(NodeReader *p){
  int bFirst = (p->term.n==0);    /* True for first term on the node */
  int nPrefix = 0;                /* Bytes to copy from previous term */
  int nSuffix = 0;                /* Bytes to append to the prefix */
  int rc = SQLITE_OK;             /* Return code */

  assert( p->aNode );
  if( p->iChild && bFirst==0 ) p->iChild++;
  if( p->iOff>=p->nNode ){
    /* EOF */
    p->aNode = 0;
  }else{
    if( bFirst==0 ){
      p->iOff += fts3GetVarint32(&p->aNode[p->iOff], &nPrefix);
    }
    p->iOff += fts3GetVarint32(&p->aNode[p->iOff], &nSuffix);

    if( nPrefix>p->term.n || nSuffix>p->nNode-p->iOff || nSuffix==0 ){
      return FTS_CORRUPT_VTAB;
    }
    blobGrowBuffer(&p->term, nPrefix+nSuffix, &rc);
    if( rc==SQLITE_OK ){
      memcpy(&p->term.a[nPrefix], &p->aNode[p->iOff], nSuffix);
      p->term.n = nPrefix+nSuffix;
      p->iOff += nSuffix;
      if( p->iChild==0 ){
        p->iOff += fts3GetVarint32(&p->aNode[p->iOff], &p->nDoclist);
        if( (p->nNode-p->iOff)<p->nDoclist ){
          return FTS_CORRUPT_VTAB;
        }
        p->aDoclist = &p->aNode[p->iOff];
        p->iOff += p->nDoclist;
      }
    }
  }

  assert_fts3_nc( p->iOff<=p->nNode );
  return rc;
}

/*
** Release all dynamic resources held by node-reader object *p.
*/
static void nodeReaderRelease(NodeReader *p){
  sqlite3_free(p->term.a);
}

/*
** Initialize a node-reader object to read the node in buffer aNode/nNode.
**
** If successful, SQLITE_OK is returned and the NodeReader object set to 
** point to the first entry on the node (if any). Otherwise, an SQLite
** error code is returned.
*/
static int nodeReaderInit(NodeReader *p, const char *aNode, int nNode){
  memset(p, 0, sizeof(NodeReader));
  p->aNode = aNode;
  p->nNode = nNode;

  /* Figure out if this is a leaf or an internal node. */
  if( aNode && aNode[0] ){
    /* An internal node. */
    p->iOff = 1 + sqlite3Fts3GetVarint(&p->aNode[1], &p->iChild);
  }else{
    p->iOff = 1;
  }

  return aNode ? nodeReaderNext(p) : SQLITE_OK;
}

/*
** This function is called while writing an FTS segment each time a leaf o
** node is finished and written to disk. The key (zTerm/nTerm) is guaranteed
** to be greater than the largest key on the node just written, but smaller
** than or equal to the first key that will be written to the next leaf
** node.
**
** The block id of the leaf node just written to disk may be found in
** (pWriter->aNodeWriter[0].iBlock) when this function is called.
*/
static int fts3IncrmergePush(
  Fts3Table *p,                   /* Fts3 table handle */
  IncrmergeWriter *pWriter,       /* Writer object */
  const char *zTerm,              /* Term to write to internal node */
  int nTerm                       /* Bytes at zTerm */
){
  sqlite3_int64 iPtr = pWriter->aNodeWriter[0].iBlock;
  int iLayer;

  assert( nTerm>0 );
  for(iLayer=1; ALWAYS(iLayer<FTS_MAX_APPENDABLE_HEIGHT); iLayer++){
    sqlite3_int64 iNextPtr = 0;
    NodeWriter *pNode = &pWriter->aNodeWriter[iLayer];
    int rc = SQLITE_OK;
    int nPrefix;
    int nSuffix;
    int nSpace;

    /* Figure out how much space the key will consume if it is written to
    ** the current node of layer iLayer. Due to the prefix compression, 
    ** the space required changes depending on which node the key is to
    ** be added to.  */
    nPrefix = fts3PrefixCompress(pNode->key.a, pNode->key.n, zTerm, nTerm);
    nSuffix = nTerm - nPrefix;
    if(nSuffix<=0 ) return FTS_CORRUPT_VTAB;
    nSpace  = sqlite3Fts3VarintLen(nPrefix);
    nSpace += sqlite3Fts3VarintLen(nSuffix) + nSuffix;

    if( pNode->key.n==0 || (pNode->block.n + nSpace)<=p->nNodeSize ){ 
      /* If the current node of layer iLayer contains zero keys, or if adding
      ** the key to it will not cause it to grow to larger than nNodeSize 
      ** bytes in size, write the key here.  */

      Blob *pBlk = &pNode->block;
      if( pBlk->n==0 ){
        blobGrowBuffer(pBlk, p->nNodeSize, &rc);
        if( rc==SQLITE_OK ){
          pBlk->a[0] = (char)iLayer;
          pBlk->n = 1 + sqlite3Fts3PutVarint(&pBlk->a[1], iPtr);
        }
      }
      blobGrowBuffer(pBlk, pBlk->n + nSpace, &rc);
      blobGrowBuffer(&pNode->key, nTerm, &rc);

      if( rc==SQLITE_OK ){
        if( pNode->key.n ){
          pBlk->n += sqlite3Fts3PutVarint(&pBlk->a[pBlk->n], nPrefix);
        }
        pBlk->n += sqlite3Fts3PutVarint(&pBlk->a[pBlk->n], nSuffix);
        memcpy(&pBlk->a[pBlk->n], &zTerm[nPrefix], nSuffix);
        pBlk->n += nSuffix;

        memcpy(pNode->key.a, zTerm, nTerm);
        pNode->key.n = nTerm;
      }
    }else{
      /* Otherwise, flush the current node of layer iLayer to disk.
      ** Then allocate a new, empty sibling node. The key will be written
      ** into the parent of this node. */
      rc = fts3WriteSegment(p, pNode->iBlock, pNode->block.a, pNode->block.n);

      assert( pNode->block.nAlloc>=p->nNodeSize );
      pNode->block.a[0] = (char)iLayer;
      pNode->block.n = 1 + sqlite3Fts3PutVarint(&pNode->block.a[1], iPtr+1);

      iNextPtr = pNode->iBlock;
      pNode->iBlock++;
      pNode->key.n = 0;
    }

    if( rc!=SQLITE_OK || iNextPtr==0 ) return rc;
    iPtr = iNextPtr;
  }

  assert( 0 );
  return 0;
}

/*
** Append a term and (optionally) doclist to the FTS segment node currently
** stored in blob *pNode. The node need not contain any terms, but the
** header must be written before this function is called.
**
** A node header is a single 0x00 byte for a leaf node, or a height varint
** followed by the left-hand-child varint for an internal node.
**
** The term to be appended is passed via arguments zTerm/nTerm. For a 
** leaf node, the doclist is passed as aDoclist/nDoclist. For an internal
** node, both aDoclist and nDoclist must be passed 0.
**
** If the size of the value in blob pPrev is zero, then this is the first
** term written to the node. Otherwise, pPrev contains a copy of the 
** previous term. Before this function returns, it is updated to contain a
** copy of zTerm/nTerm.
**
** It is assumed that the buffer associated with pNode is already large
** enough to accommodate the new entry. The buffer associated with pPrev
** is extended by this function if requrired.
**
** If an error (i.e. OOM condition) occurs, an SQLite error code is
** returned. Otherwise, SQLITE_OK.
*/
static int fts3AppendToNode(
  Blob *pNode,                    /* Current node image to append to */
  Blob *pPrev,                    /* Buffer containing previous term written */
  const char *zTerm,              /* New term to write */
  int nTerm,                      /* Size of zTerm in bytes */
  const char *aDoclist,           /* Doclist (or NULL) to write */
  int nDoclist                    /* Size of aDoclist in bytes */ 
){
  int rc = SQLITE_OK;             /* Return code */
  int bFirst = (pPrev->n==0);     /* True if this is the first term written */
  int nPrefix;                    /* Size of term prefix in bytes */
  int nSuffix;                    /* Size of term suffix in bytes */

  /* Node must have already been started. There must be a doclist for a
  ** leaf node, and there must not be a doclist for an internal node.  */
  assert( pNode->n>0 );
  assert_fts3_nc( (pNode->a[0]=='\0')==(aDoclist!=0) );

  blobGrowBuffer(pPrev, nTerm, &rc);
  if( rc!=SQLITE_OK ) return rc;

  nPrefix = fts3PrefixCompress(pPrev->a, pPrev->n, zTerm, nTerm);
  nSuffix = nTerm - nPrefix;
  if( nSuffix<=0 ) return FTS_CORRUPT_VTAB;
  memcpy(pPrev->a, zTerm, nTerm);
  pPrev->n = nTerm;

  if( bFirst==0 ){
    pNode->n += sqlite3Fts3PutVarint(&pNode->a[pNode->n], nPrefix);
  }
  pNode->n += sqlite3Fts3PutVarint(&pNode->a[pNode->n], nSuffix);
  memcpy(&pNode->a[pNode->n], &zTerm[nPrefix], nSuffix);
  pNode->n += nSuffix;

  if( aDoclist ){
    pNode->n += sqlite3Fts3PutVarint(&pNode->a[pNode->n], nDoclist);
    memcpy(&pNode->a[pNode->n], aDoclist, nDoclist);
    pNode->n += nDoclist;
  }

  assert( pNode->n<=pNode->nAlloc );

  return SQLITE_OK;
}

/*
** Append the current term and doclist pointed to by cursor pCsr to the
** appendable b-tree segment opened for writing by pWriter.
**
** Return SQLITE_OK if successful, or an SQLite error code otherwise.
*/
static int fts3IncrmergeAppend(
  Fts3Table *p,                   /* Fts3 table handle */
  IncrmergeWriter *pWriter,       /* Writer object */
  Fts3MultiSegReader *pCsr        /* Cursor containing term and doclist */
){
  const char *zTerm = pCsr->zTerm;
  int nTerm = pCsr->nTerm;
  const char *aDoclist = pCsr->aDoclist;
  int nDoclist = pCsr->nDoclist;
  int rc = SQLITE_OK;           /* Return code */
  int nSpace;                   /* Total space in bytes required on leaf */
  int nPrefix;                  /* Size of prefix shared with previous term */
  int nSuffix;                  /* Size of suffix (nTerm - nPrefix) */
  NodeWriter *pLeaf;            /* Object used to write leaf nodes */

  pLeaf = &pWriter->aNodeWriter[0];
  nPrefix = fts3PrefixCompress(pLeaf->key.a, pLeaf->key.n, zTerm, nTerm);
  nSuffix = nTerm - nPrefix;

  nSpace  = sqlite3Fts3VarintLen(nPrefix);
  nSpace += sqlite3Fts3VarintLen(nSuffix) + nSuffix;
  nSpace += sqlite3Fts3VarintLen(nDoclist) + nDoclist;

  /* If the current block is not empty, and if adding this term/doclist
  ** to the current block would make it larger than Fts3Table.nNodeSize
  ** bytes, write this block out to the database. */
  if( pLeaf->block.n>0 && (pLeaf->block.n + nSpace)>p->nNodeSize ){
    rc = fts3WriteSegment(p, pLeaf->iBlock, pLeaf->block.a, pLeaf->block.n);
    pWriter->nWork++;

    /* Add the current term to the parent node. The term added to the 
    ** parent must:
    **
    **   a) be greater than the largest term on the leaf node just written
    **      to the database (still available in pLeaf->key), and
    **
    **   b) be less than or equal to the term about to be added to the new
    **      leaf node (zTerm/nTerm).
    **
    ** In other words, it must be the prefix of zTerm 1 byte longer than
    ** the common prefix (if any) of zTerm and pWriter->zTerm.
    */
    if( rc==SQLITE_OK ){
      rc = fts3IncrmergePush(p, pWriter, zTerm, nPrefix+1);
    }

    /* Advance to the next output block */
    pLeaf->iBlock++;
    pLeaf->key.n = 0;
    pLeaf->block.n = 0;

    nSuffix = nTerm;
    nSpace  = 1;
    nSpace += sqlite3Fts3VarintLen(nSuffix) + nSuffix;
    nSpace += sqlite3Fts3VarintLen(nDoclist) + nDoclist;
  }

  pWriter->nLeafData += nSpace;
  blobGrowBuffer(&pLeaf->block, pLeaf->block.n + nSpace, &rc);
  if( rc==SQLITE_OK ){
    if( pLeaf->block.n==0 ){
      pLeaf->block.n = 1;
      pLeaf->block.a[0] = '\0';
    }
    rc = fts3AppendToNode(
        &pLeaf->block, &pLeaf->key, zTerm, nTerm, aDoclist, nDoclist
    );
  }

  return rc;
}

/*
** This function is called to release all dynamic resources held by the
** merge-writer object pWriter, and if no error has occurred, to flush
** all outstanding node buffers held by pWriter to disk.
**
** If *pRc is not SQLITE_OK when this function is called, then no attempt
** is made to write any data to disk. Instead, this function serves only
** to release outstanding resources.
**
** Otherwise, if *pRc is initially SQLITE_OK and an error occurs while
** flushing buffers to disk, *pRc is set to an SQLite error code before
** returning.
*/
static void fts3IncrmergeRelease(
  Fts3Table *p,                   /* FTS3 table handle */
  IncrmergeWriter *pWriter,       /* Merge-writer object */
  int *pRc                        /* IN/OUT: Error code */
){
  int i;                          /* Used to iterate through non-root layers */
  int iRoot;                      /* Index of root in pWriter->aNodeWriter */
  NodeWriter *pRoot;              /* NodeWriter for root node */
  int rc = *pRc;                  /* Error code */

  /* Set iRoot to the index in pWriter->aNodeWriter[] of the output segment 
  ** root node. If the segment fits entirely on a single leaf node, iRoot
  ** will be set to 0. If the root node is the parent of the leaves, iRoot
  ** will be 1. And so on.  */
  for(iRoot=FTS_MAX_APPENDABLE_HEIGHT-1; iRoot>=0; iRoot--){
    NodeWriter *pNode = &pWriter->aNodeWriter[iRoot];
    if( pNode->block.n>0 ) break;
    assert( *pRc || pNode->block.nAlloc==0 );
    assert( *pRc || pNode->key.nAlloc==0 );
    sqlite3_free(pNode->block.a);
    sqlite3_free(pNode->key.a);
  }

  /* Empty output segment. This is a no-op. */
  if( iRoot<0 ) return;

  /* The entire output segment fits on a single node. Normally, this means
  ** the node would be stored as a blob in the "root" column of the %_segdir
  ** table. However, this is not permitted in this case. The problem is that 
  ** space has already been reserved in the %_segments table, and so the 
  ** start_block and end_block fields of the %_segdir table must be populated. 
  ** And, by design or by accident, released versions of FTS cannot handle 
  ** segments that fit entirely on the root node with start_block!=0.
  **
  ** Instead, create a synthetic root node that contains nothing but a 
  ** pointer to the single content node. So that the segment consists of a
  ** single leaf and a single interior (root) node.
  **
  ** Todo: Better might be to defer allocating space in the %_segments 
  ** table until we are sure it is needed.
  */
  if( iRoot==0 ){
    Blob *pBlock = &pWriter->aNodeWriter[1].block;
    blobGrowBuffer(pBlock, 1 + FTS3_VARINT_MAX, &rc);
    if( rc==SQLITE_OK ){
      pBlock->a[0] = 0x01;
      pBlock->n = 1 + sqlite3Fts3PutVarint(
          &pBlock->a[1], pWriter->aNodeWriter[0].iBlock
      );
    }
    iRoot = 1;
  }
  pRoot = &pWriter->aNodeWriter[iRoot];

  /* Flush all currently outstanding nodes to disk. */
  for(i=0; i<iRoot; i++){
    NodeWriter *pNode = &pWriter->aNodeWriter[i];
    if( pNode->block.n>0 && rc==SQLITE_OK ){
      rc = fts3WriteSegment(p, pNode->iBlock, pNode->block.a, pNode->block.n);
    }
    sqlite3_free(pNode->block.a);
    sqlite3_free(pNode->key.a);
  }

  /* Write the %_segdir record. */
  if( rc==SQLITE_OK ){
    rc = fts3WriteSegdir(p, 
        pWriter->iAbsLevel+1,               /* level */
        pWriter->iIdx,                      /* idx */
        pWriter->iStart,                    /* start_block */
        pWriter->aNodeWriter[0].iBlock,     /* leaves_end_block */
        pWriter->iEnd,                      /* end_block */
        (pWriter->bNoLeafData==0 ? pWriter->nLeafData : 0),   /* end_block */
        pRoot->block.a, pRoot->block.n      /* root */
    );
  }
  sqlite3_free(pRoot->block.a);
  sqlite3_free(pRoot->key.a);

  *pRc = rc;
}

/*
** Compare the term in buffer zLhs (size in bytes nLhs) with that in
** zRhs (size in bytes nRhs) using memcmp. If one term is a prefix of
** the other, it is considered to be smaller than the other.
**
** Return -ve if zLhs is smaller than zRhs, 0 if it is equal, or +ve
** if it is greater.
*/
static int fts3TermCmp(
  const char *zLhs, int nLhs,     /* LHS of comparison */
  const char *zRhs, int nRhs      /* RHS of comparison */
){
  int nCmp = MIN(nLhs, nRhs);
  int res;

  res = (nCmp ? memcmp(zLhs, zRhs, nCmp) : 0);
  if( res==0 ) res = nLhs - nRhs;

  return res;
}


/*
** Query to see if the entry in the %_segments table with blockid iEnd is 
** NULL. If no error occurs and the entry is NULL, set *pbRes 1 before
** returning. Otherwise, set *pbRes to 0. 
**
** Or, if an error occurs while querying the database, return an SQLite 
** error code. The final value of *pbRes is undefined in this case.
**
** This is used to test if a segment is an "appendable" segment. If it
** is, then a NULL entry has been inserted into the %_segments table
** with blockid %_segdir.end_block.
*/
static int fts3IsAppendable(Fts3Table *p, sqlite3_int64 iEnd, int *pbRes){
  int bRes = 0;                   /* Result to set *pbRes to */
  sqlite3_stmt *pCheck = 0;       /* Statement to query database with */
  int rc;                         /* Return code */

  rc = fts3SqlStmt(p, SQL_SEGMENT_IS_APPENDABLE, &pCheck, 0);
  if( rc==SQLITE_OK ){
    sqlite3_bind_int64(pCheck, 1, iEnd);
    if( SQLITE_ROW==sqlite3_step(pCheck) ) bRes = 1;
    rc = sqlite3_reset(pCheck);
  }
  
  *pbRes = bRes;
  return rc;
}

/*
** This function is called when initializing an incremental-merge operation.
** It checks if the existing segment with index value iIdx at absolute level 
** (iAbsLevel+1) can be appended to by the incremental merge. If it can, the
** merge-writer object *pWriter is initialized to write to it.
**
** An existing segment can be appended to by an incremental merge if:
**
**   * It was initially created as an appendable segment (with all required
**     space pre-allocated), and
**
**   * The first key read from the input (arguments zKey and nKey) is 
**     greater than the largest key currently stored in the potential
**     output segment.
*/
static int fts3IncrmergeLoad(
  Fts3Table *p,                   /* Fts3 table handle */
  sqlite3_int64 iAbsLevel,        /* Absolute level of input segments */
  int iIdx,                       /* Index of candidate output segment */
  const char *zKey,               /* First key to write */
  int nKey,                       /* Number of bytes in nKey */
  IncrmergeWriter *pWriter        /* Populate this object */
){
  int rc;                         /* Return code */
  sqlite3_stmt *pSelect = 0;      /* SELECT to read %_segdir entry */

  rc = fts3SqlStmt(p, SQL_SELECT_SEGDIR, &pSelect, 0);
  if( rc==SQLITE_OK ){
    sqlite3_int64 iStart = 0;     /* Value of %_segdir.start_block */
    sqlite3_int64 iLeafEnd = 0;   /* Value of %_segdir.leaves_end_block */
    sqlite3_int64 iEnd = 0;       /* Value of %_segdir.end_block */
    const char *aRoot = 0;        /* Pointer to %_segdir.root buffer */
    int nRoot = 0;                /* Size of aRoot[] in bytes */
    int rc2;                      /* Return code from sqlite3_reset() */
    int bAppendable = 0;          /* Set to true if segment is appendable */

    /* Read the %_segdir entry for index iIdx absolute level (iAbsLevel+1) */
    sqlite3_bind_int64(pSelect, 1, iAbsLevel+1);
    sqlite3_bind_int(pSelect, 2, iIdx);
    if( sqlite3_step(pSelect)==SQLITE_ROW ){
      iStart = sqlite3_column_int64(pSelect, 1);
      iLeafEnd = sqlite3_column_int64(pSelect, 2);
      fts3ReadEndBlockField(pSelect, 3, &iEnd, &pWriter->nLeafData);
      if( pWriter->nLeafData<0 ){
        pWriter->nLeafData = pWriter->nLeafData * -1;
      }
      pWriter->bNoLeafData = (pWriter->nLeafData==0);
      nRoot = sqlite3_column_bytes(pSelect, 4);
      aRoot = sqlite3_column_blob(pSelect, 4);
      if( aRoot==0 ){
        sqlite3_reset(pSelect);
        return nRoot ? SQLITE_NOMEM : FTS_CORRUPT_VTAB;
      }
    }else{
      return sqlite3_reset(pSelect);
    }

    /* Check for the zero-length marker in the %_segments table */
    rc = fts3IsAppendable(p, iEnd, &bAppendable);

    /* Check that zKey/nKey is larger than the largest key the candidate */
    if( rc==SQLITE_OK && bAppendable ){
      char *aLeaf = 0;
      int nLeaf = 0;

      rc = sqlite3Fts3ReadBlock(p, iLeafEnd, &aLeaf, &nLeaf, 0);
      if( rc==SQLITE_OK ){
        NodeReader reader;
        for(rc = nodeReaderInit(&reader, aLeaf, nLeaf);
            rc==SQLITE_OK && reader.aNode;
            rc = nodeReaderNext(&reader)
        ){
          assert( reader.aNode );
        }
        if( fts3TermCmp(zKey, nKey, reader.term.a, reader.term.n)<=0 ){
          bAppendable = 0;
        }
        nodeReaderRelease(&reader);
      }
      sqlite3_free(aLeaf);
    }

    if( rc==SQLITE_OK && bAppendable ){
      /* It is possible to append to this segment. Set up the IncrmergeWriter
      ** object to do so.  */
      int i;
      int nHeight = (int)aRoot[0];
      NodeWriter *pNode;
      if( nHeight<1 || nHeight>=FTS_MAX_APPENDABLE_HEIGHT ){
        sqlite3_reset(pSelect);
        return FTS_CORRUPT_VTAB;
      }

      pWriter->nLeafEst = (int)((iEnd - iStart) + 1)/FTS_MAX_APPENDABLE_HEIGHT;
      pWriter->iStart = iStart;
      pWriter->iEnd = iEnd;
      pWriter->iAbsLevel = iAbsLevel;
      pWriter->iIdx = iIdx;

      for(i=nHeight+1; i<FTS_MAX_APPENDABLE_HEIGHT; i++){
        pWriter->aNodeWriter[i].iBlock = pWriter->iStart + i*pWriter->nLeafEst;
      }

      pNode = &pWriter->aNodeWriter[nHeight];
      pNode->iBlock = pWriter->iStart + pWriter->nLeafEst*nHeight;
      blobGrowBuffer(&pNode->block, 
          MAX(nRoot, p->nNodeSize)+FTS3_NODE_PADDING, &rc
      );
      if( rc==SQLITE_OK ){
        memcpy(pNode->block.a, aRoot, nRoot);
        pNode->block.n = nRoot;
        memset(&pNode->block.a[nRoot], 0, FTS3_NODE_PADDING);
      }

      for(i=nHeight; i>=0 && rc==SQLITE_OK; i--){
        NodeReader reader;
        pNode = &pWriter->aNodeWriter[i];

        if( pNode->block.a){
          rc = nodeReaderInit(&reader, pNode->block.a, pNode->block.n);
          while( reader.aNode && rc==SQLITE_OK ) rc = nodeReaderNext(&reader);
          blobGrowBuffer(&pNode->key, reader.term.n, &rc);
          if( rc==SQLITE_OK ){
            memcpy(pNode->key.a, reader.term.a, reader.term.n);
            pNode->key.n = reader.term.n;
            if( i>0 ){
              char *aBlock = 0;
              int nBlock = 0;
              pNode = &pWriter->aNodeWriter[i-1];
              pNode->iBlock = reader.iChild;
              rc = sqlite3Fts3ReadBlock(p, reader.iChild, &aBlock, &nBlock, 0);
              blobGrowBuffer(&pNode->block, 
                  MAX(nBlock, p->nNodeSize)+FTS3_NODE_PADDING, &rc
              );
              if( rc==SQLITE_OK ){
                memcpy(pNode->block.a, aBlock, nBlock);
                pNode->block.n = nBlock;
                memset(&pNode->block.a[nBlock], 0, FTS3_NODE_PADDING);
              }
              sqlite3_free(aBlock);
            }
          }
        }
        nodeReaderRelease(&reader);
      }
    }

    rc2 = sqlite3_reset(pSelect);
    if( rc==SQLITE_OK ) rc = rc2;
  }

  return rc;
}

/*
** Determine the largest segment index value that exists within absolute
** level iAbsLevel+1. If no error occurs, set *piIdx to this value plus
** one before returning SQLITE_OK. Or, if there are no segments at all 
** within level iAbsLevel, set *piIdx to zero.
**
** If an error occurs, return an SQLite error code. The final value of
** *piIdx is undefined in this case.
*/
static int fts3IncrmergeOutputIdx( 
  Fts3Table *p,                   /* FTS Table handle */
  sqlite3_int64 iAbsLevel,        /* Absolute index of input segments */
  int *piIdx                      /* OUT: Next free index at iAbsLevel+1 */
){
  int rc;
  sqlite3_stmt *pOutputIdx = 0;   /* SQL used to find output index */

  rc = fts3SqlStmt(p, SQL_NEXT_SEGMENT_INDEX, &pOutputIdx, 0);
  if( rc==SQLITE_OK ){
    sqlite3_bind_int64(pOutputIdx, 1, iAbsLevel+1);
    sqlite3_step(pOutputIdx);
    *piIdx = sqlite3_column_int(pOutputIdx, 0);
    rc = sqlite3_reset(pOutputIdx);
  }

  return rc;
}

/* 
** Allocate an appendable output segment on absolute level iAbsLevel+1
** with idx value iIdx.
**
** In the %_segdir table, a segment is defined by the values in three
** columns:
**
**     start_block
**     leaves_end_block
**     end_block
**
** When an appendable segment is allocated, it is estimated that the
** maximum number of leaf blocks that may be required is the sum of the
** number of leaf blocks consumed by the input segments, plus the number
** of input segments, multiplied by two. This value is stored in stack 
** variable nLeafEst.
**
** A total of 16*nLeafEst blocks are allocated when an appendable segment
** is created ((1 + end_block - start_block)==16*nLeafEst). The contiguous
** array of leaf nodes starts at the first block allocated. The array
** of interior nodes that are parents of the leaf nodes start at block
** (start_block + (1 + end_block - start_block) / 16). And so on.
**
** In the actual code below, the value "16" is replaced with the 
** pre-processor macro FTS_MAX_APPENDABLE_HEIGHT.
*/
static int fts3IncrmergeWriter( 
  Fts3Table *p,                   /* Fts3 table handle */
  sqlite3_int64 iAbsLevel,        /* Absolute level of input segments */
  int iIdx,                       /* Index of new output segment */
  Fts3MultiSegReader *pCsr,       /* Cursor that data will be read from */
  IncrmergeWriter *pWriter        /* Populate this object */
){
  int rc;                         /* Return Code */
  int i;                          /* Iterator variable */
  int nLeafEst = 0;               /* Blocks allocated for leaf nodes */
  sqlite3_stmt *pLeafEst = 0;     /* SQL used to determine nLeafEst */
  sqlite3_stmt *pFirstBlock = 0;  /* SQL used to determine first block */

  /* Calculate nLeafEst. */
  rc = fts3SqlStmt(p, SQL_MAX_LEAF_NODE_ESTIMATE, &pLeafEst, 0);
  if( rc==SQLITE_OK ){
    sqlite3_bind_int64(pLeafEst, 1, iAbsLevel);
    sqlite3_bind_int64(pLeafEst, 2, pCsr->nSegment);
    if( SQLITE_ROW==sqlite3_step(pLeafEst) ){
      nLeafEst = sqlite3_column_int(pLeafEst, 0);
    }
    rc = sqlite3_reset(pLeafEst);
  }
  if( rc!=SQLITE_OK ) return rc;

  /* Calculate the first block to use in the output segment */
  rc = fts3SqlStmt(p, SQL_NEXT_SEGMENTS_ID, &pFirstBlock, 0);
  if( rc==SQLITE_OK ){
    if( SQLITE_ROW==sqlite3_step(pFirstBlock) ){
      pWriter->iStart = sqlite3_column_int64(pFirstBlock, 0);
      pWriter->iEnd = pWriter->iStart - 1;
      pWriter->iEnd += nLeafEst * FTS_MAX_APPENDABLE_HEIGHT;
    }
    rc = sqlite3_reset(pFirstBlock);
  }
  if( rc!=SQLITE_OK ) return rc;

  /* Insert the marker in the %_segments table to make sure nobody tries
  ** to steal the space just allocated. This is also used to identify 
  ** appendable segments.  */
  rc = fts3WriteSegment(p, pWriter->iEnd, 0, 0);
  if( rc!=SQLITE_OK ) return rc;

  pWriter->iAbsLevel = iAbsLevel;
  pWriter->nLeafEst = nLeafEst;
  pWriter->iIdx = iIdx;

  /* Set up the array of NodeWriter objects */
  for(i=0; i<FTS_MAX_APPENDABLE_HEIGHT; i++){
    pWriter->aNodeWriter[i].iBlock = pWriter->iStart + i*pWriter->nLeafEst;
  }
  return SQLITE_OK;
}

/*
** Remove an entry from the %_segdir table. This involves running the 
** following two statements:
**
**   DELETE FROM %_segdir WHERE level = :iAbsLevel AND idx = :iIdx
**   UPDATE %_segdir SET idx = idx - 1 WHERE level = :iAbsLevel AND idx > :iIdx
**
** The DELETE statement removes the specific %_segdir level. The UPDATE 
** statement ensures that the remaining segments have contiguously allocated
** idx values.
*/
static int fts3RemoveSegdirEntry(
  Fts3Table *p,                   /* FTS3 table handle */
  sqlite3_int64 iAbsLevel,        /* Absolute level to delete from */
  int iIdx                        /* Index of %_segdir entry to delete */
){
  int rc;                         /* Return code */
  sqlite3_stmt *pDelete = 0;      /* DELETE statement */

  rc = fts3SqlStmt(p, SQL_DELETE_SEGDIR_ENTRY, &pDelete, 0);
  if( rc==SQLITE_OK ){
    sqlite3_bind_int64(pDelete, 1, iAbsLevel);
    sqlite3_bind_int(pDelete, 2, iIdx);
    sqlite3_step(pDelete);
    rc = sqlite3_reset(pDelete);
  }

  return rc;
}

/*
** One or more segments have just been removed from absolute level iAbsLevel.
** Update the 'idx' values of the remaining segments in the level so that
** the idx values are a contiguous sequence starting from 0.
*/
static int fts3RepackSegdirLevel(
  Fts3Table *p,                   /* FTS3 table handle */
  sqlite3_int64 iAbsLevel         /* Absolute level to repack */
){
  int rc;                         /* Return code */
  int *aIdx = 0;                  /* Array of remaining idx values */
  int nIdx = 0;                   /* Valid entries in aIdx[] */
  int nAlloc = 0;                 /* Allocated size of aIdx[] */
  int i;                          /* Iterator variable */
  sqlite3_stmt *pSelect = 0;      /* Select statement to read idx values */
  sqlite3_stmt *pUpdate = 0;      /* Update statement to modify idx values */

  rc = fts3SqlStmt(p, SQL_SELECT_INDEXES, &pSelect, 0);
  if( rc==SQLITE_OK ){
    int rc2;
    sqlite3_bind_int64(pSelect, 1, iAbsLevel);
    while( SQLITE_ROW==sqlite3_step(pSelect) ){
      if( nIdx>=nAlloc ){
        int *aNew;
        nAlloc += 16;
        aNew = sqlite3_realloc(aIdx, nAlloc*sizeof(int));
        if( !aNew ){
          rc = SQLITE_NOMEM;
          break;
        }
        aIdx = aNew;
      }
      aIdx[nIdx++] = sqlite3_column_int(pSelect, 0);
    }
    rc2 = sqlite3_reset(pSelect);
    if( rc==SQLITE_OK ) rc = rc2;
  }

  if( rc==SQLITE_OK ){
    rc = fts3SqlStmt(p, SQL_SHIFT_SEGDIR_ENTRY, &pUpdate, 0);
  }
  if( rc==SQLITE_OK ){
    sqlite3_bind_int64(pUpdate, 2, iAbsLevel);
  }

  assert( p->bIgnoreSavepoint==0 );
  p->bIgnoreSavepoint = 1;
  for(i=0; rc==SQLITE_OK && i<nIdx; i++){
    if( aIdx[i]!=i ){
      sqlite3_bind_int(pUpdate, 3, aIdx[i]);
      sqlite3_bind_int(pUpdate, 1, i);
      sqlite3_step(pUpdate);
      rc = sqlite3_reset(pUpdate);
    }
  }
  p->bIgnoreSavepoint = 0;

  sqlite3_free(aIdx);
  return rc;
}

static void fts3StartNode(Blob *pNode, int iHeight, sqlite3_int64 iChild){
  pNode->a[0] = (char)iHeight;
  if( iChild ){
    assert( pNode->nAlloc>=1+sqlite3Fts3VarintLen(iChild) );
    pNode->n = 1 + sqlite3Fts3PutVarint(&pNode->a[1], iChild);
  }else{
    assert( pNode->nAlloc>=1 );
    pNode->n = 1;
  }
}

/*
** The first two arguments are a pointer to and the size of a segment b-tree
** node. The node may be a leaf or an internal node.
**
** This function creates a new node image in blob object *pNew by copying
** all terms that are greater than or equal to zTerm/nTerm (for leaf nodes)
** or greater than zTerm/nTerm (for internal nodes) from aNode/nNode.
*/
static int fts3TruncateNode(
  const char *aNode,              /* Current node image */
  int nNode,                      /* Size of aNode in bytes */
  Blob *pNew,                     /* OUT: Write new node image here */
  const char *zTerm,              /* Omit all terms smaller than this */
  int nTerm,                      /* Size of zTerm in bytes */
  sqlite3_int64 *piBlock          /* OUT: Block number in next layer down */
){
  NodeReader reader;              /* Reader object */
  Blob prev = {0, 0, 0};          /* Previous term written to new node */
  int rc = SQLITE_OK;             /* Return code */
  int bLeaf;                       /* True for a leaf node */

  if( nNode<1 ) return FTS_CORRUPT_VTAB;
  bLeaf = aNode[0]=='\0';

  /* Allocate required output space */
  blobGrowBuffer(pNew, nNode, &rc);
  if( rc!=SQLITE_OK ) return rc;
  pNew->n = 0;

  /* Populate new node buffer */
  for(rc = nodeReaderInit(&reader, aNode, nNode); 
      rc==SQLITE_OK && reader.aNode; 
      rc = nodeReaderNext(&reader)
  ){
    if( pNew->n==0 ){
      int res = fts3TermCmp(reader.term.a, reader.term.n, zTerm, nTerm);
      if( res<0 || (bLeaf==0 && res==0) ) continue;
      fts3StartNode(pNew, (int)aNode[0], reader.iChild);
      *piBlock = reader.iChild;
    }
    rc = fts3AppendToNode(
        pNew, &prev, reader.term.a, reader.term.n,
        reader.aDoclist, reader.nDoclist
    );
    if( rc!=SQLITE_OK ) break;
  }
  if( pNew->n==0 ){
    fts3StartNode(pNew, (int)aNode[0], reader.iChild);
    *piBlock = reader.iChild;
  }
  assert( pNew->n<=pNew->nAlloc );

  nodeReaderRelease(&reader);
  sqlite3_free(prev.a);
  return rc;
}

/*
** Remove all terms smaller than zTerm/nTerm from segment iIdx in absolute 
** level iAbsLevel. This may involve deleting entries from the %_segments
** table, and modifying existing entries in both the %_segments and %_segdir
** tables.
**
** SQLITE_OK is returned if the segment is updated successfully. Or an
** SQLite error code otherwise.
*/
static int fts3TruncateSegment(
  Fts3Table *p,                   /* FTS3 table handle */
  sqlite3_int64 iAbsLevel,        /* Absolute level of segment to modify */
  int iIdx,                       /* Index within level of segment to modify */
  const char *zTerm,              /* Remove terms smaller than this */
  int nTerm                      /* Number of bytes in buffer zTerm */
){
  int rc = SQLITE_OK;             /* Return code */
  Blob root = {0,0,0};            /* New root page image */
  Blob block = {0,0,0};           /* Buffer used for any other block */
  sqlite3_int64 iBlock = 0;       /* Block id */
  sqlite3_int64 iNewStart = 0;    /* New value for iStartBlock */
  sqlite3_int64 iOldStart = 0;    /* Old value for iStartBlock */
  sqlite3_stmt *pFetch = 0;       /* Statement used to fetch segdir */

  rc = fts3SqlStmt(p, SQL_SELECT_SEGDIR, &pFetch, 0);
  if( rc==SQLITE_OK ){
    int rc2;                      /* sqlite3_reset() return code */
    sqlite3_bind_int64(pFetch, 1, iAbsLevel);
    sqlite3_bind_int(pFetch, 2, iIdx);
    if( SQLITE_ROW==sqlite3_step(pFetch) ){
      const char *aRoot = sqlite3_column_blob(pFetch, 4);
      int nRoot = sqlite3_column_bytes(pFetch, 4);
      iOldStart = sqlite3_column_int64(pFetch, 1);
      rc = fts3TruncateNode(aRoot, nRoot, &root, zTerm, nTerm, &iBlock);
    }
    rc2 = sqlite3_reset(pFetch);
    if( rc==SQLITE_OK ) rc = rc2;
  }

  while( rc==SQLITE_OK && iBlock ){
    char *aBlock = 0;
    int nBlock = 0;
    iNewStart = iBlock;

    rc = sqlite3Fts3ReadBlock(p, iBlock, &aBlock, &nBlock, 0);
    if( rc==SQLITE_OK ){
      rc = fts3TruncateNode(aBlock, nBlock, &block, zTerm, nTerm, &iBlock);
    }
    if( rc==SQLITE_OK ){
      rc = fts3WriteSegment(p, iNewStart, block.a, block.n);
    }
    sqlite3_free(aBlock);
  }

  /* Variable iNewStart now contains the first valid leaf node. */
  if( rc==SQLITE_OK && iNewStart ){
    sqlite3_stmt *pDel = 0;
    rc = fts3SqlStmt(p, SQL_DELETE_SEGMENTS_RANGE, &pDel, 0);
    if( rc==SQLITE_OK ){
      sqlite3_bind_int64(pDel, 1, iOldStart);
      sqlite3_bind_int64(pDel, 2, iNewStart-1);
      sqlite3_step(pDel);
      rc = sqlite3_reset(pDel);
    }
  }

  if( rc==SQLITE_OK ){
    sqlite3_stmt *pChomp = 0;
    rc = fts3SqlStmt(p, SQL_CHOMP_SEGDIR, &pChomp, 0);
    if( rc==SQLITE_OK ){
      sqlite3_bind_int64(pChomp, 1, iNewStart);
      sqlite3_bind_blob(pChomp, 2, root.a, root.n, SQLITE_STATIC);
      sqlite3_bind_int64(pChomp, 3, iAbsLevel);
      sqlite3_bind_int(pChomp, 4, iIdx);
      sqlite3_step(pChomp);
      rc = sqlite3_reset(pChomp);
      sqlite3_bind_null(pChomp, 2);
    }
  }

  sqlite3_free(root.a);
  sqlite3_free(block.a);
  return rc;
}

/*
** This function is called after an incrmental-merge operation has run to
** merge (or partially merge) two or more segments from absolute level
** iAbsLevel.
**
** Each input segment is either removed from the db completely (if all of
** its data was copied to the output segment by the incrmerge operation)
** or modified in place so that it no longer contains those entries that
** have been duplicated in the output segment.
*/
static int fts3IncrmergeChomp(
  Fts3Table *p,                   /* FTS table handle */
  sqlite3_int64 iAbsLevel,        /* Absolute level containing segments */
  Fts3MultiSegReader *pCsr,       /* Chomp all segments opened by this cursor */
  int *pnRem                      /* Number of segments not deleted */
){
  int i;
  int nRem = 0;
  int rc = SQLITE_OK;

  for(i=pCsr->nSegment-1; i>=0 && rc==SQLITE_OK; i--){
    Fts3SegReader *pSeg = 0;
    int j;

    /* Find the Fts3SegReader object with Fts3SegReader.iIdx==i. It is hiding
    ** somewhere in the pCsr->apSegment[] array.  */
    for(j=0; ALWAYS(j<pCsr->nSegment); j++){
      pSeg = pCsr->apSegment[j];
      if( pSeg->iIdx==i ) break;
    }
    assert( j<pCsr->nSegment && pSeg->iIdx==i );

    if( pSeg->aNode==0 ){
      /* Seg-reader is at EOF. Remove the entire input segment. */
      rc = fts3DeleteSegment(p, pSeg);
      if( rc==SQLITE_OK ){
        rc = fts3RemoveSegdirEntry(p, iAbsLevel, pSeg->iIdx);
      }
      *pnRem = 0;
    }else{
      /* The incremental merge did not copy all the data from this 
      ** segment to the upper level. The segment is modified in place
      ** so that it contains no keys smaller than zTerm/nTerm. */ 
      const char *zTerm = pSeg->zTerm;
      int nTerm = pSeg->nTerm;
      rc = fts3TruncateSegment(p, iAbsLevel, pSeg->iIdx, zTerm, nTerm);
      nRem++;
    }
  }

  if( rc==SQLITE_OK && nRem!=pCsr->nSegment ){
    rc = fts3RepackSegdirLevel(p, iAbsLevel);
  }

  *pnRem = nRem;
  return rc;
}

/*
** Store an incr-merge hint in the database.
*/
static int fts3IncrmergeHintStore(Fts3Table *p, Blob *pHint){
  sqlite3_stmt *pReplace = 0;
  int rc;                         /* Return code */

  rc = fts3SqlStmt(p, SQL_REPLACE_STAT, &pReplace, 0);
  if( rc==SQLITE_OK ){
    sqlite3_bind_int(pReplace, 1, FTS_STAT_INCRMERGEHINT);
    sqlite3_bind_blob(pReplace, 2, pHint->a, pHint->n, SQLITE_STATIC);
    sqlite3_step(pReplace);
    rc = sqlite3_reset(pReplace);
    sqlite3_bind_null(pReplace, 2);
  }

  return rc;
}

/*
** Load an incr-merge hint from the database. The incr-merge hint, if one 
** exists, is stored in the rowid==1 row of the %_stat table.
**
** If successful, populate blob *pHint with the value read from the %_stat
** table and return SQLITE_OK. Otherwise, if an error occurs, return an
** SQLite error code.
*/
static int fts3IncrmergeHintLoad(Fts3Table *p, Blob *pHint){
  sqlite3_stmt *pSelect = 0;
  int rc;

  pHint->n = 0;
  rc = fts3SqlStmt(p, SQL_SELECT_STAT, &pSelect, 0);
  if( rc==SQLITE_OK ){
    int rc2;
    sqlite3_bind_int(pSelect, 1, FTS_STAT_INCRMERGEHINT);
    if( SQLITE_ROW==sqlite3_step(pSelect) ){
      const char *aHint = sqlite3_column_blob(pSelect, 0);
      int nHint = sqlite3_column_bytes(pSelect, 0);
      if( aHint ){
        blobGrowBuffer(pHint, nHint, &rc);
        if( rc==SQLITE_OK ){
          memcpy(pHint->a, aHint, nHint);
          pHint->n = nHint;
        }
      }
    }
    rc2 = sqlite3_reset(pSelect);
    if( rc==SQLITE_OK ) rc = rc2;
  }

  return rc;
}

/*
** If *pRc is not SQLITE_OK when this function is called, it is a no-op.
** Otherwise, append an entry to the hint stored in blob *pHint. Each entry
** consists of two varints, the absolute level number of the input segments 
** and the number of input segments.
**
** If successful, leave *pRc set to SQLITE_OK and return. If an error occurs,
** set *pRc to an SQLite error code before returning.
*/
static void fts3IncrmergeHintPush(
  Blob *pHint,                    /* Hint blob to append to */
  i64 iAbsLevel,                  /* First varint to store in hint */
  int nInput,                     /* Second varint to store in hint */
  int *pRc                        /* IN/OUT: Error code */
){
  blobGrowBuffer(pHint, pHint->n + 2*FTS3_VARINT_MAX, pRc);
  if( *pRc==SQLITE_OK ){
    pHint->n += sqlite3Fts3PutVarint(&pHint->a[pHint->n], iAbsLevel);
    pHint->n += sqlite3Fts3PutVarint(&pHint->a[pHint->n], (i64)nInput);
  }
}

/*
** Read the last entry (most recently pushed) from the hint blob *pHint
** and then remove the entry. Write the two values read to *piAbsLevel and 
** *pnInput before returning.
**
** If no error occurs, return SQLITE_OK. If the hint blob in *pHint does
** not contain at least two valid varints, return SQLITE_CORRUPT_VTAB.
*/
static int fts3IncrmergeHintPop(Blob *pHint, i64 *piAbsLevel, int *pnInput){
  const int nHint = pHint->n;
  int i;

  i = pHint->n-1;
  if( (pHint->a[i] & 0x80) ) return FTS_CORRUPT_VTAB;
  while( i>0 && (pHint->a[i-1] & 0x80) ) i--;
  if( i==0 ) return FTS_CORRUPT_VTAB;
  i--;
  while( i>0 && (pHint->a[i-1] & 0x80) ) i--;

  pHint->n = i;
  i += sqlite3Fts3GetVarint(&pHint->a[i], piAbsLevel);
  i += fts3GetVarint32(&pHint->a[i], pnInput);
  assert( i<=nHint );
  if( i!=nHint ) return FTS_CORRUPT_VTAB;

  return SQLITE_OK;
}


/*
** Attempt an incremental merge that writes nMerge leaf blocks.
**
** Incremental merges happen nMin segments at a time. The segments 
** to be merged are the nMin oldest segments (the ones with the smallest 
** values for the _segdir.idx field) in the highest level that contains 
** at least nMin segments. Multiple merges might occur in an attempt to 
** write the quota of nMerge leaf blocks.
*/
int sqlite3Fts3Incrmerge(Fts3Table *p, int nMerge, int nMin){
  int rc;                         /* Return code */
  int nRem = nMerge;              /* Number of leaf pages yet to  be written */
  Fts3MultiSegReader *pCsr;       /* Cursor used to read input data */
  Fts3SegFilter *pFilter;         /* Filter used with cursor pCsr */
  IncrmergeWriter *pWriter;       /* Writer object */
  int nSeg = 0;                   /* Number of input segments */
  sqlite3_int64 iAbsLevel = 0;    /* Absolute level number to work on */
  Blob hint = {0, 0, 0};          /* Hint read from %_stat table */
  int bDirtyHint = 0;             /* True if blob 'hint' has been modified */

  /* Allocate space for the cursor, filter and writer objects */
  const int nAlloc = sizeof(*pCsr) + sizeof(*pFilter) + sizeof(*pWriter);
  pWriter = (IncrmergeWriter *)sqlite3_malloc(nAlloc);
  if( !pWriter ) return SQLITE_NOMEM;
  pFilter = (Fts3SegFilter *)&pWriter[1];
  pCsr = (Fts3MultiSegReader *)&pFilter[1];

  rc = fts3IncrmergeHintLoad(p, &hint);
  while( rc==SQLITE_OK && nRem>0 ){
    const i64 nMod = FTS3_SEGDIR_MAXLEVEL * p->nIndex;
    sqlite3_stmt *pFindLevel = 0; /* SQL used to determine iAbsLevel */
    int bUseHint = 0;             /* True if attempting to append */
    int iIdx = 0;                 /* Largest idx in level (iAbsLevel+1) */

    /* Search the %_segdir table for the absolute level with the smallest
    ** relative level number that contains at least nMin segments, if any.
    ** If one is found, set iAbsLevel to the absolute level number and
    ** nSeg to nMin. If no level with at least nMin segments can be found, 
    ** set nSeg to -1.
    */
    rc = fts3SqlStmt(p, SQL_FIND_MERGE_LEVEL, &pFindLevel, 0);
    sqlite3_bind_int(pFindLevel, 1, MAX(2, nMin));
    if( sqlite3_step(pFindLevel)==SQLITE_ROW ){
      iAbsLevel = sqlite3_column_int64(pFindLevel, 0);
      nSeg = sqlite3_column_int(pFindLevel, 1);
      assert( nSeg>=2 );
    }else{
      nSeg = -1;
    }
    rc = sqlite3_reset(pFindLevel);

    /* If the hint read from the %_stat table is not empty, check if the
    ** last entry in it specifies a relative level smaller than or equal
    ** to the level identified by the block above (if any). If so, this 
    ** iteration of the loop will work on merging at the hinted level.
    */
    if( rc==SQLITE_OK && hint.n ){
      int nHint = hint.n;
      sqlite3_int64 iHintAbsLevel = 0;      /* Hint level */
      int nHintSeg = 0;                     /* Hint number of segments */

      rc = fts3IncrmergeHintPop(&hint, &iHintAbsLevel, &nHintSeg);
      if( nSeg<0 || (iAbsLevel % nMod) >= (iHintAbsLevel % nMod) ){
        /* Based on the scan in the block above, it is known that there
        ** are no levels with a relative level smaller than that of
        ** iAbsLevel with more than nSeg segments, or if nSeg is -1, 
        ** no levels with more than nMin segments. Use this to limit the
        ** value of nHintSeg to avoid a large memory allocation in case the 
        ** merge-hint is corrupt*/
        iAbsLevel = iHintAbsLevel;
        nSeg = MIN(MAX(nMin,nSeg), nHintSeg);
        bUseHint = 1;
        bDirtyHint = 1;
      }else{
        /* This undoes the effect of the HintPop() above - so that no entry
        ** is removed from the hint blob.  */
        hint.n = nHint;
      }
    }

    /* If nSeg is less that zero, then there is no level with at least
    ** nMin segments and no hint in the %_stat table. No work to do.
    ** Exit early in this case.  */
    if( nSeg<=0 ) break;

    assert( nMod<=0x7FFFFFFF );
    if( iAbsLevel<0 || iAbsLevel>(nMod<<32) ){
      rc = FTS_CORRUPT_VTAB;
      break;
    }

    /* Open a cursor to iterate through the contents of the oldest nSeg 
    ** indexes of absolute level iAbsLevel. If this cursor is opened using 
    ** the 'hint' parameters, it is possible that there are less than nSeg
    ** segments available in level iAbsLevel. In this case, no work is
    ** done on iAbsLevel - fall through to the next iteration of the loop 
    ** to start work on some other level.  */
    memset(pWriter, 0, nAlloc);
    pFilter->flags = FTS3_SEGMENT_REQUIRE_POS;

    if( rc==SQLITE_OK ){
      rc = fts3IncrmergeOutputIdx(p, iAbsLevel, &iIdx);
      assert( bUseHint==1 || bUseHint==0 );
      if( iIdx==0 || (bUseHint && iIdx==1) ){
        int bIgnore = 0;
        rc = fts3SegmentIsMaxLevel(p, iAbsLevel+1, &bIgnore);
        if( bIgnore ){
          pFilter->flags |= FTS3_SEGMENT_IGNORE_EMPTY;
        }
      }
    }

    if( rc==SQLITE_OK ){
      rc = fts3IncrmergeCsr(p, iAbsLevel, nSeg, pCsr);
    }
    if( SQLITE_OK==rc && pCsr->nSegment==nSeg
     && SQLITE_OK==(rc = sqlite3Fts3SegReaderStart(p, pCsr, pFilter))
    ){
      int bEmpty = 0;
      rc = sqlite3Fts3SegReaderStep(p, pCsr);
      if( rc==SQLITE_OK ){
        bEmpty = 1;
      }else if( rc!=SQLITE_ROW ){
        sqlite3Fts3SegReaderFinish(pCsr);
        break;
      }
      if( bUseHint && iIdx>0 ){
        const char *zKey = pCsr->zTerm;
        int nKey = pCsr->nTerm;
        rc = fts3IncrmergeLoad(p, iAbsLevel, iIdx-1, zKey, nKey, pWriter);
      }else{
        rc = fts3IncrmergeWriter(p, iAbsLevel, iIdx, pCsr, pWriter);
      }

      if( rc==SQLITE_OK && pWriter->nLeafEst ){
        fts3LogMerge(nSeg, iAbsLevel);
        if( bEmpty==0 ){
          do {
            rc = fts3IncrmergeAppend(p, pWriter, pCsr);
            if( rc==SQLITE_OK ) rc = sqlite3Fts3SegReaderStep(p, pCsr);
            if( pWriter->nWork>=nRem && rc==SQLITE_ROW ) rc = SQLITE_OK;
          }while( rc==SQLITE_ROW );
        }

        /* Update or delete the input segments */
        if( rc==SQLITE_OK ){
          nRem -= (1 + pWriter->nWork);
          rc = fts3IncrmergeChomp(p, iAbsLevel, pCsr, &nSeg);
          if( nSeg!=0 ){
            bDirtyHint = 1;
            fts3IncrmergeHintPush(&hint, iAbsLevel, nSeg, &rc);
          }
        }
      }

      if( nSeg!=0 ){
        pWriter->nLeafData = pWriter->nLeafData * -1;
      }
      fts3IncrmergeRelease(p, pWriter, &rc);
      if( nSeg==0 && pWriter->bNoLeafData==0 ){
        fts3PromoteSegments(p, iAbsLevel+1, pWriter->nLeafData);
      }
    }

    sqlite3Fts3SegReaderFinish(pCsr);
  }

  /* Write the hint values into the %_stat table for the next incr-merger */
  if( bDirtyHint && rc==SQLITE_OK ){
    rc = fts3IncrmergeHintStore(p, &hint);
  }

  sqlite3_free(pWriter);
  sqlite3_free(hint.a);
  return rc;
}

/*
** Convert the text beginning at *pz into an integer and return
** its value.  Advance *pz to point to the first character past
** the integer.
**
** This function used for parameters to merge= and incrmerge=
** commands. 
*/
static int fts3Getint(const char **pz){
  const char *z = *pz;
  int i = 0;
  while( (*z)>='0' && (*z)<='9' && i<214748363 ) i = 10*i + *(z++) - '0';
  *pz = z;
  return i;
}

/*
** Process statements of the form:
**
**    INSERT INTO table(table) VALUES('merge=A,B');
**
** A and B are integers that decode to be the number of leaf pages
** written for the merge, and the minimum number of segments on a level
** before it will be selected for a merge, respectively.
*/
static int fts3DoIncrmerge(
  Fts3Table *p,                   /* FTS3 table handle */
  const char *zParam              /* Nul-terminated string containing "A,B" */
){
  int rc;
  int nMin = (MergeCount(p) / 2);
  int nMerge = 0;
  const char *z = zParam;

  /* Read the first integer value */
  nMerge = fts3Getint(&z);

  /* If the first integer value is followed by a ',',  read the second
  ** integer value. */
  if( z[0]==',' && z[1]!='\0' ){
    z++;
    nMin = fts3Getint(&z);
  }

  if( z[0]!='\0' || nMin<2 ){
    rc = SQLITE_ERROR;
  }else{
    rc = SQLITE_OK;
    if( !p->bHasStat ){
      assert( p->bFts4==0 );
      sqlite3Fts3CreateStatTable(&rc, p);
    }
    if( rc==SQLITE_OK ){
      rc = sqlite3Fts3Incrmerge(p, nMerge, nMin);
    }
    sqlite3Fts3SegmentsClose(p);
  }
  return rc;
}

/*
** Process statements of the form:
**
**    INSERT INTO table(table) VALUES('automerge=X');
**
** where X is an integer.  X==0 means to turn automerge off.  X!=0 means
** turn it on.  The setting is persistent.
*/
static int fts3DoAutoincrmerge(
  Fts3Table *p,                   /* FTS3 table handle */
  const char *zParam              /* Nul-terminated string containing boolean */
){
  int rc = SQLITE_OK;
  sqlite3_stmt *pStmt = 0;
  p->nAutoincrmerge = fts3Getint(&zParam);
  if( p->nAutoincrmerge==1 || p->nAutoincrmerge>MergeCount(p) ){
    p->nAutoincrmerge = 8;
  }
  if( !p->bHasStat ){
    assert( p->bFts4==0 );
    sqlite3Fts3CreateStatTable(&rc, p);
    if( rc ) return rc;
  }
  rc = fts3SqlStmt(p, SQL_REPLACE_STAT, &pStmt, 0);
  if( rc ) return rc;
  sqlite3_bind_int(pStmt, 1, FTS_STAT_AUTOINCRMERGE);
  sqlite3_bind_int(pStmt, 2, p->nAutoincrmerge);
  sqlite3_step(pStmt);
  rc = sqlite3_reset(pStmt);
  return rc;
}

/*
** Return a 64-bit checksum for the FTS index entry specified by the
** arguments to this function.
*/
static u64 fts3ChecksumEntry(
  const char *zTerm,              /* Pointer to buffer containing term */
  int nTerm,                      /* Size of zTerm in bytes */
  int iLangid,                    /* Language id for current row */
  int iIndex,                     /* Index (0..Fts3Table.nIndex-1) */
  i64 iDocid,                     /* Docid for current row. */
  int iCol,                       /* Column number */
  int iPos                        /* Position */
){
  int i;
  u64 ret = (u64)iDocid;

  ret += (ret<<3) + iLangid;
  ret += (ret<<3) + iIndex;
  ret += (ret<<3) + iCol;
  ret += (ret<<3) + iPos;
  for(i=0; i<nTerm; i++) ret += (ret<<3) + zTerm[i];

  return ret;
}

/*
** Return a checksum of all entries in the FTS index that correspond to
** language id iLangid. The checksum is calculated by XORing the checksums
** of each individual entry (see fts3ChecksumEntry()) together.
**
** If successful, the checksum value is returned and *pRc set to SQLITE_OK.
** Otherwise, if an error occurs, *pRc is set to an SQLite error code. The
** return value is undefined in this case.
*/
static u64 fts3ChecksumIndex(
  Fts3Table *p,                   /* FTS3 table handle */
  int iLangid,                    /* Language id to return cksum for */
  int iIndex,                     /* Index to cksum (0..p->nIndex-1) */
  int *pRc                        /* OUT: Return code */
){
  Fts3SegFilter filter;
  Fts3MultiSegReader csr;
  int rc;
  u64 cksum = 0;

  assert( *pRc==SQLITE_OK );

  memset(&filter, 0, sizeof(filter));
  memset(&csr, 0, sizeof(csr));
  filter.flags =  FTS3_SEGMENT_REQUIRE_POS|FTS3_SEGMENT_IGNORE_EMPTY;
  filter.flags |= FTS3_SEGMENT_SCAN;

  rc = sqlite3Fts3SegReaderCursor(
      p, iLangid, iIndex, FTS3_SEGCURSOR_ALL, 0, 0, 0, 1,&csr
  );
  if( rc==SQLITE_OK ){
    rc = sqlite3Fts3SegReaderStart(p, &csr, &filter);
  }

  if( rc==SQLITE_OK ){
    while( SQLITE_ROW==(rc = sqlite3Fts3SegReaderStep(p, &csr)) ){
      char *pCsr = csr.aDoclist;
      char *pEnd = &pCsr[csr.nDoclist];

      i64 iDocid = 0;
      i64 iCol = 0;
      u64 iPos = 0;

      pCsr += sqlite3Fts3GetVarint(pCsr, &iDocid);
      while( pCsr<pEnd ){
        u64 iVal = 0;
        pCsr += sqlite3Fts3GetVarintU(pCsr, &iVal);
        if( pCsr<pEnd ){
          if( iVal==0 || iVal==1 ){
            iCol = 0;
            iPos = 0;
            if( iVal ){
              pCsr += sqlite3Fts3GetVarint(pCsr, &iCol);
            }else{
              pCsr += sqlite3Fts3GetVarintU(pCsr, &iVal);
              if( p->bDescIdx ){
                iDocid = (i64)((u64)iDocid - iVal);
              }else{
                iDocid = (i64)((u64)iDocid + iVal);
              }
            }
          }else{
            iPos += (iVal - 2);
            cksum = cksum ^ fts3ChecksumEntry(
                csr.zTerm, csr.nTerm, iLangid, iIndex, iDocid,
                (int)iCol, (int)iPos
            );
          }
        }
      }
    }
  }
  sqlite3Fts3SegReaderFinish(&csr);

  *pRc = rc;
  return cksum;
}

/*
** Check if the contents of the FTS index match the current contents of the
** content table. If no error occurs and the contents do match, set *pbOk
** to true and return SQLITE_OK. Or if the contents do not match, set *pbOk
** to false before returning.
**
** If an error occurs (e.g. an OOM or IO error), return an SQLite error 
** code. The final value of *pbOk is undefined in this case.
*/
static int fts3IntegrityCheck(Fts3Table *p, int *pbOk){
  int rc = SQLITE_OK;             /* Return code */
  u64 cksum1 = 0;                 /* Checksum based on FTS index contents */
  u64 cksum2 = 0;                 /* Checksum based on %_content contents */
  sqlite3_stmt *pAllLangid = 0;   /* Statement to return all language-ids */

  /* This block calculates the checksum according to the FTS index. */
  rc = fts3SqlStmt(p, SQL_SELECT_ALL_LANGID, &pAllLangid, 0);
  if( rc==SQLITE_OK ){
    int rc2;
    sqlite3_bind_int(pAllLangid, 1, p->iPrevLangid);
    sqlite3_bind_int(pAllLangid, 2, p->nIndex);
    while( rc==SQLITE_OK && sqlite3_step(pAllLangid)==SQLITE_ROW ){
      int iLangid = sqlite3_column_int(pAllLangid, 0);
      int i;
      for(i=0; i<p->nIndex; i++){
        cksum1 = cksum1 ^ fts3ChecksumIndex(p, iLangid, i, &rc);
      }
    }
    rc2 = sqlite3_reset(pAllLangid);
    if( rc==SQLITE_OK ) rc = rc2;
  }

  /* This block calculates the checksum according to the %_content table */
  if( rc==SQLITE_OK ){
    sqlite3_tokenizer_module const *pModule = p->pTokenizer->pModule;
    sqlite3_stmt *pStmt = 0;
    char *zSql;
   
    zSql = sqlite3_mprintf("SELECT %s" , p->zReadExprlist);
    if( !zSql ){
      rc = SQLITE_NOMEM;
    }else{
      rc = sqlite3_prepare_v2(p->db, zSql, -1, &pStmt, 0);
      sqlite3_free(zSql);
    }

    while( rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pStmt) ){
      i64 iDocid = sqlite3_column_int64(pStmt, 0);
      int iLang = langidFromSelect(p, pStmt);
      int iCol;

      for(iCol=0; rc==SQLITE_OK && iCol<p->nColumn; iCol++){
        if( p->abNotindexed[iCol]==0 ){
          const char *zText = (const char *)sqlite3_column_text(pStmt, iCol+1);
          sqlite3_tokenizer_cursor *pT = 0;

          rc = sqlite3Fts3OpenTokenizer(p->pTokenizer, iLang, zText, -1, &pT);
          while( rc==SQLITE_OK ){
            char const *zToken;       /* Buffer containing token */
            int nToken = 0;           /* Number of bytes in token */
            int iDum1 = 0, iDum2 = 0; /* Dummy variables */
            int iPos = 0;             /* Position of token in zText */

            rc = pModule->xNext(pT, &zToken, &nToken, &iDum1, &iDum2, &iPos);
            if( rc==SQLITE_OK ){
              int i;
              cksum2 = cksum2 ^ fts3ChecksumEntry(
                  zToken, nToken, iLang, 0, iDocid, iCol, iPos
              );
              for(i=1; i<p->nIndex; i++){
                if( p->aIndex[i].nPrefix<=nToken ){
                  cksum2 = cksum2 ^ fts3ChecksumEntry(
                      zToken, p->aIndex[i].nPrefix, iLang, i, iDocid, iCol, iPos
                  );
                }
              }
            }
          }
          if( pT ) pModule->xClose(pT);
          if( rc==SQLITE_DONE ) rc = SQLITE_OK;
        }
      }
    }

    sqlite3_finalize(pStmt);
  }

  *pbOk = (cksum1==cksum2);
  return rc;
}

/*
** Run the integrity-check. If no error occurs and the current contents of
** the FTS index are correct, return SQLITE_OK. Or, if the contents of the
** FTS index are incorrect, return SQLITE_CORRUPT_VTAB.
**
** Or, if an error (e.g. an OOM or IO error) occurs, return an SQLite 
** error code.
**
** The integrity-check works as follows. For each token and indexed token
** prefix in the document set, a 64-bit checksum is calculated (by code
** in fts3ChecksumEntry()) based on the following:
**
**     + The index number (0 for the main index, 1 for the first prefix
**       index etc.),
**     + The token (or token prefix) text itself, 
**     + The language-id of the row it appears in,
**     + The docid of the row it appears in,
**     + The column it appears in, and
**     + The tokens position within that column.
**
** The checksums for all entries in the index are XORed together to create
** a single checksum for the entire index.
**
** The integrity-check code calculates the same checksum in two ways:
**
**     1. By scanning the contents of the FTS index, and 
**     2. By scanning and tokenizing the content table.
**
** If the two checksums are identical, the integrity-check is deemed to have
** passed.
*/
static int fts3DoIntegrityCheck(
  Fts3Table *p                    /* FTS3 table handle */
){
  int rc;
  int bOk = 0;
  rc = fts3IntegrityCheck(p, &bOk);
  if( rc==SQLITE_OK && bOk==0 ) rc = FTS_CORRUPT_VTAB;
  return rc;
}

/*
** Handle a 'special' INSERT of the form:
**
**   "INSERT INTO tbl(tbl) VALUES(<expr>)"
**
** Argument pVal contains the result of <expr>. Currently the only 
** meaningful value to insert is the text 'optimize'.
*/
static int fts3SpecialInsert(Fts3Table *p, sqlite3_value *pVal){
  int rc = SQLITE_ERROR;           /* Return Code */
  const char *zVal = (const char *)sqlite3_value_text(pVal);
  int nVal = sqlite3_value_bytes(pVal);

  if( !zVal ){
    return SQLITE_NOMEM;
  }else if( nVal==8 && 0==sqlite3_strnicmp(zVal, "optimize", 8) ){
    rc = fts3DoOptimize(p, 0);
  }else if( nVal==7 && 0==sqlite3_strnicmp(zVal, "rebuild", 7) ){
    rc = fts3DoRebuild(p);
  }else if( nVal==15 && 0==sqlite3_strnicmp(zVal, "integrity-check", 15) ){
    rc = fts3DoIntegrityCheck(p);
  }else if( nVal>6 && 0==sqlite3_strnicmp(zVal, "merge=", 6) ){
    rc = fts3DoIncrmerge(p, &zVal[6]);
  }else if( nVal>10 && 0==sqlite3_strnicmp(zVal, "automerge=", 10) ){
    rc = fts3DoAutoincrmerge(p, &zVal[10]);
#if defined(SQLITE_DEBUG) || defined(SQLITE_TEST)
  }else{
    int v;
    if( nVal>9 && 0==sqlite3_strnicmp(zVal, "nodesize=", 9) ){
      v = atoi(&zVal[9]);
      if( v>=24 && v<=p->nPgsz-35 ) p->nNodeSize = v;
      rc = SQLITE_OK;
    }else if( nVal>11 && 0==sqlite3_strnicmp(zVal, "maxpending=", 9) ){
      v = atoi(&zVal[11]);
      if( v>=64 && v<=FTS3_MAX_PENDING_DATA ) p->nMaxPendingData = v;
      rc = SQLITE_OK;
    }else if( nVal>21 && 0==sqlite3_strnicmp(zVal,"test-no-incr-doclist=",21) ){
      p->bNoIncrDoclist = atoi(&zVal[21]);
      rc = SQLITE_OK;
    }else if( nVal>11 && 0==sqlite3_strnicmp(zVal,"mergecount=",11) ){
      v = atoi(&zVal[11]);
      if( v>=4 && v<=FTS3_MERGE_COUNT && (v&1)==0 ) p->nMergeCount = v;
      rc = SQLITE_OK;
    }
#endif
  }
  return rc;
}

#ifndef SQLITE_DISABLE_FTS4_DEFERRED
/*
** Delete all cached deferred doclists. Deferred doclists are cached
** (allocated) by the sqlite3Fts3CacheDeferredDoclists() function.
*/
void sqlite3Fts3FreeDeferredDoclists(Fts3Cursor *pCsr){
  Fts3DeferredToken *pDef;
  for(pDef=pCsr->pDeferred; pDef; pDef=pDef->pNext){
    fts3PendingListDelete(pDef->pList);
    pDef->pList = 0;
  }
}

/*
** Free all entries in the pCsr->pDeffered list. Entries are added to 
** this list using sqlite3Fts3DeferToken().
*/
void sqlite3Fts3FreeDeferredTokens(Fts3Cursor *pCsr){
  Fts3DeferredToken *pDef;
  Fts3DeferredToken *pNext;
  for(pDef=pCsr->pDeferred; pDef; pDef=pNext){
    pNext = pDef->pNext;
    fts3PendingListDelete(pDef->pList);
    sqlite3_free(pDef);
  }
  pCsr->pDeferred = 0;
}

/*
** Generate deferred-doclists for all tokens in the pCsr->pDeferred list
** based on the row that pCsr currently points to.
**
** A deferred-doclist is like any other doclist with position information
** included, except that it only contains entries for a single row of the
** table, not for all rows.
*/
int sqlite3Fts3CacheDeferredDoclists(Fts3Cursor *pCsr){
  int rc = SQLITE_OK;             /* Return code */
  if( pCsr->pDeferred ){
    int i;                        /* Used to iterate through table columns */
    sqlite3_int64 iDocid;         /* Docid of the row pCsr points to */
    Fts3DeferredToken *pDef;      /* Used to iterate through deferred tokens */
  
    Fts3Table *p = (Fts3Table *)pCsr->base.pVtab;
    sqlite3_tokenizer *pT = p->pTokenizer;
    sqlite3_tokenizer_module const *pModule = pT->pModule;
   
    assert( pCsr->isRequireSeek==0 );
    iDocid = sqlite3_column_int64(pCsr->pStmt, 0);
  
    for(i=0; i<p->nColumn && rc==SQLITE_OK; i++){
      if( p->abNotindexed[i]==0 ){
        const char *zText = (const char *)sqlite3_column_text(pCsr->pStmt, i+1);
        sqlite3_tokenizer_cursor *pTC = 0;

        rc = sqlite3Fts3OpenTokenizer(pT, pCsr->iLangid, zText, -1, &pTC);
        while( rc==SQLITE_OK ){
          char const *zToken;       /* Buffer containing token */
          int nToken = 0;           /* Number of bytes in token */
          int iDum1 = 0, iDum2 = 0; /* Dummy variables */
          int iPos = 0;             /* Position of token in zText */

          rc = pModule->xNext(pTC, &zToken, &nToken, &iDum1, &iDum2, &iPos);
          for(pDef=pCsr->pDeferred; pDef && rc==SQLITE_OK; pDef=pDef->pNext){
            Fts3PhraseToken *pPT = pDef->pToken;
            if( (pDef->iCol>=p->nColumn || pDef->iCol==i)
                && (pPT->bFirst==0 || iPos==0)
                && (pPT->n==nToken || (pPT->isPrefix && pPT->n<nToken))
                && (0==memcmp(zToken, pPT->z, pPT->n))
              ){
              fts3PendingListAppend(&pDef->pList, iDocid, i, iPos, &rc);
            }
          }
        }
        if( pTC ) pModule->xClose(pTC);
        if( rc==SQLITE_DONE ) rc = SQLITE_OK;
      }
    }

    for(pDef=pCsr->pDeferred; pDef && rc==SQLITE_OK; pDef=pDef->pNext){
      if( pDef->pList ){
        rc = fts3PendingListAppendVarint(&pDef->pList, 0);
      }
    }
  }

  return rc;
}

int sqlite3Fts3DeferredTokenList(
  Fts3DeferredToken *p, 
  char **ppData, 
  int *pnData
){
  char *pRet;
  int nSkip;
  sqlite3_int64 dummy;

  *ppData = 0;
  *pnData = 0;

  if( p->pList==0 ){
    return SQLITE_OK;
  }

  pRet = (char *)sqlite3_malloc(p->pList->nData);
  if( !pRet ) return SQLITE_NOMEM;

  nSkip = sqlite3Fts3GetVarint(p->pList->aData, &dummy);
  *pnData = p->pList->nData - nSkip;
  *ppData = pRet;
  
  memcpy(pRet, &p->pList->aData[nSkip], *pnData);
  return SQLITE_OK;
}

/*
** Add an entry for token pToken to the pCsr->pDeferred list.
*/
int sqlite3Fts3DeferToken(
  Fts3Cursor *pCsr,               /* Fts3 table cursor */
  Fts3PhraseToken *pToken,        /* Token to defer */
  int iCol                        /* Column that token must appear in (or -1) */
){
  Fts3DeferredToken *pDeferred;
  pDeferred = sqlite3_malloc(sizeof(*pDeferred));
  if( !pDeferred ){
    return SQLITE_NOMEM;
  }
  memset(pDeferred, 0, sizeof(*pDeferred));
  pDeferred->pToken = pToken;
  pDeferred->pNext = pCsr->pDeferred; 
  pDeferred->iCol = iCol;
  pCsr->pDeferred = pDeferred;

  assert( pToken->pDeferred==0 );
  pToken->pDeferred = pDeferred;

  return SQLITE_OK;
}
#endif

/*
** SQLite value pRowid contains the rowid of a row that may or may not be
** present in the FTS3 table. If it is, delete it and adjust the contents
** of subsiduary data structures accordingly.
*/
static int fts3DeleteByRowid(
  Fts3Table *p, 
  sqlite3_value *pRowid, 
  int *pnChng,                    /* IN/OUT: Decrement if row is deleted */
  u32 *aSzDel
){
  int rc = SQLITE_OK;             /* Return code */
  int bFound = 0;                 /* True if *pRowid really is in the table */

  fts3DeleteTerms(&rc, p, pRowid, aSzDel, &bFound);
  if( bFound && rc==SQLITE_OK ){
    int isEmpty = 0;              /* Deleting *pRowid leaves the table empty */
    rc = fts3IsEmpty(p, pRowid, &isEmpty);
    if( rc==SQLITE_OK ){
      if( isEmpty ){
        /* Deleting this row means the whole table is empty. In this case
        ** delete the contents of all three tables and throw away any
        ** data in the pendingTerms hash table.  */
        rc = fts3DeleteAll(p, 1);
        *pnChng = 0;
        memset(aSzDel, 0, sizeof(u32) * (p->nColumn+1) * 2);
      }else{
        *pnChng = *pnChng - 1;
        if( p->zContentTbl==0 ){
          fts3SqlExec(&rc, p, SQL_DELETE_CONTENT, &pRowid);
        }
        if( p->bHasDocsize ){
          fts3SqlExec(&rc, p, SQL_DELETE_DOCSIZE, &pRowid);
        }
      }
    }
  }

  return rc;
}

/*
** This function does the work for the xUpdate method of FTS3 virtual
** tables. The schema of the virtual table being:
**
**     CREATE TABLE <table name>( 
**       <user columns>,
**       <table name> HIDDEN, 
**       docid HIDDEN, 
**       <langid> HIDDEN
**     );
**
** 
*/
int sqlite3Fts3UpdateMethod(
  sqlite3_vtab *pVtab,            /* FTS3 vtab object */
  int nArg,                       /* Size of argument array */
  sqlite3_value **apVal,          /* Array of arguments */
  sqlite_int64 *pRowid            /* OUT: The affected (or effected) rowid */
){
  Fts3Table *p = (Fts3Table *)pVtab;
  int rc = SQLITE_OK;             /* Return Code */
  u32 *aSzIns = 0;                /* Sizes of inserted documents */
  u32 *aSzDel = 0;                /* Sizes of deleted documents */
  int nChng = 0;                  /* Net change in number of documents */
  int bInsertDone = 0;

  /* At this point it must be known if the %_stat table exists or not.
  ** So bHasStat may not be 2.  */
  assert( p->bHasStat==0 || p->bHasStat==1 );

  assert( p->pSegments==0 );
  assert( 
      nArg==1                     /* DELETE operations */
   || nArg==(2 + p->nColumn + 3)  /* INSERT or UPDATE operations */
  );

  /* Check for a "special" INSERT operation. One of the form:
  **
  **   INSERT INTO xyz(xyz) VALUES('command');
  */
  if( nArg>1 
   && sqlite3_value_type(apVal[0])==SQLITE_NULL 
   && sqlite3_value_type(apVal[p->nColumn+2])!=SQLITE_NULL 
  ){
    rc = fts3SpecialInsert(p, apVal[p->nColumn+2]);
    goto update_out;
  }

  if( nArg>1 && sqlite3_value_int(apVal[2 + p->nColumn + 2])<0 ){
    rc = SQLITE_CONSTRAINT;
    goto update_out;
  }

  /* Allocate space to hold the change in document sizes */
  aSzDel = sqlite3_malloc64(sizeof(aSzDel[0])*((sqlite3_int64)p->nColumn+1)*2);
  if( aSzDel==0 ){
    rc = SQLITE_NOMEM;
    goto update_out;
  }
  aSzIns = &aSzDel[p->nColumn+1];
  memset(aSzDel, 0, sizeof(aSzDel[0])*(p->nColumn+1)*2);

  rc = fts3Writelock(p);
  if( rc!=SQLITE_OK ) goto update_out;

  /* If this is an INSERT operation, or an UPDATE that modifies the rowid
  ** value, then this operation requires constraint handling.
  **
  ** If the on-conflict mode is REPLACE, this means that the existing row
  ** should be deleted from the database before inserting the new row. Or,
  ** if the on-conflict mode is other than REPLACE, then this method must
  ** detect the conflict and return SQLITE_CONSTRAINT before beginning to
  ** modify the database file.
  */
  if( nArg>1 && p->zContentTbl==0 ){
    /* Find the value object that holds the new rowid value. */
    sqlite3_value *pNewRowid = apVal[3+p->nColumn];
    if( sqlite3_value_type(pNewRowid)==SQLITE_NULL ){
      pNewRowid = apVal[1];
    }

    if( sqlite3_value_type(pNewRowid)!=SQLITE_NULL && ( 
        sqlite3_value_type(apVal[0])==SQLITE_NULL
     || sqlite3_value_int64(apVal[0])!=sqlite3_value_int64(pNewRowid)
    )){
      /* The new rowid is not NULL (in this case the rowid will be
      ** automatically assigned and there is no chance of a conflict), and 
      ** the statement is either an INSERT or an UPDATE that modifies the
      ** rowid column. So if the conflict mode is REPLACE, then delete any
      ** existing row with rowid=pNewRowid. 
      **
      ** Or, if the conflict mode is not REPLACE, insert the new record into 
      ** the %_content table. If we hit the duplicate rowid constraint (or any
      ** other error) while doing so, return immediately.
      **
      ** This branch may also run if pNewRowid contains a value that cannot
      ** be losslessly converted to an integer. In this case, the eventual 
      ** call to fts3InsertData() (either just below or further on in this
      ** function) will return SQLITE_MISMATCH. If fts3DeleteByRowid is 
      ** invoked, it will delete zero rows (since no row will have
      ** docid=$pNewRowid if $pNewRowid is not an integer value).
      */
      if( sqlite3_vtab_on_conflict(p->db)==SQLITE_REPLACE ){
        rc = fts3DeleteByRowid(p, pNewRowid, &nChng, aSzDel);
      }else{
        rc = fts3InsertData(p, apVal, pRowid);
        bInsertDone = 1;
      }
    }
  }
  if( rc!=SQLITE_OK ){
    goto update_out;
  }

  /* If this is a DELETE or UPDATE operation, remove the old record. */
  if( sqlite3_value_type(apVal[0])!=SQLITE_NULL ){
    assert( sqlite3_value_type(apVal[0])==SQLITE_INTEGER );
    rc = fts3DeleteByRowid(p, apVal[0], &nChng, aSzDel);
  }
  
  /* If this is an INSERT or UPDATE operation, insert the new record. */
  if( nArg>1 && rc==SQLITE_OK ){
    int iLangid = sqlite3_value_int(apVal[2 + p->nColumn + 2]);
    if( bInsertDone==0 ){
      rc = fts3InsertData(p, apVal, pRowid);
      if( rc==SQLITE_CONSTRAINT && p->zContentTbl==0 ){
        rc = FTS_CORRUPT_VTAB;
      }
    }
    if( rc==SQLITE_OK ){
      rc = fts3PendingTermsDocid(p, 0, iLangid, *pRowid);
    }
    if( rc==SQLITE_OK ){
      assert( p->iPrevDocid==*pRowid );
      rc = fts3InsertTerms(p, iLangid, apVal, aSzIns);
    }
    if( p->bHasDocsize ){
      fts3InsertDocsize(&rc, p, aSzIns);
    }
    nChng++;
  }

  if( p->bFts4 ){
    fts3UpdateDocTotals(&rc, p, aSzIns, aSzDel, nChng);
  }

 update_out:
  sqlite3_free(aSzDel);
  sqlite3Fts3SegmentsClose(p);
  return rc;
}

/* 
** Flush any data in the pending-terms hash table to disk. If successful,
** merge all segments in the database (including the new segment, if 
** there was any data to flush) into a single segment. 
*/
int sqlite3Fts3Optimize(Fts3Table *p){
  int rc;
  rc = sqlite3_exec(p->db, "SAVEPOINT fts3", 0, 0, 0);
  if( rc==SQLITE_OK ){
    rc = fts3DoOptimize(p, 1);
    if( rc==SQLITE_OK || rc==SQLITE_DONE ){
      int rc2 = sqlite3_exec(p->db, "RELEASE fts3", 0, 0, 0);
      if( rc2!=SQLITE_OK ) rc = rc2;
    }else{
      sqlite3_exec(p->db, "ROLLBACK TO fts3", 0, 0, 0);
      sqlite3_exec(p->db, "RELEASE fts3", 0, 0, 0);
    }
  }
  sqlite3Fts3SegmentsClose(p);
  return rc;
}

#endif
