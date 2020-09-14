/*
** 2014 August 30
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
**
** OVERVIEW 
**
**  The RBU extension requires that the RBU update be packaged as an
**  SQLite database. The tables it expects to find are described in
**  sqlite3rbu.h.  Essentially, for each table xyz in the target database
**  that the user wishes to write to, a corresponding data_xyz table is
**  created in the RBU database and populated with one row for each row to
**  update, insert or delete from the target table.
** 
**  The update proceeds in three stages:
** 
**  1) The database is updated. The modified database pages are written
**     to a *-oal file. A *-oal file is just like a *-wal file, except
**     that it is named "<database>-oal" instead of "<database>-wal".
**     Because regular SQLite clients do not look for file named
**     "<database>-oal", they go on using the original database in
**     rollback mode while the *-oal file is being generated.
** 
**     During this stage RBU does not update the database by writing
**     directly to the target tables. Instead it creates "imposter"
**     tables using the SQLITE_TESTCTRL_IMPOSTER interface that it uses
**     to update each b-tree individually. All updates required by each
**     b-tree are completed before moving on to the next, and all
**     updates are done in sorted key order.
** 
**  2) The "<database>-oal" file is moved to the equivalent "<database>-wal"
**     location using a call to rename(2). Before doing this the RBU
**     module takes an EXCLUSIVE lock on the database file, ensuring
**     that there are no other active readers.
** 
**     Once the EXCLUSIVE lock is released, any other database readers
**     detect the new *-wal file and read the database in wal mode. At
**     this point they see the new version of the database - including
**     the updates made as part of the RBU update.
** 
**  3) The new *-wal file is checkpointed. This proceeds in the same way 
**     as a regular database checkpoint, except that a single frame is
**     checkpointed each time sqlite3rbu_step() is called. If the RBU
**     handle is closed before the entire *-wal file is checkpointed,
**     the checkpoint progress is saved in the RBU database and the
**     checkpoint can be resumed by another RBU client at some point in
**     the future.
**
** POTENTIAL PROBLEMS
** 
**  The rename() call might not be portable. And RBU is not currently
**  syncing the directory after renaming the file.
**
**  When state is saved, any commit to the *-oal file and the commit to
**  the RBU update database are not atomic. So if the power fails at the
**  wrong moment they might get out of sync. As the main database will be
**  committed before the RBU update database this will likely either just
**  pass unnoticed, or result in SQLITE_CONSTRAINT errors (due to UNIQUE
**  constraint violations).
**
**  If some client does modify the target database mid RBU update, or some
**  other error occurs, the RBU extension will keep throwing errors. It's
**  not really clear how to get out of this state. The system could just
**  by delete the RBU update database and *-oal file and have the device
**  download the update again and start over.
**
**  At present, for an UPDATE, both the new.* and old.* records are
**  collected in the rbu_xyz table. And for both UPDATEs and DELETEs all
**  fields are collected.  This means we're probably writing a lot more
**  data to disk when saving the state of an ongoing update to the RBU
**  update database than is strictly necessary.
** 
*/

#include <assert.h>
#include <string.h>
#include <stdio.h>

#include "sqlite3.h"

#if !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_RBU)
#include "sqlite3rbu.h"

#if defined(_WIN32_WCE)
#include "windows.h"
#endif

/* Maximum number of prepared UPDATE statements held by this module */
#define SQLITE_RBU_UPDATE_CACHESIZE 16

/* Delta checksums disabled by default.  Compile with -DRBU_ENABLE_DELTA_CKSUM
** to enable checksum verification.
*/
#ifndef RBU_ENABLE_DELTA_CKSUM
# define RBU_ENABLE_DELTA_CKSUM 0
#endif

/*
** Swap two objects of type TYPE.
*/
#if !defined(SQLITE_AMALGAMATION)
# define SWAP(TYPE,A,B) {TYPE t=A; A=B; B=t;}
#endif

/*
** The rbu_state table is used to save the state of a partially applied
** update so that it can be resumed later. The table consists of integer
** keys mapped to values as follows:
**
** RBU_STATE_STAGE:
**   May be set to integer values 1, 2, 4 or 5. As follows:
**       1: the *-rbu file is currently under construction.
**       2: the *-rbu file has been constructed, but not yet moved 
**          to the *-wal path.
**       4: the checkpoint is underway.
**       5: the rbu update has been checkpointed.
**
** RBU_STATE_TBL:
**   Only valid if STAGE==1. The target database name of the table 
**   currently being written.
**
** RBU_STATE_IDX:
**   Only valid if STAGE==1. The target database name of the index 
**   currently being written, or NULL if the main table is currently being
**   updated.
**
** RBU_STATE_ROW:
**   Only valid if STAGE==1. Number of rows already processed for the current
**   table/index.
**
** RBU_STATE_PROGRESS:
**   Trbul number of sqlite3rbu_step() calls made so far as part of this
**   rbu update.
**
** RBU_STATE_CKPT:
**   Valid if STAGE==4. The 64-bit checksum associated with the wal-index
**   header created by recovering the *-wal file. This is used to detect
**   cases when another client appends frames to the *-wal file in the
**   middle of an incremental checkpoint (an incremental checkpoint cannot
**   be continued if this happens).
**
** RBU_STATE_COOKIE:
**   Valid if STAGE==1. The current change-counter cookie value in the 
**   target db file.
**
** RBU_STATE_OALSZ:
**   Valid if STAGE==1. The size in bytes of the *-oal file.
**
** RBU_STATE_DATATBL:
**   Only valid if STAGE==1. The RBU database name of the table 
**   currently being read.
*/
#define RBU_STATE_STAGE        1
#define RBU_STATE_TBL          2
#define RBU_STATE_IDX          3
#define RBU_STATE_ROW          4
#define RBU_STATE_PROGRESS     5
#define RBU_STATE_CKPT         6
#define RBU_STATE_COOKIE       7
#define RBU_STATE_OALSZ        8
#define RBU_STATE_PHASEONESTEP 9
#define RBU_STATE_DATATBL     10

#define RBU_STAGE_OAL         1
#define RBU_STAGE_MOVE        2
#define RBU_STAGE_CAPTURE     3
#define RBU_STAGE_CKPT        4
#define RBU_STAGE_DONE        5


#define RBU_CREATE_STATE \
  "CREATE TABLE IF NOT EXISTS %s.rbu_state(k INTEGER PRIMARY KEY, v)"

typedef struct RbuFrame RbuFrame;
typedef struct RbuObjIter RbuObjIter;
typedef struct RbuState RbuState;
typedef struct RbuSpan RbuSpan;
typedef struct rbu_vfs rbu_vfs;
typedef struct rbu_file rbu_file;
typedef struct RbuUpdateStmt RbuUpdateStmt;

#if !defined(SQLITE_AMALGAMATION)
typedef unsigned int u32;
typedef unsigned short u16;
typedef unsigned char u8;
typedef sqlite3_int64 i64;
#endif

/*
** These values must match the values defined in wal.c for the equivalent
** locks. These are not magic numbers as they are part of the SQLite file
** format.
*/
#define WAL_LOCK_WRITE  0
#define WAL_LOCK_CKPT   1
#define WAL_LOCK_READ0  3

#define SQLITE_FCNTL_RBUCNT    5149216

/*
** A structure to store values read from the rbu_state table in memory.
*/
struct RbuState {
  int eStage;
  char *zTbl;
  char *zDataTbl;
  char *zIdx;
  i64 iWalCksum;
  int nRow;
  i64 nProgress;
  u32 iCookie;
  i64 iOalSz;
  i64 nPhaseOneStep;
};

struct RbuUpdateStmt {
  char *zMask;                    /* Copy of update mask used with pUpdate */
  sqlite3_stmt *pUpdate;          /* Last update statement (or NULL) */
  RbuUpdateStmt *pNext;
};

struct RbuSpan {
  const char *zSpan;
  int nSpan;
};

/*
** An iterator of this type is used to iterate through all objects in
** the target database that require updating. For each such table, the
** iterator visits, in order:
**
**     * the table itself, 
**     * each index of the table (zero or more points to visit), and
**     * a special "cleanup table" state.
**
** abIndexed:
**   If the table has no indexes on it, abIndexed is set to NULL. Otherwise,
**   it points to an array of flags nTblCol elements in size. The flag is
**   set for each column that is either a part of the PK or a part of an
**   index. Or clear otherwise.
**
**   If there are one or more partial indexes on the table, all fields of
**   this array set set to 1. This is because in that case, the module has
**   no way to tell which fields will be required to add and remove entries
**   from the partial indexes.
**   
*/
struct RbuObjIter {
  sqlite3_stmt *pTblIter;         /* Iterate through tables */
  sqlite3_stmt *pIdxIter;         /* Index iterator */
  int nTblCol;                    /* Size of azTblCol[] array */
  char **azTblCol;                /* Array of unquoted target column names */
  char **azTblType;               /* Array of target column types */
  int *aiSrcOrder;                /* src table col -> target table col */
  u8 *abTblPk;                    /* Array of flags, set on target PK columns */
  u8 *abNotNull;                  /* Array of flags, set on NOT NULL columns */
  u8 *abIndexed;                  /* Array of flags, set on indexed & PK cols */
  int eType;                      /* Table type - an RBU_PK_XXX value */

  /* Output variables. zTbl==0 implies EOF. */
  int bCleanup;                   /* True in "cleanup" state */
  const char *zTbl;               /* Name of target db table */
  const char *zDataTbl;           /* Name of rbu db table (or null) */
  const char *zIdx;               /* Name of target db index (or null) */
  int iTnum;                      /* Root page of current object */
  int iPkTnum;                    /* If eType==EXTERNAL, root of PK index */
  int bUnique;                    /* Current index is unique */
  int nIndex;                     /* Number of aux. indexes on table zTbl */

  /* Statements created by rbuObjIterPrepareAll() */
  int nCol;                       /* Number of columns in current object */
  sqlite3_stmt *pSelect;          /* Source data */
  sqlite3_stmt *pInsert;          /* Statement for INSERT operations */
  sqlite3_stmt *pDelete;          /* Statement for DELETE ops */
  sqlite3_stmt *pTmpInsert;       /* Insert into rbu_tmp_$zDataTbl */
  int nIdxCol;
  RbuSpan *aIdxCol;
  char *zIdxSql;

  /* Last UPDATE used (for PK b-tree updates only), or NULL. */
  RbuUpdateStmt *pRbuUpdate;
};

/*
** Values for RbuObjIter.eType
**
**     0: Table does not exist (error)
**     1: Table has an implicit rowid.
**     2: Table has an explicit IPK column.
**     3: Table has an external PK index.
**     4: Table is WITHOUT ROWID.
**     5: Table is a virtual table.
*/
#define RBU_PK_NOTABLE        0
#define RBU_PK_NONE           1
#define RBU_PK_IPK            2
#define RBU_PK_EXTERNAL       3
#define RBU_PK_WITHOUT_ROWID  4
#define RBU_PK_VTAB           5


/*
** Within the RBU_STAGE_OAL stage, each call to sqlite3rbu_step() performs
** one of the following operations.
*/
#define RBU_INSERT     1          /* Insert on a main table b-tree */
#define RBU_DELETE     2          /* Delete a row from a main table b-tree */
#define RBU_REPLACE    3          /* Delete and then insert a row */
#define RBU_IDX_DELETE 4          /* Delete a row from an aux. index b-tree */
#define RBU_IDX_INSERT 5          /* Insert on an aux. index b-tree */

#define RBU_UPDATE     6          /* Update a row in a main table b-tree */

/*
** A single step of an incremental checkpoint - frame iWalFrame of the wal
** file should be copied to page iDbPage of the database file.
*/
struct RbuFrame {
  u32 iDbPage;
  u32 iWalFrame;
};

/*
** RBU handle.
**
** nPhaseOneStep:
**   If the RBU database contains an rbu_count table, this value is set to
**   a running estimate of the number of b-tree operations required to 
**   finish populating the *-oal file. This allows the sqlite3_bp_progress()
**   API to calculate the permyriadage progress of populating the *-oal file
**   using the formula:
**
**     permyriadage = (10000 * nProgress) / nPhaseOneStep
**
**   nPhaseOneStep is initialized to the sum of:
**
**     nRow * (nIndex + 1)
**
**   for all source tables in the RBU database, where nRow is the number
**   of rows in the source table and nIndex the number of indexes on the
**   corresponding target database table.
**
**   This estimate is accurate if the RBU update consists entirely of
**   INSERT operations. However, it is inaccurate if:
**
**     * the RBU update contains any UPDATE operations. If the PK specified
**       for an UPDATE operation does not exist in the target table, then
**       no b-tree operations are required on index b-trees. Or if the 
**       specified PK does exist, then (nIndex*2) such operations are
**       required (one delete and one insert on each index b-tree).
**
**     * the RBU update contains any DELETE operations for which the specified
**       PK does not exist. In this case no operations are required on index
**       b-trees.
**
**     * the RBU update contains REPLACE operations. These are similar to
**       UPDATE operations.
**
**   nPhaseOneStep is updated to account for the conditions above during the
**   first pass of each source table. The updated nPhaseOneStep value is
**   stored in the rbu_state table if the RBU update is suspended.
*/
struct sqlite3rbu {
  int eStage;                     /* Value of RBU_STATE_STAGE field */
  sqlite3 *dbMain;                /* target database handle */
  sqlite3 *dbRbu;                 /* rbu database handle */
  char *zTarget;                  /* Path to target db */
  char *zRbu;                     /* Path to rbu db */
  char *zState;                   /* Path to state db (or NULL if zRbu) */
  char zStateDb[5];               /* Db name for state ("stat" or "main") */
  int rc;                         /* Value returned by last rbu_step() call */
  char *zErrmsg;                  /* Error message if rc!=SQLITE_OK */
  int nStep;                      /* Rows processed for current object */
  int nProgress;                  /* Rows processed for all objects */
  RbuObjIter objiter;             /* Iterator for skipping through tbl/idx */
  const char *zVfsName;           /* Name of automatically created rbu vfs */
  rbu_file *pTargetFd;            /* File handle open on target db */
  int nPagePerSector;             /* Pages per sector for pTargetFd */
  i64 iOalSz;
  i64 nPhaseOneStep;

  /* The following state variables are used as part of the incremental
  ** checkpoint stage (eStage==RBU_STAGE_CKPT). See comments surrounding
  ** function rbuSetupCheckpoint() for details.  */
  u32 iMaxFrame;                  /* Largest iWalFrame value in aFrame[] */
  u32 mLock;
  int nFrame;                     /* Entries in aFrame[] array */
  int nFrameAlloc;                /* Allocated size of aFrame[] array */
  RbuFrame *aFrame;
  int pgsz;
  u8 *aBuf;
  i64 iWalCksum;
  i64 szTemp;                     /* Current size of all temp files in use */
  i64 szTempLimit;                /* Total size limit for temp files */

  /* Used in RBU vacuum mode only */
  int nRbu;                       /* Number of RBU VFS in the stack */
  rbu_file *pRbuFd;               /* Fd for main db of dbRbu */
};

/*
** An rbu VFS is implemented using an instance of this structure.
**
** Variable pRbu is only non-NULL for automatically created RBU VFS objects.
** It is NULL for RBU VFS objects created explicitly using
** sqlite3rbu_create_vfs(). It is used to track the total amount of temp
** space used by the RBU handle.
*/
struct rbu_vfs {
  sqlite3_vfs base;               /* rbu VFS shim methods */
  sqlite3_vfs *pRealVfs;          /* Underlying VFS */
  sqlite3_mutex *mutex;           /* Mutex to protect pMain */
  sqlite3rbu *pRbu;               /* Owner RBU object */
  rbu_file *pMain;                /* List of main db files */
  rbu_file *pMainRbu;             /* List of main db files with pRbu!=0 */
};

/*
** Each file opened by an rbu VFS is represented by an instance of
** the following structure.
**
** If this is a temporary file (pRbu!=0 && flags&DELETE_ON_CLOSE), variable
** "sz" is set to the current size of the database file.
*/
struct rbu_file {
  sqlite3_file base;              /* sqlite3_file methods */
  sqlite3_file *pReal;            /* Underlying file handle */
  rbu_vfs *pRbuVfs;               /* Pointer to the rbu_vfs object */
  sqlite3rbu *pRbu;               /* Pointer to rbu object (rbu target only) */
  i64 sz;                         /* Size of file in bytes (temp only) */

  int openFlags;                  /* Flags this file was opened with */
  u32 iCookie;                    /* Cookie value for main db files */
  u8 iWriteVer;                   /* "write-version" value for main db files */
  u8 bNolock;                     /* True to fail EXCLUSIVE locks */

  int nShm;                       /* Number of entries in apShm[] array */
  char **apShm;                   /* Array of mmap'd *-shm regions */
  char *zDel;                     /* Delete this when closing file */

  const char *zWal;               /* Wal filename for this main db file */
  rbu_file *pWalFd;               /* Wal file descriptor for this main db */
  rbu_file *pMainNext;            /* Next MAIN_DB file */
  rbu_file *pMainRbuNext;         /* Next MAIN_DB file with pRbu!=0 */
};

/*
** True for an RBU vacuum handle, or false otherwise.
*/
#define rbuIsVacuum(p) ((p)->zTarget==0)


/*************************************************************************
** The following three functions, found below:
**
**   rbuDeltaGetInt()
**   rbuDeltaChecksum()
**   rbuDeltaApply()
**
** are lifted from the fossil source code (http://fossil-scm.org). They
** are used to implement the scalar SQL function rbu_fossil_delta().
*/

/*
** Read bytes from *pz and convert them into a positive integer.  When
** finished, leave *pz pointing to the first character past the end of
** the integer.  The *pLen parameter holds the length of the string
** in *pz and is decremented once for each character in the integer.
*/
static unsigned int rbuDeltaGetInt(const char **pz, int *pLen){
  static const signed char zValue[] = {
    -1, -1, -1, -1, -1, -1, -1, -1,   -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,   -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,   -1, -1, -1, -1, -1, -1, -1, -1,
     0,  1,  2,  3,  4,  5,  6,  7,    8,  9, -1, -1, -1, -1, -1, -1,
    -1, 10, 11, 12, 13, 14, 15, 16,   17, 18, 19, 20, 21, 22, 23, 24,
    25, 26, 27, 28, 29, 30, 31, 32,   33, 34, 35, -1, -1, -1, -1, 36,
    -1, 37, 38, 39, 40, 41, 42, 43,   44, 45, 46, 47, 48, 49, 50, 51,
    52, 53, 54, 55, 56, 57, 58, 59,   60, 61, 62, -1, -1, -1, 63, -1,
  };
  unsigned int v = 0;
  int c;
  unsigned char *z = (unsigned char*)*pz;
  unsigned char *zStart = z;
  while( (c = zValue[0x7f&*(z++)])>=0 ){
     v = (v<<6) + c;
  }
  z--;
  *pLen -= z - zStart;
  *pz = (char*)z;
  return v;
}

#if RBU_ENABLE_DELTA_CKSUM
/*
** Compute a 32-bit checksum on the N-byte buffer.  Return the result.
*/
static unsigned int rbuDeltaChecksum(const char *zIn, size_t N){
  const unsigned char *z = (const unsigned char *)zIn;
  unsigned sum0 = 0;
  unsigned sum1 = 0;
  unsigned sum2 = 0;
  unsigned sum3 = 0;
  while(N >= 16){
    sum0 += ((unsigned)z[0] + z[4] + z[8] + z[12]);
    sum1 += ((unsigned)z[1] + z[5] + z[9] + z[13]);
    sum2 += ((unsigned)z[2] + z[6] + z[10]+ z[14]);
    sum3 += ((unsigned)z[3] + z[7] + z[11]+ z[15]);
    z += 16;
    N -= 16;
  }
  while(N >= 4){
    sum0 += z[0];
    sum1 += z[1];
    sum2 += z[2];
    sum3 += z[3];
    z += 4;
    N -= 4;
  }
  sum3 += (sum2 << 8) + (sum1 << 16) + (sum0 << 24);
  switch(N){
    case 3:   sum3 += (z[2] << 8);
    case 2:   sum3 += (z[1] << 16);
    case 1:   sum3 += (z[0] << 24);
    default:  ;
  }
  return sum3;
}
#endif

/*
** Apply a delta.
**
** The output buffer should be big enough to hold the whole output
** file and a NUL terminator at the end.  The delta_output_size()
** routine will determine this size for you.
**
** The delta string should be null-terminated.  But the delta string
** may contain embedded NUL characters (if the input and output are
** binary files) so we also have to pass in the length of the delta in
** the lenDelta parameter.
**
** This function returns the size of the output file in bytes (excluding
** the final NUL terminator character).  Except, if the delta string is
** malformed or intended for use with a source file other than zSrc,
** then this routine returns -1.
**
** Refer to the delta_create() documentation above for a description
** of the delta file format.
*/
static int rbuDeltaApply(
  const char *zSrc,      /* The source or pattern file */
  int lenSrc,            /* Length of the source file */
  const char *zDelta,    /* Delta to apply to the pattern */
  int lenDelta,          /* Length of the delta */
  char *zOut             /* Write the output into this preallocated buffer */
){
  unsigned int limit;
  unsigned int total = 0;
#if RBU_ENABLE_DELTA_CKSUM
  char *zOrigOut = zOut;
#endif

  limit = rbuDeltaGetInt(&zDelta, &lenDelta);
  if( *zDelta!='\n' ){
    /* ERROR: size integer not terminated by "\n" */
    return -1;
  }
  zDelta++; lenDelta--;
  while( *zDelta && lenDelta>0 ){
    unsigned int cnt, ofst;
    cnt = rbuDeltaGetInt(&zDelta, &lenDelta);
    switch( zDelta[0] ){
      case '@': {
        zDelta++; lenDelta--;
        ofst = rbuDeltaGetInt(&zDelta, &lenDelta);
        if( lenDelta>0 && zDelta[0]!=',' ){
          /* ERROR: copy command not terminated by ',' */
          return -1;
        }
        zDelta++; lenDelta--;
        total += cnt;
        if( total>limit ){
          /* ERROR: copy exceeds output file size */
          return -1;
        }
        if( (int)(ofst+cnt) > lenSrc ){
          /* ERROR: copy extends past end of input */
          return -1;
        }
        memcpy(zOut, &zSrc[ofst], cnt);
        zOut += cnt;
        break;
      }
      case ':': {
        zDelta++; lenDelta--;
        total += cnt;
        if( total>limit ){
          /* ERROR:  insert command gives an output larger than predicted */
          return -1;
        }
        if( (int)cnt>lenDelta ){
          /* ERROR: insert count exceeds size of delta */
          return -1;
        }
        memcpy(zOut, zDelta, cnt);
        zOut += cnt;
        zDelta += cnt;
        lenDelta -= cnt;
        break;
      }
      case ';': {
        zDelta++; lenDelta--;
        zOut[0] = 0;
#if RBU_ENABLE_DELTA_CKSUM
        if( cnt!=rbuDeltaChecksum(zOrigOut, total) ){
          /* ERROR:  bad checksum */
          return -1;
        }
#endif
        if( total!=limit ){
          /* ERROR: generated size does not match predicted size */
          return -1;
        }
        return total;
      }
      default: {
        /* ERROR: unknown delta operator */
        return -1;
      }
    }
  }
  /* ERROR: unterminated delta */
  return -1;
}

static int rbuDeltaOutputSize(const char *zDelta, int lenDelta){
  int size;
  size = rbuDeltaGetInt(&zDelta, &lenDelta);
  if( *zDelta!='\n' ){
    /* ERROR: size integer not terminated by "\n" */
    return -1;
  }
  return size;
}

/*
** End of code taken from fossil.
*************************************************************************/

/*
** Implementation of SQL scalar function rbu_fossil_delta().
**
** This function applies a fossil delta patch to a blob. Exactly two
** arguments must be passed to this function. The first is the blob to
** patch and the second the patch to apply. If no error occurs, this
** function returns the patched blob.
*/
static void rbuFossilDeltaFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *aDelta;
  int nDelta;
  const char *aOrig;
  int nOrig;

  int nOut;
  int nOut2;
  char *aOut;

  assert( argc==2 );

  nOrig = sqlite3_value_bytes(argv[0]);
  aOrig = (const char*)sqlite3_value_blob(argv[0]);
  nDelta = sqlite3_value_bytes(argv[1]);
  aDelta = (const char*)sqlite3_value_blob(argv[1]);

  /* Figure out the size of the output */
  nOut = rbuDeltaOutputSize(aDelta, nDelta);
  if( nOut<0 ){
    sqlite3_result_error(context, "corrupt fossil delta", -1);
    return;
  }

  aOut = sqlite3_malloc(nOut+1);
  if( aOut==0 ){
    sqlite3_result_error_nomem(context);
  }else{
    nOut2 = rbuDeltaApply(aOrig, nOrig, aDelta, nDelta, aOut);
    if( nOut2!=nOut ){
      sqlite3_free(aOut);
      sqlite3_result_error(context, "corrupt fossil delta", -1);
    }else{
      sqlite3_result_blob(context, aOut, nOut, sqlite3_free);
    }
  }
}


/*
** Prepare the SQL statement in buffer zSql against database handle db.
** If successful, set *ppStmt to point to the new statement and return
** SQLITE_OK. 
**
** Otherwise, if an error does occur, set *ppStmt to NULL and return
** an SQLite error code. Additionally, set output variable *pzErrmsg to
** point to a buffer containing an error message. It is the responsibility
** of the caller to (eventually) free this buffer using sqlite3_free().
*/
static int prepareAndCollectError(
  sqlite3 *db, 
  sqlite3_stmt **ppStmt,
  char **pzErrmsg,
  const char *zSql
){
  int rc = sqlite3_prepare_v2(db, zSql, -1, ppStmt, 0);
  if( rc!=SQLITE_OK ){
    *pzErrmsg = sqlite3_mprintf("%s", sqlite3_errmsg(db));
    *ppStmt = 0;
  }
  return rc;
}

