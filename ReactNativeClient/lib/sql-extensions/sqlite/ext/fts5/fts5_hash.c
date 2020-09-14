/*
** 2014 August 11
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
*/



#include "fts5Int.h"

typedef struct Fts5HashEntry Fts5HashEntry;

/*
** This file contains the implementation of an in-memory hash table used
** to accumuluate "term -> doclist" content before it is flused to a level-0
** segment.
*/


struct Fts5Hash {
  int eDetail;                    /* Copy of Fts5Config.eDetail */
  int *pnByte;                    /* Pointer to bytes counter */
  int nEntry;                     /* Number of entries currently in hash */
  int nSlot;                      /* Size of aSlot[] array */
  Fts5HashEntry *pScan;           /* Current ordered scan item */
  Fts5HashEntry **aSlot;          /* Array of hash slots */
};

/*
** Each entry in the hash table is represented by an object of the 
** following type. Each object, its key (a nul-terminated string) and 
** its current data are stored in a single memory allocation. The 
** key immediately follows the object in memory. The position list
** data immediately follows the key data in memory.
**
** The data that follows the key is in a similar, but not identical format
** to the doclist data stored in the database. It is:
**
**   * Rowid, as a varint
**   * Position list, without 0x00 terminator.
**   * Size of previous position list and rowid, as a 4 byte
**     big-endian integer.
**
** iRowidOff:
**   Offset of last rowid written to data area. Relative to first byte of
**   structure.
**
** nData:
**   Bytes of data written since iRowidOff.
*/
struct Fts5HashEntry {
  Fts5HashEntry *pHashNext;       /* Next hash entry with same hash-key */
  Fts5HashEntry *pScanNext;       /* Next entry in sorted order */
  
  int nAlloc;                     /* Total size of allocation */
  int iSzPoslist;                 /* Offset of space for 4-byte poslist size */
  int nData;                      /* Total bytes of data (incl. structure) */
  int nKey;                       /* Length of key in bytes */
  u8 bDel;                        /* Set delete-flag @ iSzPoslist */
  u8 bContent;                    /* Set content-flag (detail=none mode) */
  i16 iCol;                       /* Column of last value written */
  int iPos;                       /* Position of last value written */
  i64 iRowid;                     /* Rowid of last value written */
};

/*
** Eqivalent to:
**
**   char *fts5EntryKey(Fts5HashEntry *pEntry){ return zKey; }
*/
#define fts5EntryKey(p) ( ((char *)(&(p)[1])) )


/*
** Allocate a new hash table.
*/
int sqlite3Fts5HashNew(Fts5Config *pConfig, Fts5Hash **ppNew, int *pnByte){
  int rc = SQLITE_OK;
  Fts5Hash *pNew;

  *ppNew = pNew = (Fts5Hash*)sqlite3_malloc(sizeof(Fts5Hash));
  if( pNew==0 ){
    rc = SQLITE_NOMEM;
  }else{
    sqlite3_int64 nByte;
    memset(pNew, 0, sizeof(Fts5Hash));
    pNew->pnByte = pnByte;
    pNew->eDetail = pConfig->eDetail;

    pNew->nSlot = 1024;
    nByte = sizeof(Fts5HashEntry*) * pNew->nSlot;
    pNew->aSlot = (Fts5HashEntry**)sqlite3_malloc64(nByte);
    if( pNew->aSlot==0 ){
      sqlite3_free(pNew);
      *ppNew = 0;
      rc = SQLITE_NOMEM;
    }else{
      memset(pNew->aSlot, 0, (size_t)nByte);
    }
  }
  return rc;
}

/*
** Free a hash table object.
*/
void sqlite3Fts5HashFree(Fts5Hash *pHash){
  if( pHash ){
    sqlite3Fts5HashClear(pHash);
    sqlite3_free(pHash->aSlot);
    sqlite3_free(pHash);
  }
}

