/*
** 2015-08-12
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
** This SQLite extension implements JSON functions.  The interface is
** modeled after MySQL JSON functions:
**
**     https://dev.mysql.com/doc/refman/5.7/en/json.html
**
** For the time being, all JSON is stored as pure text.  (We might add
** a JSONB type in the future which stores a binary encoding of JSON in
** a BLOB, but there is no support for JSONB in the current implementation.
** This implementation parses JSON text at 250 MB/s, so it is hard to see
** how JSONB might improve on that.)
*/
#if !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_JSON1)
#if !defined(SQLITEINT_H)
#include "sqlite3ext.h"
#endif
SQLITE_EXTENSION_INIT1
#include <assert.h>
#include <string.h>
#include <stdlib.h>
#include <stdarg.h>

/* Mark a function parameter as unused, to suppress nuisance compiler
** warnings. */
#ifndef UNUSED_PARAM
# define UNUSED_PARAM(X)  (void)(X)
#endif

#ifndef LARGEST_INT64
# define LARGEST_INT64  (0xffffffff|(((sqlite3_int64)0x7fffffff)<<32))
# define SMALLEST_INT64 (((sqlite3_int64)-1) - LARGEST_INT64)
#endif

#ifndef deliberate_fall_through
# define deliberate_fall_through
#endif

/*
** Versions of isspace(), isalnum() and isdigit() to which it is safe
** to pass signed char values.
*/
#ifdef sqlite3Isdigit
   /* Use the SQLite core versions if this routine is part of the
   ** SQLite amalgamation */
#  define safe_isdigit(x)  sqlite3Isdigit(x)
#  define safe_isalnum(x)  sqlite3Isalnum(x)
#  define safe_isxdigit(x) sqlite3Isxdigit(x)
#else
   /* Use the standard library for separate compilation */
#include <ctype.h>  /* amalgamator: keep */
#  define safe_isdigit(x)  isdigit((unsigned char)(x))
#  define safe_isalnum(x)  isalnum((unsigned char)(x))
#  define safe_isxdigit(x) isxdigit((unsigned char)(x))
#endif

/*
** Growing our own isspace() routine this way is twice as fast as
** the library isspace() function, resulting in a 7% overall performance
** increase for the parser.  (Ubuntu14.10 gcc 4.8.4 x64 with -Os).
*/
static const char jsonIsSpace[] = {
  0, 0, 0, 0, 0, 0, 0, 0,     0, 1, 1, 0, 0, 1, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  1, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,     0, 0, 0, 0, 0, 0, 0, 0,
};
#define safe_isspace(x) (jsonIsSpace[(unsigned char)x])

#ifndef SQLITE_AMALGAMATION
  /* Unsigned integer types.  These are already defined in the sqliteInt.h,
  ** but the definitions need to be repeated for separate compilation. */
  typedef sqlite3_uint64 u64;
  typedef unsigned int u32;
  typedef unsigned short int u16;
  typedef unsigned char u8;
#endif

/* Objects */
typedef struct JsonString JsonString;
typedef struct JsonNode JsonNode;
typedef struct JsonParse JsonParse;

/* An instance of this object represents a JSON string
** under construction.  Really, this is a generic string accumulator
** that can be and is used to create strings other than JSON.
*/
struct JsonString {
  sqlite3_context *pCtx;   /* Function context - put error messages here */
  char *zBuf;              /* Append JSON content here */
  u64 nAlloc;              /* Bytes of storage available in zBuf[] */
  u64 nUsed;               /* Bytes of zBuf[] currently used */
  u8 bStatic;              /* True if zBuf is static space */
  u8 bErr;                 /* True if an error has been encountered */
  char zSpace[100];        /* Initial static space */
};

/* JSON type values
*/
#define JSON_NULL     0
#define JSON_TRUE     1
#define JSON_FALSE    2
#define JSON_INT      3
#define JSON_REAL     4
#define JSON_STRING   5
#define JSON_ARRAY    6
#define JSON_OBJECT   7

/* The "subtype" set for JSON values */
#define JSON_SUBTYPE  74    /* Ascii for "J" */

/*
** Names of the various JSON types:
*/
static const char * const jsonType[] = {
  "null", "true", "false", "integer", "real", "text", "array", "object"
};

/* Bit values for the JsonNode.jnFlag field
*/
#define JNODE_RAW     0x01         /* Content is raw, not JSON encoded */
#define JNODE_ESCAPE  0x02         /* Content is text with \ escapes */
#define JNODE_REMOVE  0x04         /* Do not output */
#define JNODE_REPLACE 0x08         /* Replace with JsonNode.u.iReplace */
#define JNODE_PATCH   0x10         /* Patch with JsonNode.u.pPatch */
#define JNODE_APPEND  0x20         /* More ARRAY/OBJECT entries at u.iAppend */
#define JNODE_LABEL   0x40         /* Is a label of an object */


/* A single node of parsed JSON
*/
struct JsonNode {
  u8 eType;              /* One of the JSON_ type values */
  u8 jnFlags;            /* JNODE flags */
  u32 n;                 /* Bytes of content, or number of sub-nodes */
  union {
    const char *zJContent; /* Content for INT, REAL, and STRING */
    u32 iAppend;           /* More terms for ARRAY and OBJECT */
    u32 iKey;              /* Key for ARRAY objects in json_tree() */
    u32 iReplace;          /* Replacement content for JNODE_REPLACE */
    JsonNode *pPatch;      /* Node chain of patch for JNODE_PATCH */
  } u;
};

/* A completely parsed JSON string
*/
struct JsonParse {
  u32 nNode;         /* Number of slots of aNode[] used */
  u32 nAlloc;        /* Number of slots of aNode[] allocated */
  JsonNode *aNode;   /* Array of nodes containing the parse */
  const char *zJson; /* Original JSON string */
  u32 *aUp;          /* Index of parent of each node */
  u8 oom;            /* Set to true if out of memory */
  u8 nErr;           /* Number of errors seen */
  u16 iDepth;        /* Nesting depth */
  int nJson;         /* Length of the zJson string in bytes */
  u32 iHold;         /* Replace cache line with the lowest iHold value */
};

/*
** Maximum nesting depth of JSON for this implementation.
**
** This limit is needed to avoid a stack overflow in the recursive
** descent parser.  A depth of 2000 is far deeper than any sane JSON
** should go.
*/
#define JSON_MAX_DEPTH  2000

/**************************************************************************
** Utility routines for dealing with JsonString objects
**************************************************************************/

/* Set the JsonString object to an empty string
*/
static void jsonZero(JsonString *p){
  p->zBuf = p->zSpace;
  p->nAlloc = sizeof(p->zSpace);
  p->nUsed = 0;
  p->bStatic = 1;
}

/* Initialize the JsonString object
*/
static void jsonInit(JsonString *p, sqlite3_context *pCtx){
  p->pCtx = pCtx;
  p->bErr = 0;
  jsonZero(p);
}


/* Free all allocated memory and reset the JsonString object back to its
** initial state.
*/
static void jsonReset(JsonString *p){
  if( !p->bStatic ) sqlite3_free(p->zBuf);
  jsonZero(p);
}


/* Report an out-of-memory (OOM) condition 
*/
static void jsonOom(JsonString *p){
  p->bErr = 1;
  sqlite3_result_error_nomem(p->pCtx);
  jsonReset(p);
}

/* Enlarge pJson->zBuf so that it can hold at least N more bytes.
** Return zero on success.  Return non-zero on an OOM error
*/
static int jsonGrow(JsonString *p, u32 N){
  u64 nTotal = N<p->nAlloc ? p->nAlloc*2 : p->nAlloc+N+10;
  char *zNew;
  if( p->bStatic ){
    if( p->bErr ) return 1;
    zNew = sqlite3_malloc64(nTotal);
    if( zNew==0 ){
      jsonOom(p);
      return SQLITE_NOMEM;
    }
    memcpy(zNew, p->zBuf, (size_t)p->nUsed);
    p->zBuf = zNew;
    p->bStatic = 0;
  }else{
    zNew = sqlite3_realloc64(p->zBuf, nTotal);
    if( zNew==0 ){
      jsonOom(p);
      return SQLITE_NOMEM;
    }
    p->zBuf = zNew;
  }
  p->nAlloc = nTotal;
  return SQLITE_OK;
}

/* Append N bytes from zIn onto the end of the JsonString string.
*/
static void jsonAppendRaw(JsonString *p, const char *zIn, u32 N){
  if( N==0 ) return;
  if( (N+p->nUsed >= p->nAlloc) && jsonGrow(p,N)!=0 ) return;
  memcpy(p->zBuf+p->nUsed, zIn, N);
  p->nUsed += N;
}

/* Append formatted text (not to exceed N bytes) to the JsonString.
*/
static void jsonPrintf(int N, JsonString *p, const char *zFormat, ...){
  va_list ap;
  if( (p->nUsed + N >= p->nAlloc) && jsonGrow(p, N) ) return;
  va_start(ap, zFormat);
  sqlite3_vsnprintf(N, p->zBuf+p->nUsed, zFormat, ap);
  va_end(ap);
  p->nUsed += (int)strlen(p->zBuf+p->nUsed);
}

/* Append a single character
*/
static void jsonAppendChar(JsonString *p, char c){
  if( p->nUsed>=p->nAlloc && jsonGrow(p,1)!=0 ) return;
  p->zBuf[p->nUsed++] = c;
}

/* Append a comma separator to the output buffer, if the previous
** character is not '[' or '{'.
*/
static void jsonAppendSeparator(JsonString *p){
  char c;
  if( p->nUsed==0 ) return;
  c = p->zBuf[p->nUsed-1];
  if( c!='[' && c!='{' ) jsonAppendChar(p, ',');
}

/* Append the N-byte string in zIn to the end of the JsonString string
** under construction.  Enclose the string in "..." and escape
** any double-quotes or backslash characters contained within the
** string.
*/
static void jsonAppendString(JsonString *p, const char *zIn, u32 N){
  u32 i;
  if( (N+p->nUsed+2 >= p->nAlloc) && jsonGrow(p,N+2)!=0 ) return;
  p->zBuf[p->nUsed++] = '"';
  for(i=0; i<N; i++){
    unsigned char c = ((unsigned const char*)zIn)[i];
    if( c=='"' || c=='\\' ){
      json_simple_escape:
      if( (p->nUsed+N+3-i > p->nAlloc) && jsonGrow(p,N+3-i)!=0 ) return;
      p->zBuf[p->nUsed++] = '\\';
    }else if( c<=0x1f ){
      static const char aSpecial[] = {
         0, 0, 0, 0, 0, 0, 0, 0, 'b', 't', 'n', 0, 'f', 'r', 0, 0,
         0, 0, 0, 0, 0, 0, 0, 0,   0,   0,   0, 0,   0,   0, 0, 0
      };
      assert( sizeof(aSpecial)==32 );
      assert( aSpecial['\b']=='b' );
      assert( aSpecial['\f']=='f' );
      assert( aSpecial['\n']=='n' );
      assert( aSpecial['\r']=='r' );
      assert( aSpecial['\t']=='t' );
      if( aSpecial[c] ){
        c = aSpecial[c];
        goto json_simple_escape;
      }
      if( (p->nUsed+N+7+i > p->nAlloc) && jsonGrow(p,N+7-i)!=0 ) return;
      p->zBuf[p->nUsed++] = '\\';
      p->zBuf[p->nUsed++] = 'u';
      p->zBuf[p->nUsed++] = '0';
      p->zBuf[p->nUsed++] = '0';
      p->zBuf[p->nUsed++] = '0' + (c>>4);
      c = "0123456789abcdef"[c&0xf];
    }
    p->zBuf[p->nUsed++] = c;
  }
  p->zBuf[p->nUsed++] = '"';
  assert( p->nUsed<p->nAlloc );
}

