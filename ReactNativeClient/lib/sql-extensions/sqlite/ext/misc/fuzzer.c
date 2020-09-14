/*
** 2011 March 24
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
** Code for a demonstration virtual table that generates variations
** on an input word at increasing edit distances from the original.
**
** A fuzzer virtual table is created like this:
**
**     CREATE VIRTUAL TABLE f USING fuzzer(<fuzzer-data-table>);
**
** When it is created, the new fuzzer table must be supplied with the
** name of a "fuzzer data table", which must reside in the same database
** file as the new fuzzer table. The fuzzer data table contains the various
** transformations and their costs that the fuzzer logic uses to generate
** variations.
**
** The fuzzer data table must contain exactly four columns (more precisely,
** the statement "SELECT * FROM <fuzzer_data_table>" must return records
** that consist of four columns). It does not matter what the columns are
** named. 
**
** Each row in the fuzzer data table represents a single character
** transformation. The left most column of the row (column 0) contains an
** integer value - the identifier of the ruleset to which the transformation
** rule belongs (see "MULTIPLE RULE SETS" below). The second column of the
** row (column 0) contains the input character or characters. The third 
** column contains the output character or characters. And the fourth column
** contains the integer cost of making the transformation. For example:
**
**    CREATE TABLE f_data(ruleset, cFrom, cTo, Cost);
**    INSERT INTO f_data(ruleset, cFrom, cTo, Cost) VALUES(0, '', 'a', 100);
**    INSERT INTO f_data(ruleset, cFrom, cTo, Cost) VALUES(0, 'b', '', 87);
**    INSERT INTO f_data(ruleset, cFrom, cTo, Cost) VALUES(0, 'o', 'oe', 38);
**    INSERT INTO f_data(ruleset, cFrom, cTo, Cost) VALUES(0, 'oe', 'o', 40);
**
** The first row inserted into the fuzzer data table by the SQL script
** above indicates that the cost of inserting a letter 'a' is 100.  (All 
** costs are integers.  We recommend that costs be scaled so that the 
** average cost is around 100.) The second INSERT statement creates a rule
** saying that the cost of deleting a single letter 'b' is 87.  The third
** and fourth INSERT statements mean that the cost of transforming a
** single letter "o" into the two-letter sequence "oe" is 38 and that the
** cost of transforming "oe" back into "o" is 40.
**
** The contents of the fuzzer data table are loaded into main memory when
** a fuzzer table is first created, and may be internally reloaded by the
** system at any subsequent time. Therefore, the fuzzer data table should be 
** populated before the fuzzer table is created and not modified thereafter.
** If you do need to modify the contents of the fuzzer data table, it is
** recommended that the associated fuzzer table be dropped, the fuzzer data
** table edited, and the fuzzer table recreated within a single transaction.
** Alternatively, the fuzzer data table can be edited then the database
** connection can be closed and reopened.
**
** Once it has been created, the fuzzer table can be queried as follows:
**
**    SELECT word, distance FROM f
**     WHERE word MATCH 'abcdefg'
**       AND distance<200;
**
** This first query outputs the string "abcdefg" and all strings that
** can be derived from that string by appling the specified transformations.
** The strings are output together with their total transformation cost
** (called "distance") and appear in order of increasing cost.  No string
** is output more than once.  If there are multiple ways to transform the
** target string into the output string then the lowest cost transform is
** the one that is returned.  In the example, the search is limited to 
** strings with a total distance of less than 200.
**
** The fuzzer is a read-only table.  Any attempt to DELETE, INSERT, or
** UPDATE on a fuzzer table will throw an error.
**
** It is important to put some kind of a limit on the fuzzer output.  This
** can be either in the form of a LIMIT clause at the end of the query,
** or better, a "distance<NNN" constraint where NNN is some number.  The
** running time and memory requirement is exponential in the value of NNN 
** so you want to make sure that NNN is not too big.  A value of NNN that
** is about twice the average transformation cost seems to give good results.
**
** The fuzzer table can be useful for tasks such as spelling correction.
** Suppose there is a second table vocabulary(w) where the w column contains
** all correctly spelled words.   Let $word be a word you want to look up.
**
**   SELECT vocabulary.w FROM f, vocabulary
**    WHERE f.word MATCH $word
**      AND f.distance<=200
**      AND f.word=vocabulary.w
**    LIMIT 20
**
** The query above gives the 20 closest words to the $word being tested.
** (Note that for good performance, the vocubulary.w column should be
** indexed.)
**
** A similar query can be used to find all words in the dictionary that
** begin with some prefix $prefix:
**
**   SELECT vocabulary.w FROM f, vocabulary
**    WHERE f.word MATCH $prefix
**      AND f.distance<=200
**      AND vocabulary.w BETWEEN f.word AND (f.word || x'F7BFBFBF')
**    LIMIT 50
**
** This last query will show up to 50 words out of the vocabulary that
** match or nearly match the $prefix.
**
** MULTIPLE RULE SETS
**
** Normally, the "ruleset" value associated with all character transformations
** in the fuzzer data table is zero. However, if required, the fuzzer table
** allows multiple rulesets to be defined. Each query uses only a single
** ruleset. This allows, for example, a single fuzzer table to support 
** multiple languages.
**
** By default, only the rules from ruleset 0 are used. To specify an 
** alternative ruleset, a "ruleset = ?" expression must be added to the
** WHERE clause of a SELECT, where ? is the identifier of the desired 
** ruleset. For example:
**
**   SELECT vocabulary.w FROM f, vocabulary
**    WHERE f.word MATCH $word
**      AND f.distance<=200
**      AND f.word=vocabulary.w
**      AND f.ruleset=1  -- Specify the ruleset to use here
**    LIMIT 20
**
** If no "ruleset = ?" constraint is specified in the WHERE clause, ruleset 
** 0 is used.
**
** LIMITS
**
** The maximum ruleset number is 2147483647.  The maximum length of either
** of the strings in the second or third column of the fuzzer data table
** is 50 bytes.  The maximum cost on a rule is 1000.
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1

/* If SQLITE_DEBUG is not defined, disable assert statements. */
#if !defined(NDEBUG) && !defined(SQLITE_DEBUG)
# define NDEBUG
#endif