/*
** Empty (but do not delete) a hash table.
*/
void sqlite3Fts5HashClear(Fts5Hash *pHash){
  int i;
  for(i=0; i<pHash->nSlot; i++){
    Fts5HashEntry *pNext;
    Fts5HashEntry *pSlot;
    for(pSlot=pHash->aSlot[i]; pSlot; pSlot=pNext){
      pNext = pSlot->pHashNext;
      sqlite3_free(pSlot);
    }
  }
  memset(pHash->aSlot, 0, pHash->nSlot * sizeof(Fts5HashEntry*));
  pHash->nEntry = 0;
}

static unsigned int fts5HashKey(int nSlot, const u8 *p, int n){
  int i;
  unsigned int h = 13;
  for(i=n-1; i>=0; i--){
    h = (h << 3) ^ h ^ p[i];
  }
  return (h % nSlot);
}

static unsigned int fts5HashKey2(int nSlot, u8 b, const u8 *p, int n){
  int i;
  unsigned int h = 13;
  for(i=n-1; i>=0; i--){
    h = (h << 3) ^ h ^ p[i];
  }
  h = (h << 3) ^ h ^ b;
  return (h % nSlot);
}

/*
** Resize the hash table by doubling the number of slots.
*/
static int fts5HashResize(Fts5Hash *pHash){
  int nNew = pHash->nSlot*2;
  int i;
  Fts5HashEntry **apNew;
  Fts5HashEntry **apOld = pHash->aSlot;

  apNew = (Fts5HashEntry**)sqlite3_malloc64(nNew*sizeof(Fts5HashEntry*));
  if( !apNew ) return SQLITE_NOMEM;
  memset(apNew, 0, nNew*sizeof(Fts5HashEntry*));

  for(i=0; i<pHash->nSlot; i++){
    while( apOld[i] ){
      unsigned int iHash;
      Fts5HashEntry *p = apOld[i];
      apOld[i] = p->pHashNext;
      iHash = fts5HashKey(nNew, (u8*)fts5EntryKey(p),
                          (int)strlen(fts5EntryKey(p)));
      p->pHashNext = apNew[iHash];
      apNew[iHash] = p;
    }
  }

  sqlite3_free(apOld);
  pHash->nSlot = nNew;
  pHash->aSlot = apNew;
  return SQLITE_OK;
}

static int fts5HashAddPoslistSize(
  Fts5Hash *pHash, 
  Fts5HashEntry *p,
  Fts5HashEntry *p2
){
  int nRet = 0;
  if( p->iSzPoslist ){
    u8 *pPtr = p2 ? (u8*)p2 : (u8*)p;
    int nData = p->nData;
    if( pHash->eDetail==FTS5_DETAIL_NONE ){
      assert( nData==p->iSzPoslist );
      if( p->bDel ){
        pPtr[nData++] = 0x00;
        if( p->bContent ){
          pPtr[nData++] = 0x00;
        }
      }
    }else{
      int nSz = (nData - p->iSzPoslist - 1);       /* Size in bytes */
      int nPos = nSz*2 + p->bDel;                     /* Value of nPos field */

      assert( p->bDel==0 || p->bDel==1 );
      if( nPos<=127 ){
        pPtr[p->iSzPoslist] = (u8)nPos;
      }else{
        int nByte = sqlite3Fts5GetVarintLen((u32)nPos);
        memmove(&pPtr[p->iSzPoslist + nByte], &pPtr[p->iSzPoslist + 1], nSz);
        sqlite3Fts5PutVarint(&pPtr[p->iSzPoslist], nPos);
        nData += (nByte-1);
      }
    }

    nRet = nData - p->nData;
    if( p2==0 ){
      p->iSzPoslist = 0;
      p->bDel = 0;
      p->bContent = 0;
      p->nData = nData;
    }
  }
  return nRet;
}

