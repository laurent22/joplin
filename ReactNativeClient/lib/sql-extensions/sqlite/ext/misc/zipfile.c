/*
** 2017-12-26
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
** This file implements a virtual table for reading and writing ZIP archive
** files.
**
** Usage example:
**
**     SELECT name, sz, datetime(mtime,'unixepoch') FROM zipfile($filename);
**
** Current limitations:
**
**    *  No support for encryption
**    *  No support for ZIP archives spanning multiple files
**    *  No support for zip64 extensions
**    *  Only the "inflate/deflate" (zlib) compression method is supported
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <stdio.h>
#include <string.h>
#include <assert.h>

#include <zlib.h>

#ifndef SQLITE_OMIT_VIRTUALTABLE

#ifndef SQLITE_AMALGAMATION

typedef sqlite3_int64 i64;
typedef unsigned char u8;
typedef unsigned short u16;
typedef unsigned long u32;
#define MIN(a,b) ((a)<(b) ? (a) : (b))

#if defined(SQLITE_COVERAGE_TEST) || defined(SQLITE_MUTATION_TEST)
# define ALWAYS(X)      (1)
# define NEVER(X)       (0)
#elif !defined(NDEBUG)
# define ALWAYS(X)      ((X)?1:(assert(0),0))
# define NEVER(X)       ((X)?(assert(0),1):0)
#else
# define ALWAYS(X)      (X)
# define NEVER(X)       (X)
#endif

#endif   /* SQLITE_AMALGAMATION */

/*
** Definitions for mode bitmasks S_IFDIR, S_IFREG and S_IFLNK.
**
** In some ways it would be better to obtain these values from system 
** header files. But, the dependency is undesirable and (a) these
** have been stable for decades, (b) the values are part of POSIX and
** are also made explicit in [man stat], and (c) are part of the 
** file format for zip archives.
*/
#ifndef S_IFDIR
# define S_IFDIR 0040000
#endif
#ifndef S_IFREG
# define S_IFREG 0100000
#endif
#ifndef S_IFLNK
# define S_IFLNK 0120000
#endif

static const char ZIPFILE_SCHEMA[] = 
  "CREATE TABLE y("
    "name PRIMARY KEY,"  /* 0: Name of file in zip archive */
    "mode,"              /* 1: POSIX mode for file */
    "mtime,"             /* 2: Last modification time (secs since 1970)*/
    "sz,"                /* 3: Size of object */
    "rawdata,"           /* 4: Raw data */
    "data,"              /* 5: Uncompressed data */
    "method,"            /* 6: Compression method (integer) */
    "z HIDDEN"           /* 7: Name of zip file */
  ") WITHOUT ROWID;";

#define ZIPFILE_F_COLUMN_IDX 7    /* Index of column "file" in the above */
#define ZIPFILE_BUFFER_SIZE (64*1024)


/*
** Magic numbers used to read and write zip files.
**
** ZIPFILE_NEWENTRY_MADEBY:
**   Use this value for the "version-made-by" field in new zip file
**   entries. The upper byte indicates "unix", and the lower byte 
**   indicates that the zip file matches pkzip specification 3.0. 
**   This is what info-zip seems to do.
**
** ZIPFILE_NEWENTRY_REQUIRED:
**   Value for "version-required-to-extract" field of new entries.
**   Version 2.0 is required to support folders and deflate compression.
**
** ZIPFILE_NEWENTRY_FLAGS:
**   Value for "general-purpose-bit-flags" field of new entries. Bit
**   11 means "utf-8 filename and comment".
**
** ZIPFILE_SIGNATURE_CDS:
**   First 4 bytes of a valid CDS record.
**
** ZIPFILE_SIGNATURE_LFH:
**   First 4 bytes of a valid LFH record.
**
** ZIPFILE_SIGNATURE_EOCD
**   First 4 bytes of a valid EOCD record.
*/
#define ZIPFILE_EXTRA_TIMESTAMP   0x5455
#define ZIPFILE_NEWENTRY_MADEBY   ((3<<8) + 30)
#define ZIPFILE_NEWENTRY_REQUIRED 20
#define ZIPFILE_NEWENTRY_FLAGS    0x800
#define ZIPFILE_SIGNATURE_CDS     0x02014b50
#define ZIPFILE_SIGNATURE_LFH     0x04034b50
#define ZIPFILE_SIGNATURE_EOCD    0x06054b50

/*
** The sizes of the fixed-size part of each of the three main data 
** structures in a zip archive.
*/
#define ZIPFILE_LFH_FIXED_SZ      30
#define ZIPFILE_EOCD_FIXED_SZ     22
#define ZIPFILE_CDS_FIXED_SZ      46

/*
*** 4.3.16  End of central directory record:
***
***   end of central dir signature    4 bytes  (0x06054b50)
***   number of this disk             2 bytes
***   number of the disk with the
***   start of the central directory  2 bytes
***   total number of entries in the
***   central directory on this disk  2 bytes
***   total number of entries in
***   the central directory           2 bytes
***   size of the central directory   4 bytes
***   offset of start of central
***   directory with respect to
***   the starting disk number        4 bytes
***   .ZIP file comment length        2 bytes
***   .ZIP file comment       (variable size)
*/
typedef struct ZipfileEOCD ZipfileEOCD;
struct ZipfileEOCD {
  u16 iDisk;
  u16 iFirstDisk;
  u16 nEntry;
  u16 nEntryTotal;
  u32 nSize;
  u32 iOffset;
};

/*
*** 4.3.12  Central directory structure:
***
*** ...
***
***   central file header signature   4 bytes  (0x02014b50)
***   version made by                 2 bytes
***   version needed to extract       2 bytes
***   general purpose bit flag        2 bytes
***   compression method              2 bytes
***   last mod file time              2 bytes
***   last mod file date              2 bytes
***   crc-32                          4 bytes
***   compressed size                 4 bytes
***   uncompressed size               4 bytes
***   file name length                2 bytes
***   extra field length              2 bytes
***   file comment length             2 bytes
***   disk number start               2 bytes
***   internal file attributes        2 bytes
***   external file attributes        4 bytes
***   relative offset of local header 4 bytes
*/
typedef struct ZipfileCDS ZipfileCDS;
struct ZipfileCDS {
  u16 iVersionMadeBy;
  u16 iVersionExtract;
  u16 flags;
  u16 iCompression;
  u16 mTime;
  u16 mDate;
  u32 crc32;
  u32 szCompressed;
  u32 szUncompressed;
  u16 nFile;
  u16 nExtra;
  u16 nComment;
  u16 iDiskStart;
  u16 iInternalAttr;
  u32 iExternalAttr;
  u32 iOffset;
  char *zFile;                    /* Filename (sqlite3_malloc()) */
};

/*
*** 4.3.7  Local file header:
***
***   local file header signature     4 bytes  (0x04034b50)
***   version needed to extract       2 bytes
***   general purpose bit flag        2 bytes
***   compression method              2 bytes
***   last mod file time              2 bytes
***   last mod file date              2 bytes
***   crc-32                          4 bytes
***   compressed size                 4 bytes
***   uncompressed size               4 bytes
***   file name length                2 bytes
***   extra field length              2 bytes
***   
*/
typedef struct ZipfileLFH ZipfileLFH;
struct ZipfileLFH {
  u16 iVersionExtract;
  u16 flags;
  u16 iCompression;
  u16 mTime;
  u16 mDate;
  u32 crc32;
  u32 szCompressed;
  u32 szUncompressed;
  u16 nFile;
  u16 nExtra;
};

typedef struct ZipfileEntry ZipfileEntry;
struct ZipfileEntry {
  ZipfileCDS cds;            /* Parsed CDS record */
  u32 mUnixTime;             /* Modification time, in UNIX format */
  u8 *aExtra;                /* cds.nExtra+cds.nComment bytes of extra data */
  i64 iDataOff;              /* Offset to data in file (if aData==0) */
  u8 *aData;                 /* cds.szCompressed bytes of compressed data */
  ZipfileEntry *pNext;       /* Next element in in-memory CDS */
};

/* 
** Cursor type for zipfile tables.
*/
typedef struct ZipfileCsr ZipfileCsr;
struct ZipfileCsr {
  sqlite3_vtab_cursor base;  /* Base class - must be first */
  i64 iId;                   /* Cursor ID */
  u8 bEof;                   /* True when at EOF */
  u8 bNoop;                  /* If next xNext() call is no-op */

  /* Used outside of write transactions */
  FILE *pFile;               /* Zip file */
  i64 iNextOff;              /* Offset of next record in central directory */
  ZipfileEOCD eocd;          /* Parse of central directory record */

  ZipfileEntry *pFreeEntry;  /* Free this list when cursor is closed or reset */
  ZipfileEntry *pCurrent;    /* Current entry */
  ZipfileCsr *pCsrNext;      /* Next cursor on same virtual table */
};

typedef struct ZipfileTab ZipfileTab;
struct ZipfileTab {
  sqlite3_vtab base;         /* Base class - must be first */
  char *zFile;               /* Zip file this table accesses (may be NULL) */
  sqlite3 *db;               /* Host database connection */
  u8 *aBuffer;               /* Temporary buffer used for various tasks */

  ZipfileCsr *pCsrList;      /* List of cursors */
  i64 iNextCsrid;

  /* The following are used by write transactions only */
  ZipfileEntry *pFirstEntry; /* Linked list of all files (if pWriteFd!=0) */
  ZipfileEntry *pLastEntry;  /* Last element in pFirstEntry list */
  FILE *pWriteFd;            /* File handle open on zip archive */
  i64 szCurrent;             /* Current size of zip archive */
  i64 szOrig;                /* Size of archive at start of transaction */
};

/*
** Set the error message contained in context ctx to the results of
** vprintf(zFmt, ...).
*/
static void zipfileCtxErrorMsg(sqlite3_context *ctx, const char *zFmt, ...){
  char *zMsg = 0;
  va_list ap;
  va_start(ap, zFmt);
  zMsg = sqlite3_vmprintf(zFmt, ap);
  sqlite3_result_error(ctx, zMsg, -1);
  sqlite3_free(zMsg);
  va_end(ap);
}

