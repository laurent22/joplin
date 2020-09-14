/*
** 2020-06-22
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
** Routines to implement arbitrary-precision decimal math.
**
** The focus here is on simplicity and correctness, not performance.
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <assert.h>
#include <string.h>
#include <ctype.h>
#include <stdlib.h>

/* Mark a function parameter as unused, to suppress nuisance compiler
** warnings. */
#ifndef UNUSED_PARAMETER
# define UNUSED_PARAMETER(X)  (void)(X)
#endif


/* A decimal object */
typedef struct Decimal Decimal;
struct Decimal {
  char sign;        /* 0 for positive, 1 for negative */
  char oom;         /* True if an OOM is encountered */
  char isNull;      /* True if holds a NULL rather than a number */
  char isInit;      /* True upon initialization */
  int nDigit;       /* Total number of digits */
  int nFrac;        /* Number of digits to the right of the decimal point */
  signed char *a;   /* Array of digits.  Most significant first. */
};

/*
** Release memory held by a Decimal, but do not free the object itself.
*/
static void decimal_clear(Decimal *p){
  sqlite3_free(p->a);
}

/*
** Destroy a Decimal object
*/
static void decimal_free(Decimal *p){
  if( p ){
    decimal_clear(p);
    sqlite3_free(p);
  }
}

/*
** Allocate a new Decimal object.  Initialize it to the number given
** by the input string.
*/
static Decimal *decimal_new(
  sqlite3_context *pCtx,
  sqlite3_value *pIn,
  int nAlt,
  const unsigned char *zAlt
){
  Decimal *p;
  int n, i;
  const unsigned char *zIn;
  int iExp = 0;
  p = sqlite3_malloc( sizeof(*p) );
  if( p==0 ) goto new_no_mem;
  p->sign = 0;
  p->oom = 0;
  p->isInit = 1;
  p->isNull = 0;
  p->nDigit = 0;
  p->nFrac = 0;
  if( zAlt ){
    n = nAlt,
    zIn = zAlt;
  }else{
    if( sqlite3_value_type(pIn)==SQLITE_NULL ){
      p->a = 0;
      p->isNull = 1;
      return p;
    }
    n = sqlite3_value_bytes(pIn);
    zIn = sqlite3_value_text(pIn);
  }
  p->a = sqlite3_malloc64( n+1 );
  if( p->a==0 ) goto new_no_mem;
  for(i=0; isspace(zIn[i]); i++){}
  if( zIn[i]=='-' ){
    p->sign = 1;
    i++;
  }else if( zIn[i]=='+' ){
    i++;
  }
  while( i<n && zIn[i]=='0' ) i++;
  while( i<n ){
    char c = zIn[i];
    if( c>='0' && c<='9' ){
      p->a[p->nDigit++] = c - '0';
    }else if( c=='.' ){
      p->nFrac = p->nDigit + 1;
    }else if( c=='e' || c=='E' ){
      int j = i+1;
      int neg = 0;
      if( j>=n ) break;
      if( zIn[j]=='-' ){
        neg = 1;
        j++;
      }else if( zIn[j]=='+' ){
        j++;
      }
      while( j<n && iExp<1000000 ){
        if( zIn[j]>='0' && zIn[j]<='9' ){
          iExp = iExp*10 + zIn[j] - '0';
        }
        j++;
      }
      if( neg ) iExp = -iExp;
      break;
    }
    i++;
  }
  if( p->nFrac ){
    p->nFrac = p->nDigit - (p->nFrac - 1);
  }
  if( iExp>0 ){
    if( p->nFrac>0 ){
      if( iExp<=p->nFrac ){
        p->nFrac -= iExp;
        iExp = 0;
      }else{
        iExp -= p->nFrac;
        p->nFrac = 0;
      }
    }
    if( iExp>0 ){   
      p->a = sqlite3_realloc64(p->a, p->nDigit + iExp + 1 );
      if( p->a==0 ) goto new_no_mem;
      memset(p->a+p->nDigit, 0, iExp);
      p->nDigit += iExp;
    }
  }else if( iExp<0 ){
    int nExtra;
    iExp = -iExp;
    nExtra = p->nDigit - p->nFrac - 1;
    if( nExtra ){
      if( nExtra>=iExp ){
        p->nFrac += iExp;
        iExp  = 0;
      }else{
        iExp -= nExtra;
        p->nFrac = p->nDigit - 1;
      }
    }
    if( iExp>0 ){
      p->a = sqlite3_realloc64(p->a, p->nDigit + iExp + 1 );
      if( p->a==0 ) goto new_no_mem;
      memmove(p->a+iExp, p->a, p->nDigit);
      memset(p->a, 0, iExp);
      p->nDigit += iExp;
      p->nFrac += iExp;
    }
  }
  return p;

new_no_mem:
  if( pCtx ) sqlite3_result_error_nomem(pCtx);
  sqlite3_free(p);
  return 0;
}

