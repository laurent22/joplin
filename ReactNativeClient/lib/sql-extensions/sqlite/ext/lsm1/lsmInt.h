/*
** 2011-08-18
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** Internal structure definitions for the LSM module.
*/
#ifndef _LSM_INT_H
#define _LSM_INT_H

#include "lsm.h"
#include <assert.h>
#include <string.h>

#include <stdarg.h>
#include <stdlib.h>
#include <stdio.h>
#include <ctype.h>

#ifdef _WIN32
# ifdef _MSC_VER
#  define snprintf _snprintf
# endif
#else
# include <unistd.h>
#endif

#ifdef NDEBUG
# ifdef LSM_DEBUG_EXPENSIVE
#  undef LSM_DEBUG_EXPENSIVE
# endif
# ifdef LSM_DEBUG
#  undef LSM_DEBUG
# endif
#else
# ifndef LSM_DEBUG
#  define LSM_DEBUG
# endif
#endif

/*
** Default values for various data structure parameters. These may be
** overridden by calls to lsm_config().
*/
#define LSM_DFLT_PAGE_SIZE          (4 * 1024)
#define LSM_DFLT_BLOCK_SIZE         (1 * 1024 * 1024)
#define LSM_DFLT_AUTOFLUSH          (1 * 1024 * 1024)
#define LSM_DFLT_AUTOCHECKPOINT     (i64)(2 * 1024 * 1024)
#define LSM_DFLT_AUTOWORK           1
#define LSM_DFLT_LOG_SIZE           (128*1024)
#define LSM_DFLT_AUTOMERGE          4
#define LSM_DFLT_SAFETY             LSM_SAFETY_NORMAL
#define LSM_DFLT_MMAP               (LSM_IS_64_BIT ? 1 : 32768)
#define LSM_DFLT_MULTIPLE_PROCESSES 1
#define LSM_DFLT_USE_LOG            1

/* Initial values for log file checksums. These are only used if the 
** database file does not contain a valid checkpoint.  */
#define LSM_CKSUM0_INIT 42
#define LSM_CKSUM1_INIT 42

/* "mmap" mode is currently only used in environments with 64-bit address 
** spaces. The following macro is used to test for this.  */
#define LSM_IS_64_BIT (sizeof(void*)==8)

#define LSM_AUTOWORK_QUANT 32

typedef struct Database Database;
typedef struct DbLog DbLog;
typedef struct FileSystem FileSystem;
typedef struct Freelist Freelist;
typedef struct FreelistEntry FreelistEntry;
typedef struct Level Level;
typedef struct LogMark LogMark;
typedef struct LogRegion LogRegion;
typedef struct LogWriter LogWriter;
typedef struct LsmString LsmString;
typedef struct Mempool Mempool;
typedef struct Merge Merge;
typedef struct MergeInput MergeInput;
typedef struct MetaPage MetaPage;
typedef struct MultiCursor MultiCursor;
typedef struct Page Page;
typedef struct Redirect Redirect;
typedef struct Segment Segment;
typedef struct SegmentMerger SegmentMerger;
typedef struct ShmChunk ShmChunk;
typedef struct ShmHeader ShmHeader;
typedef struct ShmReader ShmReader;
typedef struct Snapshot Snapshot;
typedef struct TransMark TransMark;
typedef struct Tree Tree;
typedef struct TreeCursor TreeCursor;
typedef struct TreeHeader TreeHeader;
typedef struct TreeMark TreeMark;
typedef struct TreeRoot TreeRoot;

#ifndef _SQLITEINT_H_
typedef unsigned char u8;
typedef unsigned short int u16;
typedef unsigned int u32;
typedef lsm_i64 i64;
typedef unsigned long long int u64;
#endif

/* A page number is a 64-bit integer. */
typedef i64 LsmPgno;

#ifdef LSM_DEBUG
int lsmErrorBkpt(int);
#else
# define lsmErrorBkpt(x) (x)
#endif

#define LSM_PROTOCOL_BKPT lsmErrorBkpt(LSM_PROTOCOL)
#define LSM_IOERR_BKPT    lsmErrorBkpt(LSM_IOERR)
#define LSM_NOMEM_BKPT    lsmErrorBkpt(LSM_NOMEM)
#define LSM_CORRUPT_BKPT  lsmErrorBkpt(LSM_CORRUPT)
#define LSM_MISUSE_BKPT   lsmErrorBkpt(LSM_MISUSE)

#define unused_parameter(x) (void)(x)
#define array_size(x) (sizeof(x)/sizeof(x[0]))


/* The size of each shared-memory chunk */
#define LSM_SHM_CHUNK_SIZE (32*1024)

/* The number of bytes reserved at the start of each shm chunk for MM. */
#define LSM_SHM_CHUNK_HDR  (sizeof(ShmChunk))

/* The number of available read locks. */
#define LSM_LOCK_NREADER   6

/* The number of available read-write client locks. */
#define LSM_LOCK_NRWCLIENT   16

