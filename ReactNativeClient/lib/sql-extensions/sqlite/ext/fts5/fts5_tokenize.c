/*
** 2014 May 31
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
******************************************************************************
*/


#include "fts5Int.h"

/**************************************************************************
** Start of ascii tokenizer implementation.
*/

/*
** For tokenizers with no "unicode" modifier, the set of token characters
** is the same as the set of ASCII range alphanumeric characters. 
*/
static unsigned char aAsciiTokenChar[128] = {
  0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   /* 0x00..0x0F */
  0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   /* 0x10..0x1F */
  0, 0, 0, 0, 0, 0, 0, 0,   0, 0, 0, 0, 0, 0, 0, 0,   /* 0x20..0x2F */
  1, 1, 1, 1, 1, 1, 1, 1,   1, 1, 0, 0, 0, 0, 0, 0,   /* 0x30..0x3F */
  0, 1, 1, 1, 1, 1, 1, 1,   1, 1, 1, 1, 1, 1, 1, 1,   /* 0x40..0x4F */
  1, 1, 1, 1, 1, 1, 1, 1,   1, 1, 1, 0, 0, 0, 0, 0,   /* 0x50..0x5F */
  0, 1, 1, 1, 1, 1, 1, 1,   1, 1, 1, 1, 1, 1, 1, 1,   /* 0x60..0x6F */
  1, 1, 1, 1, 1, 1, 1, 1,   1, 1, 1, 0, 0, 0, 0, 0,   /* 0x70..0x7F */
};

typedef struct AsciiTokenizer AsciiTokenizer;
struct AsciiTokenizer {
  unsigned char aTokenChar[128];
};

static void fts5AsciiAddExceptions(
  AsciiTokenizer *p, 
  const char *zArg, 
  int bTokenChars
){
  int i;
  for(i=0; zArg[i]; i++){
    if( (zArg[i] & 0x80)==0 ){
      p->aTokenChar[(int)zArg[i]] = (unsigned char)bTokenChars;
    }
  }
}

/*
** Delete a "ascii" tokenizer.
*/
static void fts5AsciiDelete(Fts5Tokenizer *p){
  sqlite3_free(p);
}

/*
** Create an "ascii" tokenizer.
*/
static int fts5AsciiCreate(
  void *pUnused, 
  const char **azArg, int nArg,
  Fts5Tokenizer **ppOut
){
  int rc = SQLITE_OK;
  AsciiTokenizer *p = 0;
  UNUSED_PARAM(pUnused);
  if( nArg%2 ){
    rc = SQLITE_ERROR;
  }else{
    p = sqlite3_malloc(sizeof(AsciiTokenizer));
    if( p==0 ){
      rc = SQLITE_NOMEM;
    }else{
      int i;
      memset(p, 0, sizeof(AsciiTokenizer));
      memcpy(p->aTokenChar, aAsciiTokenChar, sizeof(aAsciiTokenChar));
      for(i=0; rc==SQLITE_OK && i<nArg; i+=2){
        const char *zArg = azArg[i+1];
        if( 0==sqlite3_stricmp(azArg[i], "tokenchars") ){
          fts5AsciiAddExceptions(p, zArg, 1);
        }else
        if( 0==sqlite3_stricmp(azArg[i], "separators") ){
          fts5AsciiAddExceptions(p, zArg, 0);
        }else{
          rc = SQLITE_ERROR;
        }
      }
      if( rc!=SQLITE_OK ){
        fts5AsciiDelete((Fts5Tokenizer*)p);
        p = 0;
      }
    }
  }

  *ppOut = (Fts5Tokenizer*)p;
  return rc;
}


static void asciiFold(char *aOut, const char *aIn, int nByte){
  int i;
  for(i=0; i<nByte; i++){
    char c = aIn[i];
    if( c>='A' && c<='Z' ) c += 32;
    aOut[i] = c;
  }
}

/*
** Tokenize some text using the ascii tokenizer.
*/
static int fts5AsciiTokenize(
  Fts5Tokenizer *pTokenizer,
  void *pCtx,
  int iUnused,
  const char *pText, int nText,
  int (*xToken)(void*, int, const char*, int nToken, int iStart, int iEnd)
){
  AsciiTokenizer *p = (AsciiTokenizer*)pTokenizer;
  int rc = SQLITE_OK;
  int ie;
  int is = 0;

  char aFold[64];
  int nFold = sizeof(aFold);
  char *pFold = aFold;
  unsigned char *a = p->aTokenChar;

  UNUSED_PARAM(iUnused);

  while( is<nText && rc==SQLITE_OK ){
    int nByte;

    /* Skip any leading divider characters. */
    while( is<nText && ((pText[is]&0x80)==0 && a[(int)pText[is]]==0) ){
      is++;
    }
    if( is==nText ) break;

    /* Count the token characters */
    ie = is+1;
    while( ie<nText && ((pText[ie]&0x80) || a[(int)pText[ie]] ) ){
      ie++;
    }

    /* Fold to lower case */
    nByte = ie-is;
    if( nByte>nFold ){
      if( pFold!=aFold ) sqlite3_free(pFold);
      pFold = sqlite3_malloc64((sqlite3_int64)nByte*2);
      if( pFold==0 ){
        rc = SQLITE_NOMEM;
        break;
      }
      nFold = nByte*2;
    }
    asciiFold(pFold, &pText[is], nByte);

    /* Invoke the token callback */
    rc = xToken(pCtx, 0, pFold, nByte, is, ie);
    is = ie+1;
  }
  
  if( pFold!=aFold ) sqlite3_free(pFold);
  if( rc==SQLITE_DONE ) rc = SQLITE_OK;
  return rc;
}

/**************************************************************************
** Start of unicode61 tokenizer implementation.
*/


