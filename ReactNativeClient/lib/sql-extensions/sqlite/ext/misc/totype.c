/*
** 2013-10-14
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
** This SQLite extension implements functions tointeger(X) and toreal(X).
**
** If X is an integer, real, or string value that can be
** losslessly represented as an integer, then tointeger(X)
** returns the corresponding integer value.
** If X is an 8-byte BLOB then that blob is interpreted as
** a signed two-compliment little-endian encoding of an integer
** and tointeger(X) returns the corresponding integer value.
** Otherwise tointeger(X) return NULL.
**
** If X is an integer, real, or string value that can be
** convert into a real number, preserving at least 15 digits
** of precision, then toreal(X) returns the corresponding real value.
** If X is an 8-byte BLOB then that blob is interpreted as
** a 64-bit IEEE754 big-endian floating point value
** and toreal(X) returns the corresponding real value.
** Otherwise toreal(X) return NULL.
**
** Note that tointeger(X) of an 8-byte BLOB assumes a little-endian
** encoding whereas toreal(X) of an 8-byte BLOB assumes a big-endian
** encoding.
*/
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1
#include <assert.h>
#include <string.h>

/*
** Determine if this is running on a big-endian or little-endian
** processor
*/
#if defined(i386) || defined(__i386__) || defined(_M_IX86)\
                             || defined(__x86_64) || defined(__x86_64__)
# define TOTYPE_BIGENDIAN    0
# define TOTYPE_LITTLEENDIAN 1
#else
  const int totype_one = 1;
# define TOTYPE_BIGENDIAN    (*(char *)(&totype_one)==0)
# define TOTYPE_LITTLEENDIAN (*(char *)(&totype_one)==1)
#endif

/*
** Constants for the largest and smallest possible 64-bit signed integers.
** These macros are designed to work correctly on both 32-bit and 64-bit
** compilers.
*/
#ifndef LARGEST_INT64
# define LARGEST_INT64   (0xffffffff|(((sqlite3_int64)0x7fffffff)<<32))
#endif

#ifndef SMALLEST_INT64
# define SMALLEST_INT64  (((sqlite3_int64)-1) - LARGEST_INT64)
#endif

/*
** Return TRUE if character c is a whitespace character
*/
static int totypeIsspace(unsigned char c){
  return c==' ' || c=='\t' || c=='\n' || c=='\v' || c=='\f' || c=='\r';
}

/*
** Return TRUE if character c is a digit
*/
static int totypeIsdigit(unsigned char c){
  return c>='0' && c<='9';
}

/*
** Compare the 19-character string zNum against the text representation
** value 2^63:  9223372036854775808.  Return negative, zero, or positive
** if zNum is less than, equal to, or greater than the string.
** Note that zNum must contain exactly 19 characters.
**
** Unlike memcmp() this routine is guaranteed to return the difference
** in the values of the last digit if the only difference is in the
** last digit.  So, for example,
**
**      totypeCompare2pow63("9223372036854775800")
**
** will return -8.
*/
static int totypeCompare2pow63(const char *zNum){
  int c = 0;
  int i;
                    /* 012345678901234567 */
  const char *pow63 = "922337203685477580";
  for(i=0; c==0 && i<18; i++){
    c = (zNum[i]-pow63[i])*10;
  }
  if( c==0 ){
    c = zNum[18] - '8';
  }
  return c;
}

