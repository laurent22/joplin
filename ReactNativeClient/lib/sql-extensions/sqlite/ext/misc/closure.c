/*
** 2013-04-16
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
** This file contains code for a virtual table that finds the transitive
** closure of a parent/child relationship in a real table.  The virtual 
** table is called "transitive_closure".
**
** A transitive_closure virtual table is created like this:
**
**     CREATE VIRTUAL TABLE x USING transitive_closure(
**        tablename=<tablename>,      -- T
**        idcolumn=<columnname>,      -- X
**        parentcolumn=<columnname>   -- P
**     );
**
** When it is created, the new transitive_closure table may be supplied 
** with default values for the name of a table T and columns T.X and T.P.
** The T.X and T.P columns must contain integers.  The ideal case is for 
** T.X to be the INTEGER PRIMARY KEY.  The T.P column should reference
** the T.X column. The row referenced by T.P is the parent of the current row.
**
** The tablename, idcolumn, and parentcolumn supplied by the CREATE VIRTUAL
** TABLE statement may be overridden in individual queries by including
** terms like tablename='newtable', idcolumn='id2', or 
** parentcolumn='parent3' in the WHERE clause of the query.
**
** For efficiency, it is essential that there be an index on the P column:
**
**    CREATE Tidx1 ON T(P)
**
** Suppose a specific instance of the closure table is as follows:
**
**    CREATE VIRTUAL TABLE ct1 USING transitive_closure(
**       tablename='group',
**       idcolumn='groupId',
**       parentcolumn='parentId'
**    );
**
** Such an instance of the transitive_closure virtual table would be
** appropriate for walking a tree defined using a table like this, for example:
**
**    CREATE TABLE group(
**      groupId INTEGER PRIMARY KEY,
**      parentId INTEGER REFERENCES group
**    );
**    CREATE INDEX group_idx1 ON group(parentId);
**
** The group table above would presumably have other application-specific
** fields.  The key point here is that rows of the group table form a
** tree.  The purpose of the ct1 virtual table is to easily extract
** branches of that tree.
**
** Once it has been created, the ct1 virtual table can be queried
** as follows:
**
**    SELECT * FROM element
**     WHERE element.groupId IN (SELECT id FROM ct1 WHERE root=?1);
**
** The above query will return all elements that are part of group ?1
** or children of group ?1 or grand-children of ?1 and so forth for all
** descendents of group ?1.  The same query can be formulated as a join:
**
**    SELECT element.* FROM element, ct1
**     WHERE element.groupid=ct1.id
**       AND ct1.root=?1;
**
** The depth of the transitive_closure (the number of generations of
** parent/child relations to follow) can be limited by setting "depth"
** column in the WHERE clause.  So, for example, the following query
** finds only children and grandchildren but no further descendents:
**
**    SELECT element.* FROM element, ct1
**     WHERE element.groupid=ct1.id
**       AND ct1.root=?1
**       AND ct1.depth<=2;
**
** The "ct1.depth<=2" term could be a strict equality "ct1.depth=2" in
** order to find only the grandchildren of ?1, not ?1 itself or the
** children of ?1.
** 
** The root=?1 term must be supplied in WHERE clause or else the query
** of the ct1 virtual table will return an empty set.  The tablename,
** idcolumn, and parentcolumn attributes can be overridden in the WHERE
** clause if desired.  So, for example, the ct1 table could be repurposed
** to find ancestors rather than descendents by inverting the roles of
** the idcolumn and parentcolumn:
**
**    SELECT element.* FROM element, ct1
**     WHERE element.groupid=ct1.id
**       AND ct1.root=?1
**       AND ct1.idcolumn='parentId'
**       AND ct1.parentcolumn='groupId';
**
** Multiple calls to ct1 could be combined.  For example, the following
** query finds all elements that "cousins" of groupId ?1.  That is to say
** elements where the groupId is a grandchild of the grandparent of ?1.
** (This definition of "cousins" also includes siblings and self.)
**
**    SELECT element.* FROM element, ct1
**     WHERE element.groupId=ct1.id
**       AND ct1.depth=2
**       AND ct1.root IN (SELECT id FROM ct1
**                         WHERE root=?1
**                           AND depth=2
**                           AND idcolumn='parentId'
**                           AND parentcolumn='groupId');
**
** In our example, the group.groupId column is unique and thus the
** subquery will return exactly one row.  For that reason, the IN
** operator could be replaced by "=" to get the same result.  But
** in the general case where the idcolumn is not unique, an IN operator
** would be required for this kind of query.
**
** Note that because the tablename, idcolumn, and parentcolumn can
** all be specified in the query, it is possible for an application
** to define a single transitive_closure virtual table for use on lots
** of different hierarchy tables.  One might say:
**
**     CREATE VIRTUAL TABLE temp.closure USING transitive_closure;
**
** As each database connection is being opened.  Then the application
** would always have a "closure" virtual table handy to use for querying.
**
**    SELECT element.* FROM element, closure
**     WHERE element.groupid=ct1.id
**       AND closure.root=?1
**       AND closure.tablename='group'
**       AND closure.idname='groupId'
**       AND closure.parentname='parentId';
**
** See the documentation at http://www.sqlite.org/loadext.html for information
** on how to compile and use loadable extensions such as this one.
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <stdio.h>
#include <ctype.h>

#ifndef SQLITE_OMIT_VIRTUALTABLE

/*
** Forward declaration of objects used by this implementation
*/
typedef struct closure_vtab closure_vtab;
typedef struct closure_cursor closure_cursor;
typedef struct closure_queue closure_queue;
typedef struct closure_avl closure_avl;

