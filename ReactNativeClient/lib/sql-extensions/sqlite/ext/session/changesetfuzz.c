/*
** 2018-11-01
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** This file contains code to implement the "changesetfuzz" command 
** line utility for fuzzing changeset blobs without corrupting them.
*/


/************************************************************************
** USAGE:
**
** This program may be invoked in two ways:
**
**   changesetfuzz INPUT
**   changesetfuzz INPUT SEED N
**
** Argument INPUT must be the name of a file containing a binary changeset.
** In the first form above, this program outputs a human-readable version
** of the same changeset. This is chiefly for debugging.
**
** As well as changesets, this program can also dump and fuzz patchsets.
** The term "changeset" is used for both patchsets and changesets from this
** point on.
**
** In the second form, arguments SEED and N must both be integers. In this
** case, this program writes N binary changesets to disk. Each output
** changeset is a slightly modified - "fuzzed" - version of the input. 
** The output changesets are written to files name "INPUT-$n", where $n is 
** an integer between 0 and N-1, inclusive. Output changesets are always
** well-formed. Parameter SEED is used to seed the PRNG - any two 
** invocations of this program with the same SEED and input changeset create
** the same N output changesets.
**
** The ways in which an input changeset may be fuzzed are as follows:
**
**   1. Any two values within the changeset may be exchanged.
**
**   2. Any TEXT, BLOB, INTEGER or REAL value within the changeset 
**      may have a single bit of its content flipped.
**
**   3. Any value within a changeset may be replaced by a pseudo-randomly
**      generated value.
**
** The above operations never set a PRIMARY KEY column to NULL. Nor do they
** set any value to "undefined", or replace any "undefined" value with
** another. Any such operation risks producing a changeset that is not 
** well-formed.
**
**   4. A single change may be duplicated.
**
**   5. A single change may be removed, so long as this does not mean that
**      there are zero changes following a table-header within the changeset.
**
**   6. A single change may have its type (INSERT, DELETE, UPDATE) changed.
**      If an INSERT is changed to a DELETE (or vice versa), the type is
**      simply changed - no other modifications are required. If an INSERT
**      or DELETE is changed to an UPDATE, then the single record is duplicated
**      (as both the old.* and new.* records of the new UPDATE change). If an
**      UPDATE is changed to a DELETE or INSERT, the new.* record is discarded
**      and any "undefined" fields replaced with pseudo-randomly generated
**      values.
**
**   7. An UPDATE change that modifies N table columns may be modified so
**      that it updates N-1 columns, so long as (N>1).
**
**   8. The "indirect" flag may be toggled for any change.
**
** Entire group of changes may also be operated on:
**
**   9. Duplicate an existing group.
**
**  10. Remove an existing group.
**
**  11. The positions of two groups may be exchanged.
**
** There are also schema changes:
**
**  12. A non-PK column may be added to a table. In this case a NULL 
**      value is appended to all records.
**
**  13. A PK column may be added to a table. In this case a non-NULL 
**      value is appended to all INSERT, DELETE and UPDATE old.* records.
**      An "undefined" is appended to new.* UPDATE records.
**
**  14. A column may be removed from a table, provided that it is not the
**      only PRIMARY KEY column in the table. In this case the corresponding
**      field is removed from all records. In cases where this leaves an UPDATE
**      with no non-PK, non-undefined fields, the entire change is removed.
*/

#include "sqlite3.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <ctype.h>

#define FUZZ_VALUE_SUB       1    /* Replace one value with a copy of another */
#define FUZZ_VALUE_MOD       2    /* Modify content by 1 bit */
#define FUZZ_VALUE_RND       3    /* Replace with pseudo-random value */

#define FUZZ_CHANGE_DUP      4    /* Duplicate an existing change */
#define FUZZ_CHANGE_DEL      5    /* Completely remove one change */
#define FUZZ_CHANGE_TYPE     6    /* Change the type of one change */
#define FUZZ_CHANGE_FIELD    7    /* Change an UPDATE to modify fewer columns */
#define FUZZ_CHANGE_INDIRECT 8    /* Toggle the "indirect" flag of a change */

#define FUZZ_GROUP_DUP       9    /* Duplicate a change group */
#define FUZZ_GROUP_DEL      10    /* Delete an entire change group */
#define FUZZ_GROUP_SWAP     11    /* Exchange the position of two groups */

#define FUZZ_COLUMN_ADD     12     /* Add column to table definition */
#define FUZZ_COLUMN_ADDPK   13     /* Add PK column to table definition */
#define FUZZ_COLUMN_DEL     14     /* Remove column from table definition */



typedef unsigned char u8;
typedef sqlite3_uint64 u64;
typedef sqlite3_int64 i64;
typedef unsigned int u32;

/*
** Show a usage message on stderr then quit.
*/
static void usage(const char *argv0){
  fprintf(stderr, "Usage: %s FILENAME ?SEED N?\n", argv0);
  exit(1);
}

/*
** Read the content of a disk file into an in-memory buffer
*/
static void fuzzReadFile(const char *zFilename, int *pSz, void **ppBuf){
  FILE *f;
  sqlite3_int64 sz;
  void *pBuf;
  f = fopen(zFilename, "rb");
  if( f==0 ){
    fprintf(stderr, "cannot open \"%s\" for reading\n", zFilename);
    exit(1);
  }
  fseek(f, 0, SEEK_END);
  sz = ftell(f);
  rewind(f);
  pBuf = sqlite3_malloc64( sz ? sz : 1 );
  if( pBuf==0 ){
    fprintf(stderr, "cannot allocate %d to hold content of \"%s\"\n",
            (int)sz, zFilename);
    exit(1);
  }
  if( sz>0 ){
    if( fread(pBuf, (size_t)sz, 1, f)!=1 ){
      fprintf(stderr, "cannot read all %d bytes of \"%s\"\n",
              (int)sz, zFilename);
      exit(1);
    }
    fclose(f);
  }
  *pSz = (int)sz;
  *ppBuf = pBuf;
}