/*
** If string zIn is quoted, dequote it in place. Otherwise, if the string
** is not quoted, do nothing.
*/
static void zipfileDequote(char *zIn){
  char q = zIn[0];
  if( q=='"' || q=='\'' || q=='`' || q=='[' ){
    int iIn = 1;
    int iOut = 0;
    if( q=='[' ) q = ']';
    while( ALWAYS(zIn[iIn]) ){
      char c = zIn[iIn++];
      if( c==q && zIn[iIn++]!=q ) break;
      zIn[iOut++] = c;
    }
    zIn[iOut] = '\0';
  }
}

/*
** Construct a new ZipfileTab virtual table object.
** 
**   argv[0]   -> module name  ("zipfile")
**   argv[1]   -> database name
**   argv[2]   -> table name
**   argv[...] -> "column name" and other module argument fields.
*/
static int zipfileConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  int nByte = sizeof(ZipfileTab) + ZIPFILE_BUFFER_SIZE;
  int nFile = 0;
  const char *zFile = 0;
  ZipfileTab *pNew = 0;
  int rc;

  /* If the table name is not "zipfile", require that the argument be
  ** specified. This stops zipfile tables from being created as:
  **
  **   CREATE VIRTUAL TABLE zzz USING zipfile();
  **
  ** It does not prevent:
  **
  **   CREATE VIRTUAL TABLE zipfile USING zipfile();
  */
  assert( 0==sqlite3_stricmp(argv[0], "zipfile") );
  if( (0!=sqlite3_stricmp(argv[2], "zipfile") && argc<4) || argc>4 ){
    *pzErr = sqlite3_mprintf("zipfile constructor requires one argument");
    return SQLITE_ERROR;
  }

  if( argc>3 ){
    zFile = argv[3];
    nFile = (int)strlen(zFile)+1;
  }

  rc = sqlite3_declare_vtab(db, ZIPFILE_SCHEMA);
  if( rc==SQLITE_OK ){
    pNew = (ZipfileTab*)sqlite3_malloc64((sqlite3_int64)nByte+nFile);
    if( pNew==0 ) return SQLITE_NOMEM;
    memset(pNew, 0, nByte+nFile);
    pNew->db = db;
    pNew->aBuffer = (u8*)&pNew[1];
    if( zFile ){
      pNew->zFile = (char*)&pNew->aBuffer[ZIPFILE_BUFFER_SIZE];
      memcpy(pNew->zFile, zFile, nFile);
      zipfileDequote(pNew->zFile);
    }
  }
  sqlite3_vtab_config(db, SQLITE_VTAB_DIRECTONLY);
  *ppVtab = (sqlite3_vtab*)pNew;
  return rc;
}

/*
** Free the ZipfileEntry structure indicated by the only argument.
*/
static void zipfileEntryFree(ZipfileEntry *p){
  if( p ){
    sqlite3_free(p->cds.zFile);
    sqlite3_free(p);
  }
}

/*
** Release resources that should be freed at the end of a write 
** transaction.
*/
static void zipfileCleanupTransaction(ZipfileTab *pTab){
  ZipfileEntry *pEntry;
  ZipfileEntry *pNext;

  if( pTab->pWriteFd ){
    fclose(pTab->pWriteFd);
    pTab->pWriteFd = 0;
  }
  for(pEntry=pTab->pFirstEntry; pEntry; pEntry=pNext){
    pNext = pEntry->pNext;
    zipfileEntryFree(pEntry);
  }
  pTab->pFirstEntry = 0;
  pTab->pLastEntry = 0;
  pTab->szCurrent = 0;
  pTab->szOrig = 0;
}

/*
** This method is the destructor for zipfile vtab objects.
*/
static int zipfileDisconnect(sqlite3_vtab *pVtab){
  zipfileCleanupTransaction((ZipfileTab*)pVtab);
  sqlite3_free(pVtab);
  return SQLITE_OK;
}

/*
** Constructor for a new ZipfileCsr object.
*/
static int zipfileOpen(sqlite3_vtab *p, sqlite3_vtab_cursor **ppCsr){
  ZipfileTab *pTab = (ZipfileTab*)p;
  ZipfileCsr *pCsr;
  pCsr = sqlite3_malloc(sizeof(*pCsr));
  *ppCsr = (sqlite3_vtab_cursor*)pCsr;
  if( pCsr==0 ){
    return SQLITE_NOMEM;
  }
  memset(pCsr, 0, sizeof(*pCsr));
  pCsr->iId = ++pTab->iNextCsrid;
  pCsr->pCsrNext = pTab->pCsrList;
  pTab->pCsrList = pCsr;
  return SQLITE_OK;
}

/*
** Reset a cursor back to the state it was in when first returned
** by zipfileOpen().
*/
static void zipfileResetCursor(ZipfileCsr *pCsr){
  ZipfileEntry *p;
  ZipfileEntry *pNext;

  pCsr->bEof = 0;
  if( pCsr->pFile ){
    fclose(pCsr->pFile);
    pCsr->pFile = 0;
    zipfileEntryFree(pCsr->pCurrent);
    pCsr->pCurrent = 0;
  }

  for(p=pCsr->pFreeEntry; p; p=pNext){
    pNext = p->pNext;
    zipfileEntryFree(p);
  }
}

/*
** Destructor for an ZipfileCsr.
*/
static int zipfileClose(sqlite3_vtab_cursor *cur){
  ZipfileCsr *pCsr = (ZipfileCsr*)cur;
  ZipfileTab *pTab = (ZipfileTab*)(pCsr->base.pVtab);
  ZipfileCsr **pp;
  zipfileResetCursor(pCsr);

  /* Remove this cursor from the ZipfileTab.pCsrList list. */
  for(pp=&pTab->pCsrList; *pp!=pCsr; pp=&((*pp)->pCsrNext));
  *pp = pCsr->pCsrNext;

  sqlite3_free(pCsr);
  return SQLITE_OK;
}

/*
** Set the error message for the virtual table associated with cursor
** pCsr to the results of vprintf(zFmt, ...).
*/
static void zipfileTableErr(ZipfileTab *pTab, const char *zFmt, ...){
  va_list ap;
  va_start(ap, zFmt);
  sqlite3_free(pTab->base.zErrMsg);
  pTab->base.zErrMsg = sqlite3_vmprintf(zFmt, ap);
  va_end(ap);
}
static void zipfileCursorErr(ZipfileCsr *pCsr, const char *zFmt, ...){
  va_list ap;
  va_start(ap, zFmt);
  sqlite3_free(pCsr->base.pVtab->zErrMsg);
  pCsr->base.pVtab->zErrMsg = sqlite3_vmprintf(zFmt, ap);
  va_end(ap);
}

/*
** Read nRead bytes of data from offset iOff of file pFile into buffer
** aRead[]. Return SQLITE_OK if successful, or an SQLite error code
** otherwise. 
**
** If an error does occur, output variable (*pzErrmsg) may be set to point
** to an English language error message. It is the responsibility of the
** caller to eventually free this buffer using
** sqlite3_free().
*/
static int zipfileReadData(
  FILE *pFile,                    /* Read from this file */
  u8 *aRead,                      /* Read into this buffer */
  int nRead,                      /* Number of bytes to read */
  i64 iOff,                       /* Offset to read from */
  char **pzErrmsg                 /* OUT: Error message (from sqlite3_malloc) */
){
  size_t n;
  fseek(pFile, (long)iOff, SEEK_SET);
  n = fread(aRead, 1, nRead, pFile);
  if( (int)n!=nRead ){
    *pzErrmsg = sqlite3_mprintf("error in fread()");
    return SQLITE_ERROR;
  }
  return SQLITE_OK;
}

static int zipfileAppendData(
  ZipfileTab *pTab,
  const u8 *aWrite,
  int nWrite
){
  size_t n;
  fseek(pTab->pWriteFd, (long)pTab->szCurrent, SEEK_SET);
  n = fwrite(aWrite, 1, nWrite, pTab->pWriteFd);
  if( (int)n!=nWrite ){
    pTab->base.zErrMsg = sqlite3_mprintf("error in fwrite()");
    return SQLITE_ERROR;
  }
  pTab->szCurrent += nWrite;
  return SQLITE_OK;
}

/*
** Read and return a 16-bit little-endian unsigned integer from buffer aBuf.
*/
static u16 zipfileGetU16(const u8 *aBuf){
  return (aBuf[1] << 8) + aBuf[0];
}

/*
** Read and return a 32-bit little-endian unsigned integer from buffer aBuf.
*/
static u32 zipfileGetU32(const u8 *aBuf){
  return ((u32)(aBuf[3]) << 24)
       + ((u32)(aBuf[2]) << 16)
       + ((u32)(aBuf[1]) <<  8)
       + ((u32)(aBuf[0]) <<  0);
}

/*
** Write a 16-bit little endiate integer into buffer aBuf.
*/
static void zipfilePutU16(u8 *aBuf, u16 val){
  aBuf[0] = val & 0xFF;
  aBuf[1] = (val>>8) & 0xFF;
}

/*
** Write a 32-bit little endiate integer into buffer aBuf.
*/
static void zipfilePutU32(u8 *aBuf, u32 val){
  aBuf[0] = val & 0xFF;
  aBuf[1] = (val>>8) & 0xFF;
  aBuf[2] = (val>>16) & 0xFF;
  aBuf[3] = (val>>24) & 0xFF;
}

#define zipfileRead32(aBuf) ( aBuf+=4, zipfileGetU32(aBuf-4) )
#define zipfileRead16(aBuf) ( aBuf+=2, zipfileGetU16(aBuf-2) )

#define zipfileWrite32(aBuf,val) { zipfilePutU32(aBuf,val); aBuf+=4; }
#define zipfileWrite16(aBuf,val) { zipfilePutU16(aBuf,val); aBuf+=2; }

/*
** Magic numbers used to read CDS records.
*/
#define ZIPFILE_CDS_NFILE_OFF        28
#define ZIPFILE_CDS_SZCOMPRESSED_OFF 20

