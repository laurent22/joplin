/*
** 2011-08-26
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
** NORMAL DATABASE FILE FORMAT
**
** The following database file format concepts are used by the code in
** this file to read and write the database file.
**
** Pages:
**
**   A database file is divided into pages. The first 8KB of the file consists
**   of two 4KB meta-pages. The meta-page size is not configurable. The 
**   remainder of the file is made up of database pages. The default database
**   page size is 4KB. Database pages are aligned to page-size boundaries,
**   so if the database page size is larger than 8KB there is a gap between
**   the end of the meta pages and the start of the database pages.
**
**   Database pages are numbered based on their position in the file. Page N
**   begins at byte offset ((N-1)*pgsz). This means that page 1 does not 
**   exist - since it would always overlap with the meta pages. If the 
**   page-size is (say) 512 bytes, then the first usable page in the database
**   is page 33.
**
**   It is assumed that the first two meta pages and the data that follows
**   them are located on different disk sectors. So that if a power failure 
**   while writing to a meta page there is no risk of damage to the other
**   meta page or any other part of the database file. TODO: This may need
**   to be revisited.
**
** Blocks:
**
**   The database file is also divided into blocks. The default block size is
**   1MB. When writing to the database file, an attempt is made to write data
**   in contiguous block-sized chunks.
**
**   The first and last page on each block are special in that they are 4 
**   bytes smaller than all other pages. This is because the last four bytes 
**   of space on the first and last pages of each block are reserved for
**   pointers to other blocks (i.e. a 32-bit block number).
**
** Runs:
**
**   A run is a sequence of pages that the upper layer uses to store a 
**   sorted array of database keys (and accompanying data - values, FC 
**   pointers and so on). Given a page within a run, it is possible to
**   navigate to the next page in the run as follows:
**
**     a) if the current page is not the last in a block, the next page 
**        in the run is located immediately after the current page, OR
**
**     b) if the current page is the last page in a block, the next page 
**        in the run is the first page on the block identified by the
**        block pointer stored in the last 4 bytes of the current block.
**
**   It is possible to navigate to the previous page in a similar fashion,
**   using the block pointer embedded in the last 4 bytes of the first page
**   of each block as required.
**
**   The upper layer is responsible for identifying by page number the 
**   first and last page of any run that it needs to navigate - there are
**   no "end-of-run" markers stored or identified by this layer. This is
**   necessary as clients reading different database snapshots may access 
**   different subsets of a run.
**
** THE LOG FILE 
**
** This file opens and closes the log file. But it does not contain any
** logic related to the log file format. Instead, it exports the following
** functions that are used by the code in lsm_log.c to read and write the
** log file:
**
**     lsmFsOpenLog
**     lsmFsWriteLog
**     lsmFsSyncLog
**     lsmFsReadLog
**     lsmFsTruncateLog
**     lsmFsCloseAndDeleteLog
**
** COMPRESSED DATABASE FILE FORMAT
**
** The compressed database file format is very similar to the normal format.
** The file still begins with two 4KB meta-pages (which are never compressed).
** It is still divided into blocks.
**
** The first and last four bytes of each block are reserved for 32-bit 
** pointer values. Similar to the way four bytes are carved from the end of 
** the first and last page of each block in uncompressed databases. From
** the point of view of the upper layer, all pages are the same size - this
** is different from the uncompressed format where the first and last pages
** on each block are 4 bytes smaller than the others.
**
** Pages are stored in variable length compressed form, as follows:
**
**     * 3-byte size field containing the size of the compressed page image
**       in bytes. The most significant bit of each byte of the size field
**       is always set. The remaining 7 bits are used to store a 21-bit
**       integer value (in big-endian order - the first byte in the field
**       contains the most significant 7 bits). Since the maximum allowed 
**       size of a compressed page image is (2^17 - 1) bytes, there are
**       actually 4 unused bits in the size field.
**
**       In other words, if the size of the compressed page image is nSz,
**       the header can be serialized as follows:
**
**         u8 aHdr[3]
**         aHdr[0] = 0x80 | (u8)(nSz >> 14);
**         aHdr[1] = 0x80 | (u8)(nSz >>  7);
**         aHdr[2] = 0x80 | (u8)(nSz >>  0);
**
**     * Compressed page image.
**
**     * A second copy of the 3-byte record header.
**
** A page number is a byte offset into the database file. So the smallest
** possible page number is 8192 (immediately after the two meta-pages).
** The first and root page of a segment are identified by a page number
** corresponding to the byte offset of the first byte in the corresponding
** page record. The last page of a segment is identified by the byte offset
** of the last byte in its record.
**
** Unlike uncompressed pages, compressed page records may span blocks.
**
** Sometimes, in order to avoid touching sectors that contain synced data
** when writing, it is necessary to insert unused space between compressed
** page records. This can be done as follows:
**
**     * For less than 6 bytes of empty space, the first and last byte
**       of the free space contain the total number of free bytes. For
**       example:
**
**         Block of 4 free bytes: 0x04 0x?? 0x?? 0x04
**         Block of 2 free bytes: 0x02 0x02
**         A single free byte:    0x01
**
**     * For 6 or more bytes of empty space, a record similar to a 
**       compressed page record is added to the segment. A padding record
**       is distinguished from a compressed page record by the most 
**       significant bit of the second byte of the size field, which is
**       cleared instead of set. 
*/
#include "lsmInt.h"

#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>

/*
** File-system object. Each database connection allocates a single instance
** of the following structure. It is used for all access to the database and
** log files.
**
** The database file may be accessed via two methods - using mmap() or using
** read() and write() calls. In the general case both methods are used - a
** prefix of the file is mapped into memory and the remainder accessed using
** read() and write(). This is helpful when accessing very large files (or
** files that may grow very large during the lifetime of a database
** connection) on systems with 32-bit address spaces. However, it also requires
** that this object manage two distinct types of Page objects simultaneously -
** those that carry pointers to the mapped file and those that carry arrays
** populated by read() calls.
**
** pFree:
**   The head of a singly-linked list that containing currently unused Page 
**   structures suitable for use as mmap-page handles. Connected by the
**   Page.pFreeNext pointers.
**
** pMapped:
**   The head of a singly-linked list that contains all pages that currently
**   carry pointers to the mapped region. This is used if the region is
**   every remapped - the pointers carried by existing pages can be adjusted
**   to account for the remapping. Connected by the Page.pMappedNext pointers.
**
** pWaiting:
**   When the upper layer wishes to append a new b-tree page to a segment,
**   it allocates a Page object that carries a malloc'd block of memory -
**   regardless of the mmap-related configuration. The page is not assigned
**   a page number at first. When the upper layer has finished constructing
**   the page contents, it calls lsmFsPagePersist() to assign a page number
**   to it. At this point it is likely that N pages have been written to the
**   segment, the (N+1)th page is still outstanding and the b-tree page is
**   assigned page number (N+2). To avoid writing page (N+2) before page 
**   (N+1), the recently completed b-tree page is held in the singly linked
**   list headed by pWaiting until page (N+1) has been written. 
**
**   Function lsmFsFlushWaiting() is responsible for eventually writing 
**   waiting pages to disk.
**
** apHash/nHash:
**   Hash table used to store all Page objects that carry malloc'd arrays,
**   except those b-tree pages that have not yet been assigned page numbers.
**   Once they have been assigned page numbers - they are added to this
**   hash table.
**
**   Hash table overflow chains are connected using the Page.pHashNext
**   pointers.
**
** pLruFirst, pLruLast:
**   The first and last entries in a doubly-linked list of pages. This
**   list contains all pages with malloc'd data that are present in the
**   hash table and have a ref-count of zero.
*/
struct FileSystem {
  lsm_db *pDb;                    /* Database handle that owns this object */
  lsm_env *pEnv;                  /* Environment pointer */
  char *zDb;                      /* Database file name */
  char *zLog;                     /* Database file name */
  int nMetasize;                  /* Size of meta pages in bytes */
  int nMetaRwSize;                /* Read/written size of meta pages in bytes */
  int nPagesize;                  /* Database page-size in bytes */
  int nBlocksize;                 /* Database block-size in bytes */

  /* r/w file descriptors for both files. */
  LsmFile *pLsmFile;              /* Used after lsm_close() to link into list */
  lsm_file *fdDb;                 /* Database file */
  lsm_file *fdLog;                /* Log file */
  int szSector;                   /* Database file sector size */

  /* If this is a compressed database, a pointer to the compression methods.
  ** For an uncompressed database, a NULL pointer.  */
  lsm_compress *pCompress;
  u8 *aIBuffer;                   /* Buffer to compress to */
  u8 *aOBuffer;                   /* Buffer to uncompress from */
  int nBuffer;                    /* Allocated size of above buffers in bytes */

  /* mmap() page related things */
  i64 nMapLimit;                  /* Maximum bytes of file to map */
  void *pMap;                     /* Current mapping of database file */
  i64 nMap;                       /* Bytes mapped at pMap */
  Page *pFree;                    /* Unused Page structures */
  Page *pMapped;                  /* List of Page structs that point to pMap */

  /* Page cache parameters for non-mmap() pages */
  int nCacheMax;                  /* Configured cache size (in pages) */
  int nCacheAlloc;                /* Current cache size (in pages) */
  Page *pLruFirst;                /* Head of the LRU list */
  Page *pLruLast;                 /* Tail of the LRU list */
  int nHash;                      /* Number of hash slots in hash table */
  Page **apHash;                  /* nHash Hash slots */
  Page *pWaiting;                 /* b-tree pages waiting to be written */

  /* Statistics */
  int nOut;                       /* Number of outstanding pages */
  int nWrite;                     /* Total number of pages written */
  int nRead;                      /* Total number of pages read */
};

/*
** Database page handle.
**
** pSeg:
**   When lsmFsSortedAppend() is called on a compressed database, the new
**   page is not assigned a page number or location in the database file
**   immediately. Instead, these are assigned by the lsmFsPagePersist() call
**   right before it writes the compressed page image to disk.
**
**   The lsmFsSortedAppend() function sets the pSeg pointer to point to the
**   segment that the new page will be a part of. It is unset by
**   lsmFsPagePersist() after the page is written to disk.
*/
struct Page {
  u8 *aData;                      /* Buffer containing page data */
  int nData;                      /* Bytes of usable data at aData[] */
  LsmPgno iPg;                    /* Page number */
  int nRef;                       /* Number of outstanding references */
  int flags;                      /* Combination of PAGE_XXX flags */
  Page *pHashNext;                /* Next page in hash table slot */
  Page *pLruNext;                 /* Next page in LRU list */
  Page *pLruPrev;                 /* Previous page in LRU list */
  FileSystem *pFS;                /* File system that owns this page */

  /* Only used in compressed database mode: */
  int nCompress;                  /* Compressed size (or 0 for uncomp. db) */
  int nCompressPrev;              /* Compressed size of prev page */
  Segment *pSeg;                  /* Segment this page will be written to */

  /* Pointers for singly linked lists */
  Page *pWaitingNext;             /* Next page in FileSystem.pWaiting list */
  Page *pFreeNext;                /* Next page in FileSystem.pFree list */
  Page *pMappedNext;              /* Next page in FileSystem.pMapped list */
};

/*
** Meta-data page handle. There are two meta-data pages at the start of
** the database file, each FileSystem.nMetasize bytes in size.
*/
struct MetaPage {
  int iPg;                        /* Either 1 or 2 */
  int bWrite;                     /* Write back to db file on release */
  u8 *aData;                      /* Pointer to buffer */
  FileSystem *pFS;                /* FileSystem that owns this page */
};

/* 
** Values for LsmPage.flags 
*/
#define PAGE_DIRTY   0x00000001   /* Set if page is dirty */
#define PAGE_FREE    0x00000002   /* Set if Page.aData requires lsmFree() */
#define PAGE_HASPREV 0x00000004   /* Set if page is first on uncomp. block */

/*
** Number of pgsz byte pages omitted from the start of block 1. The start
** of block 1 contains two 4096 byte meta pages (8192 bytes in total).
*/
#define BLOCK1_HDR_SIZE(pgsz)  LSM_MAX(1, 8192/(pgsz))

/*
** If NDEBUG is not defined, set a breakpoint in function lsmIoerrBkpt()
** to catch IO errors (any error returned by a VFS method). 
*/
#ifndef NDEBUG
static void lsmIoerrBkpt(void){
  static int nErr = 0;
  nErr++;
}
static int IOERR_WRAPPER(int rc){
  if( rc!=LSM_OK ) lsmIoerrBkpt();
  return rc;
}
#else
# define IOERR_WRAPPER(rc) (rc)
#endif

#ifdef NDEBUG
# define assert_lists_are_ok(x)
#else
static Page *fsPageFindInHash(FileSystem *pFS, LsmPgno iPg, int *piHash);

static void assert_lists_are_ok(FileSystem *pFS){
#if 0
  Page *p;

  assert( pFS->nMapLimit>=0 );

  /* Check that all pages in the LRU list have nRef==0, pointers to buffers
  ** in heap memory, and corresponding entries in the hash table.  */
  for(p=pFS->pLruFirst; p; p=p->pLruNext){
    assert( p==pFS->pLruFirst || p->pLruPrev!=0 );
    assert( p==pFS->pLruLast || p->pLruNext!=0 );
    assert( p->pLruPrev==0 || p->pLruPrev->pLruNext==p );
    assert( p->pLruNext==0 || p->pLruNext->pLruPrev==p );
    assert( p->nRef==0 );
    assert( p->flags & PAGE_FREE );
    assert( p==fsPageFindInHash(pFS, p->iPg, 0) );
  }
#endif
}
#endif

/*
** Wrappers around the VFS methods of the lsm_env object:
**
**     lsmEnvOpen()
**     lsmEnvRead()
**     lsmEnvWrite()
**     lsmEnvSync()
**     lsmEnvSectorSize()
**     lsmEnvClose()
**     lsmEnvTruncate()
**     lsmEnvUnlink()
**     lsmEnvRemap()
*/
int lsmEnvOpen(lsm_env *pEnv, const char *zFile, int flags, lsm_file **ppNew){
  return pEnv->xOpen(pEnv, zFile, flags, ppNew);
}

static int lsmEnvRead(
  lsm_env *pEnv, 
  lsm_file *pFile, 
  lsm_i64 iOff, 
  void *pRead, 
  int nRead
){
  return IOERR_WRAPPER( pEnv->xRead(pFile, iOff, pRead, nRead) );
}

static int lsmEnvWrite(
  lsm_env *pEnv, 
  lsm_file *pFile, 
  lsm_i64 iOff, 
  const void *pWrite, 
  int nWrite
){
  return IOERR_WRAPPER( pEnv->xWrite(pFile, iOff, (void *)pWrite, nWrite) );
}