/*
** Reset the SQL statement passed as the first argument. Return a copy
** of the value returned by sqlite3_reset().
**
** If an error has occurred, then set *pzErrmsg to point to a buffer
** containing an error message. It is the responsibility of the caller
** to eventually free this buffer using sqlite3_free().
*/
static int resetAndCollectError(sqlite3_stmt *pStmt, char **pzErrmsg){
  int rc = sqlite3_reset(pStmt);
  if( rc!=SQLITE_OK ){
    *pzErrmsg = sqlite3_mprintf("%s", sqlite3_errmsg(sqlite3_db_handle(pStmt)));
  }
  return rc;
}

/*
** Unless it is NULL, argument zSql points to a buffer allocated using
** sqlite3_malloc containing an SQL statement. This function prepares the SQL
** statement against database db and frees the buffer. If statement 
** compilation is successful, *ppStmt is set to point to the new statement 
** handle and SQLITE_OK is returned. 
**
** Otherwise, if an error occurs, *ppStmt is set to NULL and an error code
** returned. In this case, *pzErrmsg may also be set to point to an error
** message. It is the responsibility of the caller to free this error message
** buffer using sqlite3_free().
**
** If argument zSql is NULL, this function assumes that an OOM has occurred.
** In this case SQLITE_NOMEM is returned and *ppStmt set to NULL.
*/
static int prepareFreeAndCollectError(
  sqlite3 *db, 
  sqlite3_stmt **ppStmt,
  char **pzErrmsg,
  char *zSql
){
  int rc;
  assert( *pzErrmsg==0 );
  if( zSql==0 ){
    rc = SQLITE_NOMEM;
    *ppStmt = 0;
  }else{
    rc = prepareAndCollectError(db, ppStmt, pzErrmsg, zSql);
    sqlite3_free(zSql);
  }
  return rc;
}

/*
** Free the RbuObjIter.azTblCol[] and RbuObjIter.abTblPk[] arrays allocated
** by an earlier call to rbuObjIterCacheTableInfo().
*/
static void rbuObjIterFreeCols(RbuObjIter *pIter){
  int i;
  for(i=0; i<pIter->nTblCol; i++){
    sqlite3_free(pIter->azTblCol[i]);
    sqlite3_free(pIter->azTblType[i]);
  }
  sqlite3_free(pIter->azTblCol);
  pIter->azTblCol = 0;
  pIter->azTblType = 0;
  pIter->aiSrcOrder = 0;
  pIter->abTblPk = 0;
  pIter->abNotNull = 0;
  pIter->nTblCol = 0;
  pIter->eType = 0;               /* Invalid value */
}

/*
** Finalize all statements and free all allocations that are specific to
** the current object (table/index pair).
*/
static void rbuObjIterClearStatements(RbuObjIter *pIter){
  RbuUpdateStmt *pUp;

  sqlite3_finalize(pIter->pSelect);
  sqlite3_finalize(pIter->pInsert);
  sqlite3_finalize(pIter->pDelete);
  sqlite3_finalize(pIter->pTmpInsert);
  pUp = pIter->pRbuUpdate;
  while( pUp ){
    RbuUpdateStmt *pTmp = pUp->pNext;
    sqlite3_finalize(pUp->pUpdate);
    sqlite3_free(pUp);
    pUp = pTmp;
  }
  sqlite3_free(pIter->aIdxCol);
  sqlite3_free(pIter->zIdxSql);
  
  pIter->pSelect = 0;
  pIter->pInsert = 0;
  pIter->pDelete = 0;
  pIter->pRbuUpdate = 0;
  pIter->pTmpInsert = 0;
  pIter->nCol = 0;
  pIter->nIdxCol = 0;
  pIter->aIdxCol = 0;
  pIter->zIdxSql = 0;
}

/*
** Clean up any resources allocated as part of the iterator object passed
** as the only argument.
*/
static void rbuObjIterFinalize(RbuObjIter *pIter){
  rbuObjIterClearStatements(pIter);
  sqlite3_finalize(pIter->pTblIter);
  sqlite3_finalize(pIter->pIdxIter);
  rbuObjIterFreeCols(pIter);
  memset(pIter, 0, sizeof(RbuObjIter));
}

/*
** Advance the iterator to the next position.
**
** If no error occurs, SQLITE_OK is returned and the iterator is left 
** pointing to the next entry. Otherwise, an error code and message is 
** left in the RBU handle passed as the first argument. A copy of the 
** error code is returned.
*/
static int rbuObjIterNext(sqlite3rbu *p, RbuObjIter *pIter){
  int rc = p->rc;
  if( rc==SQLITE_OK ){

    /* Free any SQLite statements used while processing the previous object */ 
    rbuObjIterClearStatements(pIter);
    if( pIter->zIdx==0 ){
      rc = sqlite3_exec(p->dbMain,
          "DROP TRIGGER IF EXISTS temp.rbu_insert_tr;"
          "DROP TRIGGER IF EXISTS temp.rbu_update1_tr;"
          "DROP TRIGGER IF EXISTS temp.rbu_update2_tr;"
          "DROP TRIGGER IF EXISTS temp.rbu_delete_tr;"
          , 0, 0, &p->zErrmsg
      );
    }

    if( rc==SQLITE_OK ){
      if( pIter->bCleanup ){
        rbuObjIterFreeCols(pIter);
        pIter->bCleanup = 0;
        rc = sqlite3_step(pIter->pTblIter);
        if( rc!=SQLITE_ROW ){
          rc = resetAndCollectError(pIter->pTblIter, &p->zErrmsg);
          pIter->zTbl = 0;
        }else{
          pIter->zTbl = (const char*)sqlite3_column_text(pIter->pTblIter, 0);
          pIter->zDataTbl = (const char*)sqlite3_column_text(pIter->pTblIter,1);
          rc = (pIter->zDataTbl && pIter->zTbl) ? SQLITE_OK : SQLITE_NOMEM;
        }
      }else{
        if( pIter->zIdx==0 ){
          sqlite3_stmt *pIdx = pIter->pIdxIter;
          rc = sqlite3_bind_text(pIdx, 1, pIter->zTbl, -1, SQLITE_STATIC);
        }
        if( rc==SQLITE_OK ){
          rc = sqlite3_step(pIter->pIdxIter);
          if( rc!=SQLITE_ROW ){
            rc = resetAndCollectError(pIter->pIdxIter, &p->zErrmsg);
            pIter->bCleanup = 1;
            pIter->zIdx = 0;
          }else{
            pIter->zIdx = (const char*)sqlite3_column_text(pIter->pIdxIter, 0);
            pIter->iTnum = sqlite3_column_int(pIter->pIdxIter, 1);
            pIter->bUnique = sqlite3_column_int(pIter->pIdxIter, 2);
            rc = pIter->zIdx ? SQLITE_OK : SQLITE_NOMEM;
          }
        }
      }
    }
  }

  if( rc!=SQLITE_OK ){
    rbuObjIterFinalize(pIter);
    p->rc = rc;
  }
  return rc;
}


/*
** The implementation of the rbu_target_name() SQL function. This function
** accepts one or two arguments. The first argument is the name of a table -
** the name of a table in the RBU database.  The second, if it is present, is 1
** for a view or 0 for a table. 
**
** For a non-vacuum RBU handle, if the table name matches the pattern:
**
**     data[0-9]_<name>
**
** where <name> is any sequence of 1 or more characters, <name> is returned.
** Otherwise, if the only argument does not match the above pattern, an SQL
** NULL is returned.
**
**     "data_t1"     -> "t1"
**     "data0123_t2" -> "t2"
**     "dataAB_t3"   -> NULL
**
** For an rbu vacuum handle, a copy of the first argument is returned if
** the second argument is either missing or 0 (not a view).
*/
static void rbuTargetNameFunc(
  sqlite3_context *pCtx,
  int argc,
  sqlite3_value **argv
){
  sqlite3rbu *p = sqlite3_user_data(pCtx);
  const char *zIn;
  assert( argc==1 || argc==2 );

  zIn = (const char*)sqlite3_value_text(argv[0]);
  if( zIn ){
    if( rbuIsVacuum(p) ){
      assert( argc==2 || argc==1 );
      if( argc==1 || 0==sqlite3_value_int(argv[1]) ){
        sqlite3_result_text(pCtx, zIn, -1, SQLITE_STATIC);
      }
    }else{
      if( strlen(zIn)>4 && memcmp("data", zIn, 4)==0 ){
        int i;
        for(i=4; zIn[i]>='0' && zIn[i]<='9'; i++);
        if( zIn[i]=='_' && zIn[i+1] ){
          sqlite3_result_text(pCtx, &zIn[i+1], -1, SQLITE_STATIC);
        }
      }
    }
  }
}

/*
** Initialize the iterator structure passed as the second argument.
**
** If no error occurs, SQLITE_OK is returned and the iterator is left 
** pointing to the first entry. Otherwise, an error code and message is 
** left in the RBU handle passed as the first argument. A copy of the 
** error code is returned.
*/
static int rbuObjIterFirst(sqlite3rbu *p, RbuObjIter *pIter){
  int rc;
  memset(pIter, 0, sizeof(RbuObjIter));

  rc = prepareFreeAndCollectError(p->dbRbu, &pIter->pTblIter, &p->zErrmsg, 
    sqlite3_mprintf(
      "SELECT rbu_target_name(name, type='view') AS target, name "
      "FROM sqlite_schema "
      "WHERE type IN ('table', 'view') AND target IS NOT NULL "
      " %s "
      "ORDER BY name"
  , rbuIsVacuum(p) ? "AND rootpage!=0 AND rootpage IS NOT NULL" : ""));

  if( rc==SQLITE_OK ){
    rc = prepareAndCollectError(p->dbMain, &pIter->pIdxIter, &p->zErrmsg,
        "SELECT name, rootpage, sql IS NULL OR substr(8, 6)=='UNIQUE' "
        "  FROM main.sqlite_schema "
        "  WHERE type='index' AND tbl_name = ?"
    );
  }

  pIter->bCleanup = 1;
  p->rc = rc;
  return rbuObjIterNext(p, pIter);
}

/*
** This is a wrapper around "sqlite3_mprintf(zFmt, ...)". If an OOM occurs,
** an error code is stored in the RBU handle passed as the first argument.
**
** If an error has already occurred (p->rc is already set to something other
** than SQLITE_OK), then this function returns NULL without modifying the
** stored error code. In this case it still calls sqlite3_free() on any 
** printf() parameters associated with %z conversions.
*/
static char *rbuMPrintf(sqlite3rbu *p, const char *zFmt, ...){
  char *zSql = 0;
  va_list ap;
  va_start(ap, zFmt);
  zSql = sqlite3_vmprintf(zFmt, ap);
  if( p->rc==SQLITE_OK ){
    if( zSql==0 ) p->rc = SQLITE_NOMEM;
  }else{
    sqlite3_free(zSql);
    zSql = 0;
  }
  va_end(ap);
  return zSql;
}

/*
** Argument zFmt is a sqlite3_mprintf() style format string. The trailing
** arguments are the usual subsitution values. This function performs
** the printf() style substitutions and executes the result as an SQL
** statement on the RBU handles database.
**
** If an error occurs, an error code and error message is stored in the
** RBU handle. If an error has already occurred when this function is
** called, it is a no-op.
*/
static int rbuMPrintfExec(sqlite3rbu *p, sqlite3 *db, const char *zFmt, ...){
  va_list ap;
  char *zSql;
  va_start(ap, zFmt);
  zSql = sqlite3_vmprintf(zFmt, ap);
  if( p->rc==SQLITE_OK ){
    if( zSql==0 ){
      p->rc = SQLITE_NOMEM;
    }else{
      p->rc = sqlite3_exec(db, zSql, 0, 0, &p->zErrmsg);
    }
  }
  sqlite3_free(zSql);
  va_end(ap);
  return p->rc;
}

/*
** Attempt to allocate and return a pointer to a zeroed block of nByte 
** bytes. 
**
** If an error (i.e. an OOM condition) occurs, return NULL and leave an 
** error code in the rbu handle passed as the first argument. Or, if an 
** error has already occurred when this function is called, return NULL 
** immediately without attempting the allocation or modifying the stored
** error code.
*/
static void *rbuMalloc(sqlite3rbu *p, sqlite3_int64 nByte){
  void *pRet = 0;
  if( p->rc==SQLITE_OK ){
    assert( nByte>0 );
    pRet = sqlite3_malloc64(nByte);
    if( pRet==0 ){
      p->rc = SQLITE_NOMEM;
    }else{
      memset(pRet, 0, nByte);
    }
  }
  return pRet;
}


/*
** Allocate and zero the pIter->azTblCol[] and abTblPk[] arrays so that
** there is room for at least nCol elements. If an OOM occurs, store an
** error code in the RBU handle passed as the first argument.
*/
static void rbuAllocateIterArrays(sqlite3rbu *p, RbuObjIter *pIter, int nCol){
  sqlite3_int64 nByte = (2*sizeof(char*) + sizeof(int) + 3*sizeof(u8)) * nCol;
  char **azNew;

  azNew = (char**)rbuMalloc(p, nByte);
  if( azNew ){
    pIter->azTblCol = azNew;
    pIter->azTblType = &azNew[nCol];
    pIter->aiSrcOrder = (int*)&pIter->azTblType[nCol];
    pIter->abTblPk = (u8*)&pIter->aiSrcOrder[nCol];
    pIter->abNotNull = (u8*)&pIter->abTblPk[nCol];
    pIter->abIndexed = (u8*)&pIter->abNotNull[nCol];
  }
}

/*
** The first argument must be a nul-terminated string. This function
** returns a copy of the string in memory obtained from sqlite3_malloc().
** It is the responsibility of the caller to eventually free this memory
** using sqlite3_free().
**
** If an OOM condition is encountered when attempting to allocate memory,
** output variable (*pRc) is set to SQLITE_NOMEM before returning. Otherwise,
** if the allocation succeeds, (*pRc) is left unchanged.
*/
static char *rbuStrndup(const char *zStr, int *pRc){
  char *zRet = 0;

  if( *pRc==SQLITE_OK ){
    if( zStr ){
      size_t nCopy = strlen(zStr) + 1;
      zRet = (char*)sqlite3_malloc64(nCopy);
      if( zRet ){
        memcpy(zRet, zStr, nCopy);
      }else{
        *pRc = SQLITE_NOMEM;
      }
    }
  }

  return zRet;
}

/*
** Finalize the statement passed as the second argument.
**
** If the sqlite3_finalize() call indicates that an error occurs, and the
** rbu handle error code is not already set, set the error code and error
** message accordingly.
*/
static void rbuFinalize(sqlite3rbu *p, sqlite3_stmt *pStmt){
  sqlite3 *db = sqlite3_db_handle(pStmt);
  int rc = sqlite3_finalize(pStmt);
  if( p->rc==SQLITE_OK && rc!=SQLITE_OK ){
    p->rc = rc;
    p->zErrmsg = sqlite3_mprintf("%s", sqlite3_errmsg(db));
  }
}

/* Determine the type of a table.
**
**   peType is of type (int*), a pointer to an output parameter of type
**   (int). This call sets the output parameter as follows, depending
**   on the type of the table specified by parameters dbName and zTbl.
**
**     RBU_PK_NOTABLE:       No such table.
**     RBU_PK_NONE:          Table has an implicit rowid.
**     RBU_PK_IPK:           Table has an explicit IPK column.
**     RBU_PK_EXTERNAL:      Table has an external PK index.
**     RBU_PK_WITHOUT_ROWID: Table is WITHOUT ROWID.
**     RBU_PK_VTAB:          Table is a virtual table.
**
**   Argument *piPk is also of type (int*), and also points to an output
**   parameter. Unless the table has an external primary key index 
**   (i.e. unless *peType is set to 3), then *piPk is set to zero. Or,
**   if the table does have an external primary key index, then *piPk
**   is set to the root page number of the primary key index before
**   returning.
**
** ALGORITHM:
**
**   if( no entry exists in sqlite_schema ){
**     return RBU_PK_NOTABLE
**   }else if( sql for the entry starts with "CREATE VIRTUAL" ){
**     return RBU_PK_VTAB
**   }else if( "PRAGMA index_list()" for the table contains a "pk" index ){
**     if( the index that is the pk exists in sqlite_schema ){
**       *piPK = rootpage of that index.
**       return RBU_PK_EXTERNAL
**     }else{
**       return RBU_PK_WITHOUT_ROWID
**     }
**   }else if( "PRAGMA table_info()" lists one or more "pk" columns ){
**     return RBU_PK_IPK
**   }else{
**     return RBU_PK_NONE
**   }
*/
static void rbuTableType(
  sqlite3rbu *p,
  const char *zTab,
  int *peType,
  int *piTnum,
  int *piPk
){
  /*
  ** 0) SELECT count(*) FROM sqlite_schema where name=%Q AND IsVirtual(%Q)
  ** 1) PRAGMA index_list = ?
  ** 2) SELECT count(*) FROM sqlite_schema where name=%Q 
  ** 3) PRAGMA table_info = ?
  */
  sqlite3_stmt *aStmt[4] = {0, 0, 0, 0};

  *peType = RBU_PK_NOTABLE;
  *piPk = 0;

  assert( p->rc==SQLITE_OK );
  p->rc = prepareFreeAndCollectError(p->dbMain, &aStmt[0], &p->zErrmsg, 
    sqlite3_mprintf(
          "SELECT (sql LIKE 'create virtual%%'), rootpage"
          "  FROM sqlite_schema"
          " WHERE name=%Q", zTab
  ));
  if( p->rc!=SQLITE_OK || sqlite3_step(aStmt[0])!=SQLITE_ROW ){
    /* Either an error, or no such table. */
    goto rbuTableType_end;
  }
  if( sqlite3_column_int(aStmt[0], 0) ){
    *peType = RBU_PK_VTAB;                     /* virtual table */
    goto rbuTableType_end;
  }
  *piTnum = sqlite3_column_int(aStmt[0], 1);

  p->rc = prepareFreeAndCollectError(p->dbMain, &aStmt[1], &p->zErrmsg, 
    sqlite3_mprintf("PRAGMA index_list=%Q",zTab)
  );
  if( p->rc ) goto rbuTableType_end;
  while( sqlite3_step(aStmt[1])==SQLITE_ROW ){
    const u8 *zOrig = sqlite3_column_text(aStmt[1], 3);
    const u8 *zIdx = sqlite3_column_text(aStmt[1], 1);
    if( zOrig && zIdx && zOrig[0]=='p' ){
      p->rc = prepareFreeAndCollectError(p->dbMain, &aStmt[2], &p->zErrmsg, 
          sqlite3_mprintf(
            "SELECT rootpage FROM sqlite_schema WHERE name = %Q", zIdx
      ));
      if( p->rc==SQLITE_OK ){
        if( sqlite3_step(aStmt[2])==SQLITE_ROW ){
          *piPk = sqlite3_column_int(aStmt[2], 0);
          *peType = RBU_PK_EXTERNAL;
        }else{
          *peType = RBU_PK_WITHOUT_ROWID;
        }
      }
      goto rbuTableType_end;
    }
  }

  p->rc = prepareFreeAndCollectError(p->dbMain, &aStmt[3], &p->zErrmsg, 
    sqlite3_mprintf("PRAGMA table_info=%Q",zTab)
  );
  if( p->rc==SQLITE_OK ){
    while( sqlite3_step(aStmt[3])==SQLITE_ROW ){
      if( sqlite3_column_int(aStmt[3],5)>0 ){
        *peType = RBU_PK_IPK;                /* explicit IPK column */
        goto rbuTableType_end;
      }
    }
    *peType = RBU_PK_NONE;
  }

rbuTableType_end: {
    unsigned int i;
    for(i=0; i<sizeof(aStmt)/sizeof(aStmt[0]); i++){
      rbuFinalize(p, aStmt[i]);
    }
  }
}

/*
** This is a helper function for rbuObjIterCacheTableInfo(). It populates
** the pIter->abIndexed[] array.
*/
static void rbuObjIterCacheIndexedCols(sqlite3rbu *p, RbuObjIter *pIter){
  sqlite3_stmt *pList = 0;
  int bIndex = 0;

  if( p->rc==SQLITE_OK ){
    memcpy(pIter->abIndexed, pIter->abTblPk, sizeof(u8)*pIter->nTblCol);
    p->rc = prepareFreeAndCollectError(p->dbMain, &pList, &p->zErrmsg,
        sqlite3_mprintf("PRAGMA main.index_list = %Q", pIter->zTbl)
    );
  }

  pIter->nIndex = 0;
  while( p->rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pList) ){
    const char *zIdx = (const char*)sqlite3_column_text(pList, 1);
    int bPartial = sqlite3_column_int(pList, 4);
    sqlite3_stmt *pXInfo = 0;
    if( zIdx==0 ) break;
    if( bPartial ){
      memset(pIter->abIndexed, 0x01, sizeof(u8)*pIter->nTblCol);
    }
    p->rc = prepareFreeAndCollectError(p->dbMain, &pXInfo, &p->zErrmsg,
        sqlite3_mprintf("PRAGMA main.index_xinfo = %Q", zIdx)
    );
    while( p->rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pXInfo) ){
      int iCid = sqlite3_column_int(pXInfo, 1);
      if( iCid>=0 ) pIter->abIndexed[iCid] = 1;
      if( iCid==-2 ){
        memset(pIter->abIndexed, 0x01, sizeof(u8)*pIter->nTblCol);
      }
    }
    rbuFinalize(p, pXInfo);
    bIndex = 1;
    pIter->nIndex++;
  }

  if( pIter->eType==RBU_PK_WITHOUT_ROWID ){
    /* "PRAGMA index_list" includes the main PK b-tree */
    pIter->nIndex--;
  }

  rbuFinalize(p, pList);
  if( bIndex==0 ) pIter->abIndexed = 0;
}


/*
** If they are not already populated, populate the pIter->azTblCol[],
** pIter->abTblPk[], pIter->nTblCol and pIter->bRowid variables according to
** the table (not index) that the iterator currently points to.
**
** Return SQLITE_OK if successful, or an SQLite error code otherwise. If
** an error does occur, an error code and error message are also left in 
** the RBU handle.
*/
static int rbuObjIterCacheTableInfo(sqlite3rbu *p, RbuObjIter *pIter){
  if( pIter->azTblCol==0 ){
    sqlite3_stmt *pStmt = 0;
    int nCol = 0;
    int i;                        /* for() loop iterator variable */
    int bRbuRowid = 0;            /* If input table has column "rbu_rowid" */
    int iOrder = 0;
    int iTnum = 0;

    /* Figure out the type of table this step will deal with. */
    assert( pIter->eType==0 );
    rbuTableType(p, pIter->zTbl, &pIter->eType, &iTnum, &pIter->iPkTnum);
    if( p->rc==SQLITE_OK && pIter->eType==RBU_PK_NOTABLE ){
      p->rc = SQLITE_ERROR;
      p->zErrmsg = sqlite3_mprintf("no such table: %s", pIter->zTbl);
    }
    if( p->rc ) return p->rc;
    if( pIter->zIdx==0 ) pIter->iTnum = iTnum;

    assert( pIter->eType==RBU_PK_NONE || pIter->eType==RBU_PK_IPK 
         || pIter->eType==RBU_PK_EXTERNAL || pIter->eType==RBU_PK_WITHOUT_ROWID
         || pIter->eType==RBU_PK_VTAB
    );

    /* Populate the azTblCol[] and nTblCol variables based on the columns
    ** of the input table. Ignore any input table columns that begin with
    ** "rbu_".  */
    p->rc = prepareFreeAndCollectError(p->dbRbu, &pStmt, &p->zErrmsg, 
        sqlite3_mprintf("SELECT * FROM '%q'", pIter->zDataTbl)
    );
    if( p->rc==SQLITE_OK ){
      nCol = sqlite3_column_count(pStmt);
      rbuAllocateIterArrays(p, pIter, nCol);
    }
    for(i=0; p->rc==SQLITE_OK && i<nCol; i++){
      const char *zName = (const char*)sqlite3_column_name(pStmt, i);
      if( sqlite3_strnicmp("rbu_", zName, 4) ){
        char *zCopy = rbuStrndup(zName, &p->rc);
        pIter->aiSrcOrder[pIter->nTblCol] = pIter->nTblCol;
        pIter->azTblCol[pIter->nTblCol++] = zCopy;
      }
      else if( 0==sqlite3_stricmp("rbu_rowid", zName) ){
        bRbuRowid = 1;
      }
    }
    sqlite3_finalize(pStmt);
    pStmt = 0;

    if( p->rc==SQLITE_OK
     && rbuIsVacuum(p)==0
     && bRbuRowid!=(pIter->eType==RBU_PK_VTAB || pIter->eType==RBU_PK_NONE)
    ){
      p->rc = SQLITE_ERROR;
      p->zErrmsg = sqlite3_mprintf(
          "table %q %s rbu_rowid column", pIter->zDataTbl,
          (bRbuRowid ? "may not have" : "requires")
      );
    }

    /* Check that all non-HIDDEN columns in the destination table are also
    ** present in the input table. Populate the abTblPk[], azTblType[] and
    ** aiTblOrder[] arrays at the same time.  */
    if( p->rc==SQLITE_OK ){
      p->rc = prepareFreeAndCollectError(p->dbMain, &pStmt, &p->zErrmsg, 
          sqlite3_mprintf("PRAGMA table_info(%Q)", pIter->zTbl)
      );
    }
    while( p->rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pStmt) ){
      const char *zName = (const char*)sqlite3_column_text(pStmt, 1);
      if( zName==0 ) break;  /* An OOM - finalize() below returns S_NOMEM */
      for(i=iOrder; i<pIter->nTblCol; i++){
        if( 0==strcmp(zName, pIter->azTblCol[i]) ) break;
      }
      if( i==pIter->nTblCol ){
        p->rc = SQLITE_ERROR;
        p->zErrmsg = sqlite3_mprintf("column missing from %q: %s",
            pIter->zDataTbl, zName
        );
      }else{
        int iPk = sqlite3_column_int(pStmt, 5);
        int bNotNull = sqlite3_column_int(pStmt, 3);
        const char *zType = (const char*)sqlite3_column_text(pStmt, 2);

        if( i!=iOrder ){
          SWAP(int, pIter->aiSrcOrder[i], pIter->aiSrcOrder[iOrder]);
          SWAP(char*, pIter->azTblCol[i], pIter->azTblCol[iOrder]);
        }

        pIter->azTblType[iOrder] = rbuStrndup(zType, &p->rc);
        assert( iPk>=0 );
        pIter->abTblPk[iOrder] = (u8)iPk;
        pIter->abNotNull[iOrder] = (u8)bNotNull || (iPk!=0);
        iOrder++;
      }
    }

    rbuFinalize(p, pStmt);
    rbuObjIterCacheIndexedCols(p, pIter);
    assert( pIter->eType!=RBU_PK_VTAB || pIter->abIndexed==0 );
    assert( pIter->eType!=RBU_PK_VTAB || pIter->nIndex==0 );
  }

  return p->rc;
}