/*
** Decode the CDS record in buffer aBuf into (*pCDS). Return SQLITE_ERROR
** if the record is not well-formed, or SQLITE_OK otherwise.
*/
static int zipfileReadCDS(u8 *aBuf, ZipfileCDS *pCDS){
  u8 *aRead = aBuf;
  u32 sig = zipfileRead32(aRead);
  int rc = SQLITE_OK;
  if( sig!=ZIPFILE_SIGNATURE_CDS ){
    rc = SQLITE_ERROR;
  }else{
    pCDS->iVersionMadeBy = zipfileRead16(aRead);
    pCDS->iVersionExtract = zipfileRead16(aRead);
    pCDS->flags = zipfileRead16(aRead);
    pCDS->iCompression = zipfileRead16(aRead);
    pCDS->mTime = zipfileRead16(aRead);
    pCDS->mDate = zipfileRead16(aRead);
    pCDS->crc32 = zipfileRead32(aRead);
    pCDS->szCompressed = zipfileRead32(aRead);
    pCDS->szUncompressed = zipfileRead32(aRead);
    assert( aRead==&aBuf[ZIPFILE_CDS_NFILE_OFF] );
    pCDS->nFile = zipfileRead16(aRead);
    pCDS->nExtra = zipfileRead16(aRead);
    pCDS->nComment = zipfileRead16(aRead);
    pCDS->iDiskStart = zipfileRead16(aRead);
    pCDS->iInternalAttr = zipfileRead16(aRead);
    pCDS->iExternalAttr = zipfileRead32(aRead);
    pCDS->iOffset = zipfileRead32(aRead);
    assert( aRead==&aBuf[ZIPFILE_CDS_FIXED_SZ] );
  }

  return rc;
}

/*
** Decode the LFH record in buffer aBuf into (*pLFH). Return SQLITE_ERROR
** if the record is not well-formed, or SQLITE_OK otherwise.
*/
static int zipfileReadLFH(
  u8 *aBuffer,
  ZipfileLFH *pLFH
){
  u8 *aRead = aBuffer;
  int rc = SQLITE_OK;

  u32 sig = zipfileRead32(aRead);
  if( sig!=ZIPFILE_SIGNATURE_LFH ){
    rc = SQLITE_ERROR;
  }else{
    pLFH->iVersionExtract = zipfileRead16(aRead);
    pLFH->flags = zipfileRead16(aRead);
    pLFH->iCompression = zipfileRead16(aRead);
    pLFH->mTime = zipfileRead16(aRead);
    pLFH->mDate = zipfileRead16(aRead);
    pLFH->crc32 = zipfileRead32(aRead);
    pLFH->szCompressed = zipfileRead32(aRead);
    pLFH->szUncompressed = zipfileRead32(aRead);
    pLFH->nFile = zipfileRead16(aRead);
    pLFH->nExtra = zipfileRead16(aRead);
  }
  return rc;
}


/*
** Buffer aExtra (size nExtra bytes) contains zip archive "extra" fields.
** Scan through this buffer to find an "extra-timestamp" field. If one
** exists, extract the 32-bit modification-timestamp from it and store
** the value in output parameter *pmTime.
**
** Zero is returned if no extra-timestamp record could be found (and so
** *pmTime is left unchanged), or non-zero otherwise.
**
** The general format of an extra field is:
**
**   Header ID    2 bytes
**   Data Size    2 bytes
**   Data         N bytes
*/
static int zipfileScanExtra(u8 *aExtra, int nExtra, u32 *pmTime){
  int ret = 0;
  u8 *p = aExtra;
  u8 *pEnd = &aExtra[nExtra];

  while( p<pEnd ){
    u16 id = zipfileRead16(p);
    u16 nByte = zipfileRead16(p);

    switch( id ){
      case ZIPFILE_EXTRA_TIMESTAMP: {
        u8 b = p[0];
        if( b & 0x01 ){     /* 0x01 -> modtime is present */
          *pmTime = zipfileGetU32(&p[1]);
          ret = 1;
        }
        break;
      }
    }

    p += nByte;
  }
  return ret;
}

/*
** Convert the standard MS-DOS timestamp stored in the mTime and mDate
** fields of the CDS structure passed as the only argument to a 32-bit
** UNIX seconds-since-the-epoch timestamp. Return the result.
**
** "Standard" MS-DOS time format:
**
**   File modification time:
**     Bits 00-04: seconds divided by 2
**     Bits 05-10: minute
**     Bits 11-15: hour
**   File modification date:
**     Bits 00-04: day
**     Bits 05-08: month (1-12)
**     Bits 09-15: years from 1980 
**
** https://msdn.microsoft.com/en-us/library/9kkf9tah.aspx
*/
static u32 zipfileMtime(ZipfileCDS *pCDS){
  int Y = (1980 + ((pCDS->mDate >> 9) & 0x7F));
  int M = ((pCDS->mDate >> 5) & 0x0F);
  int D = (pCDS->mDate & 0x1F);
  int B = -13;

  int sec = (pCDS->mTime & 0x1F)*2;
  int min = (pCDS->mTime >> 5) & 0x3F;
  int hr = (pCDS->mTime >> 11) & 0x1F;
  i64 JD;

  /* JD = INT(365.25 * (Y+4716)) + INT(30.6001 * (M+1)) + D + B - 1524.5 */

  /* Calculate the JD in seconds for noon on the day in question */
  if( M<3 ){
    Y = Y-1;
    M = M+12;
  }
  JD = (i64)(24*60*60) * (
      (int)(365.25 * (Y + 4716))
    + (int)(30.6001 * (M + 1))
    + D + B - 1524
  );

  /* Correct the JD for the time within the day */
  JD += (hr-12) * 3600 + min * 60 + sec;

  /* Convert JD to unix timestamp (the JD epoch is 2440587.5) */
  return (u32)(JD - (i64)(24405875) * 24*60*6);
}

/*
** The opposite of zipfileMtime(). This function populates the mTime and
** mDate fields of the CDS structure passed as the first argument according
** to the UNIX timestamp value passed as the second.
*/
static void zipfileMtimeToDos(ZipfileCDS *pCds, u32 mUnixTime){
  /* Convert unix timestamp to JD (2440588 is noon on 1/1/1970) */
  i64 JD = (i64)2440588 + mUnixTime / (24*60*60);

  int A, B, C, D, E;
  int yr, mon, day;
  int hr, min, sec;

  A = (int)((JD - 1867216.25)/36524.25);
  A = (int)(JD + 1 + A - (A/4));
  B = A + 1524;
  C = (int)((B - 122.1)/365.25);
  D = (36525*(C&32767))/100;
  E = (int)((B-D)/30.6001);

  day = B - D - (int)(30.6001*E);
  mon = (E<14 ? E-1 : E-13);
  yr = mon>2 ? C-4716 : C-4715;

  hr = (mUnixTime % (24*60*60)) / (60*60);
  min = (mUnixTime % (60*60)) / 60;
  sec = (mUnixTime % 60);

  if( yr>=1980 ){
    pCds->mDate = (u16)(day + (mon << 5) + ((yr-1980) << 9));
    pCds->mTime = (u16)(sec/2 + (min<<5) + (hr<<11));
  }else{
    pCds->mDate = pCds->mTime = 0;
  }

  assert( mUnixTime<315507600 
       || mUnixTime==zipfileMtime(pCds) 
       || ((mUnixTime % 2) && mUnixTime-1==zipfileMtime(pCds)) 
       /* || (mUnixTime % 2) */
  );
}

/*
** If aBlob is not NULL, then it is a pointer to a buffer (nBlob bytes in
** size) containing an entire zip archive image. Or, if aBlob is NULL,
** then pFile is a file-handle open on a zip file. In either case, this
** function creates a ZipfileEntry object based on the zip archive entry
** for which the CDS record is at offset iOff.
**
** If successful, SQLITE_OK is returned and (*ppEntry) set to point to
** the new object. Otherwise, an SQLite error code is returned and the
** final value of (*ppEntry) undefined.
*/
static int zipfileGetEntry(
  ZipfileTab *pTab,               /* Store any error message here */
  const u8 *aBlob,                /* Pointer to in-memory file image */
  int nBlob,                      /* Size of aBlob[] in bytes */
  FILE *pFile,                    /* If aBlob==0, read from this file */
  i64 iOff,                       /* Offset of CDS record */
  ZipfileEntry **ppEntry          /* OUT: Pointer to new object */
){
  u8 *aRead;
  char **pzErr = &pTab->base.zErrMsg;
  int rc = SQLITE_OK;

  if( aBlob==0 ){
    aRead = pTab->aBuffer;
    rc = zipfileReadData(pFile, aRead, ZIPFILE_CDS_FIXED_SZ, iOff, pzErr);
  }else{
    aRead = (u8*)&aBlob[iOff];
  }

  if( rc==SQLITE_OK ){
    sqlite3_int64 nAlloc;
    ZipfileEntry *pNew;

    int nFile = zipfileGetU16(&aRead[ZIPFILE_CDS_NFILE_OFF]);
    int nExtra = zipfileGetU16(&aRead[ZIPFILE_CDS_NFILE_OFF+2]);
    nExtra += zipfileGetU16(&aRead[ZIPFILE_CDS_NFILE_OFF+4]);

    nAlloc = sizeof(ZipfileEntry) + nExtra;
    if( aBlob ){
      nAlloc += zipfileGetU32(&aRead[ZIPFILE_CDS_SZCOMPRESSED_OFF]);
    }

    pNew = (ZipfileEntry*)sqlite3_malloc64(nAlloc);
    if( pNew==0 ){
      rc = SQLITE_NOMEM;
    }else{
      memset(pNew, 0, sizeof(ZipfileEntry));
      rc = zipfileReadCDS(aRead, &pNew->cds);
      if( rc!=SQLITE_OK ){
        *pzErr = sqlite3_mprintf("failed to read CDS at offset %lld", iOff);
      }else if( aBlob==0 ){
        rc = zipfileReadData(
            pFile, aRead, nExtra+nFile, iOff+ZIPFILE_CDS_FIXED_SZ, pzErr
        );
      }else{
        aRead = (u8*)&aBlob[iOff + ZIPFILE_CDS_FIXED_SZ];
      }
    }

    if( rc==SQLITE_OK ){
      u32 *pt = &pNew->mUnixTime;
      pNew->cds.zFile = sqlite3_mprintf("%.*s", nFile, aRead); 
      pNew->aExtra = (u8*)&pNew[1];
      memcpy(pNew->aExtra, &aRead[nFile], nExtra);
      if( pNew->cds.zFile==0 ){
        rc = SQLITE_NOMEM;
      }else if( 0==zipfileScanExtra(&aRead[nFile], pNew->cds.nExtra, pt) ){
        pNew->mUnixTime = zipfileMtime(&pNew->cds);
      }
    }

    if( rc==SQLITE_OK ){
      static const int szFix = ZIPFILE_LFH_FIXED_SZ;
      ZipfileLFH lfh;
      if( pFile ){
        rc = zipfileReadData(pFile, aRead, szFix, pNew->cds.iOffset, pzErr);
      }else{
        aRead = (u8*)&aBlob[pNew->cds.iOffset];
      }

      rc = zipfileReadLFH(aRead, &lfh);
      if( rc==SQLITE_OK ){
        pNew->iDataOff =  pNew->cds.iOffset + ZIPFILE_LFH_FIXED_SZ;
        pNew->iDataOff += lfh.nFile + lfh.nExtra;
        if( aBlob && pNew->cds.szCompressed ){
          pNew->aData = &pNew->aExtra[nExtra];
          memcpy(pNew->aData, &aBlob[pNew->iDataOff], pNew->cds.szCompressed);
        }
      }else{
        *pzErr = sqlite3_mprintf("failed to read LFH at offset %d", 
            (int)pNew->cds.iOffset
        );
      }
    }

    if( rc!=SQLITE_OK ){
      zipfileEntryFree(pNew);
    }else{
      *ppEntry = pNew;
    }
  }

  return rc;
}

