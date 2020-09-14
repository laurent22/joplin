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
**
** This file contains the implementation of an in-memory tree structure.
**
** Technically the tree is a B-tree of order 4 (in the Knuth sense - each 
** node may have up to 4 children). Keys are stored within B-tree nodes by
** reference. This may be slightly slower than a conventional red-black
** tree, but it is simpler. It is also an easier structure to modify to 
** create a version that supports nested transaction rollback.
**
** This tree does not currently support a delete operation. One is not 
** required. When LSM deletes a key from a database, it inserts a DELETE
** marker into the data structure. As a result, although the value associated
** with a key stored in the in-memory tree structure may be modified, no
** keys are ever removed. 
*/

/*
** MVCC NOTES
**
**   The in-memory tree structure supports SQLite-style MVCC. This means
**   that while one client is writing to the tree structure, other clients
**   may still be querying an older snapshot of the tree.
**
**   One way to implement this is to use an append-only b-tree. In this 
**   case instead of modifying nodes in-place, a copy of the node is made
**   and the required modifications made to the copy. The parent of the
**   node is then modified (to update the pointer so that it points to
**   the new copy), which causes a copy of the parent to be made, and so on.
**   This means that each time the tree is written to a new root node is
**   created. A snapshot is identified by the root node that it uses.
**
**   The problem with the above is that each time the tree is written to,
**   a copy of the node structure modified and all of its ancestor nodes
**   is made. This may prove excessive with large tree structures.
**
**   To reduce this overhead, the data structure used for a tree node is
**   designed so that it may be edited in place exactly once without 
**   affecting existing users. In other words, the node structure is capable
**   of storing two separate versions of the node at the same time.
**   When a node is to be edited, if the node structure already contains 
**   two versions, a copy is made as in the append-only approach. Or, if
**   it only contains a single version, it is edited in place.
**
**   This reduces the overhead so that, roughly, one new node structure
**   must be allocated for each write (on top of those allocations that 
**   would have been required by a non-MVCC tree). Logic: Assume that at 
**   any time, 50% of nodes in the tree already contain 2 versions. When
**   a new entry is written to a node, there is a 50% chance that a copy
**   of the node will be required. And a 25% chance that a copy of its 
**   parent is required. And so on.
**
** ROLLBACK
**
**   The in-memory tree also supports transaction and sub-transaction 
**   rollback. In order to rollback to point in time X, the following is
**   necessary:
**
**     1. All memory allocated since X must be freed, and 
**     2. All "v2" data adding to nodes that existed at X should be zeroed.
**     3. The root node must be restored to its X value.
**
**   The Mempool object used to allocate memory for the tree supports 
**   operation (1) - see the lsmPoolMark() and lsmPoolRevert() functions.
**
**   To support (2), all nodes that have v2 data are part of a singly linked 
**   list, sorted by the age of the v2 data (nodes that have had data added 
**   most recently are at the end of the list). So to zero all v2 data added
**   since X, the linked list is traversed from the first node added following
**   X onwards.
**
*/

#ifndef _LSM_INT_H
# include "lsmInt.h"
#endif

#include <string.h>

#define MAX_DEPTH 32

typedef struct TreeKey TreeKey;
typedef struct TreeNode TreeNode;
typedef struct TreeLeaf TreeLeaf;
typedef struct NodeVersion NodeVersion;

struct TreeOld {
  u32 iShmid;                     /* Last shared-memory chunk in use by old */
  u32 iRoot;                      /* Offset of root node in shm file */
  u32 nHeight;                    /* Height of tree structure */
};

#if 0
/*
** assert() that a TreeKey.flags value is sane. Usage:
**
**   assert( lsmAssertFlagsOk(pTreeKey->flags) );
*/
static int lsmAssertFlagsOk(u8 keyflags){
  /* At least one flag must be set. Otherwise, what is this key doing? */
  assert( keyflags!=0 );

  /* The POINT_DELETE and INSERT flags cannot both be set. */
  assert( (keyflags & LSM_POINT_DELETE)==0 || (keyflags & LSM_INSERT)==0 );

  /* If both the START_DELETE and END_DELETE flags are set, then the INSERT
  ** flag must also be set. In other words - the three DELETE flags cannot
  ** all be set */
  assert( (keyflags & LSM_END_DELETE)==0 
       || (keyflags & LSM_START_DELETE)==0 
       || (keyflags & LSM_POINT_DELETE)==0 
  );

  return 1;
}
#endif
static int assert_delete_ranges_match(lsm_db *);
static int treeCountEntries(lsm_db *db);

/*
** Container for a key-value pair. Within the *-shm file, each key/value
** pair is stored in a single allocation (which may not actually be 
** contiguous in memory). Layout is the TreeKey structure, followed by
** the nKey bytes of key blob, followed by the nValue bytes of value blob
** (if nValue is non-negative).
*/
struct TreeKey {
  int nKey;                       /* Size of pKey in bytes */
  int nValue;                     /* Size of pValue. Or negative. */
  u8 flags;                       /* Various LSM_XXX flags */
};

#define TKV_KEY(p) ((void *)&(p)[1])
#define TKV_VAL(p) ((void *)(((u8 *)&(p)[1]) + (p)->nKey))

/*
** A single tree node. A node structure may contain up to 3 key/value
** pairs. Internal (non-leaf) nodes have up to 4 children.
**
** TODO: Update the format of this to be more compact. Get it working
** first though...
*/
struct TreeNode {
  u32 aiKeyPtr[3];                /* Array of pointers to TreeKey objects */

  /* The following fields are present for interior nodes only, not leaves. */
  u32 aiChildPtr[4];              /* Array of pointers to child nodes */

  /* The extra child pointer slot. */
  u32 iV2;                        /* Transaction number of v2 */
  u8 iV2Child;                    /* apChild[] entry replaced by pV2Ptr */
  u32 iV2Ptr;                     /* Substitute pointer */
};

struct TreeLeaf {
  u32 aiKeyPtr[3];                /* Array of pointers to TreeKey objects */
};

typedef struct TreeBlob TreeBlob;
struct TreeBlob {
  int n;
  u8 *a;
};

/*
** Cursor for searching a tree structure.
**
** If a cursor does not point to any element (a.k.a. EOF), then the
** TreeCursor.iNode variable is set to a negative value. Otherwise, the
** cursor currently points to key aiCell[iNode] on node apTreeNode[iNode].
**
** Entries in the apTreeNode[] and aiCell[] arrays contain the node and
** index of the TreeNode.apChild[] pointer followed to descend to the 
** current element. Hence apTreeNode[0] always contains the root node of
** the tree.
*/
struct TreeCursor {
  lsm_db *pDb;                    /* Database handle for this cursor */
  TreeRoot *pRoot;                /* Root node and height of tree to access */
  int iNode;                      /* Cursor points at apTreeNode[iNode] */
  TreeNode *apTreeNode[MAX_DEPTH];/* Current position in tree */
  u8 aiCell[MAX_DEPTH];           /* Current position in tree */
  TreeKey *pSave;                 /* Saved key */
  TreeBlob blob;                  /* Dynamic storage for a key */
};

/*
** A value guaranteed to be larger than the largest possible transaction
** id (TreeHeader.iTransId).
*/
#define WORKING_VERSION (1<<30)

static int tblobGrow(lsm_db *pDb, TreeBlob *p, int n, int *pRc){
  if( n>p->n ){
    lsmFree(pDb->pEnv, p->a);
    p->a = lsmMallocRc(pDb->pEnv, n, pRc);
    p->n = n;
  }
  return (p->a==0);
}
static void tblobFree(lsm_db *pDb, TreeBlob *p){
  lsmFree(pDb->pEnv, p->a);
}


/***********************************************************************
** Start of IntArray methods.  */
/*
** Append value iVal to the contents of IntArray *p. Return LSM_OK if 
** successful, or LSM_NOMEM if an OOM condition is encountered.
*/
static int intArrayAppend(lsm_env *pEnv, IntArray *p, u32 iVal){
  assert( p->nArray<=p->nAlloc );
  if( p->nArray>=p->nAlloc ){
    u32 *aNew;
    int nNew = p->nArray ? p->nArray*2 : 128;
    aNew = lsmRealloc(pEnv, p->aArray, nNew*sizeof(u32));
    if( !aNew ) return LSM_NOMEM_BKPT;
    p->aArray = aNew;
    p->nAlloc = nNew;
  }

  p->aArray[p->nArray++] = iVal;
  return LSM_OK;
}

/*
** Zero the IntArray object.
*/
static void intArrayFree(lsm_env *pEnv, IntArray *p){
  p->nArray = 0;
}

/*
** Return the number of entries currently in the int-array object.
*/
static int intArraySize(IntArray *p){
  return p->nArray;
}

/*
** Return a copy of the iIdx'th entry in the int-array.
*/
static u32 intArrayEntry(IntArray *p, int iIdx){
  return p->aArray[iIdx];
}

/*
** Truncate the int-array so that all but the first nVal values are 
** discarded.
*/
static void intArrayTruncate(IntArray *p, int nVal){
  p->nArray = nVal;
}
/* End of IntArray methods.
***********************************************************************/

static int treeKeycmp(void *p1, int n1, void *p2, int n2){
  int res;
  res = memcmp(p1, p2, LSM_MIN(n1, n2));
  if( res==0 ) res = (n1-n2);
  return res;
}

/*
** The pointer passed as the first argument points to an interior node,
** not a leaf. This function returns the offset of the iCell'th child
** sub-tree of the node.
*/
static u32 getChildPtr(TreeNode *p, int iVersion, int iCell){
  assert( iVersion>=0 );
  assert( iCell>=0 && iCell<=array_size(p->aiChildPtr) );
  if( p->iV2 && p->iV2<=(u32)iVersion && iCell==p->iV2Child ) return p->iV2Ptr;
  return p->aiChildPtr[iCell];
}

/*
** Given an offset within the *-shm file, return the associated chunk number.
*/
static int treeOffsetToChunk(u32 iOff){
  assert( LSM_SHM_CHUNK_SIZE==(1<<15) );
  return (int)(iOff>>15);
}

#define treeShmptrUnsafe(pDb, iPtr) \
(&((u8*)((pDb)->apShm[(iPtr)>>15]))[(iPtr) & (LSM_SHM_CHUNK_SIZE-1)])

/*
** Return a pointer to the mapped memory location associated with *-shm 
** file offset iPtr.
*/
static void *treeShmptr(lsm_db *pDb, u32 iPtr){

  assert( (iPtr>>15)<(u32)pDb->nShm );
  assert( pDb->apShm[iPtr>>15] );

  return iPtr ? treeShmptrUnsafe(pDb, iPtr) : 0;
}

static ShmChunk * treeShmChunk(lsm_db *pDb, int iChunk){
  return (ShmChunk *)(pDb->apShm[iChunk]);
}

static ShmChunk * treeShmChunkRc(lsm_db *pDb, int iChunk, int *pRc){
  assert( *pRc==LSM_OK );
  if( iChunk<pDb->nShm || LSM_OK==(*pRc = lsmShmCacheChunks(pDb, iChunk+1)) ){
    return (ShmChunk *)(pDb->apShm[iChunk]);
  }
  return 0;
}


#ifndef NDEBUG
static void assertIsWorkingChild(
  lsm_db *db, 
  TreeNode *pNode, 
  TreeNode *pParent, 
  int iCell
){
  TreeNode *p;
  u32 iPtr = getChildPtr(pParent, WORKING_VERSION, iCell);
  p = treeShmptr(db, iPtr);
  assert( p==pNode );
}
#else
# define assertIsWorkingChild(w,x,y,z)
#endif

/* Values for the third argument to treeShmkey(). */
#define TKV_LOADKEY  1
#define TKV_LOADVAL  2