/*
** Make the given Decimal the result.
*/
static void decimal_result(sqlite3_context *pCtx, Decimal *p){
  char *z;
  int i, j;
  int n;
  if( p==0 || p->oom ){
    sqlite3_result_error_nomem(pCtx);
    return;
  }
  if( p->isNull ){
    sqlite3_result_null(pCtx);
    return;
  }
  z = sqlite3_malloc( p->nDigit+4 );
  if( z==0 ){
    sqlite3_result_error_nomem(pCtx);
    return;
  }
  i = 0;
  if( p->nDigit==0 || (p->nDigit==1 && p->a[0]==0) ){
    p->sign = 0;
  }
  if( p->sign ){
    z[0] = '-';
    i = 1;
  }
  n = p->nDigit - p->nFrac;
  if( n<=0 ){
    z[i++] = '0';
  }
  j = 0;
  while( n>1 && p->a[j]==0 ){
    j++;
    n--;
  }
  while( n>0  ){
    z[i++] = p->a[j] + '0';
    j++;
    n--;
  }
  if( p->nFrac ){
    z[i++] = '.';
    do{
      z[i++] = p->a[j] + '0';
      j++;
    }while( j<p->nDigit );
  }
  z[i] = 0;
  sqlite3_result_text(pCtx, z, i, sqlite3_free);
}

/*
** SQL Function:   decimal(X)
**
** Convert input X into decimal and then back into text
*/
static void decimalFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  Decimal *p = decimal_new(context, argv[0], 0, 0);
  UNUSED_PARAMETER(argc);
  decimal_result(context, p);
  decimal_free(p);
}

/*
** Compare to Decimal objects.  Return negative, 0, or positive if the
** first object is less than, equal to, or greater than the second.
**
** Preconditions for this routine:
**
**    pA!=0
**    pA->isNull==0
**    pB!=0
**    pB->isNull==0
*/
static int decimal_cmp(const Decimal *pA, const Decimal *pB){
  int nASig, nBSig, rc, n;
  if( pA->sign!=pB->sign ){
    return pA->sign ? -1 : +1;
  }
  if( pA->sign ){
    const Decimal *pTemp = pA;
    pA = pB;
    pB = pTemp;
  }
  nASig = pA->nDigit - pA->nFrac;
  nBSig = pB->nDigit - pB->nFrac;
  if( nASig!=nBSig ){
    return nASig - nBSig;
  }
  n = pA->nDigit;
  if( n>pB->nDigit ) n = pB->nDigit;
  rc = memcmp(pA->a, pB->a, n);
  if( rc==0 ){
    rc = pA->nDigit - pB->nDigit;
  }
  return rc;
}

/*
** SQL Function:   decimal_cmp(X, Y)
**
** Return negative, zero, or positive if X is less then, equal to, or
** greater than Y.
*/
static void decimalCmpFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  Decimal *pA = 0, *pB = 0;
  int rc;

  UNUSED_PARAMETER(argc);
  pA = decimal_new(context, argv[0], 0, 0);
  if( pA==0 || pA->isNull ) goto cmp_done;
  pB = decimal_new(context, argv[1], 0, 0);
  if( pB==0 || pB->isNull ) goto cmp_done;
  rc = decimal_cmp(pA, pB);
  if( rc<0 ) rc = -1;
  else if( rc>0 ) rc = +1;
  sqlite3_result_int(context, rc);
cmp_done:
  decimal_free(pA);
  decimal_free(pB);
}

/*
** Expand the Decimal so that it has a least nDigit digits and nFrac
** digits to the right of the decimal point.
*/
static void decimal_expand(Decimal *p, int nDigit, int nFrac){
  int nAddSig;
  int nAddFrac;
  if( p==0 ) return;
  nAddFrac = nFrac - p->nFrac;
  nAddSig = (nDigit - p->nDigit) - nAddFrac;
  if( nAddFrac==0 && nAddSig==0 ) return;
  p->a = sqlite3_realloc64(p->a, nDigit+1);
  if( p->a==0 ){
    p->oom = 1;
    return;
  }
  if( nAddSig ){
    memmove(p->a+nAddSig, p->a, p->nDigit);
    memset(p->a, 0, nAddSig);
    p->nDigit += nAddSig;
  }
  if( nAddFrac ){
    memset(p->a+p->nDigit, 0, nAddFrac);
    p->nDigit += nAddFrac;
    p->nFrac += nAddFrac;
  }
}

