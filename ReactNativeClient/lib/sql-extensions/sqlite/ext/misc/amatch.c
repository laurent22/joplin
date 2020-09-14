/*
** 2013-03-14
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
** This file contains code for a demonstration virtual table that finds
** "approximate matches" - strings from a finite set that are nearly the
** same as a single input string.  The virtual table is called "amatch".
**
** A amatch virtual table is created like this:
**
**     CREATE VIRTUAL TABLE f USING approximate_match(
**        vocabulary_table=<tablename>,      -- V
**        vocabulary_word=<columnname>,      -- W
**        vocabulary_language=<columnname>,  -- L
**        edit_distances=<edit-cost-table>
**     );
**
** When it is created, the new amatch table must be supplied with the
** the name of a table V and columns V.W and V.L such that 
**
**     SELECT W FROM V WHERE L=$language
**
** returns the allowed vocabulary for the match.  If the "vocabulary_language"
** or L columnname is left unspecified or is an empty string, then no
** filtering of the vocabulary by language is performed. 
**
** For efficiency, it is essential that the vocabulary table be indexed:
**
**     CREATE vocab_index ON V(W)
**
** A separate edit-cost-table provides scoring information that defines 
** what it means for one string to be "close" to another.
**
** The edit-cost-table must contain exactly four columns (more precisely,
** the statement "SELECT * FROM <edit-cost-table>" must return records
** that consist of four columns). It does not matter what the columns are
** named. 
**
** Each row in the edit-cost-table represents a single character
** transformation going from user input to the vocabulary. The leftmost 
** column of the row (column 0) contains an integer identifier of the
** language to which the transformation rule belongs (see "MULTIPLE LANGUAGES"
** below). The second column of the row (column 1) contains the input
** character or characters - the characters of user input. The third 
** column contains characters as they appear in the vocabulary table.
** And the fourth column contains the integer cost of making the
** transformation. For example:
**
**    CREATE TABLE f_data(iLang, cFrom, cTo, Cost);
**    INSERT INTO f_data(iLang, cFrom, cTo, Cost) VALUES(0, '', 'a', 100);
**    INSERT INTO f_data(iLang, cFrom, cTo, Cost) VALUES(0, 'b', '', 87);
**    INSERT INTO f_data(iLang, cFrom, cTo, Cost) VALUES(0, 'o', 'oe', 38);
**    INSERT INTO f_data(iLang, cFrom, cTo, Cost) VALUES(0, 'oe', 'o', 40);
**
** The first row inserted into the edit-cost-table by the SQL script
** above indicates that the cost of having an extra 'a' in the vocabulary
** table that is missing in the user input 100.  (All costs are integers.
** Overall cost must not exceed 16777216.)  The second INSERT statement 
** creates a rule saying that the cost of having a single letter 'b' in
** user input which is missing in the vocabulary table is 87.  The third
** INSERT statement mean that the cost of matching an 'o' in user input 
** against an 'oe' in the vocabulary table is 38.  And so forth.
**
** The following rules are special:
**
**    INSERT INTO f_data(iLang, cFrom, cTo, Cost) VALUES(0, '?', '', 97);
**    INSERT INTO f_data(iLang, cFrom, cTo, Cost) VALUES(0, '', '?', 98);
**    INSERT INTO f_data(iLang, cFrom, cTo, Cost) VALUES(0, '?', '?', 99);
**
** The '?' to '' rule is the cost of having any single character in the input
** that is not found in the vocabular.  The '' to '?' rule is the cost of
** having a character in the vocabulary table that is missing from input.
** And the '?' to '?' rule is the cost of doing an arbitrary character
** substitution.  These three generic rules apply across all languages.
** In other words, the iLang field is ignored for the generic substitution
** rules.  If more than one cost is given for a generic substitution rule,
** then the lowest cost is used.
**
** Once it has been created, the amatch virtual table can be queried
** as follows:
**
**    SELECT word, distance FROM f
**     WHERE word MATCH 'abcdefg'
**       AND distance<200;
**
** This query outputs the strings contained in the T(F) field that
** are close to "abcdefg" and in order of increasing distance.  No string
** is output more than once.  If there are multiple ways to transform the
** target string ("abcdefg") into a string in the vocabulary table then
** the lowest cost transform is the one that is returned.  In this example,
** the search is limited to strings with a total distance of less than 200.
**
** For efficiency, it is important to put tight bounds on the distance.
** The time and memory space needed to perform this query is exponential
** in the maximum distance.  A good rule of thumb is to limit the distance
** to no more than 1.5 or 2 times the maximum cost of any rule in the
** edit-cost-table.
**
** The amatch is a read-only table.  Any attempt to DELETE, INSERT, or
** UPDATE on a amatch table will throw an error.
**
** It is important to put some kind of a limit on the amatch output.  This
** can be either in the form of a LIMIT clause at the end of the query,
** or better, a "distance<NNN" constraint where NNN is some number.  The
** running time and memory requirement is exponential in the value of NNN 
** so you want to make sure that NNN is not too big.  A value of NNN that
** is about twice the average transformation cost seems to give good results.
**
** The amatch table can be useful for tasks such as spelling correction.
** Suppose all allowed words are in table vocabulary(w).  Then one would create
** an amatch virtual table like this:
**
**   CREATE VIRTUAL TABLE ex1 USING amatch(
**       vocabtable=vocabulary,
**       vocabcolumn=w,
**       edit_distances=ec1
**   );
**
** Then given an input word $word, look up close spellings this way:
**
**   SELECT word, distance FROM ex1
**    WHERE word MATCH $word AND distance<200;
**
** MULTIPLE LANGUAGES
**
** Normally, the "iLang" value associated with all character transformations
** in the edit-cost-table is zero. However, if required, the amatch 
** virtual table allows multiple languages to be defined. Each query uses 
** only a single iLang value.   This allows, for example, a single 
** amatch table to support multiple languages.
**
** By default, only the rules with iLang=0 are used. To specify an 
** alternative language, a "language = ?" expression must be added to the
** WHERE clause of a SELECT, where ? is the integer identifier of the desired 
** language. For example:
**
**   SELECT word, distance FROM ex1
**    WHERE word MATCH $word
**      AND distance<=200
**      AND language=1 -- Specify use language 1 instead of 0
**
** If no "language = ?" constraint is specified in the WHERE clause, language
** 0 is used.
**
** LIMITS
**
** The maximum language number is 2147483647.  The maximum length of either
** of the strings in the second or third column of the amatch data table
** is 50 bytes.  The maximum cost on a rule is 1000.
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
typedef struct amatch_vtab amatch_vtab;
typedef struct amatch_cursor amatch_cursor;
typedef struct amatch_rule amatch_rule;
typedef struct amatch_word amatch_word;
typedef struct amatch_avl amatch_avl;


/*****************************************************************************
** AVL Tree implementation
*/
/*
** Objects that want to be members of the AVL tree should embedded an
** instance of this structure.
*/
struct amatch_avl {
  amatch_word *pWord;   /* Points to the object being stored in the tree */
  char *zKey;           /* Key.  zero-terminated string.  Must be unique */
  amatch_avl *pBefore;  /* Other elements less than zKey */
  amatch_avl *pAfter;   /* Other elements greater than zKey */
  amatch_avl *pUp;      /* Parent element */
  short int height;     /* Height of this node.  Leaf==1 */
  short int imbalance;  /* Height difference between pBefore and pAfter */
};