/*
** This function constructs and returns a pointer to a nul-terminated 
** string containing some SQL clause or list based on one or more of the 
** column names currently stored in the pIter->azTblCol[] array.
*/
static char *rbuObjIterGetCollist(
  sqlite3rbu *p,                  /* RBU object */
  RbuObjIter *pIter               /* Object iterator for column names */
){
  char *zList = 0;
  const char *zSep = "";
  int i;
  for(i=0; i<pIter->nTblCol; i++){
    const char *z = pIter->azTblCol[i];
    zList = rbuMPrintf(p, "%z%s\"%w\"", zList, zSep, z);
    zSep = ", ";
  }
  return zList;
}

/*
** Return a comma separated list of the quoted PRIMARY KEY column names,
** in order, for the current table. Before each column name, add the text
** zPre. After each column name, add the zPost text. Use zSeparator as
** the separator text (usually ", ").
*/
static char *rbuObjIterGetPkList(
  sqlite3rbu *p,                  /* RBU object */
  RbuObjIter *pIter,              /* Object iterator for column names */
  const char *zPre,               /* Before each quoted column name */
  const char *zSeparator,         /* Separator to use between columns */
  const char *zPost               /* After each quoted column name */
){
  int iPk = 1;
  char *zRet = 0;
  const char *zSep = "";
  while( 1 ){
    int i;
    for(i=0; i<pIter->nTblCol; i++){
      if( (int)pIter->abTblPk[i]==iPk ){
        const char *zCol = pIter->azTblCol[i];
        zRet = rbuMPrintf(p, "%z%s%s\"%w\"%s", zRet, zSep, zPre, zCol, zPost);
        zSep = zSeparator;
        break;
      }
    }
    if( i==pIter->nTblCol ) break;
    iPk++;
  }
  return zRet;
}

/*
** This function is called as part of restarting an RBU vacuum within 
** stage 1 of the process (while the *-oal file is being built) while
** updating a table (not an index). The table may be a rowid table or
** a WITHOUT ROWID table. It queries the target database to find the 
** largest key that has already been written to the target table and
** constructs a WHERE clause that can be used to extract the remaining
** rows from the source table. For a rowid table, the WHERE clause
** is of the form:
**
**     "WHERE _rowid_ > ?"
**
** and for WITHOUT ROWID tables:
**
**     "WHERE (key1, key2) > (?, ?)"
**
** Instead of "?" placeholders, the actual WHERE clauses created by
** this function contain literal SQL values.
*/
static char *rbuVacuumTableStart(
  sqlite3rbu *p,                  /* RBU handle */
  RbuObjIter *pIter,              /* RBU iterator object */
  int bRowid,                     /* True for a rowid table */
  const char *zWrite              /* Target table name prefix */
){
  sqlite3_stmt *pMax = 0;
  char *zRet = 0;
  if( bRowid ){
    p->rc = prepareFreeAndCollectError(p->dbMain, &pMax, &p->zErrmsg, 
        sqlite3_mprintf(
          "SELECT max(_rowid_) FROM \"%s%w\"", zWrite, pIter->zTbl
        )
    );
    if( p->rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pMax) ){
      sqlite3_int64 iMax = sqlite3_column_int64(pMax, 0);
      zRet = rbuMPrintf(p, " WHERE _rowid_ > %lld ", iMax);
    }
    rbuFinalize(p, pMax);
  }else{
    char *zOrder = rbuObjIterGetPkList(p, pIter, "", ", ", " DESC");
    char *zSelect = rbuObjIterGetPkList(p, pIter, "quote(", "||','||", ")");
    char *zList = rbuObjIterGetPkList(p, pIter, "", ", ", "");

    if( p->rc==SQLITE_OK ){
      p->rc = prepareFreeAndCollectError(p->dbMain, &pMax, &p->zErrmsg, 
          sqlite3_mprintf(
            "SELECT %s FROM \"%s%w\" ORDER BY %s LIMIT 1", 
                zSelect, zWrite, pIter->zTbl, zOrder
          )
      );
      if( p->rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pMax) ){
        const char *zVal = (const char*)sqlite3_column_text(pMax, 0);
        zRet = rbuMPrintf(p, " WHERE (%s) > (%s) ", zList, zVal);
      }
      rbuFinalize(p, pMax);
    }

    sqlite3_free(zOrder);
    sqlite3_free(zSelect);
    sqlite3_free(zList);
  }
  return zRet;
}

/*
** This function is called as part of restating an RBU vacuum when the
** current operation is writing content to an index. If possible, it
** queries the target index b-tree for the largest key already written to
** it, then composes and returns an expression that can be used in a WHERE 
** clause to select the remaining required rows from the source table. 
** It is only possible to return such an expression if:
**
**   * The index contains no DESC columns, and
**   * The last key written to the index before the operation was 
**     suspended does not contain any NULL values.
**
** The expression is of the form:
**
**   (index-field1, index-field2, ...) > (?, ?, ...)
**
** except that the "?" placeholders are replaced with literal values.
**
** If the expression cannot be created, NULL is returned. In this case,
** the caller has to use an OFFSET clause to extract only the required 
** rows from the sourct table, just as it does for an RBU update operation.
*/
char *rbuVacuumIndexStart(
  sqlite3rbu *p,                  /* RBU handle */
  RbuObjIter *pIter               /* RBU iterator object */
){
  char *zOrder = 0;
  char *zLhs = 0;
  char *zSelect = 0;
  char *zVector = 0;
  char *zRet = 0;
  int bFailed = 0;
  const char *zSep = "";
  int iCol = 0;
  sqlite3_stmt *pXInfo = 0;

  p->rc = prepareFreeAndCollectError(p->dbMain, &pXInfo, &p->zErrmsg,
      sqlite3_mprintf("PRAGMA main.index_xinfo = %Q", pIter->zIdx)
  );
  while( p->rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pXInfo) ){
    int iCid = sqlite3_column_int(pXInfo, 1);
    const char *zCollate = (const char*)sqlite3_column_text(pXInfo, 4);
    const char *zCol;
    if( sqlite3_column_int(pXInfo, 3) ){
      bFailed = 1;
      break;
    }

    if( iCid<0 ){
      if( pIter->eType==RBU_PK_IPK ){
        int i;
        for(i=0; pIter->abTblPk[i]==0; i++);
        assert( i<pIter->nTblCol );
        zCol = pIter->azTblCol[i];
      }else{
        zCol = "_rowid_";
      }
    }else{
      zCol = pIter->azTblCol[iCid];
    }

    zLhs = rbuMPrintf(p, "%z%s \"%w\" COLLATE %Q",
        zLhs, zSep, zCol, zCollate
        );
    zOrder = rbuMPrintf(p, "%z%s \"rbu_imp_%d%w\" COLLATE %Q DESC",
        zOrder, zSep, iCol, zCol, zCollate
        );
    zSelect = rbuMPrintf(p, "%z%s quote(\"rbu_imp_%d%w\")",
        zSelect, zSep, iCol, zCol
        );
    zSep = ", ";
    iCol++;
  }
  rbuFinalize(p, pXInfo);
  if( bFailed ) goto index_start_out;

  if( p->rc==SQLITE_OK ){
    sqlite3_stmt *pSel = 0;

    p->rc = prepareFreeAndCollectError(p->dbMain, &pSel, &p->zErrmsg,
        sqlite3_mprintf("SELECT %s FROM \"rbu_imp_%w\" ORDER BY %s LIMIT 1",
          zSelect, pIter->zTbl, zOrder
        )
    );
    if( p->rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pSel) ){
      zSep = "";
      for(iCol=0; iCol<pIter->nCol; iCol++){
        const char *zQuoted = (const char*)sqlite3_column_text(pSel, iCol);
        if( zQuoted[0]=='N' ){
          bFailed = 1;
          break;
        }
        zVector = rbuMPrintf(p, "%z%s%s", zVector, zSep, zQuoted);
        zSep = ", ";
      }

      if( !bFailed ){
        zRet = rbuMPrintf(p, "(%s) > (%s)", zLhs, zVector);
      }
    }
    rbuFinalize(p, pSel);
  }

 index_start_out:
  sqlite3_free(zOrder);
  sqlite3_free(zSelect);
  sqlite3_free(zVector);
  sqlite3_free(zLhs);
  return zRet;
}

/*
** This function is used to create a SELECT list (the list of SQL 
** expressions that follows a SELECT keyword) for a SELECT statement 
** used to read from an data_xxx or rbu_tmp_xxx table while updating the 
** index object currently indicated by the iterator object passed as the 
** second argument. A "PRAGMA index_xinfo = <idxname>" statement is used 
** to obtain the required information.
**
** If the index is of the following form:
**
**   CREATE INDEX i1 ON t1(c, b COLLATE nocase);
**
** and "t1" is a table with an explicit INTEGER PRIMARY KEY column 
** "ipk", the returned string is:
**
**   "`c` COLLATE 'BINARY', `b` COLLATE 'NOCASE', `ipk` COLLATE 'BINARY'"
**
** As well as the returned string, three other malloc'd strings are 
** returned via output parameters. As follows:
**
**   pzImposterCols: ...
**   pzImposterPk: ...
**   pzWhere: ...
*/
static char *rbuObjIterGetIndexCols(
  sqlite3rbu *p,                  /* RBU object */
  RbuObjIter *pIter,              /* Object iterator for column names */
  char **pzImposterCols,          /* OUT: Columns for imposter table */
  char **pzImposterPk,            /* OUT: Imposter PK clause */
  char **pzWhere,                 /* OUT: WHERE clause */
  int *pnBind                     /* OUT: Trbul number of columns */
){
  int rc = p->rc;                 /* Error code */
  int rc2;                        /* sqlite3_finalize() return code */
  char *zRet = 0;                 /* String to return */
  char *zImpCols = 0;             /* String to return via *pzImposterCols */
  char *zImpPK = 0;               /* String to return via *pzImposterPK */
  char *zWhere = 0;               /* String to return via *pzWhere */
  int nBind = 0;                  /* Value to return via *pnBind */
  const char *zCom = "";          /* Set to ", " later on */
  const char *zAnd = "";          /* Set to " AND " later on */
  sqlite3_stmt *pXInfo = 0;       /* PRAGMA index_xinfo = ? */

  if( rc==SQLITE_OK ){
    assert( p->zErrmsg==0 );
    rc = prepareFreeAndCollectError(p->dbMain, &pXInfo, &p->zErrmsg,
        sqlite3_mprintf("PRAGMA main.index_xinfo = %Q", pIter->zIdx)
    );
  }

  while( rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pXInfo) ){
    int iCid = sqlite3_column_int(pXInfo, 1);
    int bDesc = sqlite3_column_int(pXInfo, 3);
    const char *zCollate = (const char*)sqlite3_column_text(pXInfo, 4);
    const char *zCol = 0;
    const char *zType;

    if( iCid==-2 ){
      int iSeq = sqlite3_column_int(pXInfo, 0);
      zRet = sqlite3_mprintf("%z%s(%.*s) COLLATE %Q", zRet, zCom,
          pIter->aIdxCol[iSeq].nSpan, pIter->aIdxCol[iSeq].zSpan, zCollate
      );
      zType = "";
    }else {
      if( iCid<0 ){
        /* An integer primary key. If the table has an explicit IPK, use
        ** its name. Otherwise, use "rbu_rowid".  */
        if( pIter->eType==RBU_PK_IPK ){
          int i;
          for(i=0; pIter->abTblPk[i]==0; i++);
          assert( i<pIter->nTblCol );
          zCol = pIter->azTblCol[i];
        }else if( rbuIsVacuum(p) ){
          zCol = "_rowid_";
        }else{
          zCol = "rbu_rowid";
        }
        zType = "INTEGER";
      }else{
        zCol = pIter->azTblCol[iCid];
        zType = pIter->azTblType[iCid];
      }
      zRet = sqlite3_mprintf("%z%s\"%w\" COLLATE %Q", zRet, zCom,zCol,zCollate);
    }

    if( pIter->bUnique==0 || sqlite3_column_int(pXInfo, 5) ){
      const char *zOrder = (bDesc ? " DESC" : "");
      zImpPK = sqlite3_mprintf("%z%s\"rbu_imp_%d%w\"%s", 
          zImpPK, zCom, nBind, zCol, zOrder
      );
    }
    zImpCols = sqlite3_mprintf("%z%s\"rbu_imp_%d%w\" %s COLLATE %Q", 
        zImpCols, zCom, nBind, zCol, zType, zCollate
    );
    zWhere = sqlite3_mprintf(
        "%z%s\"rbu_imp_%d%w\" IS ?", zWhere, zAnd, nBind, zCol
    );
    if( zRet==0 || zImpPK==0 || zImpCols==0 || zWhere==0 ) rc = SQLITE_NOMEM;
    zCom = ", ";
    zAnd = " AND ";
    nBind++;
  }

  rc2 = sqlite3_finalize(pXInfo);
  if( rc==SQLITE_OK ) rc = rc2;

  if( rc!=SQLITE_OK ){
    sqlite3_free(zRet);
    sqlite3_free(zImpCols);
    sqlite3_free(zImpPK);
    sqlite3_free(zWhere);
    zRet = 0;
    zImpCols = 0;
    zImpPK = 0;
    zWhere = 0;
    p->rc = rc;
  }

  *pzImposterCols = zImpCols;
  *pzImposterPk = zImpPK;
  *pzWhere = zWhere;
  *pnBind = nBind;
  return zRet;
}

/*
** Assuming the current table columns are "a", "b" and "c", and the zObj
** paramter is passed "old", return a string of the form:
**
**     "old.a, old.b, old.b"
**
** With the column names escaped.
**
** For tables with implicit rowids - RBU_PK_EXTERNAL and RBU_PK_NONE, append
** the text ", old._rowid_" to the returned value.
*/
static char *rbuObjIterGetOldlist(
  sqlite3rbu *p, 
  RbuObjIter *pIter,
  const char *zObj
){
  char *zList = 0;
  if( p->rc==SQLITE_OK && pIter->abIndexed ){
    const char *zS = "";
    int i;
    for(i=0; i<pIter->nTblCol; i++){
      if( pIter->abIndexed[i] ){
        const char *zCol = pIter->azTblCol[i];
        zList = sqlite3_mprintf("%z%s%s.\"%w\"", zList, zS, zObj, zCol);
      }else{
        zList = sqlite3_mprintf("%z%sNULL", zList, zS);
      }
      zS = ", ";
      if( zList==0 ){
        p->rc = SQLITE_NOMEM;
        break;
      }
    }

    /* For a table with implicit rowids, append "old._rowid_" to the list. */
    if( pIter->eType==RBU_PK_EXTERNAL || pIter->eType==RBU_PK_NONE ){
      zList = rbuMPrintf(p, "%z, %s._rowid_", zList, zObj);
    }
  }
  return zList;
}

/*
** Return an expression that can be used in a WHERE clause to match the
** primary key of the current table. For example, if the table is:
**
**   CREATE TABLE t1(a, b, c, PRIMARY KEY(b, c));
**
** Return the string:
**
**   "b = ?1 AND c = ?2"
*/
static char *rbuObjIterGetWhere(
  sqlite3rbu *p, 
  RbuObjIter *pIter
){
  char *zList = 0;
  if( pIter->eType==RBU_PK_VTAB || pIter->eType==RBU_PK_NONE ){
    zList = rbuMPrintf(p, "_rowid_ = ?%d", pIter->nTblCol+1);
  }else if( pIter->eType==RBU_PK_EXTERNAL ){
    const char *zSep = "";
    int i;
    for(i=0; i<pIter->nTblCol; i++){
      if( pIter->abTblPk[i] ){
        zList = rbuMPrintf(p, "%z%sc%d=?%d", zList, zSep, i, i+1);
        zSep = " AND ";
      }
    }
    zList = rbuMPrintf(p, 
        "_rowid_ = (SELECT id FROM rbu_imposter2 WHERE %z)", zList
    );

  }else{
    const char *zSep = "";
    int i;
    for(i=0; i<pIter->nTblCol; i++){
      if( pIter->abTblPk[i] ){
        const char *zCol = pIter->azTblCol[i];
        zList = rbuMPrintf(p, "%z%s\"%w\"=?%d", zList, zSep, zCol, i+1);
        zSep = " AND ";
      }
    }
  }
  return zList;
}

/*
** The SELECT statement iterating through the keys for the current object
** (p->objiter.pSelect) currently points to a valid row. However, there
** is something wrong with the rbu_control value in the rbu_control value
** stored in the (p->nCol+1)'th column. Set the error code and error message
** of the RBU handle to something reflecting this.
*/
static void rbuBadControlError(sqlite3rbu *p){
  p->rc = SQLITE_ERROR;
  p->zErrmsg = sqlite3_mprintf("invalid rbu_control value");
}


/*
** Return a nul-terminated string containing the comma separated list of
** assignments that should be included following the "SET" keyword of
** an UPDATE statement used to update the table object that the iterator
** passed as the second argument currently points to if the rbu_control
** column of the data_xxx table entry is set to zMask.
**
** The memory for the returned string is obtained from sqlite3_malloc().
** It is the responsibility of the caller to eventually free it using
** sqlite3_free(). 
**
** If an OOM error is encountered when allocating space for the new
** string, an error code is left in the rbu handle passed as the first
** argument and NULL is returned. Or, if an error has already occurred
** when this function is called, NULL is returned immediately, without
** attempting the allocation or modifying the stored error code.
*/
static char *rbuObjIterGetSetlist(
  sqlite3rbu *p,
  RbuObjIter *pIter,
  const char *zMask
){
  char *zList = 0;
  if( p->rc==SQLITE_OK ){
    int i;

    if( (int)strlen(zMask)!=pIter->nTblCol ){
      rbuBadControlError(p);
    }else{
      const char *zSep = "";
      for(i=0; i<pIter->nTblCol; i++){
        char c = zMask[pIter->aiSrcOrder[i]];
        if( c=='x' ){
          zList = rbuMPrintf(p, "%z%s\"%w\"=?%d", 
              zList, zSep, pIter->azTblCol[i], i+1
          );
          zSep = ", ";
        }
        else if( c=='d' ){
          zList = rbuMPrintf(p, "%z%s\"%w\"=rbu_delta(\"%w\", ?%d)", 
              zList, zSep, pIter->azTblCol[i], pIter->azTblCol[i], i+1
          );
          zSep = ", ";
        }
        else if( c=='f' ){
          zList = rbuMPrintf(p, "%z%s\"%w\"=rbu_fossil_delta(\"%w\", ?%d)", 
              zList, zSep, pIter->azTblCol[i], pIter->azTblCol[i], i+1
          );
          zSep = ", ";
        }
      }
    }
  }
  return zList;
}

/*
** Return a nul-terminated string consisting of nByte comma separated
** "?" expressions. For example, if nByte is 3, return a pointer to
** a buffer containing the string "?,?,?".
**
** The memory for the returned string is obtained from sqlite3_malloc().
** It is the responsibility of the caller to eventually free it using
** sqlite3_free(). 
**
** If an OOM error is encountered when allocating space for the new
** string, an error code is left in the rbu handle passed as the first
** argument and NULL is returned. Or, if an error has already occurred
** when this function is called, NULL is returned immediately, without
** attempting the allocation or modifying the stored error code.
*/
static char *rbuObjIterGetBindlist(sqlite3rbu *p, int nBind){
  char *zRet = 0;
  sqlite3_int64 nByte = 2*(sqlite3_int64)nBind + 1;

  zRet = (char*)rbuMalloc(p, nByte);
  if( zRet ){
    int i;
    for(i=0; i<nBind; i++){
      zRet[i*2] = '?';
      zRet[i*2+1] = (i+1==nBind) ? '\0' : ',';
    }
  }
  return zRet;
}

/*
** The iterator currently points to a table (not index) of type 
** RBU_PK_WITHOUT_ROWID. This function creates the PRIMARY KEY 
** declaration for the corresponding imposter table. For example,
** if the iterator points to a table created as:
**
**   CREATE TABLE t1(a, b, c, PRIMARY KEY(b, a DESC)) WITHOUT ROWID
**
** this function returns:
**
**   PRIMARY KEY("b", "a" DESC)
*/
static char *rbuWithoutRowidPK(sqlite3rbu *p, RbuObjIter *pIter){
  char *z = 0;
  assert( pIter->zIdx==0 );
  if( p->rc==SQLITE_OK ){
    const char *zSep = "PRIMARY KEY(";
    sqlite3_stmt *pXList = 0;     /* PRAGMA index_list = (pIter->zTbl) */
    sqlite3_stmt *pXInfo = 0;     /* PRAGMA index_xinfo = <pk-index> */
   
    p->rc = prepareFreeAndCollectError(p->dbMain, &pXList, &p->zErrmsg,
        sqlite3_mprintf("PRAGMA main.index_list = %Q", pIter->zTbl)
    );
    while( p->rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pXList) ){
      const char *zOrig = (const char*)sqlite3_column_text(pXList,3);
      if( zOrig && strcmp(zOrig, "pk")==0 ){
        const char *zIdx = (const char*)sqlite3_column_text(pXList,1);
        if( zIdx ){
          p->rc = prepareFreeAndCollectError(p->dbMain, &pXInfo, &p->zErrmsg,
              sqlite3_mprintf("PRAGMA main.index_xinfo = %Q", zIdx)
          );
        }
        break;
      }
    }
    rbuFinalize(p, pXList);

    while( p->rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pXInfo) ){
      if( sqlite3_column_int(pXInfo, 5) ){
        /* int iCid = sqlite3_column_int(pXInfo, 0); */
        const char *zCol = (const char*)sqlite3_column_text(pXInfo, 2);
        const char *zDesc = sqlite3_column_int(pXInfo, 3) ? " DESC" : "";
        z = rbuMPrintf(p, "%z%s\"%w\"%s", z, zSep, zCol, zDesc);
        zSep = ", ";
      }
    }
    z = rbuMPrintf(p, "%z)", z);
    rbuFinalize(p, pXInfo);
  }
  return z;
}

/*
** This function creates the second imposter table used when writing to
** a table b-tree where the table has an external primary key. If the
** iterator passed as the second argument does not currently point to
** a table (not index) with an external primary key, this function is a
** no-op. 
**
** Assuming the iterator does point to a table with an external PK, this
** function creates a WITHOUT ROWID imposter table named "rbu_imposter2"
** used to access that PK index. For example, if the target table is
** declared as follows:
**
**   CREATE TABLE t1(a, b TEXT, c REAL, PRIMARY KEY(b, c));
**
** then the imposter table schema is:
**
**   CREATE TABLE rbu_imposter2(c1 TEXT, c2 REAL, id INTEGER) WITHOUT ROWID;
**
*/
static void rbuCreateImposterTable2(sqlite3rbu *p, RbuObjIter *pIter){
  if( p->rc==SQLITE_OK && pIter->eType==RBU_PK_EXTERNAL ){
    int tnum = pIter->iPkTnum;    /* Root page of PK index */
    sqlite3_stmt *pQuery = 0;     /* SELECT name ... WHERE rootpage = $tnum */
    const char *zIdx = 0;         /* Name of PK index */
    sqlite3_stmt *pXInfo = 0;     /* PRAGMA main.index_xinfo = $zIdx */
    const char *zComma = "";
    char *zCols = 0;              /* Used to build up list of table cols */
    char *zPk = 0;                /* Used to build up table PK declaration */

    /* Figure out the name of the primary key index for the current table.
    ** This is needed for the argument to "PRAGMA index_xinfo". Set
    ** zIdx to point to a nul-terminated string containing this name. */
    p->rc = prepareAndCollectError(p->dbMain, &pQuery, &p->zErrmsg, 
        "SELECT name FROM sqlite_schema WHERE rootpage = ?"
    );
    if( p->rc==SQLITE_OK ){
      sqlite3_bind_int(pQuery, 1, tnum);
      if( SQLITE_ROW==sqlite3_step(pQuery) ){
        zIdx = (const char*)sqlite3_column_text(pQuery, 0);
      }
    }
    if( zIdx ){
      p->rc = prepareFreeAndCollectError(p->dbMain, &pXInfo, &p->zErrmsg,
          sqlite3_mprintf("PRAGMA main.index_xinfo = %Q", zIdx)
      );
    }
    rbuFinalize(p, pQuery);

    while( p->rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pXInfo) ){
      int bKey = sqlite3_column_int(pXInfo, 5);
      if( bKey ){
        int iCid = sqlite3_column_int(pXInfo, 1);
        int bDesc = sqlite3_column_int(pXInfo, 3);
        const char *zCollate = (const char*)sqlite3_column_text(pXInfo, 4);
        zCols = rbuMPrintf(p, "%z%sc%d %s COLLATE %Q", zCols, zComma, 
            iCid, pIter->azTblType[iCid], zCollate
        );
        zPk = rbuMPrintf(p, "%z%sc%d%s", zPk, zComma, iCid, bDesc?" DESC":"");
        zComma = ", ";
      }
    }
    zCols = rbuMPrintf(p, "%z, id INTEGER", zCols);
    rbuFinalize(p, pXInfo);

    sqlite3_test_control(SQLITE_TESTCTRL_IMPOSTER, p->dbMain, "main", 1, tnum);
    rbuMPrintfExec(p, p->dbMain,
        "CREATE TABLE rbu_imposter2(%z, PRIMARY KEY(%z)) WITHOUT ROWID", 
        zCols, zPk
    );
    sqlite3_test_control(SQLITE_TESTCTRL_IMPOSTER, p->dbMain, "main", 0, 0);
  }
}