/*****************************************************************************
** AVL Tree implementation
*/
/*
** Objects that want to be members of the AVL tree should embedded an
** instance of this structure.
*/
struct closure_avl {
  sqlite3_int64 id;     /* Id of this entry in the table */
  int iGeneration;      /* Which generation is this entry part of */
  closure_avl *pList;   /* A linked list of nodes */
  closure_avl *pBefore; /* Other elements less than id */
  closure_avl *pAfter;  /* Other elements greater than id */
  closure_avl *pUp;     /* Parent element */
  short int height;     /* Height of this node.  Leaf==1 */
  short int imbalance;  /* Height difference between pBefore and pAfter */
};

/* Recompute the closure_avl.height and closure_avl.imbalance fields for p.
** Assume that the children of p have correct heights.
*/
static void closureAvlRecomputeHeight(closure_avl *p){
  short int hBefore = p->pBefore ? p->pBefore->height : 0;
  short int hAfter = p->pAfter ? p->pAfter->height : 0;
  p->imbalance = hBefore - hAfter;  /* -: pAfter higher.  +: pBefore higher */
  p->height = (hBefore>hAfter ? hBefore : hAfter)+1;
}

/*
**     P                B
**    / \              / \
**   B   Z    ==>     X   P
**  / \                  / \
** X   Y                Y   Z
**
*/
static closure_avl *closureAvlRotateBefore(closure_avl *pP){
  closure_avl *pB = pP->pBefore;
  closure_avl *pY = pB->pAfter;
  pB->pUp = pP->pUp;
  pB->pAfter = pP;
  pP->pUp = pB;
  pP->pBefore = pY;
  if( pY ) pY->pUp = pP;
  closureAvlRecomputeHeight(pP);
  closureAvlRecomputeHeight(pB);
  return pB;
}

/*
**     P                A
**    / \              / \
**   X   A    ==>     P   Z
**      / \          / \
**     Y   Z        X   Y
**
*/
static closure_avl *closureAvlRotateAfter(closure_avl *pP){
  closure_avl *pA = pP->pAfter;
  closure_avl *pY = pA->pBefore;
  pA->pUp = pP->pUp;
  pA->pBefore = pP;
  pP->pUp = pA;
  pP->pAfter = pY;
  if( pY ) pY->pUp = pP;
  closureAvlRecomputeHeight(pP);
  closureAvlRecomputeHeight(pA);
  return pA;
}

/*
** Return a pointer to the pBefore or pAfter pointer in the parent
** of p that points to p.  Or if p is the root node, return pp.
*/
static closure_avl **closureAvlFromPtr(closure_avl *p, closure_avl **pp){
  closure_avl *pUp = p->pUp;
  if( pUp==0 ) return pp;
  if( pUp->pAfter==p ) return &pUp->pAfter;
  return &pUp->pBefore;
}