static int lsmEnvSync(lsm_env *pEnv, lsm_file *pFile){
  return IOERR_WRAPPER( pEnv->xSync(pFile) );
}

static int lsmEnvSectorSize(lsm_env *pEnv, lsm_file *pFile){
  return pEnv->xSectorSize(pFile);
}

int lsmEnvClose(lsm_env *pEnv, lsm_file *pFile){
  return IOERR_WRAPPER( pEnv->xClose(pFile) );
}

static int lsmEnvTruncate(lsm_env *pEnv, lsm_file *pFile, lsm_i64 nByte){
  return IOERR_WRAPPER( pEnv->xTruncate(pFile, nByte) );
}

static int lsmEnvUnlink(lsm_env *pEnv, const char *zDel){
  return IOERR_WRAPPER( pEnv->xUnlink(pEnv, zDel) );
}

static int lsmEnvRemap(
  lsm_env *pEnv, 
  lsm_file *pFile, 
  i64 szMin,
  void **ppMap,
  i64 *pszMap
){
  return pEnv->xRemap(pFile, szMin, ppMap, pszMap);
}

int lsmEnvLock(lsm_env *pEnv, lsm_file *pFile, int iLock, int eLock){
  if( pFile==0 ) return LSM_OK;
  return pEnv->xLock(pFile, iLock, eLock);
}

int lsmEnvTestLock(
  lsm_env *pEnv, 
  lsm_file *pFile, 
  int iLock, 
  int nLock, 
  int eLock
){
  return pEnv->xTestLock(pFile, iLock, nLock, eLock);
}

int lsmEnvShmMap(
  lsm_env *pEnv, 
  lsm_file *pFile, 
  int iChunk, 
  int sz, 
  void **ppOut
){
  return pEnv->xShmMap(pFile, iChunk, sz, ppOut);
}

void lsmEnvShmBarrier(lsm_env *pEnv){
  pEnv->xShmBarrier();
}

void lsmEnvShmUnmap(lsm_env *pEnv, lsm_file *pFile, int bDel){
  pEnv->xShmUnmap(pFile, bDel);
}

void lsmEnvSleep(lsm_env *pEnv, int nUs){
  pEnv->xSleep(pEnv, nUs);
}


/*
** Write the contents of string buffer pStr into the log file, starting at
** offset iOff.
*/
int lsmFsWriteLog(FileSystem *pFS, i64 iOff, LsmString *pStr){
  assert( pFS->fdLog );
  return lsmEnvWrite(pFS->pEnv, pFS->fdLog, iOff, pStr->z, pStr->n);
}

/*
** fsync() the log file.
*/
int lsmFsSyncLog(FileSystem *pFS){
  assert( pFS->fdLog );
  return lsmEnvSync(pFS->pEnv, pFS->fdLog);
}

/*
** Read nRead bytes of data starting at offset iOff of the log file. Append
** the results to string buffer pStr.
*/
int lsmFsReadLog(FileSystem *pFS, i64 iOff, int nRead, LsmString *pStr){
  int rc;                         /* Return code */
  assert( pFS->fdLog );
  rc = lsmStringExtend(pStr, nRead);
  if( rc==LSM_OK ){
    rc = lsmEnvRead(pFS->pEnv, pFS->fdLog, iOff, &pStr->z[pStr->n], nRead);
    pStr->n += nRead;
  }
  return rc;
}

/*
** Truncate the log file to nByte bytes in size.
*/
int lsmFsTruncateLog(FileSystem *pFS, i64 nByte){
  if( pFS->fdLog==0 ) return LSM_OK;
  return lsmEnvTruncate(pFS->pEnv, pFS->fdLog, nByte);
}

/*
** Truncate the db file to nByte bytes in size.
*/
int lsmFsTruncateDb(FileSystem *pFS, i64 nByte){
  if( pFS->fdDb==0 ) return LSM_OK;
  return lsmEnvTruncate(pFS->pEnv, pFS->fdDb, nByte);
}

/*
** Close the log file. Then delete it from the file-system. This function
** is called during database shutdown only.
*/
int lsmFsCloseAndDeleteLog(FileSystem *pFS){
  char *zDel;

  if( pFS->fdLog ){
    lsmEnvClose(pFS->pEnv, pFS->fdLog );
    pFS->fdLog = 0;
  }

  zDel = lsmMallocPrintf(pFS->pEnv, "%s-log", pFS->zDb);
  if( zDel ){
    lsmEnvUnlink(pFS->pEnv, zDel);
    lsmFree(pFS->pEnv, zDel);
  }
  return LSM_OK;
}

/*
** Return true if page iReal of the database should be accessed using mmap.
** False otherwise.
*/
static int fsMmapPage(FileSystem *pFS, LsmPgno iReal){
  return ((i64)iReal*pFS->nPagesize <= pFS->nMapLimit);
}

/*
** Given that there are currently nHash slots in the hash table, return 
** the hash key for file iFile, page iPg.
*/
static int fsHashKey(int nHash, LsmPgno iPg){
  return (iPg % nHash);
}

/*
** This is a helper function for lsmFsOpen(). It opens a single file on
** disk (either the database or log file).
*/
static lsm_file *fsOpenFile(
  FileSystem *pFS,                /* File system object */
  int bReadonly,                  /* True to open this file read-only */
  int bLog,                       /* True for log, false for db */
  int *pRc                        /* IN/OUT: Error code */
){
  lsm_file *pFile = 0;
  if( *pRc==LSM_OK ){
    int flags = (bReadonly ? LSM_OPEN_READONLY : 0);
    const char *zPath = (bLog ? pFS->zLog : pFS->zDb);

    *pRc = lsmEnvOpen(pFS->pEnv, zPath, flags, &pFile);
  }
  return pFile;
}

/*
** If it is not already open, this function opens the log file. It returns
** LSM_OK if successful (or if the log file was already open) or an LSM
** error code otherwise.
**
** The log file must be opened before any of the following may be called:
**
**     lsmFsWriteLog
**     lsmFsSyncLog
**     lsmFsReadLog
*/
int lsmFsOpenLog(lsm_db *db, int *pbOpen){
  int rc = LSM_OK;
  FileSystem *pFS = db->pFS;

  if( 0==pFS->fdLog ){ 
    pFS->fdLog = fsOpenFile(pFS, db->bReadonly, 1, &rc); 

    if( rc==LSM_IOERR_NOENT && db->bReadonly ){
      rc = LSM_OK;
    }
  }

  if( pbOpen ) *pbOpen = (pFS->fdLog!=0);
  return rc;
}

/*
** Close the log file, if it is open.
*/
void lsmFsCloseLog(lsm_db *db){
  FileSystem *pFS = db->pFS;
  if( pFS->fdLog ){
    lsmEnvClose(pFS->pEnv, pFS->fdLog);
    pFS->fdLog = 0;
  }
}

/*
** Open a connection to a database stored within the file-system.
**
** If parameter bReadonly is true, then open a read-only file-descriptor
** on the database file. It is possible that bReadonly will be false even
** if the user requested that pDb be opened read-only. This is because the
** file-descriptor may later on be recycled by a read-write connection.
** If the db file can be opened for read-write access, it always is. Parameter
** bReadonly is only ever true if it has already been determined that the
** db can only be opened for read-only access.
**
** Return LSM_OK if successful or an lsm error code otherwise.
*/
int lsmFsOpen(
  lsm_db *pDb,                    /* Database connection to open fd for */
  const char *zDb,                /* Full path to database file */
  int bReadonly                   /* True to open db file read-only */
){
  FileSystem *pFS;
  int rc = LSM_OK;
  int nDb = strlen(zDb);
  int nByte;

  assert( pDb->pFS==0 );
  assert( pDb->pWorker==0 && pDb->pClient==0 );

  nByte = sizeof(FileSystem) + nDb+1 + nDb+4+1;
  pFS = (FileSystem *)lsmMallocZeroRc(pDb->pEnv, nByte, &rc);
  if( pFS ){
    LsmFile *pLsmFile;
    pFS->zDb = (char *)&pFS[1];
    pFS->zLog = &pFS->zDb[nDb+1];
    pFS->nPagesize = LSM_DFLT_PAGE_SIZE;
    pFS->nBlocksize = LSM_DFLT_BLOCK_SIZE;
    pFS->nMetasize = LSM_META_PAGE_SIZE;
    pFS->nMetaRwSize = LSM_META_RW_PAGE_SIZE;
    pFS->pDb = pDb;
    pFS->pEnv = pDb->pEnv;

    /* Make a copy of the database and log file names. */
    memcpy(pFS->zDb, zDb, nDb+1);
    memcpy(pFS->zLog, zDb, nDb);
    memcpy(&pFS->zLog[nDb], "-log", 5);

    /* Allocate the hash-table here. At some point, it should be changed
    ** so that it can grow dynamicly. */
    pFS->nCacheMax = 2048*1024 / pFS->nPagesize;
    pFS->nHash = 4096;
    pFS->apHash = lsmMallocZeroRc(pDb->pEnv, sizeof(Page *) * pFS->nHash, &rc);

    /* Open the database file */
    pLsmFile = lsmDbRecycleFd(pDb);
    if( pLsmFile ){
      pFS->pLsmFile = pLsmFile;
      pFS->fdDb = pLsmFile->pFile;
      memset(pLsmFile, 0, sizeof(LsmFile));
    }else{
      pFS->pLsmFile = lsmMallocZeroRc(pDb->pEnv, sizeof(LsmFile), &rc);
      if( rc==LSM_OK ){
        pFS->fdDb = fsOpenFile(pFS, bReadonly, 0, &rc);
      }
    }

    if( rc!=LSM_OK ){
      lsmFsClose(pFS);
      pFS = 0;
    }else{
      pFS->szSector = lsmEnvSectorSize(pFS->pEnv, pFS->fdDb);
    }
  }

  pDb->pFS = pFS;
  return rc;
}

/*
** Configure the file-system object according to the current values of
** the LSM_CONFIG_MMAP and LSM_CONFIG_SET_COMPRESSION options.
*/
int lsmFsConfigure(lsm_db *db){
  FileSystem *pFS = db->pFS;
  if( pFS ){
    lsm_env *pEnv = pFS->pEnv;
    Page *pPg;

    assert( pFS->nOut==0 );
    assert( pFS->pWaiting==0 );
    assert( pFS->pMapped==0 );

    /* Reset any compression/decompression buffers already allocated */
    lsmFree(pEnv, pFS->aIBuffer);
    lsmFree(pEnv, pFS->aOBuffer);
    pFS->nBuffer = 0;

    /* Unmap the file, if it is currently mapped */
    if( pFS->pMap ){
      lsmEnvRemap(pEnv, pFS->fdDb, -1, &pFS->pMap, &pFS->nMap);
      pFS->nMapLimit = 0;
    }

    /* Free all allocated page structures */
    pPg = pFS->pLruFirst;
    while( pPg ){
      Page *pNext = pPg->pLruNext;
      assert( pPg->flags & PAGE_FREE );
      lsmFree(pEnv, pPg->aData);
      lsmFree(pEnv, pPg);
      pPg = pNext;
    }

    pPg = pFS->pFree;
    while( pPg ){
      Page *pNext = pPg->pFreeNext;
      lsmFree(pEnv, pPg);
      pPg = pNext;
    }

    /* Zero pointers that point to deleted page objects */
    pFS->nCacheAlloc = 0;
    pFS->pLruFirst = 0;
    pFS->pLruLast = 0;
    pFS->pFree = 0;
    if( pFS->apHash ){
      memset(pFS->apHash, 0, pFS->nHash*sizeof(pFS->apHash[0]));
    }

    /* Configure the FileSystem object */
    if( db->compress.xCompress ){
      pFS->pCompress = &db->compress;
      pFS->nMapLimit = 0;
    }else{
      pFS->pCompress = 0;
      if( db->iMmap==1 ){
        /* Unlimited */
        pFS->nMapLimit = (i64)1 << 60;
      }else{
        /* iMmap is a limit in KB. Set nMapLimit to the same value in bytes. */
        pFS->nMapLimit = (i64)db->iMmap * 1024;
      }
    }
  }

  return LSM_OK;
}

/*
** Close and destroy a FileSystem object.
*/
void lsmFsClose(FileSystem *pFS){
  if( pFS ){
    Page *pPg;
    lsm_env *pEnv = pFS->pEnv;

    assert( pFS->nOut==0 );
    pPg = pFS->pLruFirst;
    while( pPg ){
      Page *pNext = pPg->pLruNext;
      if( pPg->flags & PAGE_FREE ) lsmFree(pEnv, pPg->aData);
      lsmFree(pEnv, pPg);
      pPg = pNext;
    }

    pPg = pFS->pFree;
    while( pPg ){
      Page *pNext = pPg->pFreeNext;
      if( pPg->flags & PAGE_FREE ) lsmFree(pEnv, pPg->aData);
      lsmFree(pEnv, pPg);
      pPg = pNext;
    }

    if( pFS->fdDb ) lsmEnvClose(pFS->pEnv, pFS->fdDb );
    if( pFS->fdLog ) lsmEnvClose(pFS->pEnv, pFS->fdLog );
    lsmFree(pEnv, pFS->pLsmFile);
    lsmFree(pEnv, pFS->apHash);
    lsmFree(pEnv, pFS->aIBuffer);
    lsmFree(pEnv, pFS->aOBuffer);
    lsmFree(pEnv, pFS);
  }
}

/*
** This function is called when closing a database handle (i.e. lsm_close()) 
** if there exist other connections to the same database within this process.
** In that case the file-descriptor open on the database file is not closed
** when the FileSystem object is destroyed, as this would cause any POSIX
** locks held by the other connections to be silently dropped (see "man close"
** for details). Instead, the file-descriptor is stored in a list by the
** lsm_shared.c module until it is either closed or reused.
**
** This function returns a pointer to an object that can be linked into
** the list described above. The returned object now 'owns' the database
** file descriptr, so that when the FileSystem object is destroyed, it
** will not be closed. 
**
** This function may be called at most once in the life-time of a 
** FileSystem object. The results of any operations involving the database 
** file descriptor are undefined once this function has been called.
**
** None of this is necessary on non-POSIX systems. But we do it anyway in
** the name of using as similar code as possible on all platforms.
*/
LsmFile *lsmFsDeferClose(FileSystem *pFS){
  LsmFile *p = pFS->pLsmFile;
  assert( p->pNext==0 );
  p->pFile = pFS->fdDb;
  pFS->fdDb = 0;
  pFS->pLsmFile = 0;
  return p;
}