/* 
** Write the contents of buffer pBuf, size nBuf bytes, into file zFilename
** on disk. zFilename, if it already exists, is clobbered.
*/
static void fuzzWriteFile(const char *zFilename, void *pBuf, int nBuf){
  FILE *f;
  f = fopen(zFilename, "wb");
  if( f==0 ){
    fprintf(stderr, "cannot open \"%s\" for writing\n", zFilename);
    exit(1);
  }
  if( fwrite(pBuf, nBuf, 1, f)!=1 ){
    fprintf(stderr, "cannot write to \"%s\"\n", zFilename);
    exit(1);
  }
  fclose(f);
}

static int fuzzCorrupt(){
  return SQLITE_CORRUPT;
}

/*************************************************************************
** The following block is a copy of the implementation of SQLite function
** sqlite3_randomness. This version has two important differences:
**
**   1. It always uses the same seed. So the sequence of random data output
**      is the same for every run of the program.
**
**   2. It is not threadsafe.
*/
static struct sqlite3PrngType {
  unsigned char i, j;             /* State variables */
  unsigned char s[256];           /* State variables */
} sqlite3Prng = {
    0xAF, 0x28,
  {
    0x71, 0xF5, 0xB4, 0x6E, 0x80, 0xAB, 0x1D, 0xB8, 
    0xFB, 0xB7, 0x49, 0xBF, 0xFF, 0x72, 0x2D, 0x14, 
    0x79, 0x09, 0xE3, 0x78, 0x76, 0xB0, 0x2C, 0x0A, 
    0x8E, 0x23, 0xEE, 0xDF, 0xE0, 0x9A, 0x2F, 0x67, 
    0xE1, 0xBE, 0x0E, 0xA7, 0x08, 0x97, 0xEB, 0x77, 
    0x78, 0xBA, 0x9D, 0xCA, 0x49, 0x4C, 0x60, 0x9A, 
    0xF6, 0xBD, 0xDA, 0x7F, 0xBC, 0x48, 0x58, 0x52, 
    0xE5, 0xCD, 0x83, 0x72, 0x23, 0x52, 0xFF, 0x6D, 
    0xEF, 0x0F, 0x82, 0x29, 0xA0, 0x83, 0x3F, 0x7D, 
    0xA4, 0x88, 0x31, 0xE7, 0x88, 0x92, 0x3B, 0x9B, 
    0x3B, 0x2C, 0xC2, 0x4C, 0x71, 0xA2, 0xB0, 0xEA, 
    0x36, 0xD0, 0x00, 0xF1, 0xD3, 0x39, 0x17, 0x5D, 
    0x2A, 0x7A, 0xE4, 0xAD, 0xE1, 0x64, 0xCE, 0x0F, 
    0x9C, 0xD9, 0xF5, 0xED, 0xB0, 0x22, 0x5E, 0x62, 
    0x97, 0x02, 0xA3, 0x8C, 0x67, 0x80, 0xFC, 0x88, 
    0x14, 0x0B, 0x15, 0x10, 0x0F, 0xC7, 0x40, 0xD4, 
    0xF1, 0xF9, 0x0E, 0x1A, 0xCE, 0xB9, 0x1E, 0xA1, 
    0x72, 0x8E, 0xD7, 0x78, 0x39, 0xCD, 0xF4, 0x5D, 
    0x2A, 0x59, 0x26, 0x34, 0xF2, 0x73, 0x0B, 0xA0, 
    0x02, 0x51, 0x2C, 0x03, 0xA3, 0xA7, 0x43, 0x13, 
    0xE8, 0x98, 0x2B, 0xD2, 0x53, 0xF8, 0xEE, 0x91, 
    0x7D, 0xE7, 0xE3, 0xDA, 0xD5, 0xBB, 0xC0, 0x92, 
    0x9D, 0x98, 0x01, 0x2C, 0xF9, 0xB9, 0xA0, 0xEB, 
    0xCF, 0x32, 0xFA, 0x01, 0x49, 0xA5, 0x1D, 0x9A, 
    0x76, 0x86, 0x3F, 0x40, 0xD4, 0x89, 0x8F, 0x9C, 
    0xE2, 0xE3, 0x11, 0x31, 0x37, 0xB2, 0x49, 0x28, 
    0x35, 0xC0, 0x99, 0xB6, 0xD0, 0xBC, 0x66, 0x35, 
    0xF7, 0x83, 0x5B, 0xD7, 0x37, 0x1A, 0x2B, 0x18, 
    0xA6, 0xFF, 0x8D, 0x7C, 0x81, 0xA8, 0xFC, 0x9E, 
    0xC4, 0xEC, 0x80, 0xD0, 0x98, 0xA7, 0x76, 0xCC, 
    0x9C, 0x2F, 0x7B, 0xFF, 0x8E, 0x0E, 0xBB, 0x90, 
    0xAE, 0x13, 0x06, 0xF5, 0x1C, 0x4E, 0x52, 0xF7
  }
};

/* 
** Generate and return single random byte 
*/
static unsigned char fuzzRandomByte(void){
  unsigned char t;
  sqlite3Prng.i++;
  t = sqlite3Prng.s[sqlite3Prng.i];
  sqlite3Prng.j += t;
  sqlite3Prng.s[sqlite3Prng.i] = sqlite3Prng.s[sqlite3Prng.j];
  sqlite3Prng.s[sqlite3Prng.j] = t;
  t += sqlite3Prng.s[sqlite3Prng.i];
  return sqlite3Prng.s[t];
}

/*
** Return N random bytes.
*/
static void fuzzRandomBlob(int nBuf, unsigned char *zBuf){
  int i;
  for(i=0; i<nBuf; i++){
    zBuf[i] = fuzzRandomByte();
  }
}