/*
** Rebalance all nodes starting with p and working up to the root.
** Return the new root.
*/
static closure_avl *closureAvlBalance(closure_avl *p){
  closure_avl *pTop = p;
  closure_avl **pp;
  while( p ){
    closureAvlRecomputeHeight(p);
    if( p->imbalance>=2 ){
      closure_avl *pB = p->pBefore;
      if( pB->imbalance<0 ) p->pBefore = closureAvlRotateAfter(pB);
      pp = closureAvlFromPtr(p,&p);
      p = *pp = closureAvlRotateBefore(p);
    }else if( p->imbalance<=(-2) ){
      closure_avl *pA = p->pAfter;
      if( pA->imbalance>0 ) p->pAfter = closureAvlRotateBefore(pA);
      pp = closureAvlFromPtr(p,&p);
      p = *pp = closureAvlRotateAfter(p);
    }
    pTop = p;
    p = p->pUp;
  }
  return pTop;
}

/* Search the tree rooted at p for an entry with id.  Return a pointer
** to the entry or return NULL.
*/
static closure_avl *closureAvlSearch(closure_avl *p, sqlite3_int64 id){
  while( p && id!=p->id ){
    p = (id<p->id) ? p->pBefore : p->pAfter;
  }
  return p;
}

/* Find the first node (the one with the smallest key).
*/
static closure_avl *closureAvlFirst(closure_avl *p){
  if( p ) while( p->pBefore ) p = p->pBefore;
  return p;
}

/* Return the node with the next larger key after p.
*/
closure_avl *closureAvlNext(closure_avl *p){
  closure_avl *pPrev = 0;
  while( p && p->pAfter==pPrev ){
    pPrev = p;
    p = p->pUp;
  }
  if( p && pPrev==0 ){
    p = closureAvlFirst(p->pAfter);
  }
  return p;
}

/* Insert a new node pNew.  Return NULL on success.  If the key is not
** unique, then do not perform the insert but instead leave pNew unchanged
** and return a pointer to an existing node with the same key.
*/
static closure_avl *closureAvlInsert(
  closure_avl **ppHead,  /* Head of the tree */
  closure_avl *pNew      /* New node to be inserted */
){
  closure_avl *p = *ppHead;
  if( p==0 ){
    p = pNew;
    pNew->pUp = 0;
  }else{
    while( p ){
      if( pNew->id<p->id ){
        if( p->pBefore ){
          p = p->pBefore;
        }else{
          p->pBefore = pNew;
          pNew->pUp = p;
          break;
        }
      }else if( pNew->id>p->id ){
        if( p->pAfter ){
          p = p->pAfter;
        }else{
          p->pAfter = pNew;
          pNew->pUp = p;
          break;
        }
      }else{
        return p;
      }
    }
  }
  pNew->pBefore = 0;
  pNew->pAfter = 0;
  pNew->height = 1;
  pNew->imbalance = 0;
  *ppHead = closureAvlBalance(p);
  return 0;
}

/* Walk the tree can call xDestroy on each node
*/
static void closureAvlDestroy(closure_avl *p, void (*xDestroy)(closure_avl*)){
  if( p ){
    closureAvlDestroy(p->pBefore, xDestroy);
    closureAvlDestroy(p->pAfter, xDestroy);
    xDestroy(p);
  }
}
/*
** End of the AVL Tree implementation
******************************************************************************/

/* 
** A closure virtual-table object 
*/
struct closure_vtab {
  sqlite3_vtab base;         /* Base class - must be first */
  char *zDb;                 /* Name of database.  (ex: "main") */
  char *zSelf;               /* Name of this virtual table */
  char *zTableName;          /* Name of table holding parent/child relation */
  char *zIdColumn;           /* Name of ID column of zTableName */
  char *zParentColumn;       /* Name of PARENT column in zTableName */
  sqlite3 *db;               /* The database connection */
  int nCursor;               /* Number of pending cursors */
};

/* A closure cursor object */
struct closure_cursor {
  sqlite3_vtab_cursor base;  /* Base class - must be first */
  closure_vtab *pVtab;       /* The virtual table this cursor belongs to */
  char *zTableName;          /* Name of table holding parent/child relation */
  char *zIdColumn;           /* Name of ID column of zTableName */
  char *zParentColumn;       /* Name of PARENT column in zTableName */
  closure_avl *pCurrent;     /* Current element of output */
  closure_avl *pClosure;     /* The complete closure tree */
};

/* A queue of AVL nodes */
struct closure_queue {
  closure_avl *pFirst;       /* Oldest node on the queue */
  closure_avl *pLast;        /* Youngest node on the queue */
};