/*
** Append a function parameter value to the JSON string under 
** construction.
*/
static void jsonAppendValue(
  JsonString *p,                 /* Append to this JSON string */
  sqlite3_value *pValue          /* Value to append */
){
  switch( sqlite3_value_type(pValue) ){
    case SQLITE_NULL: {
      jsonAppendRaw(p, "null", 4);
      break;
    }
    case SQLITE_INTEGER:
    case SQLITE_FLOAT: {
      const char *z = (const char*)sqlite3_value_text(pValue);
      u32 n = (u32)sqlite3_value_bytes(pValue);
      jsonAppendRaw(p, z, n);
      break;
    }
    case SQLITE_TEXT: {
      const char *z = (const char*)sqlite3_value_text(pValue);
      u32 n = (u32)sqlite3_value_bytes(pValue);
      if( sqlite3_value_subtype(pValue)==JSON_SUBTYPE ){
        jsonAppendRaw(p, z, n);
      }else{
        jsonAppendString(p, z, n);
      }
      break;
    }
    default: {
      if( p->bErr==0 ){
        sqlite3_result_error(p->pCtx, "JSON cannot hold BLOB values", -1);
        p->bErr = 2;
        jsonReset(p);
      }
      break;
    }
  }
}


/* Make the JSON in p the result of the SQL function.
*/
static void jsonResult(JsonString *p){
  if( p->bErr==0 ){
    sqlite3_result_text64(p->pCtx, p->zBuf, p->nUsed, 
                          p->bStatic ? SQLITE_TRANSIENT : sqlite3_free,
                          SQLITE_UTF8);
    jsonZero(p);
  }
  assert( p->bStatic );
}

/**************************************************************************
** Utility routines for dealing with JsonNode and JsonParse objects
**************************************************************************/

/*
** Return the number of consecutive JsonNode slots need to represent
** the parsed JSON at pNode.  The minimum answer is 1.  For ARRAY and
** OBJECT types, the number might be larger.
**
** Appended elements are not counted.  The value returned is the number
** by which the JsonNode counter should increment in order to go to the
** next peer value.
*/
static u32 jsonNodeSize(JsonNode *pNode){
  return pNode->eType>=JSON_ARRAY ? pNode->n+1 : 1;
}

/*
** Reclaim all memory allocated by a JsonParse object.  But do not
** delete the JsonParse object itself.
*/
static void jsonParseReset(JsonParse *pParse){
  sqlite3_free(pParse->aNode);
  pParse->aNode = 0;
  pParse->nNode = 0;
  pParse->nAlloc = 0;
  sqlite3_free(pParse->aUp);
  pParse->aUp = 0;
}

/*
** Free a JsonParse object that was obtained from sqlite3_malloc().
*/
static void jsonParseFree(JsonParse *pParse){
  jsonParseReset(pParse);
  sqlite3_free(pParse);
}

/*
** Convert the JsonNode pNode into a pure JSON string and
** append to pOut.  Subsubstructure is also included.  Return
** the number of JsonNode objects that are encoded.
*/
static void jsonRenderNode(
  JsonNode *pNode,               /* The node to render */
  JsonString *pOut,              /* Write JSON here */
  sqlite3_value **aReplace       /* Replacement values */
){
  if( pNode->jnFlags & (JNODE_REPLACE|JNODE_PATCH) ){
    if( pNode->jnFlags & JNODE_REPLACE ){
      jsonAppendValue(pOut, aReplace[pNode->u.iReplace]);
      return;
    }
    pNode = pNode->u.pPatch;
  }
  switch( pNode->eType ){
    default: {
      assert( pNode->eType==JSON_NULL );
      jsonAppendRaw(pOut, "null", 4);
      break;
    }
    case JSON_TRUE: {
      jsonAppendRaw(pOut, "true", 4);
      break;
    }
    case JSON_FALSE: {
      jsonAppendRaw(pOut, "false", 5);
      break;
    }
    case JSON_STRING: {
      if( pNode->jnFlags & JNODE_RAW ){
        jsonAppendString(pOut, pNode->u.zJContent, pNode->n);
        break;
      }
      /* no break */ deliberate_fall_through
    }
    case JSON_REAL:
    case JSON_INT: {
      jsonAppendRaw(pOut, pNode->u.zJContent, pNode->n);
      break;
    }
    case JSON_ARRAY: {
      u32 j = 1;
      jsonAppendChar(pOut, '[');
      for(;;){
        while( j<=pNode->n ){
          if( (pNode[j].jnFlags & JNODE_REMOVE)==0 ){
            jsonAppendSeparator(pOut);
            jsonRenderNode(&pNode[j], pOut, aReplace);
          }
          j += jsonNodeSize(&pNode[j]);
        }
        if( (pNode->jnFlags & JNODE_APPEND)==0 ) break;
        pNode = &pNode[pNode->u.iAppend];
        j = 1;
      }
      jsonAppendChar(pOut, ']');
      break;
    }
    case JSON_OBJECT: {
      u32 j = 1;
      jsonAppendChar(pOut, '{');
      for(;;){
        while( j<=pNode->n ){
          if( (pNode[j+1].jnFlags & JNODE_REMOVE)==0 ){
            jsonAppendSeparator(pOut);
            jsonRenderNode(&pNode[j], pOut, aReplace);
            jsonAppendChar(pOut, ':');
            jsonRenderNode(&pNode[j+1], pOut, aReplace);
          }
          j += 1 + jsonNodeSize(&pNode[j+1]);
        }
        if( (pNode->jnFlags & JNODE_APPEND)==0 ) break;
        pNode = &pNode[pNode->u.iAppend];
        j = 1;
      }
      jsonAppendChar(pOut, '}');
      break;
    }
  }
}

/*
** Return a JsonNode and all its descendents as a JSON string.
*/
static void jsonReturnJson(
  JsonNode *pNode,            /* Node to return */
  sqlite3_context *pCtx,      /* Return value for this function */
  sqlite3_value **aReplace    /* Array of replacement values */
){
  JsonString s;
  jsonInit(&s, pCtx);
  jsonRenderNode(pNode, &s, aReplace);
  jsonResult(&s);
  sqlite3_result_subtype(pCtx, JSON_SUBTYPE);
}

/*
** Translate a single byte of Hex into an integer.
** This routine only works if h really is a valid hexadecimal
** character:  0..9a..fA..F
*/
static u8 jsonHexToInt(int h){
  assert( (h>='0' && h<='9') ||  (h>='a' && h<='f') ||  (h>='A' && h<='F') );
#ifdef SQLITE_EBCDIC
  h += 9*(1&~(h>>4));
#else
  h += 9*(1&(h>>6));
#endif
  return (u8)(h & 0xf);
}

/*
** Convert a 4-byte hex string into an integer
*/
static u32 jsonHexToInt4(const char *z){
  u32 v;
  assert( safe_isxdigit(z[0]) );
  assert( safe_isxdigit(z[1]) );
  assert( safe_isxdigit(z[2]) );
  assert( safe_isxdigit(z[3]) );
  v = (jsonHexToInt(z[0])<<12)
    + (jsonHexToInt(z[1])<<8)
    + (jsonHexToInt(z[2])<<4)
    + jsonHexToInt(z[3]);
  return v;
}

/*
** Make the JsonNode the return value of the function.
*/
static void jsonReturn(
  JsonNode *pNode,            /* Node to return */
  sqlite3_context *pCtx,      /* Return value for this function */
  sqlite3_value **aReplace    /* Array of replacement values */
){
  switch( pNode->eType ){
    default: {
      assert( pNode->eType==JSON_NULL );
      sqlite3_result_null(pCtx);
      break;
    }
    case JSON_TRUE: {
      sqlite3_result_int(pCtx, 1);
      break;
    }
    case JSON_FALSE: {
      sqlite3_result_int(pCtx, 0);
      break;
    }
    case JSON_INT: {
      sqlite3_int64 i = 0;
      const char *z = pNode->u.zJContent;
      if( z[0]=='-' ){ z++; }
      while( z[0]>='0' && z[0]<='9' ){
        unsigned v = *(z++) - '0';
        if( i>=LARGEST_INT64/10 ){
          if( i>LARGEST_INT64/10 ) goto int_as_real;
          if( z[0]>='0' && z[0]<='9' ) goto int_as_real;
          if( v==9 ) goto int_as_real;
          if( v==8 ){
            if( pNode->u.zJContent[0]=='-' ){
              sqlite3_result_int64(pCtx, SMALLEST_INT64);
              goto int_done;
            }else{
              goto int_as_real;
            }
          }
        }
        i = i*10 + v;
      }
      if( pNode->u.zJContent[0]=='-' ){ i = -i; }
      sqlite3_result_int64(pCtx, i);
      int_done:
      break;
      int_as_real: i=0; /* no break */ deliberate_fall_through
    }
    case JSON_REAL: {
      double r;
#ifdef SQLITE_AMALGAMATION
      const char *z = pNode->u.zJContent;
      sqlite3AtoF(z, &r, sqlite3Strlen30(z), SQLITE_UTF8);
#else
      r = strtod(pNode->u.zJContent, 0);
#endif
      sqlite3_result_double(pCtx, r);
      break;
    }
    case JSON_STRING: {
#if 0 /* Never happens because JNODE_RAW is only set by json_set(),
      ** json_insert() and json_replace() and those routines do not
      ** call jsonReturn() */
      if( pNode->jnFlags & JNODE_RAW ){
        sqlite3_result_text(pCtx, pNode->u.zJContent, pNode->n,
                            SQLITE_TRANSIENT);
      }else 
#endif
      assert( (pNode->jnFlags & JNODE_RAW)==0 );
      if( (pNode->jnFlags & JNODE_ESCAPE)==0 ){
        /* JSON formatted without any backslash-escapes */
        sqlite3_result_text(pCtx, pNode->u.zJContent+1, pNode->n-2,
                            SQLITE_TRANSIENT);
      }else{
        /* Translate JSON formatted string into raw text */
        u32 i;
        u32 n = pNode->n;
        const char *z = pNode->u.zJContent;
        char *zOut;
        u32 j;
        zOut = sqlite3_malloc( n+1 );
        if( zOut==0 ){
          sqlite3_result_error_nomem(pCtx);
          break;
        }
        for(i=1, j=0; i<n-1; i++){
          char c = z[i];
          if( c!='\\' ){
            zOut[j++] = c;
          }else{
            c = z[++i];
            if( c=='u' ){
              u32 v = jsonHexToInt4(z+i+1);
              i += 4;
              if( v==0 ) break;
              if( v<=0x7f ){
                zOut[j++] = (char)v;
              }else if( v<=0x7ff ){
                zOut[j++] = (char)(0xc0 | (v>>6));
                zOut[j++] = 0x80 | (v&0x3f);
              }else{
                u32 vlo;
                if( (v&0xfc00)==0xd800
                  && i<n-6
                  && z[i+1]=='\\'
                  && z[i+2]=='u'
                  && ((vlo = jsonHexToInt4(z+i+3))&0xfc00)==0xdc00
                ){
                  /* We have a surrogate pair */
                  v = ((v&0x3ff)<<10) + (vlo&0x3ff) + 0x10000;
                  i += 6;
                  zOut[j++] = 0xf0 | (v>>18);
                  zOut[j++] = 0x80 | ((v>>12)&0x3f);
                  zOut[j++] = 0x80 | ((v>>6)&0x3f);
                  zOut[j++] = 0x80 | (v&0x3f);
                }else{
                  zOut[j++] = 0xe0 | (v>>12);
                  zOut[j++] = 0x80 | ((v>>6)&0x3f);
                  zOut[j++] = 0x80 | (v&0x3f);
                }
              }
            }else{
              if( c=='b' ){
                c = '\b';
              }else if( c=='f' ){
                c = '\f';
              }else if( c=='n' ){
                c = '\n';
              }else if( c=='r' ){
                c = '\r';
              }else if( c=='t' ){
                c = '\t';
              }
              zOut[j++] = c;
            }
          }
        }
        zOut[j] = 0;
        sqlite3_result_text(pCtx, zOut, j, sqlite3_free);
      }
      break;
    }
    case JSON_ARRAY:
    case JSON_OBJECT: {
      jsonReturnJson(pNode, pCtx, aReplace);
      break;
    }
  }
}