/* Lock definitions. 
*/
#define LSM_LOCK_DMS1         1   /* Serialize connect/disconnect ops */
#define LSM_LOCK_DMS2         2   /* Read-write connections */
#define LSM_LOCK_DMS3         3   /* Read-only connections */
#define LSM_LOCK_WRITER       4
#define LSM_LOCK_WORKER       5
#define LSM_LOCK_CHECKPOINTER 6
#define LSM_LOCK_ROTRANS      7
#define LSM_LOCK_READER(i)    ((i) + LSM_LOCK_ROTRANS + 1)
#define LSM_LOCK_RWCLIENT(i)  ((i) + LSM_LOCK_READER(LSM_LOCK_NREADER))

#define LSM_N_LOCK LSM_LOCK_RWCLIENT(LSM_LOCK_NRWCLIENT)

/*
** Meta-page size and usable size.
*/
#define LSM_META_PAGE_SIZE 4096

#define LSM_META_RW_PAGE_SIZE (LSM_META_PAGE_SIZE - LSM_N_LOCK)

/*
** Hard limit on the number of free-list entries that may be stored in 
** a checkpoint (the remainder are stored as a system record in the LSM).
** See also LSM_CONFIG_MAX_FREELIST.
*/
#define LSM_MAX_FREELIST_ENTRIES 24

#define LSM_MAX_BLOCK_REDIRECTS 16

#define LSM_ATTEMPTS_BEFORE_PROTOCOL 10000


/*
** Each entry stored in the LSM (or in-memory tree structure) has an
** associated mask of the following flags.
*/
#define LSM_START_DELETE 0x01     /* Start of open-ended delete range */
#define LSM_END_DELETE   0x02     /* End of open-ended delete range */
#define LSM_POINT_DELETE 0x04     /* Delete this key */
#define LSM_INSERT       0x08     /* Insert this key and value */
#define LSM_SEPARATOR    0x10     /* True if entry is separator key only */
#define LSM_SYSTEMKEY    0x20     /* True if entry is a system key (FREELIST) */

#define LSM_CONTIGUOUS   0x40     /* Used in lsm_tree.c */

/*
** A string that can grow by appending.
*/
struct LsmString {
  lsm_env *pEnv;              /* Run-time environment */
  int n;                      /* Size of string.  -1 indicates error */
  int nAlloc;                 /* Space allocated for z[] */
  char *z;                    /* The string content */
};

typedef struct LsmFile LsmFile;
struct LsmFile {
  lsm_file *pFile;
  LsmFile *pNext;
};

/*
** An instance of the following type is used to store an ordered list of
** u32 values. 
**
** Note: This is a place-holder implementation. It should be replaced by
** a version that avoids making a single large allocation when the array
** contains a large number of values. For this reason, the internals of 
** this object should only manipulated by the intArrayXXX() functions in 
** lsm_tree.c.
*/
typedef struct IntArray IntArray;
struct IntArray {
  int nAlloc;
  int nArray;
  u32 *aArray;
};

struct Redirect {
  int n;                          /* Number of redirects */
  struct RedirectEntry {
    int iFrom;
    int iTo;
  } *a;
};

/*
** An instance of this structure represents a point in the history of the
** tree structure to roll back to. Refer to comments in lsm_tree.c for 
** details.
*/
struct TreeMark {
  u32 iRoot;                      /* Offset of root node in shm file */
  u32 nHeight;                    /* Current height of tree structure */
  u32 iWrite;                     /* Write offset in shm file */
  u32 nChunk;                     /* Number of chunks in shared-memory file */
  u32 iFirst;                     /* First chunk in linked list */
  u32 iNextShmid;                 /* Next id to allocate */
  int iRollback;                  /* Index in lsm->rollback to revert to */
};

/*
** An instance of this structure represents a point in the database log.
*/
struct LogMark {
  i64 iOff;                       /* Offset into log (see lsm_log.c) */
  int nBuf;                       /* Size of in-memory buffer here */
  u8 aBuf[8];                     /* Bytes of content in aBuf[] */
  u32 cksum0;                     /* Checksum 0 at offset (iOff-nBuf) */
  u32 cksum1;                     /* Checksum 1 at offset (iOff-nBuf) */
};

struct TransMark {
  TreeMark tree;
  LogMark log;
};

/*
** A structure that defines the start and end offsets of a region in the
** log file. The size of the region in bytes is (iEnd - iStart), so if
** iEnd==iStart the region is zero bytes in size.
*/
struct LogRegion {
  i64 iStart;                     /* Start of region in log file */
  i64 iEnd;                       /* End of region in log file */
};

struct DbLog {
  u32 cksum0;                     /* Checksum 0 at offset iOff */
  u32 cksum1;                     /* Checksum 1 at offset iOff */
  i64 iSnapshotId;                /* Log space has been reclaimed to this ss */
  LogRegion aRegion[3];           /* Log file regions (see docs in lsm_log.c) */
};

struct TreeRoot {
  u32 iRoot;
  u32 nHeight;
  u32 nByte;                      /* Total size of this tree in bytes */
  u32 iTransId;
};