static TreeKey *treeShmkey(
  lsm_db *pDb,                    /* Database handle */
  u32 iPtr,                       /* Shmptr to TreeKey struct */
  int eLoad,                      /* Either zero or a TREEKEY_LOADXXX value */
  TreeBlob *pBlob,                /* Used if dynamic memory is required */
  int *pRc                        /* IN/OUT: Error code */
){
  TreeKey *pRet;

  assert( eLoad==TKV_LOADKEY || eLoad==TKV_LOADVAL );
  pRet = (TreeKey *)treeShmptr(pDb, iPtr);
  if( pRet ){
    int nReq;                     /* Bytes of space required at pRet */
    int nAvail;                   /* Bytes of space available at pRet */

    nReq = sizeof(TreeKey) + pRet->nKey;
    if( eLoad==TKV_LOADVAL && pRet->nValue>0 ){
      nReq += pRet->nValue;
    }
    assert( LSM_SHM_CHUNK_SIZE==(1<<15) );
    nAvail = LSM_SHM_CHUNK_SIZE - (iPtr & (LSM_SHM_CHUNK_SIZE-1));

    if( nAvail<nReq ){
      if( tblobGrow(pDb, pBlob, nReq, pRc)==0 ){
        int nLoad = 0;
        while( *pRc==LSM_OK ){
          ShmChunk *pChunk;
          void *p = treeShmptr(pDb, iPtr);
          int n = LSM_MIN(nAvail, nReq-nLoad);

          memcpy(&pBlob->a[nLoad], p, n);
          nLoad += n;
          if( nLoad==nReq ) break;

          pChunk = treeShmChunk(pDb, treeOffsetToChunk(iPtr));
          assert( pChunk );
          iPtr = (pChunk->iNext * LSM_SHM_CHUNK_SIZE) + LSM_SHM_CHUNK_HDR;
          nAvail = LSM_SHM_CHUNK_SIZE - LSM_SHM_CHUNK_HDR;
        }
      }
      pRet = (TreeKey *)(pBlob->a);
    }
  }

  return pRet;
}

#if defined(LSM_DEBUG) && defined(LSM_EXPENSIVE_ASSERT)
void assert_leaf_looks_ok(TreeNode *pNode){
  assert( pNode->apKey[1] );
}

void assert_node_looks_ok(TreeNode *pNode, int nHeight){
  if( pNode ){
    assert( pNode->apKey[1] );
    if( nHeight>1 ){
      int i;
      assert( getChildPtr(pNode, WORKING_VERSION, 1) );
      assert( getChildPtr(pNode, WORKING_VERSION, 2) );
      for(i=0; i<4; i++){
        assert_node_looks_ok(getChildPtr(pNode, WORKING_VERSION, i), nHeight-1);
      }
    }
  }
}

/*
** Run various assert() statements to check that the working-version of the
** tree is correct in the following respects:
**
**   * todo...
*/
void assert_tree_looks_ok(int rc, Tree *pTree){
}
#else
# define assert_tree_looks_ok(x,y)
#endif

void lsmFlagsToString(int flags, char *zFlags){

  zFlags[0] = (flags & LSM_END_DELETE)   ? ']' : '.';

  /* Only one of LSM_POINT_DELETE, LSM_INSERT and LSM_SEPARATOR should ever
  ** be set. If this is not true, write a '?' to the output.  */
  switch( flags & (LSM_POINT_DELETE|LSM_INSERT|LSM_SEPARATOR) ){
    case 0:                zFlags[1] = '.'; break;
    case LSM_POINT_DELETE: zFlags[1] = '-'; break;
    case LSM_INSERT:       zFlags[1] = '+'; break;
    case LSM_SEPARATOR:    zFlags[1] = '^'; break;
    default:               zFlags[1] = '?'; break;
  }

  zFlags[2] = (flags & LSM_SYSTEMKEY)    ? '*' : '.';
  zFlags[3] = (flags & LSM_START_DELETE) ? '[' : '.';
  zFlags[4] = '\0';
}

#ifdef LSM_DEBUG

/*
** Pointer pBlob points to a buffer containing a blob of binary data
** nBlob bytes long. Append the contents of this blob to *pStr, with
** each octet represented by a 2-digit hexadecimal number. For example,
** if the input blob is three bytes in size and contains {0x01, 0x44, 0xFF},
** then "0144ff" is appended to *pStr.
*/
static void lsmAppendStrBlob(LsmString *pStr, void *pBlob, int nBlob){
  int i;
  lsmStringExtend(pStr, nBlob*2);
  if( pStr->nAlloc==0 ) return;
  for(i=0; i<nBlob; i++){
    u8 c = ((u8*)pBlob)[i];
    if( c>='a' && c<='z' ){
      pStr->z[pStr->n++] = c;
    }else if( c!=0 || nBlob==1 || i!=(nBlob-1) ){
      pStr->z[pStr->n++] = "0123456789abcdef"[(c>>4)&0xf];
      pStr->z[pStr->n++] = "0123456789abcdef"[c&0xf];
    }
  }
  pStr->z[pStr->n] = 0;
}

#if 0  /* NOT USED */
/*
** Append nIndent space (0x20) characters to string *pStr.
*/
static void lsmAppendIndent(LsmString *pStr, int nIndent){
  int i;
  lsmStringExtend(pStr, nIndent);
  for(i=0; i<nIndent; i++) lsmStringAppend(pStr, " ", 1);
}
#endif

static void strAppendFlags(LsmString *pStr, u8 flags){
  char zFlags[8];

  lsmFlagsToString(flags, zFlags);
  zFlags[4] = ':';

  lsmStringAppend(pStr, zFlags, 5);
}

void dump_node_contents(
  lsm_db *pDb,
  u32 iNode,                      /* Print out the contents of this node */
  char *zPath,                    /* Path from root to this node */
  int nPath,                      /* Number of bytes in zPath */
  int nHeight                     /* Height: (0==leaf) (1==parent-of-leaf) */
){
  const char *zSpace = "                                           ";
  int i;
  int rc = LSM_OK;
  LsmString s;
  TreeNode *pNode;
  TreeBlob b = {0, 0};

  pNode = (TreeNode *)treeShmptr(pDb, iNode);

  if( nHeight==0 ){
    /* Append the nIndent bytes of space to string s. */
    lsmStringInit(&s, pDb->pEnv);

    /* Append each key to string s. */
    for(i=0; i<3; i++){
      u32 iPtr = pNode->aiKeyPtr[i];
      if( iPtr ){
        TreeKey *pKey = treeShmkey(pDb, pNode->aiKeyPtr[i],TKV_LOADKEY, &b,&rc);
        strAppendFlags(&s, pKey->flags);
        lsmAppendStrBlob(&s, TKV_KEY(pKey), pKey->nKey);
        lsmStringAppend(&s, "     ", -1);
      }
    }

    printf("% 6d %.*sleaf%.*s: %s\n", 
        iNode, nPath, zPath, 20-nPath-4, zSpace, s.z
    );
    lsmStringClear(&s);
  }else{
    for(i=0; i<4 && nHeight>0; i++){
      u32 iPtr = getChildPtr(pNode, pDb->treehdr.root.iTransId, i);
      zPath[nPath] = (char)(i+'0');
      zPath[nPath+1] = '/';

      if( iPtr ){
        dump_node_contents(pDb, iPtr, zPath, nPath+2, nHeight-1);
      }
      if( i!=3 && pNode->aiKeyPtr[i] ){
        TreeKey *pKey = treeShmkey(pDb, pNode->aiKeyPtr[i], TKV_LOADKEY,&b,&rc);
        lsmStringInit(&s, pDb->pEnv);
        strAppendFlags(&s, pKey->flags);
        lsmAppendStrBlob(&s, TKV_KEY(pKey), pKey->nKey);
        printf("% 6d %.*s%.*s: %s\n", 
            iNode, nPath+1, zPath, 20-nPath-1, zSpace, s.z);
        lsmStringClear(&s);
      }
    }
  }

  tblobFree(pDb, &b);
}

void dump_tree_contents(lsm_db *pDb, const char *zCaption){
  char zPath[64];
  TreeRoot *p = &pDb->treehdr.root;
  printf("\n%s\n", zCaption);
  zPath[0] = '/';
  if( p->iRoot ){
    dump_node_contents(pDb, p->iRoot, zPath, 1, p->nHeight-1);
  }
  fflush(stdout);
}

#endif

/*
** Initialize a cursor object, the space for which has already been
** allocated.
*/
static void treeCursorInit(lsm_db *pDb, int bOld, TreeCursor *pCsr){
  memset(pCsr, 0, sizeof(TreeCursor));
  pCsr->pDb = pDb;
  if( bOld ){
    pCsr->pRoot = &pDb->treehdr.oldroot;
  }else{
    pCsr->pRoot = &pDb->treehdr.root;
  }
  pCsr->iNode = -1;
}

/*
** Return a pointer to the mapping of the TreeKey object that the cursor
** is pointing to. 
*/
static TreeKey *csrGetKey(TreeCursor *pCsr, TreeBlob *pBlob, int *pRc){
  TreeKey *pRet;
  lsm_db *pDb = pCsr->pDb;
  u32 iPtr = pCsr->apTreeNode[pCsr->iNode]->aiKeyPtr[pCsr->aiCell[pCsr->iNode]];

  assert( iPtr );
  pRet = (TreeKey*)treeShmptrUnsafe(pDb, iPtr);
  if( !(pRet->flags & LSM_CONTIGUOUS) ){
    pRet = treeShmkey(pDb, iPtr, TKV_LOADVAL, pBlob, pRc);
  }

  return pRet;
}

/*
** Save the current position of tree cursor pCsr.
*/
int lsmTreeCursorSave(TreeCursor *pCsr){
  int rc = LSM_OK;
  if( pCsr && pCsr->pSave==0 ){
    int iNode = pCsr->iNode;
    if( iNode>=0 ){
      pCsr->pSave = csrGetKey(pCsr, &pCsr->blob, &rc);
    }
    pCsr->iNode = -1;
  }
  return rc;
}

/*
** Restore the position of a saved tree cursor.
*/
static int treeCursorRestore(TreeCursor *pCsr, int *pRes){
  int rc = LSM_OK;
  if( pCsr->pSave ){
    TreeKey *pKey = pCsr->pSave;
    pCsr->pSave = 0;
    if( pRes ){
      rc = lsmTreeCursorSeek(pCsr, TKV_KEY(pKey), pKey->nKey, pRes);
    }
  }
  return rc;
}