/*
** Add an entry to the in-memory hash table. The key is the concatenation
** of bByte and (pToken/nToken). The value is (iRowid/iCol/iPos).
**
**     (bByte || pToken) -> (iRowid,iCol,iPos)
**
** Or, if iCol is negative, then the value is a delete marker.
*/
int sqlite3Fts5HashWrite(
  Fts5Hash *pHash,
  i64 iRowid,                     /* Rowid for this entry */
  int iCol,                       /* Column token appears in (-ve -> delete) */
  int iPos,                       /* Position of token within column */
  char bByte,                     /* First byte of token */
  const char *pToken, int nToken  /* Token to add or remove to or from index */
){
  unsigned int iHash;
  Fts5HashEntry *p;
  u8 *pPtr;
  int nIncr = 0;                  /* Amount to increment (*pHash->pnByte) by */
  int bNew;                       /* If non-delete entry should be written */
  
  bNew = (pHash->eDetail==FTS5_DETAIL_FULL);

  /* Attempt to locate an existing hash entry */
  iHash = fts5HashKey2(pHash->nSlot, (u8)bByte, (const u8*)pToken, nToken);
  for(p=pHash->aSlot[iHash]; p; p=p->pHashNext){
    char *zKey = fts5EntryKey(p);
    if( zKey[0]==bByte 
     && p->nKey==nToken
     && memcmp(&zKey[1], pToken, nToken)==0 
    ){
      break;
    }
  }

  /* If an existing hash entry cannot be found, create a new one. */
  if( p==0 ){
    /* Figure out how much space to allocate */
    char *zKey;
    sqlite3_int64 nByte = sizeof(Fts5HashEntry) + (nToken+1) + 1 + 64;
    if( nByte<128 ) nByte = 128;

    /* Grow the Fts5Hash.aSlot[] array if necessary. */
    if( (pHash->nEntry*2)>=pHash->nSlot ){
      int rc = fts5HashResize(pHash);
      if( rc!=SQLITE_OK ) return rc;
      iHash = fts5HashKey2(pHash->nSlot, (u8)bByte, (const u8*)pToken, nToken);
    }

    /* Allocate new Fts5HashEntry and add it to the hash table. */
    p = (Fts5HashEntry*)sqlite3_malloc64(nByte);
    if( !p ) return SQLITE_NOMEM;
    memset(p, 0, sizeof(Fts5HashEntry));
    p->nAlloc = (int)nByte;
    zKey = fts5EntryKey(p);
    zKey[0] = bByte;
    memcpy(&zKey[1], pToken, nToken);
    assert( iHash==fts5HashKey(pHash->nSlot, (u8*)zKey, nToken+1) );
    p->nKey = nToken;
    zKey[nToken+1] = '\0';
    p->nData = nToken+1 + 1 + sizeof(Fts5HashEntry);
    p->pHashNext = pHash->aSlot[iHash];
    pHash->aSlot[iHash] = p;
    pHash->nEntry++;

    /* Add the first rowid field to the hash-entry */
    p->nData += sqlite3Fts5PutVarint(&((u8*)p)[p->nData], iRowid);
    p->iRowid = iRowid;

    p->iSzPoslist = p->nData;
    if( pHash->eDetail!=FTS5_DETAIL_NONE ){
      p->nData += 1;
      p->iCol = (pHash->eDetail==FTS5_DETAIL_FULL ? 0 : -1);
    }

    nIncr += p->nData;
  }else{

    /* Appending to an existing hash-entry. Check that there is enough 
    ** space to append the largest possible new entry. Worst case scenario 
    ** is:
    **
    **     + 9 bytes for a new rowid,
    **     + 4 byte reserved for the "poslist size" varint.
    **     + 1 byte for a "new column" byte,
    **     + 3 bytes for a new column number (16-bit max) as a varint,
    **     + 5 bytes for the new position offset (32-bit max).
    */
    if( (p->nAlloc - p->nData) < (9 + 4 + 1 + 3 + 5) ){
      sqlite3_int64 nNew = p->nAlloc * 2;
      Fts5HashEntry *pNew;
      Fts5HashEntry **pp;
      pNew = (Fts5HashEntry*)sqlite3_realloc64(p, nNew);
      if( pNew==0 ) return SQLITE_NOMEM;
      pNew->nAlloc = (int)nNew;
      for(pp=&pHash->aSlot[iHash]; *pp!=p; pp=&(*pp)->pHashNext);
      *pp = pNew;
      p = pNew;
    }
    nIncr -= p->nData;
  }
  assert( (p->nAlloc - p->nData) >= (9 + 4 + 1 + 3 + 5) );

  pPtr = (u8*)p;

  /* If this is a new rowid, append the 4-byte size field for the previous
  ** entry, and the new rowid for this entry.  */
  if( iRowid!=p->iRowid ){
    fts5HashAddPoslistSize(pHash, p, 0);
    p->nData += sqlite3Fts5PutVarint(&pPtr[p->nData], iRowid - p->iRowid);
    p->iRowid = iRowid;
    bNew = 1;
    p->iSzPoslist = p->nData;
    if( pHash->eDetail!=FTS5_DETAIL_NONE ){
      p->nData += 1;
      p->iCol = (pHash->eDetail==FTS5_DETAIL_FULL ? 0 : -1);
      p->iPos = 0;
    }
  }

  if( iCol>=0 ){
    if( pHash->eDetail==FTS5_DETAIL_NONE ){
      p->bContent = 1;
    }else{
      /* Append a new column value, if necessary */
      assert( iCol>=p->iCol );
      if( iCol!=p->iCol ){
        if( pHash->eDetail==FTS5_DETAIL_FULL ){
          pPtr[p->nData++] = 0x01;
          p->nData += sqlite3Fts5PutVarint(&pPtr[p->nData], iCol);
          p->iCol = (i16)iCol;
          p->iPos = 0;
        }else{
          bNew = 1;
          p->iCol = (i16)(iPos = iCol);
        }
      }

      /* Append the new position offset, if necessary */
      if( bNew ){
        p->nData += sqlite3Fts5PutVarint(&pPtr[p->nData], iPos - p->iPos + 2);
        p->iPos = iPos;
      }
    }
  }else{
    /* This is a delete. Set the delete flag. */
    p->bDel = 1;
  }

  nIncr += p->nData;
  *pHash->pnByte += nIncr;
  return SQLITE_OK;
}