/*
** Allocate a buffer and populate it with the output of the xFileid() 
** method of the database file handle. If successful, set *ppId to point 
** to the buffer and *pnId to the number of bytes in the buffer and return
** LSM_OK. Otherwise, set *ppId and *pnId to zero and return an LSM
** error code.
*/
int lsmFsFileid(lsm_db *pDb, void **ppId, int *pnId){
  lsm_env *pEnv = pDb->pEnv;
  FileSystem *pFS = pDb->pFS;
  int rc;
  int nId = 0;
  void *pId;

  rc = pEnv->xFileid(pFS->fdDb, 0, &nId);
  pId = lsmMallocZeroRc(pEnv, nId, &rc);
  if( rc==LSM_OK ) rc = pEnv->xFileid(pFS->fdDb, pId, &nId);

  if( rc!=LSM_OK ){
    lsmFree(pEnv, pId);
    pId = 0;
    nId = 0;
  }

  *ppId = pId;
  *pnId = nId;
  return rc;
}

/*
** Return the nominal page-size used by this file-system. Actual pages
** may be smaller or larger than this value.
*/
int lsmFsPageSize(FileSystem *pFS){
  return pFS->nPagesize;
}

/*
** Return the block-size used by this file-system.
*/
int lsmFsBlockSize(FileSystem *pFS){
  return pFS->nBlocksize;
}

/*
** Configure the nominal page-size used by this file-system. Actual 
** pages may be smaller or larger than this value.
*/
void lsmFsSetPageSize(FileSystem *pFS, int nPgsz){
  pFS->nPagesize = nPgsz;
  pFS->nCacheMax = 2048*1024 / pFS->nPagesize;
}

/*
** Configure the block-size used by this file-system. 
*/
void lsmFsSetBlockSize(FileSystem *pFS, int nBlocksize){
  pFS->nBlocksize = nBlocksize;
}

/*
** Return the page number of the first page on block iBlock. Blocks are
** numbered starting from 1.
**
** For a compressed database, page numbers are byte offsets. The first
** page on each block is the byte offset immediately following the 4-byte
** "previous block" pointer at the start of each block.
*/
static LsmPgno fsFirstPageOnBlock(FileSystem *pFS, int iBlock){
  LsmPgno iPg;
  if( pFS->pCompress ){
    if( iBlock==1 ){
      iPg = pFS->nMetasize * 2 + 4;
    }else{
      iPg = pFS->nBlocksize * (LsmPgno)(iBlock-1) + 4;
    }
  }else{
    const int nPagePerBlock = (pFS->nBlocksize / pFS->nPagesize);
    if( iBlock==1 ){
      iPg = 1 + ((pFS->nMetasize*2 + pFS->nPagesize - 1) / pFS->nPagesize);
    }else{
      iPg = 1 + (iBlock-1) * nPagePerBlock;
    }
  }
  return iPg;
}

/*
** Return the page number of the last page on block iBlock. Blocks are
** numbered starting from 1.
**
** For a compressed database, page numbers are byte offsets. The first
** page on each block is the byte offset of the byte immediately before 
** the 4-byte "next block" pointer at the end of each block.
*/
static LsmPgno fsLastPageOnBlock(FileSystem *pFS, int iBlock){
  if( pFS->pCompress ){
    return pFS->nBlocksize * (LsmPgno)iBlock - 1 - 4;
  }else{
    const int nPagePerBlock = (pFS->nBlocksize / pFS->nPagesize);
    return iBlock * nPagePerBlock;
  }
}

/*
** Return the block number of the block that page iPg is located on. 
** Blocks are numbered starting from 1.
*/
static int fsPageToBlock(FileSystem *pFS, LsmPgno iPg){
  if( pFS->pCompress ){
    return (int)((iPg / pFS->nBlocksize) + 1);
  }else{
    return (int)(1 + ((iPg-1) / (pFS->nBlocksize / pFS->nPagesize)));
  }
}

/*
** Return true if page iPg is the last page on its block.
**
** This function is only called in non-compressed database mode.
*/
static int fsIsLast(FileSystem *pFS, LsmPgno iPg){
  const int nPagePerBlock = (pFS->nBlocksize / pFS->nPagesize);
  assert( !pFS->pCompress );
  return ( iPg && (iPg % nPagePerBlock)==0 );
}

/*
** Return true if page iPg is the first page on its block.
**
** This function is only called in non-compressed database mode.
*/
static int fsIsFirst(FileSystem *pFS, LsmPgno iPg){
  const int nPagePerBlock = (pFS->nBlocksize / pFS->nPagesize);
  assert( !pFS->pCompress );
  return ( (iPg % nPagePerBlock)==1
        || (iPg<nPagePerBlock && iPg==fsFirstPageOnBlock(pFS, 1))
  );
}

/*
** Given a page reference, return a pointer to the buffer containing the 
** pages contents. If parameter pnData is not NULL, set *pnData to the size
** of the buffer in bytes before returning.
*/
u8 *lsmFsPageData(Page *pPage, int *pnData){
  if( pnData ){
    *pnData = pPage->nData;
  }
  return pPage->aData;
}

/*
** Return the page number of a page.
*/
LsmPgno lsmFsPageNumber(Page *pPage){
  /* assert( (pPage->flags & PAGE_DIRTY)==0 ); */
  return pPage ? pPage->iPg : 0;
}

/*
** Page pPg is currently part of the LRU list belonging to pFS. Remove
** it from the list. pPg->pLruNext and pPg->pLruPrev are cleared by this
** operation.
*/
static void fsPageRemoveFromLru(FileSystem *pFS, Page *pPg){
  assert( pPg->pLruNext || pPg==pFS->pLruLast );
  assert( pPg->pLruPrev || pPg==pFS->pLruFirst );
  if( pPg->pLruNext ){
    pPg->pLruNext->pLruPrev = pPg->pLruPrev;
  }else{
    pFS->pLruLast = pPg->pLruPrev;
  }
  if( pPg->pLruPrev ){
    pPg->pLruPrev->pLruNext = pPg->pLruNext;
  }else{
    pFS->pLruFirst = pPg->pLruNext;
  }
  pPg->pLruPrev = 0;
  pPg->pLruNext = 0;
}

/*
** Page pPg is not currently part of the LRU list belonging to pFS. Add it.
*/
static void fsPageAddToLru(FileSystem *pFS, Page *pPg){
  assert( pPg->pLruNext==0 && pPg->pLruPrev==0 );
  pPg->pLruPrev = pFS->pLruLast;
  if( pPg->pLruPrev ){
    pPg->pLruPrev->pLruNext = pPg;
  }else{
    pFS->pLruFirst = pPg;
  }
  pFS->pLruLast = pPg;
}

/*
** Page pPg is currently stored in the apHash/nHash hash table. Remove it.
*/
static void fsPageRemoveFromHash(FileSystem *pFS, Page *pPg){
  int iHash;
  Page **pp;

  iHash = fsHashKey(pFS->nHash, pPg->iPg);
  for(pp=&pFS->apHash[iHash]; *pp!=pPg; pp=&(*pp)->pHashNext);
  *pp = pPg->pHashNext;
  pPg->pHashNext = 0;
}

/*
** Free a Page object allocated by fsPageBuffer().
*/
static void fsPageBufferFree(Page *pPg){
  pPg->pFS->nCacheAlloc--;
  lsmFree(pPg->pFS->pEnv, pPg->aData);
  lsmFree(pPg->pFS->pEnv, pPg);
}


/*
** Purge the cache of all non-mmap pages with nRef==0.
*/
void lsmFsPurgeCache(FileSystem *pFS){
  Page *pPg;

  pPg = pFS->pLruFirst;
  while( pPg ){
    Page *pNext = pPg->pLruNext;
    assert( pPg->flags & PAGE_FREE );
    fsPageRemoveFromHash(pFS, pPg);
    fsPageBufferFree(pPg);
    pPg = pNext;
  }
  pFS->pLruFirst = 0;
  pFS->pLruLast = 0;

  assert( pFS->nCacheAlloc<=pFS->nOut && pFS->nCacheAlloc>=0 );
}

/*
** Search the hash-table for page iPg. If an entry is round, return a pointer
** to it. Otherwise, return NULL.
**
** Either way, if argument piHash is not NULL set *piHash to the hash slot
** number that page iPg would be stored in before returning.
*/
static Page *fsPageFindInHash(FileSystem *pFS, LsmPgno iPg, int *piHash){
  Page *p;                        /* Return value */
  int iHash = fsHashKey(pFS->nHash, iPg);

  if( piHash ) *piHash = iHash;
  for(p=pFS->apHash[iHash]; p; p=p->pHashNext){
    if( p->iPg==iPg) break;
  }
  return p;
}

/*
** Allocate and return a non-mmap Page object. If there are already 
** nCacheMax such Page objects outstanding, try to recycle an existing 
** Page instead.
*/
static int fsPageBuffer(
  FileSystem *pFS, 
  Page **ppOut
){
  int rc = LSM_OK;
  Page *pPage = 0;
  if( pFS->pLruFirst==0 || pFS->nCacheAlloc<pFS->nCacheMax ){
    /* Allocate a new Page object */
    pPage = lsmMallocZero(pFS->pEnv, sizeof(Page));
    if( !pPage ){
      rc = LSM_NOMEM_BKPT;
    }else{
      pPage->aData = (u8 *)lsmMalloc(pFS->pEnv, pFS->nPagesize);
      if( !pPage->aData ){
        lsmFree(pFS->pEnv, pPage);
        rc = LSM_NOMEM_BKPT;
        pPage = 0;
      }else{
        pFS->nCacheAlloc++;
      }
    }
  }else{
    /* Reuse an existing Page object */
    u8 *aData;
    pPage = pFS->pLruFirst;
    aData = pPage->aData;
    fsPageRemoveFromLru(pFS, pPage);
    fsPageRemoveFromHash(pFS, pPage);

    memset(pPage, 0, sizeof(Page));
    pPage->aData = aData;
  }

  if( pPage ){
    pPage->flags = PAGE_FREE;
  }
  *ppOut = pPage;
  return rc;
}

/*
** Assuming *pRc is initially LSM_OK, attempt to ensure that the 
** memory-mapped region is at least iSz bytes in size. If it is not already,
** iSz bytes in size, extend it and update the pointers associated with any
** outstanding Page objects.
**
** If *pRc is not LSM_OK when this function is called, it is a no-op. 
** Otherwise, *pRc is set to an lsm error code if an error occurs, or
** left unmodified otherwise.
**
** This function is never called in compressed database mode.
*/
static void fsGrowMapping(
  FileSystem *pFS,                /* File system object */
  i64 iSz,                        /* Minimum size to extend mapping to */
  int *pRc                        /* IN/OUT: Error code */
){
  assert( pFS->pCompress==0 );
  assert( PAGE_HASPREV==4 );

  if( *pRc==LSM_OK && iSz>pFS->nMap ){
    int rc;
    u8 *aOld = pFS->pMap;
    rc = lsmEnvRemap(pFS->pEnv, pFS->fdDb, iSz, &pFS->pMap, &pFS->nMap);
    if( rc==LSM_OK && pFS->pMap!=aOld ){
      Page *pFix;
      i64 iOff = (u8 *)pFS->pMap - aOld;
      for(pFix=pFS->pMapped; pFix; pFix=pFix->pMappedNext){
        pFix->aData += iOff;
      }
      lsmSortedRemap(pFS->pDb);
    }
    *pRc = rc;
  }
}

/*
** If it is mapped, unmap the database file.
*/
int lsmFsUnmap(FileSystem *pFS){
  int rc = LSM_OK;
  if( pFS ){
    rc = lsmEnvRemap(pFS->pEnv, pFS->fdDb, -1, &pFS->pMap, &pFS->nMap);
  }
  return rc;
}

/*
** fsync() the database file.
*/
int lsmFsSyncDb(FileSystem *pFS, int nBlock){
  return lsmEnvSync(pFS->pEnv, pFS->fdDb);
}

/*
** If block iBlk has been redirected according to the redirections in the
** object passed as the first argument, return the destination block to
** which it is redirected. Otherwise, return a copy of iBlk.
*/
static int fsRedirectBlock(Redirect *p, int iBlk){
  if( p ){
    int i;
    for(i=0; i<p->n; i++){
      if( iBlk==p->a[i].iFrom ) return p->a[i].iTo;
    }
  }
  assert( iBlk!=0 );
  return iBlk;
}

/*
** If page iPg has been redirected according to the redirections in the
** object passed as the second argument, return the destination page to
** which it is redirected. Otherwise, return a copy of iPg.
*/
LsmPgno lsmFsRedirectPage(FileSystem *pFS, Redirect *pRedir, LsmPgno iPg){
  LsmPgno iReal = iPg;

  if( pRedir ){
    const int nPagePerBlock = (
        pFS->pCompress ? pFS->nBlocksize : (pFS->nBlocksize / pFS->nPagesize)
    );
    int iBlk = fsPageToBlock(pFS, iPg);
    int i;
    for(i=0; i<pRedir->n; i++){
      int iFrom = pRedir->a[i].iFrom;
      if( iFrom>iBlk ) break;
      if( iFrom==iBlk ){
        int iTo = pRedir->a[i].iTo;
        iReal = iPg - (LsmPgno)(iFrom - iTo) * nPagePerBlock;
        if( iTo==1 ){
          iReal += (fsFirstPageOnBlock(pFS, 1)-1);
        }
        break;
      }
    }
  }

  assert( iReal!=0 );
  return iReal;
}

/* Required by the circular fsBlockNext<->fsPageGet dependency. */
static int fsPageGet(FileSystem *, Segment *, LsmPgno, int, Page **, int *);

/*
** Parameter iBlock is a database file block. This function reads the value 
** stored in the blocks "next block" pointer and stores it in *piNext.
** LSM_OK is returned if everything is successful, or an LSM error code
** otherwise.
*/
static int fsBlockNext(
  FileSystem *pFS,                /* File-system object handle */
  Segment *pSeg,                  /* Use this segment for block redirects */
  int iBlock,                     /* Read field from this block */
  int *piNext                     /* OUT: Next block in linked list */
){
  int rc;
  int iRead;                      /* Read block from here */
  
  if( pSeg ){
    iRead = fsRedirectBlock(pSeg->pRedirect, iBlock);
  }else{
    iRead = iBlock;
  }

  assert( pFS->nMapLimit==0 || pFS->pCompress==0 );
  if( pFS->pCompress ){
    i64 iOff;                     /* File offset to read data from */
    u8 aNext[4];                  /* 4-byte pointer read from db file */

    iOff = (i64)iRead * pFS->nBlocksize - sizeof(aNext);
    rc = lsmEnvRead(pFS->pEnv, pFS->fdDb, iOff, aNext, sizeof(aNext));
    if( rc==LSM_OK ){
      *piNext = (int)lsmGetU32(aNext);
    }
  }else{
    const int nPagePerBlock = (pFS->nBlocksize / pFS->nPagesize);
    Page *pLast;
    rc = fsPageGet(pFS, 0, iRead*nPagePerBlock, 0, &pLast, 0);
    if( rc==LSM_OK ){
      *piNext = lsmGetU32(&pLast->aData[pFS->nPagesize-4]);
      lsmFsPageRelease(pLast);
    }
  }

  if( pSeg ){
    *piNext = fsRedirectBlock(pSeg->pRedirect, *piNext);
  }
  return rc;
}