/*
** Tree header structure. 
*/
struct TreeHeader {
  u32 iUsedShmid;                 /* Id of first shm chunk used by this tree */
  u32 iNextShmid;                 /* Shm-id of next chunk allocated */
  u32 iFirst;                     /* Chunk number of smallest shm-id */
  u32 nChunk;                     /* Number of chunks in shared-memory file */
  TreeRoot root;                  /* Root and height of current tree */
  u32 iWrite;                     /* Write offset in shm file */
  TreeRoot oldroot;               /* Root and height of the previous tree */
  u32 iOldShmid;                  /* Last shm-id used by previous tree */
  u32 iUsrVersion;                /* get/set_user_version() value */
  i64 iOldLog;                    /* Log offset associated with old tree */
  u32 oldcksum0;
  u32 oldcksum1;
  DbLog log;                      /* Current layout of log file */ 
  u32 aCksum[2];                  /* Checksums 1 and 2. */
};

/*
** Database handle structure.
**
** mLock:
**   A bitmask representing the locks currently held by the connection.
**   An LSM database supports N distinct locks, where N is some number less
**   than or equal to 32. Locks are numbered starting from 1 (see the 
**   definitions for LSM_LOCK_WRITER and co.).
**
**   The least significant 32-bits in mLock represent EXCLUSIVE locks. The
**   most significant are SHARED locks. So, if a connection holds a SHARED
**   lock on lock region iLock, then the following is true:
**
**       (mLock & ((iLock+32-1) << 1))
**
**   Or for an EXCLUSIVE lock:
**
**       (mLock & ((iLock-1) << 1))
** 
** pCsr:
**   Points to the head of a linked list that contains all currently open
**   cursors. Once this list becomes empty, the user has no outstanding
**   cursors and the database handle can be successfully closed.
**
** pCsrCache:
**   This list contains cursor objects that have been closed using
**   lsm_csr_close(). Each time a cursor is closed, it is shifted from 
**   the pCsr list to this list. When a new cursor is opened, this list
**   is inspected to see if there exists a cursor object that can be
**   reused. This is an optimization only.
*/
struct lsm_db {

  /* Database handle configuration */
  lsm_env *pEnv;                            /* runtime environment */
  int (*xCmp)(void *, int, void *, int);    /* Compare function */

  /* Values configured by calls to lsm_config */
  int eSafety;                    /* LSM_SAFETY_OFF, NORMAL or FULL */
  int bAutowork;                  /* Configured by LSM_CONFIG_AUTOWORK */
  int nTreeLimit;                 /* Configured by LSM_CONFIG_AUTOFLUSH */
  int nMerge;                     /* Configured by LSM_CONFIG_AUTOMERGE */
  int bUseLog;                    /* Configured by LSM_CONFIG_USE_LOG */
  int nDfltPgsz;                  /* Configured by LSM_CONFIG_PAGE_SIZE */
  int nDfltBlksz;                 /* Configured by LSM_CONFIG_BLOCK_SIZE */
  int nMaxFreelist;               /* Configured by LSM_CONFIG_MAX_FREELIST */
  int iMmap;                      /* Configured by LSM_CONFIG_MMAP */
  i64 nAutockpt;                  /* Configured by LSM_CONFIG_AUTOCHECKPOINT */
  int bMultiProc;                 /* Configured by L_C_MULTIPLE_PROCESSES */
  int bReadonly;                  /* Configured by LSM_CONFIG_READONLY */
  lsm_compress compress;          /* Compression callbacks */
  lsm_compress_factory factory;   /* Compression callback factory */

  /* Sub-system handles */
  FileSystem *pFS;                /* On-disk portion of database */
  Database *pDatabase;            /* Database shared data */

  int iRwclient;                  /* Read-write client lock held (-1 == none) */

  /* Client transaction context */
  Snapshot *pClient;              /* Client snapshot */
  int iReader;                    /* Read lock held (-1 == unlocked) */
  int bRoTrans;                   /* True if a read-only db trans is open */
  MultiCursor *pCsr;              /* List of all open cursors */
  LogWriter *pLogWriter;          /* Context for writing to the log file */
  int nTransOpen;                 /* Number of opened write transactions */
  int nTransAlloc;                /* Allocated size of aTrans[] array */
  TransMark *aTrans;              /* Array of marks for transaction rollback */
  IntArray rollback;              /* List of tree-nodes to roll back */
  int bDiscardOld;                /* True if lsmTreeDiscardOld() was called */

  MultiCursor *pCsrCache;         /* List of all closed cursors */

  /* Worker context */
  Snapshot *pWorker;              /* Worker snapshot (or NULL) */
  Freelist *pFreelist;            /* See sortedNewToplevel() */
  int bUseFreelist;               /* True to use pFreelist */
  int bIncrMerge;                 /* True if currently doing a merge */

  int bInFactory;                 /* True if within factory.xFactory() */

  /* Debugging message callback */
  void (*xLog)(void *, int, const char *);
  void *pLogCtx;

  /* Work done notification callback */
  void (*xWork)(lsm_db *, void *);
  void *pWorkCtx;