/*
** Allocate nByte bytes of space within the *-shm file. If successful, 
** return LSM_OK and set *piPtr to the offset within the file at which
** the allocated space is located.
*/
static u32 treeShmalloc(lsm_db *pDb, int bAlign, int nByte, int *pRc){
  u32 iRet = 0;
  if( *pRc==LSM_OK ){
    const static int CHUNK_SIZE = LSM_SHM_CHUNK_SIZE;
    const static int CHUNK_HDR = LSM_SHM_CHUNK_HDR;
    u32 iWrite;                   /* Current write offset */
    u32 iEof;                     /* End of current chunk */
    int iChunk;                   /* Current chunk */

    assert( nByte <= (CHUNK_SIZE-CHUNK_HDR) );

    /* Check if there is enough space on the current chunk to fit the
    ** new allocation. If not, link in a new chunk and put the new
    ** allocation at the start of it.  */
    iWrite = pDb->treehdr.iWrite;
    if( bAlign ){
      iWrite = (iWrite + 3) & ~0x0003;
      assert( (iWrite % 4)==0 );
    }

    assert( iWrite );
    iChunk = treeOffsetToChunk(iWrite-1);
    iEof = (iChunk+1) * CHUNK_SIZE;
    assert( iEof>=iWrite && (iEof-iWrite)<(u32)CHUNK_SIZE );
    if( (iWrite+nByte)>iEof ){
      ShmChunk *pHdr;           /* Header of chunk just finished (iChunk) */
      ShmChunk *pFirst;         /* Header of chunk treehdr.iFirst */
      ShmChunk *pNext;          /* Header of new chunk */
      int iNext = 0;            /* Next chunk */
      int rc = LSM_OK;

      pFirst = treeShmChunk(pDb, pDb->treehdr.iFirst);

      assert( shm_sequence_ge(pDb->treehdr.iUsedShmid, pFirst->iShmid) );
      assert( (pDb->treehdr.iNextShmid+1-pDb->treehdr.nChunk)==pFirst->iShmid );

      /* Check if the chunk at the start of the linked list is still in
      ** use. If not, reuse it. If so, allocate a new chunk by appending
      ** to the *-shm file.  */
      if( pDb->treehdr.iUsedShmid!=pFirst->iShmid ){
        int bInUse;
        rc = lsmTreeInUse(pDb, pFirst->iShmid, &bInUse);
        if( rc!=LSM_OK ){
          *pRc = rc;
          return 0;
        }
        if( bInUse==0 ){
          iNext = pDb->treehdr.iFirst;
          pDb->treehdr.iFirst = pFirst->iNext;
          assert( pDb->treehdr.iFirst );
        }
      }
      if( iNext==0 ) iNext = pDb->treehdr.nChunk++;

      /* Set the header values for the new chunk */
      pNext = treeShmChunkRc(pDb, iNext, &rc);
      if( pNext ){
        pNext->iNext = 0;
        pNext->iShmid = (pDb->treehdr.iNextShmid++);
      }else{
        *pRc = rc;
        return 0;
      }

      /* Set the header values for the chunk just finished */
      pHdr = (ShmChunk *)treeShmptr(pDb, iChunk*CHUNK_SIZE);
      pHdr->iNext = iNext;

      /* Advance to the next chunk */
      iWrite = iNext * CHUNK_SIZE + CHUNK_HDR;
    }

    /* Allocate space at iWrite. */
    iRet = iWrite;
    pDb->treehdr.iWrite = iWrite + nByte;
    pDb->treehdr.root.nByte += nByte;
  }
  return iRet;
}

/*
** Allocate and zero nByte bytes of space within the *-shm file.
*/
static void *treeShmallocZero(lsm_db *pDb, int nByte, u32 *piPtr, int *pRc){
  u32 iPtr;
  void *p;
  iPtr = treeShmalloc(pDb, 1, nByte, pRc);
  p = treeShmptr(pDb, iPtr);
  if( p ){
    assert( *pRc==LSM_OK );
    memset(p, 0, nByte);
    *piPtr = iPtr;
  }
  return p;
}

static TreeNode *newTreeNode(lsm_db *pDb, u32 *piPtr, int *pRc){
  return treeShmallocZero(pDb, sizeof(TreeNode), piPtr, pRc);
}

static TreeLeaf *newTreeLeaf(lsm_db *pDb, u32 *piPtr, int *pRc){
  return treeShmallocZero(pDb, sizeof(TreeLeaf), piPtr, pRc);
}

static TreeKey *newTreeKey(
  lsm_db *pDb, 
  u32 *piPtr, 
  void *pKey, int nKey,           /* Key data */
  void *pVal, int nVal,           /* Value data (or nVal<0 for delete) */
  int *pRc
){
  TreeKey *p;
  u32 iPtr;
  u32 iEnd;
  int nRem;
  u8 *a;
  int n;

  /* Allocate space for the TreeKey structure itself */
  *piPtr = iPtr = treeShmalloc(pDb, 1, sizeof(TreeKey), pRc);
  p = treeShmptr(pDb, iPtr);
  if( *pRc ) return 0;
  p->nKey = nKey;
  p->nValue = nVal;

  /* Allocate and populate the space required for the key and value. */
  n = nRem = nKey;
  a = (u8 *)pKey;
  while( a ){
    while( nRem>0 ){
      u8 *aAlloc;
      int nAlloc;
      u32 iWrite;

      iWrite = (pDb->treehdr.iWrite & (LSM_SHM_CHUNK_SIZE-1));
      iWrite = LSM_MAX(iWrite, LSM_SHM_CHUNK_HDR);
      nAlloc = LSM_MIN((LSM_SHM_CHUNK_SIZE-iWrite), (u32)nRem);

      aAlloc = treeShmptr(pDb, treeShmalloc(pDb, 0, nAlloc, pRc));
      if( aAlloc==0 ) break;
      memcpy(aAlloc, &a[n-nRem], nAlloc);
      nRem -= nAlloc;
    }
    a = pVal;
    n = nRem = nVal;
    pVal = 0;
  }

  iEnd = iPtr + sizeof(TreeKey) + nKey + LSM_MAX(0, nVal);
  if( (iPtr & ~(LSM_SHM_CHUNK_SIZE-1))!=(iEnd & ~(LSM_SHM_CHUNK_SIZE-1)) ){
    p->flags = 0;
  }else{
    p->flags = LSM_CONTIGUOUS;
  }

  if( *pRc ) return 0;
#if 0
  printf("store: %d %s\n", (int)iPtr, (char *)pKey);
#endif
  return p;
}

static TreeNode *copyTreeNode(
  lsm_db *pDb, 
  TreeNode *pOld, 
  u32 *piNew, 
  int *pRc
){
  TreeNode *pNew;

  pNew = newTreeNode(pDb, piNew, pRc);
  if( pNew ){
    memcpy(pNew->aiKeyPtr, pOld->aiKeyPtr, sizeof(pNew->aiKeyPtr));
    memcpy(pNew->aiChildPtr, pOld->aiChildPtr, sizeof(pNew->aiChildPtr));
    if( pOld->iV2 ) pNew->aiChildPtr[pOld->iV2Child] = pOld->iV2Ptr;
  }
  return pNew;
}

static TreeNode *copyTreeLeaf(
  lsm_db *pDb, 
  TreeLeaf *pOld, 
  u32 *piNew, 
  int *pRc
){
  TreeLeaf *pNew;
  pNew = newTreeLeaf(pDb, piNew, pRc);
  if( pNew ){
    memcpy(pNew, pOld, sizeof(TreeLeaf));
  }
  return (TreeNode *)pNew;
}

/*
** The tree cursor passed as the second argument currently points to an 
** internal node (not a leaf). Specifically, to a sub-tree pointer. This
** function replaces the sub-tree that the cursor currently points to
** with sub-tree pNew.
**
** The sub-tree may be replaced either by writing the "v2 data" on the
** internal node, or by allocating a new TreeNode structure and then 
** calling this function on the parent of the internal node.
*/
static int treeUpdatePtr(lsm_db *pDb, TreeCursor *pCsr, u32 iNew){
  int rc = LSM_OK;
  if( pCsr->iNode<0 ){
    /* iNew is the new root node */
    pDb->treehdr.root.iRoot = iNew;
  }else{
    /* If this node already has version 2 content, allocate a copy and
    ** update the copy with the new pointer value. Otherwise, store the
    ** new pointer as v2 data within the current node structure.  */

    TreeNode *p;                  /* The node to be modified */
    int iChildPtr;                /* apChild[] entry to modify */

    p = pCsr->apTreeNode[pCsr->iNode];
    iChildPtr = pCsr->aiCell[pCsr->iNode];

    if( p->iV2 ){
      /* The "allocate new TreeNode" option */
      u32 iCopy;
      TreeNode *pCopy;
      pCopy = copyTreeNode(pDb, p, &iCopy, &rc);
      if( pCopy ){
        assert( rc==LSM_OK );
        pCopy->aiChildPtr[iChildPtr] = iNew;
        pCsr->iNode--;
        rc = treeUpdatePtr(pDb, pCsr, iCopy);
      }
    }else{
      /* The "v2 data" option */
      u32 iPtr;
      assert( pDb->treehdr.root.iTransId>0 );

      if( pCsr->iNode ){
        iPtr = getChildPtr(
            pCsr->apTreeNode[pCsr->iNode-1], 
            pDb->treehdr.root.iTransId, pCsr->aiCell[pCsr->iNode-1]
        );
      }else{
        iPtr = pDb->treehdr.root.iRoot;
      }
      rc = intArrayAppend(pDb->pEnv, &pDb->rollback, iPtr);

      if( rc==LSM_OK ){
        p->iV2 = pDb->treehdr.root.iTransId;
        p->iV2Child = (u8)iChildPtr;
        p->iV2Ptr = iNew;
      }
    }
  }

  return rc;
}

/*
** Cursor pCsr points at a node that is part of pTree. This function
** inserts a new key and optionally child node pointer into that node.
**
** The position into which the new key and pointer are inserted is
** determined by the iSlot parameter. The new key will be inserted to
** the left of the key currently stored in apKey[iSlot]. Or, if iSlot is
** greater than the index of the rightmost key in the node.
**
** Pointer pLeftPtr points to a child tree that contains keys that are
** smaller than pTreeKey.
*/
static int treeInsert(
  lsm_db *pDb,                    /* Database handle */
  TreeCursor *pCsr,               /* Cursor indicating path to insert at */
  u32 iLeftPtr,                   /* Left child pointer */
  u32 iTreeKey,                   /* Location of key to insert */
  u32 iRightPtr,                  /* Right child pointer */
  int iSlot                       /* Position to insert key into */
){
  int rc = LSM_OK;
  TreeNode *pNode = pCsr->apTreeNode[pCsr->iNode];

  /* Check if the node is currently full. If so, split pNode in two and
  ** call this function recursively to add a key to the parent. Otherwise, 
  ** insert the new key directly into pNode.  */
  assert( pNode->aiKeyPtr[1] );
  if( pNode->aiKeyPtr[0] && pNode->aiKeyPtr[2] ){
    u32 iLeft; TreeNode *pLeft;   /* New left-hand sibling node */
    u32 iRight; TreeNode *pRight; /* New right-hand sibling node */

    pLeft = newTreeNode(pDb, &iLeft, &rc);
    pRight = newTreeNode(pDb, &iRight, &rc);
    if( rc ) return rc;

    pLeft->aiChildPtr[1] = getChildPtr(pNode, WORKING_VERSION, 0);
    pLeft->aiKeyPtr[1] = pNode->aiKeyPtr[0];
    pLeft->aiChildPtr[2] = getChildPtr(pNode, WORKING_VERSION, 1);

    pRight->aiChildPtr[1] = getChildPtr(pNode, WORKING_VERSION, 2);
    pRight->aiKeyPtr[1] = pNode->aiKeyPtr[2];
    pRight->aiChildPtr[2] = getChildPtr(pNode, WORKING_VERSION, 3);

    if( pCsr->iNode==0 ){
      /* pNode is the root of the tree. Grow the tree by one level. */
      u32 iRoot; TreeNode *pRoot; /* New root node */

      pRoot = newTreeNode(pDb, &iRoot, &rc);
      pRoot->aiKeyPtr[1] = pNode->aiKeyPtr[1];
      pRoot->aiChildPtr[1] = iLeft;
      pRoot->aiChildPtr[2] = iRight;

      pDb->treehdr.root.iRoot = iRoot;
      pDb->treehdr.root.nHeight++;
    }else{

      pCsr->iNode--;
      rc = treeInsert(pDb, pCsr, 
          iLeft, pNode->aiKeyPtr[1], iRight, pCsr->aiCell[pCsr->iNode]
      );
    }

    assert( pLeft->iV2==0 );
    assert( pRight->iV2==0 );
    switch( iSlot ){
      case 0:
        pLeft->aiKeyPtr[0] = iTreeKey;
        pLeft->aiChildPtr[0] = iLeftPtr;
        if( iRightPtr ) pLeft->aiChildPtr[1] = iRightPtr;
        break;
      case 1:
        pLeft->aiChildPtr[3] = (iRightPtr ? iRightPtr : pLeft->aiChildPtr[2]);
        pLeft->aiKeyPtr[2] = iTreeKey;
        pLeft->aiChildPtr[2] = iLeftPtr;
        break;
      case 2:
        pRight->aiKeyPtr[0] = iTreeKey;
        pRight->aiChildPtr[0] = iLeftPtr;
        if( iRightPtr ) pRight->aiChildPtr[1] = iRightPtr;
        break;
      case 3:
        pRight->aiChildPtr[3] = (iRightPtr ? iRightPtr : pRight->aiChildPtr[2]);
        pRight->aiKeyPtr[2] = iTreeKey;
        pRight->aiChildPtr[2] = iLeftPtr;
        break;
    }

  }else{
    TreeNode *pNew;
    u32 *piKey;
    u32 *piChild;
    u32 iStore = 0;
    u32 iNew = 0;
    int i;

    /* Allocate a new version of node pNode. */
    pNew = newTreeNode(pDb, &iNew, &rc);
    if( rc ) return rc;

    piKey = pNew->aiKeyPtr;
    piChild = pNew->aiChildPtr;

    for(i=0; i<iSlot; i++){
      if( pNode->aiKeyPtr[i] ){
        *(piKey++) = pNode->aiKeyPtr[i];
        *(piChild++) = getChildPtr(pNode, WORKING_VERSION, i);
      }
    }

    *piKey++ = iTreeKey;
    *piChild++ = iLeftPtr;

    iStore = iRightPtr;
    for(i=iSlot; i<3; i++){
      if( pNode->aiKeyPtr[i] ){
        *(piKey++) = pNode->aiKeyPtr[i];
        *(piChild++) = iStore ? iStore : getChildPtr(pNode, WORKING_VERSION, i);
        iStore = 0;
      }
    }

    if( iStore ){
      *piChild = iStore;
    }else{
      *piChild = getChildPtr(pNode, WORKING_VERSION, 
          (pNode->aiKeyPtr[2] ? 3 : 2)
      );
    }
    pCsr->iNode--;
    rc = treeUpdatePtr(pDb, pCsr, iNew);
  }

  return rc;
}