/*
** Return a random integer between 0 and nRange (not inclusive).
*/
static unsigned int fuzzRandomInt(unsigned int nRange){
  unsigned int ret;
  assert( nRange>0 );
  fuzzRandomBlob(sizeof(ret), (unsigned char*)&ret);
  return (ret % nRange);
}

static u64 fuzzRandomU64(){
  u64 ret;
  fuzzRandomBlob(sizeof(ret), (unsigned char*)&ret);
  return ret;
}

static void fuzzRandomSeed(unsigned int iSeed){
  int i;
  for(i=0; i<256; i+=4){
    sqlite3Prng.s[i] ^= ((iSeed >> 24) & 0xFF);
    sqlite3Prng.s[i+1] ^= ((iSeed >> 16) & 0xFF);
    sqlite3Prng.s[i+2] ^= ((iSeed >>  8) & 0xFF);
    sqlite3Prng.s[i+3] ^= ((iSeed >>  0) & 0xFF);
  }
}
/*
** End of code for generating pseudo-random values.
*************************************************************************/

typedef struct FuzzChangeset FuzzChangeset;
typedef struct FuzzChangesetGroup FuzzChangesetGroup;
typedef struct FuzzChange FuzzChange;

/* 
** Object containing partially parsed changeset.
*/
struct FuzzChangeset {
  int bPatchset;                  /* True for a patchset */
  FuzzChangesetGroup **apGroup;   /* Array of groups in changeset */
  int nGroup;                     /* Number of items in list pGroup */
  u8 **apVal;                     /* Array of all values in changeset */
  int nVal;                       /* Number of used slots in apVal[] */
  int nChange;                    /* Number of changes in changeset */
  int nUpdate;                    /* Number of UPDATE changes in changeset */
};

/* 
** There is one object of this type for each change-group (table header)
** in the input changeset.
*/
struct FuzzChangesetGroup {
  const char *zTab;               /* Name of table */
  int nCol;                       /* Number of columns in table */
  u8 *aPK;                        /* PK array for this table */
  u8 *aChange;                    /* Buffer containing array of changes */
  int szChange;                   /* Size of buffer aChange[] in bytes */
  int nChange;                    /* Number of changes in buffer aChange[] */
};

/*
** Description of a fuzz change to be applied to a changeset.
*/
struct FuzzChange {
  int eType;                      /* One of the FUZZ_* constants above */
  int iChange;                    /* Change or UPDATE to modify */
  int iGroup;                     /* Group to modify */
  int iDelete;                    /* Field to remove (FUZZ_COLUMN_DEL) */
  u8 *pSub1;                      /* Replace this value with pSub2 */
  u8 *pSub2;                      /* And this one with pSub1 */
  u8 aSub[128];                   /* Buffer for substitute value */
  int iCurrent;                   /* Current change number */
};

/*
** Allocate and return nByte bytes of zeroed memory.
*/
static void *fuzzMalloc(sqlite3_int64 nByte){
  void *pRet = sqlite3_malloc64(nByte);
  if( pRet ){
    memset(pRet, 0, (size_t)nByte);
  }
  return pRet;
}

/*
** Free the buffer indicated by the first argument. This function is used
** to free buffers allocated by fuzzMalloc().
*/
static void fuzzFree(void *p){
  sqlite3_free(p);
}

/*
** Argument p points to a buffer containing an SQLite varint that, assuming the
** input is not corrupt, may be between 0 and 0x7FFFFFFF, inclusive. Before
** returning, this function sets (*pnVal) to the value of that varint, and
** returns the number of bytes of space that it takes up.
*/
static int fuzzGetVarint(u8 *p, int *pnVal){
  int i;
  sqlite3_uint64 nVal = 0;
  for(i=0; i<9; i++){
    nVal = (nVal<<7) + (p[i] & 0x7F);
    if( (p[i] & 0x80)==0 ){
      i++;
      break;
    }
  }
  *pnVal = (int)nVal;
  return i;
}

/*
** Write value nVal into the buffer indicated by argument p as an SQLite
** varint. nVal is guaranteed to be between 0 and (2^21-1), inclusive.
** Return the number of bytes written to buffer p.
*/
static int fuzzPutVarint(u8 *p, int nVal){
  assert( nVal>0 && nVal<2097152 );
  if( nVal<128 ){
    p[0] = (u8)nVal;
    return 1;
  }
  if( nVal<16384 ){
    p[0] = ((nVal >> 7) & 0x7F) | 0x80;
    p[1] = (nVal & 0x7F);
    return 2;
  }

  p[0] = ((nVal >> 14) & 0x7F) | 0x80;
  p[1] = ((nVal >> 7) & 0x7F) | 0x80;
  p[2] = (nVal & 0x7F);
  return 3;
}

/*
** Read a 64-bit big-endian integer value from buffer aRec[]. Return
** the value read.
*/
static i64 fuzzGetI64(u8 *aRec){
  return (i64)(
      (((u64)aRec[0]) << 56)
    + (((u64)aRec[1]) << 48)
    + (((u64)aRec[2]) << 40)
    + (((u64)aRec[3]) << 32)
    + (((u64)aRec[4]) << 24)
    + (((u64)aRec[5]) << 16)
    + (((u64)aRec[6]) <<  8)
    + (((u64)aRec[7]) <<  0)
  );
}

/*
** Write value iVal to buffer aRec[] as an unsigned 64-bit big-endian integer.
*/
static void fuzzPutU64(u8 *aRec, u64 iVal){
  aRec[0] = (iVal>>56) & 0xFF;
  aRec[1] = (iVal>>48) & 0xFF;
  aRec[2] = (iVal>>40) & 0xFF;
  aRec[3] = (iVal>>32) & 0xFF;
  aRec[4] = (iVal>>24) & 0xFF;
  aRec[5] = (iVal>>16) & 0xFF;
  aRec[6] = (iVal>> 8) & 0xFF;
  aRec[7] = (iVal)     & 0xFF;
}