/*
** Convert zNum to a 64-bit signed integer.
**
** If the zNum value is representable as a 64-bit twos-complement
** integer, then write that value into *pNum and return 0.
**
** If zNum is exactly 9223372036854665808, return 2.  This special
** case is broken out because while 9223372036854665808 cannot be a
** signed 64-bit integer, its negative -9223372036854665808 can be.
**
** If zNum is too big for a 64-bit integer and is not
** 9223372036854665808  or if zNum contains any non-numeric text,
** then return 1.
**
** The string is not necessarily zero-terminated.
*/
static int totypeAtoi64(const char *zNum, sqlite3_int64 *pNum, int length){
  sqlite3_uint64 u = 0;
  int neg = 0; /* assume positive */
  int i;
  int c = 0;
  int nonNum = 0;
  const char *zStart;
  const char *zEnd = zNum + length;

  while( zNum<zEnd && totypeIsspace(*zNum) ) zNum++;
  if( zNum<zEnd ){
    if( *zNum=='-' ){
      neg = 1;
      zNum++;
    }else if( *zNum=='+' ){
      zNum++;
    }
  }
  zStart = zNum;
  while( zNum<zEnd && zNum[0]=='0' ){ zNum++; } /* Skip leading zeros. */
  for(i=0; &zNum[i]<zEnd && (c=zNum[i])>='0' && c<='9'; i++){
    u = u*10 + c - '0';
  }
  if( u>LARGEST_INT64 ){
    *pNum = SMALLEST_INT64;
  }else if( neg ){
    *pNum = -(sqlite3_int64)u;
  }else{
    *pNum = (sqlite3_int64)u;
  }
  if( (c!=0 && &zNum[i]<zEnd) || (i==0 && zStart==zNum) || i>19 || nonNum ){
    /* zNum is empty or contains non-numeric text or is longer
    ** than 19 digits (thus guaranteeing that it is too large) */
    return 1;
  }else if( i<19 ){
    /* Less than 19 digits, so we know that it fits in 64 bits */
    assert( u<=LARGEST_INT64 );
    return 0;
  }else{
    /* zNum is a 19-digit numbers.  Compare it against 9223372036854775808. */
    c = totypeCompare2pow63(zNum);
    if( c<0 ){
      /* zNum is less than 9223372036854775808 so it fits */
      assert( u<=LARGEST_INT64 );
      return 0;
    }else if( c>0 ){
      /* zNum is greater than 9223372036854775808 so it overflows */
      return 1;
    }else{
      /* zNum is exactly 9223372036854775808.  Fits if negative.  The
      ** special case 2 overflow if positive */
      assert( u-1==LARGEST_INT64 );
      assert( (*pNum)==SMALLEST_INT64 );
      return neg ? 0 : 2;
    }
  }
}