  u64 mLock;                      /* Mask of current locks. See lsmShmLock(). */
  lsm_db *pNext;                  /* Next connection to same database */

  int nShm;                       /* Size of apShm[] array */
  void **apShm;                   /* Shared memory chunks */
  ShmHeader *pShmhdr;             /* Live shared-memory header */
  TreeHeader treehdr;             /* Local copy of tree-header */
  u32 aSnapshot[LSM_META_PAGE_SIZE / sizeof(u32)];
};

struct Segment {
  LsmPgno iFirst;                  /* First page of this run */
  LsmPgno iLastPg;                 /* Last page of this run */
  LsmPgno iRoot;                   /* Root page number (if any) */
  int nSize;                       /* Size of this run in pages */

  Redirect *pRedirect;             /* Block redirects (or NULL) */
};

/*
** iSplitTopic/pSplitKey/nSplitKey:
**   If nRight>0, this buffer contains a copy of the largest key that has
**   already been written to the left-hand-side of the level.
*/
struct Level {
  Segment lhs;                    /* Left-hand (main) segment */
  int nRight;                     /* Size of apRight[] array */
  Segment *aRhs;                  /* Old segments being merged into this */
  int iSplitTopic;                /* Split key topic (if nRight>0) */
  void *pSplitKey;                /* Pointer to split-key (if nRight>0) */
  int nSplitKey;                  /* Number of bytes in split-key */

  u16 iAge;                       /* Number of times data has been written */
  u16 flags;                      /* Mask of LEVEL_XXX bits */
  Merge *pMerge;                  /* Merge operation currently underway */
  Level *pNext;                   /* Next level in tree */
};

/*
** The Level.flags field is set to a combination of the following bits.
**
** LEVEL_FREELIST_ONLY:
**   Set if the level consists entirely of free-list entries. 
**
** LEVEL_INCOMPLETE:
**   This is set while a new toplevel level is being constructed. It is
**   never set for any level other than a new toplevel.
*/
#define LEVEL_FREELIST_ONLY      0x0001
#define LEVEL_INCOMPLETE         0x0002


/*
** A structure describing an ongoing merge. There is an instance of this
** structure for every Level currently undergoing a merge in the worker
** snapshot.
**
** It is assumed that code that uses an instance of this structure has
** access to the associated Level struct.
**
** iOutputOff:
**   The byte offset to write to next within the last page of the 
**   output segment.
*/
struct MergeInput {
  LsmPgno iPg;                    /* Page on which next input is stored */
  int iCell;                      /* Cell containing next input to merge */
};
struct Merge {
  int nInput;                     /* Number of input runs being merged */
  MergeInput *aInput;             /* Array nInput entries in size */
  MergeInput splitkey;            /* Location in file of current splitkey */
  int nSkip;                      /* Number of separators entries to skip */
  int iOutputOff;                 /* Write offset on output page */
  LsmPgno iCurrentPtr;            /* Current pointer value */
};

/* 
** The first argument to this macro is a pointer to a Segment structure.
** Returns true if the structure instance indicates that the separators
** array is valid.
*/
#define segmentHasSeparators(pSegment) ((pSegment)->sep.iFirst>0)

/*
** The values that accompany the lock held by a database reader.
*/
struct ShmReader {
  u32 iTreeId;
  i64 iLsmId;
};

/*
** An instance of this structure is stored in the first shared-memory
** page. The shared-memory header.
**
** bWriter:
**   Immediately after opening a write transaction taking the WRITER lock, 
**   each writer client sets this flag. It is cleared right before the 
**   WRITER lock is relinquished. If a subsequent writer finds that this
**   flag is already set when a write transaction is opened, this indicates
**   that a previous writer failed mid-transaction.
**
** iMetaPage:
**   If the database file does not contain a valid, synced, checkpoint, this
**   value is set to 0. Otherwise, it is set to the meta-page number that
**   contains the most recently written checkpoint (either 1 or 2).
**
** hdr1, hdr2:
**   The two copies of the in-memory tree header. Two copies are required
**   in case a writer fails while updating one of them.
*/
struct ShmHeader {
  u32 aSnap1[LSM_META_PAGE_SIZE / 4];
  u32 aSnap2[LSM_META_PAGE_SIZE / 4];
  u32 bWriter;
  u32 iMetaPage;
  TreeHeader hdr1;
  TreeHeader hdr2;
  ShmReader aReader[LSM_LOCK_NREADER];
};

/*
** An instance of this structure is stored at the start of each shared-memory
** chunk except the first (which is the header chunk - see above).
*/
struct ShmChunk {
  u32 iShmid;
  u32 iNext;
};

/*
** Maximum number of shared-memory chunks allowed in the *-shm file. Since
** each shared-memory chunk is 32KB in size, this is a theoretical limit only.
*/
#define LSM_MAX_SHMCHUNKS  (1<<30)

/* Return true if shm-sequence "a" is larger than or equal to "b" */
#define shm_sequence_ge(a, b) (((u32)a-(u32)b) < LSM_MAX_SHMCHUNKS)