/*
** Add a node to the end of the queue
*/
static void queuePush(closure_queue *pQueue, closure_avl *pNode){
  pNode->pList = 0;
  if( pQueue->pLast ){
    pQueue->pLast->pList = pNode;
  }else{
    pQueue->pFirst = pNode;
  }
  pQueue->pLast = pNode;
}

/*
** Extract the oldest element (the front element) from the queue.
*/
static closure_avl *queuePull(closure_queue *pQueue){
  closure_avl *p = pQueue->pFirst;
  if( p ){
    pQueue->pFirst = p->pList;
    if( pQueue->pFirst==0 ) pQueue->pLast = 0;
  }
  return p;
}

/*
** This function converts an SQL quoted string into an unquoted string
** and returns a pointer to a buffer allocated using sqlite3_malloc() 
** containing the result. The caller should eventually free this buffer
** using sqlite3_free.
**
** Examples:
**
**     "abc"   becomes   abc
**     'xyz'   becomes   xyz
**     [pqr]   becomes   pqr
**     `mno`   becomes   mno
*/
static char *closureDequote(const char *zIn){
  sqlite3_int64 nIn;              /* Size of input string, in bytes */
  char *zOut;                     /* Output (dequoted) string */

  nIn = strlen(zIn);
  zOut = sqlite3_malloc64(nIn+1);
  if( zOut ){
    char q = zIn[0];              /* Quote character (if any ) */

    if( q!='[' && q!= '\'' && q!='"' && q!='`' ){
      memcpy(zOut, zIn, (size_t)(nIn+1));
    }else{
      int iOut = 0;               /* Index of next byte to write to output */
      int iIn;                    /* Index of next byte to read from input */

      if( q=='[' ) q = ']';
      for(iIn=1; iIn<nIn; iIn++){
        if( zIn[iIn]==q ) iIn++;
        zOut[iOut++] = zIn[iIn];
      }
    }
    assert( (int)strlen(zOut)<=nIn );
  }
  return zOut;
}

/*
** Deallocate an closure_vtab object
*/
static void closureFree(closure_vtab *p){
  if( p ){
    sqlite3_free(p->zDb);
    sqlite3_free(p->zSelf);
    sqlite3_free(p->zTableName);
    sqlite3_free(p->zIdColumn);
    sqlite3_free(p->zParentColumn);
    memset(p, 0, sizeof(*p));
    sqlite3_free(p);
  }
}

/*
** xDisconnect/xDestroy method for the closure module.
*/
static int closureDisconnect(sqlite3_vtab *pVtab){
  closure_vtab *p = (closure_vtab*)pVtab;
  assert( p->nCursor==0 );
  closureFree(p);
  return SQLITE_OK;
}

/*
** Check to see if the argument is of the form:
**
**       KEY = VALUE
**
** If it is, return a pointer to the first character of VALUE.
** If not, return NULL.  Spaces around the = are ignored.
*/
static const char *closureValueOfKey(const char *zKey, const char *zStr){
  int nKey = (int)strlen(zKey);
  int nStr = (int)strlen(zStr);
  int i;
  if( nStr<nKey+1 ) return 0;
  if( memcmp(zStr, zKey, nKey)!=0 ) return 0;
  for(i=nKey; isspace((unsigned char)zStr[i]); i++){}
  if( zStr[i]!='=' ) return 0;
  i++;
  while( isspace((unsigned char)zStr[i]) ){ i++; }
  return zStr+i;
}