/*
** If an error has already occurred when this function is called, it 
** immediately returns zero (without doing any work). Or, if an error
** occurs during the execution of this function, it sets the error code
** in the sqlite3rbu object indicated by the first argument and returns
** zero.
**
** The iterator passed as the second argument is guaranteed to point to
** a table (not an index) when this function is called. This function
** attempts to create any imposter table required to write to the main
** table b-tree of the table before returning. Non-zero is returned if
** an imposter table are created, or zero otherwise.
**
** An imposter table is required in all cases except RBU_PK_VTAB. Only
** virtual tables are written to directly. The imposter table has the 
** same schema as the actual target table (less any UNIQUE constraints). 
** More precisely, the "same schema" means the same columns, types, 
** collation sequences. For tables that do not have an external PRIMARY
** KEY, it also means the same PRIMARY KEY declaration.
*/
static void rbuCreateImposterTable(sqlite3rbu *p, RbuObjIter *pIter){
  if( p->rc==SQLITE_OK && pIter->eType!=RBU_PK_VTAB ){
    int tnum = pIter->iTnum;
    const char *zComma = "";
    char *zSql = 0;
    int iCol;
    sqlite3_test_control(SQLITE_TESTCTRL_IMPOSTER, p->dbMain, "main", 0, 1);

    for(iCol=0; p->rc==SQLITE_OK && iCol<pIter->nTblCol; iCol++){
      const char *zPk = "";
      const char *zCol = pIter->azTblCol[iCol];
      const char *zColl = 0;

      p->rc = sqlite3_table_column_metadata(
          p->dbMain, "main", pIter->zTbl, zCol, 0, &zColl, 0, 0, 0
      );

      if( pIter->eType==RBU_PK_IPK && pIter->abTblPk[iCol] ){
        /* If the target table column is an "INTEGER PRIMARY KEY", add
        ** "PRIMARY KEY" to the imposter table column declaration. */
        zPk = "PRIMARY KEY ";
      }
      zSql = rbuMPrintf(p, "%z%s\"%w\" %s %sCOLLATE %Q%s", 
          zSql, zComma, zCol, pIter->azTblType[iCol], zPk, zColl,
          (pIter->abNotNull[iCol] ? " NOT NULL" : "")
      );
      zComma = ", ";
    }

    if( pIter->eType==RBU_PK_WITHOUT_ROWID ){
      char *zPk = rbuWithoutRowidPK(p, pIter);
      if( zPk ){
        zSql = rbuMPrintf(p, "%z, %z", zSql, zPk);
      }
    }

    sqlite3_test_control(SQLITE_TESTCTRL_IMPOSTER, p->dbMain, "main", 1, tnum);
    rbuMPrintfExec(p, p->dbMain, "CREATE TABLE \"rbu_imp_%w\"(%z)%s", 
        pIter->zTbl, zSql, 
        (pIter->eType==RBU_PK_WITHOUT_ROWID ? " WITHOUT ROWID" : "")
    );
    sqlite3_test_control(SQLITE_TESTCTRL_IMPOSTER, p->dbMain, "main", 0, 0);
  }
}

/*
** Prepare a statement used to insert rows into the "rbu_tmp_xxx" table.
** Specifically a statement of the form:
**
**     INSERT INTO rbu_tmp_xxx VALUES(?, ?, ? ...);
**
** The number of bound variables is equal to the number of columns in
** the target table, plus one (for the rbu_control column), plus one more 
** (for the rbu_rowid column) if the target table is an implicit IPK or 
** virtual table.
*/
static void rbuObjIterPrepareTmpInsert(
  sqlite3rbu *p, 
  RbuObjIter *pIter,
  const char *zCollist,
  const char *zRbuRowid
){
  int bRbuRowid = (pIter->eType==RBU_PK_EXTERNAL || pIter->eType==RBU_PK_NONE);
  char *zBind = rbuObjIterGetBindlist(p, pIter->nTblCol + 1 + bRbuRowid);
  if( zBind ){
    assert( pIter->pTmpInsert==0 );
    p->rc = prepareFreeAndCollectError(
        p->dbRbu, &pIter->pTmpInsert, &p->zErrmsg, sqlite3_mprintf(
          "INSERT INTO %s.'rbu_tmp_%q'(rbu_control,%s%s) VALUES(%z)", 
          p->zStateDb, pIter->zDataTbl, zCollist, zRbuRowid, zBind
    ));
  }
}

static void rbuTmpInsertFunc(
  sqlite3_context *pCtx, 
  int nVal,
  sqlite3_value **apVal
){
  sqlite3rbu *p = sqlite3_user_data(pCtx);
  int rc = SQLITE_OK;
  int i;

  assert( sqlite3_value_int(apVal[0])!=0
      || p->objiter.eType==RBU_PK_EXTERNAL 
      || p->objiter.eType==RBU_PK_NONE 
  );
  if( sqlite3_value_int(apVal[0])!=0 ){
    p->nPhaseOneStep += p->objiter.nIndex;
  }

  for(i=0; rc==SQLITE_OK && i<nVal; i++){
    rc = sqlite3_bind_value(p->objiter.pTmpInsert, i+1, apVal[i]);
  }
  if( rc==SQLITE_OK ){
    sqlite3_step(p->objiter.pTmpInsert);
    rc = sqlite3_reset(p->objiter.pTmpInsert);
  }

  if( rc!=SQLITE_OK ){
    sqlite3_result_error_code(pCtx, rc);
  }
}

static char *rbuObjIterGetIndexWhere(sqlite3rbu *p, RbuObjIter *pIter){
  sqlite3_stmt *pStmt = 0;
  int rc = p->rc;
  char *zRet = 0;

  assert( pIter->zIdxSql==0 && pIter->nIdxCol==0 && pIter->aIdxCol==0 );

  if( rc==SQLITE_OK ){
    rc = prepareAndCollectError(p->dbMain, &pStmt, &p->zErrmsg,
        "SELECT trim(sql) FROM sqlite_schema WHERE type='index' AND name=?"
    );
  }
  if( rc==SQLITE_OK ){
    int rc2;
    rc = sqlite3_bind_text(pStmt, 1, pIter->zIdx, -1, SQLITE_STATIC);
    if( rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pStmt) ){
      char *zSql = (char*)sqlite3_column_text(pStmt, 0);
      if( zSql ){
        pIter->zIdxSql = zSql = rbuStrndup(zSql, &rc);
      }
      if( zSql ){
        int nParen = 0;           /* Number of open parenthesis */
        int i;
        int iIdxCol = 0;
        int nIdxAlloc = 0;
        for(i=0; zSql[i]; i++){
          char c = zSql[i];

          /* If necessary, grow the pIter->aIdxCol[] array */
          if( iIdxCol==nIdxAlloc ){
            RbuSpan *aIdxCol = (RbuSpan*)sqlite3_realloc(
                pIter->aIdxCol, (nIdxAlloc+16)*sizeof(RbuSpan)
            );
            if( aIdxCol==0 ){
              rc = SQLITE_NOMEM;
              break;
            }
            pIter->aIdxCol = aIdxCol;
            nIdxAlloc += 16;
          }

          if( c=='(' ){
            if( nParen==0 ){
              assert( iIdxCol==0 );
              pIter->aIdxCol[0].zSpan = &zSql[i+1];
            }
            nParen++;
          }
          else if( c==')' ){
            nParen--;
            if( nParen==0 ){
              int nSpan = &zSql[i] - pIter->aIdxCol[iIdxCol].zSpan;
              pIter->aIdxCol[iIdxCol++].nSpan = nSpan;
              i++;
              break;
            }
          }else if( c==',' && nParen==1 ){
            int nSpan = &zSql[i] - pIter->aIdxCol[iIdxCol].zSpan;
            pIter->aIdxCol[iIdxCol++].nSpan = nSpan;
            pIter->aIdxCol[iIdxCol].zSpan = &zSql[i+1];
          }else if( c=='"' || c=='\'' || c=='`' ){
            for(i++; 1; i++){
              if( zSql[i]==c ){
                if( zSql[i+1]!=c ) break;
                i++;
              }
            }
          }else if( c=='[' ){
            for(i++; 1; i++){
              if( zSql[i]==']' ) break;
            }
          }else if( c=='-' && zSql[i+1]=='-' ){
            for(i=i+2; zSql[i] && zSql[i]!='\n'; i++);
            if( zSql[i]=='\0' ) break;
          }else if( c=='/' && zSql[i+1]=='*' ){
            for(i=i+2; zSql[i] && (zSql[i]!='*' || zSql[i+1]!='/'); i++);
            if( zSql[i]=='\0' ) break;
            i++;
          }
        }
        if( zSql[i] ){
          zRet = rbuStrndup(&zSql[i], &rc);
        }
        pIter->nIdxCol = iIdxCol;
      }
    }

    rc2 = sqlite3_finalize(pStmt);
    if( rc==SQLITE_OK ) rc = rc2;
  }

  p->rc = rc;
  return zRet;
}

/*
** Ensure that the SQLite statement handles required to update the 
** target database object currently indicated by the iterator passed 
** as the second argument are available.
*/
static int rbuObjIterPrepareAll(
  sqlite3rbu *p, 
  RbuObjIter *pIter,
  int nOffset                     /* Add "LIMIT -1 OFFSET $nOffset" to SELECT */
){
  assert( pIter->bCleanup==0 );
  if( pIter->pSelect==0 && rbuObjIterCacheTableInfo(p, pIter)==SQLITE_OK ){
    const int tnum = pIter->iTnum;
    char *zCollist = 0;           /* List of indexed columns */
    char **pz = &p->zErrmsg;
    const char *zIdx = pIter->zIdx;
    char *zLimit = 0;

    if( nOffset ){
      zLimit = sqlite3_mprintf(" LIMIT -1 OFFSET %d", nOffset);
      if( !zLimit ) p->rc = SQLITE_NOMEM;
    }

    if( zIdx ){
      const char *zTbl = pIter->zTbl;
      char *zImposterCols = 0;    /* Columns for imposter table */
      char *zImposterPK = 0;      /* Primary key declaration for imposter */
      char *zWhere = 0;           /* WHERE clause on PK columns */
      char *zBind = 0;
      char *zPart = 0;
      int nBind = 0;

      assert( pIter->eType!=RBU_PK_VTAB );
      zPart = rbuObjIterGetIndexWhere(p, pIter);
      zCollist = rbuObjIterGetIndexCols(
          p, pIter, &zImposterCols, &zImposterPK, &zWhere, &nBind
      );
      zBind = rbuObjIterGetBindlist(p, nBind);

      /* Create the imposter table used to write to this index. */
      sqlite3_test_control(SQLITE_TESTCTRL_IMPOSTER, p->dbMain, "main", 0, 1);
      sqlite3_test_control(SQLITE_TESTCTRL_IMPOSTER, p->dbMain, "main", 1,tnum);
      rbuMPrintfExec(p, p->dbMain,
          "CREATE TABLE \"rbu_imp_%w\"( %s, PRIMARY KEY( %s ) ) WITHOUT ROWID",
          zTbl, zImposterCols, zImposterPK
      );
      sqlite3_test_control(SQLITE_TESTCTRL_IMPOSTER, p->dbMain, "main", 0, 0);

      /* Create the statement to insert index entries */
      pIter->nCol = nBind;
      if( p->rc==SQLITE_OK ){
        p->rc = prepareFreeAndCollectError(
            p->dbMain, &pIter->pInsert, &p->zErrmsg,
          sqlite3_mprintf("INSERT INTO \"rbu_imp_%w\" VALUES(%s)", zTbl, zBind)
        );
      }

      /* And to delete index entries */
      if( rbuIsVacuum(p)==0 && p->rc==SQLITE_OK ){
        p->rc = prepareFreeAndCollectError(
            p->dbMain, &pIter->pDelete, &p->zErrmsg,
          sqlite3_mprintf("DELETE FROM \"rbu_imp_%w\" WHERE %s", zTbl, zWhere)
        );
      }

      /* Create the SELECT statement to read keys in sorted order */
      if( p->rc==SQLITE_OK ){
        char *zSql;
        if( rbuIsVacuum(p) ){
          char *zStart = 0;
          if( nOffset ){
            zStart = rbuVacuumIndexStart(p, pIter);
            if( zStart ){
              sqlite3_free(zLimit);
              zLimit = 0;
            }
          }

          zSql = sqlite3_mprintf(
              "SELECT %s, 0 AS rbu_control FROM '%q' %s %s %s ORDER BY %s%s",
              zCollist, 
              pIter->zDataTbl,
              zPart, 
              (zStart ? (zPart ? "AND" : "WHERE") : ""), zStart,
              zCollist, zLimit
          );
          sqlite3_free(zStart);
        }else

        if( pIter->eType==RBU_PK_EXTERNAL || pIter->eType==RBU_PK_NONE ){
          zSql = sqlite3_mprintf(
              "SELECT %s, rbu_control FROM %s.'rbu_tmp_%q' %s ORDER BY %s%s",
              zCollist, p->zStateDb, pIter->zDataTbl,
              zPart, zCollist, zLimit
          );
        }else{
          zSql = sqlite3_mprintf(
              "SELECT %s, rbu_control FROM %s.'rbu_tmp_%q' %s "
              "UNION ALL "
              "SELECT %s, rbu_control FROM '%q' "
              "%s %s typeof(rbu_control)='integer' AND rbu_control!=1 "
              "ORDER BY %s%s",
              zCollist, p->zStateDb, pIter->zDataTbl, zPart,
              zCollist, pIter->zDataTbl, 
              zPart,
              (zPart ? "AND" : "WHERE"),
              zCollist, zLimit
          );
        }
        if( p->rc==SQLITE_OK ){
          p->rc = prepareFreeAndCollectError(p->dbRbu,&pIter->pSelect,pz,zSql);
        }else{
          sqlite3_free(zSql);
        }
      }

      sqlite3_free(zImposterCols);
      sqlite3_free(zImposterPK);
      sqlite3_free(zWhere);
      sqlite3_free(zBind);
      sqlite3_free(zPart);
    }else{
      int bRbuRowid = (pIter->eType==RBU_PK_VTAB)
                    ||(pIter->eType==RBU_PK_NONE)
                    ||(pIter->eType==RBU_PK_EXTERNAL && rbuIsVacuum(p));
      const char *zTbl = pIter->zTbl;       /* Table this step applies to */
      const char *zWrite;                   /* Imposter table name */

      char *zBindings = rbuObjIterGetBindlist(p, pIter->nTblCol + bRbuRowid);
      char *zWhere = rbuObjIterGetWhere(p, pIter);
      char *zOldlist = rbuObjIterGetOldlist(p, pIter, "old");
      char *zNewlist = rbuObjIterGetOldlist(p, pIter, "new");

      zCollist = rbuObjIterGetCollist(p, pIter);
      pIter->nCol = pIter->nTblCol;

      /* Create the imposter table or tables (if required). */
      rbuCreateImposterTable(p, pIter);
      rbuCreateImposterTable2(p, pIter);
      zWrite = (pIter->eType==RBU_PK_VTAB ? "" : "rbu_imp_");

      /* Create the INSERT statement to write to the target PK b-tree */
      if( p->rc==SQLITE_OK ){
        p->rc = prepareFreeAndCollectError(p->dbMain, &pIter->pInsert, pz,
            sqlite3_mprintf(
              "INSERT INTO \"%s%w\"(%s%s) VALUES(%s)", 
              zWrite, zTbl, zCollist, (bRbuRowid ? ", _rowid_" : ""), zBindings
            )
        );
      }

      /* Create the DELETE statement to write to the target PK b-tree.
      ** Because it only performs INSERT operations, this is not required for
      ** an rbu vacuum handle.  */
      if( rbuIsVacuum(p)==0 && p->rc==SQLITE_OK ){
        p->rc = prepareFreeAndCollectError(p->dbMain, &pIter->pDelete, pz,
            sqlite3_mprintf(
              "DELETE FROM \"%s%w\" WHERE %s", zWrite, zTbl, zWhere
            )
        );
      }

      if( rbuIsVacuum(p)==0 && pIter->abIndexed ){
        const char *zRbuRowid = "";
        if( pIter->eType==RBU_PK_EXTERNAL || pIter->eType==RBU_PK_NONE ){
          zRbuRowid = ", rbu_rowid";
        }

        /* Create the rbu_tmp_xxx table and the triggers to populate it. */
        rbuMPrintfExec(p, p->dbRbu,
            "CREATE TABLE IF NOT EXISTS %s.'rbu_tmp_%q' AS "
            "SELECT *%s FROM '%q' WHERE 0;"
            , p->zStateDb, pIter->zDataTbl
            , (pIter->eType==RBU_PK_EXTERNAL ? ", 0 AS rbu_rowid" : "")
            , pIter->zDataTbl
        );

        rbuMPrintfExec(p, p->dbMain,
            "CREATE TEMP TRIGGER rbu_delete_tr BEFORE DELETE ON \"%s%w\" "
            "BEGIN "
            "  SELECT rbu_tmp_insert(3, %s);"
            "END;"

            "CREATE TEMP TRIGGER rbu_update1_tr BEFORE UPDATE ON \"%s%w\" "
            "BEGIN "
            "  SELECT rbu_tmp_insert(3, %s);"
            "END;"

            "CREATE TEMP TRIGGER rbu_update2_tr AFTER UPDATE ON \"%s%w\" "
            "BEGIN "
            "  SELECT rbu_tmp_insert(4, %s);"
            "END;",
            zWrite, zTbl, zOldlist,
            zWrite, zTbl, zOldlist,
            zWrite, zTbl, zNewlist
        );

        if( pIter->eType==RBU_PK_EXTERNAL || pIter->eType==RBU_PK_NONE ){
          rbuMPrintfExec(p, p->dbMain,
              "CREATE TEMP TRIGGER rbu_insert_tr AFTER INSERT ON \"%s%w\" "
              "BEGIN "
              "  SELECT rbu_tmp_insert(0, %s);"
              "END;",
              zWrite, zTbl, zNewlist
          );
        }

        rbuObjIterPrepareTmpInsert(p, pIter, zCollist, zRbuRowid);
      }

      /* Create the SELECT statement to read keys from data_xxx */
      if( p->rc==SQLITE_OK ){
        const char *zRbuRowid = "";
        char *zStart = 0;
        char *zOrder = 0;
        if( bRbuRowid ){
          zRbuRowid = rbuIsVacuum(p) ? ",_rowid_ " : ",rbu_rowid";
        }

        if( rbuIsVacuum(p) ){
          if( nOffset ){
            zStart = rbuVacuumTableStart(p, pIter, bRbuRowid, zWrite);
            if( zStart ){
              sqlite3_free(zLimit);
              zLimit = 0;
            }
          }
          if( bRbuRowid ){
            zOrder = rbuMPrintf(p, "_rowid_");
          }else{
            zOrder = rbuObjIterGetPkList(p, pIter, "", ", ", "");
          }
        }

        if( p->rc==SQLITE_OK ){
          p->rc = prepareFreeAndCollectError(p->dbRbu, &pIter->pSelect, pz,
              sqlite3_mprintf(
                "SELECT %s,%s rbu_control%s FROM '%q'%s %s %s %s",
                zCollist, 
                (rbuIsVacuum(p) ? "0 AS " : ""),
                zRbuRowid,
                pIter->zDataTbl, (zStart ? zStart : ""), 
                (zOrder ? "ORDER BY" : ""), zOrder,
                zLimit
              )
          );
        }
        sqlite3_free(zStart);
        sqlite3_free(zOrder);
      }

      sqlite3_free(zWhere);
      sqlite3_free(zOldlist);
      sqlite3_free(zNewlist);
      sqlite3_free(zBindings);
    }
    sqlite3_free(zCollist);
    sqlite3_free(zLimit);
  }
  
  return p->rc;
}

/*
** Set output variable *ppStmt to point to an UPDATE statement that may
** be used to update the imposter table for the main table b-tree of the
** table object that pIter currently points to, assuming that the 
** rbu_control column of the data_xyz table contains zMask.
** 
** If the zMask string does not specify any columns to update, then this
** is not an error. Output variable *ppStmt is set to NULL in this case.
*/
static int rbuGetUpdateStmt(
  sqlite3rbu *p,                  /* RBU handle */
  RbuObjIter *pIter,              /* Object iterator */
  const char *zMask,              /* rbu_control value ('x.x.') */
  sqlite3_stmt **ppStmt           /* OUT: UPDATE statement handle */
){
  RbuUpdateStmt **pp;
  RbuUpdateStmt *pUp = 0;
  int nUp = 0;

  /* In case an error occurs */
  *ppStmt = 0;

  /* Search for an existing statement. If one is found, shift it to the front
  ** of the LRU queue and return immediately. Otherwise, leave nUp pointing
  ** to the number of statements currently in the cache and pUp to the
  ** last object in the list.  */
  for(pp=&pIter->pRbuUpdate; *pp; pp=&((*pp)->pNext)){
    pUp = *pp;
    if( strcmp(pUp->zMask, zMask)==0 ){
      *pp = pUp->pNext;
      pUp->pNext = pIter->pRbuUpdate;
      pIter->pRbuUpdate = pUp;
      *ppStmt = pUp->pUpdate; 
      return SQLITE_OK;
    }
    nUp++;
  }
  assert( pUp==0 || pUp->pNext==0 );

  if( nUp>=SQLITE_RBU_UPDATE_CACHESIZE ){
    for(pp=&pIter->pRbuUpdate; *pp!=pUp; pp=&((*pp)->pNext));
    *pp = 0;
    sqlite3_finalize(pUp->pUpdate);
    pUp->pUpdate = 0;
  }else{
    pUp = (RbuUpdateStmt*)rbuMalloc(p, sizeof(RbuUpdateStmt)+pIter->nTblCol+1);
  }

  if( pUp ){
    char *zWhere = rbuObjIterGetWhere(p, pIter);
    char *zSet = rbuObjIterGetSetlist(p, pIter, zMask);
    char *zUpdate = 0;

    pUp->zMask = (char*)&pUp[1];
    memcpy(pUp->zMask, zMask, pIter->nTblCol);
    pUp->pNext = pIter->pRbuUpdate;
    pIter->pRbuUpdate = pUp;

    if( zSet ){
      const char *zPrefix = "";

      if( pIter->eType!=RBU_PK_VTAB ) zPrefix = "rbu_imp_";
      zUpdate = sqlite3_mprintf("UPDATE \"%s%w\" SET %s WHERE %s", 
          zPrefix, pIter->zTbl, zSet, zWhere
      );
      p->rc = prepareFreeAndCollectError(
          p->dbMain, &pUp->pUpdate, &p->zErrmsg, zUpdate
      );
      *ppStmt = pUp->pUpdate;
    }
    sqlite3_free(zWhere);
    sqlite3_free(zSet);
  }

  return p->rc;
}

static sqlite3 *rbuOpenDbhandle(
  sqlite3rbu *p, 
  const char *zName, 
  int bUseVfs
){
  sqlite3 *db = 0;
  if( p->rc==SQLITE_OK ){
    const int flags = SQLITE_OPEN_READWRITE|SQLITE_OPEN_CREATE|SQLITE_OPEN_URI;
    p->rc = sqlite3_open_v2(zName, &db, flags, bUseVfs ? p->zVfsName : 0);
    if( p->rc ){
      p->zErrmsg = sqlite3_mprintf("%s", sqlite3_errmsg(db));
      sqlite3_close(db);
      db = 0;
    }
  }
  return db;
}

/*
** Free an RbuState object allocated by rbuLoadState().
*/
static void rbuFreeState(RbuState *p){
  if( p ){
    sqlite3_free(p->zTbl);
    sqlite3_free(p->zDataTbl);
    sqlite3_free(p->zIdx);
    sqlite3_free(p);
  }
}