/*
** The following two macros - READ_UTF8 and WRITE_UTF8 - have been copied
** from the sqlite3 source file utf.c. If this file is compiled as part
** of the amalgamation, they are not required.
*/
#ifndef SQLITE_AMALGAMATION

static const unsigned char sqlite3Utf8Trans1[] = {
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
  0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
  0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
  0x00, 0x01, 0x02, 0x03, 0x00, 0x01, 0x00, 0x00,
};

#define READ_UTF8(zIn, zTerm, c)                           \
  c = *(zIn++);                                            \
  if( c>=0xc0 ){                                           \
    c = sqlite3Utf8Trans1[c-0xc0];                         \
    while( zIn!=zTerm && (*zIn & 0xc0)==0x80 ){            \
      c = (c<<6) + (0x3f & *(zIn++));                      \
    }                                                      \
    if( c<0x80                                             \
        || (c&0xFFFFF800)==0xD800                          \
        || (c&0xFFFFFFFE)==0xFFFE ){  c = 0xFFFD; }        \
  }


#define WRITE_UTF8(zOut, c) {                          \
  if( c<0x00080 ){                                     \
    *zOut++ = (unsigned char)(c&0xFF);                 \
  }                                                    \
  else if( c<0x00800 ){                                \
    *zOut++ = 0xC0 + (unsigned char)((c>>6)&0x1F);     \
    *zOut++ = 0x80 + (unsigned char)(c & 0x3F);        \
  }                                                    \
  else if( c<0x10000 ){                                \
    *zOut++ = 0xE0 + (unsigned char)((c>>12)&0x0F);    \
    *zOut++ = 0x80 + (unsigned char)((c>>6) & 0x3F);   \
    *zOut++ = 0x80 + (unsigned char)(c & 0x3F);        \
  }else{                                               \
    *zOut++ = 0xF0 + (unsigned char)((c>>18) & 0x07);  \
    *zOut++ = 0x80 + (unsigned char)((c>>12) & 0x3F);  \
    *zOut++ = 0x80 + (unsigned char)((c>>6) & 0x3F);   \
    *zOut++ = 0x80 + (unsigned char)(c & 0x3F);        \
  }                                                    \
}

#endif /* ifndef SQLITE_AMALGAMATION */

typedef struct Unicode61Tokenizer Unicode61Tokenizer;
struct Unicode61Tokenizer {
  unsigned char aTokenChar[128];  /* ASCII range token characters */
  char *aFold;                    /* Buffer to fold text into */
  int nFold;                      /* Size of aFold[] in bytes */
  int eRemoveDiacritic;           /* True if remove_diacritics=1 is set */
  int nException;
  int *aiException;

  unsigned char aCategory[32];    /* True for token char categories */
};

/* Values for eRemoveDiacritic (must match internals of fts5_unicode2.c) */
#define FTS5_REMOVE_DIACRITICS_NONE    0
#define FTS5_REMOVE_DIACRITICS_SIMPLE  1
#define FTS5_REMOVE_DIACRITICS_COMPLEX 2

static int fts5UnicodeAddExceptions(
  Unicode61Tokenizer *p,          /* Tokenizer object */
  const char *z,                  /* Characters to treat as exceptions */
  int bTokenChars                 /* 1 for 'tokenchars', 0 for 'separators' */
){
  int rc = SQLITE_OK;
  int n = (int)strlen(z);
  int *aNew;

  if( n>0 ){
    aNew = (int*)sqlite3_realloc64(p->aiException,
                                   (n+p->nException)*sizeof(int));
    if( aNew ){
      int nNew = p->nException;
      const unsigned char *zCsr = (const unsigned char*)z;
      const unsigned char *zTerm = (const unsigned char*)&z[n];
      while( zCsr<zTerm ){
        u32 iCode;
        int bToken;
        READ_UTF8(zCsr, zTerm, iCode);
        if( iCode<128 ){
          p->aTokenChar[iCode] = (unsigned char)bTokenChars;
        }else{
          bToken = p->aCategory[sqlite3Fts5UnicodeCategory(iCode)];
          assert( (bToken==0 || bToken==1) ); 
          assert( (bTokenChars==0 || bTokenChars==1) );
          if( bToken!=bTokenChars && sqlite3Fts5UnicodeIsdiacritic(iCode)==0 ){
            int i;
            for(i=0; i<nNew; i++){
              if( (u32)aNew[i]>iCode ) break;
            }
            memmove(&aNew[i+1], &aNew[i], (nNew-i)*sizeof(int));
            aNew[i] = iCode;
            nNew++;
          }
        }
      }
      p->aiException = aNew;
      p->nException = nNew;
    }else{
      rc = SQLITE_NOMEM;
    }
  }

  return rc;
}

/*
** Return true if the p->aiException[] array contains the value iCode.
*/
static int fts5UnicodeIsException(Unicode61Tokenizer *p, int iCode){
  if( p->nException>0 ){
    int *a = p->aiException;
    int iLo = 0;
    int iHi = p->nException-1;

    while( iHi>=iLo ){
      int iTest = (iHi + iLo) / 2;
      if( iCode==a[iTest] ){
        return 1;
      }else if( iCode>a[iTest] ){
        iLo = iTest+1;
      }else{
        iHi = iTest-1;
      }
    }
  }

  return 0;
}

/*
** Delete a "unicode61" tokenizer.
*/
static void fts5UnicodeDelete(Fts5Tokenizer *pTok){
  if( pTok ){
    Unicode61Tokenizer *p = (Unicode61Tokenizer*)pTok;
    sqlite3_free(p->aiException);
    sqlite3_free(p->aFold);
    sqlite3_free(p);
  }
  return;
}