/*
** xConnect/xCreate method for the closure module. Arguments are:
**
**   argv[0]    -> module name  ("transitive_closure")
**   argv[1]    -> database name
**   argv[2]    -> table name
**   argv[3...] -> arguments
*/
static int closureConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  int rc = SQLITE_OK;              /* Return code */
  closure_vtab *pNew = 0;          /* New virtual table */
  const char *zDb = argv[1];
  const char *zVal;
  int i;

  (void)pAux;
  *ppVtab = 0;
  pNew = sqlite3_malloc( sizeof(*pNew) );
  if( pNew==0 ) return SQLITE_NOMEM;
  rc = SQLITE_NOMEM;
  memset(pNew, 0, sizeof(*pNew));
  pNew->db = db;
  pNew->zDb = sqlite3_mprintf("%s", zDb);
  if( pNew->zDb==0 ) goto closureConnectError;
  pNew->zSelf = sqlite3_mprintf("%s", argv[2]);
  if( pNew->zSelf==0 ) goto closureConnectError;
  for(i=3; i<argc; i++){
    zVal = closureValueOfKey("tablename", argv[i]);
    if( zVal ){
      sqlite3_free(pNew->zTableName);
      pNew->zTableName = closureDequote(zVal);
      if( pNew->zTableName==0 ) goto closureConnectError;
      continue;
    }
    zVal = closureValueOfKey("idcolumn", argv[i]);
    if( zVal ){
      sqlite3_free(pNew->zIdColumn);
      pNew->zIdColumn = closureDequote(zVal);
      if( pNew->zIdColumn==0 ) goto closureConnectError;
      continue;
    }
    zVal = closureValueOfKey("parentcolumn", argv[i]);
    if( zVal ){
      sqlite3_free(pNew->zParentColumn);
      pNew->zParentColumn = closureDequote(zVal);
      if( pNew->zParentColumn==0 ) goto closureConnectError;
      continue;
    }
    *pzErr = sqlite3_mprintf("unrecognized argument: [%s]\n", argv[i]);
    closureFree(pNew);
    *ppVtab = 0;
    return SQLITE_ERROR;
  }
  rc = sqlite3_declare_vtab(db,
         "CREATE TABLE x(id,depth,root HIDDEN,tablename HIDDEN,"
                        "idcolumn HIDDEN,parentcolumn HIDDEN)"
       );
#define CLOSURE_COL_ID              0
#define CLOSURE_COL_DEPTH           1
#define CLOSURE_COL_ROOT            2
#define CLOSURE_COL_TABLENAME       3
#define CLOSURE_COL_IDCOLUMN        4
#define CLOSURE_COL_PARENTCOLUMN    5
  if( rc!=SQLITE_OK ){
    closureFree(pNew);
  }
  *ppVtab = &pNew->base;
  return rc;

closureConnectError:
  closureFree(pNew);
  return rc;
}

/*
** Open a new closure cursor.
*/
static int closureOpen(sqlite3_vtab *pVTab, sqlite3_vtab_cursor **ppCursor){
  closure_vtab *p = (closure_vtab*)pVTab;
  closure_cursor *pCur;
  pCur = sqlite3_malloc( sizeof(*pCur) );
  if( pCur==0 ) return SQLITE_NOMEM;
  memset(pCur, 0, sizeof(*pCur));
  pCur->pVtab = p;
  *ppCursor = &pCur->base;
  p->nCursor++;
  return SQLITE_OK;
}

/*
** Free up all the memory allocated by a cursor.  Set it rLimit to 0
** to indicate that it is at EOF.
*/
static void closureClearCursor(closure_cursor *pCur){
  closureAvlDestroy(pCur->pClosure, (void(*)(closure_avl*))sqlite3_free);
  sqlite3_free(pCur->zTableName);
  sqlite3_free(pCur->zIdColumn);
  sqlite3_free(pCur->zParentColumn);
  pCur->zTableName = 0;
  pCur->zIdColumn = 0;
  pCur->zParentColumn = 0;
  pCur->pCurrent = 0;
  pCur->pClosure = 0;
}

/*
** Close a closure cursor.
*/
static int closureClose(sqlite3_vtab_cursor *cur){
  closure_cursor *pCur = (closure_cursor *)cur;
  closureClearCursor(pCur);
  pCur->pVtab->nCursor--;
  sqlite3_free(pCur);
  return SQLITE_OK;
}

/*
** Advance a cursor to its next row of output
*/
static int closureNext(sqlite3_vtab_cursor *cur){
  closure_cursor *pCur = (closure_cursor*)cur;
  pCur->pCurrent = closureAvlNext(pCur->pCurrent);
  return SQLITE_OK;
}

/*
** Allocate and insert a node
*/
static int closureInsertNode(
  closure_queue *pQueue,  /* Add new node to this queue */
  closure_cursor *pCur,   /* The cursor into which to add the node */
  sqlite3_int64 id,       /* The node ID */
  int iGeneration         /* The generation number for this node */
){
  closure_avl *pNew = sqlite3_malloc( sizeof(*pNew) );
  if( pNew==0 ) return SQLITE_NOMEM;
  memset(pNew, 0, sizeof(*pNew));
  pNew->id = id;
  pNew->iGeneration = iGeneration;
  closureAvlInsert(&pCur->pClosure, pNew);
  queuePush(pQueue, pNew);
  return SQLITE_OK;
}