/*
** Parse a single table-header from the input. Allocate a new change-group
** object with the results. Return SQLITE_OK if successful, or an error code
** otherwise.
*/
static int fuzzParseHeader(
  FuzzChangeset *pParse,          /* Changeset parse object */
  u8 **ppHdr,                     /* IN/OUT: Iterator */
  u8 *pEnd,                       /* 1 byte past EOF */
  FuzzChangesetGroup **ppGrp      /* OUT: New change-group object */
){
  int rc = SQLITE_OK;
  FuzzChangesetGroup *pGrp;
  u8 cHdr = (pParse->bPatchset ? 'P' : 'T');

  assert( pEnd>(*ppHdr) );
  pGrp = (FuzzChangesetGroup*)fuzzMalloc(sizeof(FuzzChangesetGroup));
  if( !pGrp ){
    rc = SQLITE_NOMEM;
  }else{
    u8 *p = *ppHdr;
    if( p[0]!=cHdr ){
      rc = fuzzCorrupt();
    }else{
      p++;
      p += fuzzGetVarint(p, &pGrp->nCol);
      pGrp->aPK = p;
      p += pGrp->nCol;
      pGrp->zTab = (const char*)p;
      p = &p[strlen((const char*)p)+1];

      if( p>=pEnd ){
        rc = fuzzCorrupt();
      }
    }
    *ppHdr = p;
  }

  if( rc!=SQLITE_OK ){
    fuzzFree(pGrp);
    pGrp = 0;
  }

  *ppGrp = pGrp;
  return rc;
}

/*
** Argument p points to a buffer containing a single changeset-record value. 
** This function attempts to determine the size of the value in bytes. If
** successful, it sets (*pSz) to the size and returns SQLITE_OK. Or, if the
** buffer does not contain a valid value, SQLITE_CORRUPT is returned and
** the final value of (*pSz) is undefined.
*/
static int fuzzChangeSize(u8 *p, int *pSz){
  u8 eType = p[0];
  switch( eType ){
    case 0x00:                    /* undefined */
    case 0x05:                    /* null */
      *pSz = 1;
      break;

    case 0x01:                    /* integer */
    case 0x02:                    /* real */
      *pSz = 9;
      break;

    case 0x03:                    /* text */
    case 0x04: {                  /* blob */
      int nTxt;
      int sz;
      sz = fuzzGetVarint(&p[1], &nTxt);
      *pSz = 1 + sz + nTxt;
      break;
    }

    default:
      return fuzzCorrupt();
  }
  return SQLITE_OK;
}

/*
** When this function is called, (*ppRec) points to the start of a 
** record in a changeset being parsed. This function adds entries
** to the pParse->apVal[] array for all values and advances (*ppRec) 
** to one byte past the end of the record. Argument pEnd points to
** one byte past the end of the input changeset.
**
** Argument bPkOnly is true if the record being parsed is part of
** a DELETE record in a patchset. In this case, all non-primary-key
** fields have been omitted from the record.
**
** SQLITE_OK is returned if successful, or an SQLite error code otherwise.
*/
static int fuzzParseRecord(
  u8 **ppRec,                     /* IN/OUT: Iterator */
  u8 *pEnd,                       /* One byte after end of input data */
  FuzzChangeset *pParse,          /* Changeset parse context */
  int bPkOnly                     /* True if non-PK fields omitted */
){
  int rc = SQLITE_OK;
  FuzzChangesetGroup *pGrp = pParse->apGroup[pParse->nGroup-1];
  int i;
  u8 *p = *ppRec;

  for(i=0; rc==SQLITE_OK && i<pGrp->nCol; i++){
    if( bPkOnly==0 || pGrp->aPK[i] ){
      int sz;
      if( p>=pEnd ) break;
      if( (pParse->nVal & (pParse->nVal-1))==0 ){
        int nNew = pParse->nVal ? pParse->nVal*2 : 4;
        u8 **apNew = (u8**)sqlite3_realloc(pParse->apVal, nNew*sizeof(u8*));
        if( apNew==0 ) return SQLITE_NOMEM;
        pParse->apVal = apNew;
      }
      pParse->apVal[pParse->nVal++] = p;
      rc = fuzzChangeSize(p, &sz);
      p += sz;
    }
  }

  if( rc==SQLITE_OK && i<pGrp->nCol ){
    rc = fuzzCorrupt();
  }

  *ppRec = p;
  return rc;
}

/*
** Parse the array of changes starting at (*ppData) and add entries for
** all values to the pParse->apVal[] array. Argument pEnd points to one byte
** past the end of the input changeset. If successful, set (*ppData) to point
** to one byte past the end of the change array and return SQLITE_OK.
** Otherwise, return an SQLite error code. The final value of (*ppData) is
** undefined in this case.
*/
static int fuzzParseChanges(u8 **ppData, u8 *pEnd, FuzzChangeset *pParse){
  u8 cHdr = (pParse->bPatchset ? 'P' : 'T');
  FuzzChangesetGroup *pGrp = pParse->apGroup[pParse->nGroup-1];
  int rc = SQLITE_OK;
  u8 *p = *ppData;

  pGrp->aChange = p;
  while( rc==SQLITE_OK && p<pEnd && p[0]!=cHdr ){
    u8 eOp = p[0];
    u8 bIndirect = p[1];

    p += 2;
    if( eOp==SQLITE_UPDATE ){
      pParse->nUpdate++;
      if( pParse->bPatchset==0 ){
        rc = fuzzParseRecord(&p, pEnd, pParse, 0);
      }
    }else if( eOp!=SQLITE_INSERT && eOp!=SQLITE_DELETE ){
      rc = fuzzCorrupt();
    }
    if( rc==SQLITE_OK ){
      int bPkOnly = (eOp==SQLITE_DELETE && pParse->bPatchset);
      rc = fuzzParseRecord(&p, pEnd, pParse, bPkOnly);
    }
    pGrp->nChange++;
    pParse->nChange++;
  }
  pGrp->szChange = p - pGrp->aChange;

  *ppData = p;
  return rc;
}