static int treeInsertLeaf(
  lsm_db *pDb,                    /* Database handle */
  TreeCursor *pCsr,               /* Cursor structure */
  u32 iTreeKey,                   /* Key pointer to insert */
  int iSlot                       /* Insert key to the left of this */
){
  int rc = LSM_OK;                /* Return code */
  TreeNode *pLeaf = pCsr->apTreeNode[pCsr->iNode];
  TreeLeaf *pNew;
  u32 iNew;

  assert( iSlot>=0 && iSlot<=4 );
  assert( pCsr->iNode>0 );
  assert( pLeaf->aiKeyPtr[1] );

  pCsr->iNode--;

  pNew = newTreeLeaf(pDb, &iNew, &rc);
  if( pNew ){
    if( pLeaf->aiKeyPtr[0] && pLeaf->aiKeyPtr[2] ){
      /* The leaf is full. Split it in two. */
      TreeLeaf *pRight;
      u32 iRight;
      pRight = newTreeLeaf(pDb, &iRight, &rc);
      if( pRight ){
        assert( rc==LSM_OK );
        pNew->aiKeyPtr[1] = pLeaf->aiKeyPtr[0];
        pRight->aiKeyPtr[1] = pLeaf->aiKeyPtr[2];
        switch( iSlot ){
          case 0: pNew->aiKeyPtr[0] = iTreeKey; break;
          case 1: pNew->aiKeyPtr[2] = iTreeKey; break;
          case 2: pRight->aiKeyPtr[0] = iTreeKey; break;
          case 3: pRight->aiKeyPtr[2] = iTreeKey; break;
        }

        rc = treeInsert(pDb, pCsr, iNew, pLeaf->aiKeyPtr[1], iRight, 
            pCsr->aiCell[pCsr->iNode]
        );
      }
    }else{
      int iOut = 0;
      int i;
      for(i=0; i<4; i++){
        if( i==iSlot ) pNew->aiKeyPtr[iOut++] = iTreeKey;
        if( i<3 && pLeaf->aiKeyPtr[i] ){
          pNew->aiKeyPtr[iOut++] = pLeaf->aiKeyPtr[i];
        }
      }
      rc = treeUpdatePtr(pDb, pCsr, iNew);
    }
  }

  return rc;
}

void lsmTreeMakeOld(lsm_db *pDb){

  /* A write transaction must be open. Otherwise the code below that
  ** assumes (pDb->pClient->iLogOff) is current may malfunction. 
  **
  ** Update: currently this assert fails due to lsm_flush(), which does
  ** not set nTransOpen.
  */
  assert( /* pDb->nTransOpen>0 && */ pDb->iReader>=0 );

  if( pDb->treehdr.iOldShmid==0 ){
    pDb->treehdr.iOldLog = (pDb->treehdr.log.aRegion[2].iEnd << 1);
    pDb->treehdr.iOldLog |= (~(pDb->pClient->iLogOff) & (i64)0x0001);

    pDb->treehdr.oldcksum0 = pDb->treehdr.log.cksum0;
    pDb->treehdr.oldcksum1 = pDb->treehdr.log.cksum1;
    pDb->treehdr.iOldShmid = pDb->treehdr.iNextShmid-1;
    memcpy(&pDb->treehdr.oldroot, &pDb->treehdr.root, sizeof(TreeRoot));

    pDb->treehdr.root.iTransId = 1;
    pDb->treehdr.root.iRoot = 0;
    pDb->treehdr.root.nHeight = 0;
    pDb->treehdr.root.nByte = 0;
  }
}

void lsmTreeDiscardOld(lsm_db *pDb){
  assert( lsmShmAssertLock(pDb, LSM_LOCK_WRITER, LSM_LOCK_EXCL) 
       || lsmShmAssertLock(pDb, LSM_LOCK_DMS2, LSM_LOCK_EXCL) 
  );
  pDb->treehdr.iUsedShmid = pDb->treehdr.iOldShmid;
  pDb->treehdr.iOldShmid = 0;
}

int lsmTreeHasOld(lsm_db *pDb){
  return pDb->treehdr.iOldShmid!=0;
}

/*
** This function is called during recovery to initialize the 
** tree header. Only the database connections private copy of the tree-header
** is initialized here - it will be copied into shared memory if log file
** recovery is successful.
*/
int lsmTreeInit(lsm_db *pDb){
  ShmChunk *pOne;
  int rc = LSM_OK;

  memset(&pDb->treehdr, 0, sizeof(TreeHeader));
  pDb->treehdr.root.iTransId = 1;
  pDb->treehdr.iFirst = 1;
  pDb->treehdr.nChunk = 2;
  pDb->treehdr.iWrite = LSM_SHM_CHUNK_SIZE + LSM_SHM_CHUNK_HDR;
  pDb->treehdr.iNextShmid = 2;
  pDb->treehdr.iUsedShmid = 1;

  pOne = treeShmChunkRc(pDb, 1, &rc);
  if( pOne ){
    pOne->iNext = 0;
    pOne->iShmid = 1;
  }
  return rc;
}

static void treeHeaderChecksum(
  TreeHeader *pHdr, 
  u32 *aCksum
){
  u32 cksum1 = 0x12345678;
  u32 cksum2 = 0x9ABCDEF0;
  u32 *a = (u32 *)pHdr;
  int i;

  assert( (offsetof(TreeHeader, aCksum) + sizeof(u32)*2)==sizeof(TreeHeader) );
  assert( (sizeof(TreeHeader) % (sizeof(u32)*2))==0 );

  for(i=0; i<(offsetof(TreeHeader, aCksum) / sizeof(u32)); i+=2){
    cksum1 += a[i];
    cksum2 += (cksum1 + a[i+1]);
  }
  aCksum[0] = cksum1;
  aCksum[1] = cksum2;
}

/*
** Return true if the checksum stored in TreeHeader object *pHdr is 
** consistent with the contents of its other fields.
*/
static int treeHeaderChecksumOk(TreeHeader *pHdr){
  u32 aCksum[2];
  treeHeaderChecksum(pHdr, aCksum);
  return (0==memcmp(aCksum, pHdr->aCksum, sizeof(aCksum)));
}

/*
** This type is used by functions lsmTreeRepair() and treeSortByShmid() to
** make relinking the linked list of shared-memory chunks easier.
*/
typedef struct ShmChunkLoc ShmChunkLoc;
struct ShmChunkLoc {
  ShmChunk *pShm;
  u32 iLoc;
};

/*
** This function checks that the linked list of shared memory chunks 
** that starts at chunk db->treehdr.iFirst:
**
**   1) Includes all chunks in the shared-memory region, and
**   2) Links them together in order of ascending shm-id.
**
** If no error occurs and the conditions above are met, LSM_OK is returned.
**
** If either of the conditions are untrue, LSM_CORRUPT is returned. Or, if
** an error is encountered before the checks are completed, another LSM error
** code (i.e. LSM_IOERR or LSM_NOMEM) may be returned.
*/
static int treeCheckLinkedList(lsm_db *db){
  int rc = LSM_OK;
  int nVisit = 0;
  ShmChunk *p;

  p = treeShmChunkRc(db, db->treehdr.iFirst, &rc);
  while( rc==LSM_OK && p ){
    if( p->iNext ){
      if( p->iNext>=db->treehdr.nChunk ){
        rc = LSM_CORRUPT_BKPT;
      }else{
        ShmChunk *pNext = treeShmChunkRc(db, p->iNext, &rc);
        if( rc==LSM_OK ){
          if( pNext->iShmid!=p->iShmid+1 ){
            rc = LSM_CORRUPT_BKPT;
          }
          p = pNext;
        }
      }
    }else{
      p = 0;
    }
    nVisit++;
  }

  if( rc==LSM_OK && (u32)nVisit!=db->treehdr.nChunk-1 ){
    rc = LSM_CORRUPT_BKPT;
  }
  return rc;
}

/*
** Iterate through the current in-memory tree. If there are any v2-pointers
** with transaction ids larger than db->treehdr.iTransId, zero them.
*/
static int treeRepairPtrs(lsm_db *db){
  int rc = LSM_OK;

  if( db->treehdr.root.nHeight>1 ){
    TreeCursor csr;               /* Cursor used to iterate through tree */
    u32 iTransId = db->treehdr.root.iTransId;

    /* Initialize the cursor structure. Also decrement the nHeight variable
    ** in the tree-header. This will prevent the cursor from visiting any
    ** leaf nodes.  */
    db->treehdr.root.nHeight--;
    treeCursorInit(db, 0, &csr);

    rc = lsmTreeCursorEnd(&csr, 0);
    while( rc==LSM_OK && lsmTreeCursorValid(&csr) ){
      TreeNode *pNode = csr.apTreeNode[csr.iNode];
      if( pNode->iV2>iTransId ){
        pNode->iV2Child = 0;
        pNode->iV2Ptr = 0;
        pNode->iV2 = 0;
      }
      rc = lsmTreeCursorNext(&csr);
    }
    tblobFree(csr.pDb, &csr.blob);

    db->treehdr.root.nHeight++;
  }

  return rc;
}