/* Forward reference */
static int jsonParseAddNode(JsonParse*,u32,u32,const char*);

/*
** A macro to hint to the compiler that a function should not be
** inlined.
*/
#if defined(__GNUC__)
#  define JSON_NOINLINE  __attribute__((noinline))
#elif defined(_MSC_VER) && _MSC_VER>=1310
#  define JSON_NOINLINE  __declspec(noinline)
#else
#  define JSON_NOINLINE
#endif


static JSON_NOINLINE int jsonParseAddNodeExpand(
  JsonParse *pParse,        /* Append the node to this object */
  u32 eType,                /* Node type */
  u32 n,                    /* Content size or sub-node count */
  const char *zContent      /* Content */
){
  u32 nNew;
  JsonNode *pNew;
  assert( pParse->nNode>=pParse->nAlloc );
  if( pParse->oom ) return -1;
  nNew = pParse->nAlloc*2 + 10;
  pNew = sqlite3_realloc64(pParse->aNode, sizeof(JsonNode)*nNew);
  if( pNew==0 ){
    pParse->oom = 1;
    return -1;
  }
  pParse->nAlloc = nNew;
  pParse->aNode = pNew;
  assert( pParse->nNode<pParse->nAlloc );
  return jsonParseAddNode(pParse, eType, n, zContent);
}

/*
** Create a new JsonNode instance based on the arguments and append that
** instance to the JsonParse.  Return the index in pParse->aNode[] of the
** new node, or -1 if a memory allocation fails.
*/
static int jsonParseAddNode(
  JsonParse *pParse,        /* Append the node to this object */
  u32 eType,                /* Node type */
  u32 n,                    /* Content size or sub-node count */
  const char *zContent      /* Content */
){
  JsonNode *p;
  if( pParse->nNode>=pParse->nAlloc ){
    return jsonParseAddNodeExpand(pParse, eType, n, zContent);
  }
  p = &pParse->aNode[pParse->nNode];
  p->eType = (u8)eType;
  p->jnFlags = 0;
  p->n = n;
  p->u.zJContent = zContent;
  return pParse->nNode++;
}

/*
** Return true if z[] begins with 4 (or more) hexadecimal digits
*/
static int jsonIs4Hex(const char *z){
  int i;
  for(i=0; i<4; i++) if( !safe_isxdigit(z[i]) ) return 0;
  return 1;
}

/*
** Parse a single JSON value which begins at pParse->zJson[i].  Return the
** index of the first character past the end of the value parsed.
**
** Return negative for a syntax error.  Special cases:  return -2 if the
** first non-whitespace character is '}' and return -3 if the first
** non-whitespace character is ']'.
*/
static int jsonParseValue(JsonParse *pParse, u32 i){
  char c;
  u32 j;
  int iThis;
  int x;
  JsonNode *pNode;
  const char *z = pParse->zJson;
  while( safe_isspace(z[i]) ){ i++; }
  if( (c = z[i])=='{' ){
    /* Parse object */
    iThis = jsonParseAddNode(pParse, JSON_OBJECT, 0, 0);
    if( iThis<0 ) return -1;
    for(j=i+1;;j++){
      while( safe_isspace(z[j]) ){ j++; }
      if( ++pParse->iDepth > JSON_MAX_DEPTH ) return -1;
      x = jsonParseValue(pParse, j);
      if( x<0 ){
        pParse->iDepth--;
        if( x==(-2) && pParse->nNode==(u32)iThis+1 ) return j+1;
        return -1;
      }
      if( pParse->oom ) return -1;
      pNode = &pParse->aNode[pParse->nNode-1];
      if( pNode->eType!=JSON_STRING ) return -1;
      pNode->jnFlags |= JNODE_LABEL;
      j = x;
      while( safe_isspace(z[j]) ){ j++; }
      if( z[j]!=':' ) return -1;
      j++;
      x = jsonParseValue(pParse, j);
      pParse->iDepth--;
      if( x<0 ) return -1;
      j = x;
      while( safe_isspace(z[j]) ){ j++; }
      c = z[j];
      if( c==',' ) continue;
      if( c!='}' ) return -1;
      break;
    }
    pParse->aNode[iThis].n = pParse->nNode - (u32)iThis - 1;
    return j+1;
  }else if( c=='[' ){
    /* Parse array */
    iThis = jsonParseAddNode(pParse, JSON_ARRAY, 0, 0);
    if( iThis<0 ) return -1;
    for(j=i+1;;j++){
      while( safe_isspace(z[j]) ){ j++; }
      if( ++pParse->iDepth > JSON_MAX_DEPTH ) return -1;
      x = jsonParseValue(pParse, j);
      pParse->iDepth--;
      if( x<0 ){
        if( x==(-3) && pParse->nNode==(u32)iThis+1 ) return j+1;
        return -1;
      }
      j = x;
      while( safe_isspace(z[j]) ){ j++; }
      c = z[j];
      if( c==',' ) continue;
      if( c!=']' ) return -1;
      break;
    }
    pParse->aNode[iThis].n = pParse->nNode - (u32)iThis - 1;
    return j+1;
  }else if( c=='"' ){
    /* Parse string */
    u8 jnFlags = 0;
    j = i+1;
    for(;;){
      c = z[j];
      if( (c & ~0x1f)==0 ){
        /* Control characters are not allowed in strings */
        return -1;
      }
      if( c=='\\' ){
        c = z[++j];
        if( c=='"' || c=='\\' || c=='/' || c=='b' || c=='f'
           || c=='n' || c=='r' || c=='t'
           || (c=='u' && jsonIs4Hex(z+j+1)) ){
          jnFlags = JNODE_ESCAPE;
        }else{
          return -1;
        }
      }else if( c=='"' ){
        break;
      }
      j++;
    }
    jsonParseAddNode(pParse, JSON_STRING, j+1-i, &z[i]);
    if( !pParse->oom ) pParse->aNode[pParse->nNode-1].jnFlags = jnFlags;
    return j+1;
  }else if( c=='n'
         && strncmp(z+i,"null",4)==0
         && !safe_isalnum(z[i+4]) ){
    jsonParseAddNode(pParse, JSON_NULL, 0, 0);
    return i+4;
  }else if( c=='t'
         && strncmp(z+i,"true",4)==0
         && !safe_isalnum(z[i+4]) ){
    jsonParseAddNode(pParse, JSON_TRUE, 0, 0);
    return i+4;
  }else if( c=='f'
         && strncmp(z+i,"false",5)==0
         && !safe_isalnum(z[i+5]) ){
    jsonParseAddNode(pParse, JSON_FALSE, 0, 0);
    return i+5;
  }else if( c=='-' || (c>='0' && c<='9') ){
    /* Parse number */
    u8 seenDP = 0;
    u8 seenE = 0;
    assert( '-' < '0' );
    if( c<='0' ){
      j = c=='-' ? i+1 : i;
      if( z[j]=='0' && z[j+1]>='0' && z[j+1]<='9' ) return -1;
    }
    j = i+1;
    for(;; j++){
      c = z[j];
      if( c>='0' && c<='9' ) continue;
      if( c=='.' ){
        if( z[j-1]=='-' ) return -1;
        if( seenDP ) return -1;
        seenDP = 1;
        continue;
      }
      if( c=='e' || c=='E' ){
        if( z[j-1]<'0' ) return -1;
        if( seenE ) return -1;
        seenDP = seenE = 1;
        c = z[j+1];
        if( c=='+' || c=='-' ){
          j++;
          c = z[j+1];
        }
        if( c<'0' || c>'9' ) return -1;
        continue;
      }
      break;
    }
    if( z[j-1]<'0' ) return -1;
    jsonParseAddNode(pParse, seenDP ? JSON_REAL : JSON_INT,
                        j - i, &z[i]);
    return j;
  }else if( c=='}' ){
    return -2;  /* End of {...} */
  }else if( c==']' ){
    return -3;  /* End of [...] */
  }else if( c==0 ){
    return 0;   /* End of file */
  }else{
    return -1;  /* Syntax error */
  }
}

/*
** Parse a complete JSON string.  Return 0 on success or non-zero if there
** are any errors.  If an error occurs, free all memory associated with
** pParse.
**
** pParse is uninitialized when this routine is called.
*/
static int jsonParse(
  JsonParse *pParse,           /* Initialize and fill this JsonParse object */
  sqlite3_context *pCtx,       /* Report errors here */
  const char *zJson            /* Input JSON text to be parsed */
){
  int i;
  memset(pParse, 0, sizeof(*pParse));
  if( zJson==0 ) return 1;
  pParse->zJson = zJson;
  i = jsonParseValue(pParse, 0);
  if( pParse->oom ) i = -1;
  if( i>0 ){
    assert( pParse->iDepth==0 );
    while( safe_isspace(zJson[i]) ) i++;
    if( zJson[i] ) i = -1;
  }
  if( i<=0 ){
    if( pCtx!=0 ){
      if( pParse->oom ){
        sqlite3_result_error_nomem(pCtx);
      }else{
        sqlite3_result_error(pCtx, "malformed JSON", -1);
      }
    }
    jsonParseReset(pParse);
    return 1;
  }
  return 0;
}

/* Mark node i of pParse as being a child of iParent.  Call recursively
** to fill in all the descendants of node i.
*/
static void jsonParseFillInParentage(JsonParse *pParse, u32 i, u32 iParent){
  JsonNode *pNode = &pParse->aNode[i];
  u32 j;
  pParse->aUp[i] = iParent;
  switch( pNode->eType ){
    case JSON_ARRAY: {
      for(j=1; j<=pNode->n; j += jsonNodeSize(pNode+j)){
        jsonParseFillInParentage(pParse, i+j, i);
      }
      break;
    }
    case JSON_OBJECT: {
      for(j=1; j<=pNode->n; j += jsonNodeSize(pNode+j+1)+1){
        pParse->aUp[i+j] = i;
        jsonParseFillInParentage(pParse, i+j+1, i);
      }
      break;
    }
    default: {
      break;
    }
  }
}