/*
** Parse the changeset stored in buffer pChangeset (nChangeset bytes in
** size). If successful, write the results into (*pParse) and return
** SQLITE_OK. Or, if an error occurs, return an SQLite error code. The
** final state of (*pParse) is undefined in this case.
*/
static int fuzzParseChangeset(
  u8 *pChangeset,                 /* Buffer containing changeset */
  int nChangeset,                 /* Size of buffer in bytes */
  FuzzChangeset *pParse           /* OUT: Results of parse */
){
  u8 *pEnd = &pChangeset[nChangeset];
  u8 *p = pChangeset;
  int rc = SQLITE_OK;

  memset(pParse, 0, sizeof(FuzzChangeset));
  if( nChangeset>0 ){
    pParse->bPatchset = (pChangeset[0]=='P');
  }

  while( rc==SQLITE_OK && p<pEnd ){
    FuzzChangesetGroup *pGrp = 0;

    /* Read a table-header from the changeset */
    rc = fuzzParseHeader(pParse, &p, pEnd, &pGrp);
    assert( (rc==SQLITE_OK)==(pGrp!=0) );

    /* If the table-header was successfully parsed, add the new change-group
    ** to the array and parse the associated changes. */
    if( rc==SQLITE_OK ){
      FuzzChangesetGroup **apNew = (FuzzChangesetGroup**)sqlite3_realloc64(
          pParse->apGroup, sizeof(FuzzChangesetGroup*)*(pParse->nGroup+1)
      );
      if( apNew==0 ){
        rc = SQLITE_NOMEM;
      }else{
        apNew[pParse->nGroup] = pGrp;
        pParse->apGroup = apNew;
        pParse->nGroup++;
      }
      rc = fuzzParseChanges(&p, pEnd, pParse);
    }
  }

  return rc;
}

/*
** When this function is called, (*ppRec) points to the first byte of
** a record that is part of change-group pGrp. This function attempts
** to output a human-readable version of the record to stdout and advance
** (*ppRec) to point to the first byte past the end of the record before
** returning. If successful, SQLITE_OK is returned. Otherwise, an SQLite
** error code.
**
** If parameter bPkOnly is non-zero, then all non-primary-key fields have
** been omitted from the record. This occurs for records that are part
** of DELETE changes in patchsets.
*/
static int fuzzPrintRecord(FuzzChangesetGroup *pGrp, u8 **ppRec, int bPKOnly){
  int rc = SQLITE_OK;
  u8 *p = *ppRec;
  int i;
  const char *zPre = " (";

  for(i=0; i<pGrp->nCol; i++){
    if( bPKOnly==0 || pGrp->aPK[i] ){
      u8 eType = p++[0];
      switch( eType ){
        case 0x00:                    /* undefined */
          printf("%sn/a", zPre);
          break;

        case 0x01: {                  /* integer */
          sqlite3_int64 iVal = 0;
          iVal = fuzzGetI64(p);
          printf("%s%lld", zPre, iVal);
          p += 8;
          break;
        }

        case 0x02: {                  /* real */
          sqlite3_int64 iVal = 0;
          double fVal = 0.0;
          iVal = fuzzGetI64(p);
          memcpy(&fVal, &iVal, 8);
          printf("%s%f", zPre, fVal);
          p += 8;
          break;
        }

        case 0x03:                    /* text */
        case 0x04: {                  /* blob */
          int nTxt;
          p += fuzzGetVarint(p, &nTxt);
          printf("%s%s", zPre, eType==0x03 ? "'" : "X'");
          for(i=0; i<nTxt; i++){
            if( eType==0x03 ){
              printf("%c", p[i]);
            }else{
              char aHex[16] = {'0', '1', '2', '3', '4', '5', '6', '7',
                               '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'
              };
              printf("%c", aHex[ p[i]>>4 ]);
              printf("%c", aHex[ p[i] & 0x0F ]);
            }
          }
          printf("'");
          p += nTxt;
          break;
        }

        case 0x05:                    /* null */
          printf("%sNULL", zPre);
          break;
      }
      zPre = ", ";
    }
  }
  printf(")");

  *ppRec = p;
  return rc;
}

/*
** Print a human-readable version of the table-header and all changes in the
** change-group passed as the second argument.
*/
static void fuzzPrintGroup(FuzzChangeset *pParse, FuzzChangesetGroup *pGrp){
  int i;
  u8 *p;

  /* The table header */
  printf("TABLE:  %s nCol=%d aPK=", pGrp->zTab, pGrp->nCol);
  for(i=0; i<pGrp->nCol; i++){
    printf("%d", (int)pGrp->aPK[i]);
  }
  printf("\n");

  /* The array of changes */
  p = pGrp->aChange;
  for(i=0; i<pGrp->nChange; i++){
    u8 eType = p[0];
    u8 bIndirect = p[1];
    printf("%s (ind=%d):",
        (eType==SQLITE_INSERT) ? "INSERT" :
        (eType==SQLITE_DELETE ? "DELETE" : "UPDATE"),
        bIndirect
    );
    p += 2;

    if( pParse->bPatchset==0 && eType==SQLITE_UPDATE ){
      fuzzPrintRecord(pGrp, &p, 0);
    }
    fuzzPrintRecord(pGrp, &p, eType==SQLITE_DELETE && pParse->bPatchset);
    printf("\n");
  }
}