#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include <stdio.h>

#ifndef SQLITE_OMIT_VIRTUALTABLE

/*
** Forward declaration of objects used by this implementation
*/
typedef struct fuzzer_vtab fuzzer_vtab;
typedef struct fuzzer_cursor fuzzer_cursor;
typedef struct fuzzer_rule fuzzer_rule;
typedef struct fuzzer_seen fuzzer_seen;
typedef struct fuzzer_stem fuzzer_stem;

/*
** Various types.
**
** fuzzer_cost is the "cost" of an edit operation.
**
** fuzzer_len is the length of a matching string.  
**
** fuzzer_ruleid is an ruleset identifier.
*/
typedef int fuzzer_cost;
typedef signed char fuzzer_len;
typedef int fuzzer_ruleid;

/*
** Limits
*/
#define FUZZER_MX_LENGTH           50   /* Maximum length of a rule string */
#define FUZZER_MX_RULEID   2147483647   /* Maximum rule ID */
#define FUZZER_MX_COST           1000   /* Maximum single-rule cost */
#define FUZZER_MX_OUTPUT_LENGTH   100   /* Maximum length of an output string */


/*
** Each transformation rule is stored as an instance of this object.
** All rules are kept on a linked list sorted by rCost.
*/
struct fuzzer_rule {
  fuzzer_rule *pNext;         /* Next rule in order of increasing rCost */
  char *zFrom;                /* Transform from */
  fuzzer_cost rCost;          /* Cost of this transformation */
  fuzzer_len nFrom, nTo;      /* Length of the zFrom and zTo strings */
  fuzzer_ruleid iRuleset;     /* The rule set to which this rule belongs */
  char zTo[4];                /* Transform to (extra space appended) */
};

/*
** A stem object is used to generate variants.  It is also used to record
** previously generated outputs.
**
** Every stem is added to a hash table as it is output.  Generation of
** duplicate stems is suppressed.
**
** Active stems (those that might generate new outputs) are kepts on a linked
** list sorted by increasing cost.  The cost is the sum of rBaseCost and
** pRule->rCost.
*/
struct fuzzer_stem {
  char *zBasis;              /* Word being fuzzed */
  const fuzzer_rule *pRule;  /* Current rule to apply */
  fuzzer_stem *pNext;        /* Next stem in rCost order */
  fuzzer_stem *pHash;        /* Next stem with same hash on zBasis */
  fuzzer_cost rBaseCost;     /* Base cost of getting to zBasis */
  fuzzer_cost rCostX;        /* Precomputed rBaseCost + pRule->rCost */
  fuzzer_len nBasis;         /* Length of the zBasis string */
  fuzzer_len n;              /* Apply pRule at this character offset */
};

/* 
** A fuzzer virtual-table object 
*/
struct fuzzer_vtab {
  sqlite3_vtab base;         /* Base class - must be first */
  char *zClassName;          /* Name of this class.  Default: "fuzzer" */
  fuzzer_rule *pRule;        /* All active rules in this fuzzer */
  int nCursor;               /* Number of active cursors */
};

#define FUZZER_HASH  4001    /* Hash table size */
#define FUZZER_NQUEUE  20    /* Number of slots on the stem queue */

/* A fuzzer cursor object */
struct fuzzer_cursor {
  sqlite3_vtab_cursor base;  /* Base class - must be first */
  sqlite3_int64 iRowid;      /* The rowid of the current word */
  fuzzer_vtab *pVtab;        /* The virtual table this cursor belongs to */
  fuzzer_cost rLimit;        /* Maximum cost of any term */
  fuzzer_stem *pStem;        /* Stem with smallest rCostX */
  fuzzer_stem *pDone;        /* Stems already processed to completion */
  fuzzer_stem *aQueue[FUZZER_NQUEUE];  /* Queue of stems with higher rCostX */
  int mxQueue;               /* Largest used index in aQueue[] */
  char *zBuf;                /* Temporary use buffer */
  int nBuf;                  /* Bytes allocated for zBuf */
  int nStem;                 /* Number of stems allocated */
  int iRuleset;              /* Only process rules from this ruleset */
  fuzzer_rule nullRule;      /* Null rule used first */
  fuzzer_stem *apHash[FUZZER_HASH]; /* Hash of previously generated terms */
};