/*
** Advance an ZipfileCsr to its next row of output.
*/
static int zipfileNext(sqlite3_vtab_cursor *cur){
  ZipfileCsr *pCsr = (ZipfileCsr*)cur;
  int rc = SQLITE_OK;

  if( pCsr->pFile ){
    i64 iEof = pCsr->eocd.iOffset + pCsr->eocd.nSize;
    zipfileEntryFree(pCsr->pCurrent);
    pCsr->pCurrent = 0;
    if( pCsr->iNextOff>=iEof ){
      pCsr->bEof = 1;
    }else{
      ZipfileEntry *p = 0;
      ZipfileTab *pTab = (ZipfileTab*)(cur->pVtab);
      rc = zipfileGetEntry(pTab, 0, 0, pCsr->pFile, pCsr->iNextOff, &p);
      if( rc==SQLITE_OK ){
        pCsr->iNextOff += ZIPFILE_CDS_FIXED_SZ;
        pCsr->iNextOff += (int)p->cds.nExtra + p->cds.nFile + p->cds.nComment;
      }
      pCsr->pCurrent = p;
    }
  }else{
    if( !pCsr->bNoop ){
      pCsr->pCurrent = pCsr->pCurrent->pNext;
    }
    if( pCsr->pCurrent==0 ){
      pCsr->bEof = 1;
    }
  }

  pCsr->bNoop = 0;
  return rc;
}

static void zipfileFree(void *p) { 
  sqlite3_free(p); 
}

/*
** Buffer aIn (size nIn bytes) contains compressed data. Uncompressed, the
** size is nOut bytes. This function uncompresses the data and sets the
** return value in context pCtx to the result (a blob).
**
** If an error occurs, an error code is left in pCtx instead.
*/
static void zipfileInflate(
  sqlite3_context *pCtx,          /* Store result here */
  const u8 *aIn,                  /* Compressed data */
  int nIn,                        /* Size of buffer aIn[] in bytes */
  int nOut                        /* Expected output size */
){
  u8 *aRes = sqlite3_malloc(nOut);
  if( aRes==0 ){
    sqlite3_result_error_nomem(pCtx);
  }else{
    int err;
    z_stream str;
    memset(&str, 0, sizeof(str));

    str.next_in = (Byte*)aIn;
    str.avail_in = nIn;
    str.next_out = (Byte*)aRes;
    str.avail_out = nOut;

    err = inflateInit2(&str, -15);
    if( err!=Z_OK ){
      zipfileCtxErrorMsg(pCtx, "inflateInit2() failed (%d)", err);
    }else{
      err = inflate(&str, Z_NO_FLUSH);
      if( err!=Z_STREAM_END ){
        zipfileCtxErrorMsg(pCtx, "inflate() failed (%d)", err);
      }else{
        sqlite3_result_blob(pCtx, aRes, nOut, zipfileFree);
        aRes = 0;
      }
    }
    sqlite3_free(aRes);
    inflateEnd(&str);
  }
}

/*
** Buffer aIn (size nIn bytes) contains uncompressed data. This function
** compresses it and sets (*ppOut) to point to a buffer containing the
** compressed data. The caller is responsible for eventually calling
** sqlite3_free() to release buffer (*ppOut). Before returning, (*pnOut) 
** is set to the size of buffer (*ppOut) in bytes.
**
** If no error occurs, SQLITE_OK is returned. Otherwise, an SQLite error
** code is returned and an error message left in virtual-table handle
** pTab. The values of (*ppOut) and (*pnOut) are left unchanged in this
** case.
*/
static int zipfileDeflate(
  const u8 *aIn, int nIn,         /* Input */
  u8 **ppOut, int *pnOut,         /* Output */
  char **pzErr                    /* OUT: Error message */
){
  int rc = SQLITE_OK;
  sqlite3_int64 nAlloc;
  z_stream str;
  u8 *aOut;

  memset(&str, 0, sizeof(str));
  str.next_in = (Bytef*)aIn;
  str.avail_in = nIn;
  deflateInit2(&str, 9, Z_DEFLATED, -15, 8, Z_DEFAULT_STRATEGY);

  nAlloc = deflateBound(&str, nIn);
  aOut = (u8*)sqlite3_malloc64(nAlloc);
  if( aOut==0 ){
    rc = SQLITE_NOMEM;
  }else{
    int res;
    str.next_out = aOut;
    str.avail_out = nAlloc;
    res = deflate(&str, Z_FINISH);
    if( res==Z_STREAM_END ){
      *ppOut = aOut;
      *pnOut = (int)str.total_out;
    }else{
      sqlite3_free(aOut);
      *pzErr = sqlite3_mprintf("zipfile: deflate() error");
      rc = SQLITE_ERROR;
    }
    deflateEnd(&str);
  }

  return rc;
}


/*
** Return values of columns for the row at which the series_cursor
** is currently pointing.
*/
static int zipfileColumn(
  sqlite3_vtab_cursor *cur,   /* The cursor */
  sqlite3_context *ctx,       /* First argument to sqlite3_result_...() */
  int i                       /* Which column to return */
){
  ZipfileCsr *pCsr = (ZipfileCsr*)cur;
  ZipfileCDS *pCDS = &pCsr->pCurrent->cds;
  int rc = SQLITE_OK;
  switch( i ){
    case 0:   /* name */
      sqlite3_result_text(ctx, pCDS->zFile, -1, SQLITE_TRANSIENT);
      break;
    case 1:   /* mode */
      /* TODO: Whether or not the following is correct surely depends on
      ** the platform on which the archive was created.  */
      sqlite3_result_int(ctx, pCDS->iExternalAttr >> 16);
      break;
    case 2: { /* mtime */
      sqlite3_result_int64(ctx, pCsr->pCurrent->mUnixTime);
      break;
    }
    case 3: { /* sz */
      if( sqlite3_vtab_nochange(ctx)==0 ){
        sqlite3_result_int64(ctx, pCDS->szUncompressed);
      }
      break;
    }
    case 4:   /* rawdata */
      if( sqlite3_vtab_nochange(ctx) ) break;
    case 5: { /* data */
      if( i==4 || pCDS->iCompression==0 || pCDS->iCompression==8 ){
        int sz = pCDS->szCompressed;
        int szFinal = pCDS->szUncompressed;
        if( szFinal>0 ){
          u8 *aBuf;
          u8 *aFree = 0;
          if( pCsr->pCurrent->aData ){
            aBuf = pCsr->pCurrent->aData;
          }else{
            aBuf = aFree = sqlite3_malloc64(sz);
            if( aBuf==0 ){
              rc = SQLITE_NOMEM;
            }else{
              FILE *pFile = pCsr->pFile;
              if( pFile==0 ){
                pFile = ((ZipfileTab*)(pCsr->base.pVtab))->pWriteFd;
              }
              rc = zipfileReadData(pFile, aBuf, sz, pCsr->pCurrent->iDataOff,
                  &pCsr->base.pVtab->zErrMsg
              );
            }
          }
          if( rc==SQLITE_OK ){
            if( i==5 && pCDS->iCompression ){
              zipfileInflate(ctx, aBuf, sz, szFinal);
            }else{
              sqlite3_result_blob(ctx, aBuf, sz, SQLITE_TRANSIENT);
            }
          }
          sqlite3_free(aFree);
        }else{
          /* Figure out if this is a directory or a zero-sized file. Consider
          ** it to be a directory either if the mode suggests so, or if
          ** the final character in the name is '/'.  */
          u32 mode = pCDS->iExternalAttr >> 16;
          if( !(mode & S_IFDIR) && pCDS->zFile[pCDS->nFile-1]!='/' ){
            sqlite3_result_blob(ctx, "", 0, SQLITE_STATIC);
          }
        }
      }
      break;
    }
    case 6:   /* method */
      sqlite3_result_int(ctx, pCDS->iCompression);
      break;
    default:  /* z */
      assert( i==7 );
      sqlite3_result_int64(ctx, pCsr->iId);
      break;
  }

  return rc;
}

/*
** Return TRUE if the cursor is at EOF.
*/
static int zipfileEof(sqlite3_vtab_cursor *cur){
  ZipfileCsr *pCsr = (ZipfileCsr*)cur;
  return pCsr->bEof;
}