/*
** Initialize the object passed as the second parameter with details
** of the change that will be attempted (type of change, to which part of the
** changeset it applies etc.). If successful, return SQLITE_OK. Or, if an
** error occurs, return an SQLite error code. 
**
** If a negative value is returned, then the selected change would have
** produced a non-well-formed changeset. In this case the caller should
** call this function again.
*/
static int fuzzSelectChange(FuzzChangeset *pParse, FuzzChange *pChange){
  int iSub;

  memset(pChange, 0, sizeof(FuzzChange));
  pChange->eType = fuzzRandomInt(FUZZ_COLUMN_DEL) + 1;

  assert( pChange->eType==FUZZ_VALUE_SUB
       || pChange->eType==FUZZ_VALUE_MOD
       || pChange->eType==FUZZ_VALUE_RND
       || pChange->eType==FUZZ_CHANGE_DUP
       || pChange->eType==FUZZ_CHANGE_DEL
       || pChange->eType==FUZZ_CHANGE_TYPE
       || pChange->eType==FUZZ_CHANGE_FIELD
       || pChange->eType==FUZZ_CHANGE_INDIRECT
       || pChange->eType==FUZZ_GROUP_DUP
       || pChange->eType==FUZZ_GROUP_DEL
       || pChange->eType==FUZZ_GROUP_SWAP
       || pChange->eType==FUZZ_COLUMN_ADD
       || pChange->eType==FUZZ_COLUMN_ADDPK
       || pChange->eType==FUZZ_COLUMN_DEL
  );

  pChange->iGroup = fuzzRandomInt(pParse->nGroup);
  pChange->iChange = fuzzRandomInt(pParse->nChange);
  if( pChange->eType==FUZZ_CHANGE_FIELD ){
    if( pParse->nUpdate==0 ) return -1;
    pChange->iChange = fuzzRandomInt(pParse->nUpdate);
  }

  pChange->iDelete = -1;
  if( pChange->eType==FUZZ_COLUMN_DEL ){
    FuzzChangesetGroup *pGrp = pParse->apGroup[pChange->iGroup];
    int i;
    pChange->iDelete = fuzzRandomInt(pGrp->nCol);
    for(i=pGrp->nCol-1; i>=0; i--){
      if( pGrp->aPK[i] && pChange->iDelete!=i ) break;
    }
    if( i<0 ) return -1;
  }

  if( pChange->eType==FUZZ_GROUP_SWAP ){
    FuzzChangesetGroup *pGrp;
    int iGrp = pChange->iGroup;
    if( pParse->nGroup==1 ) return -1;
    while( iGrp==pChange->iGroup ){
      iGrp = fuzzRandomInt(pParse->nGroup);
    }
    pGrp = pParse->apGroup[pChange->iGroup];
    pParse->apGroup[pChange->iGroup] = pParse->apGroup[iGrp];
    pParse->apGroup[iGrp] = pGrp;
  }

  if( pChange->eType==FUZZ_VALUE_SUB 
   || pChange->eType==FUZZ_VALUE_MOD 
   || pChange->eType==FUZZ_VALUE_RND 
  ){
    iSub = fuzzRandomInt(pParse->nVal);
    pChange->pSub1 = pParse->apVal[iSub];
    if( pChange->eType==FUZZ_VALUE_SUB ){
      iSub = fuzzRandomInt(pParse->nVal);
      pChange->pSub2 = pParse->apVal[iSub];
    }else{
      pChange->pSub2 = pChange->aSub;
    }

    if( pChange->eType==FUZZ_VALUE_RND ){
      pChange->aSub[0] = (u8)(fuzzRandomInt(5) + 1);
      switch( pChange->aSub[0] ){
        case 0x01: {                  /* integer */
          u64 iVal = fuzzRandomU64();
          fuzzPutU64(&pChange->aSub[1], iVal);
          break;
        }

        case 0x02: {                  /* real */
          u64 iVal1 = fuzzRandomU64();
          u64 iVal2 = fuzzRandomU64();
          double d = (double)iVal1 / (double)iVal2;
          memcpy(&iVal1, &d, sizeof(iVal1));
          fuzzPutU64(&pChange->aSub[1], iVal1);
          break;
        }

        case 0x03:                    /* text */
        case 0x04: {                  /* blob */
          int nByte = fuzzRandomInt(48);
          pChange->aSub[1] = (u8)nByte;
          fuzzRandomBlob(nByte, &pChange->aSub[2]);
          if( pChange->aSub[0]==0x03 ){
            int i;
            for(i=0; i<nByte; i++){
              pChange->aSub[2+i] &= 0x7F;
            }
          }
          break;
        }
      }
    }
    if( pChange->eType==FUZZ_VALUE_MOD ){
      int sz;
      int iMod = -1;
      fuzzChangeSize(pChange->pSub1, &sz);
      memcpy(pChange->aSub, pChange->pSub1, sz);
      switch( pChange->aSub[0] ){
        case 0x01:
        case 0x02:
          iMod = fuzzRandomInt(8) + 1;
          break;

        case 0x03:                    /* text */
        case 0x04: {                  /* blob */
          int nByte;
          int iFirst = 1 + fuzzGetVarint(&pChange->aSub[1], &nByte);
          if( nByte>0 ){
            iMod = fuzzRandomInt(nByte) + iFirst;
          }
          break;
        }
      }

      if( iMod>=0 ){
        u8 mask = (1 << fuzzRandomInt(8 - (pChange->aSub[0]==0x03)));
        pChange->aSub[iMod] ^= mask;
      }
    }
  }

  return SQLITE_OK;
}