/*
** The two input rule lists are both sorted in order of increasing
** cost.  Merge them together into a single list, sorted by cost, and
** return a pointer to the head of that list.
*/
static fuzzer_rule *fuzzerMergeRules(fuzzer_rule *pA, fuzzer_rule *pB){
  fuzzer_rule head;
  fuzzer_rule *pTail;

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
** Statement pStmt currently points to a row in the fuzzer data table. This
** function allocates and populates a fuzzer_rule structure according to
** the content of the row.
**
** If successful, *ppRule is set to point to the new object and SQLITE_OK
** is returned. Otherwise, *ppRule is zeroed, *pzErr may be set to point
** to an error message and an SQLite error code returned.
*/
static int fuzzerLoadOneRule(
  fuzzer_vtab *p,                 /* Fuzzer virtual table handle */
  sqlite3_stmt *pStmt,            /* Base rule on statements current row */
  fuzzer_rule **ppRule,           /* OUT: New rule object */
  char **pzErr                    /* OUT: Error message */
){
  sqlite3_int64 iRuleset = sqlite3_column_int64(pStmt, 0);
  const char *zFrom = (const char *)sqlite3_column_text(pStmt, 1);
  const char *zTo = (const char *)sqlite3_column_text(pStmt, 2);
  int nCost = sqlite3_column_int(pStmt, 3);

  int rc = SQLITE_OK;             /* Return code */
  int nFrom;                      /* Size of string zFrom, in bytes */
  int nTo;                        /* Size of string zTo, in bytes */
  fuzzer_rule *pRule = 0;         /* New rule object to return */

  if( zFrom==0 ) zFrom = "";
  if( zTo==0 ) zTo = "";
  nFrom = (int)strlen(zFrom);
  nTo = (int)strlen(zTo);

  /* Silently ignore null transformations */
  if( strcmp(zFrom, zTo)==0 ){
    *ppRule = 0;
    return SQLITE_OK;
  }

  if( nCost<=0 || nCost>FUZZER_MX_COST ){
    *pzErr = sqlite3_mprintf("%s: cost must be between 1 and %d", 
        p->zClassName, FUZZER_MX_COST
    );
    rc = SQLITE_ERROR;
  }else
  if( nFrom>FUZZER_MX_LENGTH || nTo>FUZZER_MX_LENGTH ){
    *pzErr = sqlite3_mprintf("%s: maximum string length is %d", 
        p->zClassName, FUZZER_MX_LENGTH
    );
    rc = SQLITE_ERROR;    
  }else
  if( iRuleset<0 || iRuleset>FUZZER_MX_RULEID ){
    *pzErr = sqlite3_mprintf("%s: ruleset must be between 0 and %d", 
        p->zClassName, FUZZER_MX_RULEID
    );
    rc = SQLITE_ERROR;    
  }else{

    pRule = sqlite3_malloc64( sizeof(*pRule) + nFrom + nTo );
    if( pRule==0 ){
      rc = SQLITE_NOMEM;
    }else{
      memset(pRule, 0, sizeof(*pRule));
      pRule->zFrom = pRule->zTo;
      pRule->zFrom += nTo + 1;
      pRule->nFrom = (fuzzer_len)nFrom;
      memcpy(pRule->zFrom, zFrom, nFrom+1);
      memcpy(pRule->zTo, zTo, nTo+1);
      pRule->nTo = (fuzzer_len)nTo;
      pRule->rCost = nCost;
      pRule->iRuleset = (int)iRuleset;
    }
  }

  *ppRule = pRule;
  return rc;
}

/*
** Load the content of the fuzzer data table into memory.
*/
static int fuzzerLoadRules(
  sqlite3 *db,                    /* Database handle */
  fuzzer_vtab *p,                 /* Virtual fuzzer table to configure */
  const char *zDb,                /* Database containing rules data */
  const char *zData,              /* Table containing rules data */
  char **pzErr                    /* OUT: Error message */
){
  int rc = SQLITE_OK;             /* Return code */
  char *zSql;                     /* SELECT used to read from rules table */
  fuzzer_rule *pHead = 0;

  zSql = sqlite3_mprintf("SELECT * FROM %Q.%Q", zDb, zData);
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
          p->zClassName, zData, sqlite3_column_count(pStmt)
      );
      rc = SQLITE_ERROR;
    }else{
      while( rc==SQLITE_OK && SQLITE_ROW==sqlite3_step(pStmt) ){
        fuzzer_rule *pRule = 0;
        rc = fuzzerLoadOneRule(p, pStmt, &pRule, pzErr);
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
  ** block sorts them by cost and then sets fuzzer_vtab.pRule to point to 
  ** point to the head of the sorted list.
  */
  if( rc==SQLITE_OK ){
    unsigned int i;
    fuzzer_rule *pX;
    fuzzer_rule *a[15];
    for(i=0; i<sizeof(a)/sizeof(a[0]); i++) a[i] = 0;
    while( (pX = pHead)!=0 ){
      pHead = pX->pNext;
      pX->pNext = 0;
      for(i=0; a[i] && i<sizeof(a)/sizeof(a[0])-1; i++){
        pX = fuzzerMergeRules(a[i], pX);
        a[i] = 0;
      }
      a[i] = fuzzerMergeRules(a[i], pX);
    }
    for(pX=a[0], i=1; i<sizeof(a)/sizeof(a[0]); i++){
      pX = fuzzerMergeRules(a[i], pX);
    }
    p->pRule = fuzzerMergeRules(p->pRule, pX);
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
static char *fuzzerDequote(const char *zIn){
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
** xDisconnect/xDestroy method for the fuzzer module.
*/
static int fuzzerDisconnect(sqlite3_vtab *pVtab){
  fuzzer_vtab *p = (fuzzer_vtab*)pVtab;
  assert( p->nCursor==0 );
  while( p->pRule ){
    fuzzer_rule *pRule = p->pRule;
    p->pRule = pRule->pNext;
    sqlite3_free(pRule);
  }
  sqlite3_free(p);
  return SQLITE_OK;
}

/*
** xConnect/xCreate method for the fuzzer module. Arguments are:
**
**   argv[0]   -> module name  ("fuzzer")
**   argv[1]   -> database name
**   argv[2]   -> table name
**   argv[3]   -> fuzzer rule table name
*/
static int fuzzerConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  int rc = SQLITE_OK;             /* Return code */
  fuzzer_vtab *pNew = 0;          /* New virtual table */
  const char *zModule = argv[0];
  const char *zDb = argv[1];

  if( argc!=4 ){
    *pzErr = sqlite3_mprintf(
        "%s: wrong number of CREATE VIRTUAL TABLE arguments", zModule
    );
    rc = SQLITE_ERROR;
  }else{
    sqlite3_int64 nModule;        /* Length of zModule, in bytes */

    nModule = strlen(zModule);
    pNew = sqlite3_malloc64( sizeof(*pNew) + nModule + 1);
    if( pNew==0 ){
      rc = SQLITE_NOMEM;
    }else{
      char *zTab;                 /* Dequoted name of fuzzer data table */

      memset(pNew, 0, sizeof(*pNew));
      pNew->zClassName = (char*)&pNew[1];
      memcpy(pNew->zClassName, zModule, (size_t)(nModule+1));

      zTab = fuzzerDequote(argv[3]);
      if( zTab==0 ){
        rc = SQLITE_NOMEM;
      }else{
        rc = fuzzerLoadRules(db, pNew, zDb, zTab, pzErr);
        sqlite3_free(zTab);
      }

      if( rc==SQLITE_OK ){
        rc = sqlite3_declare_vtab(db, "CREATE TABLE x(word,distance,ruleset)");
      }
      if( rc!=SQLITE_OK ){
        fuzzerDisconnect((sqlite3_vtab *)pNew);
        pNew = 0;
      }else{
        sqlite3_vtab_config(db, SQLITE_VTAB_INNOCUOUS);
      }
    }
  }

  *ppVtab = (sqlite3_vtab *)pNew;
  return rc;
}

/*
** Open a new fuzzer cursor.
*/
static int fuzzerOpen(sqlite3_vtab *pVTab, sqlite3_vtab_cursor **ppCursor){
  fuzzer_vtab *p = (fuzzer_vtab*)pVTab;
  fuzzer_cursor *pCur;
  pCur = sqlite3_malloc( sizeof(*pCur) );
  if( pCur==0 ) return SQLITE_NOMEM;
  memset(pCur, 0, sizeof(*pCur));
  pCur->pVtab = p;
  *ppCursor = &pCur->base;
  p->nCursor++;
  return SQLITE_OK;
}

/*
** Free all stems in a list.
*/
static void fuzzerClearStemList(fuzzer_stem *pStem){
  while( pStem ){
    fuzzer_stem *pNext = pStem->pNext;
    sqlite3_free(pStem);
    pStem = pNext;
  }
}

/*
** Free up all the memory allocated by a cursor.  Set it rLimit to 0
** to indicate that it is at EOF.
*/
static void fuzzerClearCursor(fuzzer_cursor *pCur, int clearHash){
  int i;
  fuzzerClearStemList(pCur->pStem);
  fuzzerClearStemList(pCur->pDone);
  for(i=0; i<FUZZER_NQUEUE; i++) fuzzerClearStemList(pCur->aQueue[i]);
  pCur->rLimit = (fuzzer_cost)0;
  if( clearHash && pCur->nStem ){
    pCur->mxQueue = 0;
    pCur->pStem = 0;
    pCur->pDone = 0;
    memset(pCur->aQueue, 0, sizeof(pCur->aQueue));
    memset(pCur->apHash, 0, sizeof(pCur->apHash));
  }
  pCur->nStem = 0;
}

/*
** Close a fuzzer cursor.
*/
static int fuzzerClose(sqlite3_vtab_cursor *cur){
  fuzzer_cursor *pCur = (fuzzer_cursor *)cur;
  fuzzerClearCursor(pCur, 0);
  sqlite3_free(pCur->zBuf);
  pCur->pVtab->nCursor--;
  sqlite3_free(pCur);
  return SQLITE_OK;
}

/*
** Compute the current output term for a fuzzer_stem.
*/
static int fuzzerRender(
  fuzzer_stem *pStem,   /* The stem to be rendered */
  char **pzBuf,         /* Write results into this buffer.  realloc if needed */
  int *pnBuf            /* Size of the buffer */
){
  const fuzzer_rule *pRule = pStem->pRule;
  int n;                          /* Size of output term without nul-term */
  char *z;                        /* Buffer to assemble output term in */

  n = pStem->nBasis + pRule->nTo - pRule->nFrom;
  if( (*pnBuf)<n+1 ){
    (*pzBuf) = sqlite3_realloc((*pzBuf), n+100);
    if( (*pzBuf)==0 ) return SQLITE_NOMEM;
    (*pnBuf) = n+100;
  }
  n = pStem->n;
  z = *pzBuf;
  if( n<0 ){
    memcpy(z, pStem->zBasis, pStem->nBasis+1);
  }else{
    memcpy(z, pStem->zBasis, n);
    memcpy(&z[n], pRule->zTo, pRule->nTo);
    memcpy(&z[n+pRule->nTo], &pStem->zBasis[n+pRule->nFrom], 
           pStem->nBasis-n-pRule->nFrom+1);
  }

  assert( z[pStem->nBasis + pRule->nTo - pRule->nFrom]==0 );
  return SQLITE_OK;
}

/*
** Compute a hash on zBasis.
*/
static unsigned int fuzzerHash(const char *z){
  unsigned int h = 0;
  while( *z ){ h = (h<<3) ^ (h>>29) ^ *(z++); }
  return h % FUZZER_HASH;
}

/*
** Current cost of a stem
*/
static fuzzer_cost fuzzerCost(fuzzer_stem *pStem){
  return pStem->rCostX = pStem->rBaseCost + pStem->pRule->rCost;
}

#if 0
/*
** Print a description of a fuzzer_stem on stderr.
*/
static void fuzzerStemPrint(
  const char *zPrefix,
  fuzzer_stem *pStem,
  const char *zSuffix
){
  if( pStem->n<0 ){
    fprintf(stderr, "%s[%s](%d)-->self%s",
       zPrefix,
       pStem->zBasis, pStem->rBaseCost,
       zSuffix
    );
  }else{
    char *zBuf = 0;
    int nBuf = 0;
    if( fuzzerRender(pStem, &zBuf, &nBuf)!=SQLITE_OK ) return;
    fprintf(stderr, "%s[%s](%d)-->{%s}(%d)%s",
      zPrefix,
      pStem->zBasis, pStem->rBaseCost, zBuf, pStem->,
      zSuffix
    );
    sqlite3_free(zBuf);
  }
}
#endif

/*
** Return 1 if the string to which the cursor is point has already
** been emitted.  Return 0 if not.  Return -1 on a memory allocation
** failures.
*/
static int fuzzerSeen(fuzzer_cursor *pCur, fuzzer_stem *pStem){
  unsigned int h;
  fuzzer_stem *pLookup;

  if( fuzzerRender(pStem, &pCur->zBuf, &pCur->nBuf)==SQLITE_NOMEM ){
    return -1;
  }
  h = fuzzerHash(pCur->zBuf);
  pLookup = pCur->apHash[h];
  while( pLookup && strcmp(pLookup->zBasis, pCur->zBuf)!=0 ){
    pLookup = pLookup->pHash;
  }
  return pLookup!=0;
}

/*
** If argument pRule is NULL, this function returns false.
**
** Otherwise, it returns true if rule pRule should be skipped. A rule 
** should be skipped if it does not belong to rule-set iRuleset, or if
** applying it to stem pStem would create a string longer than 
** FUZZER_MX_OUTPUT_LENGTH bytes.
*/
static int fuzzerSkipRule(
  const fuzzer_rule *pRule,       /* Determine whether or not to skip this */
  fuzzer_stem *pStem,             /* Stem rule may be applied to */
  int iRuleset                    /* Rule-set used by the current query */
){
  return pRule && (
      (pRule->iRuleset!=iRuleset)
   || (pStem->nBasis + pRule->nTo - pRule->nFrom)>FUZZER_MX_OUTPUT_LENGTH
  );
}

/*
** Advance a fuzzer_stem to its next value.   Return 0 if there are
** no more values that can be generated by this fuzzer_stem.  Return
** -1 on a memory allocation failure.
*/
static int fuzzerAdvance(fuzzer_cursor *pCur, fuzzer_stem *pStem){
  const fuzzer_rule *pRule;
  while( (pRule = pStem->pRule)!=0 ){
    assert( pRule==&pCur->nullRule || pRule->iRuleset==pCur->iRuleset );
    while( pStem->n < pStem->nBasis - pRule->nFrom ){
      pStem->n++;
      if( pRule->nFrom==0
       || memcmp(&pStem->zBasis[pStem->n], pRule->zFrom, pRule->nFrom)==0
      ){
        /* Found a rewrite case.  Make sure it is not a duplicate */
        int rc = fuzzerSeen(pCur, pStem);
        if( rc<0 ) return -1;
        if( rc==0 ){
          fuzzerCost(pStem);
          return 1;
        }
      }
    }
    pStem->n = -1;
    do{
      pRule = pRule->pNext;
    }while( fuzzerSkipRule(pRule, pStem, pCur->iRuleset) );
    pStem->pRule = pRule;
    if( pRule && fuzzerCost(pStem)>pCur->rLimit ) pStem->pRule = 0;
  }
  return 0;
}

/*
** The two input stem lists are both sorted in order of increasing
** rCostX.  Merge them together into a single list, sorted by rCostX, and
** return a pointer to the head of that new list.
*/
static fuzzer_stem *fuzzerMergeStems(fuzzer_stem *pA, fuzzer_stem *pB){
  fuzzer_stem head;
  fuzzer_stem *pTail;

  pTail =  &head;
  while( pA && pB ){
    if( pA->rCostX<=pB->rCostX ){
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
** Load pCur->pStem with the lowest-cost stem.  Return a pointer
** to the lowest-cost stem.
*/
static fuzzer_stem *fuzzerLowestCostStem(fuzzer_cursor *pCur){
  fuzzer_stem *pBest, *pX;
  int iBest;
  int i;

  if( pCur->pStem==0 ){
    iBest = -1;
    pBest = 0;
    for(i=0; i<=pCur->mxQueue; i++){
      pX = pCur->aQueue[i];
      if( pX==0 ) continue;
      if( pBest==0 || pBest->rCostX>pX->rCostX ){
        pBest = pX;
        iBest = i;
      }
    } 
    if( pBest ){
      pCur->aQueue[iBest] = pBest->pNext;
      pBest->pNext = 0;
      pCur->pStem = pBest;
    }
  }
  return pCur->pStem;
}

/*
** Insert pNew into queue of pending stems.  Then find the stem
** with the lowest rCostX and move it into pCur->pStem.
** list.  The insert is done such the pNew is in the correct order
** according to fuzzer_stem.zBaseCost+fuzzer_stem.pRule->rCost.
*/
static fuzzer_stem *fuzzerInsert(fuzzer_cursor *pCur, fuzzer_stem *pNew){
  fuzzer_stem *pX;
  int i;

  /* If pCur->pStem exists and is greater than pNew, then make pNew
  ** the new pCur->pStem and insert the old pCur->pStem instead.
  */
  if( (pX = pCur->pStem)!=0 && pX->rCostX>pNew->rCostX ){
    pNew->pNext = 0;
    pCur->pStem = pNew;
    pNew = pX;
  }

  /* Insert the new value */
  pNew->pNext = 0;
  pX = pNew;
  for(i=0; i<=pCur->mxQueue; i++){
    if( pCur->aQueue[i] ){
      pX = fuzzerMergeStems(pX, pCur->aQueue[i]);
      pCur->aQueue[i] = 0;
    }else{
      pCur->aQueue[i] = pX;
      break;
    }
  }
  if( i>pCur->mxQueue ){
    if( i<FUZZER_NQUEUE ){
      pCur->mxQueue = i;
      pCur->aQueue[i] = pX;
    }else{
      assert( pCur->mxQueue==FUZZER_NQUEUE-1 );
      pX = fuzzerMergeStems(pX, pCur->aQueue[FUZZER_NQUEUE-1]);
      pCur->aQueue[FUZZER_NQUEUE-1] = pX;
    }
  }

  return fuzzerLowestCostStem(pCur);
}

/*
** Allocate a new fuzzer_stem.  Add it to the hash table but do not
** link it into either the pCur->pStem or pCur->pDone lists.
*/
static fuzzer_stem *fuzzerNewStem(
  fuzzer_cursor *pCur,
  const char *zWord,
  fuzzer_cost rBaseCost
){
  fuzzer_stem *pNew;
  fuzzer_rule *pRule;
  unsigned int h;

  pNew = sqlite3_malloc64( sizeof(*pNew) + strlen(zWord) + 1 );
  if( pNew==0 ) return 0;
  memset(pNew, 0, sizeof(*pNew));
  pNew->zBasis = (char*)&pNew[1];
  pNew->nBasis = (fuzzer_len)strlen(zWord);
  memcpy(pNew->zBasis, zWord, pNew->nBasis+1);
  pRule = pCur->pVtab->pRule;
  while( fuzzerSkipRule(pRule, pNew, pCur->iRuleset) ){
    pRule = pRule->pNext;
  }
  pNew->pRule = pRule;
  pNew->n = -1;
  pNew->rBaseCost = pNew->rCostX = rBaseCost;
  h = fuzzerHash(pNew->zBasis);
  pNew->pHash = pCur->apHash[h];
  pCur->apHash[h] = pNew;
  pCur->nStem++;
  return pNew;
}


/*
** Advance a cursor to its next row of output
*/
static int fuzzerNext(sqlite3_vtab_cursor *cur){
  fuzzer_cursor *pCur = (fuzzer_cursor*)cur;
  int rc;
  fuzzer_stem *pStem, *pNew;

  pCur->iRowid++;

  /* Use the element the cursor is currently point to to create
  ** a new stem and insert the new stem into the priority queue.
  */
  pStem = pCur->pStem;
  if( pStem->rCostX>0 ){
    rc = fuzzerRender(pStem, &pCur->zBuf, &pCur->nBuf);
    if( rc==SQLITE_NOMEM ) return SQLITE_NOMEM;
    pNew = fuzzerNewStem(pCur, pCur->zBuf, pStem->rCostX);
    if( pNew ){
      if( fuzzerAdvance(pCur, pNew)==0 ){
        pNew->pNext = pCur->pDone;
        pCur->pDone = pNew;
      }else{
        if( fuzzerInsert(pCur, pNew)==pNew ){
          return SQLITE_OK;
        }
      }
    }else{
      return SQLITE_NOMEM;
    }
  }

  /* Adjust the priority queue so that the first element of the
  ** stem list is the next lowest cost word.
  */
  while( (pStem = pCur->pStem)!=0 ){
    int res = fuzzerAdvance(pCur, pStem);
    if( res<0 ){
      return SQLITE_NOMEM;
    }else if( res>0 ){
      pCur->pStem = 0;
      pStem = fuzzerInsert(pCur, pStem);
      if( (rc = fuzzerSeen(pCur, pStem))!=0 ){
        if( rc<0 ) return SQLITE_NOMEM;
        continue;
      }
      return SQLITE_OK;  /* New word found */
    }
    pCur->pStem = 0;
    pStem->pNext = pCur->pDone;
    pCur->pDone = pStem;
    if( fuzzerLowestCostStem(pCur) ){
      rc = fuzzerSeen(pCur, pCur->pStem);
      if( rc<0 ) return SQLITE_NOMEM;
      if( rc==0 ){
        return SQLITE_OK;
      }
    }
  }

  /* Reach this point only if queue has been exhausted and there is
  ** nothing left to be output. */
  pCur->rLimit = (fuzzer_cost)0;
  return SQLITE_OK;
}

/*
** Called to "rewind" a cursor back to the beginning so that
** it starts its output over again.  Always called at least once
** prior to any fuzzerColumn, fuzzerRowid, or fuzzerEof call.
*/
static int fuzzerFilter(
  sqlite3_vtab_cursor *pVtabCursor, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  fuzzer_cursor *pCur = (fuzzer_cursor *)pVtabCursor;
  const char *zWord = "";
  fuzzer_stem *pStem;
  int idx;

  fuzzerClearCursor(pCur, 1);
  pCur->rLimit = 2147483647;
  idx = 0;
  if( idxNum & 1 ){
    zWord = (const char*)sqlite3_value_text(argv[0]);
    idx++;
  }
  if( idxNum & 2 ){
    pCur->rLimit = (fuzzer_cost)sqlite3_value_int(argv[idx]);
    idx++;
  }
  if( idxNum & 4 ){
    pCur->iRuleset = (fuzzer_cost)sqlite3_value_int(argv[idx]);
    idx++;
  }
  pCur->nullRule.pNext = pCur->pVtab->pRule;
  pCur->nullRule.rCost = 0;
  pCur->nullRule.nFrom = 0;
  pCur->nullRule.nTo = 0;
  pCur->nullRule.zFrom = "";
  pCur->iRowid = 1;
  assert( pCur->pStem==0 );

  /* If the query term is longer than FUZZER_MX_OUTPUT_LENGTH bytes, this
  ** query will return zero rows.  */
  if( (int)strlen(zWord)<FUZZER_MX_OUTPUT_LENGTH ){
    pCur->pStem = pStem = fuzzerNewStem(pCur, zWord, (fuzzer_cost)0);
    if( pStem==0 ) return SQLITE_NOMEM;
    pStem->pRule = &pCur->nullRule;
    pStem->n = pStem->nBasis;
  }else{
    pCur->rLimit = 0;
  }

  return SQLITE_OK;
}

/*
** Only the word and distance columns have values.  All other columns
** return NULL
*/
static int fuzzerColumn(sqlite3_vtab_cursor *cur, sqlite3_context *ctx, int i){
  fuzzer_cursor *pCur = (fuzzer_cursor*)cur;
  if( i==0 ){
    /* the "word" column */
    if( fuzzerRender(pCur->pStem, &pCur->zBuf, &pCur->nBuf)==SQLITE_NOMEM ){
      return SQLITE_NOMEM;
    }
    sqlite3_result_text(ctx, pCur->zBuf, -1, SQLITE_TRANSIENT);
  }else if( i==1 ){
    /* the "distance" column */
    sqlite3_result_int(ctx, pCur->pStem->rCostX);
  }else{
    /* All other columns are NULL */
    sqlite3_result_null(ctx);
  }
  return SQLITE_OK;
}

/*
** The rowid.
*/
static int fuzzerRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  fuzzer_cursor *pCur = (fuzzer_cursor*)cur;
  *pRowid = pCur->iRowid;
  return SQLITE_OK;
}

/*
** When the fuzzer_cursor.rLimit value is 0 or less, that is a signal
** that the cursor has nothing more to output.
*/
static int fuzzerEof(sqlite3_vtab_cursor *cur){
  fuzzer_cursor *pCur = (fuzzer_cursor*)cur;
  return pCur->rLimit<=(fuzzer_cost)0;
}

/*
** Search for terms of these forms:
**
**   (A)    word MATCH $str
**   (B1)   distance < $value
**   (B2)   distance <= $value
**   (C)    ruleid == $ruleid
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
static int fuzzerBestIndex(sqlite3_vtab *tab, sqlite3_index_info *pIdxInfo){
  int iPlan = 0;
  int iDistTerm = -1;
  int iRulesetTerm = -1;
  int i;
  int seenMatch = 0;
  const struct sqlite3_index_constraint *pConstraint;
  double rCost = 1e12;

  pConstraint = pIdxInfo->aConstraint;
  for(i=0; i<pIdxInfo->nConstraint; i++, pConstraint++){
    if( pConstraint->iColumn==0
     && pConstraint->op==SQLITE_INDEX_CONSTRAINT_MATCH ){
      seenMatch = 1;
    }
    if( pConstraint->usable==0 ) continue;
    if( (iPlan & 1)==0 
     && pConstraint->iColumn==0
     && pConstraint->op==SQLITE_INDEX_CONSTRAINT_MATCH
    ){
      iPlan |= 1;
      pIdxInfo->aConstraintUsage[i].argvIndex = 1;
      pIdxInfo->aConstraintUsage[i].omit = 1;
      rCost /= 1e6;
    }
    if( (iPlan & 2)==0
     && pConstraint->iColumn==1
     && (pConstraint->op==SQLITE_INDEX_CONSTRAINT_LT
           || pConstraint->op==SQLITE_INDEX_CONSTRAINT_LE)
    ){
      iPlan |= 2;
      iDistTerm = i;
      rCost /= 10.0;
    }
    if( (iPlan & 4)==0
     && pConstraint->iColumn==2
     && pConstraint->op==SQLITE_INDEX_CONSTRAINT_EQ
    ){
      iPlan |= 4;
      pIdxInfo->aConstraintUsage[i].omit = 1;
      iRulesetTerm = i;
      rCost /= 10.0;
    }
  }
  if( iPlan & 2 ){
    pIdxInfo->aConstraintUsage[iDistTerm].argvIndex = 1+((iPlan&1)!=0);
  }
  if( iPlan & 4 ){
    int idx = 1;
    if( iPlan & 1 ) idx++;
    if( iPlan & 2 ) idx++;
    pIdxInfo->aConstraintUsage[iRulesetTerm].argvIndex = idx;
  }
  pIdxInfo->idxNum = iPlan;
  if( pIdxInfo->nOrderBy==1
   && pIdxInfo->aOrderBy[0].iColumn==1
   && pIdxInfo->aOrderBy[0].desc==0
  ){
    pIdxInfo->orderByConsumed = 1;
  }
  if( seenMatch && (iPlan&1)==0 ) rCost = 1e99;
  pIdxInfo->estimatedCost = rCost;
   
  return SQLITE_OK;
}

/*
** A virtual table module that implements the "fuzzer".
*/
static sqlite3_module fuzzerModule = {
  0,                           /* iVersion */
  fuzzerConnect,
  fuzzerConnect,
  fuzzerBestIndex,
  fuzzerDisconnect, 
  fuzzerDisconnect,
  fuzzerOpen,                  /* xOpen - open a cursor */
  fuzzerClose,                 /* xClose - close a cursor */
  fuzzerFilter,                /* xFilter - configure scan constraints */
  fuzzerNext,                  /* xNext - advance a cursor */
  fuzzerEof,                   /* xEof - check for end of scan */
  fuzzerColumn,                /* xColumn - read data */
  fuzzerRowid,                 /* xRowid - read data */
  0,                           /* xUpdate */
  0,                           /* xBegin */
  0,                           /* xSync */
  0,                           /* xCommit */
  0,                           /* xRollback */
  0,                           /* xFindMethod */
  0,                           /* xRename */
};

#endif /* SQLITE_OMIT_VIRTUALTABLE */


#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_fuzzer_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
#ifndef SQLITE_OMIT_VIRTUALTABLE
  rc = sqlite3_create_module(db, "fuzzer", &fuzzerModule, 0);
#endif
  return rc;
}