#define LSM_APPLIST_SZ 4

/*
** An instance of the following structure stores the in-memory part of
** the current free block list. This structure is to the free block list
** as the in-memory tree is to the users database content. The contents 
** of the free block list is found by merging the in-memory components 
** with those stored in the LSM, just as the contents of the database is
** found by merging the in-memory tree with the user data entries in the
** LSM.
**
** Each FreelistEntry structure in the array represents either an insert
** or delete operation on the free-list. For deletes, the FreelistEntry.iId
** field is set to -1. For inserts, it is set to zero or greater. 
**
** The array of FreelistEntry structures is always sorted in order of
** block number (ascending).
**
** When the in-memory free block list is written into the LSM, each insert
** operation is written separately. The entry key is the bitwise inverse
** of the block number as a 32-bit big-endian integer. This is done so that
** the entries in the LSM are sorted in descending order of block id. 
** The associated value is the snapshot id, formated as a varint.
*/
struct Freelist {
  FreelistEntry *aEntry;          /* Free list entries */
  int nEntry;                     /* Number of valid slots in aEntry[] */
  int nAlloc;                     /* Allocated size of aEntry[] */
};
struct FreelistEntry {
  u32 iBlk;                       /* Block number */
  i64 iId;                        /* Largest snapshot id to use this block */
};

/*
** A snapshot of a database. A snapshot contains all the information required
** to read or write a database file on disk. See the description of struct
** Database below for futher details.
*/
struct Snapshot {
  Database *pDatabase;            /* Database this snapshot belongs to */
  u32 iCmpId;                     /* Id of compression scheme */
  Level *pLevel;                  /* Pointer to level 0 of snapshot (or NULL) */
  i64 iId;                        /* Snapshot id */
  i64 iLogOff;                    /* Log file offset */
  Redirect redirect;              /* Block redirection array */

  /* Used by worker snapshots only */
  int nBlock;                        /* Number of blocks in database file */
  LsmPgno aiAppend[LSM_APPLIST_SZ];  /* Append point list */
  Freelist freelist;                 /* Free block list */
  u32 nWrite;                        /* Total number of pages written to disk */
};
#define LSM_INITIAL_SNAPSHOT_ID 11

/*
** Functions from file "lsm_ckpt.c".
*/
int lsmCheckpointWrite(lsm_db *, u32 *);
int lsmCheckpointLevels(lsm_db *, int, void **, int *);
int lsmCheckpointLoadLevels(lsm_db *pDb, void *pVal, int nVal);

int lsmCheckpointRecover(lsm_db *);
int lsmCheckpointDeserialize(lsm_db *, int, u32 *, Snapshot **);

int lsmCheckpointLoadWorker(lsm_db *pDb);
int lsmCheckpointStore(lsm_db *pDb, int);

int lsmCheckpointLoad(lsm_db *pDb, int *);
int lsmCheckpointLoadOk(lsm_db *pDb, int);
int lsmCheckpointClientCacheOk(lsm_db *);

u32 lsmCheckpointNBlock(u32 *);
i64 lsmCheckpointId(u32 *, int);
u32 lsmCheckpointNWrite(u32 *, int);
i64 lsmCheckpointLogOffset(u32 *);
int lsmCheckpointPgsz(u32 *);
int lsmCheckpointBlksz(u32 *);
void lsmCheckpointLogoffset(u32 *aCkpt, DbLog *pLog);
void lsmCheckpointZeroLogoffset(lsm_db *);

int lsmCheckpointSaveWorker(lsm_db *pDb, int);
int lsmDatabaseFull(lsm_db *pDb);
int lsmCheckpointSynced(lsm_db *pDb, i64 *piId, i64 *piLog, u32 *pnWrite);

int lsmCheckpointSize(lsm_db *db, int *pnByte);

int lsmInfoCompressionId(lsm_db *db, u32 *piCmpId);

/* 
** Functions from file "lsm_tree.c".
*/
int lsmTreeNew(lsm_env *, int (*)(void *, int, void *, int), Tree **ppTree);
void lsmTreeRelease(lsm_env *, Tree *);
int lsmTreeInit(lsm_db *);
int lsmTreeRepair(lsm_db *);

void lsmTreeMakeOld(lsm_db *pDb);
void lsmTreeDiscardOld(lsm_db *pDb);
int lsmTreeHasOld(lsm_db *pDb);

int lsmTreeSize(lsm_db *);
int lsmTreeEndTransaction(lsm_db *pDb, int bCommit);
int lsmTreeLoadHeader(lsm_db *pDb, int *);
int lsmTreeLoadHeaderOk(lsm_db *, int);

int lsmTreeInsert(lsm_db *pDb, void *pKey, int nKey, void *pVal, int nVal);
int lsmTreeDelete(lsm_db *db, void *pKey1, int nKey1, void *pKey2, int nKey2);
void lsmTreeRollback(lsm_db *pDb, TreeMark *pMark);
void lsmTreeMark(lsm_db *pDb, TreeMark *pMark);