/*
** Called to "rewind" a cursor back to the beginning so that
** it starts its output over again.  Always called at least once
** prior to any closureColumn, closureRowid, or closureEof call.
**
** This routine actually computes the closure.
**
** See the comment at the beginning of closureBestIndex() for a 
** description of the meaning of idxNum.  The idxStr parameter is
** not used.
*/
static int closureFilter(
  sqlite3_vtab_cursor *pVtabCursor, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  closure_cursor *pCur = (closure_cursor *)pVtabCursor;
  closure_vtab *pVtab = pCur->pVtab;
  sqlite3_int64 iRoot;
  int mxGen = 999999999;
  char *zSql;
  sqlite3_stmt *pStmt;
  closure_avl *pAvl;
  int rc = SQLITE_OK;
  const char *zTableName = pVtab->zTableName;
  const char *zIdColumn = pVtab->zIdColumn;
  const char *zParentColumn = pVtab->zParentColumn;
  closure_queue sQueue;

  (void)idxStr;  /* Unused parameter */
  (void)argc;    /* Unused parameter */
  closureClearCursor(pCur);
  memset(&sQueue, 0, sizeof(sQueue));
  if( (idxNum & 1)==0 ){
    /* No root=$root in the WHERE clause.  Return an empty set */
    return SQLITE_OK;
  }
  iRoot = sqlite3_value_int64(argv[0]);
  if( (idxNum & 0x000f0)!=0 ){
    mxGen = sqlite3_value_int(argv[(idxNum>>4)&0x0f]);
    if( (idxNum & 0x00002)!=0 ) mxGen--;
  }
  if( (idxNum & 0x00f00)!=0 ){
    zTableName = (const char*)sqlite3_value_text(argv[(idxNum>>8)&0x0f]);
    pCur->zTableName = sqlite3_mprintf("%s", zTableName);
  }
  if( (idxNum & 0x0f000)!=0 ){
    zIdColumn = (const char*)sqlite3_value_text(argv[(idxNum>>12)&0x0f]);
    pCur->zIdColumn = sqlite3_mprintf("%s", zIdColumn);
  }
  if( (idxNum & 0x0f0000)!=0 ){
    zParentColumn = (const char*)sqlite3_value_text(argv[(idxNum>>16)&0x0f]);
    pCur->zParentColumn = sqlite3_mprintf("%s", zParentColumn);
  }

  zSql = sqlite3_mprintf(
       "SELECT \"%w\".\"%w\" FROM \"%w\" WHERE \"%w\".\"%w\"=?1",
       zTableName, zIdColumn, zTableName, zTableName, zParentColumn);
  if( zSql==0 ){
    return SQLITE_NOMEM;
  }else{
    rc = sqlite3_prepare_v2(pVtab->db, zSql, -1, &pStmt, 0);
    sqlite3_free(zSql);
    if( rc ){
      sqlite3_free(pVtab->base.zErrMsg);
      pVtab->base.zErrMsg = sqlite3_mprintf("%s", sqlite3_errmsg(pVtab->db));
      return rc;
    }
  }
  if( rc==SQLITE_OK ){
    rc = closureInsertNode(&sQueue, pCur, iRoot, 0);
  }
  while( (pAvl = queuePull(&sQueue))!=0 ){
    if( pAvl->iGeneration>=mxGen ) continue;
    sqlite3_bind_int64(pStmt, 1, pAvl->id);
    while( rc==SQLITE_OK && sqlite3_step(pStmt)==SQLITE_ROW ){
      if( sqlite3_column_type(pStmt,0)==SQLITE_INTEGER ){
        sqlite3_int64 iNew = sqlite3_column_int64(pStmt, 0);
        if( closureAvlSearch(pCur->pClosure, iNew)==0 ){
          rc = closureInsertNode(&sQueue, pCur, iNew, pAvl->iGeneration+1);
        }
      }
    }
    sqlite3_reset(pStmt);
  }
  sqlite3_finalize(pStmt);
  if( rc==SQLITE_OK ){
    pCur->pCurrent = closureAvlFirst(pCur->pClosure);
  }

  return rc;
}