/*
** Add the value pB into pA.
**
** Both pA and pB might become denormalized by this routine.
*/
static void decimal_add(Decimal *pA, Decimal *pB){
  int nSig, nFrac, nDigit;
  int i, rc;
  if( pA==0 ){
    return;
  }
  if( pA->oom || pB==0 || pB->oom ){
    pA->oom = 1;
    return;
  }
  if( pA->isNull || pB->isNull ){
    pA->isNull = 1;
    return;
  }
  nSig = pA->nDigit - pA->nFrac;
  if( nSig && pA->a[0]==0 ) nSig--;
  if( nSig<pB->nDigit-pB->nFrac ){
    nSig = pB->nDigit - pB->nFrac;
  }
  nFrac = pA->nFrac;
  if( nFrac<pB->nFrac ) nFrac = pB->nFrac;
  nDigit = nSig + nFrac + 1;
  decimal_expand(pA, nDigit, nFrac);
  decimal_expand(pB, nDigit, nFrac);
  if( pA->oom || pB->oom ){
    pA->oom = 1;
  }else{
    if( pA->sign==pB->sign ){
      int carry = 0;
      for(i=nDigit-1; i>=0; i--){
        int x = pA->a[i] + pB->a[i] + carry;
        if( x>=10 ){
          carry = 1;
          pA->a[i] = x - 10;
        }else{
          carry = 0;
          pA->a[i] = x;
        }
      }
    }else{
      signed char *aA, *aB;
      int borrow = 0;
      rc = memcmp(pA->a, pB->a, nDigit);
      if( rc<0 ){
        aA = pB->a;
        aB = pA->a;
        pA->sign = !pA->sign;
      }else{
        aA = pA->a;
        aB = pB->a;
      }
      for(i=nDigit-1; i>=0; i--){
        int x = aA[i] - aB[i] - borrow;
        if( x<0 ){
          pA->a[i] = x+10;
          borrow = 1;
        }else{
          pA->a[i] = x;
          borrow = 0;
        }
      }
    }
  }
}

/*
** Compare text in decimal order.
*/
static int decimalCollFunc(
  void *notUsed,
  int nKey1, const void *pKey1,
  int nKey2, const void *pKey2
){
  const unsigned char *zA = (const unsigned char*)pKey1;
  const unsigned char *zB = (const unsigned char*)pKey2;
  Decimal *pA = decimal_new(0, 0, nKey1, zA);
  Decimal *pB = decimal_new(0, 0, nKey2, zB);
  int rc;
  UNUSED_PARAMETER(notUsed);
  if( pA==0 || pB==0 ){
    rc = 0;
  }else{
    rc = decimal_cmp(pA, pB);
  }
  decimal_free(pA);
  decimal_free(pB);
  return rc;
}


/*
** SQL Function:   decimal_add(X, Y)
**                 decimal_sub(X, Y)
**
** Return the sum or difference of X and Y.
*/
static void decimalAddFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  Decimal *pA = decimal_new(context, argv[0], 0, 0);
  Decimal *pB = decimal_new(context, argv[1], 0, 0);
  UNUSED_PARAMETER(argc);
  decimal_add(pA, pB);
  decimal_result(context, pA);
  decimal_free(pA);
  decimal_free(pB);
}
static void decimalSubFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  Decimal *pA = decimal_new(context, argv[0], 0, 0);
  Decimal *pB = decimal_new(context, argv[1], 0, 0);
  UNUSED_PARAMETER(argc);
  if( pB==0 ) return;
  pB->sign = !pB->sign;
  decimal_add(pA, pB);
  decimal_result(context, pA);
  decimal_free(pA);
  decimal_free(pB);
}