int lsmTreeCursorNew(lsm_db *pDb, int, TreeCursor **);
void lsmTreeCursorDestroy(TreeCursor *);

int lsmTreeCursorSeek(TreeCursor *pCsr, void *pKey, int nKey, int *pRes);
int lsmTreeCursorNext(TreeCursor *pCsr);
int lsmTreeCursorPrev(TreeCursor *pCsr);
int lsmTreeCursorEnd(TreeCursor *pCsr, int bLast);
void lsmTreeCursorReset(TreeCursor *pCsr);
int lsmTreeCursorKey(TreeCursor *pCsr, int *pFlags, void **ppKey, int *pnKey);
int lsmTreeCursorFlags(TreeCursor *pCsr);
int lsmTreeCursorValue(TreeCursor *pCsr, void **ppVal, int *pnVal);
int lsmTreeCursorValid(TreeCursor *pCsr);
int lsmTreeCursorSave(TreeCursor *pCsr);

void lsmFlagsToString(int flags, char *zFlags);

/* 
** Functions from file "mem.c".
*/
void *lsmMalloc(lsm_env*, size_t);
void lsmFree(lsm_env*, void *);
void *lsmRealloc(lsm_env*, void *, size_t);
void *lsmReallocOrFree(lsm_env*, void *, size_t);
void *lsmReallocOrFreeRc(lsm_env *, void *, size_t, int *);

void *lsmMallocZeroRc(lsm_env*, size_t, int *);
void *lsmMallocRc(lsm_env*, size_t, int *);

void *lsmMallocZero(lsm_env *pEnv, size_t);
char *lsmMallocStrdup(lsm_env *pEnv, const char *);

/* 
** Functions from file "lsm_mutex.c".
*/
int lsmMutexStatic(lsm_env*, int, lsm_mutex **);
int lsmMutexNew(lsm_env*, lsm_mutex **);
void lsmMutexDel(lsm_env*, lsm_mutex *);
void lsmMutexEnter(lsm_env*, lsm_mutex *);
int lsmMutexTry(lsm_env*, lsm_mutex *);
void lsmMutexLeave(lsm_env*, lsm_mutex *);

#ifndef NDEBUG
int lsmMutexHeld(lsm_env *, lsm_mutex *);
int lsmMutexNotHeld(lsm_env *, lsm_mutex *);
#endif

/**************************************************************************
** Start of functions from "lsm_file.c".
*/
int lsmFsOpen(lsm_db *, const char *, int);
int lsmFsOpenLog(lsm_db *, int *);
void lsmFsCloseLog(lsm_db *);
void lsmFsClose(FileSystem *);

int lsmFsUnmap(FileSystem *);

int lsmFsConfigure(lsm_db *db);

int lsmFsBlockSize(FileSystem *);
void lsmFsSetBlockSize(FileSystem *, int);
int lsmFsMoveBlock(FileSystem *pFS, Segment *pSeg, int iTo, int iFrom);

int lsmFsPageSize(FileSystem *);
void lsmFsSetPageSize(FileSystem *, int);

int lsmFsFileid(lsm_db *pDb, void **ppId, int *pnId);

/* Creating, populating, gobbling and deleting sorted runs. */
void lsmFsGobble(lsm_db *, Segment *, LsmPgno *, int);
int lsmFsSortedDelete(FileSystem *, Snapshot *, int, Segment *);
int lsmFsSortedFinish(FileSystem *, Segment *);
int lsmFsSortedAppend(FileSystem *, Snapshot *, Level *, int, Page **);
int lsmFsSortedPadding(FileSystem *, Snapshot *, Segment *);

/* Functions to retrieve the lsm_env pointer from a FileSystem or Page object */
lsm_env *lsmFsEnv(FileSystem *);
lsm_env *lsmPageEnv(Page *);
FileSystem *lsmPageFS(Page *);

int lsmFsSectorSize(FileSystem *);

void lsmSortedSplitkey(lsm_db *, Level *, int *);

/* Reading sorted run content. */
int lsmFsDbPageLast(FileSystem *pFS, Segment *pSeg, Page **ppPg);
int lsmFsDbPageGet(FileSystem *, Segment *, LsmPgno, Page **);
int lsmFsDbPageNext(Segment *, Page *, int eDir, Page **);

u8 *lsmFsPageData(Page *, int *);
int lsmFsPageRelease(Page *);
int lsmFsPagePersist(Page *);
void lsmFsPageRef(Page *);
LsmPgno lsmFsPageNumber(Page *);

int lsmFsNRead(FileSystem *);
int lsmFsNWrite(FileSystem *);

int lsmFsMetaPageGet(FileSystem *, int, int, MetaPage **);
int lsmFsMetaPageRelease(MetaPage *);
u8 *lsmFsMetaPageData(MetaPage *, int *);

#ifdef LSM_DEBUG
int lsmFsDbPageIsLast(Segment *pSeg, Page *pPg);
int lsmFsIntegrityCheck(lsm_db *);
#endif

LsmPgno lsmFsRedirectPage(FileSystem *, Redirect *, LsmPgno);