/*
** Copy a single change from the input to the output changeset, making
** any modifications specified by (*pFuzz).
*/
static int fuzzCopyChange(
  FuzzChangeset *pParse,
  int iGrp,
  FuzzChange *pFuzz,
  u8 **pp, u8 **ppOut             /* IN/OUT: Input and output pointers */
){
  int bPS = pParse->bPatchset;
  FuzzChangesetGroup *pGrp = pParse->apGroup[iGrp];
  u8 *p = *pp;
  u8 *pOut = *ppOut;
  u8 eType = p++[0];
  int iRec;
  int nRec = ((eType==SQLITE_UPDATE && !bPS) ? 2 : 1);
  int iUndef = -1;
  int nUpdate = 0;

  u8 eNew = eType;
  if( pFuzz->iCurrent==pFuzz->iChange && pFuzz->eType==FUZZ_CHANGE_TYPE ){
    switch( eType ){
      case SQLITE_INSERT:
        eNew = SQLITE_DELETE;
        break;
      case SQLITE_DELETE:
        eNew = SQLITE_UPDATE;
        break;
      case SQLITE_UPDATE:
        eNew = SQLITE_INSERT;
        break;
    }
  }

  if( pFuzz->iCurrent==pFuzz->iChange 
   && pFuzz->eType==FUZZ_CHANGE_FIELD && eType==SQLITE_UPDATE
  ){
    int sz;
    int i;
    int nDef = 0;
    u8 *pCsr = p+1;
    for(i=0; i<pGrp->nCol; i++){
      if( pCsr[0] && pGrp->aPK[i]==0 ) nDef++;
      fuzzChangeSize(pCsr, &sz);
      pCsr += sz;
    }
    if( nDef<=1 ) return -1;
    nDef = fuzzRandomInt(nDef);
    pCsr = p+1;
    for(i=0; i<pGrp->nCol; i++){
      if( pCsr[0] && pGrp->aPK[i]==0 ){
        if( nDef==0 ) iUndef = i;
        nDef--;
      }
      fuzzChangeSize(pCsr, &sz);
      pCsr += sz;
    }
  }

  /* Copy the change type and indirect flag. If the fuzz mode is
  ** FUZZ_CHANGE_INDIRECT, and the current change is the one selected for
  ** fuzzing, invert the indirect flag.  */
  *(pOut++) = eNew;
  if( pFuzz->eType==FUZZ_CHANGE_INDIRECT && pFuzz->iCurrent==pFuzz->iChange ){
    *(pOut++) = !(*(p++));
  }else{
    *(pOut++) = *(p++);
  }

  for(iRec=0; iRec<nRec; iRec++){
    int i;

    /* Copy the next record from the output to the input.
    */
    for(i=0; i<pGrp->nCol; i++){
      int sz;
      u8 *pCopy = p;

      /* If this is a patchset, and the input is a DELETE, then the only
      ** fields present are the PK fields. So, if this is not a PK, skip to 
      ** the next column. If the current fuzz is FUZZ_CHANGE_TYPE, then
      ** write a randomly selected value to the output.  */
      if( bPS && eType==SQLITE_DELETE && pGrp->aPK[i]==0 ){
        if( eType!=eNew ){
          assert( eNew==SQLITE_UPDATE );
          do {
            pCopy = pParse->apVal[fuzzRandomInt(pParse->nVal)];
          }while( pCopy[0]==0x00 );
          fuzzChangeSize(pCopy, &sz);
          memcpy(pOut, pCopy, sz);
          pOut += sz;
        }
        continue;
      }

      if( p==pFuzz->pSub1 ){
        pCopy = pFuzz->pSub2;
      }else if( p==pFuzz->pSub2 ){
        pCopy = pFuzz->pSub1;
      }else if( i==iUndef ){
        pCopy = (u8*)"\0";
      }

      if( pCopy[0]==0x00 && eNew!=eType && eType==SQLITE_UPDATE && iRec==0 ){
        while( pCopy[0]==0x00 ){
          pCopy = pParse->apVal[fuzzRandomInt(pParse->nVal)];
        }
      }else if( p[0]==0x00 && pCopy[0]!=0x00 ){
        return -1;
      }else{
        if( pGrp->aPK[i]>0 && pCopy[0]==0x05 ) return -1;
      }

      if( (pFuzz->iGroup!=iGrp || i!=pFuzz->iDelete)
       && (eNew==eType || eType!=SQLITE_UPDATE || iRec==0)
       && (eNew==eType || eNew!=SQLITE_DELETE || !bPS || pGrp->aPK[i])
      ){
        fuzzChangeSize(pCopy, &sz);
        memcpy(pOut, pCopy, sz);
        pOut += sz;
        nUpdate += (pGrp->aPK[i]==0 && pCopy[0]!=0x00);
      }

      fuzzChangeSize(p, &sz);
      p += sz;
    }

    if( iGrp==pFuzz->iGroup ){
      if( pFuzz->eType==FUZZ_COLUMN_ADD ){
        if( !bPS || eType!=SQLITE_DELETE ) *(pOut++) = 0x05;
      }else if( pFuzz->eType==FUZZ_COLUMN_ADDPK ){
        if( iRec==1 ){
          *(pOut++) = 0x00;
        }else{
          u8 *pNew;
          int szNew;
          do {
            pNew = pParse->apVal[fuzzRandomInt(pParse->nVal)];
          }while( pNew[0]==0x00 || pNew[0]==0x05 );
          fuzzChangeSize(pNew, &szNew);
          memcpy(pOut, pNew, szNew);
          pOut += szNew;
        }
      }
    }
  }

  if( pFuzz->iCurrent==pFuzz->iChange ){
    if( pFuzz->eType==FUZZ_CHANGE_DUP ){
      int nByte = pOut - (*ppOut);
      memcpy(pOut, *ppOut, nByte);
      pOut += nByte;
    }

    if( pFuzz->eType==FUZZ_CHANGE_DEL ){
      pOut = *ppOut;
    }
    if( eNew!=eType && eNew==SQLITE_UPDATE && !bPS ){
      int i;
      u8 *pCsr = (*ppOut) + 2;
      for(i=0; i<pGrp->nCol; i++){
        int sz;
        u8 *pCopy = pCsr;
        if( pGrp->aPK[i] ) pCopy = (u8*)"\0";
        fuzzChangeSize(pCopy, &sz);
        memcpy(pOut, pCopy, sz);
        pOut += sz;
        fuzzChangeSize(pCsr, &sz);
        pCsr += sz;
      }
    }
  }

  /* If a column is being deleted from this group, and this change was an 
  ** UPDATE, and there are now no non-PK, non-undefined columns in the 
  ** change, remove it altogether. */
  if( pFuzz->eType==FUZZ_COLUMN_DEL && pFuzz->iGroup==iGrp 
   && eType==SQLITE_UPDATE && nUpdate==0 
  ){
    pOut = *ppOut;
  }

  *pp = p;
  *ppOut = pOut;
  pFuzz->iCurrent += (eType==SQLITE_UPDATE || pFuzz->eType!=FUZZ_CHANGE_FIELD);
  return SQLITE_OK;
}