/*
** Allocate an RbuState object and load the contents of the rbu_state 
** table into it. Return a pointer to the new object. It is the 
** responsibility of the caller to eventually free the object using
** sqlite3_free().
**
** If an error occurs, leave an error code and message in the rbu handle
** and return NULL.
*/
static RbuState *rbuLoadState(sqlite3rbu *p){
  RbuState *pRet = 0;
  sqlite3_stmt *pStmt = 0;
  int rc;
  int rc2;

  pRet = (RbuState*)rbuMalloc(p, sizeof(RbuState));
  if( pRet==0 ) return 0;

  rc = prepareFreeAndCollectError(p->dbRbu, &pStmt, &p->zErrmsg, 
      sqlite3_mprintf("SELECT k, v FROM %s.rbu_state", p->zStateDb)
  );
  while( rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pStmt) ){
    switch( sqlite3_column_int(pStmt, 0) ){
      case RBU_STATE_STAGE:
        pRet->eStage = sqlite3_column_int(pStmt, 1);
        if( pRet->eStage!=RBU_STAGE_OAL
         && pRet->eStage!=RBU_STAGE_MOVE
         && pRet->eStage!=RBU_STAGE_CKPT
        ){
          p->rc = SQLITE_CORRUPT;
        }
        break;

      case RBU_STATE_TBL:
        pRet->zTbl = rbuStrndup((char*)sqlite3_column_text(pStmt, 1), &rc);
        break;

      case RBU_STATE_IDX:
        pRet->zIdx = rbuStrndup((char*)sqlite3_column_text(pStmt, 1), &rc);
        break;

      case RBU_STATE_ROW:
        pRet->nRow = sqlite3_column_int(pStmt, 1);
        break;

      case RBU_STATE_PROGRESS:
        pRet->nProgress = sqlite3_column_int64(pStmt, 1);
        break;

      case RBU_STATE_CKPT:
        pRet->iWalCksum = sqlite3_column_int64(pStmt, 1);
        break;

      case RBU_STATE_COOKIE:
        pRet->iCookie = (u32)sqlite3_column_int64(pStmt, 1);
        break;

      case RBU_STATE_OALSZ:
        pRet->iOalSz = (u32)sqlite3_column_int64(pStmt, 1);
        break;

      case RBU_STATE_PHASEONESTEP:
        pRet->nPhaseOneStep = sqlite3_column_int64(pStmt, 1);
        break;

      case RBU_STATE_DATATBL:
        pRet->zDataTbl = rbuStrndup((char*)sqlite3_column_text(pStmt, 1), &rc);
        break;

      default:
        rc = SQLITE_CORRUPT;
        break;
    }
  }
  rc2 = sqlite3_finalize(pStmt);
  if( rc==SQLITE_OK ) rc = rc2;

  p->rc = rc;
  return pRet;
}


/*
** Open the database handle and attach the RBU database as "rbu". If an
** error occurs, leave an error code and message in the RBU handle.
*/
static void rbuOpenDatabase(sqlite3rbu *p, int *pbRetry){
  assert( p->rc || (p->dbMain==0 && p->dbRbu==0) );
  assert( p->rc || rbuIsVacuum(p) || p->zTarget!=0 );

  /* Open the RBU database */
  p->dbRbu = rbuOpenDbhandle(p, p->zRbu, 1);

  if( p->rc==SQLITE_OK && rbuIsVacuum(p) ){
    sqlite3_file_control(p->dbRbu, "main", SQLITE_FCNTL_RBUCNT, (void*)p);
    if( p->zState==0 ){
      const char *zFile = sqlite3_db_filename(p->dbRbu, "main");
      p->zState = rbuMPrintf(p, "file://%s-vacuum?modeof=%s", zFile, zFile);
    }
  }

  /* If using separate RBU and state databases, attach the state database to
  ** the RBU db handle now.  */
  if( p->zState ){
    rbuMPrintfExec(p, p->dbRbu, "ATTACH %Q AS stat", p->zState);
    memcpy(p->zStateDb, "stat", 4);
  }else{
    memcpy(p->zStateDb, "main", 4);
  }

#if 0
  if( p->rc==SQLITE_OK && rbuIsVacuum(p) ){
    p->rc = sqlite3_exec(p->dbRbu, "BEGIN", 0, 0, 0);
  }
#endif

  /* If it has not already been created, create the rbu_state table */
  rbuMPrintfExec(p, p->dbRbu, RBU_CREATE_STATE, p->zStateDb);

#if 0
  if( rbuIsVacuum(p) ){
    if( p->rc==SQLITE_OK ){
      int rc2;
      int bOk = 0;
      sqlite3_stmt *pCnt = 0;
      p->rc = prepareAndCollectError(p->dbRbu, &pCnt, &p->zErrmsg,
          "SELECT count(*) FROM stat.sqlite_schema"
      );
      if( p->rc==SQLITE_OK 
       && sqlite3_step(pCnt)==SQLITE_ROW
       && 1==sqlite3_column_int(pCnt, 0)
      ){
        bOk = 1;
      }
      rc2 = sqlite3_finalize(pCnt);
      if( p->rc==SQLITE_OK ) p->rc = rc2;

      if( p->rc==SQLITE_OK && bOk==0 ){
        p->rc = SQLITE_ERROR;
        p->zErrmsg = sqlite3_mprintf("invalid state database");
      }
    
      if( p->rc==SQLITE_OK ){
        p->rc = sqlite3_exec(p->dbRbu, "COMMIT", 0, 0, 0);
      }
    }
  }
#endif

  if( p->rc==SQLITE_OK && rbuIsVacuum(p) ){
    int bOpen = 0;
    int rc;
    p->nRbu = 0;
    p->pRbuFd = 0;
    rc = sqlite3_file_control(p->dbRbu, "main", SQLITE_FCNTL_RBUCNT, (void*)p);
    if( rc!=SQLITE_NOTFOUND ) p->rc = rc;
    if( p->eStage>=RBU_STAGE_MOVE ){
      bOpen = 1;
    }else{
      RbuState *pState = rbuLoadState(p);
      if( pState ){
        bOpen = (pState->eStage>=RBU_STAGE_MOVE);
        rbuFreeState(pState);
      }
    }
    if( bOpen ) p->dbMain = rbuOpenDbhandle(p, p->zRbu, p->nRbu<=1);
  }

  p->eStage = 0;
  if( p->rc==SQLITE_OK && p->dbMain==0 ){
    if( !rbuIsVacuum(p) ){
      p->dbMain = rbuOpenDbhandle(p, p->zTarget, 1);
    }else if( p->pRbuFd->pWalFd ){
      if( pbRetry ){
        p->pRbuFd->bNolock = 0;
        sqlite3_close(p->dbRbu);
        sqlite3_close(p->dbMain);
        p->dbMain = 0;
        p->dbRbu = 0;
        *pbRetry = 1;
        return;
      }
      p->rc = SQLITE_ERROR;
      p->zErrmsg = sqlite3_mprintf("cannot vacuum wal mode database");
    }else{
      char *zTarget;
      char *zExtra = 0;
      if( strlen(p->zRbu)>=5 && 0==memcmp("file:", p->zRbu, 5) ){
        zExtra = &p->zRbu[5];
        while( *zExtra ){
          if( *zExtra++=='?' ) break;
        }
        if( *zExtra=='\0' ) zExtra = 0;
      }

      zTarget = sqlite3_mprintf("file:%s-vactmp?rbu_memory=1%s%s", 
          sqlite3_db_filename(p->dbRbu, "main"),
          (zExtra==0 ? "" : "&"), (zExtra==0 ? "" : zExtra)
      );

      if( zTarget==0 ){
        p->rc = SQLITE_NOMEM;
        return;
      }
      p->dbMain = rbuOpenDbhandle(p, zTarget, p->nRbu<=1);
      sqlite3_free(zTarget);
    }
  }

  if( p->rc==SQLITE_OK ){
    p->rc = sqlite3_create_function(p->dbMain, 
        "rbu_tmp_insert", -1, SQLITE_UTF8, (void*)p, rbuTmpInsertFunc, 0, 0
    );
  }

  if( p->rc==SQLITE_OK ){
    p->rc = sqlite3_create_function(p->dbMain, 
        "rbu_fossil_delta", 2, SQLITE_UTF8, 0, rbuFossilDeltaFunc, 0, 0
    );
  }

  if( p->rc==SQLITE_OK ){
    p->rc = sqlite3_create_function(p->dbRbu, 
        "rbu_target_name", -1, SQLITE_UTF8, (void*)p, rbuTargetNameFunc, 0, 0
    );
  }

  if( p->rc==SQLITE_OK ){
    p->rc = sqlite3_file_control(p->dbMain, "main", SQLITE_FCNTL_RBU, (void*)p);
  }
  rbuMPrintfExec(p, p->dbMain, "SELECT * FROM sqlite_schema");

  /* Mark the database file just opened as an RBU target database. If 
  ** this call returns SQLITE_NOTFOUND, then the RBU vfs is not in use.
  ** This is an error.  */
  if( p->rc==SQLITE_OK ){
    p->rc = sqlite3_file_control(p->dbMain, "main", SQLITE_FCNTL_RBU, (void*)p);
  }

  if( p->rc==SQLITE_NOTFOUND ){
    p->rc = SQLITE_ERROR;
    p->zErrmsg = sqlite3_mprintf("rbu vfs not found");
  }
}

/*
** This routine is a copy of the sqlite3FileSuffix3() routine from the core.
** It is a no-op unless SQLITE_ENABLE_8_3_NAMES is defined.
**
** If SQLITE_ENABLE_8_3_NAMES is set at compile-time and if the database
** filename in zBaseFilename is a URI with the "8_3_names=1" parameter and
** if filename in z[] has a suffix (a.k.a. "extension") that is longer than
** three characters, then shorten the suffix on z[] to be the last three
** characters of the original suffix.
**
** If SQLITE_ENABLE_8_3_NAMES is set to 2 at compile-time, then always
** do the suffix shortening regardless of URI parameter.
**
** Examples:
**
**     test.db-journal    =>   test.nal
**     test.db-wal        =>   test.wal
**     test.db-shm        =>   test.shm
**     test.db-mj7f3319fa =>   test.9fa
*/
static void rbuFileSuffix3(const char *zBase, char *z){
#ifdef SQLITE_ENABLE_8_3_NAMES
#if SQLITE_ENABLE_8_3_NAMES<2
  if( sqlite3_uri_boolean(zBase, "8_3_names", 0) )
#endif
  {
    int i, sz;
    sz = (int)strlen(z)&0xffffff;
    for(i=sz-1; i>0 && z[i]!='/' && z[i]!='.'; i--){}
    if( z[i]=='.' && sz>i+4 ) memmove(&z[i+1], &z[sz-3], 4);
  }
#endif
}

/*
** Return the current wal-index header checksum for the target database 
** as a 64-bit integer.
**
** The checksum is store in the first page of xShmMap memory as an 8-byte 
** blob starting at byte offset 40.
*/
static i64 rbuShmChecksum(sqlite3rbu *p){
  i64 iRet = 0;
  if( p->rc==SQLITE_OK ){
    sqlite3_file *pDb = p->pTargetFd->pReal;
    u32 volatile *ptr;
    p->rc = pDb->pMethods->xShmMap(pDb, 0, 32*1024, 0, (void volatile**)&ptr);
    if( p->rc==SQLITE_OK ){
      iRet = ((i64)ptr[10] << 32) + ptr[11];
    }
  }
  return iRet;
}

/*
** This function is called as part of initializing or reinitializing an
** incremental checkpoint. 
**
** It populates the sqlite3rbu.aFrame[] array with the set of 
** (wal frame -> db page) copy operations required to checkpoint the 
** current wal file, and obtains the set of shm locks required to safely 
** perform the copy operations directly on the file-system.
**
** If argument pState is not NULL, then the incremental checkpoint is
** being resumed. In this case, if the checksum of the wal-index-header
** following recovery is not the same as the checksum saved in the RbuState
** object, then the rbu handle is set to DONE state. This occurs if some
** other client appends a transaction to the wal file in the middle of
** an incremental checkpoint.
*/
static void rbuSetupCheckpoint(sqlite3rbu *p, RbuState *pState){

  /* If pState is NULL, then the wal file may not have been opened and
  ** recovered. Running a read-statement here to ensure that doing so
  ** does not interfere with the "capture" process below.  */
  if( pState==0 ){
    p->eStage = 0;
    if( p->rc==SQLITE_OK ){
      p->rc = sqlite3_exec(p->dbMain, "SELECT * FROM sqlite_schema", 0, 0, 0);
    }
  }

  /* Assuming no error has occurred, run a "restart" checkpoint with the
  ** sqlite3rbu.eStage variable set to CAPTURE. This turns on the following
  ** special behaviour in the rbu VFS:
  **
  **   * If the exclusive shm WRITER or READ0 lock cannot be obtained,
  **     the checkpoint fails with SQLITE_BUSY (normally SQLite would
  **     proceed with running a passive checkpoint instead of failing).
  **
  **   * Attempts to read from the *-wal file or write to the database file
  **     do not perform any IO. Instead, the frame/page combinations that
  **     would be read/written are recorded in the sqlite3rbu.aFrame[]
  **     array.
  **
  **   * Calls to xShmLock(UNLOCK) to release the exclusive shm WRITER, 
  **     READ0 and CHECKPOINT locks taken as part of the checkpoint are
  **     no-ops. These locks will not be released until the connection
  **     is closed.
  **
  **   * Attempting to xSync() the database file causes an SQLITE_INTERNAL 
  **     error.
  **
  ** As a result, unless an error (i.e. OOM or SQLITE_BUSY) occurs, the
  ** checkpoint below fails with SQLITE_INTERNAL, and leaves the aFrame[]
  ** array populated with a set of (frame -> page) mappings. Because the 
  ** WRITER, CHECKPOINT and READ0 locks are still held, it is safe to copy 
  ** data from the wal file into the database file according to the 
  ** contents of aFrame[].
  */
  if( p->rc==SQLITE_OK ){
    int rc2;
    p->eStage = RBU_STAGE_CAPTURE;
    rc2 = sqlite3_exec(p->dbMain, "PRAGMA main.wal_checkpoint=restart", 0, 0,0);
    if( rc2!=SQLITE_INTERNAL ) p->rc = rc2;
  }

  if( p->rc==SQLITE_OK && p->nFrame>0 ){
    p->eStage = RBU_STAGE_CKPT;
    p->nStep = (pState ? pState->nRow : 0);
    p->aBuf = rbuMalloc(p, p->pgsz);
    p->iWalCksum = rbuShmChecksum(p);
  }

  if( p->rc==SQLITE_OK ){
    if( p->nFrame==0 || (pState && pState->iWalCksum!=p->iWalCksum) ){
      p->rc = SQLITE_DONE;
      p->eStage = RBU_STAGE_DONE;
    }else{
      int nSectorSize;
      sqlite3_file *pDb = p->pTargetFd->pReal;
      sqlite3_file *pWal = p->pTargetFd->pWalFd->pReal;
      assert( p->nPagePerSector==0 );
      nSectorSize = pDb->pMethods->xSectorSize(pDb);
      if( nSectorSize>p->pgsz ){
        p->nPagePerSector = nSectorSize / p->pgsz;
      }else{
        p->nPagePerSector = 1;
      }

      /* Call xSync() on the wal file. This causes SQLite to sync the 
      ** directory in which the target database and the wal file reside, in 
      ** case it has not been synced since the rename() call in 
      ** rbuMoveOalFile(). */
      p->rc = pWal->pMethods->xSync(pWal, SQLITE_SYNC_NORMAL);
    }
  }
}

/*
** Called when iAmt bytes are read from offset iOff of the wal file while
** the rbu object is in capture mode. Record the frame number of the frame
** being read in the aFrame[] array.
*/
static int rbuCaptureWalRead(sqlite3rbu *pRbu, i64 iOff, int iAmt){
  const u32 mReq = (1<<WAL_LOCK_WRITE)|(1<<WAL_LOCK_CKPT)|(1<<WAL_LOCK_READ0);
  u32 iFrame;

  if( pRbu->mLock!=mReq ){
    pRbu->rc = SQLITE_BUSY;
    return SQLITE_INTERNAL;
  }

  pRbu->pgsz = iAmt;
  if( pRbu->nFrame==pRbu->nFrameAlloc ){
    int nNew = (pRbu->nFrameAlloc ? pRbu->nFrameAlloc : 64) * 2;
    RbuFrame *aNew;
    aNew = (RbuFrame*)sqlite3_realloc64(pRbu->aFrame, nNew * sizeof(RbuFrame));
    if( aNew==0 ) return SQLITE_NOMEM;
    pRbu->aFrame = aNew;
    pRbu->nFrameAlloc = nNew;
  }

  iFrame = (u32)((iOff-32) / (i64)(iAmt+24)) + 1;
  if( pRbu->iMaxFrame<iFrame ) pRbu->iMaxFrame = iFrame;
  pRbu->aFrame[pRbu->nFrame].iWalFrame = iFrame;
  pRbu->aFrame[pRbu->nFrame].iDbPage = 0;
  pRbu->nFrame++;
  return SQLITE_OK;
}

/*
** Called when a page of data is written to offset iOff of the database
** file while the rbu handle is in capture mode. Record the page number 
** of the page being written in the aFrame[] array.
*/
static int rbuCaptureDbWrite(sqlite3rbu *pRbu, i64 iOff){
  pRbu->aFrame[pRbu->nFrame-1].iDbPage = (u32)(iOff / pRbu->pgsz) + 1;
  return SQLITE_OK;
}

/*
** This is called as part of an incremental checkpoint operation. Copy
** a single frame of data from the wal file into the database file, as
** indicated by the RbuFrame object.
*/
static void rbuCheckpointFrame(sqlite3rbu *p, RbuFrame *pFrame){
  sqlite3_file *pWal = p->pTargetFd->pWalFd->pReal;
  sqlite3_file *pDb = p->pTargetFd->pReal;
  i64 iOff;

  assert( p->rc==SQLITE_OK );
  iOff = (i64)(pFrame->iWalFrame-1) * (p->pgsz + 24) + 32 + 24;
  p->rc = pWal->pMethods->xRead(pWal, p->aBuf, p->pgsz, iOff);
  if( p->rc ) return;

  iOff = (i64)(pFrame->iDbPage-1) * p->pgsz;
  p->rc = pDb->pMethods->xWrite(pDb, p->aBuf, p->pgsz, iOff);
}


/*
** Take an EXCLUSIVE lock on the database file.
*/
static void rbuLockDatabase(sqlite3rbu *p){
  sqlite3_file *pReal = p->pTargetFd->pReal;
  assert( p->rc==SQLITE_OK );
  p->rc = pReal->pMethods->xLock(pReal, SQLITE_LOCK_SHARED);
  if( p->rc==SQLITE_OK ){
    p->rc = pReal->pMethods->xLock(pReal, SQLITE_LOCK_EXCLUSIVE);
  }
}

#if defined(_WIN32_WCE)
static LPWSTR rbuWinUtf8ToUnicode(const char *zFilename){
  int nChar;
  LPWSTR zWideFilename;

  nChar = MultiByteToWideChar(CP_UTF8, 0, zFilename, -1, NULL, 0);
  if( nChar==0 ){
    return 0;
  }
  zWideFilename = sqlite3_malloc64( nChar*sizeof(zWideFilename[0]) );
  if( zWideFilename==0 ){
    return 0;
  }
  memset(zWideFilename, 0, nChar*sizeof(zWideFilename[0]));
  nChar = MultiByteToWideChar(CP_UTF8, 0, zFilename, -1, zWideFilename,
                                nChar);
  if( nChar==0 ){
    sqlite3_free(zWideFilename);
    zWideFilename = 0;
  }
  return zWideFilename;
}
#endif

/*
** The RBU handle is currently in RBU_STAGE_OAL state, with a SHARED lock
** on the database file. This proc moves the *-oal file to the *-wal path,
** then reopens the database file (this time in vanilla, non-oal, WAL mode).
** If an error occurs, leave an error code and error message in the rbu 
** handle.
*/
static void rbuMoveOalFile(sqlite3rbu *p){
  const char *zBase = sqlite3_db_filename(p->dbMain, "main");
  const char *zMove = zBase;
  char *zOal;
  char *zWal;

  if( rbuIsVacuum(p) ){
    zMove = sqlite3_db_filename(p->dbRbu, "main");
  }
  zOal = sqlite3_mprintf("%s-oal", zMove);
  zWal = sqlite3_mprintf("%s-wal", zMove);

  assert( p->eStage==RBU_STAGE_MOVE );
  assert( p->rc==SQLITE_OK && p->zErrmsg==0 );
  if( zWal==0 || zOal==0 ){
    p->rc = SQLITE_NOMEM;
  }else{
    /* Move the *-oal file to *-wal. At this point connection p->db is
    ** holding a SHARED lock on the target database file (because it is
    ** in WAL mode). So no other connection may be writing the db. 
    **
    ** In order to ensure that there are no database readers, an EXCLUSIVE
    ** lock is obtained here before the *-oal is moved to *-wal.
    */
    rbuLockDatabase(p);
    if( p->rc==SQLITE_OK ){
      rbuFileSuffix3(zBase, zWal);
      rbuFileSuffix3(zBase, zOal);

      /* Re-open the databases. */
      rbuObjIterFinalize(&p->objiter);
      sqlite3_close(p->dbRbu);
      sqlite3_close(p->dbMain);
      p->dbMain = 0;
      p->dbRbu = 0;

#if defined(_WIN32_WCE)
      {
        LPWSTR zWideOal;
        LPWSTR zWideWal;

        zWideOal = rbuWinUtf8ToUnicode(zOal);
        if( zWideOal ){
          zWideWal = rbuWinUtf8ToUnicode(zWal);
          if( zWideWal ){
            if( MoveFileW(zWideOal, zWideWal) ){
              p->rc = SQLITE_OK;
            }else{
              p->rc = SQLITE_IOERR;
            }
            sqlite3_free(zWideWal);
          }else{
            p->rc = SQLITE_IOERR_NOMEM;
          }
          sqlite3_free(zWideOal);
        }else{
          p->rc = SQLITE_IOERR_NOMEM;
        }
      }
#else
      p->rc = rename(zOal, zWal) ? SQLITE_IOERR : SQLITE_OK;
#endif

      if( p->rc==SQLITE_OK ){
        rbuOpenDatabase(p, 0);
        rbuSetupCheckpoint(p, 0);
      }
    }
  }

  sqlite3_free(zWal);
  sqlite3_free(zOal);
}

/*
** The SELECT statement iterating through the keys for the current object
** (p->objiter.pSelect) currently points to a valid row. This function
** determines the type of operation requested by this row and returns
** one of the following values to indicate the result:
**
**     * RBU_INSERT
**     * RBU_DELETE
**     * RBU_IDX_DELETE
**     * RBU_UPDATE
**
** If RBU_UPDATE is returned, then output variable *pzMask is set to
** point to the text value indicating the columns to update.
**
** If the rbu_control field contains an invalid value, an error code and
** message are left in the RBU handle and zero returned.
*/
static int rbuStepType(sqlite3rbu *p, const char **pzMask){
  int iCol = p->objiter.nCol;     /* Index of rbu_control column */
  int res = 0;                    /* Return value */

  switch( sqlite3_column_type(p->objiter.pSelect, iCol) ){
    case SQLITE_INTEGER: {
      int iVal = sqlite3_column_int(p->objiter.pSelect, iCol);
      switch( iVal ){
        case 0: res = RBU_INSERT;     break;
        case 1: res = RBU_DELETE;     break;
        case 2: res = RBU_REPLACE;    break;
        case 3: res = RBU_IDX_DELETE; break;
        case 4: res = RBU_IDX_INSERT; break;
      }
      break;
    }

    case SQLITE_TEXT: {
      const unsigned char *z = sqlite3_column_text(p->objiter.pSelect, iCol);
      if( z==0 ){
        p->rc = SQLITE_NOMEM;
      }else{
        *pzMask = (const char*)z;
      }
      res = RBU_UPDATE;

      break;
    }

    default:
      break;
  }

  if( res==0 ){
    rbuBadControlError(p);
  }
  return res;
}

#ifdef SQLITE_DEBUG
/*
** Assert that column iCol of statement pStmt is named zName.
*/
static void assertColumnName(sqlite3_stmt *pStmt, int iCol, const char *zName){
  const char *zCol = sqlite3_column_name(pStmt, iCol);
  assert( 0==sqlite3_stricmp(zName, zCol) );
}
#else
# define assertColumnName(x,y,z)
#endif