/*
** If aBlob is not NULL, then it points to a buffer nBlob bytes in size
** containing an entire zip archive image. Or, if aBlob is NULL, then pFile
** is guaranteed to be a file-handle open on a zip file.
**
** This function attempts to locate the EOCD record within the zip archive
** and populate *pEOCD with the results of decoding it. SQLITE_OK is
** returned if successful. Otherwise, an SQLite error code is returned and
** an English language error message may be left in virtual-table pTab.
*/
static int zipfileReadEOCD(
  ZipfileTab *pTab,               /* Return errors here */
  const u8 *aBlob,                /* Pointer to in-memory file image */
  int nBlob,                      /* Size of aBlob[] in bytes */
  FILE *pFile,                    /* Read from this file if aBlob==0 */
  ZipfileEOCD *pEOCD              /* Object to populate */
){
  u8 *aRead = pTab->aBuffer;      /* Temporary buffer */
  int nRead;                      /* Bytes to read from file */
  int rc = SQLITE_OK;

  if( aBlob==0 ){
    i64 iOff;                     /* Offset to read from */
    i64 szFile;                   /* Total size of file in bytes */
    fseek(pFile, 0, SEEK_END);
    szFile = (i64)ftell(pFile);
    if( szFile==0 ){
      memset(pEOCD, 0, sizeof(ZipfileEOCD));
      return SQLITE_OK;
    }
    nRead = (int)(MIN(szFile, ZIPFILE_BUFFER_SIZE));
    iOff = szFile - nRead;
    rc = zipfileReadData(pFile, aRead, nRead, iOff, &pTab->base.zErrMsg);
  }else{
    nRead = (int)(MIN(nBlob, ZIPFILE_BUFFER_SIZE));
    aRead = (u8*)&aBlob[nBlob-nRead];
  }

  if( rc==SQLITE_OK ){
    int i;

    /* Scan backwards looking for the signature bytes */
    for(i=nRead-20; i>=0; i--){
      if( aRead[i]==0x50 && aRead[i+1]==0x4b 
       && aRead[i+2]==0x05 && aRead[i+3]==0x06 
      ){
        break;
      }
    }
    if( i<0 ){
      pTab->base.zErrMsg = sqlite3_mprintf(
          "cannot find end of central directory record"
      );
      return SQLITE_ERROR;
    }

    aRead += i+4;
    pEOCD->iDisk = zipfileRead16(aRead);
    pEOCD->iFirstDisk = zipfileRead16(aRead);
    pEOCD->nEntry = zipfileRead16(aRead);
    pEOCD->nEntryTotal = zipfileRead16(aRead);
    pEOCD->nSize = zipfileRead32(aRead);
    pEOCD->iOffset = zipfileRead32(aRead);
  }

  return rc;
}

/*
** Add object pNew to the linked list that begins at ZipfileTab.pFirstEntry 
** and ends with pLastEntry. If argument pBefore is NULL, then pNew is added
** to the end of the list. Otherwise, it is added to the list immediately
** before pBefore (which is guaranteed to be a part of said list).
*/
static void zipfileAddEntry(
  ZipfileTab *pTab, 
  ZipfileEntry *pBefore, 
  ZipfileEntry *pNew
){
  assert( (pTab->pFirstEntry==0)==(pTab->pLastEntry==0) );
  assert( pNew->pNext==0 );
  if( pBefore==0 ){
    if( pTab->pFirstEntry==0 ){
      pTab->pFirstEntry = pTab->pLastEntry = pNew;
    }else{
      assert( pTab->pLastEntry->pNext==0 );
      pTab->pLastEntry->pNext = pNew;
      pTab->pLastEntry = pNew;
    }
  }else{
    ZipfileEntry **pp;
    for(pp=&pTab->pFirstEntry; *pp!=pBefore; pp=&((*pp)->pNext));
    pNew->pNext = pBefore;
    *pp = pNew;
  }
}

static int zipfileLoadDirectory(ZipfileTab *pTab, const u8 *aBlob, int nBlob){
  ZipfileEOCD eocd;
  int rc;
  int i;
  i64 iOff;

  rc = zipfileReadEOCD(pTab, aBlob, nBlob, pTab->pWriteFd, &eocd);
  iOff = eocd.iOffset;
  for(i=0; rc==SQLITE_OK && i<eocd.nEntry; i++){
    ZipfileEntry *pNew = 0;
    rc = zipfileGetEntry(pTab, aBlob, nBlob, pTab->pWriteFd, iOff, &pNew);

    if( rc==SQLITE_OK ){
      zipfileAddEntry(pTab, 0, pNew);
      iOff += ZIPFILE_CDS_FIXED_SZ;
      iOff += (int)pNew->cds.nExtra + pNew->cds.nFile + pNew->cds.nComment;
    }
  }
  return rc;
}

/*
** xFilter callback.
*/
static int zipfileFilter(
  sqlite3_vtab_cursor *cur, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  ZipfileTab *pTab = (ZipfileTab*)cur->pVtab;
  ZipfileCsr *pCsr = (ZipfileCsr*)cur;
  const char *zFile = 0;          /* Zip file to scan */
  int rc = SQLITE_OK;             /* Return Code */
  int bInMemory = 0;              /* True for an in-memory zipfile */

  zipfileResetCursor(pCsr);

  if( pTab->zFile ){
    zFile = pTab->zFile;
  }else if( idxNum==0 ){
    zipfileCursorErr(pCsr, "zipfile() function requires an argument");
    return SQLITE_ERROR;
  }else if( sqlite3_value_type(argv[0])==SQLITE_BLOB ){
    const u8 *aBlob = (const u8*)sqlite3_value_blob(argv[0]);
    int nBlob = sqlite3_value_bytes(argv[0]);
    assert( pTab->pFirstEntry==0 );
    rc = zipfileLoadDirectory(pTab, aBlob, nBlob);
    pCsr->pFreeEntry = pTab->pFirstEntry;
    pTab->pFirstEntry = pTab->pLastEntry = 0;
    if( rc!=SQLITE_OK ) return rc;
    bInMemory = 1;
  }else{
    zFile = (const char*)sqlite3_value_text(argv[0]);
  }

  if( 0==pTab->pWriteFd && 0==bInMemory ){
    pCsr->pFile = fopen(zFile, "rb");
    if( pCsr->pFile==0 ){
      zipfileCursorErr(pCsr, "cannot open file: %s", zFile);
      rc = SQLITE_ERROR;
    }else{
      rc = zipfileReadEOCD(pTab, 0, 0, pCsr->pFile, &pCsr->eocd);
      if( rc==SQLITE_OK ){
        if( pCsr->eocd.nEntry==0 ){
          pCsr->bEof = 1;
        }else{
          pCsr->iNextOff = pCsr->eocd.iOffset;
          rc = zipfileNext(cur);
        }
      }
    }
  }else{
    pCsr->bNoop = 1;
    pCsr->pCurrent = pCsr->pFreeEntry ? pCsr->pFreeEntry : pTab->pFirstEntry;
    rc = zipfileNext(cur);
  }

  return rc;
}

/*
** xBestIndex callback.
*/
static int zipfileBestIndex(
  sqlite3_vtab *tab,
  sqlite3_index_info *pIdxInfo
){
  int i;
  int idx = -1;
  int unusable = 0;

  for(i=0; i<pIdxInfo->nConstraint; i++){
    const struct sqlite3_index_constraint *pCons = &pIdxInfo->aConstraint[i];
    if( pCons->iColumn!=ZIPFILE_F_COLUMN_IDX ) continue;
    if( pCons->usable==0 ){
      unusable = 1;
    }else if( pCons->op==SQLITE_INDEX_CONSTRAINT_EQ ){
      idx = i;
    }
  }
  pIdxInfo->estimatedCost = 1000.0;
  if( idx>=0 ){
    pIdxInfo->aConstraintUsage[idx].argvIndex = 1;
    pIdxInfo->aConstraintUsage[idx].omit = 1;
    pIdxInfo->idxNum = 1;
  }else if( unusable ){
    return SQLITE_CONSTRAINT;
  }
  return SQLITE_OK;
}

static ZipfileEntry *zipfileNewEntry(const char *zPath){
  ZipfileEntry *pNew;
  pNew = sqlite3_malloc(sizeof(ZipfileEntry));
  if( pNew ){
    memset(pNew, 0, sizeof(ZipfileEntry));
    pNew->cds.zFile = sqlite3_mprintf("%s", zPath);
    if( pNew->cds.zFile==0 ){
      sqlite3_free(pNew);
      pNew = 0;
    }
  }
  return pNew;
}

static int zipfileSerializeLFH(ZipfileEntry *pEntry, u8 *aBuf){
  ZipfileCDS *pCds = &pEntry->cds;
  u8 *a = aBuf;

  pCds->nExtra = 9;

  /* Write the LFH itself */
  zipfileWrite32(a, ZIPFILE_SIGNATURE_LFH);
  zipfileWrite16(a, pCds->iVersionExtract);
  zipfileWrite16(a, pCds->flags);
  zipfileWrite16(a, pCds->iCompression);
  zipfileWrite16(a, pCds->mTime);
  zipfileWrite16(a, pCds->mDate);
  zipfileWrite32(a, pCds->crc32);
  zipfileWrite32(a, pCds->szCompressed);
  zipfileWrite32(a, pCds->szUncompressed);
  zipfileWrite16(a, (u16)pCds->nFile);
  zipfileWrite16(a, pCds->nExtra);
  assert( a==&aBuf[ZIPFILE_LFH_FIXED_SZ] );

  /* Add the file name */
  memcpy(a, pCds->zFile, (int)pCds->nFile);
  a += (int)pCds->nFile;

  /* The "extra" data */
  zipfileWrite16(a, ZIPFILE_EXTRA_TIMESTAMP);
  zipfileWrite16(a, 5);
  *a++ = 0x01;
  zipfileWrite32(a, pEntry->mUnixTime);

  return a-aBuf;
}

static int zipfileAppendEntry(
  ZipfileTab *pTab,
  ZipfileEntry *pEntry,
  const u8 *pData,
  int nData
){
  u8 *aBuf = pTab->aBuffer;
  int nBuf;
  int rc;

  nBuf = zipfileSerializeLFH(pEntry, aBuf);
  rc = zipfileAppendData(pTab, aBuf, nBuf);
  if( rc==SQLITE_OK ){
    pEntry->iDataOff = pTab->szCurrent;
    rc = zipfileAppendData(pTab, pData, nData);
  }

  return rc;
}