static int treeRepairList(lsm_db *db){
  int rc = LSM_OK;
  int i;
  ShmChunk *p;
  ShmChunk *pMin = 0;
  u32 iMin = 0;

  /* Iterate through all shm chunks. Find the smallest shm-id present in
  ** the shared-memory region. */
  for(i=1; rc==LSM_OK && (u32)i<db->treehdr.nChunk; i++){
    p = treeShmChunkRc(db, i, &rc);
    if( p && (pMin==0 || shm_sequence_ge(pMin->iShmid, p->iShmid)) ){
      pMin = p;
      iMin = i;
    }
  }

  /* Fix the shm-id values on any chunks with a shm-id greater than or 
  ** equal to treehdr.iNextShmid. Then do a merge-sort of all chunks to 
  ** fix the ShmChunk.iNext pointers.
  */
  if( rc==LSM_OK ){
    int nSort;
    int nByte;
    u32 iPrevShmid;
    ShmChunkLoc *aSort;

    /* Allocate space for a merge sort. */
    nSort = 1;
    while( (u32)nSort < (db->treehdr.nChunk-1) ) nSort = nSort * 2;
    nByte = sizeof(ShmChunkLoc) * nSort * 2;
    aSort = lsmMallocZeroRc(db->pEnv, nByte, &rc);
    iPrevShmid = pMin->iShmid;

    /* Fix all shm-ids, if required. */
    if( rc==LSM_OK ){
      iPrevShmid = pMin->iShmid-1;
      for(i=1; (u32)i<db->treehdr.nChunk; i++){
        p = treeShmChunk(db, i);
        aSort[i-1].pShm = p;
        aSort[i-1].iLoc = i;
        if( (u32)i!=db->treehdr.iFirst ){
          if( shm_sequence_ge(p->iShmid, db->treehdr.iNextShmid) ){
            p->iShmid = iPrevShmid--;
          }
        }
      }
      if( iMin!=db->treehdr.iFirst ){
        p = treeShmChunk(db, db->treehdr.iFirst);
        p->iShmid = iPrevShmid;
      }
    }

    if( rc==LSM_OK ){
      ShmChunkLoc *aSpace = &aSort[nSort];
      for(i=0; i<nSort; i++){
        if( aSort[i].pShm ){
          assert( shm_sequence_ge(aSort[i].pShm->iShmid, iPrevShmid) );
          assert( aSpace[aSort[i].pShm->iShmid - iPrevShmid].pShm==0 );
          aSpace[aSort[i].pShm->iShmid - iPrevShmid] = aSort[i];
        }
      }

      if( aSpace[nSort-1].pShm ) aSpace[nSort-1].pShm->iNext = 0;
      for(i=0; i<nSort-1; i++){
        if( aSpace[i].pShm ){
          aSpace[i].pShm->iNext = aSpace[i+1].iLoc;
        }
      }

      rc = treeCheckLinkedList(db);
      lsmFree(db->pEnv, aSort);
    }
  }

  return rc;
}

/*
** This function is called as part of opening a write-transaction if the
** writer-flag is already set - indicating that the previous writer 
** failed before ending its transaction.
*/
int lsmTreeRepair(lsm_db *db){
  int rc = LSM_OK;
  TreeHeader hdr;
  ShmHeader *pHdr = db->pShmhdr;

  /* Ensure that the two tree-headers are consistent. Copy one over the other
  ** if necessary. Prefer the data from a tree-header for which the checksum
  ** computes. Or, if they both compute, prefer tree-header-1.  */
  if( memcmp(&pHdr->hdr1, &pHdr->hdr2, sizeof(TreeHeader)) ){
    if( treeHeaderChecksumOk(&pHdr->hdr1) ){
      memcpy(&pHdr->hdr2, &pHdr->hdr1, sizeof(TreeHeader));
    }else{
      memcpy(&pHdr->hdr1, &pHdr->hdr2, sizeof(TreeHeader));
    }
  }

  /* Save the connections current copy of the tree-header. It will be 
  ** restored before returning.  */
  memcpy(&hdr, &db->treehdr, sizeof(TreeHeader));

  /* Walk the tree. Zero any v2 pointers with a transaction-id greater than
  ** the transaction-id currently in the tree-headers.  */
  rc = treeRepairPtrs(db);

  /* Repair the linked list of shared-memory chunks. */
  if( rc==LSM_OK ){
    rc = treeRepairList(db);
  }

  memcpy(&db->treehdr, &hdr, sizeof(TreeHeader));
  return rc;
}

static void treeOverwriteKey(lsm_db *db, TreeCursor *pCsr, u32 iKey, int *pRc){
  if( *pRc==LSM_OK ){
    TreeRoot *p = &db->treehdr.root;
    TreeNode *pNew;
    u32 iNew;
    TreeNode *pNode = pCsr->apTreeNode[pCsr->iNode];
    int iCell = pCsr->aiCell[pCsr->iNode];

    /* Create a copy of this node */
    if( (pCsr->iNode>0 && (u32)pCsr->iNode==(p->nHeight-1)) ){
      pNew = copyTreeLeaf(db, (TreeLeaf *)pNode, &iNew, pRc);
    }else{
      pNew = copyTreeNode(db, pNode, &iNew, pRc);
    }

    if( pNew ){
      /* Modify the value in the new version */
      pNew->aiKeyPtr[iCell] = iKey;

      /* Change the pointer in the parent (if any) to point at the new 
       ** TreeNode */
      pCsr->iNode--;
      treeUpdatePtr(db, pCsr, iNew);
    }
  }
}

static int treeNextIsEndDelete(lsm_db *db, TreeCursor *pCsr){
  int iNode = pCsr->iNode;
  int iCell = pCsr->aiCell[iNode]+1;

  /* Cursor currently points to a leaf node. */
  assert( (u32)pCsr->iNode==(db->treehdr.root.nHeight-1) );

  while( iNode>=0 ){
    TreeNode *pNode = pCsr->apTreeNode[iNode];
    if( iCell<3 && pNode->aiKeyPtr[iCell] ){
      int rc = LSM_OK;
      TreeKey *pKey = treeShmptr(db, pNode->aiKeyPtr[iCell]);
      assert( rc==LSM_OK );
      return ((pKey->flags & LSM_END_DELETE) ? 1 : 0);
    }
    iNode--;
    iCell = pCsr->aiCell[iNode];
  }

  return 0;
}

static int treePrevIsStartDelete(lsm_db *db, TreeCursor *pCsr){
  int iNode = pCsr->iNode;

  /* Cursor currently points to a leaf node. */
  assert( (u32)pCsr->iNode==(db->treehdr.root.nHeight-1) );

  while( iNode>=0 ){
    TreeNode *pNode = pCsr->apTreeNode[iNode];
    int iCell = pCsr->aiCell[iNode]-1;
    if( iCell>=0 && pNode->aiKeyPtr[iCell] ){
      int rc = LSM_OK;
      TreeKey *pKey = treeShmptr(db, pNode->aiKeyPtr[iCell]);
      assert( rc==LSM_OK );
      return ((pKey->flags & LSM_START_DELETE) ? 1 : 0);
    }
    iNode--;
  }

  return 0;
}


static int treeInsertEntry(
  lsm_db *pDb,                    /* Database handle */
  int flags,                      /* Flags associated with entry */
  void *pKey,                     /* Pointer to key data */
  int nKey,                       /* Size of key data in bytes */
  void *pVal,                     /* Pointer to value data (or NULL) */
  int nVal                        /* Bytes in value data (or -ve for delete) */
){
  int rc = LSM_OK;                /* Return Code */
  TreeKey *pTreeKey;              /* New key-value being inserted */
  u32 iTreeKey;
  TreeRoot *p = &pDb->treehdr.root;
  TreeCursor csr;                 /* Cursor to seek to pKey/nKey */
  int res = 0;                    /* Result of seek operation on csr */

  assert( nVal>=0 || pVal==0 );
  assert_tree_looks_ok(LSM_OK, pTree);
  assert( flags==LSM_INSERT       || flags==LSM_POINT_DELETE 
       || flags==LSM_START_DELETE || flags==LSM_END_DELETE 
  );
  assert( (flags & LSM_CONTIGUOUS)==0 );
#if 0
  dump_tree_contents(pDb, "before");
#endif

  if( p->iRoot ){
    TreeKey *pRes;                /* Key at end of seek operation */
    treeCursorInit(pDb, 0, &csr);

    /* Seek to the leaf (or internal node) that the new key belongs on */
    rc = lsmTreeCursorSeek(&csr, pKey, nKey, &res);
    pRes = csrGetKey(&csr, &csr.blob, &rc);
    if( rc!=LSM_OK ) return rc;
    assert( pRes );

    if( flags==LSM_START_DELETE ){
      /* When inserting a start-delete-range entry, if the key that
      ** occurs immediately before the new entry is already a START_DELETE,
      ** then the new entry is not required.  */
      if( (res<=0 && (pRes->flags & LSM_START_DELETE))
       || (res>0  && treePrevIsStartDelete(pDb, &csr))
      ){ 
        goto insert_entry_out;
      }
    }else if( flags==LSM_END_DELETE ){
      /* When inserting an start-delete-range entry, if the key that
      ** occurs immediately after the new entry is already an END_DELETE,
      ** then the new entry is not required.  */
      if( (res<0  && treeNextIsEndDelete(pDb, &csr))
       || (res>=0 && (pRes->flags & LSM_END_DELETE))
      ){
        goto insert_entry_out;
      }
    }

    if( res==0 && (flags & (LSM_END_DELETE|LSM_START_DELETE)) ){
      if( pRes->flags & LSM_INSERT ){
        nVal = pRes->nValue;
        pVal = TKV_VAL(pRes);
      }
      flags = flags | pRes->flags;
    }

    if( flags & (LSM_INSERT|LSM_POINT_DELETE) ){
      if( (res<0 && (pRes->flags & LSM_START_DELETE))
       || (res>0 && (pRes->flags & LSM_END_DELETE)) 
      ){
        flags = flags | (LSM_END_DELETE|LSM_START_DELETE);
      }else if( res==0 ){
        flags = flags | (pRes->flags & (LSM_END_DELETE|LSM_START_DELETE));
      }
    }
  }else{
    memset(&csr, 0, sizeof(TreeCursor));
  }

  /* Allocate and populate a new key-value pair structure */
  pTreeKey = newTreeKey(pDb, &iTreeKey, pKey, nKey, pVal, nVal, &rc);
  if( rc!=LSM_OK ) return rc;
  assert( pTreeKey->flags==0 || pTreeKey->flags==LSM_CONTIGUOUS );
  pTreeKey->flags |= flags;

  if( p->iRoot==0 ){
    /* The tree is completely empty. Add a new root node and install
    ** (pKey/nKey) as the middle entry. Even though it is a leaf at the
    ** moment, use newTreeNode() to allocate the node (i.e. allocate enough
    ** space for the fields used by interior nodes). This is because the
    ** treeInsert() routine may convert this node to an interior node. */
    TreeNode *pRoot = newTreeNode(pDb, &p->iRoot, &rc);
    if( rc==LSM_OK ){
      assert( p->nHeight==0 );
      pRoot->aiKeyPtr[1] = iTreeKey;
      p->nHeight = 1;
    }
  }else{
    if( res==0 ){
      /* The search found a match within the tree. */
      treeOverwriteKey(pDb, &csr, iTreeKey, &rc);
    }else{
      /* The cursor now points to the leaf node into which the new entry should
      ** be inserted. There may or may not be a free slot within the leaf for
      ** the new key-value pair. 
      **
      ** iSlot is set to the index of the key within pLeaf that the new key
      ** should be inserted to the left of (or to a value 1 greater than the
      ** index of the rightmost key if the new key is larger than all keys
      ** currently stored in the node).
      */
      int iSlot = csr.aiCell[csr.iNode] + (res<0);
      if( csr.iNode==0 ){
        rc = treeInsert(pDb, &csr, 0, iTreeKey, 0, iSlot);
      }else{
        rc = treeInsertLeaf(pDb, &csr, iTreeKey, iSlot);
      }
    }
  }

#if 0
  dump_tree_contents(pDb, "after");
#endif
 insert_entry_out:
  tblobFree(pDb, &csr.blob);
  assert_tree_looks_ok(rc, pTree);
  return rc;
}