/*
** Argument eType must be one of RBU_INSERT, RBU_DELETE, RBU_IDX_INSERT or
** RBU_IDX_DELETE. This function performs the work of a single
** sqlite3rbu_step() call for the type of operation specified by eType.
*/
static void rbuStepOneOp(sqlite3rbu *p, int eType){
  RbuObjIter *pIter = &p->objiter;
  sqlite3_value *pVal;
  sqlite3_stmt *pWriter;
  int i;

  assert( p->rc==SQLITE_OK );
  assert( eType!=RBU_DELETE || pIter->zIdx==0 );
  assert( eType==RBU_DELETE || eType==RBU_IDX_DELETE
       || eType==RBU_INSERT || eType==RBU_IDX_INSERT
  );

  /* If this is a delete, decrement nPhaseOneStep by nIndex. If the DELETE
  ** statement below does actually delete a row, nPhaseOneStep will be
  ** incremented by the same amount when SQL function rbu_tmp_insert()
  ** is invoked by the trigger.  */
  if( eType==RBU_DELETE ){
    p->nPhaseOneStep -= p->objiter.nIndex;
  }

  if( eType==RBU_IDX_DELETE || eType==RBU_DELETE ){
    pWriter = pIter->pDelete;
  }else{
    pWriter = pIter->pInsert;
  }

  for(i=0; i<pIter->nCol; i++){
    /* If this is an INSERT into a table b-tree and the table has an
    ** explicit INTEGER PRIMARY KEY, check that this is not an attempt
    ** to write a NULL into the IPK column. That is not permitted.  */
    if( eType==RBU_INSERT 
     && pIter->zIdx==0 && pIter->eType==RBU_PK_IPK && pIter->abTblPk[i] 
     && sqlite3_column_type(pIter->pSelect, i)==SQLITE_NULL
    ){
      p->rc = SQLITE_MISMATCH;
      p->zErrmsg = sqlite3_mprintf("datatype mismatch");
      return;
    }

    if( eType==RBU_DELETE && pIter->abTblPk[i]==0 ){
      continue;
    }

    pVal = sqlite3_column_value(pIter->pSelect, i);
    p->rc = sqlite3_bind_value(pWriter, i+1, pVal);
    if( p->rc ) return;
  }
  if( pIter->zIdx==0 ){
    if( pIter->eType==RBU_PK_VTAB 
     || pIter->eType==RBU_PK_NONE 
     || (pIter->eType==RBU_PK_EXTERNAL && rbuIsVacuum(p)) 
    ){
      /* For a virtual table, or a table with no primary key, the 
      ** SELECT statement is:
      **
      **   SELECT <cols>, rbu_control, rbu_rowid FROM ....
      **
      ** Hence column_value(pIter->nCol+1).
      */
      assertColumnName(pIter->pSelect, pIter->nCol+1, 
          rbuIsVacuum(p) ? "rowid" : "rbu_rowid"
      );
      pVal = sqlite3_column_value(pIter->pSelect, pIter->nCol+1);
      p->rc = sqlite3_bind_value(pWriter, pIter->nCol+1, pVal);
    }
  }
  if( p->rc==SQLITE_OK ){
    sqlite3_step(pWriter);
    p->rc = resetAndCollectError(pWriter, &p->zErrmsg);
  }
}

/*
** This function does the work for an sqlite3rbu_step() call.
**
** The object-iterator (p->objiter) currently points to a valid object,
** and the input cursor (p->objiter.pSelect) currently points to a valid
** input row. Perform whatever processing is required and return.
**
** If no  error occurs, SQLITE_OK is returned. Otherwise, an error code
** and message is left in the RBU handle and a copy of the error code
** returned.
*/
static int rbuStep(sqlite3rbu *p){
  RbuObjIter *pIter = &p->objiter;
  const char *zMask = 0;
  int eType = rbuStepType(p, &zMask);

  if( eType ){
    assert( eType==RBU_INSERT     || eType==RBU_DELETE
         || eType==RBU_REPLACE    || eType==RBU_IDX_DELETE
         || eType==RBU_IDX_INSERT || eType==RBU_UPDATE
    );
    assert( eType!=RBU_UPDATE || pIter->zIdx==0 );

    if( pIter->zIdx==0 && (eType==RBU_IDX_DELETE || eType==RBU_IDX_INSERT) ){
      rbuBadControlError(p);
    }
    else if( eType==RBU_REPLACE ){
      if( pIter->zIdx==0 ){
        p->nPhaseOneStep += p->objiter.nIndex;
        rbuStepOneOp(p, RBU_DELETE);
      }
      if( p->rc==SQLITE_OK ) rbuStepOneOp(p, RBU_INSERT);
    }
    else if( eType!=RBU_UPDATE ){
      rbuStepOneOp(p, eType);
    }
    else{
      sqlite3_value *pVal;
      sqlite3_stmt *pUpdate = 0;
      assert( eType==RBU_UPDATE );
      p->nPhaseOneStep -= p->objiter.nIndex;
      rbuGetUpdateStmt(p, pIter, zMask, &pUpdate);
      if( pUpdate ){
        int i;
        for(i=0; p->rc==SQLITE_OK && i<pIter->nCol; i++){
          char c = zMask[pIter->aiSrcOrder[i]];
          pVal = sqlite3_column_value(pIter->pSelect, i);
          if( pIter->abTblPk[i] || c!='.' ){
            p->rc = sqlite3_bind_value(pUpdate, i+1, pVal);
          }
        }
        if( p->rc==SQLITE_OK 
         && (pIter->eType==RBU_PK_VTAB || pIter->eType==RBU_PK_NONE) 
        ){
          /* Bind the rbu_rowid value to column _rowid_ */
          assertColumnName(pIter->pSelect, pIter->nCol+1, "rbu_rowid");
          pVal = sqlite3_column_value(pIter->pSelect, pIter->nCol+1);
          p->rc = sqlite3_bind_value(pUpdate, pIter->nCol+1, pVal);
        }
        if( p->rc==SQLITE_OK ){
          sqlite3_step(pUpdate);
          p->rc = resetAndCollectError(pUpdate, &p->zErrmsg);
        }
      }
    }
  }
  return p->rc;
}

/*
** Increment the schema cookie of the main database opened by p->dbMain.
**
** Or, if this is an RBU vacuum, set the schema cookie of the main db
** opened by p->dbMain to one more than the schema cookie of the main
** db opened by p->dbRbu.
*/
static void rbuIncrSchemaCookie(sqlite3rbu *p){
  if( p->rc==SQLITE_OK ){
    sqlite3 *dbread = (rbuIsVacuum(p) ? p->dbRbu : p->dbMain);
    int iCookie = 1000000;
    sqlite3_stmt *pStmt;

    p->rc = prepareAndCollectError(dbread, &pStmt, &p->zErrmsg, 
        "PRAGMA schema_version"
    );
    if( p->rc==SQLITE_OK ){
      /* Coverage: it may be that this sqlite3_step() cannot fail. There
      ** is already a transaction open, so the prepared statement cannot
      ** throw an SQLITE_SCHEMA exception. The only database page the
      ** statement reads is page 1, which is guaranteed to be in the cache.
      ** And no memory allocations are required.  */
      if( SQLITE_ROW==sqlite3_step(pStmt) ){
        iCookie = sqlite3_column_int(pStmt, 0);
      }
      rbuFinalize(p, pStmt);
    }
    if( p->rc==SQLITE_OK ){
      rbuMPrintfExec(p, p->dbMain, "PRAGMA schema_version = %d", iCookie+1);
    }
  }
}

/*
** Update the contents of the rbu_state table within the rbu database. The
** value stored in the RBU_STATE_STAGE column is eStage. All other values
** are determined by inspecting the rbu handle passed as the first argument.
*/
static void rbuSaveState(sqlite3rbu *p, int eStage){
  if( p->rc==SQLITE_OK || p->rc==SQLITE_DONE ){
    sqlite3_stmt *pInsert = 0;
    rbu_file *pFd = (rbuIsVacuum(p) ? p->pRbuFd : p->pTargetFd);
    int rc;

    assert( p->zErrmsg==0 );
    rc = prepareFreeAndCollectError(p->dbRbu, &pInsert, &p->zErrmsg, 
        sqlite3_mprintf(
          "INSERT OR REPLACE INTO %s.rbu_state(k, v) VALUES "
          "(%d, %d), "
          "(%d, %Q), "
          "(%d, %Q), "
          "(%d, %d), "
          "(%d, %d), "
          "(%d, %lld), "
          "(%d, %lld), "
          "(%d, %lld), "
          "(%d, %lld), "
          "(%d, %Q)  ",
          p->zStateDb,
          RBU_STATE_STAGE, eStage,
          RBU_STATE_TBL, p->objiter.zTbl, 
          RBU_STATE_IDX, p->objiter.zIdx, 
          RBU_STATE_ROW, p->nStep, 
          RBU_STATE_PROGRESS, p->nProgress,
          RBU_STATE_CKPT, p->iWalCksum,
          RBU_STATE_COOKIE, (i64)pFd->iCookie,
          RBU_STATE_OALSZ, p->iOalSz,
          RBU_STATE_PHASEONESTEP, p->nPhaseOneStep,
          RBU_STATE_DATATBL, p->objiter.zDataTbl
      )
    );
    assert( pInsert==0 || rc==SQLITE_OK );

    if( rc==SQLITE_OK ){
      sqlite3_step(pInsert);
      rc = sqlite3_finalize(pInsert);
    }
    if( rc!=SQLITE_OK ) p->rc = rc;
  }
}


/*
** The second argument passed to this function is the name of a PRAGMA 
** setting - "page_size", "auto_vacuum", "user_version" or "application_id".
** This function executes the following on sqlite3rbu.dbRbu:
**
**   "PRAGMA main.$zPragma"
**
** where $zPragma is the string passed as the second argument, then
** on sqlite3rbu.dbMain:
**
**   "PRAGMA main.$zPragma = $val"
**
** where $val is the value returned by the first PRAGMA invocation.
**
** In short, it copies the value  of the specified PRAGMA setting from
** dbRbu to dbMain.
*/
static void rbuCopyPragma(sqlite3rbu *p, const char *zPragma){
  if( p->rc==SQLITE_OK ){
    sqlite3_stmt *pPragma = 0;
    p->rc = prepareFreeAndCollectError(p->dbRbu, &pPragma, &p->zErrmsg, 
        sqlite3_mprintf("PRAGMA main.%s", zPragma)
    );
    if( p->rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pPragma) ){
      p->rc = rbuMPrintfExec(p, p->dbMain, "PRAGMA main.%s = %d",
          zPragma, sqlite3_column_int(pPragma, 0)
      );
    }
    rbuFinalize(p, pPragma);
  }
}

/*
** The RBU handle passed as the only argument has just been opened and 
** the state database is empty. If this RBU handle was opened for an
** RBU vacuum operation, create the schema in the target db.
*/
static void rbuCreateTargetSchema(sqlite3rbu *p){
  sqlite3_stmt *pSql = 0;
  sqlite3_stmt *pInsert = 0;

  assert( rbuIsVacuum(p) );
  p->rc = sqlite3_exec(p->dbMain, "PRAGMA writable_schema=1", 0,0, &p->zErrmsg);
  if( p->rc==SQLITE_OK ){
    p->rc = prepareAndCollectError(p->dbRbu, &pSql, &p->zErrmsg, 
      "SELECT sql FROM sqlite_schema WHERE sql!='' AND rootpage!=0"
      " AND name!='sqlite_sequence' "
      " ORDER BY type DESC"
    );
  }

  while( p->rc==SQLITE_OK && sqlite3_step(pSql)==SQLITE_ROW ){
    const char *zSql = (const char*)sqlite3_column_text(pSql, 0);
    p->rc = sqlite3_exec(p->dbMain, zSql, 0, 0, &p->zErrmsg);
  }
  rbuFinalize(p, pSql);
  if( p->rc!=SQLITE_OK ) return;

  if( p->rc==SQLITE_OK ){
    p->rc = prepareAndCollectError(p->dbRbu, &pSql, &p->zErrmsg, 
        "SELECT * FROM sqlite_schema WHERE rootpage=0 OR rootpage IS NULL" 
    );
  }

  if( p->rc==SQLITE_OK ){
    p->rc = prepareAndCollectError(p->dbMain, &pInsert, &p->zErrmsg, 
        "INSERT INTO sqlite_schema VALUES(?,?,?,?,?)"
    );
  }

  while( p->rc==SQLITE_OK && sqlite3_step(pSql)==SQLITE_ROW ){
    int i;
    for(i=0; i<5; i++){
      sqlite3_bind_value(pInsert, i+1, sqlite3_column_value(pSql, i));
    }
    sqlite3_step(pInsert);
    p->rc = sqlite3_reset(pInsert);
  }
  if( p->rc==SQLITE_OK ){
    p->rc = sqlite3_exec(p->dbMain, "PRAGMA writable_schema=0",0,0,&p->zErrmsg);
  }

  rbuFinalize(p, pSql);
  rbuFinalize(p, pInsert);
}

/*
** Step the RBU object.
*/
int sqlite3rbu_step(sqlite3rbu *p){
  if( p ){
    switch( p->eStage ){
      case RBU_STAGE_OAL: {
        RbuObjIter *pIter = &p->objiter;

        /* If this is an RBU vacuum operation and the state table was empty
        ** when this handle was opened, create the target database schema. */
        if( rbuIsVacuum(p) && p->nProgress==0 && p->rc==SQLITE_OK ){
          rbuCreateTargetSchema(p);
          rbuCopyPragma(p, "user_version");
          rbuCopyPragma(p, "application_id");
        }

        while( p->rc==SQLITE_OK && pIter->zTbl ){

          if( pIter->bCleanup ){
            /* Clean up the rbu_tmp_xxx table for the previous table. It 
            ** cannot be dropped as there are currently active SQL statements.
            ** But the contents can be deleted.  */
            if( rbuIsVacuum(p)==0 && pIter->abIndexed ){
              rbuMPrintfExec(p, p->dbRbu, 
                  "DELETE FROM %s.'rbu_tmp_%q'", p->zStateDb, pIter->zDataTbl
              );
            }
          }else{
            rbuObjIterPrepareAll(p, pIter, 0);

            /* Advance to the next row to process. */
            if( p->rc==SQLITE_OK ){
              int rc = sqlite3_step(pIter->pSelect);
              if( rc==SQLITE_ROW ){
                p->nProgress++;
                p->nStep++;
                return rbuStep(p);
              }
              p->rc = sqlite3_reset(pIter->pSelect);
              p->nStep = 0;
            }
          }

          rbuObjIterNext(p, pIter);
        }

        if( p->rc==SQLITE_OK ){
          assert( pIter->zTbl==0 );
          rbuSaveState(p, RBU_STAGE_MOVE);
          rbuIncrSchemaCookie(p);
          if( p->rc==SQLITE_OK ){
            p->rc = sqlite3_exec(p->dbMain, "COMMIT", 0, 0, &p->zErrmsg);
          }
          if( p->rc==SQLITE_OK ){
            p->rc = sqlite3_exec(p->dbRbu, "COMMIT", 0, 0, &p->zErrmsg);
          }
          p->eStage = RBU_STAGE_MOVE;
        }
        break;
      }

      case RBU_STAGE_MOVE: {
        if( p->rc==SQLITE_OK ){
          rbuMoveOalFile(p);
          p->nProgress++;
        }
        break;
      }

      case RBU_STAGE_CKPT: {
        if( p->rc==SQLITE_OK ){
          if( p->nStep>=p->nFrame ){
            sqlite3_file *pDb = p->pTargetFd->pReal;
  
            /* Sync the db file */
            p->rc = pDb->pMethods->xSync(pDb, SQLITE_SYNC_NORMAL);
  
            /* Update nBackfill */
            if( p->rc==SQLITE_OK ){
              void volatile *ptr;
              p->rc = pDb->pMethods->xShmMap(pDb, 0, 32*1024, 0, &ptr);
              if( p->rc==SQLITE_OK ){
                ((u32 volatile*)ptr)[24] = p->iMaxFrame;
              }
            }
  
            if( p->rc==SQLITE_OK ){
              p->eStage = RBU_STAGE_DONE;
              p->rc = SQLITE_DONE;
            }
          }else{
            /* At one point the following block copied a single frame from the
            ** wal file to the database file. So that one call to sqlite3rbu_step()
            ** checkpointed a single frame. 
            **
            ** However, if the sector-size is larger than the page-size, and the
            ** application calls sqlite3rbu_savestate() or close() immediately
            ** after this step, then rbu_step() again, then a power failure occurs,
            ** then the database page written here may be damaged. Work around
            ** this by checkpointing frames until the next page in the aFrame[]
            ** lies on a different disk sector to the current one. */
            u32 iSector;
            do{
              RbuFrame *pFrame = &p->aFrame[p->nStep];
              iSector = (pFrame->iDbPage-1) / p->nPagePerSector;
              rbuCheckpointFrame(p, pFrame);
              p->nStep++;
            }while( p->nStep<p->nFrame 
                 && iSector==((p->aFrame[p->nStep].iDbPage-1) / p->nPagePerSector)
                 && p->rc==SQLITE_OK
            );
          }
          p->nProgress++;
        }
        break;
      }

      default:
        break;
    }
    return p->rc;
  }else{
    return SQLITE_NOMEM;
  }
}

/*
** Compare strings z1 and z2, returning 0 if they are identical, or non-zero
** otherwise. Either or both argument may be NULL. Two NULL values are
** considered equal, and NULL is considered distinct from all other values.
*/
static int rbuStrCompare(const char *z1, const char *z2){
  if( z1==0 && z2==0 ) return 0;
  if( z1==0 || z2==0 ) return 1;
  return (sqlite3_stricmp(z1, z2)!=0);
}

/*
** This function is called as part of sqlite3rbu_open() when initializing
** an rbu handle in OAL stage. If the rbu update has not started (i.e.
** the rbu_state table was empty) it is a no-op. Otherwise, it arranges
** things so that the next call to sqlite3rbu_step() continues on from
** where the previous rbu handle left off.
**
** If an error occurs, an error code and error message are left in the
** rbu handle passed as the first argument.
*/
static void rbuSetupOal(sqlite3rbu *p, RbuState *pState){
  assert( p->rc==SQLITE_OK );
  if( pState->zTbl ){
    RbuObjIter *pIter = &p->objiter;
    int rc = SQLITE_OK;

    while( rc==SQLITE_OK && pIter->zTbl && (pIter->bCleanup 
       || rbuStrCompare(pIter->zIdx, pState->zIdx)
       || (pState->zDataTbl==0 && rbuStrCompare(pIter->zTbl, pState->zTbl))
       || (pState->zDataTbl && rbuStrCompare(pIter->zDataTbl, pState->zDataTbl))
    )){
      rc = rbuObjIterNext(p, pIter);
    }

    if( rc==SQLITE_OK && !pIter->zTbl ){
      rc = SQLITE_ERROR;
      p->zErrmsg = sqlite3_mprintf("rbu_state mismatch error");
    }

    if( rc==SQLITE_OK ){
      p->nStep = pState->nRow;
      rc = rbuObjIterPrepareAll(p, &p->objiter, p->nStep);
    }

    p->rc = rc;
  }
}

/*
** If there is a "*-oal" file in the file-system corresponding to the
** target database in the file-system, delete it. If an error occurs,
** leave an error code and error message in the rbu handle.
*/
static void rbuDeleteOalFile(sqlite3rbu *p){
  char *zOal = rbuMPrintf(p, "%s-oal", p->zTarget);
  if( zOal ){
    sqlite3_vfs *pVfs = sqlite3_vfs_find(0);
    assert( pVfs && p->rc==SQLITE_OK && p->zErrmsg==0 );
    pVfs->xDelete(pVfs, zOal, 0);
    sqlite3_free(zOal);
  }
}

/*
** Allocate a private rbu VFS for the rbu handle passed as the only
** argument. This VFS will be used unless the call to sqlite3rbu_open()
** specified a URI with a vfs=? option in place of a target database
** file name.
*/
static void rbuCreateVfs(sqlite3rbu *p){
  int rnd;
  char zRnd[64];

  assert( p->rc==SQLITE_OK );
  sqlite3_randomness(sizeof(int), (void*)&rnd);
  sqlite3_snprintf(sizeof(zRnd), zRnd, "rbu_vfs_%d", rnd);
  p->rc = sqlite3rbu_create_vfs(zRnd, 0);
  if( p->rc==SQLITE_OK ){
    sqlite3_vfs *pVfs = sqlite3_vfs_find(zRnd);
    assert( pVfs );
    p->zVfsName = pVfs->zName;
    ((rbu_vfs*)pVfs)->pRbu = p;
  }
}

/*
** Destroy the private VFS created for the rbu handle passed as the only
** argument by an earlier call to rbuCreateVfs().
*/
static void rbuDeleteVfs(sqlite3rbu *p){
  if( p->zVfsName ){
    sqlite3rbu_destroy_vfs(p->zVfsName);
    p->zVfsName = 0;
  }
}

/*
** This user-defined SQL function is invoked with a single argument - the
** name of a table expected to appear in the target database. It returns
** the number of auxilliary indexes on the table.
*/
static void rbuIndexCntFunc(
  sqlite3_context *pCtx, 
  int nVal,
  sqlite3_value **apVal
){
  sqlite3rbu *p = (sqlite3rbu*)sqlite3_user_data(pCtx);
  sqlite3_stmt *pStmt = 0;
  char *zErrmsg = 0;
  int rc;
  sqlite3 *db = (rbuIsVacuum(p) ? p->dbRbu : p->dbMain);

  assert( nVal==1 );
  
  rc = prepareFreeAndCollectError(db, &pStmt, &zErrmsg, 
      sqlite3_mprintf("SELECT count(*) FROM sqlite_schema "
        "WHERE type='index' AND tbl_name = %Q", sqlite3_value_text(apVal[0]))
  );
  if( rc!=SQLITE_OK ){
    sqlite3_result_error(pCtx, zErrmsg, -1);
  }else{
    int nIndex = 0;
    if( SQLITE_ROW==sqlite3_step(pStmt) ){
      nIndex = sqlite3_column_int(pStmt, 0);
    }
    rc = sqlite3_finalize(pStmt);
    if( rc==SQLITE_OK ){
      sqlite3_result_int(pCtx, nIndex);
    }else{
      sqlite3_result_error(pCtx, sqlite3_errmsg(db), -1);
    }
  }

  sqlite3_free(zErrmsg);
}

/*
** If the RBU database contains the rbu_count table, use it to initialize
** the sqlite3rbu.nPhaseOneStep variable. The schema of the rbu_count table
** is assumed to contain the same columns as:
**
**   CREATE TABLE rbu_count(tbl TEXT PRIMARY KEY, cnt INTEGER) WITHOUT ROWID;
**
** There should be one row in the table for each data_xxx table in the
** database. The 'tbl' column should contain the name of a data_xxx table,
** and the cnt column the number of rows it contains.
**
** sqlite3rbu.nPhaseOneStep is initialized to the sum of (1 + nIndex) * cnt
** for all rows in the rbu_count table, where nIndex is the number of 
** indexes on the corresponding target database table.
*/
static void rbuInitPhaseOneSteps(sqlite3rbu *p){
  if( p->rc==SQLITE_OK ){
    sqlite3_stmt *pStmt = 0;
    int bExists = 0;                /* True if rbu_count exists */

    p->nPhaseOneStep = -1;

    p->rc = sqlite3_create_function(p->dbRbu, 
        "rbu_index_cnt", 1, SQLITE_UTF8, (void*)p, rbuIndexCntFunc, 0, 0
    );
  
    /* Check for the rbu_count table. If it does not exist, or if an error
    ** occurs, nPhaseOneStep will be left set to -1. */
    if( p->rc==SQLITE_OK ){
      p->rc = prepareAndCollectError(p->dbRbu, &pStmt, &p->zErrmsg,
          "SELECT 1 FROM sqlite_schema WHERE tbl_name = 'rbu_count'"
      );
    }
    if( p->rc==SQLITE_OK ){
      if( SQLITE_ROW==sqlite3_step(pStmt) ){
        bExists = 1;
      }
      p->rc = sqlite3_finalize(pStmt);
    }
  
    if( p->rc==SQLITE_OK && bExists ){
      p->rc = prepareAndCollectError(p->dbRbu, &pStmt, &p->zErrmsg,
          "SELECT sum(cnt * (1 + rbu_index_cnt(rbu_target_name(tbl))))"
          "FROM rbu_count"
      );
      if( p->rc==SQLITE_OK ){
        if( SQLITE_ROW==sqlite3_step(pStmt) ){
          p->nPhaseOneStep = sqlite3_column_int64(pStmt, 0);
        }
        p->rc = sqlite3_finalize(pStmt);
      }
    }
  }
}