static int zipfileGetMode(
  sqlite3_value *pVal, 
  int bIsDir,                     /* If true, default to directory */
  u32 *pMode,                     /* OUT: Mode value */
  char **pzErr                    /* OUT: Error message */
){
  const char *z = (const char*)sqlite3_value_text(pVal);
  u32 mode = 0;
  if( z==0 ){
    mode = (bIsDir ? (S_IFDIR + 0755) : (S_IFREG + 0644));
  }else if( z[0]>='0' && z[0]<='9' ){
    mode = (unsigned int)sqlite3_value_int(pVal);
  }else{
    const char zTemplate[11] = "-rwxrwxrwx";
    int i;
    if( strlen(z)!=10 ) goto parse_error;
    switch( z[0] ){
      case '-': mode |= S_IFREG; break;
      case 'd': mode |= S_IFDIR; break;
      case 'l': mode |= S_IFLNK; break;
      default: goto parse_error;
    }
    for(i=1; i<10; i++){
      if( z[i]==zTemplate[i] ) mode |= 1 << (9-i);
      else if( z[i]!='-' ) goto parse_error;
    }
  }
  if( ((mode & S_IFDIR)==0)==bIsDir ){
    /* The "mode" attribute is a directory, but data has been specified.
    ** Or vice-versa - no data but "mode" is a file or symlink.  */
    *pzErr = sqlite3_mprintf("zipfile: mode does not match data");
    return SQLITE_CONSTRAINT;
  }
  *pMode = mode;
  return SQLITE_OK;

 parse_error:
  *pzErr = sqlite3_mprintf("zipfile: parse error in mode: %s", z);
  return SQLITE_ERROR;
}

/*
** Both (const char*) arguments point to nul-terminated strings. Argument
** nB is the value of strlen(zB). This function returns 0 if the strings are
** identical, ignoring any trailing '/' character in either path.  */
static int zipfileComparePath(const char *zA, const char *zB, int nB){
  int nA = (int)strlen(zA);
  if( nA>0 && zA[nA-1]=='/' ) nA--;
  if( nB>0 && zB[nB-1]=='/' ) nB--;
  if( nA==nB && memcmp(zA, zB, nA)==0 ) return 0;
  return 1;
}

static int zipfileBegin(sqlite3_vtab *pVtab){
  ZipfileTab *pTab = (ZipfileTab*)pVtab;
  int rc = SQLITE_OK;

  assert( pTab->pWriteFd==0 );
  if( pTab->zFile==0 || pTab->zFile[0]==0 ){
    pTab->base.zErrMsg = sqlite3_mprintf("zipfile: missing filename");
    return SQLITE_ERROR;
  }

  /* Open a write fd on the file. Also load the entire central directory
  ** structure into memory. During the transaction any new file data is 
  ** appended to the archive file, but the central directory is accumulated
  ** in main-memory until the transaction is committed.  */
  pTab->pWriteFd = fopen(pTab->zFile, "ab+");
  if( pTab->pWriteFd==0 ){
    pTab->base.zErrMsg = sqlite3_mprintf(
        "zipfile: failed to open file %s for writing", pTab->zFile
        );
    rc = SQLITE_ERROR;
  }else{
    fseek(pTab->pWriteFd, 0, SEEK_END);
    pTab->szCurrent = pTab->szOrig = (i64)ftell(pTab->pWriteFd);
    rc = zipfileLoadDirectory(pTab, 0, 0);
  }

  if( rc!=SQLITE_OK ){
    zipfileCleanupTransaction(pTab);
  }

  return rc;
}

/*
** Return the current time as a 32-bit timestamp in UNIX epoch format (like
** time(2)).
*/
static u32 zipfileTime(void){
  sqlite3_vfs *pVfs = sqlite3_vfs_find(0);
  u32 ret;
  if( pVfs->iVersion>=2 && pVfs->xCurrentTimeInt64 ){
    i64 ms;
    pVfs->xCurrentTimeInt64(pVfs, &ms);
    ret = (u32)((ms/1000) - ((i64)24405875 * 8640));
  }else{
    double day;
    pVfs->xCurrentTime(pVfs, &day);
    ret = (u32)((day - 2440587.5) * 86400);
  }
  return ret;
}

/*
** Return a 32-bit timestamp in UNIX epoch format.
**
** If the value passed as the only argument is either NULL or an SQL NULL,
** return the current time. Otherwise, return the value stored in (*pVal)
** cast to a 32-bit unsigned integer.
*/
static u32 zipfileGetTime(sqlite3_value *pVal){
  if( pVal==0 || sqlite3_value_type(pVal)==SQLITE_NULL ){
    return zipfileTime();
  }
  return (u32)sqlite3_value_int64(pVal);
}

/*
** Unless it is NULL, entry pOld is currently part of the pTab->pFirstEntry
** linked list.  Remove it from the list and free the object.
*/
static void zipfileRemoveEntryFromList(ZipfileTab *pTab, ZipfileEntry *pOld){
  if( pOld ){
    ZipfileEntry **pp;
    for(pp=&pTab->pFirstEntry; (*pp)!=pOld; pp=&((*pp)->pNext));
    *pp = (*pp)->pNext;
    zipfileEntryFree(pOld);
  }
}

/*
** xUpdate method.
*/
static int zipfileUpdate(
  sqlite3_vtab *pVtab, 
  int nVal, 
  sqlite3_value **apVal, 
  sqlite_int64 *pRowid
){
  ZipfileTab *pTab = (ZipfileTab*)pVtab;
  int rc = SQLITE_OK;             /* Return Code */
  ZipfileEntry *pNew = 0;         /* New in-memory CDS entry */

  u32 mode = 0;                   /* Mode for new entry */
  u32 mTime = 0;                  /* Modification time for new entry */
  i64 sz = 0;                     /* Uncompressed size */
  const char *zPath = 0;          /* Path for new entry */
  int nPath = 0;                  /* strlen(zPath) */
  const u8 *pData = 0;            /* Pointer to buffer containing content */
  int nData = 0;                  /* Size of pData buffer in bytes */
  int iMethod = 0;                /* Compression method for new entry */
  u8 *pFree = 0;                  /* Free this */
  char *zFree = 0;                /* Also free this */
  ZipfileEntry *pOld = 0;
  ZipfileEntry *pOld2 = 0;
  int bUpdate = 0;                /* True for an update that modifies "name" */
  int bIsDir = 0;
  u32 iCrc32 = 0;

  if( pTab->pWriteFd==0 ){
    rc = zipfileBegin(pVtab);
    if( rc!=SQLITE_OK ) return rc;
  }

  /* If this is a DELETE or UPDATE, find the archive entry to delete. */
  if( sqlite3_value_type(apVal[0])!=SQLITE_NULL ){
    const char *zDelete = (const char*)sqlite3_value_text(apVal[0]);
    int nDelete = (int)strlen(zDelete);
    if( nVal>1 ){
      const char *zUpdate = (const char*)sqlite3_value_text(apVal[1]);
      if( zUpdate && zipfileComparePath(zUpdate, zDelete, nDelete)!=0 ){
        bUpdate = 1;
      }
    }
    for(pOld=pTab->pFirstEntry; 1; pOld=pOld->pNext){
      if( zipfileComparePath(pOld->cds.zFile, zDelete, nDelete)==0 ){
        break;
      }
      assert( pOld->pNext );
    }
  }

  if( nVal>1 ){
    /* Check that "sz" and "rawdata" are both NULL: */
    if( sqlite3_value_type(apVal[5])!=SQLITE_NULL ){
      zipfileTableErr(pTab, "sz must be NULL");
      rc = SQLITE_CONSTRAINT;
    }
    if( sqlite3_value_type(apVal[6])!=SQLITE_NULL ){
      zipfileTableErr(pTab, "rawdata must be NULL"); 
      rc = SQLITE_CONSTRAINT;
    }

    if( rc==SQLITE_OK ){
      if( sqlite3_value_type(apVal[7])==SQLITE_NULL ){
        /* data=NULL. A directory */
        bIsDir = 1;
      }else{
        /* Value specified for "data", and possibly "method". This must be
        ** a regular file or a symlink. */
        const u8 *aIn = sqlite3_value_blob(apVal[7]);
        int nIn = sqlite3_value_bytes(apVal[7]);
        int bAuto = sqlite3_value_type(apVal[8])==SQLITE_NULL;

        iMethod = sqlite3_value_int(apVal[8]);
        sz = nIn;
        pData = aIn;
        nData = nIn;
        if( iMethod!=0 && iMethod!=8 ){
          zipfileTableErr(pTab, "unknown compression method: %d", iMethod);
          rc = SQLITE_CONSTRAINT;
        }else{
          if( bAuto || iMethod ){
            int nCmp;
            rc = zipfileDeflate(aIn, nIn, &pFree, &nCmp, &pTab->base.zErrMsg);
            if( rc==SQLITE_OK ){
              if( iMethod || nCmp<nIn ){
                iMethod = 8;
                pData = pFree;
                nData = nCmp;
              }
            }
          }
          iCrc32 = crc32(0, aIn, nIn);
        }
      }
    }

    if( rc==SQLITE_OK ){
      rc = zipfileGetMode(apVal[3], bIsDir, &mode, &pTab->base.zErrMsg);
    }

    if( rc==SQLITE_OK ){
      zPath = (const char*)sqlite3_value_text(apVal[2]);
      if( zPath==0 ) zPath = "";
      nPath = (int)strlen(zPath);
      mTime = zipfileGetTime(apVal[4]);
    }

    if( rc==SQLITE_OK && bIsDir ){
      /* For a directory, check that the last character in the path is a
      ** '/'. This appears to be required for compatibility with info-zip
      ** (the unzip command on unix). It does not create directories
      ** otherwise.  */
      if( nPath<=0 || zPath[nPath-1]!='/' ){
        zFree = sqlite3_mprintf("%s/", zPath);
        zPath = (const char*)zFree;
        if( zFree==0 ){
          rc = SQLITE_NOMEM;
          nPath = 0;
        }else{
          nPath = (int)strlen(zPath);
        }
      }
    }

    /* Check that we're not inserting a duplicate entry -OR- updating an
    ** entry with a path, thereby making it into a duplicate. */
    if( (pOld==0 || bUpdate) && rc==SQLITE_OK ){
      ZipfileEntry *p;
      for(p=pTab->pFirstEntry; p; p=p->pNext){
        if( zipfileComparePath(p->cds.zFile, zPath, nPath)==0 ){
          switch( sqlite3_vtab_on_conflict(pTab->db) ){
            case SQLITE_IGNORE: {
              goto zipfile_update_done;
            }
            case SQLITE_REPLACE: {
              pOld2 = p;
              break;
            }
            default: {
              zipfileTableErr(pTab, "duplicate name: \"%s\"", zPath);
              rc = SQLITE_CONSTRAINT;
              break;
            }
          }
          break;
        }
      }
    }

    if( rc==SQLITE_OK ){
      /* Create the new CDS record. */
      pNew = zipfileNewEntry(zPath);
      if( pNew==0 ){
        rc = SQLITE_NOMEM;
      }else{
        pNew->cds.iVersionMadeBy = ZIPFILE_NEWENTRY_MADEBY;
        pNew->cds.iVersionExtract = ZIPFILE_NEWENTRY_REQUIRED;
        pNew->cds.flags = ZIPFILE_NEWENTRY_FLAGS;
        pNew->cds.iCompression = (u16)iMethod;
        zipfileMtimeToDos(&pNew->cds, mTime);
        pNew->cds.crc32 = iCrc32;
        pNew->cds.szCompressed = nData;
        pNew->cds.szUncompressed = (u32)sz;
        pNew->cds.iExternalAttr = (mode<<16);
        pNew->cds.iOffset = (u32)pTab->szCurrent;
        pNew->cds.nFile = (u16)nPath;
        pNew->mUnixTime = (u32)mTime;
        rc = zipfileAppendEntry(pTab, pNew, pData, nData);
        zipfileAddEntry(pTab, pOld, pNew);
      }
    }
  }

  if( rc==SQLITE_OK && (pOld || pOld2) ){
    ZipfileCsr *pCsr;
    for(pCsr=pTab->pCsrList; pCsr; pCsr=pCsr->pCsrNext){
      if( pCsr->pCurrent && (pCsr->pCurrent==pOld || pCsr->pCurrent==pOld2) ){
        pCsr->pCurrent = pCsr->pCurrent->pNext;
        pCsr->bNoop = 1;
      }
    }

    zipfileRemoveEntryFromList(pTab, pOld);
    zipfileRemoveEntryFromList(pTab, pOld2);
  }

zipfile_update_done:
  sqlite3_free(pFree);
  sqlite3_free(zFree);
  return rc;
}