/*
** The string z[] is an text representation of a real number.
** Convert this string to a double and write it into *pResult.
**
** The string is not necessarily zero-terminated.
**
** Return TRUE if the result is a valid real number (or integer) and FALSE
** if the string is empty or contains extraneous text.  Valid numbers
** are in one of these formats:
**
**    [+-]digits[E[+-]digits]
**    [+-]digits.[digits][E[+-]digits]
**    [+-].digits[E[+-]digits]
**
** Leading and trailing whitespace is ignored for the purpose of determining
** validity.
**
** If some prefix of the input string is a valid number, this routine
** returns FALSE but it still converts the prefix and writes the result
** into *pResult.
*/
static int totypeAtoF(const char *z, double *pResult, int length){
  const char *zEnd = z + length;
  /* sign * significand * (10 ^ (esign * exponent)) */
  int sign = 1;    /* sign of significand */
  sqlite3_int64 s = 0;       /* significand */
  int d = 0;       /* adjust exponent for shifting decimal point */
  int esign = 1;   /* sign of exponent */
  int e = 0;       /* exponent */
  int eValid = 1;  /* True exponent is either not used or is well-formed */
  double result;
  int nDigits = 0;
  int nonNum = 0;

  *pResult = 0.0;   /* Default return value, in case of an error */

  /* skip leading spaces */
  while( z<zEnd && totypeIsspace(*z) ) z++;
  if( z>=zEnd ) return 0;

  /* get sign of significand */
  if( *z=='-' ){
    sign = -1;
    z++;
  }else if( *z=='+' ){
    z++;
  }

  /* skip leading zeroes */
  while( z<zEnd && z[0]=='0' ) z++, nDigits++;

  /* copy max significant digits to significand */
  while( z<zEnd && totypeIsdigit(*z) && s<((LARGEST_INT64-9)/10) ){
    s = s*10 + (*z - '0');
    z++, nDigits++;
  }

  /* skip non-significant significand digits
  ** (increase exponent by d to shift decimal left) */
  while( z<zEnd && totypeIsdigit(*z) ) z++, nDigits++, d++;
  if( z>=zEnd ) goto totype_atof_calc;

  /* if decimal point is present */
  if( *z=='.' ){
    z++;
    /* copy digits from after decimal to significand
    ** (decrease exponent by d to shift decimal right) */
    while( z<zEnd && totypeIsdigit(*z) && s<((LARGEST_INT64-9)/10) ){
      s = s*10 + (*z - '0');
      z++, nDigits++, d--;
    }
    /* skip non-significant digits */
    while( z<zEnd && totypeIsdigit(*z) ) z++, nDigits++;
  }
  if( z>=zEnd ) goto totype_atof_calc;

  /* if exponent is present */
  if( *z=='e' || *z=='E' ){
    z++;
    eValid = 0;
    if( z>=zEnd ) goto totype_atof_calc;
    /* get sign of exponent */
    if( *z=='-' ){
      esign = -1;
      z++;
    }else if( *z=='+' ){
      z++;
    }
    /* copy digits to exponent */
    while( z<zEnd && totypeIsdigit(*z) ){
      e = e<10000 ? (e*10 + (*z - '0')) : 10000;
      z++;
      eValid = 1;
    }
  }

  /* skip trailing spaces */
  if( nDigits && eValid ){
    while( z<zEnd && totypeIsspace(*z) ) z++;
  }

totype_atof_calc:
  /* adjust exponent by d, and update sign */
  e = (e*esign) + d;
  if( e<0 ) {
    esign = -1;
    e *= -1;
  } else {
    esign = 1;
  }

  /* if 0 significand */
  if( !s ) {
    /* In the IEEE 754 standard, zero is signed.
    ** Add the sign if we've seen at least one digit */
    result = (sign<0 && nDigits) ? -(double)0 : (double)0;
  } else {
    /* attempt to reduce exponent */
    if( esign>0 ){
      while( s<(LARGEST_INT64/10) && e>0 ) e--,s*=10;
    }else{
      while( !(s%10) && e>0 ) e--,s/=10;
    }

    /* adjust the sign of significand */
    s = sign<0 ? -s : s;

    /* if exponent, scale significand as appropriate
    ** and store in result. */
    if( e ){
      double scale = 1.0;
      /* attempt to handle extremely small/large numbers better */
      if( e>307 && e<342 ){
        while( e%308 ) { scale *= 1.0e+1; e -= 1; }
        if( esign<0 ){
          result = s / scale;
          result /= 1.0e+308;
        }else{
          result = s * scale;
          result *= 1.0e+308;
        }
      }else if( e>=342 ){
        if( esign<0 ){
          result = 0.0*s;
        }else{
          result = 1e308*1e308*s;  /* Infinity */
        }
      }else{
        /* 1.0e+22 is the largest power of 10 than can be
        ** represented exactly. */
        while( e%22 ) { scale *= 1.0e+1; e -= 1; }
        while( e>0 ) { scale *= 1.0e+22; e -= 22; }
        if( esign<0 ){
          result = s / scale;
        }else{
          result = s * scale;
        }
      }
    } else {
      result = (double)s;
    }
  }

  /* store the result */
  *pResult = result;

  /* return true if number and no extra non-whitespace chracters after */
  return z>=zEnd && nDigits>0 && eValid && nonNum==0;
}