static int unicodeSetCategories(Unicode61Tokenizer *p, const char *zCat){
  const char *z = zCat;

  while( *z ){
    while( *z==' ' || *z=='\t' ) z++;
    if( *z && sqlite3Fts5UnicodeCatParse(z, p->aCategory) ){
      return SQLITE_ERROR;
    }
    while( *z!=' ' && *z!='\t' && *z!='\0' ) z++;
  }

  sqlite3Fts5UnicodeAscii(p->aCategory, p->aTokenChar);
  return SQLITE_OK;
}

/*
** Create a "unicode61" tokenizer.
*/
static int fts5UnicodeCreate(
  void *pUnused, 
  const char **azArg, int nArg,
  Fts5Tokenizer **ppOut
){
  int rc = SQLITE_OK;             /* Return code */
  Unicode61Tokenizer *p = 0;      /* New tokenizer object */ 

  UNUSED_PARAM(pUnused);

  if( nArg%2 ){
    rc = SQLITE_ERROR;
  }else{
    p = (Unicode61Tokenizer*)sqlite3_malloc(sizeof(Unicode61Tokenizer));
    if( p ){
      const char *zCat = "L* N* Co";
      int i;
      memset(p, 0, sizeof(Unicode61Tokenizer));

      p->eRemoveDiacritic = FTS5_REMOVE_DIACRITICS_SIMPLE;
      p->nFold = 64;
      p->aFold = sqlite3_malloc64(p->nFold * sizeof(char));
      if( p->aFold==0 ){
        rc = SQLITE_NOMEM;
      }

      /* Search for a "categories" argument */
      for(i=0; rc==SQLITE_OK && i<nArg; i+=2){
        if( 0==sqlite3_stricmp(azArg[i], "categories") ){
          zCat = azArg[i+1];
        }
      }

      if( rc==SQLITE_OK ){
        rc = unicodeSetCategories(p, zCat);
      }

      for(i=0; rc==SQLITE_OK && i<nArg; i+=2){
        const char *zArg = azArg[i+1];
        if( 0==sqlite3_stricmp(azArg[i], "remove_diacritics") ){
          if( (zArg[0]!='0' && zArg[0]!='1' && zArg[0]!='2') || zArg[1] ){
            rc = SQLITE_ERROR;
          }else{
            p->eRemoveDiacritic = (zArg[0] - '0');
            assert( p->eRemoveDiacritic==FTS5_REMOVE_DIACRITICS_NONE
                 || p->eRemoveDiacritic==FTS5_REMOVE_DIACRITICS_SIMPLE
                 || p->eRemoveDiacritic==FTS5_REMOVE_DIACRITICS_COMPLEX
            );
          }
        }else
        if( 0==sqlite3_stricmp(azArg[i], "tokenchars") ){
          rc = fts5UnicodeAddExceptions(p, zArg, 1);
        }else
        if( 0==sqlite3_stricmp(azArg[i], "separators") ){
          rc = fts5UnicodeAddExceptions(p, zArg, 0);
        }else
        if( 0==sqlite3_stricmp(azArg[i], "categories") ){
          /* no-op */
        }else{
          rc = SQLITE_ERROR;
        }
      }

    }else{
      rc = SQLITE_NOMEM;
    }
    if( rc!=SQLITE_OK ){
      fts5UnicodeDelete((Fts5Tokenizer*)p);
      p = 0;
    }
    *ppOut = (Fts5Tokenizer*)p;
  }
  return rc;
}

/*
** Return true if, for the purposes of tokenizing with the tokenizer
** passed as the first argument, codepoint iCode is considered a token 
** character (not a separator).
*/
static int fts5UnicodeIsAlnum(Unicode61Tokenizer *p, int iCode){
  return (
    p->aCategory[sqlite3Fts5UnicodeCategory((u32)iCode)]
    ^ fts5UnicodeIsException(p, iCode)
  );
}

static int fts5UnicodeTokenize(
  Fts5Tokenizer *pTokenizer,
  void *pCtx,
  int iUnused,
  const char *pText, int nText,
  int (*xToken)(void*, int, const char*, int nToken, int iStart, int iEnd)
){
  Unicode61Tokenizer *p = (Unicode61Tokenizer*)pTokenizer;
  int rc = SQLITE_OK;
  unsigned char *a = p->aTokenChar;

  unsigned char *zTerm = (unsigned char*)&pText[nText];
  unsigned char *zCsr = (unsigned char *)pText;

  /* Output buffer */
  char *aFold = p->aFold;
  int nFold = p->nFold;
  const char *pEnd = &aFold[nFold-6];

  UNUSED_PARAM(iUnused);

  /* Each iteration of this loop gobbles up a contiguous run of separators,
  ** then the next token.  */
  while( rc==SQLITE_OK ){
    u32 iCode;                    /* non-ASCII codepoint read from input */
    char *zOut = aFold;
    int is;
    int ie;

    /* Skip any separator characters. */
    while( 1 ){
      if( zCsr>=zTerm ) goto tokenize_done;
      if( *zCsr & 0x80 ) {
        /* A character outside of the ascii range. Skip past it if it is
        ** a separator character. Or break out of the loop if it is not. */
        is = zCsr - (unsigned char*)pText;
        READ_UTF8(zCsr, zTerm, iCode);
        if( fts5UnicodeIsAlnum(p, iCode) ){
          goto non_ascii_tokenchar;
        }
      }else{
        if( a[*zCsr] ){
          is = zCsr - (unsigned char*)pText;
          goto ascii_tokenchar;
        }
        zCsr++;
      }
    }

    /* Run through the tokenchars. Fold them into the output buffer along
    ** the way.  */
    while( zCsr<zTerm ){

      /* Grow the output buffer so that there is sufficient space to fit the
      ** largest possible utf-8 character.  */
      if( zOut>pEnd ){
        aFold = sqlite3_malloc64((sqlite3_int64)nFold*2);
        if( aFold==0 ){
          rc = SQLITE_NOMEM;
          goto tokenize_done;
        }
        zOut = &aFold[zOut - p->aFold];
        memcpy(aFold, p->aFold, nFold);
        sqlite3_free(p->aFold);
        p->aFold = aFold;
        p->nFold = nFold = nFold*2;
        pEnd = &aFold[nFold-6];
      }

      if( *zCsr & 0x80 ){
        /* An non-ascii-range character. Fold it into the output buffer if
        ** it is a token character, or break out of the loop if it is not. */
        READ_UTF8(zCsr, zTerm, iCode);
        if( fts5UnicodeIsAlnum(p,iCode)||sqlite3Fts5UnicodeIsdiacritic(iCode) ){
 non_ascii_tokenchar:
          iCode = sqlite3Fts5UnicodeFold(iCode, p->eRemoveDiacritic);
          if( iCode ) WRITE_UTF8(zOut, iCode);
        }else{
          break;
        }
      }else if( a[*zCsr]==0 ){
        /* An ascii-range separator character. End of token. */
        break; 
      }else{
 ascii_tokenchar:
        if( *zCsr>='A' && *zCsr<='Z' ){
          *zOut++ = *zCsr + 32;
        }else{
          *zOut++ = *zCsr;
        }
        zCsr++;
      }
      ie = zCsr - (unsigned char*)pText;
    }

    /* Invoke the token callback */
    rc = xToken(pCtx, 0, aFold, zOut-aFold, is, ie); 
  }
  
 tokenize_done:
  if( rc==SQLITE_DONE ) rc = SQLITE_OK;
  return rc;
}