/*
** Return the page number of the last page on the same block as page iPg.
*/
LsmPgno fsLastPageOnPagesBlock(FileSystem *pFS, LsmPgno iPg){
  return fsLastPageOnBlock(pFS, fsPageToBlock(pFS, iPg));
}

/*
** Read nData bytes of data from offset iOff of the database file into
** buffer aData. If this means reading past the end of a block, follow
** the block pointer to the next block and continue reading.
**
** Offset iOff is an absolute offset - not subject to any block redirection.
** However any block pointer followed is. Use pSeg->pRedirect in this case.
**
** This function is only called in compressed database mode.
*/
static int fsReadData(
  FileSystem *pFS,                /* File-system handle */
  Segment *pSeg,                  /* Block redirection */
  i64 iOff,                       /* Read data from this offset */
  u8 *aData,                      /* Buffer to read data into */
  int nData                       /* Number of bytes to read */
){
  i64 iEob;                       /* End of block */
  int nRead;
  int rc;

  assert( pFS->pCompress );

  iEob = fsLastPageOnPagesBlock(pFS, iOff) + 1;
  nRead = (int)LSM_MIN(iEob - iOff, nData);

  rc = lsmEnvRead(pFS->pEnv, pFS->fdDb, iOff, aData, nRead);
  if( rc==LSM_OK && nRead!=nData ){
    int iBlk;

    rc = fsBlockNext(pFS, pSeg, fsPageToBlock(pFS, iOff), &iBlk);
    if( rc==LSM_OK ){
      i64 iOff2 = fsFirstPageOnBlock(pFS, iBlk);
      rc = lsmEnvRead(pFS->pEnv, pFS->fdDb, iOff2, &aData[nRead], nData-nRead);
    }
  }

  return rc;
}

/*
** Parameter iBlock is a database file block. This function reads the value 
** stored in the blocks "previous block" pointer and stores it in *piPrev.
** LSM_OK is returned if everything is successful, or an LSM error code
** otherwise.
*/
static int fsBlockPrev(
  FileSystem *pFS,                /* File-system object handle */
  Segment *pSeg,                  /* Use this segment for block redirects */
  int iBlock,                     /* Read field from this block */
  int *piPrev                     /* OUT: Previous block in linked list */
){
  int rc = LSM_OK;                /* Return code */

  assert( pFS->nMapLimit==0 || pFS->pCompress==0 );
  assert( iBlock>0 );

  if( pFS->pCompress ){
    i64 iOff = fsFirstPageOnBlock(pFS, iBlock) - 4;
    u8 aPrev[4];                  /* 4-byte pointer read from db file */
    rc = lsmEnvRead(pFS->pEnv, pFS->fdDb, iOff, aPrev, sizeof(aPrev));
    if( rc==LSM_OK ){
      Redirect *pRedir = (pSeg ? pSeg->pRedirect : 0);
      *piPrev = fsRedirectBlock(pRedir, (int)lsmGetU32(aPrev));
    }
  }else{
    assert( 0 );
  }
  return rc;
}

/*
** Encode and decode routines for record size fields.
*/
static void putRecordSize(u8 *aBuf, int nByte, int bFree){
  aBuf[0] = (u8)(nByte >> 14) | 0x80;
  aBuf[1] = ((u8)(nByte >>  7) & 0x7F) | (bFree ? 0x00 : 0x80);
  aBuf[2] = (u8)nByte | 0x80;
}
static int getRecordSize(u8 *aBuf, int *pbFree){
  int nByte;
  nByte  = (aBuf[0] & 0x7F) << 14;
  nByte += (aBuf[1] & 0x7F) << 7;
  nByte += (aBuf[2] & 0x7F);
  *pbFree = !(aBuf[1] & 0x80);
  return nByte;
}

/*
** Subtract iSub from database file offset iOff and set *piRes to the
** result. If doing so means passing the start of a block, follow the
** block pointer stored in the first 4 bytes of the block.
**
** Offset iOff is an absolute offset - not subject to any block redirection.
** However any block pointer followed is. Use pSeg->pRedirect in this case.
**
** Return LSM_OK if successful or an lsm error code if an error occurs.
*/
static int fsSubtractOffset(
  FileSystem *pFS, 
  Segment *pSeg,
  i64 iOff, 
  int iSub, 
  i64 *piRes
){
  i64 iStart;
  int iBlk = 0;
  int rc;

  assert( pFS->pCompress );

  iStart = fsFirstPageOnBlock(pFS, fsPageToBlock(pFS, iOff));
  if( (iOff-iSub)>=iStart ){
    *piRes = (iOff-iSub);
    return LSM_OK;
  }

  rc = fsBlockPrev(pFS, pSeg, fsPageToBlock(pFS, iOff), &iBlk);
  *piRes = fsLastPageOnBlock(pFS, iBlk) - iSub + (iOff - iStart + 1);
  return rc;
}

/*
** Add iAdd to database file offset iOff and set *piRes to the
** result. If doing so means passing the end of a block, follow the
** block pointer stored in the last 4 bytes of the block.
**
** Offset iOff is an absolute offset - not subject to any block redirection.
** However any block pointer followed is. Use pSeg->pRedirect in this case.
**
** Return LSM_OK if successful or an lsm error code if an error occurs.
*/
static int fsAddOffset(
  FileSystem *pFS, 
  Segment *pSeg,
  i64 iOff, 
  int iAdd, 
  i64 *piRes
){
  i64 iEob;
  int iBlk;
  int rc;

  assert( pFS->pCompress );

  iEob = fsLastPageOnPagesBlock(pFS, iOff);
  if( (iOff+iAdd)<=iEob ){
    *piRes = (iOff+iAdd);
    return LSM_OK;
  }

  rc = fsBlockNext(pFS, pSeg, fsPageToBlock(pFS, iOff), &iBlk);
  *piRes = fsFirstPageOnBlock(pFS, iBlk) + iAdd - (iEob - iOff + 1);
  return rc;
}

/*
** If it is not already allocated, allocate either the FileSystem.aOBuffer (if
** bWrite is true) or the FileSystem.aIBuffer (if bWrite is false). Return
** LSM_OK if successful if the attempt to allocate memory fails.
*/
static int fsAllocateBuffer(FileSystem *pFS, int bWrite){
  u8 **pp;                        /* Pointer to either aIBuffer or aOBuffer */

  assert( pFS->pCompress );

  /* If neither buffer has been allocated, figure out how large they
  ** should be. Store this value in FileSystem.nBuffer.  */
  if( pFS->nBuffer==0 ){
    assert( pFS->aIBuffer==0 && pFS->aOBuffer==0 );
    pFS->nBuffer = pFS->pCompress->xBound(pFS->pCompress->pCtx, pFS->nPagesize);
    if( pFS->nBuffer<(pFS->szSector+6) ){
      pFS->nBuffer = pFS->szSector+6;
    }
  }

  pp = (bWrite ? &pFS->aOBuffer : &pFS->aIBuffer);
  if( *pp==0 ){
    *pp = lsmMalloc(pFS->pEnv, LSM_MAX(pFS->nBuffer, pFS->nPagesize));
    if( *pp==0 ) return LSM_NOMEM_BKPT;
  }

  return LSM_OK;
}

/*
** This function is only called in compressed database mode. It reads and
** uncompresses the compressed data for page pPg from the database and
** populates the pPg->aData[] buffer and pPg->nCompress field.
**
** It is possible that instead of a page record, there is free space
** at offset pPg->iPgno. In this case no data is read from the file, but
** output variable *pnSpace is set to the total number of free bytes.
**
** LSM_OK is returned if successful, or an LSM error code otherwise.
*/
static int fsReadPagedata(
  FileSystem *pFS,                /* File-system handle */
  Segment *pSeg,                  /* pPg is part of this segment */
  Page *pPg,                      /* Page to read and uncompress data for */
  int *pnSpace                    /* OUT: Total bytes of free space */
){
  lsm_compress *p = pFS->pCompress;
  i64 iOff = pPg->iPg;
  u8 aSz[3];
  int rc;

  assert( p && pPg->nCompress==0 );

  if( fsAllocateBuffer(pFS, 0) ) return LSM_NOMEM;

  rc = fsReadData(pFS, pSeg, iOff, aSz, sizeof(aSz));

  if( rc==LSM_OK ){
    int bFree;
    if( aSz[0] & 0x80 ){
      pPg->nCompress = (int)getRecordSize(aSz, &bFree);
    }else{
      pPg->nCompress = (int)aSz[0] - sizeof(aSz)*2;
      bFree = 1;
    }
    if( bFree ){
      if( pnSpace ){
        *pnSpace = pPg->nCompress + sizeof(aSz)*2;
      }else{
        rc = LSM_CORRUPT_BKPT;
      }
    }else{
      rc = fsAddOffset(pFS, pSeg, iOff, 3, &iOff);
      if( rc==LSM_OK ){
        if( pPg->nCompress>pFS->nBuffer ){
          rc = LSM_CORRUPT_BKPT;
        }else{
          rc = fsReadData(pFS, pSeg, iOff, pFS->aIBuffer, pPg->nCompress);
        }
        if( rc==LSM_OK ){
          int n = pFS->nPagesize;
          rc = p->xUncompress(p->pCtx, 
              (char *)pPg->aData, &n, 
              (const char *)pFS->aIBuffer, pPg->nCompress
          );
          if( rc==LSM_OK && n!=pPg->pFS->nPagesize ){
            rc = LSM_CORRUPT_BKPT;
          }
        }
      }
    }
  }
  return rc;
}

/*
** Return a handle for a database page.
**
** If this file-system object is accessing a compressed database it may be
** that there is no page record at database file offset iPg. Instead, there
** may be a free space record. In this case, set *ppPg to NULL and *pnSpace
** to the total number of free bytes before returning.
**
** If no error occurs, LSM_OK is returned. Otherwise, an lsm error code.
*/
static int fsPageGet(
  FileSystem *pFS,                /* File-system handle */
  Segment *pSeg,                  /* Block redirection to use (or NULL) */
  LsmPgno iPg,                    /* Page id */
  int noContent,                  /* True to not load content from disk */
  Page **ppPg,                    /* OUT: New page handle */
  int *pnSpace                    /* OUT: Bytes of free space */
){
  Page *p;
  int iHash;
  int rc = LSM_OK;

  /* In most cases iReal is the same as iPg. Except, if pSeg->pRedirect is 
  ** not NULL, and the block containing iPg has been redirected, then iReal
  ** is the page number after redirection.  */
  LsmPgno iReal = lsmFsRedirectPage(pFS, (pSeg ? pSeg->pRedirect : 0), iPg);

  assert_lists_are_ok(pFS);
  assert( iPg>=fsFirstPageOnBlock(pFS, 1) );
  assert( iReal>=fsFirstPageOnBlock(pFS, 1) );
  *ppPg = 0;

  /* Search the hash-table for the page */
  p = fsPageFindInHash(pFS, iReal, &iHash);

  if( p ){
    assert( p->flags & PAGE_FREE );
    if( p->nRef==0 ) fsPageRemoveFromLru(pFS, p);
  }else{

    if( fsMmapPage(pFS, iReal) ){
      i64 iEnd = (i64)iReal * pFS->nPagesize;
      fsGrowMapping(pFS, iEnd, &rc);
      if( rc!=LSM_OK ) return rc;

      if( pFS->pFree ){
        p = pFS->pFree;
        pFS->pFree = p->pFreeNext;
        assert( p->nRef==0 );
      }else{
        p = lsmMallocZeroRc(pFS->pEnv, sizeof(Page), &rc);
        if( rc ) return rc;
        p->pFS = pFS;
      }
      p->aData = &((u8 *)pFS->pMap)[pFS->nPagesize * (iReal-1)];
      p->iPg = iReal;

      /* This page now carries a pointer to the mapping. Link it in to
      ** the FileSystem.pMapped list.  */
      assert( p->pMappedNext==0 );
      p->pMappedNext = pFS->pMapped;
      pFS->pMapped = p;

      assert( pFS->pCompress==0 );
      assert( (p->flags & PAGE_FREE)==0 );
    }else{
      rc = fsPageBuffer(pFS, &p);
      if( rc==LSM_OK ){
        int nSpace = 0;
        p->iPg = iReal;
        p->nRef = 0;
        p->pFS = pFS;
        assert( p->flags==0 || p->flags==PAGE_FREE );

#ifdef LSM_DEBUG
        memset(p->aData, 0x56, pFS->nPagesize);
#endif
        assert( p->pLruNext==0 && p->pLruPrev==0 );
        if( noContent==0 ){
          if( pFS->pCompress ){
            rc = fsReadPagedata(pFS, pSeg, p, &nSpace);
          }else{
            int nByte = pFS->nPagesize;
            i64 iOff = (i64)(iReal-1) * pFS->nPagesize;
            rc = lsmEnvRead(pFS->pEnv, pFS->fdDb, iOff, p->aData, nByte);
          }
          pFS->nRead++;
        }

        /* If the xRead() call was successful (or not attempted), link the
        ** page into the page-cache hash-table. Otherwise, if it failed,
        ** free the buffer. */
        if( rc==LSM_OK && nSpace==0 ){
          p->pHashNext = pFS->apHash[iHash];
          pFS->apHash[iHash] = p;
        }else{
          fsPageBufferFree(p);
          p = 0;
          if( pnSpace ) *pnSpace = nSpace;
        }
      }
    }

    assert( (rc==LSM_OK && (p || (pnSpace && *pnSpace)))
         || (rc!=LSM_OK && p==0) 
    );
  }

  if( rc==LSM_OK && p ){
    if( pFS->pCompress==0 && (fsIsLast(pFS, iReal) || fsIsFirst(pFS, iReal)) ){
      p->nData = pFS->nPagesize - 4;
      if( fsIsFirst(pFS, iReal) && p->nRef==0 ){
        p->aData += 4;
        p->flags |= PAGE_HASPREV;
      }
    }else{
      p->nData = pFS->nPagesize;
    }
    pFS->nOut += (p->nRef==0);
    p->nRef++;
  }
  *ppPg = p;
  return rc;
}