/*
** Insert a new entry into the in-memory tree.
**
** If the value of the 5th parameter, nVal, is negative, then a delete-marker
** is inserted into the tree. In this case the value pointer, pVal, must be
** NULL.
*/
int lsmTreeInsert(
  lsm_db *pDb,                    /* Database handle */
  void *pKey,                     /* Pointer to key data */
  int nKey,                       /* Size of key data in bytes */
  void *pVal,                     /* Pointer to value data (or NULL) */
  int nVal                        /* Bytes in value data (or -ve for delete) */
){
  int flags;
  if( nVal<0 ){
    flags = LSM_POINT_DELETE;
  }else{
    flags = LSM_INSERT;
  }

  return treeInsertEntry(pDb, flags, pKey, nKey, pVal, nVal);
}

static int treeDeleteEntry(lsm_db *db, TreeCursor *pCsr, u32 iNewptr){
  TreeRoot *p = &db->treehdr.root;
  TreeNode *pNode = pCsr->apTreeNode[pCsr->iNode];
  int iSlot = pCsr->aiCell[pCsr->iNode];
  int bLeaf;
  int rc = LSM_OK;

  assert( pNode->aiKeyPtr[1] );
  assert( pNode->aiKeyPtr[iSlot] );
  assert( iSlot==0 || iSlot==1 || iSlot==2 );
  assert( ((u32)pCsr->iNode==(db->treehdr.root.nHeight-1))==(iNewptr==0) );

  bLeaf = ((u32)pCsr->iNode==(p->nHeight-1) && p->nHeight>1);
  
  if( pNode->aiKeyPtr[0] || pNode->aiKeyPtr[2] ){
    /* There are currently at least 2 keys on this node. So just create
    ** a new copy of the node with one of the keys removed. If the node
    ** happens to be the root node of the tree, allocate an entire 
    ** TreeNode structure instead of just a TreeLeaf.  */
    TreeNode *pNew;
    u32 iNew;

    if( bLeaf ){
      pNew = (TreeNode *)newTreeLeaf(db, &iNew, &rc);
    }else{
      pNew = newTreeNode(db, &iNew, &rc);
    }
    if( pNew ){
      int i;
      int iOut = 1;
      for(i=0; i<4; i++){
        if( i==iSlot ){
          i++;
          if( bLeaf==0 ) pNew->aiChildPtr[iOut] = iNewptr;
          if( i<3 ) pNew->aiKeyPtr[iOut] = pNode->aiKeyPtr[i];
          iOut++;
        }else if( bLeaf || p->nHeight==1 ){
          if( i<3 && pNode->aiKeyPtr[i] ){
            pNew->aiKeyPtr[iOut++] = pNode->aiKeyPtr[i];
          }
        }else{
          if( getChildPtr(pNode, WORKING_VERSION, i) ){
            pNew->aiChildPtr[iOut] = getChildPtr(pNode, WORKING_VERSION, i);
            if( i<3 ) pNew->aiKeyPtr[iOut] = pNode->aiKeyPtr[i];
            iOut++;
          }
        }
      }
      assert( iOut<=4 );
      assert( bLeaf || pNew->aiChildPtr[0]==0 );
      pCsr->iNode--;
      rc = treeUpdatePtr(db, pCsr, iNew);
    }

  }else if( pCsr->iNode==0 ){
    /* Removing the only key in the root node. iNewptr is the new root. */
    assert( iSlot==1 );
    db->treehdr.root.iRoot = iNewptr;
    db->treehdr.root.nHeight--;

  }else{
    /* There is only one key on this node and the node is not the root
    ** node. Find a peer for this node. Then redistribute the contents of
    ** the peer and the parent cell between the parent and either one or
    ** two new nodes.  */
    TreeNode *pParent;            /* Parent tree node */
    int iPSlot;
    u32 iPeer;                    /* Pointer to peer leaf node */
    int iDir;
    TreeNode *pPeer;              /* The peer leaf node */
    TreeNode *pNew1; u32 iNew1;   /* First new leaf node */

    assert( iSlot==1 );

    pParent = pCsr->apTreeNode[pCsr->iNode-1];
    iPSlot = pCsr->aiCell[pCsr->iNode-1];

    if( iPSlot>0 && getChildPtr(pParent, WORKING_VERSION, iPSlot-1) ){
      iDir = -1;
    }else{
      iDir = +1;
    }
    iPeer = getChildPtr(pParent, WORKING_VERSION, iPSlot+iDir);
    pPeer = (TreeNode *)treeShmptr(db, iPeer);
    assertIsWorkingChild(db, pNode, pParent, iPSlot);

    /* Allocate the first new leaf node. This is always required. */
    if( bLeaf ){
      pNew1 = (TreeNode *)newTreeLeaf(db, &iNew1, &rc);
    }else{
      pNew1 = (TreeNode *)newTreeNode(db, &iNew1, &rc);
    }

    if( pPeer->aiKeyPtr[0] && pPeer->aiKeyPtr[2] ){
      /* Peer node is completely full. This means that two new leaf nodes
      ** and a new parent node are required. */

      TreeNode *pNew2; u32 iNew2; /* Second new leaf node */
      TreeNode *pNewP; u32 iNewP; /* New parent node */

      if( bLeaf ){
        pNew2 = (TreeNode *)newTreeLeaf(db, &iNew2, &rc);
      }else{
        pNew2 = (TreeNode *)newTreeNode(db, &iNew2, &rc);
      }
      pNewP = copyTreeNode(db, pParent, &iNewP, &rc);

      if( iDir==-1 ){
        pNew1->aiKeyPtr[1] = pPeer->aiKeyPtr[0];
        if( bLeaf==0 ){
          pNew1->aiChildPtr[1] = getChildPtr(pPeer, WORKING_VERSION, 0);
          pNew1->aiChildPtr[2] = getChildPtr(pPeer, WORKING_VERSION, 1);
        }

        pNewP->aiChildPtr[iPSlot-1] = iNew1;
        pNewP->aiKeyPtr[iPSlot-1] = pPeer->aiKeyPtr[1];
        pNewP->aiChildPtr[iPSlot] = iNew2;

        pNew2->aiKeyPtr[0] = pPeer->aiKeyPtr[2];
        pNew2->aiKeyPtr[1] = pParent->aiKeyPtr[iPSlot-1];
        if( bLeaf==0 ){
          pNew2->aiChildPtr[0] = getChildPtr(pPeer, WORKING_VERSION, 2);
          pNew2->aiChildPtr[1] = getChildPtr(pPeer, WORKING_VERSION, 3);
          pNew2->aiChildPtr[2] = iNewptr;
        }
      }else{
        pNew1->aiKeyPtr[1] = pParent->aiKeyPtr[iPSlot];
        if( bLeaf==0 ){
          pNew1->aiChildPtr[1] = iNewptr;
          pNew1->aiChildPtr[2] = getChildPtr(pPeer, WORKING_VERSION, 0);
        }

        pNewP->aiChildPtr[iPSlot] = iNew1;
        pNewP->aiKeyPtr[iPSlot] = pPeer->aiKeyPtr[0];
        pNewP->aiChildPtr[iPSlot+1] = iNew2;

        pNew2->aiKeyPtr[0] = pPeer->aiKeyPtr[1];
        pNew2->aiKeyPtr[1] = pPeer->aiKeyPtr[2];
        if( bLeaf==0 ){
          pNew2->aiChildPtr[0] = getChildPtr(pPeer, WORKING_VERSION, 1);
          pNew2->aiChildPtr[1] = getChildPtr(pPeer, WORKING_VERSION, 2);
          pNew2->aiChildPtr[2] = getChildPtr(pPeer, WORKING_VERSION, 3);
        }
      }
      assert( pCsr->iNode>=1 );
      pCsr->iNode -= 2;
      if( rc==LSM_OK ){
        assert( pNew1->aiKeyPtr[1] && pNew2->aiKeyPtr[1] );
        rc = treeUpdatePtr(db, pCsr, iNewP);
      }
    }else{
      int iKOut = 0;
      int iPOut = 0;
      int i;

      pCsr->iNode--;

      if( iDir==1 ){
        pNew1->aiKeyPtr[iKOut++] = pParent->aiKeyPtr[iPSlot];
        if( bLeaf==0 ) pNew1->aiChildPtr[iPOut++] = iNewptr;
      }
      for(i=0; i<3; i++){
        if( pPeer->aiKeyPtr[i] ){
          pNew1->aiKeyPtr[iKOut++] = pPeer->aiKeyPtr[i];
        }
      }
      if( bLeaf==0 ){
        for(i=0; i<4; i++){
          if( getChildPtr(pPeer, WORKING_VERSION, i) ){
            pNew1->aiChildPtr[iPOut++] = getChildPtr(pPeer, WORKING_VERSION, i);
          }
        }
      }
      if( iDir==-1 ){
        iPSlot--;
        pNew1->aiKeyPtr[iKOut++] = pParent->aiKeyPtr[iPSlot];
        if( bLeaf==0 ) pNew1->aiChildPtr[iPOut++] = iNewptr;
        pCsr->aiCell[pCsr->iNode] = (u8)iPSlot;
      }

      rc = treeDeleteEntry(db, pCsr, iNew1);
    }
  }

  return rc;
}

/*
** Delete a range of keys from the tree structure (i.e. the lsm_delete_range()
** function, not lsm_delete()).
**
** This is a two step process: 
**
**     1) Remove all entries currently stored in the tree that have keys
**        that fall into the deleted range.
**
**        TODO: There are surely good ways to optimize this step - removing 
**        a range of keys from a b-tree. But for now, this function removes
**        them one at a time using the usual approach.
**
**     2) Unless the largest key smaller than or equal to (pKey1/nKey1) is
**        already marked as START_DELETE, insert a START_DELETE key. 
**        Similarly, unless the smallest key greater than or equal to
**        (pKey2/nKey2) is already START_END, insert a START_END key.
*/
int lsmTreeDelete(
  lsm_db *db,
  void *pKey1, int nKey1,         /* Start of range */
  void *pKey2, int nKey2          /* End of range */
){
  int rc = LSM_OK;
  int bDone = 0;
  TreeRoot *p = &db->treehdr.root;
  TreeBlob blob = {0, 0};

  /* The range must be sensible - that (key1 < key2). */
  assert( treeKeycmp(pKey1, nKey1, pKey2, nKey2)<0 );
  assert( assert_delete_ranges_match(db) );

#if 0
  static int nCall = 0;
  printf("\n");
  nCall++;
  printf("%d delete %s .. %s\n", nCall, (char *)pKey1, (char *)pKey2);
  dump_tree_contents(db, "before delete");
#endif

  /* Step 1. This loop runs until the tree contains no keys within the
  ** range being deleted. Or until an error occurs. */
  while( bDone==0 && rc==LSM_OK ){
    int res;
    TreeCursor csr;               /* Cursor to seek to first key in range */
    void *pDel; int nDel;         /* Key to (possibly) delete this iteration */
#ifndef NDEBUG
    int nEntry = treeCountEntries(db);
#endif

    /* Seek the cursor to the first entry in the tree greater than pKey1. */
    treeCursorInit(db, 0, &csr);
    lsmTreeCursorSeek(&csr, pKey1, nKey1, &res);
    if( res<=0 && lsmTreeCursorValid(&csr) ) lsmTreeCursorNext(&csr);

    /* If there is no such entry, or if it is greater than pKey2, then the
    ** tree now contains no keys in the range being deleted. In this case
    ** break out of the loop.  */
    bDone = 1;
    if( lsmTreeCursorValid(&csr) ){
      lsmTreeCursorKey(&csr, 0, &pDel, &nDel);
      if( treeKeycmp(pDel, nDel, pKey2, nKey2)<0 ) bDone = 0;
    }

    if( bDone==0 ){
      if( (u32)csr.iNode==(p->nHeight-1) ){
        /* The element to delete already lies on a leaf node */
        rc = treeDeleteEntry(db, &csr, 0);
      }else{
        /* 1. Overwrite the current key with a copy of the next key in the 
        **    tree (key N).
        **
        ** 2. Seek to key N (cursor will stop at the internal node copy of
        **    N). Move to the next key (original copy of N). Delete
        **    this entry. 
        */
        u32 iKey;
        TreeKey *pKey;
        int iNode = csr.iNode;
        lsmTreeCursorNext(&csr);
        assert( (u32)csr.iNode==(p->nHeight-1) );

        iKey = csr.apTreeNode[csr.iNode]->aiKeyPtr[csr.aiCell[csr.iNode]];
        lsmTreeCursorPrev(&csr);

        treeOverwriteKey(db, &csr, iKey, &rc);
        pKey = treeShmkey(db, iKey, TKV_LOADKEY, &blob, &rc);
        if( pKey ){
          rc = lsmTreeCursorSeek(&csr, TKV_KEY(pKey), pKey->nKey, &res);
        }
        if( rc==LSM_OK ){
          assert( res==0 && csr.iNode==iNode );
          rc = lsmTreeCursorNext(&csr);
          if( rc==LSM_OK ){
            rc = treeDeleteEntry(db, &csr, 0);
          }
        }
      }
    }

    /* Clean up any memory allocated by the cursor. */
    tblobFree(db, &csr.blob);
#if 0
    dump_tree_contents(db, "ddd delete");
#endif
    assert( bDone || treeCountEntries(db)==(nEntry-1) );
  }

#if 0
  dump_tree_contents(db, "during delete");
#endif

  /* Now insert the START_DELETE and END_DELETE keys. */
  if( rc==LSM_OK ){
    rc = treeInsertEntry(db, LSM_START_DELETE, pKey1, nKey1, 0, -1);
  }
#if 0
  dump_tree_contents(db, "during delete 2");
#endif
  if( rc==LSM_OK ){
    rc = treeInsertEntry(db, LSM_END_DELETE, pKey2, nKey2, 0, -1);
  }

#if 0
  dump_tree_contents(db, "after delete");
#endif

  tblobFree(db, &blob);
  assert( assert_delete_ranges_match(db) );
  return rc;
}