/**************************************************************************
** Start of porter stemmer implementation.
*/

/* Any tokens larger than this (in bytes) are passed through without
** stemming. */
#define FTS5_PORTER_MAX_TOKEN 64

typedef struct PorterTokenizer PorterTokenizer;
struct PorterTokenizer {
  fts5_tokenizer tokenizer;       /* Parent tokenizer module */
  Fts5Tokenizer *pTokenizer;      /* Parent tokenizer instance */
  char aBuf[FTS5_PORTER_MAX_TOKEN + 64];
};

/*
** Delete a "porter" tokenizer.
*/
static void fts5PorterDelete(Fts5Tokenizer *pTok){
  if( pTok ){
    PorterTokenizer *p = (PorterTokenizer*)pTok;
    if( p->pTokenizer ){
      p->tokenizer.xDelete(p->pTokenizer);
    }
    sqlite3_free(p);
  }
}

/*
** Create a "porter" tokenizer.
*/
static int fts5PorterCreate(
  void *pCtx, 
  const char **azArg, int nArg,
  Fts5Tokenizer **ppOut
){
  fts5_api *pApi = (fts5_api*)pCtx;
  int rc = SQLITE_OK;
  PorterTokenizer *pRet;
  void *pUserdata = 0;
  const char *zBase = "unicode61";

  if( nArg>0 ){
    zBase = azArg[0];
  }

  pRet = (PorterTokenizer*)sqlite3_malloc(sizeof(PorterTokenizer));
  if( pRet ){
    memset(pRet, 0, sizeof(PorterTokenizer));
    rc = pApi->xFindTokenizer(pApi, zBase, &pUserdata, &pRet->tokenizer);
  }else{
    rc = SQLITE_NOMEM;
  }
  if( rc==SQLITE_OK ){
    int nArg2 = (nArg>0 ? nArg-1 : 0);
    const char **azArg2 = (nArg2 ? &azArg[1] : 0);
    rc = pRet->tokenizer.xCreate(pUserdata, azArg2, nArg2, &pRet->pTokenizer);
  }

  if( rc!=SQLITE_OK ){
    fts5PorterDelete((Fts5Tokenizer*)pRet);
    pRet = 0;
  }
  *ppOut = (Fts5Tokenizer*)pRet;
  return rc;
}

typedef struct PorterContext PorterContext;
struct PorterContext {
  void *pCtx;
  int (*xToken)(void*, int, const char*, int, int, int);
  char *aBuf;
};

typedef struct PorterRule PorterRule;
struct PorterRule {
  const char *zSuffix;
  int nSuffix;
  int (*xCond)(char *zStem, int nStem);
  const char *zOutput;
  int nOutput;
};

#if 0
static int fts5PorterApply(char *aBuf, int *pnBuf, PorterRule *aRule){
  int ret = -1;
  int nBuf = *pnBuf;
  PorterRule *p;

  for(p=aRule; p->zSuffix; p++){
    assert( strlen(p->zSuffix)==p->nSuffix );
    assert( strlen(p->zOutput)==p->nOutput );
    if( nBuf<p->nSuffix ) continue;
    if( 0==memcmp(&aBuf[nBuf - p->nSuffix], p->zSuffix, p->nSuffix) ) break;
  }

  if( p->zSuffix ){
    int nStem = nBuf - p->nSuffix;
    if( p->xCond==0 || p->xCond(aBuf, nStem) ){
      memcpy(&aBuf[nStem], p->zOutput, p->nOutput);
      *pnBuf = nStem + p->nOutput;
      ret = p - aRule;
    }
  }

  return ret;
}
#endif

static int fts5PorterIsVowel(char c, int bYIsVowel){
  return (
      c=='a' || c=='e' || c=='i' || c=='o' || c=='u' || (bYIsVowel && c=='y')
  );
}

static int fts5PorterGobbleVC(char *zStem, int nStem, int bPrevCons){
  int i;
  int bCons = bPrevCons;

  /* Scan for a vowel */
  for(i=0; i<nStem; i++){
    if( 0==(bCons = !fts5PorterIsVowel(zStem[i], bCons)) ) break;
  }

  /* Scan for a consonent */
  for(i++; i<nStem; i++){
    if( (bCons = !fts5PorterIsVowel(zStem[i], bCons)) ) return i+1;
  }
  return 0;
}