/* Aggregate funcion:   decimal_sum(X)
**
** Works like sum() except that it uses decimal arithmetic for unlimited
** precision.
*/
static void decimalSumStep(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  Decimal *p;
  Decimal *pArg;
  UNUSED_PARAMETER(argc);
  p = sqlite3_aggregate_context(context, sizeof(*p));
  if( p==0 ) return;
  if( !p->isInit ){
    p->isInit = 1;
    p->a = sqlite3_malloc(2);
    if( p->a==0 ){
      p->oom = 1;
    }else{
      p->a[0] = 0;
    }
    p->nDigit = 1;
    p->nFrac = 0;
  }
  if( sqlite3_value_type(argv[0])==SQLITE_NULL ) return;
  pArg = decimal_new(context, argv[0], 0, 0);
  decimal_add(p, pArg);
  decimal_free(pArg);
}
static void decimalSumInverse(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  Decimal *p;
  Decimal *pArg;
  UNUSED_PARAMETER(argc);
  p = sqlite3_aggregate_context(context, sizeof(*p));
  if( p==0 ) return;
  if( sqlite3_value_type(argv[0])==SQLITE_NULL ) return;
  pArg = decimal_new(context, argv[0], 0, 0);
  if( pArg ) pArg->sign = !pArg->sign;
  decimal_add(p, pArg);
  decimal_free(pArg);
}
static void decimalSumValue(sqlite3_context *context){
  Decimal *p = sqlite3_aggregate_context(context, 0);
  if( p==0 ) return;
  decimal_result(context, p);
}
static void decimalSumFinalize(sqlite3_context *context){
  Decimal *p = sqlite3_aggregate_context(context, 0);
  if( p==0 ) return;
  decimal_result(context, p);
  decimal_clear(p);
}

/*
** SQL Function:   decimal_mul(X, Y)
**
** Return the product of X and Y.
**
** All significant digits after the decimal point are retained.
** Trailing zeros after the decimal point are omitted as long as
** the number of digits after the decimal point is no less than
** either the number of digits in either input.
*/
static void decimalMulFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  Decimal *pA = decimal_new(context, argv[0], 0, 0);
  Decimal *pB = decimal_new(context, argv[1], 0, 0);
  signed char *acc = 0;
  int i, j, k;
  int minFrac;
  UNUSED_PARAMETER(argc);
  if( pA==0 || pA->oom || pA->isNull
   || pB==0 || pB->oom || pB->isNull 
  ){
    goto mul_end;
  }
  acc = sqlite3_malloc64( pA->nDigit + pB->nDigit + 2 );
  if( acc==0 ){
    sqlite3_result_error_nomem(context);
    goto mul_end;
  }
  memset(acc, 0, pA->nDigit + pB->nDigit + 2);
  minFrac = pA->nFrac;
  if( pB->nFrac<minFrac ) minFrac = pB->nFrac;
  for(i=pA->nDigit-1; i>=0; i--){
    signed char f = pA->a[i];
    int carry = 0, x;
    for(j=pB->nDigit-1, k=i+j+3; j>=0; j--, k--){
      x = acc[k] + f*pB->a[j] + carry;
      acc[k] = x%10;
      carry = x/10;
    }
    x = acc[k] + carry;
    acc[k] = x%10;
    acc[k-1] += x/10;
  }
  sqlite3_free(pA->a);
  pA->a = acc;
  acc = 0;
  pA->nDigit += pB->nDigit + 2;
  pA->nFrac += pB->nFrac;
  pA->sign ^= pB->sign;
  while( pA->nFrac>minFrac && pA->a[pA->nDigit-1]==0 ){
    pA->nFrac--;
    pA->nDigit--;
  }
  decimal_result(context, pA);

mul_end:
  sqlite3_free(acc);
  decimal_free(pA);
  decimal_free(pB);
}

#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_decimal_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  static const struct {
    const char *zFuncName;
    int nArg;
    void (*xFunc)(sqlite3_context*,int,sqlite3_value**);
  } aFunc[] = {
    { "decimal",       1,   decimalFunc        },
    { "decimal_cmp",   2,   decimalCmpFunc     },
    { "decimal_add",   2,   decimalAddFunc     },
    { "decimal_sub",   2,   decimalSubFunc     },
    { "decimal_mul",   2,   decimalMulFunc     },
  };
  unsigned int i;
  (void)pzErrMsg;  /* Unused parameter */

  SQLITE_EXTENSION_INIT2(pApi);

  for(i=0; i<sizeof(aFunc)/sizeof(aFunc[0]) && rc==SQLITE_OK; i++){
    rc = sqlite3_create_function(db, aFunc[i].zFuncName, aFunc[i].nArg,
                   SQLITE_UTF8|SQLITE_INNOCUOUS|SQLITE_DETERMINISTIC,
                   0, aFunc[i].xFunc, 0, 0);
  }
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_window_function(db, "decimal_sum", 1,
                   SQLITE_UTF8|SQLITE_INNOCUOUS|SQLITE_DETERMINISTIC, 0,
                   decimalSumStep, decimalSumFinalize,
                   decimalSumValue, decimalSumInverse, 0);
  }
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_collation(db, "decimal", SQLITE_UTF8,
                                  0, decimalCollFunc);
  }
  return rc;
}