/*
** Only the word and distance columns have values.  All other columns
** return NULL
*/
static int closureColumn(sqlite3_vtab_cursor *cur, sqlite3_context *ctx, int i){
  closure_cursor *pCur = (closure_cursor*)cur;
  switch( i ){
    case CLOSURE_COL_ID: {
      sqlite3_result_int64(ctx, pCur->pCurrent->id);
      break;
    }
    case CLOSURE_COL_DEPTH: {
      sqlite3_result_int(ctx, pCur->pCurrent->iGeneration);
      break;
    }
    case CLOSURE_COL_ROOT: {
      sqlite3_result_null(ctx);
      break;
    }
    case CLOSURE_COL_TABLENAME: {
      sqlite3_result_text(ctx,
         pCur->zTableName ? pCur->zTableName : pCur->pVtab->zTableName,
         -1, SQLITE_TRANSIENT);
      break;
    }
    case CLOSURE_COL_IDCOLUMN: {
      sqlite3_result_text(ctx,
         pCur->zIdColumn ? pCur->zIdColumn : pCur->pVtab->zIdColumn,
         -1, SQLITE_TRANSIENT);
      break;
    }
    case CLOSURE_COL_PARENTCOLUMN: {
      sqlite3_result_text(ctx,
         pCur->zParentColumn ? pCur->zParentColumn : pCur->pVtab->zParentColumn,
         -1, SQLITE_TRANSIENT);
      break;
    }
  }
  return SQLITE_OK;
}

/*
** The rowid.  For the closure table, this is the same as the "id" column.
*/
static int closureRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  closure_cursor *pCur = (closure_cursor*)cur;
  *pRowid = pCur->pCurrent->id;
  return SQLITE_OK;
}

/*
** EOF indicator
*/
static int closureEof(sqlite3_vtab_cursor *cur){
  closure_cursor *pCur = (closure_cursor*)cur;
  return pCur->pCurrent==0;
}