static sqlite3rbu *openRbuHandle(
  const char *zTarget, 
  const char *zRbu,
  const char *zState
){
  sqlite3rbu *p;
  size_t nTarget = zTarget ? strlen(zTarget) : 0;
  size_t nRbu = strlen(zRbu);
  size_t nByte = sizeof(sqlite3rbu) + nTarget+1 + nRbu+1;

  p = (sqlite3rbu*)sqlite3_malloc64(nByte);
  if( p ){
    RbuState *pState = 0;

    /* Create the custom VFS. */
    memset(p, 0, sizeof(sqlite3rbu));
    rbuCreateVfs(p);

    /* Open the target, RBU and state databases */
    if( p->rc==SQLITE_OK ){
      char *pCsr = (char*)&p[1];
      int bRetry = 0;
      if( zTarget ){
        p->zTarget = pCsr;
        memcpy(p->zTarget, zTarget, nTarget+1);
        pCsr += nTarget+1;
      }
      p->zRbu = pCsr;
      memcpy(p->zRbu, zRbu, nRbu+1);
      pCsr += nRbu+1;
      if( zState ){
        p->zState = rbuMPrintf(p, "%s", zState);
      }

      /* If the first attempt to open the database file fails and the bRetry
      ** flag it set, this means that the db was not opened because it seemed
      ** to be a wal-mode db. But, this may have happened due to an earlier
      ** RBU vacuum operation leaving an old wal file in the directory.
      ** If this is the case, it will have been checkpointed and deleted
      ** when the handle was closed and a second attempt to open the 
      ** database may succeed.  */
      rbuOpenDatabase(p, &bRetry);
      if( bRetry ){
        rbuOpenDatabase(p, 0);
      }
    }

    if( p->rc==SQLITE_OK ){
      pState = rbuLoadState(p);
      assert( pState || p->rc!=SQLITE_OK );
      if( p->rc==SQLITE_OK ){

        if( pState->eStage==0 ){ 
          rbuDeleteOalFile(p);
          rbuInitPhaseOneSteps(p);
          p->eStage = RBU_STAGE_OAL;
        }else{
          p->eStage = pState->eStage;
          p->nPhaseOneStep = pState->nPhaseOneStep;
        }
        p->nProgress = pState->nProgress;
        p->iOalSz = pState->iOalSz;
      }
    }
    assert( p->rc!=SQLITE_OK || p->eStage!=0 );

    if( p->rc==SQLITE_OK && p->pTargetFd->pWalFd ){
      if( p->eStage==RBU_STAGE_OAL ){
        p->rc = SQLITE_ERROR;
        p->zErrmsg = sqlite3_mprintf("cannot update wal mode database");
      }else if( p->eStage==RBU_STAGE_MOVE ){
        p->eStage = RBU_STAGE_CKPT;
        p->nStep = 0;
      }
    }

    if( p->rc==SQLITE_OK 
     && (p->eStage==RBU_STAGE_OAL || p->eStage==RBU_STAGE_MOVE)
     && pState->eStage!=0
    ){
      rbu_file *pFd = (rbuIsVacuum(p) ? p->pRbuFd : p->pTargetFd);
      if( pFd->iCookie!=pState->iCookie ){   
        /* At this point (pTargetFd->iCookie) contains the value of the
        ** change-counter cookie (the thing that gets incremented when a 
        ** transaction is committed in rollback mode) currently stored on 
        ** page 1 of the database file. */
        p->rc = SQLITE_BUSY;
        p->zErrmsg = sqlite3_mprintf("database modified during rbu %s",
            (rbuIsVacuum(p) ? "vacuum" : "update")
        );
      }
    }

    if( p->rc==SQLITE_OK ){
      if( p->eStage==RBU_STAGE_OAL ){
        sqlite3 *db = p->dbMain;
        p->rc = sqlite3_exec(p->dbRbu, "BEGIN", 0, 0, &p->zErrmsg);

        /* Point the object iterator at the first object */
        if( p->rc==SQLITE_OK ){
          p->rc = rbuObjIterFirst(p, &p->objiter);
        }

        /* If the RBU database contains no data_xxx tables, declare the RBU
        ** update finished.  */
        if( p->rc==SQLITE_OK && p->objiter.zTbl==0 ){
          p->rc = SQLITE_DONE;
          p->eStage = RBU_STAGE_DONE;
        }else{
          if( p->rc==SQLITE_OK && pState->eStage==0 && rbuIsVacuum(p) ){
            rbuCopyPragma(p, "page_size");
            rbuCopyPragma(p, "auto_vacuum");
          }

          /* Open transactions both databases. The *-oal file is opened or
          ** created at this point. */
          if( p->rc==SQLITE_OK ){
            p->rc = sqlite3_exec(db, "BEGIN IMMEDIATE", 0, 0, &p->zErrmsg);
          }

          /* Check if the main database is a zipvfs db. If it is, set the upper
          ** level pager to use "journal_mode=off". This prevents it from 
          ** generating a large journal using a temp file.  */
          if( p->rc==SQLITE_OK ){
            int frc = sqlite3_file_control(db, "main", SQLITE_FCNTL_ZIPVFS, 0);
            if( frc==SQLITE_OK ){
              p->rc = sqlite3_exec(
                db, "PRAGMA journal_mode=off",0,0,&p->zErrmsg);
            }
          }

          if( p->rc==SQLITE_OK ){
            rbuSetupOal(p, pState);
          }
        }
      }else if( p->eStage==RBU_STAGE_MOVE ){
        /* no-op */
      }else if( p->eStage==RBU_STAGE_CKPT ){
        rbuSetupCheckpoint(p, pState);
      }else if( p->eStage==RBU_STAGE_DONE ){
        p->rc = SQLITE_DONE;
      }else{
        p->rc = SQLITE_CORRUPT;
      }
    }

    rbuFreeState(pState);
  }

  return p;
}

/*
** Allocate and return an RBU handle with all fields zeroed except for the
** error code, which is set to SQLITE_MISUSE.
*/
static sqlite3rbu *rbuMisuseError(void){
  sqlite3rbu *pRet;
  pRet = sqlite3_malloc64(sizeof(sqlite3rbu));
  if( pRet ){
    memset(pRet, 0, sizeof(sqlite3rbu));
    pRet->rc = SQLITE_MISUSE;
  }
  return pRet;
}

/*
** Open and return a new RBU handle. 
*/
sqlite3rbu *sqlite3rbu_open(
  const char *zTarget, 
  const char *zRbu,
  const char *zState
){
  if( zTarget==0 || zRbu==0 ){ return rbuMisuseError(); }
  /* TODO: Check that zTarget and zRbu are non-NULL */
  return openRbuHandle(zTarget, zRbu, zState);
}

/*
** Open a handle to begin or resume an RBU VACUUM operation.
*/
sqlite3rbu *sqlite3rbu_vacuum(
  const char *zTarget, 
  const char *zState
){
  if( zTarget==0 ){ return rbuMisuseError(); }
  if( zState ){
    int n = strlen(zState);
    if( n>=7 && 0==memcmp("-vactmp", &zState[n-7], 7) ){
      return rbuMisuseError();
    }
  }
  /* TODO: Check that both arguments are non-NULL */
  return openRbuHandle(0, zTarget, zState);
}

/*
** Return the database handle used by pRbu.
*/
sqlite3 *sqlite3rbu_db(sqlite3rbu *pRbu, int bRbu){
  sqlite3 *db = 0;
  if( pRbu ){
    db = (bRbu ? pRbu->dbRbu : pRbu->dbMain);
  }
  return db;
}


/*
** If the error code currently stored in the RBU handle is SQLITE_CONSTRAINT,
** then edit any error message string so as to remove all occurrences of
** the pattern "rbu_imp_[0-9]*".
*/
static void rbuEditErrmsg(sqlite3rbu *p){
  if( p->rc==SQLITE_CONSTRAINT && p->zErrmsg ){
    unsigned int i;
    size_t nErrmsg = strlen(p->zErrmsg);
    for(i=0; i<(nErrmsg-8); i++){
      if( memcmp(&p->zErrmsg[i], "rbu_imp_", 8)==0 ){
        int nDel = 8;
        while( p->zErrmsg[i+nDel]>='0' && p->zErrmsg[i+nDel]<='9' ) nDel++;
        memmove(&p->zErrmsg[i], &p->zErrmsg[i+nDel], nErrmsg + 1 - i - nDel);
        nErrmsg -= nDel;
      }
    }
  }
}

/*
** Close the RBU handle.
*/
int sqlite3rbu_close(sqlite3rbu *p, char **pzErrmsg){
  int rc;
  if( p ){

    /* Commit the transaction to the *-oal file. */
    if( p->rc==SQLITE_OK && p->eStage==RBU_STAGE_OAL ){
      p->rc = sqlite3_exec(p->dbMain, "COMMIT", 0, 0, &p->zErrmsg);
    }

    /* Sync the db file if currently doing an incremental checkpoint */
    if( p->rc==SQLITE_OK && p->eStage==RBU_STAGE_CKPT ){
      sqlite3_file *pDb = p->pTargetFd->pReal;
      p->rc = pDb->pMethods->xSync(pDb, SQLITE_SYNC_NORMAL);
    }

    rbuSaveState(p, p->eStage);

    if( p->rc==SQLITE_OK && p->eStage==RBU_STAGE_OAL ){
      p->rc = sqlite3_exec(p->dbRbu, "COMMIT", 0, 0, &p->zErrmsg);
    }

    /* Close any open statement handles. */
    rbuObjIterFinalize(&p->objiter);

    /* If this is an RBU vacuum handle and the vacuum has either finished
    ** successfully or encountered an error, delete the contents of the 
    ** state table. This causes the next call to sqlite3rbu_vacuum() 
    ** specifying the current target and state databases to start a new
    ** vacuum from scratch.  */
    if( rbuIsVacuum(p) && p->rc!=SQLITE_OK && p->dbRbu ){
      int rc2 = sqlite3_exec(p->dbRbu, "DELETE FROM stat.rbu_state", 0, 0, 0);
      if( p->rc==SQLITE_DONE && rc2!=SQLITE_OK ) p->rc = rc2;
    }

    /* Close the open database handle and VFS object. */
    sqlite3_close(p->dbRbu);
    sqlite3_close(p->dbMain);
    assert( p->szTemp==0 );
    rbuDeleteVfs(p);
    sqlite3_free(p->aBuf);
    sqlite3_free(p->aFrame);

    rbuEditErrmsg(p);
    rc = p->rc;
    if( pzErrmsg ){
      *pzErrmsg = p->zErrmsg;
    }else{
      sqlite3_free(p->zErrmsg);
    }
    sqlite3_free(p->zState);
    sqlite3_free(p);
  }else{
    rc = SQLITE_NOMEM;
    *pzErrmsg = 0;
  }
  return rc;
}

/*
** Return the total number of key-value operations (inserts, deletes or 
** updates) that have been performed on the target database since the
** current RBU update was started.
*/
sqlite3_int64 sqlite3rbu_progress(sqlite3rbu *pRbu){
  return pRbu->nProgress;
}

/*
** Return permyriadage progress indications for the two main stages of
** an RBU update.
*/
void sqlite3rbu_bp_progress(sqlite3rbu *p, int *pnOne, int *pnTwo){
  const int MAX_PROGRESS = 10000;
  switch( p->eStage ){
    case RBU_STAGE_OAL:
      if( p->nPhaseOneStep>0 ){
        *pnOne = (int)(MAX_PROGRESS * (i64)p->nProgress/(i64)p->nPhaseOneStep);
      }else{
        *pnOne = -1;
      }
      *pnTwo = 0;
      break;

    case RBU_STAGE_MOVE:
      *pnOne = MAX_PROGRESS;
      *pnTwo = 0;
      break;

    case RBU_STAGE_CKPT:
      *pnOne = MAX_PROGRESS;
      *pnTwo = (int)(MAX_PROGRESS * (i64)p->nStep / (i64)p->nFrame);
      break;

    case RBU_STAGE_DONE:
      *pnOne = MAX_PROGRESS;
      *pnTwo = MAX_PROGRESS;
      break;

    default:
      assert( 0 );
  }
}

/*
** Return the current state of the RBU vacuum or update operation.
*/
int sqlite3rbu_state(sqlite3rbu *p){
  int aRes[] = {
    0, SQLITE_RBU_STATE_OAL, SQLITE_RBU_STATE_MOVE,
    0, SQLITE_RBU_STATE_CHECKPOINT, SQLITE_RBU_STATE_DONE
  };

  assert( RBU_STAGE_OAL==1 );
  assert( RBU_STAGE_MOVE==2 );
  assert( RBU_STAGE_CKPT==4 );
  assert( RBU_STAGE_DONE==5 );
  assert( aRes[RBU_STAGE_OAL]==SQLITE_RBU_STATE_OAL );
  assert( aRes[RBU_STAGE_MOVE]==SQLITE_RBU_STATE_MOVE );
  assert( aRes[RBU_STAGE_CKPT]==SQLITE_RBU_STATE_CHECKPOINT );
  assert( aRes[RBU_STAGE_DONE]==SQLITE_RBU_STATE_DONE );

  if( p->rc!=SQLITE_OK && p->rc!=SQLITE_DONE ){
    return SQLITE_RBU_STATE_ERROR;
  }else{
    assert( p->rc!=SQLITE_DONE || p->eStage==RBU_STAGE_DONE );
    assert( p->eStage==RBU_STAGE_OAL
         || p->eStage==RBU_STAGE_MOVE
         || p->eStage==RBU_STAGE_CKPT
         || p->eStage==RBU_STAGE_DONE
    );
    return aRes[p->eStage];
  }
}

int sqlite3rbu_savestate(sqlite3rbu *p){
  int rc = p->rc;
  if( rc==SQLITE_DONE ) return SQLITE_OK;

  assert( p->eStage>=RBU_STAGE_OAL && p->eStage<=RBU_STAGE_DONE );
  if( p->eStage==RBU_STAGE_OAL ){
    assert( rc!=SQLITE_DONE );
    if( rc==SQLITE_OK ) rc = sqlite3_exec(p->dbMain, "COMMIT", 0, 0, 0);
  }

  /* Sync the db file */
  if( rc==SQLITE_OK && p->eStage==RBU_STAGE_CKPT ){
    sqlite3_file *pDb = p->pTargetFd->pReal;
    rc = pDb->pMethods->xSync(pDb, SQLITE_SYNC_NORMAL);
  }

  p->rc = rc;
  rbuSaveState(p, p->eStage);
  rc = p->rc;

  if( p->eStage==RBU_STAGE_OAL ){
    assert( rc!=SQLITE_DONE );
    if( rc==SQLITE_OK ) rc = sqlite3_exec(p->dbRbu, "COMMIT", 0, 0, 0);
    if( rc==SQLITE_OK ){ 
      const char *zBegin = rbuIsVacuum(p) ? "BEGIN" : "BEGIN IMMEDIATE";
      rc = sqlite3_exec(p->dbRbu, zBegin, 0, 0, 0);
    }
    if( rc==SQLITE_OK ) rc = sqlite3_exec(p->dbMain, "BEGIN IMMEDIATE", 0, 0,0);
  }

  p->rc = rc;
  return rc;
}

/**************************************************************************
** Beginning of RBU VFS shim methods. The VFS shim modifies the behaviour
** of a standard VFS in the following ways:
**
** 1. Whenever the first page of a main database file is read or 
**    written, the value of the change-counter cookie is stored in
**    rbu_file.iCookie. Similarly, the value of the "write-version"
**    database header field is stored in rbu_file.iWriteVer. This ensures
**    that the values are always trustworthy within an open transaction.
**
** 2. Whenever an SQLITE_OPEN_WAL file is opened, the (rbu_file.pWalFd)
**    member variable of the associated database file descriptor is set
**    to point to the new file. A mutex protected linked list of all main 
**    db fds opened using a particular RBU VFS is maintained at 
**    rbu_vfs.pMain to facilitate this.
**
** 3. Using a new file-control "SQLITE_FCNTL_RBU", a main db rbu_file 
**    object can be marked as the target database of an RBU update. This
**    turns on the following extra special behaviour:
**
** 3a. If xAccess() is called to check if there exists a *-wal file 
**     associated with an RBU target database currently in RBU_STAGE_OAL
**     stage (preparing the *-oal file), the following special handling
**     applies:
**
**      * if the *-wal file does exist, return SQLITE_CANTOPEN. An RBU
**        target database may not be in wal mode already.
**
**      * if the *-wal file does not exist, set the output parameter to
**        non-zero (to tell SQLite that it does exist) anyway.
**
**     Then, when xOpen() is called to open the *-wal file associated with
**     the RBU target in RBU_STAGE_OAL stage, instead of opening the *-wal
**     file, the rbu vfs opens the corresponding *-oal file instead. 
**
** 3b. The *-shm pages returned by xShmMap() for a target db file in
**     RBU_STAGE_OAL mode are actually stored in heap memory. This is to
**     avoid creating a *-shm file on disk. Additionally, xShmLock() calls
**     are no-ops on target database files in RBU_STAGE_OAL mode. This is
**     because assert() statements in some VFS implementations fail if 
**     xShmLock() is called before xShmMap().
**
** 3c. If an EXCLUSIVE lock is attempted on a target database file in any
**     mode except RBU_STAGE_DONE (all work completed and checkpointed), it 
**     fails with an SQLITE_BUSY error. This is to stop RBU connections
**     from automatically checkpointing a *-wal (or *-oal) file from within
**     sqlite3_close().
**
** 3d. In RBU_STAGE_CAPTURE mode, all xRead() calls on the wal file, and
**     all xWrite() calls on the target database file perform no IO. 
**     Instead the frame and page numbers that would be read and written
**     are recorded. Additionally, successful attempts to obtain exclusive
**     xShmLock() WRITER, CHECKPOINTER and READ0 locks on the target 
**     database file are recorded. xShmLock() calls to unlock the same
**     locks are no-ops (so that once obtained, these locks are never
**     relinquished). Finally, calls to xSync() on the target database
**     file fail with SQLITE_INTERNAL errors.
*/

static void rbuUnlockShm(rbu_file *p){
  assert( p->openFlags & SQLITE_OPEN_MAIN_DB );
  if( p->pRbu ){
    int (*xShmLock)(sqlite3_file*,int,int,int) = p->pReal->pMethods->xShmLock;
    int i;
    for(i=0; i<SQLITE_SHM_NLOCK;i++){
      if( (1<<i) & p->pRbu->mLock ){
        xShmLock(p->pReal, i, 1, SQLITE_SHM_UNLOCK|SQLITE_SHM_EXCLUSIVE);
      }
    }
    p->pRbu->mLock = 0;
  }
}

/*
*/
static int rbuUpdateTempSize(rbu_file *pFd, sqlite3_int64 nNew){
  sqlite3rbu *pRbu = pFd->pRbu;
  i64 nDiff = nNew - pFd->sz;
  pRbu->szTemp += nDiff;
  pFd->sz = nNew;
  assert( pRbu->szTemp>=0 );
  if( pRbu->szTempLimit && pRbu->szTemp>pRbu->szTempLimit ) return SQLITE_FULL;
  return SQLITE_OK;
}

/*
** Add an item to the main-db lists, if it is not already present.
**
** There are two main-db lists. One for all file descriptors, and one
** for all file descriptors with rbu_file.pDb!=0. If the argument has
** rbu_file.pDb!=0, then it is assumed to already be present on the
** main list and is only added to the pDb!=0 list.
*/
static void rbuMainlistAdd(rbu_file *p){
  rbu_vfs *pRbuVfs = p->pRbuVfs;
  rbu_file *pIter;
  assert( (p->openFlags & SQLITE_OPEN_MAIN_DB) );
  sqlite3_mutex_enter(pRbuVfs->mutex);
  if( p->pRbu==0 ){
    for(pIter=pRbuVfs->pMain; pIter; pIter=pIter->pMainNext);
    p->pMainNext = pRbuVfs->pMain;
    pRbuVfs->pMain = p;
  }else{
    for(pIter=pRbuVfs->pMainRbu; pIter && pIter!=p; pIter=pIter->pMainRbuNext){}
    if( pIter==0 ){
      p->pMainRbuNext = pRbuVfs->pMainRbu;
      pRbuVfs->pMainRbu = p;
    }
  }
  sqlite3_mutex_leave(pRbuVfs->mutex);
}

/*
** Remove an item from the main-db lists.
*/
static void rbuMainlistRemove(rbu_file *p){
  rbu_file **pp;
  sqlite3_mutex_enter(p->pRbuVfs->mutex);
  for(pp=&p->pRbuVfs->pMain; *pp && *pp!=p; pp=&((*pp)->pMainNext)){}
  if( *pp ) *pp = p->pMainNext;
  p->pMainNext = 0;
  for(pp=&p->pRbuVfs->pMainRbu; *pp && *pp!=p; pp=&((*pp)->pMainRbuNext)){}
  if( *pp ) *pp = p->pMainRbuNext;
  p->pMainRbuNext = 0;
  sqlite3_mutex_leave(p->pRbuVfs->mutex);
}

/*
** Given that zWal points to a buffer containing a wal file name passed to 
** either the xOpen() or xAccess() VFS method, search the main-db list for
** a file-handle opened by the same database connection on the corresponding
** database file.
**
** If parameter bRbu is true, only search for file-descriptors with
** rbu_file.pDb!=0.
*/
static rbu_file *rbuFindMaindb(rbu_vfs *pRbuVfs, const char *zWal, int bRbu){
  rbu_file *pDb;
  sqlite3_mutex_enter(pRbuVfs->mutex);
  if( bRbu ){
    for(pDb=pRbuVfs->pMainRbu; pDb && pDb->zWal!=zWal; pDb=pDb->pMainRbuNext){}
  }else{
    for(pDb=pRbuVfs->pMain; pDb && pDb->zWal!=zWal; pDb=pDb->pMainNext){}
  }
  sqlite3_mutex_leave(pRbuVfs->mutex);
  return pDb;
}

/*
** Close an rbu file.
*/
static int rbuVfsClose(sqlite3_file *pFile){
  rbu_file *p = (rbu_file*)pFile;
  int rc;
  int i;

  /* Free the contents of the apShm[] array. And the array itself. */
  for(i=0; i<p->nShm; i++){
    sqlite3_free(p->apShm[i]);
  }
  sqlite3_free(p->apShm);
  p->apShm = 0;
  sqlite3_free(p->zDel);

  if( p->openFlags & SQLITE_OPEN_MAIN_DB ){
    rbuMainlistRemove(p);
    rbuUnlockShm(p);
    p->pReal->pMethods->xShmUnmap(p->pReal, 0);
  }
  else if( (p->openFlags & SQLITE_OPEN_DELETEONCLOSE) && p->pRbu ){
    rbuUpdateTempSize(p, 0);
  }
  assert( p->pMainNext==0 && p->pRbuVfs->pMain!=p );

  /* Close the underlying file handle */
  rc = p->pReal->pMethods->xClose(p->pReal);
  return rc;
}


/*
** Read and return an unsigned 32-bit big-endian integer from the buffer 
** passed as the only argument.
*/
static u32 rbuGetU32(u8 *aBuf){
  return ((u32)aBuf[0] << 24)
       + ((u32)aBuf[1] << 16)
       + ((u32)aBuf[2] <<  8)
       + ((u32)aBuf[3]);
}

/*
** Write an unsigned 32-bit value in big-endian format to the supplied
** buffer.
*/
static void rbuPutU32(u8 *aBuf, u32 iVal){
  aBuf[0] = (iVal >> 24) & 0xFF;
  aBuf[1] = (iVal >> 16) & 0xFF;
  aBuf[2] = (iVal >>  8) & 0xFF;
  aBuf[3] = (iVal >>  0) & 0xFF;
}

static void rbuPutU16(u8 *aBuf, u16 iVal){
  aBuf[0] = (iVal >>  8) & 0xFF;
  aBuf[1] = (iVal >>  0) & 0xFF;
}

/*
** Read data from an rbuVfs-file.
*/
static int rbuVfsRead(
  sqlite3_file *pFile, 
  void *zBuf, 
  int iAmt, 
  sqlite_int64 iOfst
){
  rbu_file *p = (rbu_file*)pFile;
  sqlite3rbu *pRbu = p->pRbu;
  int rc;

  if( pRbu && pRbu->eStage==RBU_STAGE_CAPTURE ){
    assert( p->openFlags & SQLITE_OPEN_WAL );
    rc = rbuCaptureWalRead(p->pRbu, iOfst, iAmt);
  }else{
    if( pRbu && pRbu->eStage==RBU_STAGE_OAL 
     && (p->openFlags & SQLITE_OPEN_WAL) 
     && iOfst>=pRbu->iOalSz 
    ){
      rc = SQLITE_OK;
      memset(zBuf, 0, iAmt);
    }else{
      rc = p->pReal->pMethods->xRead(p->pReal, zBuf, iAmt, iOfst);
#if 1
      /* If this is being called to read the first page of the target 
      ** database as part of an rbu vacuum operation, synthesize the 
      ** contents of the first page if it does not yet exist. Otherwise,
      ** SQLite will not check for a *-wal file.  */
      if( pRbu && rbuIsVacuum(pRbu) 
          && rc==SQLITE_IOERR_SHORT_READ && iOfst==0
          && (p->openFlags & SQLITE_OPEN_MAIN_DB)
          && pRbu->rc==SQLITE_OK
      ){
        sqlite3_file *pFd = (sqlite3_file*)pRbu->pRbuFd;
        rc = pFd->pMethods->xRead(pFd, zBuf, iAmt, iOfst);
        if( rc==SQLITE_OK ){
          u8 *aBuf = (u8*)zBuf;
          u32 iRoot = rbuGetU32(&aBuf[52]) ? 1 : 0;
          rbuPutU32(&aBuf[52], iRoot);      /* largest root page number */
          rbuPutU32(&aBuf[36], 0);          /* number of free pages */
          rbuPutU32(&aBuf[32], 0);          /* first page on free list trunk */
          rbuPutU32(&aBuf[28], 1);          /* size of db file in pages */
          rbuPutU32(&aBuf[24], pRbu->pRbuFd->iCookie+1);  /* Change counter */

          if( iAmt>100 ){
            memset(&aBuf[100], 0, iAmt-100);
            rbuPutU16(&aBuf[105], iAmt & 0xFFFF);
            aBuf[100] = 0x0D;
          }
        }
      }
#endif
    }
    if( rc==SQLITE_OK && iOfst==0 && (p->openFlags & SQLITE_OPEN_MAIN_DB) ){
      /* These look like magic numbers. But they are stable, as they are part
       ** of the definition of the SQLite file format, which may not change. */
      u8 *pBuf = (u8*)zBuf;
      p->iCookie = rbuGetU32(&pBuf[24]);
      p->iWriteVer = pBuf[19];
    }
  }
  return rc;
}

/*
** Write data to an rbuVfs-file.
*/
static int rbuVfsWrite(
  sqlite3_file *pFile, 
  const void *zBuf, 
  int iAmt, 
  sqlite_int64 iOfst
){
  rbu_file *p = (rbu_file*)pFile;
  sqlite3rbu *pRbu = p->pRbu;
  int rc;

  if( pRbu && pRbu->eStage==RBU_STAGE_CAPTURE ){
    assert( p->openFlags & SQLITE_OPEN_MAIN_DB );
    rc = rbuCaptureDbWrite(p->pRbu, iOfst);
  }else{
    if( pRbu ){
      if( pRbu->eStage==RBU_STAGE_OAL 
       && (p->openFlags & SQLITE_OPEN_WAL) 
       && iOfst>=pRbu->iOalSz
      ){
        pRbu->iOalSz = iAmt + iOfst;
      }else if( p->openFlags & SQLITE_OPEN_DELETEONCLOSE ){
        i64 szNew = iAmt+iOfst;
        if( szNew>p->sz ){
          rc = rbuUpdateTempSize(p, szNew);
          if( rc!=SQLITE_OK ) return rc;
        }
      }
    }
    rc = p->pReal->pMethods->xWrite(p->pReal, zBuf, iAmt, iOfst);
    if( rc==SQLITE_OK && iOfst==0 && (p->openFlags & SQLITE_OPEN_MAIN_DB) ){
      /* These look like magic numbers. But they are stable, as they are part
      ** of the definition of the SQLite file format, which may not change. */
      u8 *pBuf = (u8*)zBuf;
      p->iCookie = rbuGetU32(&pBuf[24]);
      p->iWriteVer = pBuf[19];
    }
  }
  return rc;
}

