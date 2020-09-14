/*
** 2007 May 6
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** $Id: icu.c,v 1.7 2007/12/13 21:54:11 drh Exp $
**
** This file implements an integration between the ICU library 
** ("International Components for Unicode", an open-source library 
** for handling unicode data) and SQLite. The integration uses 
** ICU to provide the following to SQLite:
**
**   * An implementation of the SQL regexp() function (and hence REGEXP
**     operator) using the ICU uregex_XX() APIs.
**
**   * Implementations of the SQL scalar upper() and lower() functions
**     for case mapping.
**
**   * Integration of ICU and SQLite collation sequences.
**
**   * An implementation of the LIKE operator that uses ICU to 
**     provide case-independent matching.
*/

#if !defined(SQLITE_CORE)                  \
 || defined(SQLITE_ENABLE_ICU)             \
 || defined(SQLITE_ENABLE_ICU_COLLATIONS)

/* Include ICU headers */
#include <unicode/utypes.h>
#include <unicode/uregex.h>
#include <unicode/ustring.h>
#include <unicode/ucol.h>

#include <assert.h>

#ifndef SQLITE_CORE
  #include "sqlite3ext.h"
  SQLITE_EXTENSION_INIT1
#else
  #include "sqlite3.h"
#endif

/*
** This function is called when an ICU function called from within
** the implementation of an SQL scalar function returns an error.
**
** The scalar function context passed as the first argument is 
** loaded with an error message based on the following two args.
*/
static void icuFunctionError(
  sqlite3_context *pCtx,       /* SQLite scalar function context */
  const char *zName,           /* Name of ICU function that failed */
  UErrorCode e                 /* Error code returned by ICU function */
){
  char zBuf[128];
  sqlite3_snprintf(128, zBuf, "ICU error: %s(): %s", zName, u_errorName(e));
  zBuf[127] = '\0';
  sqlite3_result_error(pCtx, zBuf, -1);
}

#if !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_ICU)

/*
** Maximum length (in bytes) of the pattern in a LIKE or GLOB
** operator.
*/
#ifndef SQLITE_MAX_LIKE_PATTERN_LENGTH
# define SQLITE_MAX_LIKE_PATTERN_LENGTH 50000
#endif

/*
** Version of sqlite3_free() that is always a function, never a macro.
*/
static void xFree(void *p){
  sqlite3_free(p);
}

/*
** This lookup table is used to help decode the first byte of
** a multi-byte UTF8 character. It is copied here from SQLite source
** code file utf8.c.
*/
static const unsigned char icuUtf8Trans1[] = {
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
  0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
  0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x00, 0x01, 0x02, 0x03, 0x00, 0x01, 0x00, 0x00,
};

#define SQLITE_ICU_READ_UTF8(zIn, c)                       \
  c = *(zIn++);                                            \
  if( c>=0xc0 ){                                           \
    c = icuUtf8Trans1[c-0xc0];                             \
    while( (*zIn & 0xc0)==0x80 ){                          \
      c = (c<<6) + (0x3f & *(zIn++));                      \
    }                                                      \
  }

#define SQLITE_ICU_SKIP_UTF8(zIn)                          \
  assert( *zIn );                                          \
  if( *(zIn++)>=0xc0 ){                                    \
    while( (*zIn & 0xc0)==0x80 ){zIn++;}                   \
  }


/*
** Compare two UTF-8 strings for equality where the first string is
** a "LIKE" expression. Return true (1) if they are the same and 
** false (0) if they are different.
*/
static int icuLikeCompare(
  const uint8_t *zPattern,   /* LIKE pattern */
  const uint8_t *zString,    /* The UTF-8 string to compare against */
  const UChar32 uEsc         /* The escape character */
){
  static const uint32_t MATCH_ONE = (uint32_t)'_';
  static const uint32_t MATCH_ALL = (uint32_t)'%';

  int prevEscape = 0;     /* True if the previous character was uEsc */

  while( 1 ){

    /* Read (and consume) the next character from the input pattern. */
    uint32_t uPattern;
    SQLITE_ICU_READ_UTF8(zPattern, uPattern);
    if( uPattern==0 ) break;

    /* There are now 4 possibilities:
    **
    **     1. uPattern is an unescaped match-all character "%",
    **     2. uPattern is an unescaped match-one character "_",
    **     3. uPattern is an unescaped escape character, or
    **     4. uPattern is to be handled as an ordinary character
    */
    if( uPattern==MATCH_ALL && !prevEscape && uPattern!=(uint32_t)uEsc ){
      /* Case 1. */
      uint8_t c;

      /* Skip any MATCH_ALL or MATCH_ONE characters that follow a
      ** MATCH_ALL. For each MATCH_ONE, skip one character in the 
      ** test string.
      */
      while( (c=*zPattern) == MATCH_ALL || c == MATCH_ONE ){
        if( c==MATCH_ONE ){
          if( *zString==0 ) return 0;
          SQLITE_ICU_SKIP_UTF8(zString);
        }
        zPattern++;
      }

      if( *zPattern==0 ) return 1;

      while( *zString ){
        if( icuLikeCompare(zPattern, zString, uEsc) ){
          return 1;
        }
        SQLITE_ICU_SKIP_UTF8(zString);
      }
      return 0;

    }else if( uPattern==MATCH_ONE && !prevEscape && uPattern!=(uint32_t)uEsc ){
      /* Case 2. */
      if( *zString==0 ) return 0;
      SQLITE_ICU_SKIP_UTF8(zString);

    }else if( uPattern==(uint32_t)uEsc && !prevEscape ){
      /* Case 3. */
      prevEscape = 1;

    }else{
      /* Case 4. */
      uint32_t uString;
      SQLITE_ICU_READ_UTF8(zString, uString);
      uString = (uint32_t)u_foldCase((UChar32)uString, U_FOLD_CASE_DEFAULT);
      uPattern = (uint32_t)u_foldCase((UChar32)uPattern, U_FOLD_CASE_DEFAULT);
      if( uString!=uPattern ){
        return 0;
      }
      prevEscape = 0;
    }
  }

  return *zString==0;
}

