/*
** 2013-05-28
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
** This file contains code to implement the percentile(Y,P) SQL function
** as described below:
**
**   (1)  The percentile(Y,P) function is an aggregate function taking
**        exactly two arguments.
**
**   (2)  If the P argument to percentile(Y,P) is not the same for every
**        row in the aggregate then an error is thrown.  The word "same"
**        in the previous sentence means that the value differ by less
**        than 0.001.
**
**   (3)  If the P argument to percentile(Y,P) evaluates to anything other
**        than a number in the range of 0.0 to 100.0 inclusive then an
**        error is thrown.
**
**   (4)  If any Y argument to percentile(Y,P) evaluates to a value that
**        is not NULL and is not numeric then an error is thrown.
**
**   (5)  If any Y argument to percentile(Y,P) evaluates to plus or minus
**        infinity then an error is thrown.  (SQLite always interprets NaN
**        values as NULL.)
**
**   (6)  Both Y and P in percentile(Y,P) can be arbitrary expressions,
**        including CASE WHEN expressions.
**
**   (7)  The percentile(Y,P) aggregate is able to handle inputs of at least
**        one million (1,000,000) rows.
**
**   (8)  If there are no non-NULL values for Y, then percentile(Y,P)
**        returns NULL.
**
**   (9)  If there is exactly one non-NULL value for Y, the percentile(Y,P)
**        returns the one Y value.
**
**  (10)  If there N non-NULL values of Y where N is two or more and
**        the Y values are ordered from least to greatest and a graph is
**        drawn from 0 to N-1 such that the height of the graph at J is
**        the J-th Y value and such that straight lines are drawn between
**        adjacent Y values, then the percentile(Y,P) function returns
**        the height of the graph at P*(N-1)/100.
**
**  (11)  The percentile(Y,P) function always returns either a floating
**        point number or NULL.
**
**  (12)  The percentile(Y,P) is implemented as a single C99 source-code
**        file that compiles into a shared-library or DLL that can be loaded
**        into SQLite using the sqlite3_load_extension() interface.
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <assert.h>
#include <string.h>
#include <stdlib.h>

/* The following object is the session context for a single percentile()
** function.  We have to remember all input Y values until the very end.
** Those values are accumulated in the Percentile.a[] array.
*/
typedef struct Percentile Percentile;
struct Percentile {
  unsigned nAlloc;     /* Number of slots allocated for a[] */
  unsigned nUsed;      /* Number of slots actually used in a[] */
  double rPct;         /* 1.0 more than the value for P */
  double *a;           /* Array of Y values */
};

/*
** Return TRUE if the input floating-point number is an infinity.
*/
static int isInfinity(double r){
  sqlite3_uint64 u;
  assert( sizeof(u)==sizeof(r) );
  memcpy(&u, &r, sizeof(u));
  return ((u>>52)&0x7ff)==0x7ff;
}

/*
** Return TRUE if two doubles differ by 0.001 or less
*/
static int sameValue(double a, double b){
  a -= b;
  return a>=-0.001 && a<=0.001;
}

/*
** The "step" function for percentile(Y,P) is called once for each
** input row.
*/
static void percentStep(sqlite3_context *pCtx, int argc, sqlite3_value **argv){
  Percentile *p;
  double rPct;
  int eType;
  double y;
  assert( argc==2 );

  /* Requirement 3:  P must be a number between 0 and 100 */
  eType = sqlite3_value_numeric_type(argv[1]);
  rPct = sqlite3_value_double(argv[1]);
  if( (eType!=SQLITE_INTEGER && eType!=SQLITE_FLOAT)
   || rPct<0.0 || rPct>100.0 ){
    sqlite3_result_error(pCtx, "2nd argument to percentile() is not "
                         "a number between 0.0 and 100.0", -1);
    return;
  }

  /* Allocate the session context. */
  p = (Percentile*)sqlite3_aggregate_context(pCtx, sizeof(*p));
  if( p==0 ) return;

  /* Remember the P value.  Throw an error if the P value is different
  ** from any prior row, per Requirement (2). */
  if( p->rPct==0.0 ){
    p->rPct = rPct+1.0;
  }else if( !sameValue(p->rPct,rPct+1.0) ){
    sqlite3_result_error(pCtx, "2nd argument to percentile() is not the "
                               "same for all input rows", -1);
    return;
  }

  /* Ignore rows for which Y is NULL */
  eType = sqlite3_value_type(argv[0]);
  if( eType==SQLITE_NULL ) return;

  /* If not NULL, then Y must be numeric.  Otherwise throw an error.
  ** Requirement 4 */
  if( eType!=SQLITE_INTEGER && eType!=SQLITE_FLOAT ){
    sqlite3_result_error(pCtx, "1st argument to percentile() is not "
                               "numeric", -1);
    return;
  }

  /* Throw an error if the Y value is infinity or NaN */
  y = sqlite3_value_double(argv[0]);
  if( isInfinity(y) ){
    sqlite3_result_error(pCtx, "Inf input to percentile()", -1);
    return;
  }

  /* Allocate and store the Y */
  if( p->nUsed>=p->nAlloc ){
    unsigned n = p->nAlloc*2 + 250;
    double *a = sqlite3_realloc64(p->a, sizeof(double)*n);
    if( a==0 ){
      sqlite3_free(p->a);
      memset(p, 0, sizeof(*p));
      sqlite3_result_error_nomem(pCtx);
      return;
    }
    p->nAlloc = n;
    p->a = a;
  }
  p->a[p->nUsed++] = y;
}

/*
** Compare to doubles for sorting using qsort()
*/
static int SQLITE_CDECL doubleCmp(const void *pA, const void *pB){
  double a = *(double*)pA;
  double b = *(double*)pB;
  if( a==b ) return 0;
  if( a<b ) return -1;
  return +1;
}

/*
** Called to compute the final output of percentile() and to clean
** up all allocated memory.
*/
static void percentFinal(sqlite3_context *pCtx){
  Percentile *p;
  unsigned i1, i2;
  double v1, v2;
  double ix, vx;
  p = (Percentile*)sqlite3_aggregate_context(pCtx, 0);
  if( p==0 ) return;
  if( p->a==0 ) return;
  if( p->nUsed ){
    qsort(p->a, p->nUsed, sizeof(double), doubleCmp);
    ix = (p->rPct-1.0)*(p->nUsed-1)*0.01;
    i1 = (unsigned)ix;
    i2 = ix==(double)i1 || i1==p->nUsed-1 ? i1 : i1+1;
    v1 = p->a[i1];
    v2 = p->a[i2];
    vx = v1 + (v2-v1)*(ix-i1);
    sqlite3_result_double(pCtx, vx);
  }
  sqlite3_free(p->a);
  memset(p, 0, sizeof(*p));
}


#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_percentile_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  rc = sqlite3_create_function(db, "percentile", 2, 
                               SQLITE_UTF8|SQLITE_INNOCUOUS, 0,
                               0, percentStep, percentFinal);
  return rc;
}