/* Recompute the amatch_avl.height and amatch_avl.imbalance fields for p.
** Assume that the children of p have correct heights.
*/
static void amatchAvlRecomputeHeight(amatch_avl *p){
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
static amatch_avl *amatchAvlRotateBefore(amatch_avl *pP){
  amatch_avl *pB = pP->pBefore;
  amatch_avl *pY = pB->pAfter;
  pB->pUp = pP->pUp;
  pB->pAfter = pP;
  pP->pUp = pB;
  pP->pBefore = pY;
  if( pY ) pY->pUp = pP;
  amatchAvlRecomputeHeight(pP);
  amatchAvlRecomputeHeight(pB);
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
static amatch_avl *amatchAvlRotateAfter(amatch_avl *pP){
  amatch_avl *pA = pP->pAfter;
  amatch_avl *pY = pA->pBefore;
  pA->pUp = pP->pUp;
  pA->pBefore = pP;
  pP->pUp = pA;
  pP->pAfter = pY;
  if( pY ) pY->pUp = pP;
  amatchAvlRecomputeHeight(pP);
  amatchAvlRecomputeHeight(pA);
  return pA;
}

/*
** Return a pointer to the pBefore or pAfter pointer in the parent
** of p that points to p.  Or if p is the root node, return pp.
*/
static amatch_avl **amatchAvlFromPtr(amatch_avl *p, amatch_avl **pp){
  amatch_avl *pUp = p->pUp;
  if( pUp==0 ) return pp;
  if( pUp->pAfter==p ) return &pUp->pAfter;
  return &pUp->pBefore;
}

/*
** Rebalance all nodes starting with p and working up to the root.
** Return the new root.
*/
static amatch_avl *amatchAvlBalance(amatch_avl *p){
  amatch_avl *pTop = p;
  amatch_avl **pp;
  while( p ){
    amatchAvlRecomputeHeight(p);
    if( p->imbalance>=2 ){
      amatch_avl *pB = p->pBefore;
      if( pB->imbalance<0 ) p->pBefore = amatchAvlRotateAfter(pB);
      pp = amatchAvlFromPtr(p,&p);
      p = *pp = amatchAvlRotateBefore(p);
    }else if( p->imbalance<=(-2) ){
      amatch_avl *pA = p->pAfter;
      if( pA->imbalance>0 ) p->pAfter = amatchAvlRotateBefore(pA);
      pp = amatchAvlFromPtr(p,&p);
      p = *pp = amatchAvlRotateAfter(p);
    }
    pTop = p;
    p = p->pUp;
  }
  return pTop;
}

/* Search the tree rooted at p for an entry with zKey.  Return a pointer
** to the entry or return NULL.
*/
static amatch_avl *amatchAvlSearch(amatch_avl *p, const char *zKey){
  int c;
  while( p && (c = strcmp(zKey, p->zKey))!=0 ){
    p = (c<0) ? p->pBefore : p->pAfter;
  }
  return p;
}

/* Find the first node (the one with the smallest key).
*/
static amatch_avl *amatchAvlFirst(amatch_avl *p){
  if( p ) while( p->pBefore ) p = p->pBefore;
  return p;
}

#if 0 /* NOT USED */
/* Return the node with the next larger key after p.
*/
static amatch_avl *amatchAvlNext(amatch_avl *p){
  amatch_avl *pPrev = 0;
  while( p && p->pAfter==pPrev ){
    pPrev = p;
    p = p->pUp;
  }
  if( p && pPrev==0 ){
    p = amatchAvlFirst(p->pAfter);
  }
  return p;
}
#endif

#if 0 /* NOT USED */
/* Verify AVL tree integrity
*/
static int amatchAvlIntegrity(amatch_avl *pHead){
  amatch_avl *p;
  if( pHead==0 ) return 1;
  if( (p = pHead->pBefore)!=0 ){
    assert( p->pUp==pHead );
    assert( amatchAvlIntegrity(p) );
    assert( strcmp(p->zKey, pHead->zKey)<0 );
    while( p->pAfter ) p = p->pAfter;
    assert( strcmp(p->zKey, pHead->zKey)<0 );
  }
  if( (p = pHead->pAfter)!=0 ){
    assert( p->pUp==pHead );
    assert( amatchAvlIntegrity(p) );
    assert( strcmp(p->zKey, pHead->zKey)>0 );
    p = amatchAvlFirst(p);
    assert( strcmp(p->zKey, pHead->zKey)>0 );
  }
  return 1;
}
static int amatchAvlIntegrity2(amatch_avl *pHead){
  amatch_avl *p, *pNext;
  for(p=amatchAvlFirst(pHead); p; p=pNext){
    pNext = amatchAvlNext(p);
    if( pNext==0 ) break;
    assert( strcmp(p->zKey, pNext->zKey)<0 );
  }
  return 1;
}
#endif

/* Insert a new node pNew.  Return NULL on success.  If the key is not
** unique, then do not perform the insert but instead leave pNew unchanged
** and return a pointer to an existing node with the same key.
*/
static amatch_avl *amatchAvlInsert(amatch_avl **ppHead, amatch_avl *pNew){
  int c;
  amatch_avl *p = *ppHead;
  if( p==0 ){
    p = pNew;
    pNew->pUp = 0;
  }else{
    while( p ){
      c = strcmp(pNew->zKey, p->zKey);
      if( c<0 ){
        if( p->pBefore ){
          p = p->pBefore;
        }else{
          p->pBefore = pNew;
          pNew->pUp = p;
          break;
        }
      }else if( c>0 ){
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
  *ppHead = amatchAvlBalance(p);
  /* assert( amatchAvlIntegrity(*ppHead) ); */
  /* assert( amatchAvlIntegrity2(*ppHead) ); */
  return 0;
}

/* Remove node pOld from the tree.  pOld must be an element of the tree or
** the AVL tree will become corrupt.
*/
static void amatchAvlRemove(amatch_avl **ppHead, amatch_avl *pOld){
  amatch_avl **ppParent;
  amatch_avl *pBalance = 0;
  /* assert( amatchAvlSearch(*ppHead, pOld->zKey)==pOld ); */
  ppParent = amatchAvlFromPtr(pOld, ppHead);
  if( pOld->pBefore==0 && pOld->pAfter==0 ){
    *ppParent = 0;
    pBalance = pOld->pUp;
  }else if( pOld->pBefore && pOld->pAfter ){
    amatch_avl *pX, *pY;
    pX = amatchAvlFirst(pOld->pAfter);
    *amatchAvlFromPtr(pX, 0) = pX->pAfter;
    if( pX->pAfter ) pX->pAfter->pUp = pX->pUp;
    pBalance = pX->pUp;
    pX->pAfter = pOld->pAfter;
    if( pX->pAfter ){
      pX->pAfter->pUp = pX;
    }else{
      assert( pBalance==pOld );
      pBalance = pX;
    }
    pX->pBefore = pY = pOld->pBefore;
    if( pY ) pY->pUp = pX;
    pX->pUp = pOld->pUp;
    *ppParent = pX;
  }else if( pOld->pBefore==0 ){
    *ppParent = pBalance = pOld->pAfter;
    pBalance->pUp = pOld->pUp;
  }else if( pOld->pAfter==0 ){
    *ppParent = pBalance = pOld->pBefore;
    pBalance->pUp = pOld->pUp;
  }
  *ppHead = amatchAvlBalance(pBalance);
  pOld->pUp = 0;
  pOld->pBefore = 0;
  pOld->pAfter = 0;
  /* assert( amatchAvlIntegrity(*ppHead) ); */
  /* assert( amatchAvlIntegrity2(*ppHead) ); */
}
/*
** End of the AVL Tree implementation
******************************************************************************/


/*
** Various types.
**
** amatch_cost is the "cost" of an edit operation.
**
** amatch_len is the length of a matching string.  
**
** amatch_langid is an ruleset identifier.
*/
typedef int amatch_cost;
typedef signed char amatch_len;
typedef int amatch_langid;

/*
** Limits
*/
#define AMATCH_MX_LENGTH          50  /* Maximum length of a rule string */
#define AMATCH_MX_LANGID  2147483647  /* Maximum rule ID */
#define AMATCH_MX_COST          1000  /* Maximum single-rule cost */

/*
** A match or partial match
*/
struct amatch_word {
  amatch_word *pNext;   /* Next on a list of all amatch_words */
  amatch_avl sCost;     /* Linkage of this node into the cost tree */
  amatch_avl sWord;     /* Linkage of this node into the word tree */
  amatch_cost rCost;    /* Cost of the match so far */
  int iSeq;             /* Sequence number */
  char zCost[10];       /* Cost key (text rendering of rCost) */
  short int nMatch;     /* Input characters matched */
  char zWord[4];        /* Text of the word.  Extra space appended as needed */
};

/*
** Each transformation rule is stored as an instance of this object.
** All rules are kept on a linked list sorted by rCost.
*/
struct amatch_rule {
  amatch_rule *pNext;      /* Next rule in order of increasing rCost */
  char *zFrom;             /* Transform from (a string from user input) */
  amatch_cost rCost;       /* Cost of this transformation */
  amatch_langid iLang;     /* The langauge to which this rule belongs */
  amatch_len nFrom, nTo;   /* Length of the zFrom and zTo strings */
  char zTo[4];             /* Tranform to V.W value (extra space appended) */
};

/* 
** A amatch virtual-table object 
*/
struct amatch_vtab {
  sqlite3_vtab base;         /* Base class - must be first */
  char *zClassName;          /* Name of this class.  Default: "amatch" */
  char *zDb;                 /* Name of database.  (ex: "main") */
  char *zSelf;               /* Name of this virtual table */
  char *zCostTab;            /* Name of edit-cost-table */
  char *zVocabTab;           /* Name of vocabulary table */
  char *zVocabWord;          /* Name of vocabulary table word column */
  char *zVocabLang;          /* Name of vocabulary table language column */
  amatch_rule *pRule;        /* All active rules in this amatch */
  amatch_cost rIns;          /* Generic insertion cost  '' -> ? */
  amatch_cost rDel;          /* Generic deletion cost  ? -> '' */
  amatch_cost rSub;          /* Generic substitution cost ? -> ? */
  sqlite3 *db;               /* The database connection */
  sqlite3_stmt *pVCheck;     /* Query to check zVocabTab */
  int nCursor;               /* Number of active cursors */
};

/* A amatch cursor object */
struct amatch_cursor {
  sqlite3_vtab_cursor base;  /* Base class - must be first */
  sqlite3_int64 iRowid;      /* The rowid of the current word */
  amatch_langid iLang;       /* Use this language ID */
  amatch_cost rLimit;        /* Maximum cost of any term */
  int nBuf;                  /* Space allocated for zBuf */
  int oomErr;                /* True following an OOM error */
  int nWord;                 /* Number of amatch_word objects */
  char *zBuf;                /* Temp-use buffer space */
  char *zInput;              /* Input word to match against */
  amatch_vtab *pVtab;        /* The virtual table this cursor belongs to */
  amatch_word *pAllWords;    /* List of all amatch_word objects */
  amatch_word *pCurrent;     /* Most recent solution */
  amatch_avl *pCost;         /* amatch_word objects keyed by iCost */
  amatch_avl *pWord;         /* amatch_word objects keyed by zWord */
};

/*
** The two input rule lists are both sorted in order of increasing
** cost.  Merge them together into a single list, sorted by cost, and
** return a pointer to the head of that list.
*/
static amatch_rule *amatchMergeRules(amatch_rule *pA, amatch_rule *pB){
  amatch_rule head;
  amatch_rule *pTail;

  pTail =  &head;
  while( pA && pB ){
    if( pA->rCost<=pB->rCost ){
      pTail->pNext = pA;
      pTail = pA;
      pA = pA->pNext;
    }else{
      pTail->pNext = pB;
      pTail = pB;
      pB = pB->pNext;
    }
  }
  if( pA==0 ){
    pTail->pNext = pB;
  }else{
    pTail->pNext = pA;
  }
  return head.pNext;
}

/*
** Statement pStmt currently points to a row in the amatch data table. This
** function allocates and populates a amatch_rule structure according to
** the content of the row.
**
** If successful, *ppRule is set to point to the new object and SQLITE_OK
** is returned. Otherwise, *ppRule is zeroed, *pzErr may be set to point
** to an error message and an SQLite error code returned.
*/
static int amatchLoadOneRule(
  amatch_vtab *p,                 /* Fuzzer virtual table handle */
  sqlite3_stmt *pStmt,            /* Base rule on statements current row */
  amatch_rule **ppRule,           /* OUT: New rule object */
  char **pzErr                    /* OUT: Error message */
){
  sqlite3_int64 iLang = sqlite3_column_int64(pStmt, 0);
  const char *zFrom = (const char *)sqlite3_column_text(pStmt, 1);
  const char *zTo = (const char *)sqlite3_column_text(pStmt, 2);
  amatch_cost rCost = sqlite3_column_int(pStmt, 3);

  int rc = SQLITE_OK;             /* Return code */
  int nFrom;                      /* Size of string zFrom, in bytes */
  int nTo;                        /* Size of string zTo, in bytes */
  amatch_rule *pRule = 0;         /* New rule object to return */

  if( zFrom==0 ) zFrom = "";
  if( zTo==0 ) zTo = "";
  nFrom = (int)strlen(zFrom);
  nTo = (int)strlen(zTo);

  /* Silently ignore null transformations */
  if( strcmp(zFrom, zTo)==0 ){
    if( zFrom[0]=='?' && zFrom[1]==0 ){
      if( p->rSub==0 || p->rSub>rCost ) p->rSub = rCost;
    }
    *ppRule = 0;
    return SQLITE_OK;
  }

  if( rCost<=0 || rCost>AMATCH_MX_COST ){
    *pzErr = sqlite3_mprintf("%s: cost must be between 1 and %d", 
        p->zClassName, AMATCH_MX_COST
    );
    rc = SQLITE_ERROR;
  }else
  if( nFrom>AMATCH_MX_LENGTH || nTo>AMATCH_MX_LENGTH ){
    *pzErr = sqlite3_mprintf("%s: maximum string length is %d", 
        p->zClassName, AMATCH_MX_LENGTH
    );
    rc = SQLITE_ERROR;    
  }else
  if( iLang<0 || iLang>AMATCH_MX_LANGID ){
    *pzErr = sqlite3_mprintf("%s: iLang must be between 0 and %d", 
        p->zClassName, AMATCH_MX_LANGID
    );
    rc = SQLITE_ERROR;    
  }else
  if( strcmp(zFrom,"")==0 && strcmp(zTo,"?")==0 ){
    if( p->rIns==0 || p->rIns>rCost ) p->rIns = rCost;
  }else
  if( strcmp(zFrom,"?")==0 && strcmp(zTo,"")==0 ){
    if( p->rDel==0 || p->rDel>rCost ) p->rDel = rCost;
  }else
  {
    pRule = sqlite3_malloc64( sizeof(*pRule) + nFrom + nTo );
    if( pRule==0 ){
      rc = SQLITE_NOMEM;
    }else{
      memset(pRule, 0, sizeof(*pRule));
      pRule->zFrom = &pRule->zTo[nTo+1];
      pRule->nFrom = (amatch_len)nFrom;
      memcpy(pRule->zFrom, zFrom, nFrom+1);
      memcpy(pRule->zTo, zTo, nTo+1);
      pRule->nTo = (amatch_len)nTo;
      pRule->rCost = rCost;
      pRule->iLang = (int)iLang;
    }
  }

  *ppRule = pRule;
  return rc;
}

/*
** Free all the content in the edit-cost-table
*/
static void amatchFreeRules(amatch_vtab *p){
  while( p->pRule ){
    amatch_rule *pRule = p->pRule;
    p->pRule = pRule->pNext;
    sqlite3_free(pRule);
  }
  p->pRule = 0;
}

/*
** Load the content of the amatch data table into memory.
*/
static int amatchLoadRules(
  sqlite3 *db,                    /* Database handle */
  amatch_vtab *p,                 /* Virtual amatch table to configure */
  char **pzErr                    /* OUT: Error message */
){
  int rc = SQLITE_OK;             /* Return code */
  char *zSql;                     /* SELECT used to read from rules table */
  amatch_rule *pHead = 0;

  zSql = sqlite3_mprintf("SELECT * FROM %Q.%Q", p->zDb, p->zCostTab);
  if( zSql==0 ){
    rc = SQLITE_NOMEM;
  }else{
    int rc2;                      /* finalize() return code */
    sqlite3_stmt *pStmt = 0;
    rc = sqlite3_prepare_v2(db, zSql, -1, &pStmt, 0);
    if( rc!=SQLITE_OK ){
      *pzErr = sqlite3_mprintf("%s: %s", p->zClassName, sqlite3_errmsg(db));
    }else if( sqlite3_column_count(pStmt)!=4 ){
      *pzErr = sqlite3_mprintf("%s: %s has %d columns, expected 4",
          p->zClassName, p->zCostTab, sqlite3_column_count(pStmt)
      );
      rc = SQLITE_ERROR;
    }else{
      while( rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pStmt) ){
        amatch_rule *pRule = 0;
        rc = amatchLoadOneRule(p, pStmt, &pRule, pzErr);
        if( pRule ){
          pRule->pNext = pHead;
          pHead = pRule;
        }
      }
    }
    rc2 = sqlite3_finalize(pStmt);
    if( rc==SQLITE_OK ) rc = rc2;
  }
  sqlite3_free(zSql);

  /* All rules are now in a singly linked list starting at pHead. This
  ** block sorts them by cost and then sets amatch_vtab.pRule to point to 
  ** point to the head of the sorted list.
  */
  if( rc==SQLITE_OK ){
    unsigned int i;
    amatch_rule *pX;
    amatch_rule *a[15];
    for(i=0; i<sizeof(a)/sizeof(a[0]); i++) a[i] = 0;
    while( (pX = pHead)!=0 ){
      pHead = pX->pNext;
      pX->pNext = 0;
      for(i=0; a[i] && i<sizeof(a)/sizeof(a[0])-1; i++){
        pX = amatchMergeRules(a[i], pX);
        a[i] = 0;
      }
      a[i] = amatchMergeRules(a[i], pX);
    }
    for(pX=a[0], i=1; i<sizeof(a)/sizeof(a[0]); i++){
      pX = amatchMergeRules(a[i], pX);
    }
    p->pRule = amatchMergeRules(p->pRule, pX);
  }else{
    /* An error has occurred. Setting p->pRule to point to the head of the
    ** allocated list ensures that the list will be cleaned up in this case.
    */
    assert( p->pRule==0 );
    p->pRule = pHead;
  }

  return rc;
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
static char *amatchDequote(const char *zIn){
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
** Deallocate the pVCheck prepared statement.
*/
static void amatchVCheckClear(amatch_vtab *p){
  if( p->pVCheck ){
    sqlite3_finalize(p->pVCheck);
    p->pVCheck = 0;
  }
}

/*
** Deallocate an amatch_vtab object
*/
static void amatchFree(amatch_vtab *p){
  if( p ){
    amatchFreeRules(p);
    amatchVCheckClear(p);
    sqlite3_free(p->zClassName);
    sqlite3_free(p->zDb);
    sqlite3_free(p->zCostTab);
    sqlite3_free(p->zVocabTab);
    sqlite3_free(p->zVocabWord);
    sqlite3_free(p->zVocabLang);
    sqlite3_free(p->zSelf);
    memset(p, 0, sizeof(*p));
    sqlite3_free(p);
  }
}

/*
** xDisconnect/xDestroy method for the amatch module.
*/
static int amatchDisconnect(sqlite3_vtab *pVtab){
  amatch_vtab *p = (amatch_vtab*)pVtab;
  assert( p->nCursor==0 );
  amatchFree(p);
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
static const char *amatchValueOfKey(const char *zKey, const char *zStr){
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
** xConnect/xCreate method for the amatch module. Arguments are:
**
**   argv[0]    -> module name  ("approximate_match")
**   argv[1]    -> database name
**   argv[2]    -> table name
**   argv[3...] -> arguments
*/
static int amatchConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  int rc = SQLITE_OK;             /* Return code */
  amatch_vtab *pNew = 0;          /* New virtual table */
  const char *zModule = argv[0];
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
  pNew->zClassName = sqlite3_mprintf("%s", zModule);
  if( pNew->zClassName==0 ) goto amatchConnectError;
  pNew->zDb = sqlite3_mprintf("%s", zDb);
  if( pNew->zDb==0 ) goto amatchConnectError;
  pNew->zSelf = sqlite3_mprintf("%s", argv[2]);
  if( pNew->zSelf==0 ) goto amatchConnectError;
  for(i=3; i<argc; i++){
    zVal = amatchValueOfKey("vocabulary_table", argv[i]);
    if( zVal ){
      sqlite3_free(pNew->zVocabTab);
      pNew->zVocabTab = amatchDequote(zVal);
      if( pNew->zVocabTab==0 ) goto amatchConnectError;
      continue;
    }
    zVal = amatchValueOfKey("vocabulary_word", argv[i]);
    if( zVal ){
      sqlite3_free(pNew->zVocabWord);
      pNew->zVocabWord = amatchDequote(zVal);
      if( pNew->zVocabWord==0 ) goto amatchConnectError;
      continue;
    }
    zVal = amatchValueOfKey("vocabulary_language", argv[i]);
    if( zVal ){
      sqlite3_free(pNew->zVocabLang);
      pNew->zVocabLang = amatchDequote(zVal);
      if( pNew->zVocabLang==0 ) goto amatchConnectError;
      continue;
    }
    zVal = amatchValueOfKey("edit_distances", argv[i]);
    if( zVal ){
      sqlite3_free(pNew->zCostTab);
      pNew->zCostTab = amatchDequote(zVal);
      if( pNew->zCostTab==0 ) goto amatchConnectError;
      continue;
    }
    *pzErr = sqlite3_mprintf("unrecognized argument: [%s]\n", argv[i]);
    amatchFree(pNew);
    *ppVtab = 0;
    return SQLITE_ERROR;
  }
  rc = SQLITE_OK;
  if( pNew->zCostTab==0 ){
    *pzErr = sqlite3_mprintf("no edit_distances table specified");
    rc = SQLITE_ERROR;
  }else{
    rc = amatchLoadRules(db, pNew, pzErr);
  }
  if( rc==SQLITE_OK ){
    sqlite3_vtab_config(db, SQLITE_VTAB_INNOCUOUS);
    rc = sqlite3_declare_vtab(db,
           "CREATE TABLE x(word,distance,language,"
           "command HIDDEN,nword HIDDEN)"
         );
#define AMATCH_COL_WORD       0
#define AMATCH_COL_DISTANCE   1
#define AMATCH_COL_LANGUAGE   2
#define AMATCH_COL_COMMAND    3
#define AMATCH_COL_NWORD      4
  }
  if( rc!=SQLITE_OK ){
    amatchFree(pNew);
  }
  *ppVtab = &pNew->base;
  return rc;

amatchConnectError:
  amatchFree(pNew);
  return rc;
}

/*
** Open a new amatch cursor.
*/
static int amatchOpen(sqlite3_vtab *pVTab, sqlite3_vtab_cursor **ppCursor){
  amatch_vtab *p = (amatch_vtab*)pVTab;
  amatch_cursor *pCur;
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
static void amatchClearCursor(amatch_cursor *pCur){
  amatch_word *pWord, *pNextWord;
  for(pWord=pCur->pAllWords; pWord; pWord=pNextWord){
    pNextWord = pWord->pNext;
    sqlite3_free(pWord);
  }
  pCur->pAllWords = 0;
  sqlite3_free(pCur->zInput);
  pCur->zInput = 0;
  sqlite3_free(pCur->zBuf);
  pCur->zBuf = 0;
  pCur->nBuf = 0;
  pCur->pCost = 0;
  pCur->pWord = 0;
  pCur->pCurrent = 0;
  pCur->rLimit = 1000000;
  pCur->iLang = 0;
  pCur->nWord = 0;
}

/*
** Close a amatch cursor.
*/
static int amatchClose(sqlite3_vtab_cursor *cur){
  amatch_cursor *pCur = (amatch_cursor *)cur;
  amatchClearCursor(pCur);
  pCur->pVtab->nCursor--;
  sqlite3_free(pCur);
  return SQLITE_OK;
}

/*
** Render a 24-bit unsigned integer as a 4-byte base-64 number.
*/
static void amatchEncodeInt(int x, char *z){
  static const char a[] = 
    "0123456789"
    "ABCDEFGHIJ"
    "KLMNOPQRST"
    "UVWXYZ^abc"
    "defghijklm"
    "nopqrstuvw"
    "xyz~";
  z[0] = a[(x>>18)&0x3f];
  z[1] = a[(x>>12)&0x3f];
  z[2] = a[(x>>6)&0x3f];
  z[3] = a[x&0x3f];
}

/*
** Write the zCost[] field for a amatch_word object
*/
static void amatchWriteCost(amatch_word *pWord){
  amatchEncodeInt(pWord->rCost, pWord->zCost);
  amatchEncodeInt(pWord->iSeq, pWord->zCost+4);
  pWord->zCost[8] = 0;
}

/* Circumvent compiler warnings about the use of strcpy() by supplying
** our own implementation.
*/
static void amatchStrcpy(char *dest, const char *src){
  while( (*(dest++) = *(src++))!=0 ){}
}
static void amatchStrcat(char *dest, const char *src){
  while( *dest ) dest++;
  amatchStrcpy(dest, src);
}

/*
** Add a new amatch_word object to the queue.
**
** If a prior amatch_word object with the same zWord, and nMatch
** already exists, update its rCost (if the new rCost is less) but
** otherwise leave it unchanged.  Do not add a duplicate.
**
** Do nothing if the cost exceeds threshold.
*/
static void amatchAddWord(
  amatch_cursor *pCur,
  amatch_cost rCost,
  int nMatch,
  const char *zWordBase,
  const char *zWordTail
){
  amatch_word *pWord;
  amatch_avl *pNode;
  amatch_avl *pOther;
  int nBase, nTail;
  char zBuf[4];
  
  if( rCost>pCur->rLimit ){
    return;
  }
  nBase = (int)strlen(zWordBase);
  nTail = (int)strlen(zWordTail);
  if( nBase+nTail+3>pCur->nBuf ){
    pCur->nBuf = nBase+nTail+100;
    pCur->zBuf = sqlite3_realloc(pCur->zBuf, pCur->nBuf);
    if( pCur->zBuf==0 ){
      pCur->nBuf = 0;
      return;
    }
  }
  amatchEncodeInt(nMatch, zBuf);
  memcpy(pCur->zBuf, zBuf+2, 2);
  memcpy(pCur->zBuf+2, zWordBase, nBase);
  memcpy(pCur->zBuf+2+nBase, zWordTail, nTail+1);
  pNode = amatchAvlSearch(pCur->pWord, pCur->zBuf);
  if( pNode ){
    pWord = pNode->pWord;
    if( pWord->rCost>rCost ){
#ifdef AMATCH_TRACE_1
      printf("UPDATE [%s][%.*s^%s] %d (\"%s\" \"%s\")\n",
             pWord->zWord+2, pWord->nMatch, pCur->zInput, pCur->zInput,
             pWord->rCost, pWord->zWord, pWord->zCost);
#endif
      amatchAvlRemove(&pCur->pCost, &pWord->sCost);
      pWord->rCost = rCost;
      amatchWriteCost(pWord);
#ifdef AMATCH_TRACE_1
      printf("  ---> %d (\"%s\" \"%s\")\n",
             pWord->rCost, pWord->zWord, pWord->zCost);
#endif
      pOther = amatchAvlInsert(&pCur->pCost, &pWord->sCost);
      assert( pOther==0 ); (void)pOther;
    }
    return;
  }
  pWord = sqlite3_malloc64( sizeof(*pWord) + nBase + nTail - 1 );
  if( pWord==0 ) return;
  memset(pWord, 0, sizeof(*pWord));
  pWord->rCost = rCost;
  pWord->iSeq = pCur->nWord++;
  amatchWriteCost(pWord);
  pWord->nMatch = (short)nMatch;
  pWord->pNext = pCur->pAllWords;
  pCur->pAllWords = pWord;
  pWord->sCost.zKey = pWord->zCost;
  pWord->sCost.pWord = pWord;
  pOther = amatchAvlInsert(&pCur->pCost, &pWord->sCost);
  assert( pOther==0 ); (void)pOther;
  pWord->sWord.zKey = pWord->zWord;
  pWord->sWord.pWord = pWord;
  amatchStrcpy(pWord->zWord, pCur->zBuf);
  pOther = amatchAvlInsert(&pCur->pWord, &pWord->sWord);
  assert( pOther==0 ); (void)pOther;
#ifdef AMATCH_TRACE_1
  printf("INSERT [%s][%.*s^%s] %d (\"%s\" \"%s\")\n", pWord->zWord+2,
       pWord->nMatch, pCur->zInput, pCur->zInput+pWord->nMatch, rCost,
       pWord->zWord, pWord->zCost);
#endif
}


/*
** Advance a cursor to its next row of output
*/
static int amatchNext(sqlite3_vtab_cursor *cur){
  amatch_cursor *pCur = (amatch_cursor*)cur;
  amatch_word *pWord = 0;
  amatch_avl *pNode;
  int isMatch = 0;
  amatch_vtab *p = pCur->pVtab;
  int nWord;
  int rc;
  int i;
  const char *zW;
  amatch_rule *pRule;
  char *zBuf = 0;
  char nBuf = 0;
  char zNext[8];
  char zNextIn[8];
  int nNextIn;

  if( p->pVCheck==0 ){
    char *zSql;
    if( p->zVocabLang && p->zVocabLang[0] ){
      zSql = sqlite3_mprintf(
          "SELECT \"%w\" FROM \"%w\"",
          " WHERE \"%w\">=?1 AND \"%w\"=?2"
          " ORDER BY 1",
          p->zVocabWord, p->zVocabTab,
          p->zVocabWord, p->zVocabLang
      );
    }else{
      zSql = sqlite3_mprintf(
          "SELECT \"%w\" FROM \"%w\""
          " WHERE \"%w\">=?1"
          " ORDER BY 1",
          p->zVocabWord, p->zVocabTab,
          p->zVocabWord
      );
    }
    rc = sqlite3_prepare_v2(p->db, zSql, -1, &p->pVCheck, 0);
    sqlite3_free(zSql);
    if( rc ) return rc;
  }
  sqlite3_bind_int(p->pVCheck, 2, pCur->iLang);

  do{
    pNode = amatchAvlFirst(pCur->pCost);
    if( pNode==0 ){
      pWord = 0;
      break;
    }
    pWord = pNode->pWord;
    amatchAvlRemove(&pCur->pCost, &pWord->sCost);

#ifdef AMATCH_TRACE_1
    printf("PROCESS [%s][%.*s^%s] %d (\"%s\" \"%s\")\n",
       pWord->zWord+2, pWord->nMatch, pCur->zInput, pCur->zInput+pWord->nMatch,
       pWord->rCost, pWord->zWord, pWord->zCost);
#endif
    nWord = (int)strlen(pWord->zWord+2);
    if( nWord+20>nBuf ){
      nBuf = (char)(nWord+100);
      zBuf = sqlite3_realloc(zBuf, nBuf);
      if( zBuf==0 ) return SQLITE_NOMEM;
    }
    amatchStrcpy(zBuf, pWord->zWord+2);
    zNext[0] = 0;
    zNextIn[0] = pCur->zInput[pWord->nMatch];
    if( zNextIn[0] ){
      for(i=1; i<=4 && (pCur->zInput[pWord->nMatch+i]&0xc0)==0x80; i++){
        zNextIn[i] = pCur->zInput[pWord->nMatch+i];
      }
      zNextIn[i] = 0;
      nNextIn = i;
    }else{
      nNextIn = 0;
    }

    if( zNextIn[0] && zNextIn[0]!='*' ){
      sqlite3_reset(p->pVCheck);
      amatchStrcat(zBuf, zNextIn);
      sqlite3_bind_text(p->pVCheck, 1, zBuf, nWord+nNextIn, SQLITE_STATIC);
      rc = sqlite3_step(p->pVCheck);
      if( rc==SQLITE_ROW ){
        zW = (const char*)sqlite3_column_text(p->pVCheck, 0);
        if( strncmp(zBuf, zW, nWord+nNextIn)==0 ){
          amatchAddWord(pCur, pWord->rCost, pWord->nMatch+nNextIn, zBuf, "");
        }
      }
      zBuf[nWord] = 0;
    }

    while( 1 ){
      amatchStrcpy(zBuf+nWord, zNext);
      sqlite3_reset(p->pVCheck);
      sqlite3_bind_text(p->pVCheck, 1, zBuf, -1, SQLITE_TRANSIENT);
      rc = sqlite3_step(p->pVCheck);
      if( rc!=SQLITE_ROW ) break;
      zW = (const char*)sqlite3_column_text(p->pVCheck, 0);
      amatchStrcpy(zBuf+nWord, zNext);
      if( strncmp(zW, zBuf, nWord)!=0 ) break;
      if( (zNextIn[0]=='*' && zNextIn[1]==0)
       || (zNextIn[0]==0 && zW[nWord]==0)
      ){
        isMatch = 1;
        zNextIn[0] = 0;
        nNextIn = 0;
        break;
      }
      zNext[0] = zW[nWord];
      for(i=1; i<=4 && (zW[nWord+i]&0xc0)==0x80; i++){
        zNext[i] = zW[nWord+i];
      }
      zNext[i] = 0;
      zBuf[nWord] = 0;
      if( p->rIns>0 ){
        amatchAddWord(pCur, pWord->rCost+p->rIns, pWord->nMatch, 
                      zBuf, zNext);
      }
      if( p->rSub>0 ){
        amatchAddWord(pCur, pWord->rCost+p->rSub, pWord->nMatch+nNextIn, 
                      zBuf, zNext);
      }
      if( p->rIns<0 && p->rSub<0 ) break;
      zNext[i-1]++;  /* FIX ME */
    }
    sqlite3_reset(p->pVCheck);

    if( p->rDel>0 ){
      zBuf[nWord] = 0;
      amatchAddWord(pCur, pWord->rCost+p->rDel, pWord->nMatch+nNextIn,
                    zBuf, "");
    }

    for(pRule=p->pRule; pRule; pRule=pRule->pNext){
      if( pRule->iLang!=pCur->iLang ) continue;
      if( strncmp(pRule->zFrom, pCur->zInput+pWord->nMatch, pRule->nFrom)==0 ){
        amatchAddWord(pCur, pWord->rCost+pRule->rCost,
                      pWord->nMatch+pRule->nFrom, pWord->zWord+2, pRule->zTo);
      }
    }
  }while( !isMatch );
  pCur->pCurrent = pWord;
  sqlite3_free(zBuf);
  return SQLITE_OK;
}

/*
** Called to "rewind" a cursor back to the beginning so that
** it starts its output over again.  Always called at least once
** prior to any amatchColumn, amatchRowid, or amatchEof call.
*/
static int amatchFilter(
  sqlite3_vtab_cursor *pVtabCursor, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  amatch_cursor *pCur = (amatch_cursor *)pVtabCursor;
  const char *zWord = "*";
  int idx;

  amatchClearCursor(pCur);
  idx = 0;
  if( idxNum & 1 ){
    zWord = (const char*)sqlite3_value_text(argv[0]);
    idx++;
  }
  if( idxNum & 2 ){
    pCur->rLimit = (amatch_cost)sqlite3_value_int(argv[idx]);
    idx++;
  }
  if( idxNum & 4 ){
    pCur->iLang = (amatch_cost)sqlite3_value_int(argv[idx]);
    idx++;
  }
  pCur->zInput = sqlite3_mprintf("%s", zWord);
  if( pCur->zInput==0 ) return SQLITE_NOMEM;
  amatchAddWord(pCur, 0, 0, "", "");
  amatchNext(pVtabCursor);

  return SQLITE_OK;
}

/*
** Only the word and distance columns have values.  All other columns
** return NULL
*/
static int amatchColumn(sqlite3_vtab_cursor *cur, sqlite3_context *ctx, int i){
  amatch_cursor *pCur = (amatch_cursor*)cur;
  switch( i ){
    case AMATCH_COL_WORD: {
      sqlite3_result_text(ctx, pCur->pCurrent->zWord+2, -1, SQLITE_STATIC);
      break;
    }
    case AMATCH_COL_DISTANCE: {
      sqlite3_result_int(ctx, pCur->pCurrent->rCost);
      break;
    }
    case AMATCH_COL_LANGUAGE: {
      sqlite3_result_int(ctx, pCur->iLang);
      break;
    }
    case AMATCH_COL_NWORD: {
      sqlite3_result_int(ctx, pCur->nWord);
      break;
    }
    default: {
      sqlite3_result_null(ctx);
      break;
    }
  }
  return SQLITE_OK;
}

/*
** The rowid.
*/
static int amatchRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  amatch_cursor *pCur = (amatch_cursor*)cur;
  *pRowid = pCur->iRowid;
  return SQLITE_OK;
}

/*
** EOF indicator
*/
static int amatchEof(sqlite3_vtab_cursor *cur){
  amatch_cursor *pCur = (amatch_cursor*)cur;
  return pCur->pCurrent==0;
}

/*
** Search for terms of these forms:
**
**   (A)    word MATCH $str
**   (B1)   distance < $value
**   (B2)   distance <= $value
**   (C)    language == $language
**
** The distance< and distance<= are both treated as distance<=.
** The query plan number is a bit vector:
**
**   bit 1:   Term of the form (A) found
**   bit 2:   Term like (B1) or (B2) found
**   bit 3:   Term like (C) found
**
** If bit-1 is set, $str is always in filter.argv[0].  If bit-2 is set
** then $value is in filter.argv[0] if bit-1 is clear and is in 
** filter.argv[1] if bit-1 is set.  If bit-3 is set, then $ruleid is
** in filter.argv[0] if bit-1 and bit-2 are both zero, is in
** filter.argv[1] if exactly one of bit-1 and bit-2 are set, and is in
** filter.argv[2] if both bit-1 and bit-2 are set.
*/
static int amatchBestIndex(
  sqlite3_vtab *tab,
  sqlite3_index_info *pIdxInfo
){
  int iPlan = 0;
  int iDistTerm = -1;
  int iLangTerm = -1;
  int i;
  const struct sqlite3_index_constraint *pConstraint;

  (void)tab;
  pConstraint = pIdxInfo->aConstraint;
  for(i=0; i<pIdxInfo->nConstraint; i++, pConstraint++){
    if( pConstraint->usable==0 ) continue;
    if( (iPlan & 1)==0 
     && pConstraint->iColumn==0
     && pConstraint->op==SQLITE_INDEX_CONSTRAINT_MATCH
    ){
      iPlan |= 1;
      pIdxInfo->aConstraintUsage[i].argvIndex = 1;
      pIdxInfo->aConstraintUsage[i].omit = 1;
    }
    if( (iPlan & 2)==0
     && pConstraint->iColumn==1
     && (pConstraint->op==SQLITE_INDEX_CONSTRAINT_LT
           || pConstraint->op==SQLITE_INDEX_CONSTRAINT_LE)
    ){
      iPlan |= 2;
      iDistTerm = i;
    }
    if( (iPlan & 4)==0
     && pConstraint->iColumn==2
     && pConstraint->op==SQLITE_INDEX_CONSTRAINT_EQ
    ){
      iPlan |= 4;
      pIdxInfo->aConstraintUsage[i].omit = 1;
      iLangTerm = i;
    }
  }
  if( iPlan & 2 ){
    pIdxInfo->aConstraintUsage[iDistTerm].argvIndex = 1+((iPlan&1)!=0);
  }
  if( iPlan & 4 ){
    int idx = 1;
    if( iPlan & 1 ) idx++;
    if( iPlan & 2 ) idx++;
    pIdxInfo->aConstraintUsage[iLangTerm].argvIndex = idx;
  }
  pIdxInfo->idxNum = iPlan;
  if( pIdxInfo->nOrderBy==1
   && pIdxInfo->aOrderBy[0].iColumn==1
   && pIdxInfo->aOrderBy[0].desc==0
  ){
    pIdxInfo->orderByConsumed = 1;
  }
  pIdxInfo->estimatedCost = (double)10000;
   
  return SQLITE_OK;
}

/*
** The xUpdate() method.  
**
** This implementation disallows DELETE and UPDATE.  The only thing
** allowed is INSERT into the "command" column.
*/
static int amatchUpdate(
  sqlite3_vtab *pVTab,
  int argc,
  sqlite3_value **argv,
  sqlite_int64 *pRowid
){
  amatch_vtab *p = (amatch_vtab*)pVTab;
  const unsigned char *zCmd;
  (void)pRowid;
  if( argc==1 ){
    pVTab->zErrMsg = sqlite3_mprintf("DELETE from %s is not allowed", 
                                      p->zSelf);
    return SQLITE_ERROR;
  }
  if( sqlite3_value_type(argv[0])!=SQLITE_NULL ){
    pVTab->zErrMsg = sqlite3_mprintf("UPDATE of %s is not allowed", 
                                      p->zSelf);
    return SQLITE_ERROR;
  }
  if( sqlite3_value_type(argv[2+AMATCH_COL_WORD])!=SQLITE_NULL
   || sqlite3_value_type(argv[2+AMATCH_COL_DISTANCE])!=SQLITE_NULL
   || sqlite3_value_type(argv[2+AMATCH_COL_LANGUAGE])!=SQLITE_NULL
  ){
    pVTab->zErrMsg = sqlite3_mprintf(
            "INSERT INTO %s allowed for column [command] only", p->zSelf);
    return SQLITE_ERROR;
  }
  zCmd = sqlite3_value_text(argv[2+AMATCH_COL_COMMAND]);
  if( zCmd==0 ) return SQLITE_OK;
  
  return SQLITE_OK;
}

/*
** A virtual table module that implements the "approximate_match".
*/
static sqlite3_module amatchModule = {
  0,                      /* iVersion */
  amatchConnect,          /* xCreate */
  amatchConnect,          /* xConnect */
  amatchBestIndex,        /* xBestIndex */
  amatchDisconnect,       /* xDisconnect */
  amatchDisconnect,       /* xDestroy */
  amatchOpen,             /* xOpen - open a cursor */
  amatchClose,            /* xClose - close a cursor */
  amatchFilter,           /* xFilter - configure scan constraints */
  amatchNext,             /* xNext - advance a cursor */
  amatchEof,              /* xEof - check for end of scan */
  amatchColumn,           /* xColumn - read data */
  amatchRowid,            /* xRowid - read data */
  amatchUpdate,           /* xUpdate */
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
** Register the amatch virtual table
*/
#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_amatch_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Not used */
#ifndef SQLITE_OMIT_VIRTUALTABLE
  rc = sqlite3_create_module(db, "approximate_match", &amatchModule, 0);
#endif /* SQLITE_OMIT_VIRTUALTABLE */
  return rc;
}