/*
** Search for terms of these forms:
**
**   (A)    root = $root
**   (B1)   depth < $depth
**   (B2)   depth <= $depth
**   (B3)   depth = $depth
**   (C)    tablename = $tablename
**   (D)    idcolumn = $idcolumn
**   (E)    parentcolumn = $parentcolumn
**
** 
**
**   idxNum       meaning
**   ----------   ------------------------------------------------------
**   0x00000001   Term of the form (A) found
**   0x00000002   The term of bit-2 is like (B1)
**   0x000000f0   Index in filter.argv[] of $depth.  0 if not used.
**   0x00000f00   Index in filter.argv[] of $tablename.  0 if not used.
**   0x0000f000   Index in filter.argv[] of $idcolumn.  0 if not used
**   0x000f0000   Index in filter.argv[] of $parentcolumn.  0 if not used.
**
** There must be a term of type (A).  If there is not, then the index type
** is 0 and the query will return an empty set.
*/
static int closureBestIndex(
  sqlite3_vtab *pTab,             /* The virtual table */
  sqlite3_index_info *pIdxInfo    /* Information about the query */
){
  int iPlan = 0;
  int i;
  int idx = 1;
  const struct sqlite3_index_constraint *pConstraint;
  closure_vtab *pVtab = (closure_vtab*)pTab;
  double rCost = 10000000.0;

  pConstraint = pIdxInfo->aConstraint;
  for(i=0; i<pIdxInfo->nConstraint; i++, pConstraint++){
    if( pConstraint->usable==0 ) continue;
    if( (iPlan & 1)==0 
     && pConstraint->iColumn==CLOSURE_COL_ROOT
     && pConstraint->op==SQLITE_INDEX_CONSTRAINT_EQ
    ){
      iPlan |= 1;
      pIdxInfo->aConstraintUsage[i].argvIndex = 1;
      pIdxInfo->aConstraintUsage[i].omit = 1;
      rCost /= 100.0;
    }
    if( (iPlan & 0x0000f0)==0
     && pConstraint->iColumn==CLOSURE_COL_DEPTH
     && (pConstraint->op==SQLITE_INDEX_CONSTRAINT_LT
           || pConstraint->op==SQLITE_INDEX_CONSTRAINT_LE
           || pConstraint->op==SQLITE_INDEX_CONSTRAINT_EQ)
    ){
      iPlan |= idx<<4;
      pIdxInfo->aConstraintUsage[i].argvIndex = ++idx;
      if( pConstraint->op==SQLITE_INDEX_CONSTRAINT_LT ) iPlan |= 0x000002;
      rCost /= 5.0;
    }
    if( (iPlan & 0x000f00)==0
     && pConstraint->iColumn==CLOSURE_COL_TABLENAME
     && pConstraint->op==SQLITE_INDEX_CONSTRAINT_EQ
    ){
      iPlan |= idx<<8;
      pIdxInfo->aConstraintUsage[i].argvIndex = ++idx;
      pIdxInfo->aConstraintUsage[i].omit = 1;
      rCost /= 5.0;
    }
    if( (iPlan & 0x00f000)==0
     && pConstraint->iColumn==CLOSURE_COL_IDCOLUMN
     && pConstraint->op==SQLITE_INDEX_CONSTRAINT_EQ
    ){
      iPlan |= idx<<12;
      pIdxInfo->aConstraintUsage[i].argvIndex = ++idx;
      pIdxInfo->aConstraintUsage[i].omit = 1;
    }
    if( (iPlan & 0x0f0000)==0
     && pConstraint->iColumn==CLOSURE_COL_PARENTCOLUMN
     && pConstraint->op==SQLITE_INDEX_CONSTRAINT_EQ
    ){
      iPlan |= idx<<16;
      pIdxInfo->aConstraintUsage[i].argvIndex = ++idx;
      pIdxInfo->aConstraintUsage[i].omit = 1;
    }
  }
  if( (pVtab->zTableName==0    && (iPlan & 0x000f00)==0)
   || (pVtab->zIdColumn==0     && (iPlan & 0x00f000)==0)
   || (pVtab->zParentColumn==0 && (iPlan & 0x0f0000)==0)
  ){
    /* All of tablename, idcolumn, and parentcolumn must be specified
    ** in either the CREATE VIRTUAL TABLE or in the WHERE clause constraints
    ** or else the result is an empty set. */
    iPlan = 0;
  }
  if( (iPlan&1)==0 ){
    /* If there is no usable "root=?" term, then set the index-type to 0.
    ** Also clear any argvIndex variables already set. This is necessary
    ** to prevent the core from throwing an "xBestIndex malfunction error"
    ** error (because the argvIndex values are not contiguously assigned
    ** starting from 1).  */
    rCost *= 1e30;
    for(i=0; i<pIdxInfo->nConstraint; i++, pConstraint++){
      pIdxInfo->aConstraintUsage[i].argvIndex = 0;
    }
    iPlan = 0;
  }
  pIdxInfo->idxNum = iPlan;
  if( pIdxInfo->nOrderBy==1
   && pIdxInfo->aOrderBy[0].iColumn==CLOSURE_COL_ID
   && pIdxInfo->aOrderBy[0].desc==0
  ){
    pIdxInfo->orderByConsumed = 1;
  }
  pIdxInfo->estimatedCost = rCost;
   
  return SQLITE_OK;
}

/*
** A virtual table module that implements the "transitive_closure".
*/
static sqlite3_module closureModule = {
  0,                      /* iVersion */
  closureConnect,         /* xCreate */
  closureConnect,         /* xConnect */
  closureBestIndex,       /* xBestIndex */
  closureDisconnect,      /* xDisconnect */
  closureDisconnect,      /* xDestroy */
  closureOpen,            /* xOpen - open a cursor */
  closureClose,           /* xClose - close a cursor */
  closureFilter,          /* xFilter - configure scan constraints */
  closureNext,            /* xNext - advance a cursor */
  closureEof,             /* xEof - check for end of scan */
  closureColumn,          /* xColumn - read data */
  closureRowid,           /* xRowid - read data */
  0,                      /* xUpdate */
  0,                      /* xBegin */
  0,                      /* xSync */
  0,                      /* xCommit */
  0,                      /* xRollback */
  0,                      /* xFindMethod */
  0,                      /* xRename */
  0,                      /* xSavepoint */
  0,                      /* xRelease */
  0,                      /* xRollbackTo */
  0                       /* xShadowName */
};

#endif /* SQLITE_OMIT_VIRTUALTABLE */

/*
** Register the closure virtual table
*/
#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_closure_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;
#ifndef SQLITE_OMIT_VIRTUALTABLE
  rc = sqlite3_create_module(db, "transitive_closure", &closureModule, 0);
#endif /* SQLITE_OMIT_VIRTUALTABLE */
  return rc;
}