/*
** Return, in bytes, the amount of memory currently used by the tree 
** structure.
*/
int lsmTreeSize(lsm_db *pDb){
  return pDb->treehdr.root.nByte;
}

/*
** Open a cursor on the in-memory tree pTree.
*/
int lsmTreeCursorNew(lsm_db *pDb, int bOld, TreeCursor **ppCsr){
  TreeCursor *pCsr;
  *ppCsr = pCsr = lsmMalloc(pDb->pEnv, sizeof(TreeCursor));
  if( pCsr ){
    treeCursorInit(pDb, bOld, pCsr);
    return LSM_OK;
  }
  return LSM_NOMEM_BKPT;
}

/*
** Close an in-memory tree cursor.
*/
void lsmTreeCursorDestroy(TreeCursor *pCsr){
  if( pCsr ){
    tblobFree(pCsr->pDb, &pCsr->blob);
    lsmFree(pCsr->pDb->pEnv, pCsr);
  }
}

void lsmTreeCursorReset(TreeCursor *pCsr){
  if( pCsr ){
    pCsr->iNode = -1;
    pCsr->pSave = 0;
  }
}

#ifndef NDEBUG
static int treeCsrCompare(TreeCursor *pCsr, void *pKey, int nKey, int *pRc){
  TreeKey *p;
  int cmp = 0;
  assert( pCsr->iNode>=0 );
  p = csrGetKey(pCsr, &pCsr->blob, pRc);
  if( p ){
    cmp = treeKeycmp(TKV_KEY(p), p->nKey, pKey, nKey);
  }
  return cmp;
}
#endif


/*
** Attempt to seek the cursor passed as the first argument to key (pKey/nKey)
** in the tree structure. If an exact match for the key is found, leave the
** cursor pointing to it and set *pRes to zero before returning. If an
** exact match cannot be found, do one of the following:
**
**   * Leave the cursor pointing to the smallest element in the tree that 
**     is larger than the key and set *pRes to +1, or
**
**   * Leave the cursor pointing to the largest element in the tree that 
**     is smaller than the key and set *pRes to -1, or
**
**   * If the tree is empty, leave the cursor at EOF and set *pRes to -1.
*/
int lsmTreeCursorSeek(TreeCursor *pCsr, void *pKey, int nKey, int *pRes){
  int rc = LSM_OK;                /* Return code */
  lsm_db *pDb = pCsr->pDb;
  TreeRoot *pRoot = pCsr->pRoot;
  u32 iNodePtr;                   /* Location of current node in search */

  /* Discard any saved position data */
  treeCursorRestore(pCsr, 0);

  iNodePtr = pRoot->iRoot;
  if( iNodePtr==0 ){
    /* Either an error occurred or the tree is completely empty. */
    assert( rc!=LSM_OK || pRoot->iRoot==0 );
    *pRes = -1;
    pCsr->iNode = -1;
  }else{
    TreeBlob b = {0, 0};
    int res = 0;                  /* Result of comparison function */
    int iNode = -1;
    while( iNodePtr ){
      TreeNode *pNode;            /* Node at location iNodePtr */
      int iTest;                  /* Index of second key to test (0 or 2) */
      u32 iTreeKey;
      TreeKey *pTreeKey;          /* Key to compare against */

      pNode = (TreeNode *)treeShmptrUnsafe(pDb, iNodePtr);
      iNode++;
      pCsr->apTreeNode[iNode] = pNode;

      /* Compare (pKey/nKey) with the key in the middle slot of B-tree node
      ** pNode. The middle slot is never empty. If the comparison is a match,
      ** then the search is finished. Break out of the loop. */
      pTreeKey = (TreeKey*)treeShmptrUnsafe(pDb, pNode->aiKeyPtr[1]);
      if( !(pTreeKey->flags & LSM_CONTIGUOUS) ){
        pTreeKey = treeShmkey(pDb, pNode->aiKeyPtr[1], TKV_LOADKEY, &b, &rc);
        if( rc!=LSM_OK ) break;
      }
      res = treeKeycmp((void *)&pTreeKey[1], pTreeKey->nKey, pKey, nKey);
      if( res==0 ){
        pCsr->aiCell[iNode] = 1;
        break;
      }

      /* Based on the results of the previous comparison, compare (pKey/nKey)
      ** to either the left or right key of the B-tree node, if such a key
      ** exists. */
      iTest = (res>0 ? 0 : 2);
      iTreeKey = pNode->aiKeyPtr[iTest];
      if( iTreeKey ){
        pTreeKey = (TreeKey*)treeShmptrUnsafe(pDb, iTreeKey);
        if( !(pTreeKey->flags & LSM_CONTIGUOUS) ){
          pTreeKey = treeShmkey(pDb, iTreeKey, TKV_LOADKEY, &b, &rc);
          if( rc ) break;
        }
        res = treeKeycmp((void *)&pTreeKey[1], pTreeKey->nKey, pKey, nKey);
        if( res==0 ){
          pCsr->aiCell[iNode] = (u8)iTest;
          break;
        }
      }else{
        iTest = 1;
      }

      if( (u32)iNode<(pRoot->nHeight-1) ){
        iNodePtr = getChildPtr(pNode, pRoot->iTransId, iTest + (res<0));
      }else{
        iNodePtr = 0;
      }
      pCsr->aiCell[iNode] = (u8)(iTest + (iNodePtr && (res<0)));
    }

    *pRes = res;
    pCsr->iNode = iNode;
    tblobFree(pDb, &b);
  }

  /* assert() that *pRes has been set properly */
#ifndef NDEBUG
  if( rc==LSM_OK && lsmTreeCursorValid(pCsr) ){
    int cmp = treeCsrCompare(pCsr, pKey, nKey, &rc);
    assert( rc!=LSM_OK || *pRes==cmp || (*pRes ^ cmp)>0 );
  }
#endif

  return rc;
}

int lsmTreeCursorNext(TreeCursor *pCsr){
#ifndef NDEBUG
  TreeKey *pK1;
  TreeBlob key1 = {0, 0};
#endif
  lsm_db *pDb = pCsr->pDb;
  TreeRoot *pRoot = pCsr->pRoot;
  const int iLeaf = pRoot->nHeight-1;
  int iCell; 
  int rc = LSM_OK; 
  TreeNode *pNode; 

  /* Restore the cursor position, if required */
  int iRestore = 0;
  treeCursorRestore(pCsr, &iRestore);
  if( iRestore>0 ) return LSM_OK;

  /* Save a pointer to the current key. This is used in an assert() at the
  ** end of this function - to check that the 'next' key really is larger
  ** than the current key. */
#ifndef NDEBUG
  pK1 = csrGetKey(pCsr, &key1, &rc);
  if( rc!=LSM_OK ) return rc;
#endif

  assert( lsmTreeCursorValid(pCsr) );
  assert( pCsr->aiCell[pCsr->iNode]<3 );

  pNode = pCsr->apTreeNode[pCsr->iNode];
  iCell = ++pCsr->aiCell[pCsr->iNode];

  /* If the current node is not a leaf, and the current cell has sub-tree
  ** associated with it, descend to the left-most key on the left-most
  ** leaf of the sub-tree.  */
  if( pCsr->iNode<iLeaf && getChildPtr(pNode, pRoot->iTransId, iCell) ){
    do {
      u32 iNodePtr;
      pCsr->iNode++;
      iNodePtr = getChildPtr(pNode, pRoot->iTransId, iCell);
      pNode = (TreeNode *)treeShmptr(pDb, iNodePtr);
      pCsr->apTreeNode[pCsr->iNode] = pNode;
      iCell = pCsr->aiCell[pCsr->iNode] = (pNode->aiKeyPtr[0]==0);
    }while( pCsr->iNode < iLeaf );
  }

  /* Otherwise, the next key is found by following pointer up the tree 
  ** until there is a key immediately to the right of the pointer followed 
  ** to reach the sub-tree containing the current key. */
  else if( iCell>=3 || pNode->aiKeyPtr[iCell]==0 ){
    while( (--pCsr->iNode)>=0 ){
      iCell = pCsr->aiCell[pCsr->iNode];
      if( iCell<3 && pCsr->apTreeNode[pCsr->iNode]->aiKeyPtr[iCell] ) break;
    }
  }

#ifndef NDEBUG
  if( pCsr->iNode>=0 ){
    TreeKey *pK2 = csrGetKey(pCsr, &pCsr->blob, &rc);
    assert( rc||treeKeycmp(TKV_KEY(pK2),pK2->nKey,TKV_KEY(pK1),pK1->nKey)>=0 );
  }
  tblobFree(pDb, &key1);
#endif

  return rc;
}