/*
** Fuzz the changeset parsed into object pParse and write the results 
** to file zOut on disk. Argument pBuf points to a buffer that is guaranteed
** to be large enough to hold the fuzzed changeset.
**
** Return SQLITE_OK if successful, or an SQLite error code if an error occurs.
*/
static int fuzzDoOneFuzz(
  const char *zOut,               /* Filename to write modified changeset to */
  u8 *pBuf,                       /* Buffer to use for modified changeset */
  FuzzChangeset *pParse           /* Parse of input changeset */
){
  FuzzChange change;
  int iGrp;
  int rc = -1;

  while( rc<0 ){
    u8 *pOut = pBuf;
    rc = fuzzSelectChange(pParse, &change);
    for(iGrp=0; rc==SQLITE_OK && iGrp<pParse->nGroup; iGrp++){
      FuzzChangesetGroup *pGrp = pParse->apGroup[iGrp];
      int nTab = strlen(pGrp->zTab) + 1;
      int j;
      int nRep = 1;

      /* If this is the group to delete for a FUZZ_GROUP_DEL change, jump to
      ** the next group. Unless this is the only group in the changeset - in
      ** that case this change cannot be applied.
      **
      ** Or, if this is a FUZZ_GROUP_DUP, set nRep to 2 to output two
      ** copies of the group. */
      if( change.iGroup==iGrp ){
        if( change.eType==FUZZ_GROUP_DEL ){
          if( pParse->nGroup==1 ) rc = -1;
          continue;
        }
        else if( change.eType==FUZZ_GROUP_DUP ){
          nRep = 2;
        }
      }

      for(j=0; j<nRep; j++){
        int i;
        u8 *pSaved;
        u8 *p = pGrp->aChange;
        int nCol = pGrp->nCol;
        int iPKDel = 0;
        if( iGrp==change.iGroup ){
          if( change.eType==FUZZ_COLUMN_ADD 
           || change.eType==FUZZ_COLUMN_ADDPK 
          ){
            nCol++;
          }else if( change.eType==FUZZ_COLUMN_DEL ){
            nCol--;
            iPKDel = pGrp->aPK[change.iDelete];
          }
        }

        /* Output a table header */
        pOut++[0] = pParse->bPatchset ? 'P' : 'T';
        pOut += fuzzPutVarint(pOut, nCol);

        for(i=0; i<pGrp->nCol; i++){
          if( iGrp!=change.iGroup || i!=change.iDelete ){
            u8 v = pGrp->aPK[i];
            if( iPKDel && v>iPKDel ) v--;
            *(pOut++) = v;
          }
        }
        if( nCol>pGrp->nCol ){
          if( change.eType==FUZZ_COLUMN_ADD ){
            *(pOut++) = 0x00;
          }else{
            u8 max = 0;
            for(i=0; i<pGrp->nCol; i++){
              if( pGrp->aPK[i]>max ) max = pGrp->aPK[i];
            }
            *(pOut++) = max+1;
          }
        }
        memcpy(pOut, pGrp->zTab, nTab);
        pOut += nTab;

        /* Output the change array. */
        pSaved = pOut;
        for(i=0; rc==SQLITE_OK && i<pGrp->nChange; i++){
          rc = fuzzCopyChange(pParse, iGrp, &change, &p, &pOut);
        }
        if( pOut==pSaved ) rc = -1;
      }
    }
    if( rc==SQLITE_OK ){
      fuzzWriteFile(zOut, pBuf, pOut-pBuf);
    }
  }

  return rc;
}

int main(int argc, char **argv){
  int nRepeat = 0;                /* Number of output files */
  int iSeed = 0;                  /* Value of PRNG seed */
  const char *zInput;             /* Name of input file */
  void *pChangeset = 0;           /* Input changeset */
  int nChangeset = 0;             /* Size of input changeset in bytes */
  int i;                          /* Current output file */
  FuzzChangeset changeset;        /* Partially parsed changeset */
  int rc;
  u8 *pBuf = 0;

  if( argc!=4 && argc!=2 ) usage(argv[0]);
  zInput = argv[1];

  fuzzReadFile(zInput, &nChangeset, &pChangeset);
  rc = fuzzParseChangeset(pChangeset, nChangeset, &changeset);

  if( rc==SQLITE_OK ){
    if( argc==2 ){
      for(i=0; i<changeset.nGroup; i++){
        fuzzPrintGroup(&changeset, changeset.apGroup[i]);
      }
    }else{
      pBuf = (u8*)fuzzMalloc((sqlite3_int64)nChangeset*2 + 1024);
      if( pBuf==0 ){
        rc = SQLITE_NOMEM;
      }else{
        iSeed = atoi(argv[2]);
        nRepeat = atoi(argv[3]);
        fuzzRandomSeed((unsigned int)iSeed);
        for(i=0; rc==SQLITE_OK && i<nRepeat; i++){
          char *zOut = sqlite3_mprintf("%s-%d", zInput, i);
          rc = fuzzDoOneFuzz(zOut, pBuf, &changeset);
          sqlite3_free(zOut);
        }
        fuzzFree(pBuf);
      }
    }
  }

  if( rc!=SQLITE_OK ){
    fprintf(stderr, "error while processing changeset: %d\n", rc);
  }

  return rc;
}