/*
** Read the 64-bit checkpoint id of the checkpoint currently stored on meta
** page iMeta of the database file. If no error occurs, store the id value
** in *piVal and return LSM_OK. Otherwise, return an LSM error code and leave
** *piVal unmodified.
**
** If a checkpointer connection is currently updating meta-page iMeta, or an
** earlier checkpointer crashed while doing so, the value read into *piVal
** may be garbage. It is the callers responsibility to deal with this.
*/
int lsmFsReadSyncedId(lsm_db *db, int iMeta, i64 *piVal){
  FileSystem *pFS = db->pFS;
  int rc = LSM_OK;

  assert( iMeta==1 || iMeta==2 );
  if( pFS->nMapLimit>0 ){
    fsGrowMapping(pFS, iMeta*LSM_META_PAGE_SIZE, &rc);
    if( rc==LSM_OK ){
      *piVal = (i64)lsmGetU64(&((u8 *)pFS->pMap)[(iMeta-1)*LSM_META_PAGE_SIZE]);
    }
  }else{
    MetaPage *pMeta = 0;
    rc = lsmFsMetaPageGet(pFS, 0, iMeta, &pMeta);
    if( rc==LSM_OK ){
      *piVal = (i64)lsmGetU64(pMeta->aData);
      lsmFsMetaPageRelease(pMeta);
    }
  }

  return rc;
}


/*
** Return true if the first or last page of segment pRun falls between iFirst
** and iLast, inclusive, and pRun is not equal to pIgnore.
*/
static int fsRunEndsBetween(
  Segment *pRun, 
  Segment *pIgnore, 
  LsmPgno iFirst, 
  LsmPgno iLast
){
  return (pRun!=pIgnore && (
        (pRun->iFirst>=iFirst && pRun->iFirst<=iLast)
     || (pRun->iLastPg>=iFirst && pRun->iLastPg<=iLast)
  ));
}

/*
** Return true if level pLevel contains a segment other than pIgnore for
** which the first or last page is between iFirst and iLast, inclusive.
*/
static int fsLevelEndsBetween(
  Level *pLevel, 
  Segment *pIgnore, 
  LsmPgno iFirst, 
  LsmPgno iLast
){
  int i;

  if( fsRunEndsBetween(&pLevel->lhs, pIgnore, iFirst, iLast) ){
    return 1;
  }
  for(i=0; i<pLevel->nRight; i++){
    if( fsRunEndsBetween(&pLevel->aRhs[i], pIgnore, iFirst, iLast) ){
      return 1;
    }
  }

  return 0;
}

/*
** Block iBlk is no longer in use by segment pIgnore. If it is not in use
** by any other segment, move it to the free block list.
*/
static int fsFreeBlock(
  FileSystem *pFS,                /* File system object */
  Snapshot *pSnapshot,            /* Worker snapshot */
  Segment *pIgnore,               /* Ignore this run when searching */
  int iBlk                        /* Block number of block to free */
){
  int rc = LSM_OK;                /* Return code */
  LsmPgno iFirst;                 /* First page on block iBlk */
  LsmPgno iLast;                  /* Last page on block iBlk */
  Level *pLevel;                  /* Used to iterate through levels */

  int iIn;                        /* Used to iterate through append points */
  int iOut = 0;                   /* Used to output append points */
  LsmPgno *aApp = pSnapshot->aiAppend;

  iFirst = fsFirstPageOnBlock(pFS, iBlk);
  iLast = fsLastPageOnBlock(pFS, iBlk);

  /* Check if any other run in the snapshot has a start or end page 
  ** within this block. If there is such a run, return early. */
  for(pLevel=lsmDbSnapshotLevel(pSnapshot); pLevel; pLevel=pLevel->pNext){
    if( fsLevelEndsBetween(pLevel, pIgnore, iFirst, iLast) ){
      return LSM_OK;
    }
  }

  /* Remove any entries that lie on this block from the append-list. */
  for(iIn=0; iIn<LSM_APPLIST_SZ; iIn++){
    if( aApp[iIn]<iFirst || aApp[iIn]>iLast ){
      aApp[iOut++] = aApp[iIn];
    }
  }
  while( iOut<LSM_APPLIST_SZ ) aApp[iOut++] = 0;

  if( rc==LSM_OK ){
    rc = lsmBlockFree(pFS->pDb, iBlk);
  }
  return rc;
}

/*
** Delete or otherwise recycle the blocks currently occupied by run pDel.
*/
int lsmFsSortedDelete(
  FileSystem *pFS, 
  Snapshot *pSnapshot,
  int bZero,                      /* True to zero the Segment structure */
  Segment *pDel
){
  if( pDel->iFirst ){
    int rc = LSM_OK;

    int iBlk;
    int iLastBlk;

    iBlk = fsPageToBlock(pFS, pDel->iFirst);
    iLastBlk = fsPageToBlock(pFS, pDel->iLastPg);

    /* Mark all blocks currently used by this sorted run as free */
    while( iBlk && rc==LSM_OK ){
      int iNext = 0;
      if( iBlk!=iLastBlk ){
        rc = fsBlockNext(pFS, pDel, iBlk, &iNext);
      }else if( bZero==0 && pDel->iLastPg!=fsLastPageOnBlock(pFS, iLastBlk) ){
        break;
      }
      rc = fsFreeBlock(pFS, pSnapshot, pDel, iBlk);
      iBlk = iNext;
    }

    if( pDel->pRedirect ){
      assert( pDel->pRedirect==&pSnapshot->redirect );
      pSnapshot->redirect.n = 0;
    }

    if( bZero ) memset(pDel, 0, sizeof(Segment));
  }
  return LSM_OK;
}

/*
** aPgno is an array containing nPgno page numbers. Return the smallest page
** number from the array that falls on block iBlk. Or, if none of the pages
** in aPgno[] fall on block iBlk, return 0.
*/
static LsmPgno firstOnBlock(
  FileSystem *pFS, 
  int iBlk, 
  LsmPgno *aPgno, 
  int nPgno
){
  LsmPgno iRet = 0;
  int i;
  for(i=0; i<nPgno; i++){
    LsmPgno iPg = aPgno[i];
    if( fsPageToBlock(pFS, iPg)==iBlk && (iRet==0 || iPg<iRet) ){
      iRet = iPg;
    }
  }
  return iRet;
}

#ifndef NDEBUG
/*
** Return true if page iPg, which is a part of segment p, lies on
** a redirected block. 
*/
static int fsPageRedirects(FileSystem *pFS, Segment *p, LsmPgno iPg){
  return (iPg!=0 && iPg!=lsmFsRedirectPage(pFS, p->pRedirect, iPg));
}

/*
** Return true if the second argument is not NULL and any of the first
** last or root pages lie on a redirected block. 
*/
static int fsSegmentRedirects(FileSystem *pFS, Segment *p){
  return (p && (
      fsPageRedirects(pFS, p, p->iFirst)
   || fsPageRedirects(pFS, p, p->iRoot)
   || fsPageRedirects(pFS, p, p->iLastPg)
  ));
}
#endif

/*
** Argument aPgno is an array of nPgno page numbers. All pages belong to
** the segment pRun. This function gobbles from the start of the run to the
** first page that appears in aPgno[] (i.e. so that the aPgno[] entry is
** the new first page of the run).
*/
void lsmFsGobble(
  lsm_db *pDb,
  Segment *pRun, 
  LsmPgno *aPgno,
  int nPgno
){
  int rc = LSM_OK;
  FileSystem *pFS = pDb->pFS;
  Snapshot *pSnapshot = pDb->pWorker;
  int iBlk;

  assert( pRun->nSize>0 );
  assert( 0==fsSegmentRedirects(pFS, pRun) );
  assert( nPgno>0 && 0==fsPageRedirects(pFS, pRun, aPgno[0]) );

  iBlk = fsPageToBlock(pFS, pRun->iFirst);
  pRun->nSize += (int)(pRun->iFirst - fsFirstPageOnBlock(pFS, iBlk));

  while( rc==LSM_OK ){
    int iNext = 0;
    LsmPgno iFirst = firstOnBlock(pFS, iBlk, aPgno, nPgno);
    if( iFirst ){
      pRun->iFirst = iFirst;
      break;
    }
    rc = fsBlockNext(pFS, pRun, iBlk, &iNext);
    if( rc==LSM_OK ) rc = fsFreeBlock(pFS, pSnapshot, pRun, iBlk);
    pRun->nSize -= (int)(
        1 + fsLastPageOnBlock(pFS, iBlk) - fsFirstPageOnBlock(pFS, iBlk)
    );
    iBlk = iNext;
  }

  pRun->nSize -= (int)(pRun->iFirst - fsFirstPageOnBlock(pFS, iBlk));
  assert( pRun->nSize>0 );
}

/*
** This function is only used in compressed database mode.
**
** Argument iPg is the page number (byte offset) of a page within segment
** pSeg. The page record, including all headers, is nByte bytes in size.
** Before returning, set *piNext to the page number of the next page in
** the segment, or to zero if iPg is the last.
**
** In other words, do:
**
**   *piNext = iPg + nByte;
**
** But take block overflow and redirection into account.
*/
static int fsNextPageOffset(
  FileSystem *pFS,                /* File system object */
  Segment *pSeg,                  /* Segment to move within */
  LsmPgno iPg,                    /* Offset of current page */
  int nByte,                      /* Size of current page including headers */
  LsmPgno *piNext                 /* OUT: Offset of next page. Or zero (EOF) */
){
  LsmPgno iNext;
  int rc;

  assert( pFS->pCompress );

  rc = fsAddOffset(pFS, pSeg, iPg, nByte-1, &iNext);
  if( pSeg && iNext==pSeg->iLastPg ){
    iNext = 0;
  }else if( rc==LSM_OK ){
    rc = fsAddOffset(pFS, pSeg, iNext, 1, &iNext);
  }

  *piNext = iNext;
  return rc;
}

/*
** This function is only used in compressed database mode.
**
** Argument iPg is the page number of a pagethat appears in segment pSeg.
** This function determines the page number of the previous page in the
** same run. *piPrev is set to the previous page number before returning.
**
** LSM_OK is returned if no error occurs. Otherwise, an lsm error code.
** If any value other than LSM_OK is returned, then the final value of
** *piPrev is undefined.
*/
static int fsGetPageBefore(
  FileSystem *pFS, 
  Segment *pSeg, 
  LsmPgno iPg, 
  LsmPgno *piPrev
){
  u8 aSz[3];
  int rc;
  i64 iRead;

  assert( pFS->pCompress );

  rc = fsSubtractOffset(pFS, pSeg, iPg, sizeof(aSz), &iRead);
  if( rc==LSM_OK ) rc = fsReadData(pFS, pSeg, iRead, aSz, sizeof(aSz));

  if( rc==LSM_OK ){
    int bFree;
    int nSz;
    if( aSz[2] & 0x80 ){
      nSz = getRecordSize(aSz, &bFree) + sizeof(aSz)*2;
    }else{
      nSz = (int)(aSz[2] & 0x7F);
      bFree = 1;
    }
    rc = fsSubtractOffset(pFS, pSeg, iPg, nSz, piPrev);
  }

  return rc;
}

/*
** The first argument to this function is a valid reference to a database
** file page that is part of a sorted run. If parameter eDir is -1, this 
** function attempts to locate and load the previous page in the same run. 
** Or, if eDir is +1, it attempts to find the next page in the same run.
** The results of passing an eDir value other than positive or negative one
** are undefined.
**
** If parameter pRun is not NULL then it must point to the run that page
** pPg belongs to. In this case, if pPg is the first or last page of the
** run, and the request is for the previous or next page, respectively,
** *ppNext is set to NULL before returning LSM_OK. If pRun is NULL, then it
** is assumed that the next or previous page, as requested, exists.
**
** If the previous/next page does exist and is successfully loaded, *ppNext
** is set to point to it and LSM_OK is returned. Otherwise, if an error 
** occurs, *ppNext is set to NULL and and lsm error code returned.
**
** Page references returned by this function should be released by the 
** caller using lsmFsPageRelease().
*/
int lsmFsDbPageNext(Segment *pRun, Page *pPg, int eDir, Page **ppNext){
  int rc = LSM_OK;
  FileSystem *pFS = pPg->pFS;
  LsmPgno iPg = pPg->iPg;

  assert( 0==fsSegmentRedirects(pFS, pRun) );
  if( pFS->pCompress ){
    int nSpace = pPg->nCompress + 2*3;

    do {
      if( eDir>0 ){
        rc = fsNextPageOffset(pFS, pRun, iPg, nSpace, &iPg);
      }else{
        if( iPg==pRun->iFirst ){
          iPg = 0;
        }else{
          rc = fsGetPageBefore(pFS, pRun, iPg, &iPg);
        }
      }

      nSpace = 0;
      if( iPg!=0 ){
        rc = fsPageGet(pFS, pRun, iPg, 0, ppNext, &nSpace);
        assert( (*ppNext==0)==(rc!=LSM_OK || nSpace>0) );
      }else{
        *ppNext = 0;
      }
    }while( nSpace>0 && rc==LSM_OK );

  }else{
    Redirect *pRedir = pRun ? pRun->pRedirect : 0;
    assert( eDir==1 || eDir==-1 );
    if( eDir<0 ){
      if( pRun && iPg==pRun->iFirst ){
        *ppNext = 0;
        return LSM_OK;
      }else if( fsIsFirst(pFS, iPg) ){
        assert( pPg->flags & PAGE_HASPREV );
        iPg = fsLastPageOnBlock(pFS, lsmGetU32(&pPg->aData[-4]));
      }else{
        iPg--;
      }
    }else{
      if( pRun ){
        if( iPg==pRun->iLastPg ){
          *ppNext = 0;
          return LSM_OK;
        }
      }

      if( fsIsLast(pFS, iPg) ){
        int iBlk = fsRedirectBlock(
            pRedir, lsmGetU32(&pPg->aData[pFS->nPagesize-4])
        );
        iPg = fsFirstPageOnBlock(pFS, iBlk);
      }else{
        iPg++;
      }
    }
    rc = fsPageGet(pFS, pRun, iPg, 0, ppNext, 0);
  }

  return rc;
}

/*
** This function is called when creating a new segment to determine if the
** first part of it can be written following an existing segment on an
** already allocated block. If it is possible, the page number of the first
** page to use for the new segment is returned. Otherwise zero.
**
** If argument pLvl is not NULL, then this function will not attempt to
** start the new segment immediately following any segment that is part
** of the right-hand-side of pLvl.
*/
static LsmPgno findAppendPoint(FileSystem *pFS, Level *pLvl){
  int i;
  LsmPgno *aiAppend = pFS->pDb->pWorker->aiAppend;
  LsmPgno iRet = 0;

  for(i=LSM_APPLIST_SZ-1; iRet==0 && i>=0; i--){
    if( (iRet = aiAppend[i]) ){
      if( pLvl ){
        int iBlk = fsPageToBlock(pFS, iRet);
        int j;
        for(j=0; iRet && j<pLvl->nRight; j++){
          if( fsPageToBlock(pFS, pLvl->aRhs[j].iLastPg)==iBlk ){
            iRet = 0;
          }
        }
      }
      if( iRet ) aiAppend[i] = 0;
    }
  }
  return iRet;
}