int lsmTreeCursorPrev(TreeCursor *pCsr){
#ifndef NDEBUG
  TreeKey *pK1;
  TreeBlob key1 = {0, 0};
#endif
  lsm_db *pDb = pCsr->pDb;
  TreeRoot *pRoot = pCsr->pRoot;
  const int iLeaf = pRoot->nHeight-1;
  int iCell; 
  int rc = LSM_OK; 
  TreeNode *pNode; 

  /* Restore the cursor position, if required */
  int iRestore = 0;
  treeCursorRestore(pCsr, &iRestore);
  if( iRestore<0 ) return LSM_OK;

  /* Save a pointer to the current key. This is used in an assert() at the
  ** end of this function - to check that the 'next' key really is smaller
  ** than the current key. */
#ifndef NDEBUG
  pK1 = csrGetKey(pCsr, &key1, &rc);
  if( rc!=LSM_OK ) return rc;
#endif

  assert( lsmTreeCursorValid(pCsr) );
  pNode = pCsr->apTreeNode[pCsr->iNode];
  iCell = pCsr->aiCell[pCsr->iNode];
  assert( iCell>=0 && iCell<3 );

  /* If the current node is not a leaf, and the current cell has sub-tree
  ** associated with it, descend to the right-most key on the right-most
  ** leaf of the sub-tree.  */
  if( pCsr->iNode<iLeaf && getChildPtr(pNode, pRoot->iTransId, iCell) ){
    do {
      u32 iNodePtr;
      pCsr->iNode++;
      iNodePtr = getChildPtr(pNode, pRoot->iTransId, iCell);
      pNode = (TreeNode *)treeShmptr(pDb, iNodePtr);
      if( rc!=LSM_OK ) break;
      pCsr->apTreeNode[pCsr->iNode] = pNode;
      iCell = 1 + (pNode->aiKeyPtr[2]!=0) + (pCsr->iNode < iLeaf);
      pCsr->aiCell[pCsr->iNode] = (u8)iCell;
    }while( pCsr->iNode < iLeaf );
  }

  /* Otherwise, the next key is found by following pointer up the tree until
  ** there is a key immediately to the left of the pointer followed to reach
  ** the sub-tree containing the current key. */
  else{
    do {
      iCell = pCsr->aiCell[pCsr->iNode]-1;
      if( iCell>=0 && pCsr->apTreeNode[pCsr->iNode]->aiKeyPtr[iCell] ) break;
    }while( (--pCsr->iNode)>=0 );
    pCsr->aiCell[pCsr->iNode] = (u8)iCell;
  }

#ifndef NDEBUG
  if( pCsr->iNode>=0 ){
    TreeKey *pK2 = csrGetKey(pCsr, &pCsr->blob, &rc);
    assert( rc || treeKeycmp(TKV_KEY(pK2),pK2->nKey,TKV_KEY(pK1),pK1->nKey)<0 );
  }
  tblobFree(pDb, &key1);
#endif

  return rc;
}

/*
** Move the cursor to the first (bLast==0) or last (bLast!=0) entry in the
** in-memory tree.
*/
int lsmTreeCursorEnd(TreeCursor *pCsr, int bLast){
  lsm_db *pDb = pCsr->pDb;
  TreeRoot *pRoot = pCsr->pRoot;
  int rc = LSM_OK;

  u32 iNodePtr;
  pCsr->iNode = -1;

  /* Discard any saved position data */
  treeCursorRestore(pCsr, 0);

  iNodePtr = pRoot->iRoot;
  while( iNodePtr ){
    int iCell;
    TreeNode *pNode;

    pNode = (TreeNode *)treeShmptr(pDb, iNodePtr);
    if( rc ) break;

    if( bLast ){
      iCell = ((pNode->aiKeyPtr[2]==0) ? 2 : 3);
    }else{
      iCell = ((pNode->aiKeyPtr[0]==0) ? 1 : 0);
    }
    pCsr->iNode++;
    pCsr->apTreeNode[pCsr->iNode] = pNode;

    if( (u32)pCsr->iNode<pRoot->nHeight-1 ){
      iNodePtr = getChildPtr(pNode, pRoot->iTransId, iCell);
    }else{
      iNodePtr = 0;
    }
    pCsr->aiCell[pCsr->iNode] = (u8)(iCell - (iNodePtr==0 && bLast));
  }

  return rc;
}

int lsmTreeCursorFlags(TreeCursor *pCsr){
  int flags = 0;
  if( pCsr && pCsr->iNode>=0 ){
    int rc = LSM_OK;
    TreeKey *pKey = (TreeKey *)treeShmptrUnsafe(pCsr->pDb,
        pCsr->apTreeNode[pCsr->iNode]->aiKeyPtr[pCsr->aiCell[pCsr->iNode]]
    );
    assert( rc==LSM_OK );
    flags = (pKey->flags & ~LSM_CONTIGUOUS);
  }
  return flags;
}

int lsmTreeCursorKey(TreeCursor *pCsr, int *pFlags, void **ppKey, int *pnKey){
  TreeKey *pTreeKey;
  int rc = LSM_OK;

  assert( lsmTreeCursorValid(pCsr) );

  pTreeKey = pCsr->pSave;
  if( !pTreeKey ){
    pTreeKey = csrGetKey(pCsr, &pCsr->blob, &rc);
  }
  if( rc==LSM_OK ){
    *pnKey = pTreeKey->nKey;
    if( pFlags ) *pFlags = pTreeKey->flags;
    *ppKey = (void *)&pTreeKey[1];
  }

  return rc;
}

int lsmTreeCursorValue(TreeCursor *pCsr, void **ppVal, int *pnVal){
  int res = 0;
  int rc;

  rc = treeCursorRestore(pCsr, &res);
  if( res==0 ){
    TreeKey *pTreeKey = csrGetKey(pCsr, &pCsr->blob, &rc);
    if( rc==LSM_OK ){
      if( pTreeKey->flags & LSM_INSERT ){
        *pnVal = pTreeKey->nValue;
        *ppVal = TKV_VAL(pTreeKey);
      }else{
        *ppVal = 0;
        *pnVal = -1;
      }
    }
  }else{
    *ppVal = 0;
    *pnVal = 0;
  }

  return rc;
}

/*
** Return true if the cursor currently points to a valid entry. 
*/
int lsmTreeCursorValid(TreeCursor *pCsr){
  return (pCsr && (pCsr->pSave || pCsr->iNode>=0));
}

/*
** Store a mark in *pMark. Later on, a call to lsmTreeRollback() with a
** pointer to the same TreeMark structure may be used to roll the tree
** contents back to their current state.
*/
void lsmTreeMark(lsm_db *pDb, TreeMark *pMark){
  pMark->iRoot = pDb->treehdr.root.iRoot;
  pMark->nHeight = pDb->treehdr.root.nHeight;
  pMark->iWrite = pDb->treehdr.iWrite;
  pMark->nChunk = pDb->treehdr.nChunk;
  pMark->iNextShmid = pDb->treehdr.iNextShmid;
  pMark->iRollback = intArraySize(&pDb->rollback);
}

/*
** Roll back to mark pMark. Structure *pMark should have been previously
** populated by a call to lsmTreeMark().
*/
void lsmTreeRollback(lsm_db *pDb, TreeMark *pMark){
  int iIdx;
  int nIdx;
  u32 iNext;
  ShmChunk *pChunk;
  u32 iChunk;
  u32 iShmid;

  /* Revert all required v2 pointers. */
  nIdx = intArraySize(&pDb->rollback);
  for(iIdx = pMark->iRollback; iIdx<nIdx; iIdx++){
    TreeNode *pNode;
    pNode = treeShmptr(pDb, intArrayEntry(&pDb->rollback, iIdx));
    assert( pNode );
    pNode->iV2 = 0;
    pNode->iV2Child = 0;
    pNode->iV2Ptr = 0;
  }
  intArrayTruncate(&pDb->rollback, pMark->iRollback);

  /* Restore the free-chunk list. */
  assert( pMark->iWrite!=0 );
  iChunk = treeOffsetToChunk(pMark->iWrite-1);
  pChunk = treeShmChunk(pDb, iChunk);
  iNext = pChunk->iNext;
  pChunk->iNext = 0;

  pChunk = treeShmChunk(pDb, pDb->treehdr.iFirst);
  iShmid = pChunk->iShmid-1;

  while( iNext ){
    u32 iFree = iNext;            /* Current chunk being rollback-freed */
    ShmChunk *pFree;              /* Pointer to chunk iFree */

    pFree = treeShmChunk(pDb, iFree);
    iNext = pFree->iNext;

    if( iFree<pMark->nChunk ){
      pFree->iNext = pDb->treehdr.iFirst;
      pFree->iShmid = iShmid--;
      pDb->treehdr.iFirst = iFree;
    }
  }

  /* Restore the tree-header fields */
  pDb->treehdr.root.iRoot = pMark->iRoot;
  pDb->treehdr.root.nHeight = pMark->nHeight;
  pDb->treehdr.iWrite = pMark->iWrite;
  pDb->treehdr.nChunk = pMark->nChunk;
  pDb->treehdr.iNextShmid = pMark->iNextShmid;
}

/*
** Load the in-memory tree header from shared-memory into pDb->treehdr.
** If the header cannot be loaded, return LSM_PROTOCOL.
**
** If the header is successfully loaded and parameter piRead is not NULL,
** is is set to 1 if the header was loaded from ShmHeader.hdr1, or 2 if
** the header was loaded from ShmHeader.hdr2.
*/
int lsmTreeLoadHeader(lsm_db *pDb, int *piRead){
  int nRem = LSM_ATTEMPTS_BEFORE_PROTOCOL;
  while( (nRem--)>0 ){
    ShmHeader *pShm = pDb->pShmhdr;

    memcpy(&pDb->treehdr, &pShm->hdr1, sizeof(TreeHeader));
    if( treeHeaderChecksumOk(&pDb->treehdr) ){
      if( piRead ) *piRead = 1;
      return LSM_OK;
    }
    memcpy(&pDb->treehdr, &pShm->hdr2, sizeof(TreeHeader));
    if( treeHeaderChecksumOk(&pDb->treehdr) ){
      if( piRead ) *piRead = 2;
      return LSM_OK;
    }

    lsmShmBarrier(pDb);
  }
  return LSM_PROTOCOL_BKPT;
}

int lsmTreeLoadHeaderOk(lsm_db *pDb, int iRead){
  TreeHeader *p = (iRead==1) ? &pDb->pShmhdr->hdr1 : &pDb->pShmhdr->hdr2;
  assert( iRead==1 || iRead==2 );
  return (0==memcmp(pDb->treehdr.aCksum, p->aCksum, sizeof(u32)*2));
}

/*
** This function is called to conclude a transaction. If argument bCommit
** is true, the transaction is committed. Otherwise it is rolled back.
*/
int lsmTreeEndTransaction(lsm_db *pDb, int bCommit){
  ShmHeader *pShm = pDb->pShmhdr;

  treeHeaderChecksum(&pDb->treehdr, pDb->treehdr.aCksum);
  memcpy(&pShm->hdr2, &pDb->treehdr, sizeof(TreeHeader));
  lsmShmBarrier(pDb);
  memcpy(&pShm->hdr1, &pDb->treehdr, sizeof(TreeHeader));
  pShm->bWriter = 0;
  intArrayFree(pDb->pEnv, &pDb->rollback);

  return LSM_OK;
}

#ifndef NDEBUG
static int assert_delete_ranges_match(lsm_db *db){
  int prev = 0;
  TreeBlob blob = {0, 0};
  TreeCursor csr;               /* Cursor used to iterate through tree */
  int rc;

  treeCursorInit(db, 0, &csr);
  for( rc = lsmTreeCursorEnd(&csr, 0);
       rc==LSM_OK && lsmTreeCursorValid(&csr);
       rc = lsmTreeCursorNext(&csr)
  ){
    TreeKey *pKey = csrGetKey(&csr, &blob, &rc);
    if( rc!=LSM_OK ) break;
    assert( ((prev&LSM_START_DELETE)==0)==((pKey->flags&LSM_END_DELETE)==0) );
    prev = pKey->flags;
  }

  tblobFree(csr.pDb, &csr.blob);
  tblobFree(csr.pDb, &blob);

  return 1;
}

static int treeCountEntries(lsm_db *db){
  TreeCursor csr;               /* Cursor used to iterate through tree */
  int rc;
  int nEntry = 0;

  treeCursorInit(db, 0, &csr);
  for( rc = lsmTreeCursorEnd(&csr, 0);
       rc==LSM_OK && lsmTreeCursorValid(&csr);
       rc = lsmTreeCursorNext(&csr)
  ){
    nEntry++;
  }

  tblobFree(csr.pDb, &csr.blob);

  return nEntry;
}
#endif