/*
** tointeger(X):  If X is any value (integer, double, blob, or string) that
** can be losslessly converted into an integer, then make the conversion and
** return the result.  Otherwise, return NULL.
*/
static void tointegerFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  assert( argc==1 );
  (void)argc;
  switch( sqlite3_value_type(argv[0]) ){
    case SQLITE_FLOAT: {
      double rVal = sqlite3_value_double(argv[0]);
      sqlite3_int64 iVal = (sqlite3_int64)rVal;
      if( rVal==(double)iVal ){
        sqlite3_result_int64(context, iVal);
      }
      break;
    }
    case SQLITE_INTEGER: {
      sqlite3_result_int64(context, sqlite3_value_int64(argv[0]));
      break;
    }
    case SQLITE_BLOB: {
      const unsigned char *zBlob = sqlite3_value_blob(argv[0]);
      if( zBlob ){
        int nBlob = sqlite3_value_bytes(argv[0]);
        if( nBlob==sizeof(sqlite3_int64) ){
          sqlite3_int64 iVal;
          if( TOTYPE_BIGENDIAN ){
            int i;
            unsigned char zBlobRev[sizeof(sqlite3_int64)];
            for(i=0; i<sizeof(sqlite3_int64); i++){
              zBlobRev[i] = zBlob[sizeof(sqlite3_int64)-1-i];
            }
            memcpy(&iVal, zBlobRev, sizeof(sqlite3_int64));
          }else{
            memcpy(&iVal, zBlob, sizeof(sqlite3_int64));
          }
          sqlite3_result_int64(context, iVal);
        }
      }
      break;
    }
    case SQLITE_TEXT: {
      const unsigned char *zStr = sqlite3_value_text(argv[0]);
      if( zStr ){
        int nStr = sqlite3_value_bytes(argv[0]);
        if( nStr && !totypeIsspace(zStr[0]) ){
          sqlite3_int64 iVal;
          if( !totypeAtoi64((const char*)zStr, &iVal, nStr) ){
            sqlite3_result_int64(context, iVal);
          }
        }
      }
      break;
    }
    default: {
      assert( sqlite3_value_type(argv[0])==SQLITE_NULL );
      break;
    }
  }
}

/*
** toreal(X): If X is any value (integer, double, blob, or string) that can
** be losslessly converted into a real number, then do so and return that
** real number.  Otherwise return NULL.
*/
#if defined(_MSC_VER)
#pragma warning(disable: 4748)
#pragma optimize("", off)
#endif
static void torealFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  assert( argc==1 );
  (void)argc;
  switch( sqlite3_value_type(argv[0]) ){
    case SQLITE_FLOAT: {
      sqlite3_result_double(context, sqlite3_value_double(argv[0]));
      break;
    }
    case SQLITE_INTEGER: {
      sqlite3_int64 iVal = sqlite3_value_int64(argv[0]);
      double rVal = (double)iVal;
      if( iVal==(sqlite3_int64)rVal ){
        sqlite3_result_double(context, rVal);
      }
      break;
    }
    case SQLITE_BLOB: {
      const unsigned char *zBlob = sqlite3_value_blob(argv[0]);
      if( zBlob ){
        int nBlob = sqlite3_value_bytes(argv[0]);
        if( nBlob==sizeof(double) ){
          double rVal;
          if( TOTYPE_LITTLEENDIAN ){
            int i;
            unsigned char zBlobRev[sizeof(double)];
            for(i=0; i<sizeof(double); i++){
              zBlobRev[i] = zBlob[sizeof(double)-1-i];
            }
            memcpy(&rVal, zBlobRev, sizeof(double));
          }else{
            memcpy(&rVal, zBlob, sizeof(double));
          }
          sqlite3_result_double(context, rVal);
        }
      }
      break;
    }
    case SQLITE_TEXT: {
      const unsigned char *zStr = sqlite3_value_text(argv[0]);
      if( zStr ){
        int nStr = sqlite3_value_bytes(argv[0]);
        if( nStr && !totypeIsspace(zStr[0]) && !totypeIsspace(zStr[nStr-1]) ){
          double rVal;
          if( totypeAtoF((const char*)zStr, &rVal, nStr) ){
            sqlite3_result_double(context, rVal);
            return;
          }
        }
      }
      break;
    }
    default: {
      assert( sqlite3_value_type(argv[0])==SQLITE_NULL );
      break;
    }
  }
}
#if defined(_MSC_VER)
#pragma optimize("", on)
#pragma warning(default: 4748)
#endif

#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_totype_init(
  sqlite3 *db,
  char **pzErrMsg,
  const sqlite3_api_routines *pApi
){
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  rc = sqlite3_create_function(db, "tointeger", 1,
        SQLITE_UTF8 | SQLITE_DETERMINISTIC | SQLITE_INNOCUOUS, 0,
        tointegerFunc, 0, 0);
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_function(db, "toreal", 1,
        SQLITE_UTF8 | SQLITE_DETERMINISTIC | SQLITE_INNOCUOUS, 0,
        torealFunc, 0, 0);
  }
  return rc;
}