/* porter rule condition: (m > 0) */
static int fts5Porter_MGt0(char *zStem, int nStem){
  return !!fts5PorterGobbleVC(zStem, nStem, 0);
}

/* porter rule condition: (m > 1) */
static int fts5Porter_MGt1(char *zStem, int nStem){
  int n;
  n = fts5PorterGobbleVC(zStem, nStem, 0);
  if( n && fts5PorterGobbleVC(&zStem[n], nStem-n, 1) ){
    return 1;
  }
  return 0;
}

/* porter rule condition: (m = 1) */
static int fts5Porter_MEq1(char *zStem, int nStem){
  int n;
  n = fts5PorterGobbleVC(zStem, nStem, 0);
  if( n && 0==fts5PorterGobbleVC(&zStem[n], nStem-n, 1) ){
    return 1;
  }
  return 0;
}

/* porter rule condition: (*o) */
static int fts5Porter_Ostar(char *zStem, int nStem){
  if( zStem[nStem-1]=='w' || zStem[nStem-1]=='x' || zStem[nStem-1]=='y' ){
    return 0;
  }else{
    int i;
    int mask = 0;
    int bCons = 0;
    for(i=0; i<nStem; i++){
      bCons = !fts5PorterIsVowel(zStem[i], bCons);
      assert( bCons==0 || bCons==1 );
      mask = (mask << 1) + bCons;
    }
    return ((mask & 0x0007)==0x0005);
  }
}

/* porter rule condition: (m > 1 and (*S or *T)) */
static int fts5Porter_MGt1_and_S_or_T(char *zStem, int nStem){
  assert( nStem>0 );
  return (zStem[nStem-1]=='s' || zStem[nStem-1]=='t') 
      && fts5Porter_MGt1(zStem, nStem);
}

/* porter rule condition: (*v*) */
static int fts5Porter_Vowel(char *zStem, int nStem){
  int i;
  for(i=0; i<nStem; i++){
    if( fts5PorterIsVowel(zStem[i], i>0) ){
      return 1;
    }
  }
  return 0;
}


/**************************************************************************
***************************************************************************
** GENERATED CODE STARTS HERE (mkportersteps.tcl)
*/

static int fts5PorterStep4(char *aBuf, int *pnBuf){
  int ret = 0;
  int nBuf = *pnBuf;
  switch( aBuf[nBuf-2] ){
    
    case 'a': 
      if( nBuf>2 && 0==memcmp("al", &aBuf[nBuf-2], 2) ){
        if( fts5Porter_MGt1(aBuf, nBuf-2) ){
          *pnBuf = nBuf - 2;
        }
      }
      break;
  
    case 'c': 
      if( nBuf>4 && 0==memcmp("ance", &aBuf[nBuf-4], 4) ){
        if( fts5Porter_MGt1(aBuf, nBuf-4) ){
          *pnBuf = nBuf - 4;
        }
      }else if( nBuf>4 && 0==memcmp("ence", &aBuf[nBuf-4], 4) ){
        if( fts5Porter_MGt1(aBuf, nBuf-4) ){
          *pnBuf = nBuf - 4;
        }
      }
      break;
  
    case 'e': 
      if( nBuf>2 && 0==memcmp("er", &aBuf[nBuf-2], 2) ){
        if( fts5Porter_MGt1(aBuf, nBuf-2) ){
          *pnBuf = nBuf - 2;
        }
      }
      break;
  
    case 'i': 
      if( nBuf>2 && 0==memcmp("ic", &aBuf[nBuf-2], 2) ){
        if( fts5Porter_MGt1(aBuf, nBuf-2) ){
          *pnBuf = nBuf - 2;
        }
      }
      break;
  
    case 'l': 
      if( nBuf>4 && 0==memcmp("able", &aBuf[nBuf-4], 4) ){
        if( fts5Porter_MGt1(aBuf, nBuf-4) ){
          *pnBuf = nBuf - 4;
        }
      }else if( nBuf>4 && 0==memcmp("ible", &aBuf[nBuf-4], 4) ){
        if( fts5Porter_MGt1(aBuf, nBuf-4) ){
          *pnBuf = nBuf - 4;
        }
      }
      break;
  
    case 'n': 
      if( nBuf>3 && 0==memcmp("ant", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_MGt1(aBuf, nBuf-3) ){
          *pnBuf = nBuf - 3;
        }
      }else if( nBuf>5 && 0==memcmp("ement", &aBuf[nBuf-5], 5) ){
        if( fts5Porter_MGt1(aBuf, nBuf-5) ){
          *pnBuf = nBuf - 5;
        }
      }else if( nBuf>4 && 0==memcmp("ment", &aBuf[nBuf-4], 4) ){
        if( fts5Porter_MGt1(aBuf, nBuf-4) ){
          *pnBuf = nBuf - 4;
        }
      }else if( nBuf>3 && 0==memcmp("ent", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_MGt1(aBuf, nBuf-3) ){
          *pnBuf = nBuf - 3;
        }
      }
      break;
  
    case 'o': 
      if( nBuf>3 && 0==memcmp("ion", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_MGt1_and_S_or_T(aBuf, nBuf-3) ){
          *pnBuf = nBuf - 3;
        }
      }else if( nBuf>2 && 0==memcmp("ou", &aBuf[nBuf-2], 2) ){
        if( fts5Porter_MGt1(aBuf, nBuf-2) ){
          *pnBuf = nBuf - 2;
        }
      }
      break;
  
    case 's': 
      if( nBuf>3 && 0==memcmp("ism", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_MGt1(aBuf, nBuf-3) ){
          *pnBuf = nBuf - 3;
        }
      }
      break;
  
    case 't': 
      if( nBuf>3 && 0==memcmp("ate", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_MGt1(aBuf, nBuf-3) ){
          *pnBuf = nBuf - 3;
        }
      }else if( nBuf>3 && 0==memcmp("iti", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_MGt1(aBuf, nBuf-3) ){
          *pnBuf = nBuf - 3;
        }
      }
      break;
  
    case 'u': 
      if( nBuf>3 && 0==memcmp("ous", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_MGt1(aBuf, nBuf-3) ){
          *pnBuf = nBuf - 3;
        }
      }
      break;
  
    case 'v': 
      if( nBuf>3 && 0==memcmp("ive", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_MGt1(aBuf, nBuf-3) ){
          *pnBuf = nBuf - 3;
        }
      }
      break;
  
    case 'z': 
      if( nBuf>3 && 0==memcmp("ize", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_MGt1(aBuf, nBuf-3) ){
          *pnBuf = nBuf - 3;
        }
      }
      break;
  
  }
  return ret;
}
  