/*
** Implementation of the like() SQL function.  This function implements
** the build-in LIKE operator.  The first argument to the function is the
** pattern and the second argument is the string.  So, the SQL statements:
**
**       A LIKE B
**
** is implemented as like(B, A). If there is an escape character E, 
**
**       A LIKE B ESCAPE E
**
** is mapped to like(B, A, E).
*/
static void icuLikeFunc(
  sqlite3_context *context, 
  int argc, 
  sqlite3_value **argv
){
  const unsigned char *zA = sqlite3_value_text(argv[0]);
  const unsigned char *zB = sqlite3_value_text(argv[1]);
  UChar32 uEsc = 0;

  /* Limit the length of the LIKE or GLOB pattern to avoid problems
  ** of deep recursion and N*N behavior in patternCompare().
  */
  if( sqlite3_value_bytes(argv[0])>SQLITE_MAX_LIKE_PATTERN_LENGTH ){
    sqlite3_result_error(context, "LIKE or GLOB pattern too complex", -1);
    return;
  }


  if( argc==3 ){
    /* The escape character string must consist of a single UTF-8 character.
    ** Otherwise, return an error.
    */
    int nE= sqlite3_value_bytes(argv[2]);
    const unsigned char *zE = sqlite3_value_text(argv[2]);
    int i = 0;
    if( zE==0 ) return;
    U8_NEXT(zE, i, nE, uEsc);
    if( i!=nE){
      sqlite3_result_error(context, 
          "ESCAPE expression must be a single character", -1);
      return;
    }
  }

  if( zA && zB ){
    sqlite3_result_int(context, icuLikeCompare(zA, zB, uEsc));
  }
}

/*
** Function to delete compiled regexp objects. Registered as
** a destructor function with sqlite3_set_auxdata().
*/
static void icuRegexpDelete(void *p){
  URegularExpression *pExpr = (URegularExpression *)p;
  uregex_close(pExpr);
}

/*
** Implementation of SQLite REGEXP operator. This scalar function takes
** two arguments. The first is a regular expression pattern to compile
** the second is a string to match against that pattern. If either 
** argument is an SQL NULL, then NULL Is returned. Otherwise, the result
** is 1 if the string matches the pattern, or 0 otherwise.
**
** SQLite maps the regexp() function to the regexp() operator such
** that the following two are equivalent:
**
**     zString REGEXP zPattern
**     regexp(zPattern, zString)
**
** Uses the following ICU regexp APIs:
**
**     uregex_open()
**     uregex_matches()
**     uregex_close()
*/
static void icuRegexpFunc(sqlite3_context *p, int nArg, sqlite3_value **apArg){
  UErrorCode status = U_ZERO_ERROR;
  URegularExpression *pExpr;
  UBool res;
  const UChar *zString = sqlite3_value_text16(apArg[1]);

  (void)nArg;  /* Unused parameter */

  /* If the left hand side of the regexp operator is NULL, 
  ** then the result is also NULL. 
  */
  if( !zString ){
    return;
  }

  pExpr = sqlite3_get_auxdata(p, 0);
  if( !pExpr ){
    const UChar *zPattern = sqlite3_value_text16(apArg[0]);
    if( !zPattern ){
      return;
    }
    pExpr = uregex_open(zPattern, -1, 0, 0, &status);

    if( U_SUCCESS(status) ){
      sqlite3_set_auxdata(p, 0, pExpr, icuRegexpDelete);
    }else{
      assert(!pExpr);
      icuFunctionError(p, "uregex_open", status);
      return;
    }
  }

  /* Configure the text that the regular expression operates on. */
  uregex_setText(pExpr, zString, -1, &status);
  if( !U_SUCCESS(status) ){
    icuFunctionError(p, "uregex_setText", status);
    return;
  }

  /* Attempt the match */
  res = uregex_matches(pExpr, 0, &status);
  if( !U_SUCCESS(status) ){
    icuFunctionError(p, "uregex_matches", status);
    return;
  }

  /* Set the text that the regular expression operates on to a NULL
  ** pointer. This is not really necessary, but it is tidier than 
  ** leaving the regular expression object configured with an invalid
  ** pointer after this function returns.
  */
  uregex_setText(pExpr, 0, 0, &status);

  /* Return 1 or 0. */
  sqlite3_result_int(p, res ? 1 : 0);
}