/*
** Compute the parentage of all nodes in a completed parse.
*/
static int jsonParseFindParents(JsonParse *pParse){
  u32 *aUp;
  assert( pParse->aUp==0 );
  aUp = pParse->aUp = sqlite3_malloc64( sizeof(u32)*pParse->nNode );
  if( aUp==0 ){
    pParse->oom = 1;
    return SQLITE_NOMEM;
  }
  jsonParseFillInParentage(pParse, 0, 0);
  return SQLITE_OK;
}

/*
** Magic number used for the JSON parse cache in sqlite3_get_auxdata()
*/
#define JSON_CACHE_ID  (-429938)  /* First cache entry */
#define JSON_CACHE_SZ  4          /* Max number of cache entries */

/*
** Obtain a complete parse of the JSON found in the first argument
** of the argv array.  Use the sqlite3_get_auxdata() cache for this
** parse if it is available.  If the cache is not available or if it
** is no longer valid, parse the JSON again and return the new parse,
** and also register the new parse so that it will be available for
** future sqlite3_get_auxdata() calls.
*/
static JsonParse *jsonParseCached(
  sqlite3_context *pCtx,
  sqlite3_value **argv,
  sqlite3_context *pErrCtx
){
  const char *zJson = (const char*)sqlite3_value_text(argv[0]);
  int nJson = sqlite3_value_bytes(argv[0]);
  JsonParse *p;
  JsonParse *pMatch = 0;
  int iKey;
  int iMinKey = 0;
  u32 iMinHold = 0xffffffff;
  u32 iMaxHold = 0;
  if( zJson==0 ) return 0;
  for(iKey=0; iKey<JSON_CACHE_SZ; iKey++){
    p = (JsonParse*)sqlite3_get_auxdata(pCtx, JSON_CACHE_ID+iKey);
    if( p==0 ){
      iMinKey = iKey;
      break;
    }
    if( pMatch==0
     && p->nJson==nJson
     && memcmp(p->zJson,zJson,nJson)==0
    ){
      p->nErr = 0;
      pMatch = p;
    }else if( p->iHold<iMinHold ){
      iMinHold = p->iHold;
      iMinKey = iKey;
    }
    if( p->iHold>iMaxHold ){
      iMaxHold = p->iHold;
    }
  }
  if( pMatch ){
    pMatch->nErr = 0;
    pMatch->iHold = iMaxHold+1;
    return pMatch;
  }
  p = sqlite3_malloc64( sizeof(*p) + nJson + 1 );
  if( p==0 ){
    sqlite3_result_error_nomem(pCtx);
    return 0;
  }
  memset(p, 0, sizeof(*p));
  p->zJson = (char*)&p[1];
  memcpy((char*)p->zJson, zJson, nJson+1);
  if( jsonParse(p, pErrCtx, p->zJson) ){
    sqlite3_free(p);
    return 0;
  }
  p->nJson = nJson;
  p->iHold = iMaxHold+1;
  sqlite3_set_auxdata(pCtx, JSON_CACHE_ID+iMinKey, p,
                      (void(*)(void*))jsonParseFree);
  return (JsonParse*)sqlite3_get_auxdata(pCtx, JSON_CACHE_ID+iMinKey);
}

/*
** Compare the OBJECT label at pNode against zKey,nKey.  Return true on
** a match.
*/
static int jsonLabelCompare(JsonNode *pNode, const char *zKey, u32 nKey){
  if( pNode->jnFlags & JNODE_RAW ){
    if( pNode->n!=nKey ) return 0;
    return strncmp(pNode->u.zJContent, zKey, nKey)==0;
  }else{
    if( pNode->n!=nKey+2 ) return 0;
    return strncmp(pNode->u.zJContent+1, zKey, nKey)==0;
  }
}

/* forward declaration */
static JsonNode *jsonLookupAppend(JsonParse*,const char*,int*,const char**);

/*
** Search along zPath to find the node specified.  Return a pointer
** to that node, or NULL if zPath is malformed or if there is no such
** node.
**
** If pApnd!=0, then try to append new nodes to complete zPath if it is
** possible to do so and if no existing node corresponds to zPath.  If
** new nodes are appended *pApnd is set to 1.
*/
static JsonNode *jsonLookupStep(
  JsonParse *pParse,      /* The JSON to search */
  u32 iRoot,              /* Begin the search at this node */
  const char *zPath,      /* The path to search */
  int *pApnd,             /* Append nodes to complete path if not NULL */
  const char **pzErr      /* Make *pzErr point to any syntax error in zPath */
){
  u32 i, j, nKey;
  const char *zKey;
  JsonNode *pRoot = &pParse->aNode[iRoot];
  if( zPath[0]==0 ) return pRoot;
  if( pRoot->jnFlags & JNODE_REPLACE ) return 0;
  if( zPath[0]=='.' ){
    if( pRoot->eType!=JSON_OBJECT ) return 0;
    zPath++;
    if( zPath[0]=='"' ){
      zKey = zPath + 1;
      for(i=1; zPath[i] && zPath[i]!='"'; i++){}
      nKey = i-1;
      if( zPath[i] ){
        i++;
      }else{
        *pzErr = zPath;
        return 0;
      }
    }else{
      zKey = zPath;
      for(i=0; zPath[i] && zPath[i]!='.' && zPath[i]!='['; i++){}
      nKey = i;
    }
    if( nKey==0 ){
      *pzErr = zPath;
      return 0;
    }
    j = 1;
    for(;;){
      while( j<=pRoot->n ){
        if( jsonLabelCompare(pRoot+j, zKey, nKey) ){
          return jsonLookupStep(pParse, iRoot+j+1, &zPath[i], pApnd, pzErr);
        }
        j++;
        j += jsonNodeSize(&pRoot[j]);
      }
      if( (pRoot->jnFlags & JNODE_APPEND)==0 ) break;
      iRoot += pRoot->u.iAppend;
      pRoot = &pParse->aNode[iRoot];
      j = 1;
    }
    if( pApnd ){
      u32 iStart, iLabel;
      JsonNode *pNode;
      iStart = jsonParseAddNode(pParse, JSON_OBJECT, 2, 0);
      iLabel = jsonParseAddNode(pParse, JSON_STRING, nKey, zKey);
      zPath += i;
      pNode = jsonLookupAppend(pParse, zPath, pApnd, pzErr);
      if( pParse->oom ) return 0;
      if( pNode ){
        pRoot = &pParse->aNode[iRoot];
        pRoot->u.iAppend = iStart - iRoot;
        pRoot->jnFlags |= JNODE_APPEND;
        pParse->aNode[iLabel].jnFlags |= JNODE_RAW;
      }
      return pNode;
    }
  }else if( zPath[0]=='[' ){
    i = 0;
    j = 1;
    while( safe_isdigit(zPath[j]) ){
      i = i*10 + zPath[j] - '0';
      j++;
    }
    if( j<2 || zPath[j]!=']' ){
      if( zPath[1]=='#' ){
        JsonNode *pBase = pRoot;
        int iBase = iRoot;
        if( pRoot->eType!=JSON_ARRAY ) return 0;
        for(;;){
          while( j<=pBase->n ){
            if( (pBase[j].jnFlags & JNODE_REMOVE)==0 ) i++;
            j += jsonNodeSize(&pBase[j]);
          }
          if( (pBase->jnFlags & JNODE_APPEND)==0 ) break;
          iBase += pBase->u.iAppend;
          pBase = &pParse->aNode[iBase];
          j = 1;
        }
        j = 2;
        if( zPath[2]=='-' && safe_isdigit(zPath[3]) ){
          unsigned int x = 0;
          j = 3;
          do{
            x = x*10 + zPath[j] - '0';
            j++;
          }while( safe_isdigit(zPath[j]) );
          if( x>i ) return 0;
          i -= x;
        }
        if( zPath[j]!=']' ){
          *pzErr = zPath;
          return 0;
        }
      }else{
        *pzErr = zPath;
        return 0;
      }
    }
    if( pRoot->eType!=JSON_ARRAY ) return 0;
    zPath += j + 1;
    j = 1;
    for(;;){
      while( j<=pRoot->n && (i>0 || (pRoot[j].jnFlags & JNODE_REMOVE)!=0) ){
        if( (pRoot[j].jnFlags & JNODE_REMOVE)==0 ) i--;
        j += jsonNodeSize(&pRoot[j]);
      }
      if( (pRoot->jnFlags & JNODE_APPEND)==0 ) break;
      iRoot += pRoot->u.iAppend;
      pRoot = &pParse->aNode[iRoot];
      j = 1;
    }
    if( j<=pRoot->n ){
      return jsonLookupStep(pParse, iRoot+j, zPath, pApnd, pzErr);
    }
    if( i==0 && pApnd ){
      u32 iStart;
      JsonNode *pNode;
      iStart = jsonParseAddNode(pParse, JSON_ARRAY, 1, 0);
      pNode = jsonLookupAppend(pParse, zPath, pApnd, pzErr);
      if( pParse->oom ) return 0;
      if( pNode ){
        pRoot = &pParse->aNode[iRoot];
        pRoot->u.iAppend = iStart - iRoot;
        pRoot->jnFlags |= JNODE_APPEND;
      }
      return pNode;
    }
  }else{
    *pzErr = zPath;
  }
  return 0;
}

/*
** Append content to pParse that will complete zPath.  Return a pointer
** to the inserted node, or return NULL if the append fails.
*/
static JsonNode *jsonLookupAppend(
  JsonParse *pParse,     /* Append content to the JSON parse */
  const char *zPath,     /* Description of content to append */
  int *pApnd,            /* Set this flag to 1 */
  const char **pzErr     /* Make this point to any syntax error */
){
  *pApnd = 1;
  if( zPath[0]==0 ){
    jsonParseAddNode(pParse, JSON_NULL, 0, 0);
    return pParse->oom ? 0 : &pParse->aNode[pParse->nNode-1];
  }
  if( zPath[0]=='.' ){
    jsonParseAddNode(pParse, JSON_OBJECT, 0, 0);
  }else if( strncmp(zPath,"[0]",3)==0 ){
    jsonParseAddNode(pParse, JSON_ARRAY, 0, 0);
  }else{
    return 0;
  }
  if( pParse->oom ) return 0;
  return jsonLookupStep(pParse, pParse->nNode-1, zPath, pApnd, pzErr);
}

/*
** Return the text of a syntax error message on a JSON path.  Space is
** obtained from sqlite3_malloc().
*/
static char *jsonPathSyntaxError(const char *zErr){
  return sqlite3_mprintf("JSON path error near '%q'", zErr);
}

/*
** Do a node lookup using zPath.  Return a pointer to the node on success.
** Return NULL if not found or if there is an error.
**
** On an error, write an error message into pCtx and increment the
** pParse->nErr counter.
**
** If pApnd!=NULL then try to append missing nodes and set *pApnd = 1 if
** nodes are appended.
*/
static JsonNode *jsonLookup(
  JsonParse *pParse,      /* The JSON to search */
  const char *zPath,      /* The path to search */
  int *pApnd,             /* Append nodes to complete path if not NULL */
  sqlite3_context *pCtx   /* Report errors here, if not NULL */
){
  const char *zErr = 0;
  JsonNode *pNode = 0;
  char *zMsg;

  if( zPath==0 ) return 0;
  if( zPath[0]!='$' ){
    zErr = zPath;
    goto lookup_err;
  }
  zPath++;
  pNode = jsonLookupStep(pParse, 0, zPath, pApnd, &zErr);
  if( zErr==0 ) return pNode;

lookup_err:
  pParse->nErr++;
  assert( zErr!=0 && pCtx!=0 );
  zMsg = jsonPathSyntaxError(zErr);
  if( zMsg ){
    sqlite3_result_error(pCtx, zMsg, -1);
    sqlite3_free(zMsg);
  }else{
    sqlite3_result_error_nomem(pCtx);
  }
  return 0;
}