/*
** Append a page to the left-hand-side of pLvl. Set the ref-count to 1 and
** return a pointer to it. The page is writable until either 
** lsmFsPagePersist() is called on it or the ref-count drops to zero.
*/
int lsmFsSortedAppend(
  FileSystem *pFS, 
  Snapshot *pSnapshot,
  Level *pLvl,
  int bDefer,
  Page **ppOut
){
  int rc = LSM_OK;
  Page *pPg = 0;
  LsmPgno iApp = 0;
  LsmPgno iNext = 0;
  Segment *p = &pLvl->lhs;
  LsmPgno iPrev = p->iLastPg;

  *ppOut = 0;
  assert( p->pRedirect==0 );

  if( pFS->pCompress || bDefer ){
    /* In compressed database mode the page is not assigned a page number
    ** or location in the database file at this point. This will be done
    ** by the lsmFsPagePersist() call.  */
    rc = fsPageBuffer(pFS, &pPg);
    if( rc==LSM_OK ){
      pPg->pFS = pFS;
      pPg->pSeg = p;
      pPg->iPg = 0;
      pPg->flags |= PAGE_DIRTY;
      pPg->nData = pFS->nPagesize;
      assert( pPg->aData );
      if( pFS->pCompress==0 ) pPg->nData -= 4;

      pPg->nRef = 1;
      pFS->nOut++;
    }
  }else{
    if( iPrev==0 ){
      iApp = findAppendPoint(pFS, pLvl);
    }else if( fsIsLast(pFS, iPrev) ){
      int iNext2;
      rc = fsBlockNext(pFS, 0, fsPageToBlock(pFS, iPrev), &iNext2);
      if( rc!=LSM_OK ) return rc;
      iApp = fsFirstPageOnBlock(pFS, iNext2);
    }else{
      iApp = iPrev + 1;
    }

    /* If this is the first page allocated, or if the page allocated is the
    ** last in the block, also allocate the next block here.  */
    if( iApp==0 || fsIsLast(pFS, iApp) ){
      int iNew;                     /* New block number */

      rc = lsmBlockAllocate(pFS->pDb, 0, &iNew);
      if( rc!=LSM_OK ) return rc;
      if( iApp==0 ){
        iApp = fsFirstPageOnBlock(pFS, iNew);
      }else{
        iNext = fsFirstPageOnBlock(pFS, iNew);
      }
    }

    /* Grab the new page. */
    pPg = 0;
    rc = fsPageGet(pFS, 0, iApp, 1, &pPg, 0);
    assert( rc==LSM_OK || pPg==0 );

    /* If this is the first or last page of a block, fill in the pointer 
     ** value at the end of the new page. */
    if( rc==LSM_OK ){
      p->nSize++;
      p->iLastPg = iApp;
      if( p->iFirst==0 ) p->iFirst = iApp;
      pPg->flags |= PAGE_DIRTY;

      if( fsIsLast(pFS, iApp) ){
        lsmPutU32(&pPg->aData[pFS->nPagesize-4], fsPageToBlock(pFS, iNext));
      }else if( fsIsFirst(pFS, iApp) ){
        lsmPutU32(&pPg->aData[-4], fsPageToBlock(pFS, iPrev));
      }
    }
  }

  *ppOut = pPg;
  return rc;
}

/*
** Mark the segment passed as the second argument as finished. Once a segment
** is marked as finished it is not possible to append any further pages to 
** it.
**
** Return LSM_OK if successful or an lsm error code if an error occurs.
*/
int lsmFsSortedFinish(FileSystem *pFS, Segment *p){
  int rc = LSM_OK;
  if( p && p->iLastPg ){
    assert( p->pRedirect==0 );

    /* Check if the last page of this run happens to be the last of a block.
    ** If it is, then an extra block has already been allocated for this run.
    ** Shift this extra block back to the free-block list. 
    **
    ** Otherwise, add the first free page in the last block used by the run
    ** to the lAppend list.
    */
    if( fsLastPageOnPagesBlock(pFS, p->iLastPg)!=p->iLastPg ){
      int i;
      LsmPgno *aiAppend = pFS->pDb->pWorker->aiAppend;
      for(i=0; i<LSM_APPLIST_SZ; i++){
        if( aiAppend[i]==0 ){
          aiAppend[i] = p->iLastPg+1;
          break;
        }
      }
    }else if( pFS->pCompress==0 ){
      Page *pLast;
      rc = fsPageGet(pFS, 0, p->iLastPg, 0, &pLast, 0);
      if( rc==LSM_OK ){
        int iBlk = (int)lsmGetU32(&pLast->aData[pFS->nPagesize-4]);
        lsmBlockRefree(pFS->pDb, iBlk);
        lsmFsPageRelease(pLast);
      }
    }else{
      int iBlk = 0;
      rc = fsBlockNext(pFS, p, fsPageToBlock(pFS, p->iLastPg), &iBlk);
      if( rc==LSM_OK ){
        lsmBlockRefree(pFS->pDb, iBlk);
      }
    }
  }
  return rc;
}

/*
** Obtain a reference to page number iPg.
**
** Return LSM_OK if successful, or an lsm error code if an error occurs.
*/
int lsmFsDbPageGet(FileSystem *pFS, Segment *pSeg, LsmPgno iPg, Page **ppPg){
  return fsPageGet(pFS, pSeg, iPg, 0, ppPg, 0);
}

/*
** Obtain a reference to the last page in the segment passed as the 
** second argument.
**
** Return LSM_OK if successful, or an lsm error code if an error occurs.
*/
int lsmFsDbPageLast(FileSystem *pFS, Segment *pSeg, Page **ppPg){
  int rc;
  LsmPgno iPg = pSeg->iLastPg;
  if( pFS->pCompress ){
    int nSpace;
    iPg++;
    do {
      nSpace = 0;
      rc = fsGetPageBefore(pFS, pSeg, iPg, &iPg);
      if( rc==LSM_OK ){
        rc = fsPageGet(pFS, pSeg, iPg, 0, ppPg, &nSpace);
      }
    }while( rc==LSM_OK && nSpace>0 );

  }else{
    rc = fsPageGet(pFS, pSeg, iPg, 0, ppPg, 0);
  }
  return rc;
}

/*
** Return a reference to meta-page iPg. If successful, LSM_OK is returned
** and *ppPg populated with the new page reference. The reference should
** be released by the caller using lsmFsPageRelease().
**
** Otherwise, if an error occurs, *ppPg is set to NULL and an LSM error 
** code is returned.
*/
int lsmFsMetaPageGet(
  FileSystem *pFS,                /* File-system connection */
  int bWrite,                     /* True for write access, false for read */
  int iPg,                        /* Either 1 or 2 */
  MetaPage **ppPg                 /* OUT: Pointer to MetaPage object */
){
  int rc = LSM_OK;
  MetaPage *pPg;
  assert( iPg==1 || iPg==2 );

  pPg = lsmMallocZeroRc(pFS->pEnv, sizeof(Page), &rc);

  if( pPg ){
    i64 iOff = (iPg-1) * pFS->nMetasize;
    if( pFS->nMapLimit>0 ){
      fsGrowMapping(pFS, 2*pFS->nMetasize, &rc);
      pPg->aData = (u8 *)(pFS->pMap) + iOff;
    }else{
      pPg->aData = lsmMallocRc(pFS->pEnv, pFS->nMetasize, &rc);
      if( rc==LSM_OK && bWrite==0 ){
        rc = lsmEnvRead(
            pFS->pEnv, pFS->fdDb, iOff, pPg->aData, pFS->nMetaRwSize
        );
      }
#ifndef NDEBUG
      /* pPg->aData causes an uninitialized access via a downstreadm write().
         After discussion on this list, this memory should not, for performance
         reasons, be memset. However, tracking down "real" misuse is more
         difficult with this "false" positive, so it is set when NDEBUG.
      */
      else if( rc==LSM_OK ){
        memset( pPg->aData, 0x77, pFS->nMetasize );
      }
#endif
    }

    if( rc!=LSM_OK ){
      if( pFS->nMapLimit==0 ) lsmFree(pFS->pEnv, pPg->aData);
      lsmFree(pFS->pEnv, pPg);
      pPg = 0;
    }else{
      pPg->iPg = iPg;
      pPg->bWrite = bWrite;
      pPg->pFS = pFS;
    }
  }

  *ppPg = pPg;
  return rc;
}

/*
** Release a meta-page reference obtained via a call to lsmFsMetaPageGet().
*/
int lsmFsMetaPageRelease(MetaPage *pPg){
  int rc = LSM_OK;
  if( pPg ){
    FileSystem *pFS = pPg->pFS;

    if( pFS->nMapLimit==0 ){
      if( pPg->bWrite ){
        i64 iOff = (pPg->iPg==2 ? pFS->nMetasize : 0);
        int nWrite = pFS->nMetaRwSize;
        rc = lsmEnvWrite(pFS->pEnv, pFS->fdDb, iOff, pPg->aData, nWrite);
      }
      lsmFree(pFS->pEnv, pPg->aData);
    }

    lsmFree(pFS->pEnv, pPg);
  }
  return rc;
}

/*
** Return a pointer to a buffer containing the data associated with the
** meta-page passed as the first argument. If parameter pnData is not NULL,
** set *pnData to the size of the meta-page in bytes before returning.
*/
u8 *lsmFsMetaPageData(MetaPage *pPg, int *pnData){
  if( pnData ) *pnData = pPg->pFS->nMetaRwSize;
  return pPg->aData;
}

/*
** Return true if page is currently writable. This is used in assert() 
** statements only.
*/
#ifndef NDEBUG
int lsmFsPageWritable(Page *pPg){
  return (pPg->flags & PAGE_DIRTY) ? 1 : 0;
}
#endif

/*
** This is called when block iFrom is being redirected to iTo. If page 
** number (*piPg) lies on block iFrom, then calculate the equivalent
** page on block iTo and set *piPg to this value before returning.
*/
static void fsMovePage(
  FileSystem *pFS,                /* File system object */
  int iTo,                        /* Destination block */
  int iFrom,                      /* Source block */
  LsmPgno *piPg                   /* IN/OUT: Page number */
){
  LsmPgno iPg = *piPg;
  if( iFrom==fsPageToBlock(pFS, iPg) ){
    const int nPagePerBlock = (
        pFS->pCompress ? pFS ->nBlocksize : (pFS->nBlocksize / pFS->nPagesize)
    );
    *piPg = iPg - (LsmPgno)(iFrom - iTo) * nPagePerBlock;
  }
}

/*
** Copy the contents of block iFrom to block iTo. 
**
** It is safe to assume that there are no outstanding references to pages 
** on block iTo. And that block iFrom is not currently being written. In
** other words, the data can be read and written directly.
*/
int lsmFsMoveBlock(FileSystem *pFS, Segment *pSeg, int iTo, int iFrom){
  Snapshot *p = pFS->pDb->pWorker;
  int rc = LSM_OK;
  int i;
  i64 nMap;

  i64 iFromOff = (i64)(iFrom-1) * pFS->nBlocksize;
  i64 iToOff = (i64)(iTo-1) * pFS->nBlocksize;
  
  assert( iTo!=1 );
  assert( iFrom>iTo );

  /* Grow the mapping as required. */
  nMap = LSM_MIN(pFS->nMapLimit, (i64)iFrom * pFS->nBlocksize);
  fsGrowMapping(pFS, nMap, &rc);

  if( rc==LSM_OK ){
    const int nPagePerBlock = (pFS->nBlocksize / pFS->nPagesize);
    int nSz = pFS->nPagesize;
    u8 *aBuf = 0;
    u8 *aData = 0;

    for(i=0; rc==LSM_OK && i<nPagePerBlock; i++){
      i64 iOff = iFromOff + i*nSz;

      /* Set aData to point to a buffer containing the from page */
      if( (iOff+nSz)<=pFS->nMapLimit ){
        u8 *aMap = (u8 *)(pFS->pMap);
        aData = &aMap[iOff];
      }else{
        if( aBuf==0 ){
          aBuf = (u8 *)lsmMallocRc(pFS->pEnv, nSz, &rc);
          if( aBuf==0 ) break;
        }
        aData = aBuf;
        rc = lsmEnvRead(pFS->pEnv, pFS->fdDb, iOff, aData, nSz);
      }

      /* Copy aData to the to page */
      if( rc==LSM_OK ){
        iOff = iToOff + i*nSz;
        if( (iOff+nSz)<=pFS->nMapLimit ){
          u8 *aMap = (u8 *)(pFS->pMap);
          memcpy(&aMap[iOff], aData, nSz);
        }else{
          rc = lsmEnvWrite(pFS->pEnv, pFS->fdDb, iOff, aData, nSz);
        }
      }
    }
    lsmFree(pFS->pEnv, aBuf);
    lsmFsPurgeCache(pFS);
  }

  /* Update append-point list if necessary */
  for(i=0; i<LSM_APPLIST_SZ; i++){
    fsMovePage(pFS, iTo, iFrom, &p->aiAppend[i]);
  }

  /* Update the Segment structure itself */
  fsMovePage(pFS, iTo, iFrom, &pSeg->iFirst);
  fsMovePage(pFS, iTo, iFrom, &pSeg->iLastPg);
  fsMovePage(pFS, iTo, iFrom, &pSeg->iRoot);

  return rc;
}