/*
** Implementations of scalar functions for case mapping - upper() and 
** lower(). Function upper() converts its input to upper-case (ABC).
** Function lower() converts to lower-case (abc).
**
** ICU provides two types of case mapping, "general" case mapping and
** "language specific". Refer to ICU documentation for the differences
** between the two.
**
** To utilise "general" case mapping, the upper() or lower() scalar 
** functions are invoked with one argument:
**
**     upper('ABC') -> 'abc'
**     lower('abc') -> 'ABC'
**
** To access ICU "language specific" case mapping, upper() or lower()
** should be invoked with two arguments. The second argument is the name
** of the locale to use. Passing an empty string ("") or SQL NULL value
** as the second argument is the same as invoking the 1 argument version
** of upper() or lower().
**
**     lower('I', 'en_us') -> 'i'
**     lower('I', 'tr_tr') -> '\u131' (small dotless i)
**
** http://www.icu-project.org/userguide/posix.html#case_mappings
*/
static void icuCaseFunc16(sqlite3_context *p, int nArg, sqlite3_value **apArg){
  const UChar *zInput;            /* Pointer to input string */
  UChar *zOutput = 0;             /* Pointer to output buffer */
  int nInput;                     /* Size of utf-16 input string in bytes */
  int nOut;                       /* Size of output buffer in bytes */
  int cnt;
  int bToUpper;                   /* True for toupper(), false for tolower() */
  UErrorCode status;
  const char *zLocale = 0;

  assert(nArg==1 || nArg==2);
  bToUpper = (sqlite3_user_data(p)!=0);
  if( nArg==2 ){
    zLocale = (const char *)sqlite3_value_text(apArg[1]);
  }

  zInput = sqlite3_value_text16(apArg[0]);
  if( !zInput ){
    return;
  }
  nOut = nInput = sqlite3_value_bytes16(apArg[0]);
  if( nOut==0 ){
    sqlite3_result_text16(p, "", 0, SQLITE_STATIC);
    return;
  }

  for(cnt=0; cnt<2; cnt++){
    UChar *zNew = sqlite3_realloc(zOutput, nOut);
    if( zNew==0 ){
      sqlite3_free(zOutput);
      sqlite3_result_error_nomem(p);
      return;
    }
    zOutput = zNew;
    status = U_ZERO_ERROR;
    if( bToUpper ){
      nOut = 2*u_strToUpper(zOutput,nOut/2,zInput,nInput/2,zLocale,&status);
    }else{
      nOut = 2*u_strToLower(zOutput,nOut/2,zInput,nInput/2,zLocale,&status);
    }

    if( U_SUCCESS(status) ){
      sqlite3_result_text16(p, zOutput, nOut, xFree);
    }else if( status==U_BUFFER_OVERFLOW_ERROR ){
      assert( cnt==0 );
      continue;
    }else{
      icuFunctionError(p, bToUpper ? "u_strToUpper" : "u_strToLower", status);
    }
    return;
  }
  assert( 0 );     /* Unreachable */
}

#endif /* !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_ICU) */

/*
** Collation sequence destructor function. The pCtx argument points to
** a UCollator structure previously allocated using ucol_open().
*/
static void icuCollationDel(void *pCtx){
  UCollator *p = (UCollator *)pCtx;
  ucol_close(p);
}

/*
** Collation sequence comparison function. The pCtx argument points to
** a UCollator structure previously allocated using ucol_open().
*/
static int icuCollationColl(
  void *pCtx,
  int nLeft,
  const void *zLeft,
  int nRight,
  const void *zRight
){
  UCollationResult res;
  UCollator *p = (UCollator *)pCtx;
  res = ucol_strcoll(p, (UChar *)zLeft, nLeft/2, (UChar *)zRight, nRight/2);
  switch( res ){
    case UCOL_LESS:    return -1;
    case UCOL_GREATER: return +1;
    case UCOL_EQUAL:   return 0;
  }
  assert(!"Unexpected return value from ucol_strcoll()");
  return 0;
}