/*
** Report the wrong number of arguments for json_insert(), json_replace()
** or json_set().
*/
static void jsonWrongNumArgs(
  sqlite3_context *pCtx,
  const char *zFuncName
){
  char *zMsg = sqlite3_mprintf("json_%s() needs an odd number of arguments",
                               zFuncName);
  sqlite3_result_error(pCtx, zMsg, -1);
  sqlite3_free(zMsg);     
}

/*
** Mark all NULL entries in the Object passed in as JNODE_REMOVE.
*/
static void jsonRemoveAllNulls(JsonNode *pNode){
  int i, n;
  assert( pNode->eType==JSON_OBJECT );
  n = pNode->n;
  for(i=2; i<=n; i += jsonNodeSize(&pNode[i])+1){
    switch( pNode[i].eType ){
      case JSON_NULL:
        pNode[i].jnFlags |= JNODE_REMOVE;
        break;
      case JSON_OBJECT:
        jsonRemoveAllNulls(&pNode[i]);
        break;
    }
  }
}


/****************************************************************************
** SQL functions used for testing and debugging
****************************************************************************/

#ifdef SQLITE_DEBUG
/*
** The json_parse(JSON) function returns a string which describes
** a parse of the JSON provided.  Or it returns NULL if JSON is not
** well-formed.
*/
static void jsonParseFunc(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  JsonString s;       /* Output string - not real JSON */
  JsonParse x;        /* The parse */
  u32 i;

  assert( argc==1 );
  if( jsonParse(&x, ctx, (const char*)sqlite3_value_text(argv[0])) ) return;
  jsonParseFindParents(&x);
  jsonInit(&s, ctx);
  for(i=0; i<x.nNode; i++){
    const char *zType;
    if( x.aNode[i].jnFlags & JNODE_LABEL ){
      assert( x.aNode[i].eType==JSON_STRING );
      zType = "label";
    }else{
      zType = jsonType[x.aNode[i].eType];
    }
    jsonPrintf(100, &s,"node %3u: %7s n=%-4d up=%-4d",
               i, zType, x.aNode[i].n, x.aUp[i]);
    if( x.aNode[i].u.zJContent!=0 ){
      jsonAppendRaw(&s, " ", 1);
      jsonAppendRaw(&s, x.aNode[i].u.zJContent, x.aNode[i].n);
    }
    jsonAppendRaw(&s, "\n", 1);
  }
  jsonParseReset(&x);
  jsonResult(&s);
}

/*
** The json_test1(JSON) function return true (1) if the input is JSON
** text generated by another json function.  It returns (0) if the input
** is not known to be JSON.
*/
static void jsonTest1Func(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  UNUSED_PARAM(argc);
  sqlite3_result_int(ctx, sqlite3_value_subtype(argv[0])==JSON_SUBTYPE);
}
#endif /* SQLITE_DEBUG */

/****************************************************************************
** Scalar SQL function implementations
****************************************************************************/

/*
** Implementation of the json_QUOTE(VALUE) function.  Return a JSON value
** corresponding to the SQL value input.  Mostly this means putting 
** double-quotes around strings and returning the unquoted string "null"
** when given a NULL input.
*/
static void jsonQuoteFunc(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  JsonString jx;
  UNUSED_PARAM(argc);

  jsonInit(&jx, ctx);
  jsonAppendValue(&jx, argv[0]);
  jsonResult(&jx);
  sqlite3_result_subtype(ctx, JSON_SUBTYPE);
}

/*
** Implementation of the json_array(VALUE,...) function.  Return a JSON
** array that contains all values given in arguments.  Or if any argument
** is a BLOB, throw an error.
*/
static void jsonArrayFunc(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  int i;
  JsonString jx;

  jsonInit(&jx, ctx);
  jsonAppendChar(&jx, '[');
  for(i=0; i<argc; i++){
    jsonAppendSeparator(&jx);
    jsonAppendValue(&jx, argv[i]);
  }
  jsonAppendChar(&jx, ']');
  jsonResult(&jx);
  sqlite3_result_subtype(ctx, JSON_SUBTYPE);
}


/*
** json_array_length(JSON)
** json_array_length(JSON, PATH)
**
** Return the number of elements in the top-level JSON array.  
** Return 0 if the input is not a well-formed JSON array.
*/
static void jsonArrayLengthFunc(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  JsonParse *p;          /* The parse */
  sqlite3_int64 n = 0;
  u32 i;
  JsonNode *pNode;

  p = jsonParseCached(ctx, argv, ctx);
  if( p==0 ) return;
  assert( p->nNode );
  if( argc==2 ){
    const char *zPath = (const char*)sqlite3_value_text(argv[1]);
    pNode = jsonLookup(p, zPath, 0, ctx);
  }else{
    pNode = p->aNode;
  }
  if( pNode==0 ){
    return;
  }
  if( pNode->eType==JSON_ARRAY ){
    assert( (pNode->jnFlags & JNODE_APPEND)==0 );
    for(i=1; i<=pNode->n; n++){
      i += jsonNodeSize(&pNode[i]);
    }
  }
  sqlite3_result_int64(ctx, n);
}

/*
** json_extract(JSON, PATH, ...)
**
** Return the element described by PATH.  Return NULL if there is no
** PATH element.  If there are multiple PATHs, then return a JSON array
** with the result from each path.  Throw an error if the JSON or any PATH
** is malformed.
*/
static void jsonExtractFunc(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  JsonParse *p;          /* The parse */
  JsonNode *pNode;
  const char *zPath;
  JsonString jx;
  int i;

  if( argc<2 ) return;
  p = jsonParseCached(ctx, argv, ctx);
  if( p==0 ) return;
  jsonInit(&jx, ctx);
  jsonAppendChar(&jx, '[');
  for(i=1; i<argc; i++){
    zPath = (const char*)sqlite3_value_text(argv[i]);
    pNode = jsonLookup(p, zPath, 0, ctx);
    if( p->nErr ) break;
    if( argc>2 ){
      jsonAppendSeparator(&jx);
      if( pNode ){
        jsonRenderNode(pNode, &jx, 0);
      }else{
        jsonAppendRaw(&jx, "null", 4);
      }
    }else if( pNode ){
      jsonReturn(pNode, ctx, 0);
    }
  }
  if( argc>2 && i==argc ){
    jsonAppendChar(&jx, ']');
    jsonResult(&jx);
    sqlite3_result_subtype(ctx, JSON_SUBTYPE);
  }
  jsonReset(&jx);
}

/* This is the RFC 7396 MergePatch algorithm.
*/
static JsonNode *jsonMergePatch(
  JsonParse *pParse,   /* The JSON parser that contains the TARGET */
  u32 iTarget,         /* Node of the TARGET in pParse */
  JsonNode *pPatch     /* The PATCH */
){
  u32 i, j;
  u32 iRoot;
  JsonNode *pTarget;
  if( pPatch->eType!=JSON_OBJECT ){
    return pPatch;
  }
  assert( iTarget>=0 && iTarget<pParse->nNode );
  pTarget = &pParse->aNode[iTarget];
  assert( (pPatch->jnFlags & JNODE_APPEND)==0 );
  if( pTarget->eType!=JSON_OBJECT ){
    jsonRemoveAllNulls(pPatch);
    return pPatch;
  }
  iRoot = iTarget;
  for(i=1; i<pPatch->n; i += jsonNodeSize(&pPatch[i+1])+1){
    u32 nKey;
    const char *zKey;
    assert( pPatch[i].eType==JSON_STRING );
    assert( pPatch[i].jnFlags & JNODE_LABEL );
    nKey = pPatch[i].n;
    zKey = pPatch[i].u.zJContent;
    assert( (pPatch[i].jnFlags & JNODE_RAW)==0 );
    for(j=1; j<pTarget->n; j += jsonNodeSize(&pTarget[j+1])+1 ){
      assert( pTarget[j].eType==JSON_STRING );
      assert( pTarget[j].jnFlags & JNODE_LABEL );
      assert( (pPatch[i].jnFlags & JNODE_RAW)==0 );
      if( pTarget[j].n==nKey && strncmp(pTarget[j].u.zJContent,zKey,nKey)==0 ){
        if( pTarget[j+1].jnFlags & (JNODE_REMOVE|JNODE_PATCH) ) break;
        if( pPatch[i+1].eType==JSON_NULL ){
          pTarget[j+1].jnFlags |= JNODE_REMOVE;
        }else{
          JsonNode *pNew = jsonMergePatch(pParse, iTarget+j+1, &pPatch[i+1]);
          if( pNew==0 ) return 0;
          pTarget = &pParse->aNode[iTarget];
          if( pNew!=&pTarget[j+1] ){
            pTarget[j+1].u.pPatch = pNew;
            pTarget[j+1].jnFlags |= JNODE_PATCH;
          }
        }
        break;
      }
    }
    if( j>=pTarget->n && pPatch[i+1].eType!=JSON_NULL ){
      int iStart, iPatch;
      iStart = jsonParseAddNode(pParse, JSON_OBJECT, 2, 0);
      jsonParseAddNode(pParse, JSON_STRING, nKey, zKey);
      iPatch = jsonParseAddNode(pParse, JSON_TRUE, 0, 0);
      if( pParse->oom ) return 0;
      jsonRemoveAllNulls(pPatch);
      pTarget = &pParse->aNode[iTarget];
      pParse->aNode[iRoot].jnFlags |= JNODE_APPEND;
      pParse->aNode[iRoot].u.iAppend = iStart - iRoot;
      iRoot = iStart;
      pParse->aNode[iPatch].jnFlags |= JNODE_PATCH;
      pParse->aNode[iPatch].u.pPatch = &pPatch[i+1];
    }
  }
  return pTarget;
}

/*
** Implementation of the json_mergepatch(JSON1,JSON2) function.  Return a JSON
** object that is the result of running the RFC 7396 MergePatch() algorithm
** on the two arguments.
*/
static void jsonPatchFunc(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  JsonParse x;     /* The JSON that is being patched */
  JsonParse y;     /* The patch */
  JsonNode *pResult;   /* The result of the merge */

  UNUSED_PARAM(argc);
  if( jsonParse(&x, ctx, (const char*)sqlite3_value_text(argv[0])) ) return;
  if( jsonParse(&y, ctx, (const char*)sqlite3_value_text(argv[1])) ){
    jsonParseReset(&x);
    return;
  }
  pResult = jsonMergePatch(&x, 0, y.aNode);
  assert( pResult!=0 || x.oom );
  if( pResult ){
    jsonReturnJson(pResult, ctx, 0);
  }else{
    sqlite3_result_error_nomem(ctx);
  }
  jsonParseReset(&x);
  jsonParseReset(&y);
}