/*
** Arguments pLeft and pRight point to linked-lists of hash-entry objects,
** each sorted in key order. This function merges the two lists into a
** single list and returns a pointer to its first element.
*/
static Fts5HashEntry *fts5HashEntryMerge(
  Fts5HashEntry *pLeft,
  Fts5HashEntry *pRight
){
  Fts5HashEntry *p1 = pLeft;
  Fts5HashEntry *p2 = pRight;
  Fts5HashEntry *pRet = 0;
  Fts5HashEntry **ppOut = &pRet;

  while( p1 || p2 ){
    if( p1==0 ){
      *ppOut = p2;
      p2 = 0;
    }else if( p2==0 ){
      *ppOut = p1;
      p1 = 0;
    }else{
      int i = 0;
      char *zKey1 = fts5EntryKey(p1);
      char *zKey2 = fts5EntryKey(p2);
      while( zKey1[i]==zKey2[i] ) i++;

      if( ((u8)zKey1[i])>((u8)zKey2[i]) ){
        /* p2 is smaller */
        *ppOut = p2;
        ppOut = &p2->pScanNext;
        p2 = p2->pScanNext;
      }else{
        /* p1 is smaller */
        *ppOut = p1;
        ppOut = &p1->pScanNext;
        p1 = p1->pScanNext;
      }
      *ppOut = 0;
    }
  }

  return pRet;
}