/*
** Implementation of the scalar function icu_load_collation().
**
** This scalar function is used to add ICU collation based collation 
** types to an SQLite database connection. It is intended to be called
** as follows:
**
**     SELECT icu_load_collation(<locale>, <collation-name>);
**
** Where <locale> is a string containing an ICU locale identifier (i.e.
** "en_AU", "tr_TR" etc.) and <collation-name> is the name of the
** collation sequence to create.
*/
static void icuLoadCollation(
  sqlite3_context *p, 
  int nArg, 
  sqlite3_value **apArg
){
  sqlite3 *db = (sqlite3 *)sqlite3_user_data(p);
  UErrorCode status = U_ZERO_ERROR;
  const char *zLocale;      /* Locale identifier - (eg. "jp_JP") */
  const char *zName;        /* SQL Collation sequence name (eg. "japanese") */
  UCollator *pUCollator;    /* ICU library collation object */
  int rc;                   /* Return code from sqlite3_create_collation_x() */

  assert(nArg==2);
  (void)nArg; /* Unused parameter */
  zLocale = (const char *)sqlite3_value_text(apArg[0]);
  zName = (const char *)sqlite3_value_text(apArg[1]);

  if( !zLocale || !zName ){
    return;
  }

  pUCollator = ucol_open(zLocale, &status);
  if( !U_SUCCESS(status) ){
    icuFunctionError(p, "ucol_open", status);
    return;
  }
  assert(p);

  rc = sqlite3_create_collation_v2(db, zName, SQLITE_UTF16, (void *)pUCollator, 
      icuCollationColl, icuCollationDel
  );
  if( rc!=SQLITE_OK ){
    ucol_close(pUCollator);
    sqlite3_result_error(p, "Error registering collation function", -1);
  }
}

/*
** Register the ICU extension functions with database db.
*/
int sqlite3IcuInit(sqlite3 *db){
# define SQLITEICU_EXTRAFLAGS (SQLITE_DETERMINISTIC|SQLITE_INNOCUOUS)
  static const struct IcuScalar {
    const char *zName;                        /* Function name */
    unsigned char nArg;                       /* Number of arguments */
    unsigned int enc;                         /* Optimal text encoding */
    unsigned char iContext;                   /* sqlite3_user_data() context */
    void (*xFunc)(sqlite3_context*,int,sqlite3_value**);
  } scalars[] = {
    {"icu_load_collation",2,SQLITE_UTF8|SQLITE_DIRECTONLY,1, icuLoadCollation},
#if !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_ICU)
    {"regexp", 2, SQLITE_ANY|SQLITEICU_EXTRAFLAGS,         0, icuRegexpFunc},
    {"lower",  1, SQLITE_UTF16|SQLITEICU_EXTRAFLAGS,       0, icuCaseFunc16},
    {"lower",  2, SQLITE_UTF16|SQLITEICU_EXTRAFLAGS,       0, icuCaseFunc16},
    {"upper",  1, SQLITE_UTF16|SQLITEICU_EXTRAFLAGS,       1, icuCaseFunc16},
    {"upper",  2, SQLITE_UTF16|SQLITEICU_EXTRAFLAGS,       1, icuCaseFunc16},
    {"lower",  1, SQLITE_UTF8|SQLITEICU_EXTRAFLAGS,        0, icuCaseFunc16},
    {"lower",  2, SQLITE_UTF8|SQLITEICU_EXTRAFLAGS,        0, icuCaseFunc16},
    {"upper",  1, SQLITE_UTF8|SQLITEICU_EXTRAFLAGS,        1, icuCaseFunc16},
    {"upper",  2, SQLITE_UTF8|SQLITEICU_EXTRAFLAGS,        1, icuCaseFunc16},
    {"like",   2, SQLITE_UTF8|SQLITEICU_EXTRAFLAGS,        0, icuLikeFunc},
    {"like",   3, SQLITE_UTF8|SQLITEICU_EXTRAFLAGS,        0, icuLikeFunc},
#endif /* !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_ICU) */
  };
  int rc = SQLITE_OK;
  int i;
  
  for(i=0; rc==SQLITE_OK && i<(int)(sizeof(scalars)/sizeof(scalars[0])); i++){
    const struct IcuScalar *p = &scalars[i];
    rc = sqlite3_create_function(
        db, p->zName, p->nArg, p->enc, 
        p->iContext ? (void*)db : (void*)0,
        p->xFunc, 0, 0
    );
  }

  return rc;
}

#if !SQLITE_CORE
#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_icu_init(
  sqlite3 *db, 
  char **pzErrMsg,
  const sqlite3_api_routines *pApi
){
  SQLITE_EXTENSION_INIT2(pApi)
  return sqlite3IcuInit(db);
}
#endif

#endif