int lsmFsPageWritable(Page *);

/* Functions to read, write and sync the log file. */
int lsmFsWriteLog(FileSystem *pFS, i64 iOff, LsmString *pStr);
int lsmFsSyncLog(FileSystem *pFS);
int lsmFsReadLog(FileSystem *pFS, i64 iOff, int nRead, LsmString *pStr);
int lsmFsTruncateLog(FileSystem *pFS, i64 nByte);
int lsmFsTruncateDb(FileSystem *pFS, i64 nByte);
int lsmFsCloseAndDeleteLog(FileSystem *pFS);

LsmFile *lsmFsDeferClose(FileSystem *pFS);

/* And to sync the db file */
int lsmFsSyncDb(FileSystem *, int);

void lsmFsFlushWaiting(FileSystem *, int *);

/* Used by lsm_info(ARRAY_STRUCTURE) and lsm_config(MMAP) */
int lsmInfoArrayStructure(lsm_db *pDb, int bBlock, LsmPgno iFirst, char **pz);
int lsmInfoArrayPages(lsm_db *pDb, LsmPgno iFirst, char **pzOut);
int lsmConfigMmap(lsm_db *pDb, int *piParam);

int lsmEnvOpen(lsm_env *, const char *, int, lsm_file **);
int lsmEnvClose(lsm_env *pEnv, lsm_file *pFile);
int lsmEnvLock(lsm_env *pEnv, lsm_file *pFile, int iLock, int eLock);
int lsmEnvTestLock(lsm_env *pEnv, lsm_file *pFile, int iLock, int nLock, int);

int lsmEnvShmMap(lsm_env *, lsm_file *, int, int, void **); 
void lsmEnvShmBarrier(lsm_env *);
void lsmEnvShmUnmap(lsm_env *, lsm_file *, int);

void lsmEnvSleep(lsm_env *, int);

int lsmFsReadSyncedId(lsm_db *db, int, i64 *piVal);

int lsmFsSegmentContainsPg(FileSystem *pFS, Segment *, LsmPgno, int *);

void lsmFsPurgeCache(FileSystem *);

/*
** End of functions from "lsm_file.c".
**************************************************************************/

/* 
** Functions from file "lsm_sorted.c".
*/
int lsmInfoPageDump(lsm_db *, LsmPgno, int, char **);
void lsmSortedCleanup(lsm_db *);
int lsmSortedAutoWork(lsm_db *, int nUnit);

int lsmSortedWalkFreelist(lsm_db *, int, int (*)(void *, int, i64), void *);

int lsmSaveWorker(lsm_db *, int);

int lsmFlushTreeToDisk(lsm_db *pDb);

void lsmSortedRemap(lsm_db *pDb);

void lsmSortedFreeLevel(lsm_env *pEnv, Level *);

int lsmSortedAdvanceAll(lsm_db *pDb);

int lsmSortedLoadMerge(lsm_db *, Level *, u32 *, int *);
int lsmSortedLoadFreelist(lsm_db *pDb, void **, int *);

void *lsmSortedSplitKey(Level *pLevel, int *pnByte);

void lsmSortedSaveTreeCursors(lsm_db *);

int lsmMCursorNew(lsm_db *, MultiCursor **);
void lsmMCursorClose(MultiCursor *, int);
int lsmMCursorSeek(MultiCursor *, int, void *, int , int);
int lsmMCursorFirst(MultiCursor *);
int lsmMCursorPrev(MultiCursor *);
int lsmMCursorLast(MultiCursor *);
int lsmMCursorValid(MultiCursor *);
int lsmMCursorNext(MultiCursor *);
int lsmMCursorKey(MultiCursor *, void **, int *);
int lsmMCursorValue(MultiCursor *, void **, int *);
int lsmMCursorType(MultiCursor *, int *);
lsm_db *lsmMCursorDb(MultiCursor *);
void lsmMCursorFreeCache(lsm_db *);

int lsmSaveCursors(lsm_db *pDb);
int lsmRestoreCursors(lsm_db *pDb);

void lsmSortedDumpStructure(lsm_db *pDb, Snapshot *, int, int, const char *);
void lsmFsDumpBlocklists(lsm_db *);

void lsmSortedExpandBtreePage(Page *pPg, int nOrig);

void lsmPutU32(u8 *, u32);
u32 lsmGetU32(u8 *);
u64 lsmGetU64(u8 *);

/*
** Functions from "lsm_varint.c".
*/
int lsmVarintPut32(u8 *, int);
int lsmVarintGet32(u8 *, int *);
int lsmVarintPut64(u8 *aData, i64 iVal);
int lsmVarintGet64(const u8 *aData, i64 *piVal);

int lsmVarintLen32(int);
int lsmVarintSize(u8 c);

/* 
** Functions from file "main.c".
*/
void lsmLogMessage(lsm_db *, int, const char *, ...);
int lsmInfoFreelist(lsm_db *pDb, char **pzOut);