/*
** Append raw data to a segment. Return the database file offset that the
** data is written to (this may be used as the page number if the data
** being appended is a new page record).
**
** This function is only used in compressed database mode.
*/
static LsmPgno fsAppendData(
  FileSystem *pFS,                /* File-system handle */
  Segment *pSeg,                  /* Segment to append to */
  const u8 *aData,                /* Buffer containing data to write */
  int nData,                      /* Size of buffer aData[] in bytes */
  int *pRc                        /* IN/OUT: Error code */
){
  LsmPgno iRet = 0;
  int rc = *pRc;
  assert( pFS->pCompress );
  if( rc==LSM_OK ){
    int nRem = 0;
    int nWrite = 0;
    LsmPgno iLastOnBlock;
    LsmPgno iApp = pSeg->iLastPg+1;

    /* If this is the first data written into the segment, find an append-point
    ** or allocate a new block.  */
    if( iApp==1 ){
      pSeg->iFirst = iApp = findAppendPoint(pFS, 0);
      if( iApp==0 ){
        int iBlk;
        rc = lsmBlockAllocate(pFS->pDb, 0, &iBlk);
        pSeg->iFirst = iApp = fsFirstPageOnBlock(pFS, iBlk);
      }
    }
    iRet = iApp;

    /* Write as much data as is possible at iApp (usually all of it). */
    iLastOnBlock = fsLastPageOnPagesBlock(pFS, iApp);
    if( rc==LSM_OK ){
      int nSpace = (int)(iLastOnBlock - iApp + 1);
      nWrite = LSM_MIN(nData, nSpace);
      nRem = nData - nWrite;
      assert( nWrite>=0 );
      if( nWrite!=0 ){
        rc = lsmEnvWrite(pFS->pEnv, pFS->fdDb, iApp, aData, nWrite);
      }
      iApp += nWrite;
    }

    /* If required, allocate a new block and write the rest of the data
    ** into it. Set the next and previous block pointers to link the new
    ** block to the old.  */
    assert( nRem<=0 || (iApp-1)==iLastOnBlock );
    if( rc==LSM_OK && (iApp-1)==iLastOnBlock ){
      u8 aPtr[4];                 /* Space to serialize a u32 */
      int iBlk;                   /* New block number */

      if( nWrite>0 ){
        /* Allocate a new block. */
        rc = lsmBlockAllocate(pFS->pDb, 0, &iBlk);

        /* Set the "next" pointer on the old block */
        if( rc==LSM_OK ){
          assert( iApp==(fsPageToBlock(pFS, iApp)*pFS->nBlocksize)-4 );
          lsmPutU32(aPtr, iBlk);
          rc = lsmEnvWrite(pFS->pEnv, pFS->fdDb, iApp, aPtr, sizeof(aPtr));
        }

        /* Set the "prev" pointer on the new block */
        if( rc==LSM_OK ){
          LsmPgno iWrite;
          lsmPutU32(aPtr, fsPageToBlock(pFS, iApp));
          iWrite = fsFirstPageOnBlock(pFS, iBlk);
          rc = lsmEnvWrite(pFS->pEnv, pFS->fdDb, iWrite-4, aPtr, sizeof(aPtr));
          if( nRem>0 ) iApp = iWrite;
        }
      }else{
        /* The next block is already allocated. */
        assert( nRem>0 );
        assert( pSeg->pRedirect==0 );
        rc = fsBlockNext(pFS, 0, fsPageToBlock(pFS, iApp), &iBlk);
        iRet = iApp = fsFirstPageOnBlock(pFS, iBlk);
      }

      /* Write the remaining data into the new block */
      if( rc==LSM_OK && nRem>0 ){
        rc = lsmEnvWrite(pFS->pEnv, pFS->fdDb, iApp, &aData[nWrite], nRem);
        iApp += nRem;
      }
    }

    pSeg->iLastPg = iApp-1;
    *pRc = rc;
  }

  return iRet;
}

/*
** This function is only called in compressed database mode. It 
** compresses the contents of page pPg and writes the result to the 
** buffer at pFS->aOBuffer. The size of the compressed data is stored in
** pPg->nCompress.
**
** If buffer pFS->aOBuffer[] has not been allocated then this function
** allocates it. If this fails, LSM_NOMEM is returned. Otherwise, LSM_OK.
*/
static int fsCompressIntoBuffer(FileSystem *pFS, Page *pPg){
  lsm_compress *p = pFS->pCompress;

  if( fsAllocateBuffer(pFS, 1) ) return LSM_NOMEM;
  assert( pPg->nData==pFS->nPagesize );

  pPg->nCompress = pFS->nBuffer;
  return p->xCompress(p->pCtx, 
      (char *)pFS->aOBuffer, &pPg->nCompress, 
      (const char *)pPg->aData, pPg->nData
  );
}

/*
** Append a new page to segment pSeg. Set output variable *piNew to the
** page number of the new page before returning.
**
** If the new page is the last on its block, then the 'next' block that
** will be used by the segment is allocated here too. In this case output
** variable *piNext is set to the block number of the next block.
**
** If the new page is the first on its block but not the first in the
** entire segment, set output variable *piPrev to the block number of
** the previous block in the segment.
**
** LSM_OK is returned if successful, or an lsm error code otherwise. If
** any value other than LSM_OK is returned, then the final value of all
** output variables is undefined.
*/
static int fsAppendPage(
  FileSystem *pFS, 
  Segment *pSeg,
  LsmPgno *piNew,
  int *piPrev,
  int *piNext
){
  LsmPgno iPrev = pSeg->iLastPg;
  int rc;
  assert( iPrev!=0 );

  *piPrev = 0;
  *piNext = 0;

  if( fsIsLast(pFS, iPrev) ){
    /* Grab the first page on the next block (which has already be
    ** allocated). In this case set *piPrev to tell the caller to set
    ** the "previous block" pointer in the first 4 bytes of the page.
    */
    int iNext;
    int iBlk = fsPageToBlock(pFS, iPrev);
    assert( pSeg->pRedirect==0 );
    rc = fsBlockNext(pFS, 0, iBlk, &iNext);
    if( rc!=LSM_OK ) return rc;
    *piNew = fsFirstPageOnBlock(pFS, iNext);
    *piPrev = iBlk;
  }else{
    *piNew = iPrev+1;
    if( fsIsLast(pFS, *piNew) ){
      /* Allocate the next block here. */
      int iBlk;
      rc = lsmBlockAllocate(pFS->pDb, 0, &iBlk);
      if( rc!=LSM_OK ) return rc;
      *piNext = iBlk;
    }
  }

  pSeg->nSize++;
  pSeg->iLastPg = *piNew;
  return LSM_OK;
}

/*
** Flush all pages in the FileSystem.pWaiting list to disk.
*/
void lsmFsFlushWaiting(FileSystem *pFS, int *pRc){
  int rc = *pRc;
  Page *pPg;

  pPg = pFS->pWaiting;
  pFS->pWaiting = 0;

  while( pPg ){
    Page *pNext = pPg->pWaitingNext;
    if( rc==LSM_OK ) rc = lsmFsPagePersist(pPg);
    assert( pPg->nRef==1 );
    lsmFsPageRelease(pPg);
    pPg = pNext;
  }
  *pRc = rc;
}

/*
** If there exists a hash-table entry associated with page iPg, remove it.
*/
static void fsRemoveHashEntry(FileSystem *pFS, LsmPgno iPg){
  Page *p;
  int iHash = fsHashKey(pFS->nHash, iPg);

  for(p=pFS->apHash[iHash]; p && p->iPg!=iPg; p=p->pHashNext);

  if( p ){
    assert( p->nRef==0 || (p->flags & PAGE_FREE)==0 );
    fsPageRemoveFromHash(pFS, p);
    p->iPg = 0;
    iHash = fsHashKey(pFS->nHash, 0);
    p->pHashNext = pFS->apHash[iHash];
    pFS->apHash[iHash] = p;
  }
}

/*
** If the page passed as an argument is dirty, update the database file
** (or mapping of the database file) with its current contents and mark
** the page as clean.
**
** Return LSM_OK if the operation is a success, or an LSM error code
** otherwise.
*/
int lsmFsPagePersist(Page *pPg){
  int rc = LSM_OK;
  if( pPg && (pPg->flags & PAGE_DIRTY) ){
    FileSystem *pFS = pPg->pFS;

    if( pFS->pCompress ){
      int iHash;                  /* Hash key of assigned page number */
      u8 aSz[3];                  /* pPg->nCompress as a 24-bit big-endian */
      assert( pPg->pSeg && pPg->iPg==0 && pPg->nCompress==0 );

      /* Compress the page image. */
      rc = fsCompressIntoBuffer(pFS, pPg);

      /* Serialize the compressed size into buffer aSz[] */
      putRecordSize(aSz, pPg->nCompress, 0);

      /* Write the serialized page record into the database file. */
      pPg->iPg = fsAppendData(pFS, pPg->pSeg, aSz, sizeof(aSz), &rc);
      fsAppendData(pFS, pPg->pSeg, pFS->aOBuffer, pPg->nCompress, &rc);
      fsAppendData(pFS, pPg->pSeg, aSz, sizeof(aSz), &rc);

      /* Now that it has a page number, insert the page into the hash table */
      iHash = fsHashKey(pFS->nHash, pPg->iPg);
      pPg->pHashNext = pFS->apHash[iHash];
      pFS->apHash[iHash] = pPg;

      pPg->pSeg->nSize += (sizeof(aSz) * 2) + pPg->nCompress;

      pPg->flags &= ~PAGE_DIRTY;
      pFS->nWrite++;
    }else{

      if( pPg->iPg==0 ){
        /* No page number has been assigned yet. This occurs with pages used
        ** in the b-tree hierarchy. They were not assigned page numbers when
        ** they were created as doing so would cause this call to
        ** lsmFsPagePersist() to write an out-of-order page. Instead a page 
        ** number is assigned here so that the page data will be appended
        ** to the current segment.
        */
        Page **pp;
        int iPrev = 0;
        int iNext = 0;
        int iHash;

        assert( pPg->pSeg->iFirst );
        assert( pPg->flags & PAGE_FREE );
        assert( (pPg->flags & PAGE_HASPREV)==0 );
        assert( pPg->nData==pFS->nPagesize-4 );

        rc = fsAppendPage(pFS, pPg->pSeg, &pPg->iPg, &iPrev, &iNext);
        if( rc!=LSM_OK ) return rc;

        assert( pPg->flags & PAGE_FREE );
        iHash = fsHashKey(pFS->nHash, pPg->iPg);
        fsRemoveHashEntry(pFS, pPg->iPg);
        pPg->pHashNext = pFS->apHash[iHash];
        pFS->apHash[iHash] = pPg;
        assert( pPg->pHashNext==0 || pPg->pHashNext->iPg!=pPg->iPg );

        if( iPrev ){
          assert( iNext==0 );
          memmove(&pPg->aData[4], pPg->aData, pPg->nData);
          lsmPutU32(pPg->aData, iPrev);
          pPg->flags |= PAGE_HASPREV;
          pPg->aData += 4;
        }else if( iNext ){
          assert( iPrev==0 );
          lsmPutU32(&pPg->aData[pPg->nData], iNext);
        }else{
          int nData = pPg->nData;
          pPg->nData += 4;
          lsmSortedExpandBtreePage(pPg, nData);
        }

        pPg->nRef++;
        for(pp=&pFS->pWaiting; *pp; pp=&(*pp)->pWaitingNext);
        *pp = pPg;
        assert( pPg->pWaitingNext==0 );

      }else{
        i64 iOff;                   /* Offset to write within database file */

        iOff = (i64)pFS->nPagesize * (i64)(pPg->iPg-1);
        if( fsMmapPage(pFS, pPg->iPg)==0 ){
          u8 *aData = pPg->aData - (pPg->flags & PAGE_HASPREV);
          rc = lsmEnvWrite(pFS->pEnv, pFS->fdDb, iOff, aData, pFS->nPagesize);
        }else if( pPg->flags & PAGE_FREE ){
          fsGrowMapping(pFS, iOff + pFS->nPagesize, &rc);
          if( rc==LSM_OK ){
            u8 *aTo = &((u8 *)(pFS->pMap))[iOff];
            u8 *aFrom = pPg->aData - (pPg->flags & PAGE_HASPREV);
            memcpy(aTo, aFrom, pFS->nPagesize);
            lsmFree(pFS->pEnv, aFrom);
            pFS->nCacheAlloc--;
            pPg->aData = aTo + (pPg->flags & PAGE_HASPREV);
            pPg->flags &= ~PAGE_FREE;
            fsPageRemoveFromHash(pFS, pPg);
            pPg->pMappedNext = pFS->pMapped;
            pFS->pMapped = pPg;
          }
        }

        lsmFsFlushWaiting(pFS, &rc);
        pPg->flags &= ~PAGE_DIRTY;
        pFS->nWrite++;
      }
    }
  }

  return rc;
}

/*
** For non-compressed databases, this function is a no-op. For compressed
** databases, it adds a padding record to the segment passed as the third
** argument.
**
** The size of the padding records is selected so that the last byte 
** written is the last byte of a disk sector. This means that if a 
** snapshot is taken and checkpointed, subsequent worker processes will
** not write to any sector that contains checkpointed data.
*/
int lsmFsSortedPadding(
  FileSystem *pFS, 
  Snapshot *pSnapshot,
  Segment *pSeg
){
  int rc = LSM_OK;
  if( pFS->pCompress && pSeg->iFirst ){
    LsmPgno iLast2;
    LsmPgno iLast = pSeg->iLastPg;  /* Current last page of segment */
    int nPad;                       /* Bytes of padding required */
    u8 aSz[3];

    iLast2 = (1 + iLast/pFS->szSector) * pFS->szSector - 1;
    assert( fsPageToBlock(pFS, iLast)==fsPageToBlock(pFS, iLast2) );
    nPad = (int)(iLast2 - iLast);

    if( iLast2>fsLastPageOnPagesBlock(pFS, iLast) ){
      nPad -= 4;
    }
    assert( nPad>=0 );

    if( nPad>=6 ){
      pSeg->nSize += nPad;
      nPad -= 6;
      putRecordSize(aSz, nPad, 1);
      fsAppendData(pFS, pSeg, aSz, sizeof(aSz), &rc);
      memset(pFS->aOBuffer, 0, nPad);
      fsAppendData(pFS, pSeg, pFS->aOBuffer, nPad, &rc);
      fsAppendData(pFS, pSeg, aSz, sizeof(aSz), &rc);
    }else if( nPad>0 ){
      u8 aBuf[5] = {0,0,0,0,0};
      aBuf[0] = (u8)nPad;
      aBuf[nPad-1] = (u8)nPad;
      fsAppendData(pFS, pSeg, aBuf, nPad, &rc);
    }

    assert( rc!=LSM_OK 
        || pSeg->iLastPg==fsLastPageOnPagesBlock(pFS, pSeg->iLastPg)
        || ((pSeg->iLastPg + 1) % pFS->szSector)==0
    );
  }

  return rc;
}


/*
** Increment the reference count on the page object passed as the first
** argument.
*/
void lsmFsPageRef(Page *pPg){
  if( pPg ){
    pPg->nRef++;
  }
}

/*
** Release a page-reference obtained using fsPageGet().
*/
int lsmFsPageRelease(Page *pPg){
  int rc = LSM_OK;
  if( pPg ){
    assert( pPg->nRef>0 );
    pPg->nRef--;
    if( pPg->nRef==0 ){
      FileSystem *pFS = pPg->pFS;
      rc = lsmFsPagePersist(pPg);
      pFS->nOut--;

      assert( pPg->pFS->pCompress 
           || fsIsFirst(pPg->pFS, pPg->iPg)==0 
           || (pPg->flags & PAGE_HASPREV)
      );
      pPg->aData -= (pPg->flags & PAGE_HASPREV);
      pPg->flags &= ~PAGE_HASPREV;

      if( (pPg->flags & PAGE_FREE)==0 ){
        /* Removed from mapped list */
        Page **pp;
        for(pp=&pFS->pMapped; (*pp)!=pPg; pp=&(*pp)->pMappedNext);
        *pp = pPg->pMappedNext;
        pPg->pMappedNext = 0;

        /* Add to free list */
        pPg->pFreeNext = pFS->pFree;
        pFS->pFree = pPg;
      }else{
        fsPageAddToLru(pFS, pPg);
      }
    }
  }

  return rc;
}