/*
** Implementation of the json_object(NAME,VALUE,...) function.  Return a JSON
** object that contains all name/value given in arguments.  Or if any name
** is not a string or if any value is a BLOB, throw an error.
*/
static void jsonObjectFunc(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  int i;
  JsonString jx;
  const char *z;
  u32 n;

  if( argc&1 ){
    sqlite3_result_error(ctx, "json_object() requires an even number "
                                  "of arguments", -1);
    return;
  }
  jsonInit(&jx, ctx);
  jsonAppendChar(&jx, '{');
  for(i=0; i<argc; i+=2){
    if( sqlite3_value_type(argv[i])!=SQLITE_TEXT ){
      sqlite3_result_error(ctx, "json_object() labels must be TEXT", -1);
      jsonReset(&jx);
      return;
    }
    jsonAppendSeparator(&jx);
    z = (const char*)sqlite3_value_text(argv[i]);
    n = (u32)sqlite3_value_bytes(argv[i]);
    jsonAppendString(&jx, z, n);
    jsonAppendChar(&jx, ':');
    jsonAppendValue(&jx, argv[i+1]);
  }
  jsonAppendChar(&jx, '}');
  jsonResult(&jx);
  sqlite3_result_subtype(ctx, JSON_SUBTYPE);
}


/*
** json_remove(JSON, PATH, ...)
**
** Remove the named elements from JSON and return the result.  malformed
** JSON or PATH arguments result in an error.
*/
static void jsonRemoveFunc(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  JsonParse x;          /* The parse */
  JsonNode *pNode;
  const char *zPath;
  u32 i;

  if( argc<1 ) return;
  if( jsonParse(&x, ctx, (const char*)sqlite3_value_text(argv[0])) ) return;
  assert( x.nNode );
  for(i=1; i<(u32)argc; i++){
    zPath = (const char*)sqlite3_value_text(argv[i]);
    if( zPath==0 ) goto remove_done;
    pNode = jsonLookup(&x, zPath, 0, ctx);
    if( x.nErr ) goto remove_done;
    if( pNode ) pNode->jnFlags |= JNODE_REMOVE;
  }
  if( (x.aNode[0].jnFlags & JNODE_REMOVE)==0 ){
    jsonReturnJson(x.aNode, ctx, 0);
  }
remove_done:
  jsonParseReset(&x);
}

/*
** json_replace(JSON, PATH, VALUE, ...)
**
** Replace the value at PATH with VALUE.  If PATH does not already exist,
** this routine is a no-op.  If JSON or PATH is malformed, throw an error.
*/
static void jsonReplaceFunc(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  JsonParse x;          /* The parse */
  JsonNode *pNode;
  const char *zPath;
  u32 i;

  if( argc<1 ) return;
  if( (argc&1)==0 ) {
    jsonWrongNumArgs(ctx, "replace");
    return;
  }
  if( jsonParse(&x, ctx, (const char*)sqlite3_value_text(argv[0])) ) return;
  assert( x.nNode );
  for(i=1; i<(u32)argc; i+=2){
    zPath = (const char*)sqlite3_value_text(argv[i]);
    pNode = jsonLookup(&x, zPath, 0, ctx);
    if( x.nErr ) goto replace_err;
    if( pNode ){
      pNode->jnFlags |= (u8)JNODE_REPLACE;
      pNode->u.iReplace = i + 1;
    }
  }
  if( x.aNode[0].jnFlags & JNODE_REPLACE ){
    sqlite3_result_value(ctx, argv[x.aNode[0].u.iReplace]);
  }else{
    jsonReturnJson(x.aNode, ctx, argv);
  }
replace_err:
  jsonParseReset(&x);
}

/*
** json_set(JSON, PATH, VALUE, ...)
**
** Set the value at PATH to VALUE.  Create the PATH if it does not already
** exist.  Overwrite existing values that do exist.
** If JSON or PATH is malformed, throw an error.
**
** json_insert(JSON, PATH, VALUE, ...)
**
** Create PATH and initialize it to VALUE.  If PATH already exists, this
** routine is a no-op.  If JSON or PATH is malformed, throw an error.
*/
static void jsonSetFunc(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  JsonParse x;          /* The parse */
  JsonNode *pNode;
  const char *zPath;
  u32 i;
  int bApnd;
  int bIsSet = *(int*)sqlite3_user_data(ctx);

  if( argc<1 ) return;
  if( (argc&1)==0 ) {
    jsonWrongNumArgs(ctx, bIsSet ? "set" : "insert");
    return;
  }
  if( jsonParse(&x, ctx, (const char*)sqlite3_value_text(argv[0])) ) return;
  assert( x.nNode );
  for(i=1; i<(u32)argc; i+=2){
    zPath = (const char*)sqlite3_value_text(argv[i]);
    bApnd = 0;
    pNode = jsonLookup(&x, zPath, &bApnd, ctx);
    if( x.oom ){
      sqlite3_result_error_nomem(ctx);
      goto jsonSetDone;
    }else if( x.nErr ){
      goto jsonSetDone;
    }else if( pNode && (bApnd || bIsSet) ){
      pNode->jnFlags |= (u8)JNODE_REPLACE;
      pNode->u.iReplace = i + 1;
    }
  }
  if( x.aNode[0].jnFlags & JNODE_REPLACE ){
    sqlite3_result_value(ctx, argv[x.aNode[0].u.iReplace]);
  }else{
    jsonReturnJson(x.aNode, ctx, argv);
  }
jsonSetDone:
  jsonParseReset(&x);
}

/*
** json_type(JSON)
** json_type(JSON, PATH)
**
** Return the top-level "type" of a JSON string.  Throw an error if
** either the JSON or PATH inputs are not well-formed.
*/
static void jsonTypeFunc(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  JsonParse *p;          /* The parse */
  const char *zPath;
  JsonNode *pNode;

  p = jsonParseCached(ctx, argv, ctx);
  if( p==0 ) return;
  if( argc==2 ){
    zPath = (const char*)sqlite3_value_text(argv[1]);
    pNode = jsonLookup(p, zPath, 0, ctx);
  }else{
    pNode = p->aNode;
  }
  if( pNode ){
    sqlite3_result_text(ctx, jsonType[pNode->eType], -1, SQLITE_STATIC);
  }
}

/*
** json_valid(JSON)
**
** Return 1 if JSON is a well-formed JSON string according to RFC-7159.
** Return 0 otherwise.
*/
static void jsonValidFunc(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  JsonParse *p;          /* The parse */
  UNUSED_PARAM(argc);
  p = jsonParseCached(ctx, argv, 0);
  sqlite3_result_int(ctx, p!=0);
}


/****************************************************************************
** Aggregate SQL function implementations
****************************************************************************/
/*
** json_group_array(VALUE)
**
** Return a JSON array composed of all values in the aggregate.
*/
static void jsonArrayStep(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  JsonString *pStr;
  UNUSED_PARAM(argc);
  pStr = (JsonString*)sqlite3_aggregate_context(ctx, sizeof(*pStr));
  if( pStr ){
    if( pStr->zBuf==0 ){
      jsonInit(pStr, ctx);
      jsonAppendChar(pStr, '[');
    }else if( pStr->nUsed>1 ){
      jsonAppendChar(pStr, ',');
      pStr->pCtx = ctx;
    }
    jsonAppendValue(pStr, argv[0]);
  }
}
static void jsonArrayCompute(sqlite3_context *ctx, int isFinal){
  JsonString *pStr;
  pStr = (JsonString*)sqlite3_aggregate_context(ctx, 0);
  if( pStr ){
    pStr->pCtx = ctx;
    jsonAppendChar(pStr, ']');
    if( pStr->bErr ){
      if( pStr->bErr==1 ) sqlite3_result_error_nomem(ctx);
      assert( pStr->bStatic );
    }else if( isFinal ){
      sqlite3_result_text(ctx, pStr->zBuf, (int)pStr->nUsed,
                          pStr->bStatic ? SQLITE_TRANSIENT : sqlite3_free);
      pStr->bStatic = 1;
    }else{
      sqlite3_result_text(ctx, pStr->zBuf, (int)pStr->nUsed, SQLITE_TRANSIENT);
      pStr->nUsed--;
    }
  }else{
    sqlite3_result_text(ctx, "[]", 2, SQLITE_STATIC);
  }
  sqlite3_result_subtype(ctx, JSON_SUBTYPE);
}
static void jsonArrayValue(sqlite3_context *ctx){
  jsonArrayCompute(ctx, 0);
}
static void jsonArrayFinal(sqlite3_context *ctx){
  jsonArrayCompute(ctx, 1);
}

#ifndef SQLITE_OMIT_WINDOWFUNC
/*
** This method works for both json_group_array() and json_group_object().
** It works by removing the first element of the group by searching forward
** to the first comma (",") that is not within a string and deleting all
** text through that comma.
*/
static void jsonGroupInverse(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  unsigned int i;
  int inStr = 0;
  int nNest = 0;
  char *z;
  char c;
  JsonString *pStr;
  UNUSED_PARAM(argc);
  UNUSED_PARAM(argv);
  pStr = (JsonString*)sqlite3_aggregate_context(ctx, 0);
#ifdef NEVER
  /* pStr is always non-NULL since jsonArrayStep() or jsonObjectStep() will
  ** always have been called to initalize it */
  if( NEVER(!pStr) ) return;
#endif
  z = pStr->zBuf;
  for(i=1; (c = z[i])!=',' || inStr || nNest; i++){
    if( i>=pStr->nUsed ){
      pStr->nUsed = 1;
      return;
    }
    if( c=='"' ){
      inStr = !inStr;
    }else if( c=='\\' ){
      i++;
    }else if( !inStr ){
      if( c=='{' || c=='[' ) nNest++;
      if( c=='}' || c==']' ) nNest--;
    }
  }
  pStr->nUsed -= i;      
  memmove(&z[1], &z[i+1], (size_t)pStr->nUsed-1);
}
#else
# define jsonGroupInverse 0
#endif


/*
** json_group_obj(NAME,VALUE)
**
** Return a JSON object composed of all names and values in the aggregate.
*/
static void jsonObjectStep(
  sqlite3_context *ctx,
  int argc,
  sqlite3_value **argv
){
  JsonString *pStr;
  const char *z;
  u32 n;
  UNUSED_PARAM(argc);
  pStr = (JsonString*)sqlite3_aggregate_context(ctx, sizeof(*pStr));
  if( pStr ){
    if( pStr->zBuf==0 ){
      jsonInit(pStr, ctx);
      jsonAppendChar(pStr, '{');
    }else if( pStr->nUsed>1 ){
      jsonAppendChar(pStr, ',');
      pStr->pCtx = ctx;
    }
    z = (const char*)sqlite3_value_text(argv[0]);
    n = (u32)sqlite3_value_bytes(argv[0]);
    jsonAppendString(pStr, z, n);
    jsonAppendChar(pStr, ':');
    jsonAppendValue(pStr, argv[1]);
  }
}
static void jsonObjectCompute(sqlite3_context *ctx, int isFinal){
  JsonString *pStr;
  pStr = (JsonString*)sqlite3_aggregate_context(ctx, 0);
  if( pStr ){
    jsonAppendChar(pStr, '}');
    if( pStr->bErr ){
      if( pStr->bErr==1 ) sqlite3_result_error_nomem(ctx);
      assert( pStr->bStatic );
    }else if( isFinal ){
      sqlite3_result_text(ctx, pStr->zBuf, (int)pStr->nUsed,
                          pStr->bStatic ? SQLITE_TRANSIENT : sqlite3_free);
      pStr->bStatic = 1;
    }else{
      sqlite3_result_text(ctx, pStr->zBuf, (int)pStr->nUsed, SQLITE_TRANSIENT);
      pStr->nUsed--;
    }
  }else{
    sqlite3_result_text(ctx, "{}", 2, SQLITE_STATIC);
  }
  sqlite3_result_subtype(ctx, JSON_SUBTYPE);
}
static void jsonObjectValue(sqlite3_context *ctx){
  jsonObjectCompute(ctx, 0);
}
static void jsonObjectFinal(sqlite3_context *ctx){
  jsonObjectCompute(ctx, 1);
}