/*
** Extract all tokens from hash table iHash and link them into a list
** in sorted order. The hash table is cleared before returning. It is
** the responsibility of the caller to free the elements of the returned
** list.
*/
static int fts5HashEntrySort(
  Fts5Hash *pHash, 
  const char *pTerm, int nTerm,   /* Query prefix, if any */
  Fts5HashEntry **ppSorted
){
  const int nMergeSlot = 32;
  Fts5HashEntry **ap;
  Fts5HashEntry *pList;
  int iSlot;
  int i;

  *ppSorted = 0;
  ap = sqlite3_malloc64(sizeof(Fts5HashEntry*) * nMergeSlot);
  if( !ap ) return SQLITE_NOMEM;
  memset(ap, 0, sizeof(Fts5HashEntry*) * nMergeSlot);

  for(iSlot=0; iSlot<pHash->nSlot; iSlot++){
    Fts5HashEntry *pIter;
    for(pIter=pHash->aSlot[iSlot]; pIter; pIter=pIter->pHashNext){
      if( pTerm==0 
       || (pIter->nKey+1>=nTerm && 0==memcmp(fts5EntryKey(pIter), pTerm, nTerm))
      ){
        Fts5HashEntry *pEntry = pIter;
        pEntry->pScanNext = 0;
        for(i=0; ap[i]; i++){
          pEntry = fts5HashEntryMerge(pEntry, ap[i]);
          ap[i] = 0;
        }
        ap[i] = pEntry;
      }
    }
  }

  pList = 0;
  for(i=0; i<nMergeSlot; i++){
    pList = fts5HashEntryMerge(pList, ap[i]);
  }

  pHash->nEntry = 0;
  sqlite3_free(ap);
  *ppSorted = pList;
  return SQLITE_OK;
}

/*
** Query the hash table for a doclist associated with term pTerm/nTerm.
*/
int sqlite3Fts5HashQuery(
  Fts5Hash *pHash,                /* Hash table to query */
  int nPre,
  const char *pTerm, int nTerm,   /* Query term */
  void **ppOut,                   /* OUT: Pointer to new object */
  int *pnDoclist                  /* OUT: Size of doclist in bytes */
){
  unsigned int iHash = fts5HashKey(pHash->nSlot, (const u8*)pTerm, nTerm);
  char *zKey = 0;
  Fts5HashEntry *p;

  for(p=pHash->aSlot[iHash]; p; p=p->pHashNext){
    zKey = fts5EntryKey(p);
    assert( p->nKey+1==(int)strlen(zKey) );
    if( nTerm==p->nKey+1 && memcmp(zKey, pTerm, nTerm)==0 ) break;
  }

  if( p ){
    int nHashPre = sizeof(Fts5HashEntry) + nTerm + 1;
    int nList = p->nData - nHashPre;
    u8 *pRet = (u8*)(*ppOut = sqlite3_malloc64(nPre + nList + 10));
    if( pRet ){
      Fts5HashEntry *pFaux = (Fts5HashEntry*)&pRet[nPre-nHashPre];
      memcpy(&pRet[nPre], &((u8*)p)[nHashPre], nList);
      nList += fts5HashAddPoslistSize(pHash, p, pFaux);
      *pnDoclist = nList;
    }else{
      *pnDoclist = 0;
      return SQLITE_NOMEM;
    }
  }else{
    *ppOut = 0;
    *pnDoclist = 0;
  }

  return SQLITE_OK;
}

int sqlite3Fts5HashScanInit(
  Fts5Hash *p,                    /* Hash table to query */
  const char *pTerm, int nTerm    /* Query prefix */
){
  return fts5HashEntrySort(p, pTerm, nTerm, &p->pScan);
}

void sqlite3Fts5HashScanNext(Fts5Hash *p){
  assert( !sqlite3Fts5HashScanEof(p) );
  p->pScan = p->pScan->pScanNext;
}

int sqlite3Fts5HashScanEof(Fts5Hash *p){
  return (p->pScan==0);
}

void sqlite3Fts5HashScanEntry(
  Fts5Hash *pHash,
  const char **pzTerm,            /* OUT: term (nul-terminated) */
  const u8 **ppDoclist,           /* OUT: pointer to doclist */
  int *pnDoclist                  /* OUT: size of doclist in bytes */
){
  Fts5HashEntry *p;
  if( (p = pHash->pScan) ){
    char *zKey = fts5EntryKey(p);
    int nTerm = (int)strlen(zKey);
    fts5HashAddPoslistSize(pHash, p, 0);
    *pzTerm = zKey;
    *ppDoclist = (const u8*)&zKey[nTerm+1];
    *pnDoclist = p->nData - (sizeof(Fts5HashEntry) + nTerm + 1);
  }else{
    *pzTerm = 0;
    *ppDoclist = 0;
    *pnDoclist = 0;
  }
}