/*
** Return the total number of pages read from the database file.
*/
int lsmFsNRead(FileSystem *pFS){ return pFS->nRead; }

/*
** Return the total number of pages written to the database file.
*/
int lsmFsNWrite(FileSystem *pFS){ return pFS->nWrite; }

/*
** Return a copy of the environment pointer used by the file-system object.
*/
lsm_env *lsmFsEnv(FileSystem *pFS){ 
  return pFS->pEnv; 
}

/*
** Return a copy of the environment pointer used by the file-system object
** to which this page belongs.
*/
lsm_env *lsmPageEnv(Page *pPg) { 
  return pPg->pFS->pEnv; 
}

/*
** Return a pointer to the file-system object associated with the Page
** passed as the only argument.
*/
FileSystem *lsmPageFS(Page *pPg){
  return pPg->pFS;
}

/*
** Return the sector-size as reported by the log file handle.
*/
int lsmFsSectorSize(FileSystem *pFS){
  return pFS->szSector;
}

/*
** Helper function for lsmInfoArrayStructure().
*/
static Segment *startsWith(Segment *pRun, LsmPgno iFirst){
  return (iFirst==pRun->iFirst) ? pRun : 0;
}

/*
** Return the segment that starts with page iFirst, if any. If no such segment
** can be found, return NULL.
*/
static Segment *findSegment(Snapshot *pWorker, LsmPgno iFirst){
  Level *pLvl;                    /* Used to iterate through db levels */
  Segment *pSeg = 0;              /* Pointer to segment to return */

  for(pLvl=lsmDbSnapshotLevel(pWorker); pLvl && pSeg==0; pLvl=pLvl->pNext){
    if( 0==(pSeg = startsWith(&pLvl->lhs, iFirst)) ){
      int i;
      for(i=0; i<pLvl->nRight; i++){
        if( (pSeg = startsWith(&pLvl->aRhs[i], iFirst)) ) break;
      }
    }
  }

  return pSeg;
}

/*
** This function implements the lsm_info(LSM_INFO_ARRAY_STRUCTURE) request.
** If successful, *pzOut is set to point to a nul-terminated string 
** containing the array structure and LSM_OK is returned. The caller should
** eventually free the string using lsmFree().
**
** If an error occurs, *pzOut is set to NULL and an LSM error code returned.
*/
int lsmInfoArrayStructure(
  lsm_db *pDb, 
  int bBlock,                     /* True for block numbers only */
  LsmPgno iFirst,
  char **pzOut
){
  int rc = LSM_OK;
  Snapshot *pWorker;              /* Worker snapshot */
  Segment *pArray = 0;            /* Array to report on */
  int bUnlock = 0;

  *pzOut = 0;
  if( iFirst==0 ) return LSM_ERROR;

  /* Obtain the worker snapshot */
  pWorker = pDb->pWorker;
  if( !pWorker ){
    rc = lsmBeginWork(pDb);
    if( rc!=LSM_OK ) return rc;
    pWorker = pDb->pWorker;
    bUnlock = 1;
  }

  /* Search for the array that starts on page iFirst */
  pArray = findSegment(pWorker, iFirst);

  if( pArray==0 ){
    /* Could not find the requested array. This is an error. */
    rc = LSM_ERROR;
  }else{
    FileSystem *pFS = pDb->pFS;
    LsmString str;
    int iBlk;
    int iLastBlk;
   
    iBlk = fsPageToBlock(pFS, pArray->iFirst);
    iLastBlk = fsPageToBlock(pFS, pArray->iLastPg);

    lsmStringInit(&str, pDb->pEnv);
    if( bBlock ){
      lsmStringAppendf(&str, "%d", iBlk);
      while( iBlk!=iLastBlk ){
        fsBlockNext(pFS, pArray, iBlk, &iBlk);
        lsmStringAppendf(&str, " %d", iBlk);
      }
    }else{
      lsmStringAppendf(&str, "%d", pArray->iFirst);
      while( iBlk!=iLastBlk ){
        lsmStringAppendf(&str, " %d", fsLastPageOnBlock(pFS, iBlk));
        fsBlockNext(pFS, pArray, iBlk, &iBlk);
        lsmStringAppendf(&str, " %d", fsFirstPageOnBlock(pFS, iBlk));
      }
      lsmStringAppendf(&str, " %d", pArray->iLastPg);
    }

    *pzOut = str.z;
  }

  if( bUnlock ){
    int rcwork = LSM_BUSY;
    lsmFinishWork(pDb, 0, &rcwork);
  }
  return rc;
}

int lsmFsSegmentContainsPg(
  FileSystem *pFS, 
  Segment *pSeg, 
  LsmPgno iPg, 
  int *pbRes
){
  Redirect *pRedir = pSeg->pRedirect;
  int rc = LSM_OK;
  int iBlk;
  int iLastBlk;
  int iPgBlock;                   /* Block containing page iPg */

  iPgBlock = fsPageToBlock(pFS, pSeg->iFirst);
  iBlk = fsRedirectBlock(pRedir, fsPageToBlock(pFS, pSeg->iFirst));
  iLastBlk = fsRedirectBlock(pRedir, fsPageToBlock(pFS, pSeg->iLastPg));

  while( iBlk!=iLastBlk && iBlk!=iPgBlock && rc==LSM_OK ){
    rc = fsBlockNext(pFS, pSeg, iBlk, &iBlk);
  }

  *pbRes = (iBlk==iPgBlock);
  return rc;
}

/*
** This function implements the lsm_info(LSM_INFO_ARRAY_PAGES) request.
** If successful, *pzOut is set to point to a nul-terminated string 
** containing the array structure and LSM_OK is returned. The caller should
** eventually free the string using lsmFree().
**
** If an error occurs, *pzOut is set to NULL and an LSM error code returned.
*/
int lsmInfoArrayPages(lsm_db *pDb, LsmPgno iFirst, char **pzOut){
  int rc = LSM_OK;
  Snapshot *pWorker;              /* Worker snapshot */
  Segment *pSeg = 0;              /* Array to report on */
  int bUnlock = 0;

  *pzOut = 0;
  if( iFirst==0 ) return LSM_ERROR;

  /* Obtain the worker snapshot */
  pWorker = pDb->pWorker;
  if( !pWorker ){
    rc = lsmBeginWork(pDb);
    if( rc!=LSM_OK ) return rc;
    pWorker = pDb->pWorker;
    bUnlock = 1;
  }

  /* Search for the array that starts on page iFirst */
  pSeg = findSegment(pWorker, iFirst);

  if( pSeg==0 ){
    /* Could not find the requested array. This is an error. */
    rc = LSM_ERROR;
  }else{
    Page *pPg = 0;
    FileSystem *pFS = pDb->pFS;
    LsmString str;

    lsmStringInit(&str, pDb->pEnv);
    rc = lsmFsDbPageGet(pFS, pSeg, iFirst, &pPg);
    while( rc==LSM_OK && pPg ){
      Page *pNext = 0;
      lsmStringAppendf(&str, " %lld", lsmFsPageNumber(pPg));
      rc = lsmFsDbPageNext(pSeg, pPg, 1, &pNext);
      lsmFsPageRelease(pPg);
      pPg = pNext;
    }

    if( rc!=LSM_OK ){
      lsmFree(pDb->pEnv, str.z);
    }else{
      *pzOut = str.z;
    }
  }

  if( bUnlock ){
    int rcwork = LSM_BUSY;
    lsmFinishWork(pDb, 0, &rcwork);
  }
  return rc;
}

/*
** The following macros are used by the integrity-check code. Associated with
** each block in the database is an 8-bit bit mask (the entry in the aUsed[]
** array). As the integrity-check meanders through the database, it sets the
** following bits to indicate how each block is used.
**
** INTEGRITY_CHECK_FIRST_PG:
**   First page of block is in use by sorted run.
**
** INTEGRITY_CHECK_LAST_PG:
**   Last page of block is in use by sorted run.
**
** INTEGRITY_CHECK_USED:
**   At least one page of the block is in use by a sorted run.
**
** INTEGRITY_CHECK_FREE:
**   The free block list contains an entry corresponding to this block.
*/
#define INTEGRITY_CHECK_FIRST_PG 0x01
#define INTEGRITY_CHECK_LAST_PG  0x02
#define INTEGRITY_CHECK_USED     0x04
#define INTEGRITY_CHECK_FREE     0x08

/*
** Helper function for lsmFsIntegrityCheck()
*/
static void checkBlocks(
  FileSystem *pFS, 
  Segment *pSeg,
  int bExtra,                     /* If true, count the "next" block if any */
  int nUsed,
  u8 *aUsed
){
  if( pSeg ){
    if( pSeg && pSeg->nSize>0 ){
      int rc;
      int iBlk;                   /* Current block (during iteration) */
      int iLastBlk;               /* Last block of segment */
      int iFirstBlk;              /* First block of segment */
      int bLastIsLastOnBlock;     /* True iLast is the last on its block */

      assert( 0==fsSegmentRedirects(pFS, pSeg) );
      iBlk = iFirstBlk = fsPageToBlock(pFS, pSeg->iFirst);
      iLastBlk = fsPageToBlock(pFS, pSeg->iLastPg);

      bLastIsLastOnBlock = (fsLastPageOnBlock(pFS, iLastBlk)==pSeg->iLastPg);
      assert( iBlk>0 );

      do {
        /* iBlk is a part of this sorted run. */
        aUsed[iBlk-1] |= INTEGRITY_CHECK_USED;

        /* If the first page of this block is also part of the segment,
        ** set the flag to indicate that the first page of iBlk is in use.  
        */
        if( fsFirstPageOnBlock(pFS, iBlk)==pSeg->iFirst || iBlk!=iFirstBlk ){
          assert( (aUsed[iBlk-1] & INTEGRITY_CHECK_FIRST_PG)==0 );
          aUsed[iBlk-1] |= INTEGRITY_CHECK_FIRST_PG;
        }

        /* Unless the sorted run finishes before the last page on this block, 
        ** the last page of this block is also in use.  */
        if( iBlk!=iLastBlk || bLastIsLastOnBlock ){
          assert( (aUsed[iBlk-1] & INTEGRITY_CHECK_LAST_PG)==0 );
          aUsed[iBlk-1] |= INTEGRITY_CHECK_LAST_PG;
        }

        /* Special case. The sorted run being scanned is the output run of
        ** a level currently undergoing an incremental merge. The sorted
        ** run ends on the last page of iBlk, but the next block has already
        ** been allocated. So mark it as in use as well.  */
        if( iBlk==iLastBlk && bLastIsLastOnBlock && bExtra ){
          int iExtra = 0;
          rc = fsBlockNext(pFS, pSeg, iBlk, &iExtra);
          assert( rc==LSM_OK );

          assert( aUsed[iExtra-1]==0 );
          aUsed[iExtra-1] |= INTEGRITY_CHECK_USED;
          aUsed[iExtra-1] |= INTEGRITY_CHECK_FIRST_PG;
          aUsed[iExtra-1] |= INTEGRITY_CHECK_LAST_PG;
        }

        /* Move on to the next block in the sorted run. Or set iBlk to zero
        ** in order to break out of the loop if this was the last block in
        ** the run.  */
        if( iBlk==iLastBlk ){
          iBlk = 0;
        }else{
          rc = fsBlockNext(pFS, pSeg, iBlk, &iBlk);
          assert( rc==LSM_OK );
        }
      }while( iBlk );
    }
  }
}

typedef struct CheckFreelistCtx CheckFreelistCtx;
struct CheckFreelistCtx {
  u8 *aUsed;
  int nBlock;
};
static int checkFreelistCb(void *pCtx, int iBlk, i64 iSnapshot){
  CheckFreelistCtx *p = (CheckFreelistCtx *)pCtx;

  assert( iBlk>=1 );
  assert( iBlk<=p->nBlock );
  assert( p->aUsed[iBlk-1]==0 );
  p->aUsed[iBlk-1] = INTEGRITY_CHECK_FREE;
  return 0;
}

/*
** This function checks that all blocks in the database file are accounted
** for. For each block, exactly one of the following must be true:
**
**   + the block is part of a sorted run, or
**   + the block is on the free-block list
**
** This function also checks that there are no references to blocks with
** out-of-range block numbers.
**
** If no errors are found, non-zero is returned. If an error is found, an
** assert() fails.
*/
int lsmFsIntegrityCheck(lsm_db *pDb){
  CheckFreelistCtx ctx;
  FileSystem *pFS = pDb->pFS;
  int i;
  int rc;
  Freelist freelist = {0, 0, 0};
  u8 *aUsed;
  Level *pLevel;
  Snapshot *pWorker = pDb->pWorker;
  int nBlock = pWorker->nBlock;

#if 0 
  static int nCall = 0;
  nCall++;
  printf("%d calls\n", nCall);
#endif

  aUsed = lsmMallocZero(pDb->pEnv, nBlock);
  if( aUsed==0 ){
    /* Malloc has failed. Since this function is only called within debug
    ** builds, this probably means the user is running an OOM injection test.
    ** Regardless, it will not be possible to run the integrity-check at this
    ** time, so assume the database is Ok and return non-zero. */
    return 1;
  }

  for(pLevel=pWorker->pLevel; pLevel; pLevel=pLevel->pNext){
    int j;
    checkBlocks(pFS, &pLevel->lhs, (pLevel->nRight!=0), nBlock, aUsed);
    for(j=0; j<pLevel->nRight; j++){
      checkBlocks(pFS, &pLevel->aRhs[j], 0, nBlock, aUsed);
    }
  }

  /* Mark all blocks in the free-list as used */
  ctx.aUsed = aUsed;
  ctx.nBlock = nBlock;
  rc = lsmWalkFreelist(pDb, 0, checkFreelistCb, (void *)&ctx);

  if( rc==LSM_OK ){
    for(i=0; i<nBlock; i++) assert( aUsed[i]!=0 );
  }

  lsmFree(pDb->pEnv, aUsed);
  lsmFree(pDb->pEnv, freelist.aEntry);

  return 1;
}

#ifndef NDEBUG
/*
** Return true if pPg happens to be the last page in segment pSeg. Or false
** otherwise. This function is only invoked as part of assert() conditions.
*/
int lsmFsDbPageIsLast(Segment *pSeg, Page *pPg){
  if( pPg->pFS->pCompress ){
    LsmPgno iNext = 0;
    int rc;
    rc = fsNextPageOffset(pPg->pFS, pSeg, pPg->iPg, pPg->nCompress+6, &iNext);
    return (rc!=LSM_OK || iNext==0);
  }
  return (pPg->iPg==pSeg->iLastPg);
}
#endif