#ifndef SQLITE_OMIT_VIRTUALTABLE
/****************************************************************************
** The json_each virtual table
****************************************************************************/
typedef struct JsonEachCursor JsonEachCursor;
struct JsonEachCursor {
  sqlite3_vtab_cursor base;  /* Base class - must be first */
  u32 iRowid;                /* The rowid */
  u32 iBegin;                /* The first node of the scan */
  u32 i;                     /* Index in sParse.aNode[] of current row */
  u32 iEnd;                  /* EOF when i equals or exceeds this value */
  u8 eType;                  /* Type of top-level element */
  u8 bRecursive;             /* True for json_tree().  False for json_each() */
  char *zJson;               /* Input JSON */
  char *zRoot;               /* Path by which to filter zJson */
  JsonParse sParse;          /* Parse of the input JSON */
};

/* Constructor for the json_each virtual table */
static int jsonEachConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  sqlite3_vtab *pNew;
  int rc;

/* Column numbers */
#define JEACH_KEY     0
#define JEACH_VALUE   1
#define JEACH_TYPE    2
#define JEACH_ATOM    3
#define JEACH_ID      4
#define JEACH_PARENT  5
#define JEACH_FULLKEY 6
#define JEACH_PATH    7
/* The xBestIndex method assumes that the JSON and ROOT columns are
** the last two columns in the table.  Should this ever changes, be
** sure to update the xBestIndex method. */
#define JEACH_JSON    8
#define JEACH_ROOT    9

  UNUSED_PARAM(pzErr);
  UNUSED_PARAM(argv);
  UNUSED_PARAM(argc);
  UNUSED_PARAM(pAux);
  rc = sqlite3_declare_vtab(db, 
     "CREATE TABLE x(key,value,type,atom,id,parent,fullkey,path,"
                    "json HIDDEN,root HIDDEN)");
  if( rc==SQLITE_OK ){
    pNew = *ppVtab = sqlite3_malloc( sizeof(*pNew) );
    if( pNew==0 ) return SQLITE_NOMEM;
    memset(pNew, 0, sizeof(*pNew));
    sqlite3_vtab_config(db, SQLITE_VTAB_INNOCUOUS);
  }
  return rc;
}

/* destructor for json_each virtual table */
static int jsonEachDisconnect(sqlite3_vtab *pVtab){
  sqlite3_free(pVtab);
  return SQLITE_OK;
}

/* constructor for a JsonEachCursor object for json_each(). */
static int jsonEachOpenEach(sqlite3_vtab *p, sqlite3_vtab_cursor **ppCursor){
  JsonEachCursor *pCur;

  UNUSED_PARAM(p);
  pCur = sqlite3_malloc( sizeof(*pCur) );
  if( pCur==0 ) return SQLITE_NOMEM;
  memset(pCur, 0, sizeof(*pCur));
  *ppCursor = &pCur->base;
  return SQLITE_OK;
}

/* constructor for a JsonEachCursor object for json_tree(). */
static int jsonEachOpenTree(sqlite3_vtab *p, sqlite3_vtab_cursor **ppCursor){
  int rc = jsonEachOpenEach(p, ppCursor);
  if( rc==SQLITE_OK ){
    JsonEachCursor *pCur = (JsonEachCursor*)*ppCursor;
    pCur->bRecursive = 1;
  }
  return rc;
}

/* Reset a JsonEachCursor back to its original state.  Free any memory
** held. */
static void jsonEachCursorReset(JsonEachCursor *p){
  sqlite3_free(p->zJson);
  sqlite3_free(p->zRoot);
  jsonParseReset(&p->sParse);
  p->iRowid = 0;
  p->i = 0;
  p->iEnd = 0;
  p->eType = 0;
  p->zJson = 0;
  p->zRoot = 0;
}

/* Destructor for a jsonEachCursor object */
static int jsonEachClose(sqlite3_vtab_cursor *cur){
  JsonEachCursor *p = (JsonEachCursor*)cur;
  jsonEachCursorReset(p);
  sqlite3_free(cur);
  return SQLITE_OK;
}

/* Return TRUE if the jsonEachCursor object has been advanced off the end
** of the JSON object */
static int jsonEachEof(sqlite3_vtab_cursor *cur){
  JsonEachCursor *p = (JsonEachCursor*)cur;
  return p->i >= p->iEnd;
}

/* Advance the cursor to the next element for json_tree() */
static int jsonEachNext(sqlite3_vtab_cursor *cur){
  JsonEachCursor *p = (JsonEachCursor*)cur;
  if( p->bRecursive ){
    if( p->sParse.aNode[p->i].jnFlags & JNODE_LABEL ) p->i++;
    p->i++;
    p->iRowid++;
    if( p->i<p->iEnd ){
      u32 iUp = p->sParse.aUp[p->i];
      JsonNode *pUp = &p->sParse.aNode[iUp];
      p->eType = pUp->eType;
      if( pUp->eType==JSON_ARRAY ){
        if( iUp==p->i-1 ){
          pUp->u.iKey = 0;
        }else{
          pUp->u.iKey++;
        }
      }
    }
  }else{
    switch( p->eType ){
      case JSON_ARRAY: {
        p->i += jsonNodeSize(&p->sParse.aNode[p->i]);
        p->iRowid++;
        break;
      }
      case JSON_OBJECT: {
        p->i += 1 + jsonNodeSize(&p->sParse.aNode[p->i+1]);
        p->iRowid++;
        break;
      }
      default: {
        p->i = p->iEnd;
        break;
      }
    }
  }
  return SQLITE_OK;
}

/* Append the name of the path for element i to pStr
*/
static void jsonEachComputePath(
  JsonEachCursor *p,       /* The cursor */
  JsonString *pStr,        /* Write the path here */
  u32 i                    /* Path to this element */
){
  JsonNode *pNode, *pUp;
  u32 iUp;
  if( i==0 ){
    jsonAppendChar(pStr, '$');
    return;
  }
  iUp = p->sParse.aUp[i];
  jsonEachComputePath(p, pStr, iUp);
  pNode = &p->sParse.aNode[i];
  pUp = &p->sParse.aNode[iUp];
  if( pUp->eType==JSON_ARRAY ){
    jsonPrintf(30, pStr, "[%d]", pUp->u.iKey);
  }else{
    assert( pUp->eType==JSON_OBJECT );
    if( (pNode->jnFlags & JNODE_LABEL)==0 ) pNode--;
    assert( pNode->eType==JSON_STRING );
    assert( pNode->jnFlags & JNODE_LABEL );
    jsonPrintf(pNode->n+1, pStr, ".%.*s", pNode->n-2, pNode->u.zJContent+1);
  }
}

/* Return the value of a column */
static int jsonEachColumn(
  sqlite3_vtab_cursor *cur,   /* The cursor */
  sqlite3_context *ctx,       /* First argument to sqlite3_result_...() */
  int i                       /* Which column to return */
){
  JsonEachCursor *p = (JsonEachCursor*)cur;
  JsonNode *pThis = &p->sParse.aNode[p->i];
  switch( i ){
    case JEACH_KEY: {
      if( p->i==0 ) break;
      if( p->eType==JSON_OBJECT ){
        jsonReturn(pThis, ctx, 0);
      }else if( p->eType==JSON_ARRAY ){
        u32 iKey;
        if( p->bRecursive ){
          if( p->iRowid==0 ) break;
          iKey = p->sParse.aNode[p->sParse.aUp[p->i]].u.iKey;
        }else{
          iKey = p->iRowid;
        }
        sqlite3_result_int64(ctx, (sqlite3_int64)iKey);
      }
      break;
    }
    case JEACH_VALUE: {
      if( pThis->jnFlags & JNODE_LABEL ) pThis++;
      jsonReturn(pThis, ctx, 0);
      break;
    }
    case JEACH_TYPE: {
      if( pThis->jnFlags & JNODE_LABEL ) pThis++;
      sqlite3_result_text(ctx, jsonType[pThis->eType], -1, SQLITE_STATIC);
      break;
    }
    case JEACH_ATOM: {
      if( pThis->jnFlags & JNODE_LABEL ) pThis++;
      if( pThis->eType>=JSON_ARRAY ) break;
      jsonReturn(pThis, ctx, 0);
      break;
    }
    case JEACH_ID: {
      sqlite3_result_int64(ctx, 
         (sqlite3_int64)p->i + ((pThis->jnFlags & JNODE_LABEL)!=0));
      break;
    }
    case JEACH_PARENT: {
      if( p->i>p->iBegin && p->bRecursive ){
        sqlite3_result_int64(ctx, (sqlite3_int64)p->sParse.aUp[p->i]);
      }
      break;
    }
    case JEACH_FULLKEY: {
      JsonString x;
      jsonInit(&x, ctx);
      if( p->bRecursive ){
        jsonEachComputePath(p, &x, p->i);
      }else{
        if( p->zRoot ){
          jsonAppendRaw(&x, p->zRoot, (int)strlen(p->zRoot));
        }else{
          jsonAppendChar(&x, '$');
        }
        if( p->eType==JSON_ARRAY ){
          jsonPrintf(30, &x, "[%d]", p->iRowid);
        }else if( p->eType==JSON_OBJECT ){
          jsonPrintf(pThis->n, &x, ".%.*s", pThis->n-2, pThis->u.zJContent+1);
        }
      }
      jsonResult(&x);
      break;
    }
    case JEACH_PATH: {
      if( p->bRecursive ){
        JsonString x;
        jsonInit(&x, ctx);
        jsonEachComputePath(p, &x, p->sParse.aUp[p->i]);
        jsonResult(&x);
        break;
      }
      /* For json_each() path and root are the same so fall through
      ** into the root case */
      /* no break */ deliberate_fall_through
    }
    default: {
      const char *zRoot = p->zRoot;
      if( zRoot==0 ) zRoot = "$";
      sqlite3_result_text(ctx, zRoot, -1, SQLITE_STATIC);
      break;
    }
    case JEACH_JSON: {
      assert( i==JEACH_JSON );
      sqlite3_result_text(ctx, p->sParse.zJson, -1, SQLITE_STATIC);
      break;
    }
  }
  return SQLITE_OK;
}

/* Return the current rowid value */
static int jsonEachRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  JsonEachCursor *p = (JsonEachCursor*)cur;
  *pRowid = p->iRowid;
  return SQLITE_OK;
}