static int fts5PorterStep1B2(char *aBuf, int *pnBuf){
  int ret = 0;
  int nBuf = *pnBuf;
  switch( aBuf[nBuf-2] ){
    
    case 'a': 
      if( nBuf>2 && 0==memcmp("at", &aBuf[nBuf-2], 2) ){
        memcpy(&aBuf[nBuf-2], "ate", 3);
        *pnBuf = nBuf - 2 + 3;
        ret = 1;
      }
      break;
  
    case 'b': 
      if( nBuf>2 && 0==memcmp("bl", &aBuf[nBuf-2], 2) ){
        memcpy(&aBuf[nBuf-2], "ble", 3);
        *pnBuf = nBuf - 2 + 3;
        ret = 1;
      }
      break;
  
    case 'i': 
      if( nBuf>2 && 0==memcmp("iz", &aBuf[nBuf-2], 2) ){
        memcpy(&aBuf[nBuf-2], "ize", 3);
        *pnBuf = nBuf - 2 + 3;
        ret = 1;
      }
      break;
  
  }
  return ret;
}
  

static int fts5PorterStep2(char *aBuf, int *pnBuf){
  int ret = 0;
  int nBuf = *pnBuf;
  switch( aBuf[nBuf-2] ){
    
    case 'a': 
      if( nBuf>7 && 0==memcmp("ational", &aBuf[nBuf-7], 7) ){
        if( fts5Porter_MGt0(aBuf, nBuf-7) ){
          memcpy(&aBuf[nBuf-7], "ate", 3);
          *pnBuf = nBuf - 7 + 3;
        }
      }else if( nBuf>6 && 0==memcmp("tional", &aBuf[nBuf-6], 6) ){
        if( fts5Porter_MGt0(aBuf, nBuf-6) ){
          memcpy(&aBuf[nBuf-6], "tion", 4);
          *pnBuf = nBuf - 6 + 4;
        }
      }
      break;
  
    case 'c': 
      if( nBuf>4 && 0==memcmp("enci", &aBuf[nBuf-4], 4) ){
        if( fts5Porter_MGt0(aBuf, nBuf-4) ){
          memcpy(&aBuf[nBuf-4], "ence", 4);
          *pnBuf = nBuf - 4 + 4;
        }
      }else if( nBuf>4 && 0==memcmp("anci", &aBuf[nBuf-4], 4) ){
        if( fts5Porter_MGt0(aBuf, nBuf-4) ){
          memcpy(&aBuf[nBuf-4], "ance", 4);
          *pnBuf = nBuf - 4 + 4;
        }
      }
      break;
  
    case 'e': 
      if( nBuf>4 && 0==memcmp("izer", &aBuf[nBuf-4], 4) ){
        if( fts5Porter_MGt0(aBuf, nBuf-4) ){
          memcpy(&aBuf[nBuf-4], "ize", 3);
          *pnBuf = nBuf - 4 + 3;
        }
      }
      break;
  
    case 'g': 
      if( nBuf>4 && 0==memcmp("logi", &aBuf[nBuf-4], 4) ){
        if( fts5Porter_MGt0(aBuf, nBuf-4) ){
          memcpy(&aBuf[nBuf-4], "log", 3);
          *pnBuf = nBuf - 4 + 3;
        }
      }
      break;
  
    case 'l': 
      if( nBuf>3 && 0==memcmp("bli", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_MGt0(aBuf, nBuf-3) ){
          memcpy(&aBuf[nBuf-3], "ble", 3);
          *pnBuf = nBuf - 3 + 3;
        }
      }else if( nBuf>4 && 0==memcmp("alli", &aBuf[nBuf-4], 4) ){
        if( fts5Porter_MGt0(aBuf, nBuf-4) ){
          memcpy(&aBuf[nBuf-4], "al", 2);
          *pnBuf = nBuf - 4 + 2;
        }
      }else if( nBuf>5 && 0==memcmp("entli", &aBuf[nBuf-5], 5) ){
        if( fts5Porter_MGt0(aBuf, nBuf-5) ){
          memcpy(&aBuf[nBuf-5], "ent", 3);
          *pnBuf = nBuf - 5 + 3;
        }
      }else if( nBuf>3 && 0==memcmp("eli", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_MGt0(aBuf, nBuf-3) ){
          memcpy(&aBuf[nBuf-3], "e", 1);
          *pnBuf = nBuf - 3 + 1;
        }
      }else if( nBuf>5 && 0==memcmp("ousli", &aBuf[nBuf-5], 5) ){
        if( fts5Porter_MGt0(aBuf, nBuf-5) ){
          memcpy(&aBuf[nBuf-5], "ous", 3);
          *pnBuf = nBuf - 5 + 3;
        }
      }
      break;
  
    case 'o': 
      if( nBuf>7 && 0==memcmp("ization", &aBuf[nBuf-7], 7) ){
        if( fts5Porter_MGt0(aBuf, nBuf-7) ){
          memcpy(&aBuf[nBuf-7], "ize", 3);
          *pnBuf = nBuf - 7 + 3;
        }
      }else if( nBuf>5 && 0==memcmp("ation", &aBuf[nBuf-5], 5) ){
        if( fts5Porter_MGt0(aBuf, nBuf-5) ){
          memcpy(&aBuf[nBuf-5], "ate", 3);
          *pnBuf = nBuf - 5 + 3;
        }
      }else if( nBuf>4 && 0==memcmp("ator", &aBuf[nBuf-4], 4) ){
        if( fts5Porter_MGt0(aBuf, nBuf-4) ){
          memcpy(&aBuf[nBuf-4], "ate", 3);
          *pnBuf = nBuf - 4 + 3;
        }
      }
      break;
  
    case 's': 
      if( nBuf>5 && 0==memcmp("alism", &aBuf[nBuf-5], 5) ){
        if( fts5Porter_MGt0(aBuf, nBuf-5) ){
          memcpy(&aBuf[nBuf-5], "al", 2);
          *pnBuf = nBuf - 5 + 2;
        }
      }else if( nBuf>7 && 0==memcmp("iveness", &aBuf[nBuf-7], 7) ){
        if( fts5Porter_MGt0(aBuf, nBuf-7) ){
          memcpy(&aBuf[nBuf-7], "ive", 3);
          *pnBuf = nBuf - 7 + 3;
        }
      }else if( nBuf>7 && 0==memcmp("fulness", &aBuf[nBuf-7], 7) ){
        if( fts5Porter_MGt0(aBuf, nBuf-7) ){
          memcpy(&aBuf[nBuf-7], "ful", 3);
          *pnBuf = nBuf - 7 + 3;
        }
      }else if( nBuf>7 && 0==memcmp("ousness", &aBuf[nBuf-7], 7) ){
        if( fts5Porter_MGt0(aBuf, nBuf-7) ){
          memcpy(&aBuf[nBuf-7], "ous", 3);
          *pnBuf = nBuf - 7 + 3;
        }
      }
      break;
  
    case 't': 
      if( nBuf>5 && 0==memcmp("aliti", &aBuf[nBuf-5], 5) ){
        if( fts5Porter_MGt0(aBuf, nBuf-5) ){
          memcpy(&aBuf[nBuf-5], "al", 2);
          *pnBuf = nBuf - 5 + 2;
        }
      }else if( nBuf>5 && 0==memcmp("iviti", &aBuf[nBuf-5], 5) ){
        if( fts5Porter_MGt0(aBuf, nBuf-5) ){
          memcpy(&aBuf[nBuf-5], "ive", 3);
          *pnBuf = nBuf - 5 + 3;
        }
      }else if( nBuf>6 && 0==memcmp("biliti", &aBuf[nBuf-6], 6) ){
        if( fts5Porter_MGt0(aBuf, nBuf-6) ){
          memcpy(&aBuf[nBuf-6], "ble", 3);
          *pnBuf = nBuf - 6 + 3;
        }
      }
      break;
  
  }
  return ret;
}
  