static int zipfileSerializeEOCD(ZipfileEOCD *p, u8 *aBuf){
  u8 *a = aBuf;
  zipfileWrite32(a, ZIPFILE_SIGNATURE_EOCD);
  zipfileWrite16(a, p->iDisk);
  zipfileWrite16(a, p->iFirstDisk);
  zipfileWrite16(a, p->nEntry);
  zipfileWrite16(a, p->nEntryTotal);
  zipfileWrite32(a, p->nSize);
  zipfileWrite32(a, p->iOffset);
  zipfileWrite16(a, 0);        /* Size of trailing comment in bytes*/

  return a-aBuf;
}

static int zipfileAppendEOCD(ZipfileTab *pTab, ZipfileEOCD *p){
  int nBuf = zipfileSerializeEOCD(p, pTab->aBuffer);
  assert( nBuf==ZIPFILE_EOCD_FIXED_SZ );
  return zipfileAppendData(pTab, pTab->aBuffer, nBuf);
}

/*
** Serialize the CDS structure into buffer aBuf[]. Return the number
** of bytes written.
*/
static int zipfileSerializeCDS(ZipfileEntry *pEntry, u8 *aBuf){
  u8 *a = aBuf;
  ZipfileCDS *pCDS = &pEntry->cds;

  if( pEntry->aExtra==0 ){
    pCDS->nExtra = 9;
  }

  zipfileWrite32(a, ZIPFILE_SIGNATURE_CDS);
  zipfileWrite16(a, pCDS->iVersionMadeBy);
  zipfileWrite16(a, pCDS->iVersionExtract);
  zipfileWrite16(a, pCDS->flags);
  zipfileWrite16(a, pCDS->iCompression);
  zipfileWrite16(a, pCDS->mTime);
  zipfileWrite16(a, pCDS->mDate);
  zipfileWrite32(a, pCDS->crc32);
  zipfileWrite32(a, pCDS->szCompressed);
  zipfileWrite32(a, pCDS->szUncompressed);
  assert( a==&aBuf[ZIPFILE_CDS_NFILE_OFF] );
  zipfileWrite16(a, pCDS->nFile);
  zipfileWrite16(a, pCDS->nExtra);
  zipfileWrite16(a, pCDS->nComment);
  zipfileWrite16(a, pCDS->iDiskStart);
  zipfileWrite16(a, pCDS->iInternalAttr);
  zipfileWrite32(a, pCDS->iExternalAttr);
  zipfileWrite32(a, pCDS->iOffset);

  memcpy(a, pCDS->zFile, pCDS->nFile);
  a += pCDS->nFile;

  if( pEntry->aExtra ){
    int n = (int)pCDS->nExtra + (int)pCDS->nComment;
    memcpy(a, pEntry->aExtra, n);
    a += n;
  }else{
    assert( pCDS->nExtra==9 );
    zipfileWrite16(a, ZIPFILE_EXTRA_TIMESTAMP);
    zipfileWrite16(a, 5);
    *a++ = 0x01;
    zipfileWrite32(a, pEntry->mUnixTime);
  }

  return a-aBuf;
}

static int zipfileCommit(sqlite3_vtab *pVtab){
  ZipfileTab *pTab = (ZipfileTab*)pVtab;
  int rc = SQLITE_OK;
  if( pTab->pWriteFd ){
    i64 iOffset = pTab->szCurrent;
    ZipfileEntry *p;
    ZipfileEOCD eocd;
    int nEntry = 0;

    /* Write out all entries */
    for(p=pTab->pFirstEntry; rc==SQLITE_OK && p; p=p->pNext){
      int n = zipfileSerializeCDS(p, pTab->aBuffer);
      rc = zipfileAppendData(pTab, pTab->aBuffer, n);
      nEntry++;
    }

    /* Write out the EOCD record */
    eocd.iDisk = 0;
    eocd.iFirstDisk = 0;
    eocd.nEntry = (u16)nEntry;
    eocd.nEntryTotal = (u16)nEntry;
    eocd.nSize = (u32)(pTab->szCurrent - iOffset);
    eocd.iOffset = (u32)iOffset;
    rc = zipfileAppendEOCD(pTab, &eocd);

    zipfileCleanupTransaction(pTab);
  }
  return rc;
}

static int zipfileRollback(sqlite3_vtab *pVtab){
  return zipfileCommit(pVtab);
}

static ZipfileCsr *zipfileFindCursor(ZipfileTab *pTab, i64 iId){
  ZipfileCsr *pCsr;
  for(pCsr=pTab->pCsrList; pCsr; pCsr=pCsr->pCsrNext){
    if( iId==pCsr->iId ) break;
  }
  return pCsr;
}

static void zipfileFunctionCds(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  ZipfileCsr *pCsr;
  ZipfileTab *pTab = (ZipfileTab*)sqlite3_user_data(context);
  assert( argc>0 );

  pCsr = zipfileFindCursor(pTab, sqlite3_value_int64(argv[0]));
  if( pCsr ){
    ZipfileCDS *p = &pCsr->pCurrent->cds;
    char *zRes = sqlite3_mprintf("{"
        "\"version-made-by\" : %u, "
        "\"version-to-extract\" : %u, "
        "\"flags\" : %u, "
        "\"compression\" : %u, "
        "\"time\" : %u, "
        "\"date\" : %u, "
        "\"crc32\" : %u, "
        "\"compressed-size\" : %u, "
        "\"uncompressed-size\" : %u, "
        "\"file-name-length\" : %u, "
        "\"extra-field-length\" : %u, "
        "\"file-comment-length\" : %u, "
        "\"disk-number-start\" : %u, "
        "\"internal-attr\" : %u, "
        "\"external-attr\" : %u, "
        "\"offset\" : %u }",
        (u32)p->iVersionMadeBy, (u32)p->iVersionExtract,
        (u32)p->flags, (u32)p->iCompression,
        (u32)p->mTime, (u32)p->mDate,
        (u32)p->crc32, (u32)p->szCompressed,
        (u32)p->szUncompressed, (u32)p->nFile,
        (u32)p->nExtra, (u32)p->nComment,
        (u32)p->iDiskStart, (u32)p->iInternalAttr,
        (u32)p->iExternalAttr, (u32)p->iOffset
    );

    if( zRes==0 ){
      sqlite3_result_error_nomem(context);
    }else{
      sqlite3_result_text(context, zRes, -1, SQLITE_TRANSIENT);
      sqlite3_free(zRes);
    }
  }
}

/*
** xFindFunction method.
*/
static int zipfileFindFunction(
  sqlite3_vtab *pVtab,            /* Virtual table handle */
  int nArg,                       /* Number of SQL function arguments */
  const char *zName,              /* Name of SQL function */
  void (**pxFunc)(sqlite3_context*,int,sqlite3_value**), /* OUT: Result */
  void **ppArg                    /* OUT: User data for *pxFunc */
){
  if( sqlite3_stricmp("zipfile_cds", zName)==0 ){
    *pxFunc = zipfileFunctionCds;
    *ppArg = (void*)pVtab;
    return 1;
  }
  return 0;
}

typedef struct ZipfileBuffer ZipfileBuffer;
struct ZipfileBuffer {
  u8 *a;                          /* Pointer to buffer */
  int n;                          /* Size of buffer in bytes */
  int nAlloc;                     /* Byte allocated at a[] */
};

typedef struct ZipfileCtx ZipfileCtx;
struct ZipfileCtx {
  int nEntry;
  ZipfileBuffer body;
  ZipfileBuffer cds;
};

static int zipfileBufferGrow(ZipfileBuffer *pBuf, int nByte){
  if( pBuf->n+nByte>pBuf->nAlloc ){
    u8 *aNew;
    sqlite3_int64 nNew = pBuf->n ? pBuf->n*2 : 512;
    int nReq = pBuf->n + nByte;

    while( nNew<nReq ) nNew = nNew*2;
    aNew = sqlite3_realloc64(pBuf->a, nNew);
    if( aNew==0 ) return SQLITE_NOMEM;
    pBuf->a = aNew;
    pBuf->nAlloc = (int)nNew;
  }
  return SQLITE_OK;
}