/* The query strategy is to look for an equality constraint on the json
** column.  Without such a constraint, the table cannot operate.  idxNum is
** 1 if the constraint is found, 3 if the constraint and zRoot are found,
** and 0 otherwise.
*/
static int jsonEachBestIndex(
  sqlite3_vtab *tab,
  sqlite3_index_info *pIdxInfo
){
  int i;                     /* Loop counter or computed array index */
  int aIdx[2];               /* Index of constraints for JSON and ROOT */
  int unusableMask = 0;      /* Mask of unusable JSON and ROOT constraints */
  int idxMask = 0;           /* Mask of usable == constraints JSON and ROOT */
  const struct sqlite3_index_constraint *pConstraint;

  /* This implementation assumes that JSON and ROOT are the last two
  ** columns in the table */
  assert( JEACH_ROOT == JEACH_JSON+1 );
  UNUSED_PARAM(tab);
  aIdx[0] = aIdx[1] = -1;
  pConstraint = pIdxInfo->aConstraint;
  for(i=0; i<pIdxInfo->nConstraint; i++, pConstraint++){
    int iCol;
    int iMask;
    if( pConstraint->iColumn < JEACH_JSON ) continue;
    iCol = pConstraint->iColumn - JEACH_JSON;
    assert( iCol==0 || iCol==1 );
    iMask = 1 << iCol;
    if( pConstraint->usable==0 ){
      unusableMask |= iMask;
    }else if( pConstraint->op==SQLITE_INDEX_CONSTRAINT_EQ ){
      aIdx[iCol] = i;
      idxMask |= iMask;
    }
  }
  if( (unusableMask & ~idxMask)!=0 ){
    /* If there are any unusable constraints on JSON or ROOT, then reject
    ** this entire plan */
    return SQLITE_CONSTRAINT;
  }
  if( aIdx[0]<0 ){
    /* No JSON input.  Leave estimatedCost at the huge value that it was
    ** initialized to to discourage the query planner from selecting this
    ** plan. */
    pIdxInfo->idxNum = 0;
  }else{
    pIdxInfo->estimatedCost = 1.0;
    i = aIdx[0];
    pIdxInfo->aConstraintUsage[i].argvIndex = 1;
    pIdxInfo->aConstraintUsage[i].omit = 1;
    if( aIdx[1]<0 ){
      pIdxInfo->idxNum = 1;  /* Only JSON supplied.  Plan 1 */
    }else{
      i = aIdx[1];
      pIdxInfo->aConstraintUsage[i].argvIndex = 2;
      pIdxInfo->aConstraintUsage[i].omit = 1;
      pIdxInfo->idxNum = 3;  /* Both JSON and ROOT are supplied.  Plan 3 */
    }
  }
  return SQLITE_OK;
}

/* Start a search on a new JSON string */
static int jsonEachFilter(
  sqlite3_vtab_cursor *cur,
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  JsonEachCursor *p = (JsonEachCursor*)cur;
  const char *z;
  const char *zRoot = 0;
  sqlite3_int64 n;

  UNUSED_PARAM(idxStr);
  UNUSED_PARAM(argc);
  jsonEachCursorReset(p);
  if( idxNum==0 ) return SQLITE_OK;
  z = (const char*)sqlite3_value_text(argv[0]);
  if( z==0 ) return SQLITE_OK;
  n = sqlite3_value_bytes(argv[0]);
  p->zJson = sqlite3_malloc64( n+1 );
  if( p->zJson==0 ) return SQLITE_NOMEM;
  memcpy(p->zJson, z, (size_t)n+1);
  if( jsonParse(&p->sParse, 0, p->zJson) ){
    int rc = SQLITE_NOMEM;
    if( p->sParse.oom==0 ){
      sqlite3_free(cur->pVtab->zErrMsg);
      cur->pVtab->zErrMsg = sqlite3_mprintf("malformed JSON");
      if( cur->pVtab->zErrMsg ) rc = SQLITE_ERROR;
    }
    jsonEachCursorReset(p);
    return rc;
  }else if( p->bRecursive && jsonParseFindParents(&p->sParse) ){
    jsonEachCursorReset(p);
    return SQLITE_NOMEM;
  }else{
    JsonNode *pNode = 0;
    if( idxNum==3 ){
      const char *zErr = 0;
      zRoot = (const char*)sqlite3_value_text(argv[1]);
      if( zRoot==0 ) return SQLITE_OK;
      n = sqlite3_value_bytes(argv[1]);
      p->zRoot = sqlite3_malloc64( n+1 );
      if( p->zRoot==0 ) return SQLITE_NOMEM;
      memcpy(p->zRoot, zRoot, (size_t)n+1);
      if( zRoot[0]!='$' ){
        zErr = zRoot;
      }else{
        pNode = jsonLookupStep(&p->sParse, 0, p->zRoot+1, 0, &zErr);
      }
      if( zErr ){
        sqlite3_free(cur->pVtab->zErrMsg);
        cur->pVtab->zErrMsg = jsonPathSyntaxError(zErr);
        jsonEachCursorReset(p);
        return cur->pVtab->zErrMsg ? SQLITE_ERROR : SQLITE_NOMEM;
      }else if( pNode==0 ){
        return SQLITE_OK;
      }
    }else{
      pNode = p->sParse.aNode;
    }
    p->iBegin = p->i = (int)(pNode - p->sParse.aNode);
    p->eType = pNode->eType;
    if( p->eType>=JSON_ARRAY ){
      pNode->u.iKey = 0;
      p->iEnd = p->i + pNode->n + 1;
      if( p->bRecursive ){
        p->eType = p->sParse.aNode[p->sParse.aUp[p->i]].eType;
        if( p->i>0 && (p->sParse.aNode[p->i-1].jnFlags & JNODE_LABEL)!=0 ){
          p->i--;
        }
      }else{
        p->i++;
      }
    }else{
      p->iEnd = p->i+1;
    }
  }
  return SQLITE_OK;
}

/* The methods of the json_each virtual table */
static sqlite3_module jsonEachModule = {
  0,                         /* iVersion */
  0,                         /* xCreate */
  jsonEachConnect,           /* xConnect */
  jsonEachBestIndex,         /* xBestIndex */
  jsonEachDisconnect,        /* xDisconnect */
  0,                         /* xDestroy */
  jsonEachOpenEach,          /* xOpen - open a cursor */
  jsonEachClose,             /* xClose - close a cursor */
  jsonEachFilter,            /* xFilter - configure scan constraints */
  jsonEachNext,              /* xNext - advance a cursor */
  jsonEachEof,               /* xEof - check for end of scan */
  jsonEachColumn,            /* xColumn - read data */
  jsonEachRowid,             /* xRowid - read data */
  0,                         /* xUpdate */
  0,                         /* xBegin */
  0,                         /* xSync */
  0,                         /* xCommit */
  0,                         /* xRollback */
  0,                         /* xFindMethod */
  0,                         /* xRename */
  0,                         /* xSavepoint */
  0,                         /* xRelease */
  0,                         /* xRollbackTo */
  0                          /* xShadowName */
};

/* The methods of the json_tree virtual table. */
static sqlite3_module jsonTreeModule = {
  0,                         /* iVersion */
  0,                         /* xCreate */
  jsonEachConnect,           /* xConnect */
  jsonEachBestIndex,         /* xBestIndex */
  jsonEachDisconnect,        /* xDisconnect */
  0,                         /* xDestroy */
  jsonEachOpenTree,          /* xOpen - open a cursor */
  jsonEachClose,             /* xClose - close a cursor */
  jsonEachFilter,            /* xFilter - configure scan constraints */
  jsonEachNext,              /* xNext - advance a cursor */
  jsonEachEof,               /* xEof - check for end of scan */
  jsonEachColumn,            /* xColumn - read data */
  jsonEachRowid,             /* xRowid - read data */
  0,                         /* xUpdate */
  0,                         /* xBegin */
  0,                         /* xSync */
  0,                         /* xCommit */
  0,                         /* xRollback */
  0,                         /* xFindMethod */
  0,                         /* xRename */
  0,                         /* xSavepoint */
  0,                         /* xRelease */
  0,                         /* xRollbackTo */
  0                          /* xShadowName */
};
#endif /* SQLITE_OMIT_VIRTUALTABLE */

/****************************************************************************
** The following routines are the only publically visible identifiers in this
** file.  Call the following routines in order to register the various SQL
** functions and the virtual table implemented by this file.
****************************************************************************/

int sqlite3Json1Init(sqlite3 *db){
  int rc = SQLITE_OK;
  unsigned int i;
  static const struct {
     const char *zName;
     int nArg;
     int flag;
     void (*xFunc)(sqlite3_context*,int,sqlite3_value**);
  } aFunc[] = {
    { "json",                 1, 0,   jsonRemoveFunc        },
    { "json_array",          -1, 0,   jsonArrayFunc         },
    { "json_array_length",    1, 0,   jsonArrayLengthFunc   },
    { "json_array_length",    2, 0,   jsonArrayLengthFunc   },
    { "json_extract",        -1, 0,   jsonExtractFunc       },
    { "json_insert",         -1, 0,   jsonSetFunc           },
    { "json_object",         -1, 0,   jsonObjectFunc        },
    { "json_patch",           2, 0,   jsonPatchFunc         },
    { "json_quote",           1, 0,   jsonQuoteFunc         },
    { "json_remove",         -1, 0,   jsonRemoveFunc        },
    { "json_replace",        -1, 0,   jsonReplaceFunc       },
    { "json_set",            -1, 1,   jsonSetFunc           },
    { "json_type",            1, 0,   jsonTypeFunc          },
    { "json_type",            2, 0,   jsonTypeFunc          },
    { "json_valid",           1, 0,   jsonValidFunc         },

#if SQLITE_DEBUG
    /* DEBUG and TESTING functions */
    { "json_parse",           1, 0,   jsonParseFunc         },
    { "json_test1",           1, 0,   jsonTest1Func         },
#endif
  };
  static const struct {
     const char *zName;
     int nArg;
     void (*xStep)(sqlite3_context*,int,sqlite3_value**);
     void (*xFinal)(sqlite3_context*);
     void (*xValue)(sqlite3_context*);
  } aAgg[] = {
    { "json_group_array",     1,
      jsonArrayStep,   jsonArrayFinal,  jsonArrayValue  },
    { "json_group_object",    2,
      jsonObjectStep,  jsonObjectFinal, jsonObjectValue },
  };
#ifndef SQLITE_OMIT_VIRTUALTABLE
  static const struct {
     const char *zName;
     sqlite3_module *pModule;
  } aMod[] = {
    { "json_each",            &jsonEachModule               },
    { "json_tree",            &jsonTreeModule               },
  };
#endif
  static const int enc = 
       SQLITE_UTF8 |
       SQLITE_DETERMINISTIC |
       SQLITE_INNOCUOUS;
  for(i=0; i<sizeof(aFunc)/sizeof(aFunc[0]) && rc==SQLITE_OK; i++){
    rc = sqlite3_create_function(db, aFunc[i].zName, aFunc[i].nArg, enc,
                                 (void*)&aFunc[i].flag,
                                 aFunc[i].xFunc, 0, 0);
  }
#ifndef SQLITE_OMIT_WINDOWFUNC
  for(i=0; i<sizeof(aAgg)/sizeof(aAgg[0]) && rc==SQLITE_OK; i++){
    rc = sqlite3_create_window_function(db, aAgg[i].zName, aAgg[i].nArg,
                                 SQLITE_SUBTYPE | enc, 0,
                                 aAgg[i].xStep, aAgg[i].xFinal,
                                 aAgg[i].xValue, jsonGroupInverse, 0);
  }
#endif
#ifndef SQLITE_OMIT_VIRTUALTABLE
  for(i=0; i<sizeof(aMod)/sizeof(aMod[0]) && rc==SQLITE_OK; i++){
    rc = sqlite3_create_module(db, aMod[i].zName, aMod[i].pModule, 0);
  }
#endif
  return rc;
}


#ifndef SQLITE_CORE
#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_json_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  return sqlite3Json1Init(db);
}
#endif
#endif /* !defined(SQLITE_CORE) || defined(SQLITE_ENABLE_JSON1) */