static int fts5PorterStep3(char *aBuf, int *pnBuf){
  int ret = 0;
  int nBuf = *pnBuf;
  switch( aBuf[nBuf-2] ){
    
    case 'a': 
      if( nBuf>4 && 0==memcmp("ical", &aBuf[nBuf-4], 4) ){
        if( fts5Porter_MGt0(aBuf, nBuf-4) ){
          memcpy(&aBuf[nBuf-4], "ic", 2);
          *pnBuf = nBuf - 4 + 2;
        }
      }
      break;
  
    case 's': 
      if( nBuf>4 && 0==memcmp("ness", &aBuf[nBuf-4], 4) ){
        if( fts5Porter_MGt0(aBuf, nBuf-4) ){
          *pnBuf = nBuf - 4;
        }
      }
      break;
  
    case 't': 
      if( nBuf>5 && 0==memcmp("icate", &aBuf[nBuf-5], 5) ){
        if( fts5Porter_MGt0(aBuf, nBuf-5) ){
          memcpy(&aBuf[nBuf-5], "ic", 2);
          *pnBuf = nBuf - 5 + 2;
        }
      }else if( nBuf>5 && 0==memcmp("iciti", &aBuf[nBuf-5], 5) ){
        if( fts5Porter_MGt0(aBuf, nBuf-5) ){
          memcpy(&aBuf[nBuf-5], "ic", 2);
          *pnBuf = nBuf - 5 + 2;
        }
      }
      break;
  
    case 'u': 
      if( nBuf>3 && 0==memcmp("ful", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_MGt0(aBuf, nBuf-3) ){
          *pnBuf = nBuf - 3;
        }
      }
      break;
  
    case 'v': 
      if( nBuf>5 && 0==memcmp("ative", &aBuf[nBuf-5], 5) ){
        if( fts5Porter_MGt0(aBuf, nBuf-5) ){
          *pnBuf = nBuf - 5;
        }
      }
      break;
  
    case 'z': 
      if( nBuf>5 && 0==memcmp("alize", &aBuf[nBuf-5], 5) ){
        if( fts5Porter_MGt0(aBuf, nBuf-5) ){
          memcpy(&aBuf[nBuf-5], "al", 2);
          *pnBuf = nBuf - 5 + 2;
        }
      }
      break;
  
  }
  return ret;
}
  