/*
** Truncate an rbuVfs-file.
*/
static int rbuVfsTruncate(sqlite3_file *pFile, sqlite_int64 size){
  rbu_file *p = (rbu_file*)pFile;
  if( (p->openFlags & SQLITE_OPEN_DELETEONCLOSE) && p->pRbu ){
    int rc = rbuUpdateTempSize(p, size);
    if( rc!=SQLITE_OK ) return rc;
  }
  return p->pReal->pMethods->xTruncate(p->pReal, size);
}

/*
** Sync an rbuVfs-file.
*/
static int rbuVfsSync(sqlite3_file *pFile, int flags){
  rbu_file *p = (rbu_file *)pFile;
  if( p->pRbu && p->pRbu->eStage==RBU_STAGE_CAPTURE ){
    if( p->openFlags & SQLITE_OPEN_MAIN_DB ){
      return SQLITE_INTERNAL;
    }
    return SQLITE_OK;
  }
  return p->pReal->pMethods->xSync(p->pReal, flags);
}

/*
** Return the current file-size of an rbuVfs-file.
*/
static int rbuVfsFileSize(sqlite3_file *pFile, sqlite_int64 *pSize){
  rbu_file *p = (rbu_file *)pFile;
  int rc;
  rc = p->pReal->pMethods->xFileSize(p->pReal, pSize);

  /* If this is an RBU vacuum operation and this is the target database,
  ** pretend that it has at least one page. Otherwise, SQLite will not
  ** check for the existance of a *-wal file. rbuVfsRead() contains 
  ** similar logic.  */
  if( rc==SQLITE_OK && *pSize==0 
   && p->pRbu && rbuIsVacuum(p->pRbu) 
   && (p->openFlags & SQLITE_OPEN_MAIN_DB)
  ){
    *pSize = 1024;
  }
  return rc;
}

/*
** Lock an rbuVfs-file.
*/
static int rbuVfsLock(sqlite3_file *pFile, int eLock){
  rbu_file *p = (rbu_file*)pFile;
  sqlite3rbu *pRbu = p->pRbu;
  int rc = SQLITE_OK;

  assert( p->openFlags & (SQLITE_OPEN_MAIN_DB|SQLITE_OPEN_TEMP_DB) );
  if( eLock==SQLITE_LOCK_EXCLUSIVE 
   && (p->bNolock || (pRbu && pRbu->eStage!=RBU_STAGE_DONE))
  ){
    /* Do not allow EXCLUSIVE locks. Preventing SQLite from taking this 
    ** prevents it from checkpointing the database from sqlite3_close(). */
    rc = SQLITE_BUSY;
  }else{
    rc = p->pReal->pMethods->xLock(p->pReal, eLock);
  }

  return rc;
}

/*
** Unlock an rbuVfs-file.
*/
static int rbuVfsUnlock(sqlite3_file *pFile, int eLock){
  rbu_file *p = (rbu_file *)pFile;
  return p->pReal->pMethods->xUnlock(p->pReal, eLock);
}

/*
** Check if another file-handle holds a RESERVED lock on an rbuVfs-file.
*/
static int rbuVfsCheckReservedLock(sqlite3_file *pFile, int *pResOut){
  rbu_file *p = (rbu_file *)pFile;
  return p->pReal->pMethods->xCheckReservedLock(p->pReal, pResOut);
}

/*
** File control method. For custom operations on an rbuVfs-file.
*/
static int rbuVfsFileControl(sqlite3_file *pFile, int op, void *pArg){
  rbu_file *p = (rbu_file *)pFile;
  int (*xControl)(sqlite3_file*,int,void*) = p->pReal->pMethods->xFileControl;
  int rc;

  assert( p->openFlags & (SQLITE_OPEN_MAIN_DB|SQLITE_OPEN_TEMP_DB)
       || p->openFlags & (SQLITE_OPEN_TRANSIENT_DB|SQLITE_OPEN_TEMP_JOURNAL)
  );
  if( op==SQLITE_FCNTL_RBU ){
    sqlite3rbu *pRbu = (sqlite3rbu*)pArg;

    /* First try to find another RBU vfs lower down in the vfs stack. If
    ** one is found, this vfs will operate in pass-through mode. The lower
    ** level vfs will do the special RBU handling.  */
    rc = xControl(p->pReal, op, pArg);

    if( rc==SQLITE_NOTFOUND ){
      /* Now search for a zipvfs instance lower down in the VFS stack. If
      ** one is found, this is an error.  */
      void *dummy = 0;
      rc = xControl(p->pReal, SQLITE_FCNTL_ZIPVFS, &dummy);
      if( rc==SQLITE_OK ){
        rc = SQLITE_ERROR;
        pRbu->zErrmsg = sqlite3_mprintf("rbu/zipvfs setup error");
      }else if( rc==SQLITE_NOTFOUND ){
        pRbu->pTargetFd = p;
        p->pRbu = pRbu;
        rbuMainlistAdd(p);
        if( p->pWalFd ) p->pWalFd->pRbu = pRbu;
        rc = SQLITE_OK;
      }
    }
    return rc;
  }
  else if( op==SQLITE_FCNTL_RBUCNT ){
    sqlite3rbu *pRbu = (sqlite3rbu*)pArg;
    pRbu->nRbu++;
    pRbu->pRbuFd = p;
    p->bNolock = 1;
  }

  rc = xControl(p->pReal, op, pArg);
  if( rc==SQLITE_OK && op==SQLITE_FCNTL_VFSNAME ){
    rbu_vfs *pRbuVfs = p->pRbuVfs;
    char *zIn = *(char**)pArg;
    char *zOut = sqlite3_mprintf("rbu(%s)/%z", pRbuVfs->base.zName, zIn);
    *(char**)pArg = zOut;
    if( zOut==0 ) rc = SQLITE_NOMEM;
  }

  return rc;
}

/*
** Return the sector-size in bytes for an rbuVfs-file.
*/
static int rbuVfsSectorSize(sqlite3_file *pFile){
  rbu_file *p = (rbu_file *)pFile;
  return p->pReal->pMethods->xSectorSize(p->pReal);
}

/*
** Return the device characteristic flags supported by an rbuVfs-file.
*/
static int rbuVfsDeviceCharacteristics(sqlite3_file *pFile){
  rbu_file *p = (rbu_file *)pFile;
  return p->pReal->pMethods->xDeviceCharacteristics(p->pReal);
}

/*
** Take or release a shared-memory lock.
*/
static int rbuVfsShmLock(sqlite3_file *pFile, int ofst, int n, int flags){
  rbu_file *p = (rbu_file*)pFile;
  sqlite3rbu *pRbu = p->pRbu;
  int rc = SQLITE_OK;

#ifdef SQLITE_AMALGAMATION
    assert( WAL_CKPT_LOCK==1 );
#endif

  assert( p->openFlags & (SQLITE_OPEN_MAIN_DB|SQLITE_OPEN_TEMP_DB) );
  if( pRbu && (pRbu->eStage==RBU_STAGE_OAL || pRbu->eStage==RBU_STAGE_MOVE) ){
    /* Magic number 1 is the WAL_CKPT_LOCK lock. Preventing SQLite from
    ** taking this lock also prevents any checkpoints from occurring. 
    ** todo: really, it's not clear why this might occur, as 
    ** wal_autocheckpoint ought to be turned off.  */
    if( ofst==WAL_LOCK_CKPT && n==1 ) rc = SQLITE_BUSY;
  }else{
    int bCapture = 0;
    if( pRbu && pRbu->eStage==RBU_STAGE_CAPTURE ){
      bCapture = 1;
    }

    if( bCapture==0 || 0==(flags & SQLITE_SHM_UNLOCK) ){
      rc = p->pReal->pMethods->xShmLock(p->pReal, ofst, n, flags);
      if( bCapture && rc==SQLITE_OK ){
        pRbu->mLock |= (1 << ofst);
      }
    }
  }

  return rc;
}

/*
** Obtain a pointer to a mapping of a single 32KiB page of the *-shm file.
*/
static int rbuVfsShmMap(
  sqlite3_file *pFile, 
  int iRegion, 
  int szRegion, 
  int isWrite, 
  void volatile **pp
){
  rbu_file *p = (rbu_file*)pFile;
  int rc = SQLITE_OK;
  int eStage = (p->pRbu ? p->pRbu->eStage : 0);

  /* If not in RBU_STAGE_OAL, allow this call to pass through. Or, if this
  ** rbu is in the RBU_STAGE_OAL state, use heap memory for *-shm space 
  ** instead of a file on disk.  */
  assert( p->openFlags & (SQLITE_OPEN_MAIN_DB|SQLITE_OPEN_TEMP_DB) );
  if( eStage==RBU_STAGE_OAL ){
    sqlite3_int64 nByte = (iRegion+1) * sizeof(char*);
    char **apNew = (char**)sqlite3_realloc64(p->apShm, nByte);

    /* This is an RBU connection that uses its own heap memory for the
    ** pages of the *-shm file. Since no other process can have run
    ** recovery, the connection must request *-shm pages in order
    ** from start to finish.  */
    assert( iRegion==p->nShm );
    if( apNew==0 ){
      rc = SQLITE_NOMEM;
    }else{
      memset(&apNew[p->nShm], 0, sizeof(char*) * (1 + iRegion - p->nShm));
      p->apShm = apNew;
      p->nShm = iRegion+1;
    }

    if( rc==SQLITE_OK ){
      char *pNew = (char*)sqlite3_malloc64(szRegion);
      if( pNew==0 ){
        rc = SQLITE_NOMEM;
      }else{
        memset(pNew, 0, szRegion);
        p->apShm[iRegion] = pNew;
      }
    }

    if( rc==SQLITE_OK ){
      *pp = p->apShm[iRegion];
    }else{
      *pp = 0;
    }
  }else{
    assert( p->apShm==0 );
    rc = p->pReal->pMethods->xShmMap(p->pReal, iRegion, szRegion, isWrite, pp);
  }

  return rc;
}

/*
** Memory barrier.
*/
static void rbuVfsShmBarrier(sqlite3_file *pFile){
  rbu_file *p = (rbu_file *)pFile;
  p->pReal->pMethods->xShmBarrier(p->pReal);
}

/*
** The xShmUnmap method.
*/
static int rbuVfsShmUnmap(sqlite3_file *pFile, int delFlag){
  rbu_file *p = (rbu_file*)pFile;
  int rc = SQLITE_OK;
  int eStage = (p->pRbu ? p->pRbu->eStage : 0);

  assert( p->openFlags & (SQLITE_OPEN_MAIN_DB|SQLITE_OPEN_TEMP_DB) );
  if( eStage==RBU_STAGE_OAL || eStage==RBU_STAGE_MOVE ){
    /* no-op */
  }else{
    /* Release the checkpointer and writer locks */
    rbuUnlockShm(p);
    rc = p->pReal->pMethods->xShmUnmap(p->pReal, delFlag);
  }
  return rc;
}

/*
** Open an rbu file handle.
*/
static int rbuVfsOpen(
  sqlite3_vfs *pVfs,
  const char *zName,
  sqlite3_file *pFile,
  int flags,
  int *pOutFlags
){
  static sqlite3_io_methods rbuvfs_io_methods = {
    2,                            /* iVersion */
    rbuVfsClose,                  /* xClose */
    rbuVfsRead,                   /* xRead */
    rbuVfsWrite,                  /* xWrite */
    rbuVfsTruncate,               /* xTruncate */
    rbuVfsSync,                   /* xSync */
    rbuVfsFileSize,               /* xFileSize */
    rbuVfsLock,                   /* xLock */
    rbuVfsUnlock,                 /* xUnlock */
    rbuVfsCheckReservedLock,      /* xCheckReservedLock */
    rbuVfsFileControl,            /* xFileControl */
    rbuVfsSectorSize,             /* xSectorSize */
    rbuVfsDeviceCharacteristics,  /* xDeviceCharacteristics */
    rbuVfsShmMap,                 /* xShmMap */
    rbuVfsShmLock,                /* xShmLock */
    rbuVfsShmBarrier,             /* xShmBarrier */
    rbuVfsShmUnmap,               /* xShmUnmap */
    0, 0                          /* xFetch, xUnfetch */
  };
  rbu_vfs *pRbuVfs = (rbu_vfs*)pVfs;
  sqlite3_vfs *pRealVfs = pRbuVfs->pRealVfs;
  rbu_file *pFd = (rbu_file *)pFile;
  int rc = SQLITE_OK;
  const char *zOpen = zName;
  int oflags = flags;

  memset(pFd, 0, sizeof(rbu_file));
  pFd->pReal = (sqlite3_file*)&pFd[1];
  pFd->pRbuVfs = pRbuVfs;
  pFd->openFlags = flags;
  if( zName ){
    if( flags & SQLITE_OPEN_MAIN_DB ){
      /* A main database has just been opened. The following block sets
      ** (pFd->zWal) to point to a buffer owned by SQLite that contains
      ** the name of the *-wal file this db connection will use. SQLite
      ** happens to pass a pointer to this buffer when using xAccess()
      ** or xOpen() to operate on the *-wal file.  */
      pFd->zWal = sqlite3_filename_wal(zName);
    }
    else if( flags & SQLITE_OPEN_WAL ){
      rbu_file *pDb = rbuFindMaindb(pRbuVfs, zName, 0);
      if( pDb ){
        if( pDb->pRbu && pDb->pRbu->eStage==RBU_STAGE_OAL ){
          /* This call is to open a *-wal file. Intead, open the *-oal. This
          ** code ensures that the string passed to xOpen() is terminated by a
          ** pair of '\0' bytes in case the VFS attempts to extract a URI 
          ** parameter from it.  */
          const char *zBase = zName;
          size_t nCopy;
          char *zCopy;
          if( rbuIsVacuum(pDb->pRbu) ){
            zBase = sqlite3_db_filename(pDb->pRbu->dbRbu, "main");
            zBase = sqlite3_filename_wal(zBase);
          }
          nCopy = strlen(zBase);
          zCopy = sqlite3_malloc64(nCopy+2);
          if( zCopy ){
            memcpy(zCopy, zBase, nCopy);
            zCopy[nCopy-3] = 'o';
            zCopy[nCopy] = '\0';
            zCopy[nCopy+1] = '\0';
            zOpen = (const char*)(pFd->zDel = zCopy);
          }else{
            rc = SQLITE_NOMEM;
          }
          pFd->pRbu = pDb->pRbu;
        }
        pDb->pWalFd = pFd;
      }
    }
  }else{
    pFd->pRbu = pRbuVfs->pRbu;
  }

  if( oflags & SQLITE_OPEN_MAIN_DB 
   && sqlite3_uri_boolean(zName, "rbu_memory", 0) 
  ){
    assert( oflags & SQLITE_OPEN_MAIN_DB );
    oflags =  SQLITE_OPEN_TEMP_DB | SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE |
              SQLITE_OPEN_EXCLUSIVE | SQLITE_OPEN_DELETEONCLOSE;
    zOpen = 0;
  }

  if( rc==SQLITE_OK ){
    rc = pRealVfs->xOpen(pRealVfs, zOpen, pFd->pReal, oflags, pOutFlags);
  }
  if( pFd->pReal->pMethods ){
    /* The xOpen() operation has succeeded. Set the sqlite3_file.pMethods
    ** pointer and, if the file is a main database file, link it into the
    ** mutex protected linked list of all such files.  */
    pFile->pMethods = &rbuvfs_io_methods;
    if( flags & SQLITE_OPEN_MAIN_DB ){
      rbuMainlistAdd(pFd);
    }
  }else{
    sqlite3_free(pFd->zDel);
  }

  return rc;
}

/*
** Delete the file located at zPath.
*/
static int rbuVfsDelete(sqlite3_vfs *pVfs, const char *zPath, int dirSync){
  sqlite3_vfs *pRealVfs = ((rbu_vfs*)pVfs)->pRealVfs;
  return pRealVfs->xDelete(pRealVfs, zPath, dirSync);
}

/*
** Test for access permissions. Return true if the requested permission
** is available, or false otherwise.
*/
static int rbuVfsAccess(
  sqlite3_vfs *pVfs, 
  const char *zPath, 
  int flags, 
  int *pResOut
){
  rbu_vfs *pRbuVfs = (rbu_vfs*)pVfs;
  sqlite3_vfs *pRealVfs = pRbuVfs->pRealVfs;
  int rc;

  rc = pRealVfs->xAccess(pRealVfs, zPath, flags, pResOut);

  /* If this call is to check if a *-wal file associated with an RBU target
  ** database connection exists, and the RBU update is in RBU_STAGE_OAL,
  ** the following special handling is activated:
  **
  **   a) if the *-wal file does exist, return SQLITE_CANTOPEN. This
  **      ensures that the RBU extension never tries to update a database
  **      in wal mode, even if the first page of the database file has
  **      been damaged. 
  **
  **   b) if the *-wal file does not exist, claim that it does anyway,
  **      causing SQLite to call xOpen() to open it. This call will also
  **      be intercepted (see the rbuVfsOpen() function) and the *-oal
  **      file opened instead.
  */
  if( rc==SQLITE_OK && flags==SQLITE_ACCESS_EXISTS ){
    rbu_file *pDb = rbuFindMaindb(pRbuVfs, zPath, 1);
    if( pDb && pDb->pRbu->eStage==RBU_STAGE_OAL ){
      assert( pDb->pRbu );
      if( *pResOut ){
        rc = SQLITE_CANTOPEN;
      }else{
        sqlite3_int64 sz = 0;
        rc = rbuVfsFileSize(&pDb->base, &sz);
        *pResOut = (sz>0);
      }
    }
  }

  return rc;
}

/*
** Populate buffer zOut with the full canonical pathname corresponding
** to the pathname in zPath. zOut is guaranteed to point to a buffer
** of at least (DEVSYM_MAX_PATHNAME+1) bytes.
*/
static int rbuVfsFullPathname(
  sqlite3_vfs *pVfs, 
  const char *zPath, 
  int nOut, 
  char *zOut
){
  sqlite3_vfs *pRealVfs = ((rbu_vfs*)pVfs)->pRealVfs;
  return pRealVfs->xFullPathname(pRealVfs, zPath, nOut, zOut);
}

#ifndef SQLITE_OMIT_LOAD_EXTENSION
/*
** Open the dynamic library located at zPath and return a handle.
*/
static void *rbuVfsDlOpen(sqlite3_vfs *pVfs, const char *zPath){
  sqlite3_vfs *pRealVfs = ((rbu_vfs*)pVfs)->pRealVfs;
  return pRealVfs->xDlOpen(pRealVfs, zPath);
}

/*
** Populate the buffer zErrMsg (size nByte bytes) with a human readable
** utf-8 string describing the most recent error encountered associated 
** with dynamic libraries.
*/
static void rbuVfsDlError(sqlite3_vfs *pVfs, int nByte, char *zErrMsg){
  sqlite3_vfs *pRealVfs = ((rbu_vfs*)pVfs)->pRealVfs;
  pRealVfs->xDlError(pRealVfs, nByte, zErrMsg);
}

/*
** Return a pointer to the symbol zSymbol in the dynamic library pHandle.
*/
static void (*rbuVfsDlSym(
  sqlite3_vfs *pVfs, 
  void *pArg, 
  const char *zSym
))(void){
  sqlite3_vfs *pRealVfs = ((rbu_vfs*)pVfs)->pRealVfs;
  return pRealVfs->xDlSym(pRealVfs, pArg, zSym);
}

/*
** Close the dynamic library handle pHandle.
*/
static void rbuVfsDlClose(sqlite3_vfs *pVfs, void *pHandle){
  sqlite3_vfs *pRealVfs = ((rbu_vfs*)pVfs)->pRealVfs;
  pRealVfs->xDlClose(pRealVfs, pHandle);
}
#endif /* SQLITE_OMIT_LOAD_EXTENSION */

/*
** Populate the buffer pointed to by zBufOut with nByte bytes of 
** random data.
*/
static int rbuVfsRandomness(sqlite3_vfs *pVfs, int nByte, char *zBufOut){
  sqlite3_vfs *pRealVfs = ((rbu_vfs*)pVfs)->pRealVfs;
  return pRealVfs->xRandomness(pRealVfs, nByte, zBufOut);
}

/*
** Sleep for nMicro microseconds. Return the number of microseconds 
** actually slept.
*/
static int rbuVfsSleep(sqlite3_vfs *pVfs, int nMicro){
  sqlite3_vfs *pRealVfs = ((rbu_vfs*)pVfs)->pRealVfs;
  return pRealVfs->xSleep(pRealVfs, nMicro);
}

/*
** Return the current time as a Julian Day number in *pTimeOut.
*/
static int rbuVfsCurrentTime(sqlite3_vfs *pVfs, double *pTimeOut){
  sqlite3_vfs *pRealVfs = ((rbu_vfs*)pVfs)->pRealVfs;
  return pRealVfs->xCurrentTime(pRealVfs, pTimeOut);
}

/*
** No-op.
*/
static int rbuVfsGetLastError(sqlite3_vfs *pVfs, int a, char *b){
  return 0;
}

/*
** Deregister and destroy an RBU vfs created by an earlier call to
** sqlite3rbu_create_vfs().
*/
void sqlite3rbu_destroy_vfs(const char *zName){
  sqlite3_vfs *pVfs = sqlite3_vfs_find(zName);
  if( pVfs && pVfs->xOpen==rbuVfsOpen ){
    sqlite3_mutex_free(((rbu_vfs*)pVfs)->mutex);
    sqlite3_vfs_unregister(pVfs);
    sqlite3_free(pVfs);
  }
}

/*
** Create an RBU VFS named zName that accesses the underlying file-system
** via existing VFS zParent. The new object is registered as a non-default
** VFS with SQLite before returning.
*/
int sqlite3rbu_create_vfs(const char *zName, const char *zParent){

  /* Template for VFS */
  static sqlite3_vfs vfs_template = {
    1,                            /* iVersion */
    0,                            /* szOsFile */
    0,                            /* mxPathname */
    0,                            /* pNext */
    0,                            /* zName */
    0,                            /* pAppData */
    rbuVfsOpen,                   /* xOpen */
    rbuVfsDelete,                 /* xDelete */
    rbuVfsAccess,                 /* xAccess */
    rbuVfsFullPathname,           /* xFullPathname */

#ifndef SQLITE_OMIT_LOAD_EXTENSION
    rbuVfsDlOpen,                 /* xDlOpen */
    rbuVfsDlError,                /* xDlError */
    rbuVfsDlSym,                  /* xDlSym */
    rbuVfsDlClose,                /* xDlClose */
#else
    0, 0, 0, 0,
#endif

    rbuVfsRandomness,             /* xRandomness */
    rbuVfsSleep,                  /* xSleep */
    rbuVfsCurrentTime,            /* xCurrentTime */
    rbuVfsGetLastError,           /* xGetLastError */
    0,                            /* xCurrentTimeInt64 (version 2) */
    0, 0, 0                       /* Unimplemented version 3 methods */
  };

  rbu_vfs *pNew = 0;              /* Newly allocated VFS */
  int rc = SQLITE_OK;
  size_t nName;
  size_t nByte;

  nName = strlen(zName);
  nByte = sizeof(rbu_vfs) + nName + 1;
  pNew = (rbu_vfs*)sqlite3_malloc64(nByte);
  if( pNew==0 ){
    rc = SQLITE_NOMEM;
  }else{
    sqlite3_vfs *pParent;           /* Parent VFS */
    memset(pNew, 0, nByte);
    pParent = sqlite3_vfs_find(zParent);
    if( pParent==0 ){
      rc = SQLITE_NOTFOUND;
    }else{
      char *zSpace;
      memcpy(&pNew->base, &vfs_template, sizeof(sqlite3_vfs));
      pNew->base.mxPathname = pParent->mxPathname;
      pNew->base.szOsFile = sizeof(rbu_file) + pParent->szOsFile;
      pNew->pRealVfs = pParent;
      pNew->base.zName = (const char*)(zSpace = (char*)&pNew[1]);
      memcpy(zSpace, zName, nName);

      /* Allocate the mutex and register the new VFS (not as the default) */
      pNew->mutex = sqlite3_mutex_alloc(SQLITE_MUTEX_RECURSIVE);
      if( pNew->mutex==0 ){
        rc = SQLITE_NOMEM;
      }else{
        rc = sqlite3_vfs_register(&pNew->base, 0);
      }
    }

    if( rc!=SQLITE_OK ){
      sqlite3_mutex_free(pNew->mutex);
      sqlite3_free(pNew);
    }
  }

  return rc;
}

/*
** Configure the aggregate temp file size limit for this RBU handle.
*/
sqlite3_int64 sqlite3rbu_temp_size_limit(sqlite3rbu *pRbu, sqlite3_int64 n){
  if( n>=0 ){
    pRbu->szTempLimit = n;
  }
  return pRbu->szTempLimit;
}

sqlite3_int64 sqlite3rbu_temp_size(sqlite3rbu *pRbu){
  return pRbu->szTemp;
}


/**************************************************************************/

#endif /* !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_RBU) */