/*
** xStep() callback for the zipfile() aggregate. This can be called in
** any of the following ways:
**
**   SELECT zipfile(name,data) ...
**   SELECT zipfile(name,mode,mtime,data) ...
**   SELECT zipfile(name,mode,mtime,data,method) ...
*/
void zipfileStep(sqlite3_context *pCtx, int nVal, sqlite3_value **apVal){
  ZipfileCtx *p;                  /* Aggregate function context */
  ZipfileEntry e;                 /* New entry to add to zip archive */

  sqlite3_value *pName = 0;
  sqlite3_value *pMode = 0;
  sqlite3_value *pMtime = 0;
  sqlite3_value *pData = 0;
  sqlite3_value *pMethod = 0;

  int bIsDir = 0;
  u32 mode;
  int rc = SQLITE_OK;
  char *zErr = 0;

  int iMethod = -1;               /* Compression method to use (0 or 8) */

  const u8 *aData = 0;            /* Possibly compressed data for new entry */
  int nData = 0;                  /* Size of aData[] in bytes */
  int szUncompressed = 0;         /* Size of data before compression */
  u8 *aFree = 0;                  /* Free this before returning */
  u32 iCrc32 = 0;                 /* crc32 of uncompressed data */

  char *zName = 0;                /* Path (name) of new entry */
  int nName = 0;                  /* Size of zName in bytes */
  char *zFree = 0;                /* Free this before returning */
  int nByte;

  memset(&e, 0, sizeof(e));
  p = (ZipfileCtx*)sqlite3_aggregate_context(pCtx, sizeof(ZipfileCtx));
  if( p==0 ) return;

  /* Martial the arguments into stack variables */
  if( nVal!=2 && nVal!=4 && nVal!=5 ){
    zErr = sqlite3_mprintf("wrong number of arguments to function zipfile()");
    rc = SQLITE_ERROR;
    goto zipfile_step_out;
  }
  pName = apVal[0];
  if( nVal==2 ){
    pData = apVal[1];
  }else{
    pMode = apVal[1];
    pMtime = apVal[2];
    pData = apVal[3];
    if( nVal==5 ){
      pMethod = apVal[4];
    }
  }

  /* Check that the 'name' parameter looks ok. */
  zName = (char*)sqlite3_value_text(pName);
  nName = sqlite3_value_bytes(pName);
  if( zName==0 ){
    zErr = sqlite3_mprintf("first argument to zipfile() must be non-NULL");
    rc = SQLITE_ERROR;
    goto zipfile_step_out;
  }

  /* Inspect the 'method' parameter. This must be either 0 (store), 8 (use
  ** deflate compression) or NULL (choose automatically).  */
  if( pMethod && SQLITE_NULL!=sqlite3_value_type(pMethod) ){
    iMethod = (int)sqlite3_value_int64(pMethod);
    if( iMethod!=0 && iMethod!=8 ){
      zErr = sqlite3_mprintf("illegal method value: %d", iMethod);
      rc = SQLITE_ERROR;
      goto zipfile_step_out;
    }
  }

  /* Now inspect the data. If this is NULL, then the new entry must be a
  ** directory.  Otherwise, figure out whether or not the data should
  ** be deflated or simply stored in the zip archive. */
  if( sqlite3_value_type(pData)==SQLITE_NULL ){
    bIsDir = 1;
    iMethod = 0;
  }else{
    aData = sqlite3_value_blob(pData);
    szUncompressed = nData = sqlite3_value_bytes(pData);
    iCrc32 = crc32(0, aData, nData);
    if( iMethod<0 || iMethod==8 ){
      int nOut = 0;
      rc = zipfileDeflate(aData, nData, &aFree, &nOut, &zErr);
      if( rc!=SQLITE_OK ){
        goto zipfile_step_out;
      }
      if( iMethod==8 || nOut<nData ){
        aData = aFree;
        nData = nOut;
        iMethod = 8;
      }else{
        iMethod = 0;
      }
    }
  }

  /* Decode the "mode" argument. */
  rc = zipfileGetMode(pMode, bIsDir, &mode, &zErr);
  if( rc ) goto zipfile_step_out;

  /* Decode the "mtime" argument. */
  e.mUnixTime = zipfileGetTime(pMtime);

  /* If this is a directory entry, ensure that there is exactly one '/'
  ** at the end of the path. Or, if this is not a directory and the path
  ** ends in '/' it is an error. */
  if( bIsDir==0 ){
    if( nName>0 && zName[nName-1]=='/' ){
      zErr = sqlite3_mprintf("non-directory name must not end with /");
      rc = SQLITE_ERROR;
      goto zipfile_step_out;
    }
  }else{
    if( nName==0 || zName[nName-1]!='/' ){
      zName = zFree = sqlite3_mprintf("%s/", zName);
      if( zName==0 ){
        rc = SQLITE_NOMEM;
        goto zipfile_step_out;
      }
      nName = (int)strlen(zName);
    }else{
      while( nName>1 && zName[nName-2]=='/' ) nName--;
    }
  }

  /* Assemble the ZipfileEntry object for the new zip archive entry */
  e.cds.iVersionMadeBy = ZIPFILE_NEWENTRY_MADEBY;
  e.cds.iVersionExtract = ZIPFILE_NEWENTRY_REQUIRED;
  e.cds.flags = ZIPFILE_NEWENTRY_FLAGS;
  e.cds.iCompression = (u16)iMethod;
  zipfileMtimeToDos(&e.cds, (u32)e.mUnixTime);
  e.cds.crc32 = iCrc32;
  e.cds.szCompressed = nData;
  e.cds.szUncompressed = szUncompressed;
  e.cds.iExternalAttr = (mode<<16);
  e.cds.iOffset = p->body.n;
  e.cds.nFile = (u16)nName;
  e.cds.zFile = zName;

  /* Append the LFH to the body of the new archive */
  nByte = ZIPFILE_LFH_FIXED_SZ + e.cds.nFile + 9;
  if( (rc = zipfileBufferGrow(&p->body, nByte)) ) goto zipfile_step_out;
  p->body.n += zipfileSerializeLFH(&e, &p->body.a[p->body.n]);

  /* Append the data to the body of the new archive */
  if( nData>0 ){
    if( (rc = zipfileBufferGrow(&p->body, nData)) ) goto zipfile_step_out;
    memcpy(&p->body.a[p->body.n], aData, nData);
    p->body.n += nData;
  }

  /* Append the CDS record to the directory of the new archive */
  nByte = ZIPFILE_CDS_FIXED_SZ + e.cds.nFile + 9;
  if( (rc = zipfileBufferGrow(&p->cds, nByte)) ) goto zipfile_step_out;
  p->cds.n += zipfileSerializeCDS(&e, &p->cds.a[p->cds.n]);

  /* Increment the count of entries in the archive */
  p->nEntry++;

 zipfile_step_out:
  sqlite3_free(aFree);
  sqlite3_free(zFree);
  if( rc ){
    if( zErr ){
      sqlite3_result_error(pCtx, zErr, -1);
    }else{
      sqlite3_result_error_code(pCtx, rc);
    }
  }
  sqlite3_free(zErr);
}

/*
** xFinalize() callback for zipfile aggregate function.
*/
void zipfileFinal(sqlite3_context *pCtx){
  ZipfileCtx *p;
  ZipfileEOCD eocd;
  sqlite3_int64 nZip;
  u8 *aZip;

  p = (ZipfileCtx*)sqlite3_aggregate_context(pCtx, sizeof(ZipfileCtx));
  if( p==0 ) return;
  if( p->nEntry>0 ){
    memset(&eocd, 0, sizeof(eocd));
    eocd.nEntry = (u16)p->nEntry;
    eocd.nEntryTotal = (u16)p->nEntry;
    eocd.nSize = p->cds.n;
    eocd.iOffset = p->body.n;

    nZip = p->body.n + p->cds.n + ZIPFILE_EOCD_FIXED_SZ;
    aZip = (u8*)sqlite3_malloc64(nZip);
    if( aZip==0 ){
      sqlite3_result_error_nomem(pCtx);
    }else{
      memcpy(aZip, p->body.a, p->body.n);
      memcpy(&aZip[p->body.n], p->cds.a, p->cds.n);
      zipfileSerializeEOCD(&eocd, &aZip[p->body.n + p->cds.n]);
      sqlite3_result_blob(pCtx, aZip, (int)nZip, zipfileFree);
    }
  }

  sqlite3_free(p->body.a);
  sqlite3_free(p->cds.a);
}


/*
** Register the "zipfile" virtual table.
*/
static int zipfileRegister(sqlite3 *db){
  static sqlite3_module zipfileModule = {
    1,                         /* iVersion */
    zipfileConnect,            /* xCreate */
    zipfileConnect,            /* xConnect */
    zipfileBestIndex,          /* xBestIndex */
    zipfileDisconnect,         /* xDisconnect */
    zipfileDisconnect,         /* xDestroy */
    zipfileOpen,               /* xOpen - open a cursor */
    zipfileClose,              /* xClose - close a cursor */
    zipfileFilter,             /* xFilter - configure scan constraints */
    zipfileNext,               /* xNext - advance a cursor */
    zipfileEof,                /* xEof - check for end of scan */
    zipfileColumn,             /* xColumn - read data */
    0,                         /* xRowid - read data */
    zipfileUpdate,             /* xUpdate */
    zipfileBegin,              /* xBegin */
    0,                         /* xSync */
    zipfileCommit,             /* xCommit */
    zipfileRollback,           /* xRollback */
    zipfileFindFunction,       /* xFindMethod */
    0,                         /* xRename */
  };

  int rc = sqlite3_create_module(db, "zipfile"  , &zipfileModule, 0);
  if( rc==SQLITE_OK ) rc = sqlite3_overload_function(db, "zipfile_cds", -1);
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_function(db, "zipfile", -1, SQLITE_UTF8, 0, 0, 
        zipfileStep, zipfileFinal
    );
  }
  return rc;
}
#else         /* SQLITE_OMIT_VIRTUALTABLE */
# define zipfileRegister(x) SQLITE_OK
#endif

#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_zipfile_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  return zipfileRegister(db);
}