static int fts5PorterStep1B(char *aBuf, int *pnBuf){
  int ret = 0;
  int nBuf = *pnBuf;
  switch( aBuf[nBuf-2] ){
    
    case 'e': 
      if( nBuf>3 && 0==memcmp("eed", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_MGt0(aBuf, nBuf-3) ){
          memcpy(&aBuf[nBuf-3], "ee", 2);
          *pnBuf = nBuf - 3 + 2;
        }
      }else if( nBuf>2 && 0==memcmp("ed", &aBuf[nBuf-2], 2) ){
        if( fts5Porter_Vowel(aBuf, nBuf-2) ){
          *pnBuf = nBuf - 2;
          ret = 1;
        }
      }
      break;
  
    case 'n': 
      if( nBuf>3 && 0==memcmp("ing", &aBuf[nBuf-3], 3) ){
        if( fts5Porter_Vowel(aBuf, nBuf-3) ){
          *pnBuf = nBuf - 3;
          ret = 1;
        }
      }
      break;
  
  }
  return ret;
}
  
/* 
** GENERATED CODE ENDS HERE (mkportersteps.tcl)
***************************************************************************
**************************************************************************/

static void fts5PorterStep1A(char *aBuf, int *pnBuf){
  int nBuf = *pnBuf;
  if( aBuf[nBuf-1]=='s' ){
    if( aBuf[nBuf-2]=='e' ){
      if( (nBuf>4 && aBuf[nBuf-4]=='s' && aBuf[nBuf-3]=='s') 
       || (nBuf>3 && aBuf[nBuf-3]=='i' )
      ){
        *pnBuf = nBuf-2;
      }else{
        *pnBuf = nBuf-1;
      }
    }
    else if( aBuf[nBuf-2]!='s' ){
      *pnBuf = nBuf-1;
    }
  }
}

static int fts5PorterCb(
  void *pCtx, 
  int tflags,
  const char *pToken, 
  int nToken, 
  int iStart, 
  int iEnd
){
  PorterContext *p = (PorterContext*)pCtx;

  char *aBuf;
  int nBuf;

  if( nToken>FTS5_PORTER_MAX_TOKEN || nToken<3 ) goto pass_through;
  aBuf = p->aBuf;
  nBuf = nToken;
  memcpy(aBuf, pToken, nBuf);

  /* Step 1. */
  fts5PorterStep1A(aBuf, &nBuf);
  if( fts5PorterStep1B(aBuf, &nBuf) ){
    if( fts5PorterStep1B2(aBuf, &nBuf)==0 ){
      char c = aBuf[nBuf-1];
      if( fts5PorterIsVowel(c, 0)==0 
       && c!='l' && c!='s' && c!='z' && c==aBuf[nBuf-2] 
      ){
        nBuf--;
      }else if( fts5Porter_MEq1(aBuf, nBuf) && fts5Porter_Ostar(aBuf, nBuf) ){
        aBuf[nBuf++] = 'e';
      }
    }
  }

  /* Step 1C. */
  if( aBuf[nBuf-1]=='y' && fts5Porter_Vowel(aBuf, nBuf-1) ){
    aBuf[nBuf-1] = 'i';
  }

  /* Steps 2 through 4. */
  fts5PorterStep2(aBuf, &nBuf);
  fts5PorterStep3(aBuf, &nBuf);
  fts5PorterStep4(aBuf, &nBuf);

  /* Step 5a. */
  assert( nBuf>0 );
  if( aBuf[nBuf-1]=='e' ){
    if( fts5Porter_MGt1(aBuf, nBuf-1) 
     || (fts5Porter_MEq1(aBuf, nBuf-1) && !fts5Porter_Ostar(aBuf, nBuf-1))
    ){
      nBuf--;
    }
  }

  /* Step 5b. */
  if( nBuf>1 && aBuf[nBuf-1]=='l' 
   && aBuf[nBuf-2]=='l' && fts5Porter_MGt1(aBuf, nBuf-1) 
  ){
    nBuf--;
  }

  return p->xToken(p->pCtx, tflags, aBuf, nBuf, iStart, iEnd);

 pass_through:
  return p->xToken(p->pCtx, tflags, pToken, nToken, iStart, iEnd);
}

/*
** Tokenize using the porter tokenizer.
*/
static int fts5PorterTokenize(
  Fts5Tokenizer *pTokenizer,
  void *pCtx,
  int flags,
  const char *pText, int nText,
  int (*xToken)(void*, int, const char*, int nToken, int iStart, int iEnd)
){
  PorterTokenizer *p = (PorterTokenizer*)pTokenizer;
  PorterContext sCtx;
  sCtx.xToken = xToken;
  sCtx.pCtx = pCtx;
  sCtx.aBuf = p->aBuf;
  return p->tokenizer.xTokenize(
      p->pTokenizer, (void*)&sCtx, flags, pText, nText, fts5PorterCb
  );
}

/*
** Register all built-in tokenizers with FTS5.
*/
int sqlite3Fts5TokenizerInit(fts5_api *pApi){
  struct BuiltinTokenizer {
    const char *zName;
    fts5_tokenizer x;
  } aBuiltin[] = {
    { "unicode61", {fts5UnicodeCreate, fts5UnicodeDelete, fts5UnicodeTokenize}},
    { "ascii",     {fts5AsciiCreate, fts5AsciiDelete, fts5AsciiTokenize }},
    { "porter",    {fts5PorterCreate, fts5PorterDelete, fts5PorterTokenize }},
  };
  
  int rc = SQLITE_OK;             /* Return code */
  int i;                          /* To iterate through builtin functions */

  for(i=0; rc==SQLITE_OK && i<ArraySize(aBuiltin); i++){
    rc = pApi->xCreateTokenizer(pApi,
        aBuiltin[i].zName,
        (void*)pApi,
        &aBuiltin[i].x,
        0
    );
  }

  return rc;
}