/*
** Functions from file "lsm_log.c".
*/
int lsmLogBegin(lsm_db *pDb);
int lsmLogWrite(lsm_db *, int, void *, int, void *, int);
int lsmLogCommit(lsm_db *);
void lsmLogEnd(lsm_db *pDb, int bCommit);
void lsmLogTell(lsm_db *, LogMark *);
void lsmLogSeek(lsm_db *, LogMark *);
void lsmLogClose(lsm_db *);

int lsmLogRecover(lsm_db *);
int lsmInfoLogStructure(lsm_db *pDb, char **pzVal);

/* Valid values for the second argument to lsmLogWrite(). */
#define LSM_WRITE        0x06
#define LSM_DELETE       0x08
#define LSM_DRANGE       0x0A

/**************************************************************************
** Functions from file "lsm_shared.c".
*/

int lsmDbDatabaseConnect(lsm_db*, const char *);
void lsmDbDatabaseRelease(lsm_db *);

int lsmBeginReadTrans(lsm_db *);
int lsmBeginWriteTrans(lsm_db *);
int lsmBeginFlush(lsm_db *);

int lsmDetectRoTrans(lsm_db *db, int *);
int lsmBeginRoTrans(lsm_db *db);

int lsmBeginWork(lsm_db *);
void lsmFinishWork(lsm_db *, int, int *);

int lsmFinishRecovery(lsm_db *);
void lsmFinishReadTrans(lsm_db *);
int lsmFinishWriteTrans(lsm_db *, int);
int lsmFinishFlush(lsm_db *, int);

int lsmSnapshotSetFreelist(lsm_db *, int *, int);

Snapshot *lsmDbSnapshotClient(lsm_db *);
Snapshot *lsmDbSnapshotWorker(lsm_db *);

void lsmSnapshotSetCkptid(Snapshot *, i64);

Level *lsmDbSnapshotLevel(Snapshot *);
void lsmDbSnapshotSetLevel(Snapshot *, Level *);

void lsmDbRecoveryComplete(lsm_db *, int);

int lsmBlockAllocate(lsm_db *, int, int *);
int lsmBlockFree(lsm_db *, int);
int lsmBlockRefree(lsm_db *, int);

void lsmFreelistDeltaBegin(lsm_db *);
void lsmFreelistDeltaEnd(lsm_db *);
int lsmFreelistDelta(lsm_db *pDb);

DbLog *lsmDatabaseLog(lsm_db *pDb);

#ifdef LSM_DEBUG
  int lsmHoldingClientMutex(lsm_db *pDb);
  int lsmShmAssertLock(lsm_db *db, int iLock, int eOp);
  int lsmShmAssertWorker(lsm_db *db);
#endif

void lsmFreeSnapshot(lsm_env *, Snapshot *);


/* Candidate values for the 3rd argument to lsmShmLock() */
#define LSM_LOCK_UNLOCK 0
#define LSM_LOCK_SHARED 1
#define LSM_LOCK_EXCL   2

int lsmShmCacheChunks(lsm_db *db, int nChunk);
int lsmShmLock(lsm_db *db, int iLock, int eOp, int bBlock);
int lsmShmTestLock(lsm_db *db, int iLock, int nLock, int eOp);
void lsmShmBarrier(lsm_db *db);

#ifdef LSM_DEBUG
void lsmShmHasLock(lsm_db *db, int iLock, int eOp);
#else
# define lsmShmHasLock(x,y,z)
#endif

int lsmReadlock(lsm_db *, i64 iLsm, u32 iShmMin, u32 iShmMax);

int lsmLsmInUse(lsm_db *db, i64 iLsmId, int *pbInUse);
int lsmTreeInUse(lsm_db *db, u32 iLsmId, int *pbInUse);
int lsmFreelistAppend(lsm_env *pEnv, Freelist *p, int iBlk, i64 iId);

int lsmDbMultiProc(lsm_db *);
void lsmDbDeferredClose(lsm_db *, lsm_file *, LsmFile *);
LsmFile *lsmDbRecycleFd(lsm_db *);

int lsmWalkFreelist(lsm_db *, int, int (*)(void *, int, i64), void *);

int lsmCheckCompressionId(lsm_db *, u32);


/**************************************************************************
** functions in lsm_str.c
*/
void lsmStringInit(LsmString*, lsm_env *pEnv);
int lsmStringExtend(LsmString*, int);
int lsmStringAppend(LsmString*, const char *, int);
void lsmStringVAppendf(LsmString*, const char *zFormat, va_list, va_list);
void lsmStringAppendf(LsmString*, const char *zFormat, ...);
void lsmStringClear(LsmString*);
char *lsmMallocPrintf(lsm_env*, const char*, ...);
int lsmStringBinAppend(LsmString *pStr, const u8 *a, int n);

int lsmStrlen(const char *zName);



/* 
** Round up a number to the next larger multiple of 8.  This is used
** to force 8-byte alignment on 64-bit architectures.
*/
#define ROUND8(x)     (((x)+7)&~7)

#define LSM_MIN(x,y) ((x)>(y) ? (y) : (x))
#define LSM_MAX(x,y) ((x)>(y) ? (x) : (y))

#endif
