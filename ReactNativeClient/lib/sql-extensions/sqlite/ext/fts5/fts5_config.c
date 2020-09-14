/*
** 2014 Jun 09
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
** This is an SQLite module implementing full-text search.
*/


#include "fts5Int.h"

#define FTS5_DEFAULT_PAGE_SIZE   4050
#define FTS5_DEFAULT_AUTOMERGE      4
#define FTS5_DEFAULT_USERMERGE      4
#define FTS5_DEFAULT_CRISISMERGE   16
#define FTS5_DEFAULT_HASHSIZE    (1024*1024)

/* Maximum allowed page size */
#define FTS5_MAX_PAGE_SIZE (64*1024)

static int fts5_iswhitespace(char x){
  return (x==' ');
}

static int fts5_isopenquote(char x){
  return (x=='"' || x=='\'' || x=='[' || x=='`');
}

/*
** Argument pIn points to a character that is part of a nul-terminated 
** string. Return a pointer to the first character following *pIn in 
** the string that is not a white-space character.
*/
static const char *fts5ConfigSkipWhitespace(const char *pIn){
  const char *p = pIn;
  if( p ){
    while( fts5_iswhitespace(*p) ){ p++; }
  }
  return p;
}

/*
** Argument pIn points to a character that is part of a nul-terminated 
** string. Return a pointer to the first character following *pIn in 
** the string that is not a "bareword" character.
*/
static const char *fts5ConfigSkipBareword(const char *pIn){
  const char *p = pIn;
  while ( sqlite3Fts5IsBareword(*p) ) p++;
  if( p==pIn ) p = 0;
  return p;
}

static int fts5_isdigit(char a){
  return (a>='0' && a<='9');
}



static const char *fts5ConfigSkipLiteral(const char *pIn){
  const char *p = pIn;
  switch( *p ){
    case 'n': case 'N':
      if( sqlite3_strnicmp("null", p, 4)==0 ){
        p = &p[4];
      }else{
        p = 0;
      }
      break;

    case 'x': case 'X':
      p++;
      if( *p=='\'' ){
        p++;
        while( (*p>='a' && *p<='f') 
            || (*p>='A' && *p<='F') 
            || (*p>='0' && *p<='9') 
            ){
          p++;
        }
        if( *p=='\'' && 0==((p-pIn)%2) ){
          p++;
        }else{
          p = 0;
        }
      }else{
        p = 0;
      }
      break;

    case '\'':
      p++;
      while( p ){
        if( *p=='\'' ){
          p++;
          if( *p!='\'' ) break;
        }
        p++;
        if( *p==0 ) p = 0;
      }
      break;

    default:
      /* maybe a number */
      if( *p=='+' || *p=='-' ) p++;
      while( fts5_isdigit(*p) ) p++;

      /* At this point, if the literal was an integer, the parse is 
      ** finished. Or, if it is a floating point value, it may continue
      ** with either a decimal point or an 'E' character. */
      if( *p=='.' && fts5_isdigit(p[1]) ){
        p += 2;
        while( fts5_isdigit(*p) ) p++;
      }
      if( p==pIn ) p = 0;

      break;
  }

  return p;
}

/*
** The first character of the string pointed to by argument z is guaranteed
** to be an open-quote character (see function fts5_isopenquote()).
**
** This function searches for the corresponding close-quote character within
** the string and, if found, dequotes the string in place and adds a new
** nul-terminator byte.
**
** If the close-quote is found, the value returned is the byte offset of
** the character immediately following it. Or, if the close-quote is not 
** found, -1 is returned. If -1 is returned, the buffer is left in an 
** undefined state.
*/
static int fts5Dequote(char *z){
  char q;
  int iIn = 1;
  int iOut = 0;
  q = z[0];

  /* Set stack variable q to the close-quote character */
  assert( q=='[' || q=='\'' || q=='"' || q=='`' );
  if( q=='[' ) q = ']';  

  while( z[iIn] ){
    if( z[iIn]==q ){
      if( z[iIn+1]!=q ){
        /* Character iIn was the close quote. */
        iIn++;
        break;
      }else{
        /* Character iIn and iIn+1 form an escaped quote character. Skip
        ** the input cursor past both and copy a single quote character 
        ** to the output buffer. */
        iIn += 2;
        z[iOut++] = q;
      }
    }else{
      z[iOut++] = z[iIn++];
    }
  }

  z[iOut] = '\0';
  return iIn;
}

/*
** Convert an SQL-style quoted string into a normal string by removing
** the quote characters.  The conversion is done in-place.  If the
** input does not begin with a quote character, then this routine
** is a no-op.
**
** Examples:
**
**     "abc"   becomes   abc
**     'xyz'   becomes   xyz
**     [pqr]   becomes   pqr
**     `mno`   becomes   mno
*/
void sqlite3Fts5Dequote(char *z){
  char quote;                     /* Quote character (if any ) */

  assert( 0==fts5_iswhitespace(z[0]) );
  quote = z[0];
  if( quote=='[' || quote=='\'' || quote=='"' || quote=='`' ){
    fts5Dequote(z);
  }
}


struct Fts5Enum {
  const char *zName;
  int eVal;
};
typedef struct Fts5Enum Fts5Enum;

static int fts5ConfigSetEnum(
  const Fts5Enum *aEnum, 
  const char *zEnum, 
  int *peVal
){
  int nEnum = (int)strlen(zEnum);
  int i;
  int iVal = -1;

  for(i=0; aEnum[i].zName; i++){
    if( sqlite3_strnicmp(aEnum[i].zName, zEnum, nEnum)==0 ){
      if( iVal>=0 ) return SQLITE_ERROR;
      iVal = aEnum[i].eVal;
    }
  }

  *peVal = iVal;
  return iVal<0 ? SQLITE_ERROR : SQLITE_OK;
}

/*
** Parse a "special" CREATE VIRTUAL TABLE directive and update
** configuration object pConfig as appropriate.
**
** If successful, object pConfig is updated and SQLITE_OK returned. If
** an error occurs, an SQLite error code is returned and an error message
** may be left in *pzErr. It is the responsibility of the caller to
** eventually free any such error message using sqlite3_free().
*/
static int fts5ConfigParseSpecial(
  Fts5Global *pGlobal,
  Fts5Config *pConfig,            /* Configuration object to update */
  const char *zCmd,               /* Special command to parse */
  const char *zArg,               /* Argument to parse */
  char **pzErr                    /* OUT: Error message */
){
  int rc = SQLITE_OK;
  int nCmd = (int)strlen(zCmd);
  if( sqlite3_strnicmp("prefix", zCmd, nCmd)==0 ){
    const int nByte = sizeof(int) * FTS5_MAX_PREFIX_INDEXES;
    const char *p;
    int bFirst = 1;
    if( pConfig->aPrefix==0 ){
      pConfig->aPrefix = sqlite3Fts5MallocZero(&rc, nByte);
      if( rc ) return rc;
    }

    p = zArg;
    while( 1 ){
      int nPre = 0;

      while( p[0]==' ' ) p++;
      if( bFirst==0 && p[0]==',' ){
        p++;
        while( p[0]==' ' ) p++;
      }else if( p[0]=='\0' ){
        break;
      }
      if( p[0]<'0' || p[0]>'9' ){
        *pzErr = sqlite3_mprintf("malformed prefix=... directive");
        rc = SQLITE_ERROR;
        break;
      }

      if( pConfig->nPrefix==FTS5_MAX_PREFIX_INDEXES ){
        *pzErr = sqlite3_mprintf(
            "too many prefix indexes (max %d)", FTS5_MAX_PREFIX_INDEXES
        );
        rc = SQLITE_ERROR;
        break;
      }

      while( p[0]>='0' && p[0]<='9' && nPre<1000 ){
        nPre = nPre*10 + (p[0] - '0');
        p++;
      }

      if( nPre<=0 || nPre>=1000 ){
        *pzErr = sqlite3_mprintf("prefix length out of range (max 999)");
        rc = SQLITE_ERROR;
        break;
      }

      pConfig->aPrefix[pConfig->nPrefix] = nPre;
      pConfig->nPrefix++;
      bFirst = 0;
    }
    assert( pConfig->nPrefix<=FTS5_MAX_PREFIX_INDEXES );
    return rc;
  }

  if( sqlite3_strnicmp("tokenize", zCmd, nCmd)==0 ){
    const char *p = (const char*)zArg;
    sqlite3_int64 nArg = strlen(zArg) + 1;
    char **azArg = sqlite3Fts5MallocZero(&rc, sizeof(char*) * nArg);
    char *pDel = sqlite3Fts5MallocZero(&rc, nArg * 2);
    char *pSpace = pDel;

    if( azArg && pSpace ){
      if( pConfig->pTok ){
        *pzErr = sqlite3_mprintf("multiple tokenize=... directives");
        rc = SQLITE_ERROR;
      }else{
        for(nArg=0; p && *p; nArg++){
          const char *p2 = fts5ConfigSkipWhitespace(p);
          if( *p2=='\'' ){
            p = fts5ConfigSkipLiteral(p2);
          }else{
            p = fts5ConfigSkipBareword(p2);
          }
          if( p ){
            memcpy(pSpace, p2, p-p2);
            azArg[nArg] = pSpace;
            sqlite3Fts5Dequote(pSpace);
            pSpace += (p - p2) + 1;
            p = fts5ConfigSkipWhitespace(p);
          }
        }
        if( p==0 ){
          *pzErr = sqlite3_mprintf("parse error in tokenize directive");
          rc = SQLITE_ERROR;
        }else{
          rc = sqlite3Fts5GetTokenizer(pGlobal, 
              (const char**)azArg, (int)nArg, &pConfig->pTok, &pConfig->pTokApi,
              pzErr
          );
        }
      }
    }

    sqlite3_free(azArg);
    sqlite3_free(pDel);
    return rc;
  }

  if( sqlite3_strnicmp("content", zCmd, nCmd)==0 ){
    if( pConfig->eContent!=FTS5_CONTENT_NORMAL ){
      *pzErr = sqlite3_mprintf("multiple content=... directives");
      rc = SQLITE_ERROR;
    }else{
      if( zArg[0] ){
        pConfig->eContent = FTS5_CONTENT_EXTERNAL;
        pConfig->zContent = sqlite3Fts5Mprintf(&rc, "%Q.%Q", pConfig->zDb,zArg);
      }else{
        pConfig->eContent = FTS5_CONTENT_NONE;
      }
    }
    return rc;
  }

  if( sqlite3_strnicmp("content_rowid", zCmd, nCmd)==0 ){
    if( pConfig->zContentRowid ){
      *pzErr = sqlite3_mprintf("multiple content_rowid=... directives");
      rc = SQLITE_ERROR;
    }else{
      pConfig->zContentRowid = sqlite3Fts5Strndup(&rc, zArg, -1);
    }
    return rc;
  }

  if( sqlite3_strnicmp("columnsize", zCmd, nCmd)==0 ){
    if( (zArg[0]!='0' && zArg[0]!='1') || zArg[1]!='\0' ){
      *pzErr = sqlite3_mprintf("malformed columnsize=... directive");
      rc = SQLITE_ERROR;
    }else{
      pConfig->bColumnsize = (zArg[0]=='1');
    }
    return rc;
  }

  if( sqlite3_strnicmp("detail", zCmd, nCmd)==0 ){
    const Fts5Enum aDetail[] = {
      { "none", FTS5_DETAIL_NONE },
      { "full", FTS5_DETAIL_FULL },
      { "columns", FTS5_DETAIL_COLUMNS },
      { 0, 0 }
    };

    if( (rc = fts5ConfigSetEnum(aDetail, zArg, &pConfig->eDetail)) ){
      *pzErr = sqlite3_mprintf("malformed detail=... directive");
    }
    return rc;
  }

  *pzErr = sqlite3_mprintf("unrecognized option: \"%.*s\"", nCmd, zCmd);
  return SQLITE_ERROR;
}

/*
** Allocate an instance of the default tokenizer ("simple") at 
** Fts5Config.pTokenizer. Return SQLITE_OK if successful, or an SQLite error
** code if an error occurs.
*/
static int fts5ConfigDefaultTokenizer(Fts5Global *pGlobal, Fts5Config *pConfig){
  assert( pConfig->pTok==0 && pConfig->pTokApi==0 );
  return sqlite3Fts5GetTokenizer(
      pGlobal, 0, 0, &pConfig->pTok, &pConfig->pTokApi, 0
  );
}

/*
** Gobble up the first bareword or quoted word from the input buffer zIn.
** Return a pointer to the character immediately following the last in
** the gobbled word if successful, or a NULL pointer otherwise (failed
** to find close-quote character).
**
** Before returning, set pzOut to point to a new buffer containing a
** nul-terminated, dequoted copy of the gobbled word. If the word was
** quoted, *pbQuoted is also set to 1 before returning.
**
** If *pRc is other than SQLITE_OK when this function is called, it is
** a no-op (NULL is returned). Otherwise, if an OOM occurs within this
** function, *pRc is set to SQLITE_NOMEM before returning. *pRc is *not*
** set if a parse error (failed to find close quote) occurs.
*/
static const char *fts5ConfigGobbleWord(
  int *pRc,                       /* IN/OUT: Error code */
  const char *zIn,                /* Buffer to gobble string/bareword from */
  char **pzOut,                   /* OUT: malloc'd buffer containing str/bw */
  int *pbQuoted                   /* OUT: Set to true if dequoting required */
){
  const char *zRet = 0;

  sqlite3_int64 nIn = strlen(zIn);
  char *zOut = sqlite3_malloc64(nIn+1);

  assert( *pRc==SQLITE_OK );
  *pbQuoted = 0;
  *pzOut = 0;

  if( zOut==0 ){
    *pRc = SQLITE_NOMEM;
  }else{
    memcpy(zOut, zIn, (size_t)(nIn+1));
    if( fts5_isopenquote(zOut[0]) ){
      int ii = fts5Dequote(zOut);
      zRet = &zIn[ii];
      *pbQuoted = 1;
    }else{
      zRet = fts5ConfigSkipBareword(zIn);
      if( zRet ){
        zOut[zRet-zIn] = '\0';
      }
    }
  }

  if( zRet==0 ){
    sqlite3_free(zOut);
  }else{
    *pzOut = zOut;
  }

  return zRet;
}

static int fts5ConfigParseColumn(
  Fts5Config *p, 
  char *zCol, 
  char *zArg, 
  char **pzErr
){
  int rc = SQLITE_OK;
  if( 0==sqlite3_stricmp(zCol, FTS5_RANK_NAME) 
   || 0==sqlite3_stricmp(zCol, FTS5_ROWID_NAME) 
  ){
    *pzErr = sqlite3_mprintf("reserved fts5 column name: %s", zCol);
    rc = SQLITE_ERROR;
  }else if( zArg ){
    if( 0==sqlite3_stricmp(zArg, "unindexed") ){
      p->abUnindexed[p->nCol] = 1;
    }else{
      *pzErr = sqlite3_mprintf("unrecognized column option: %s", zArg);
      rc = SQLITE_ERROR;
    }
  }

  p->azCol[p->nCol++] = zCol;
  return rc;
}

/*
** Populate the Fts5Config.zContentExprlist string.
*/
static int fts5ConfigMakeExprlist(Fts5Config *p){
  int i;
  int rc = SQLITE_OK;
  Fts5Buffer buf = {0, 0, 0};

  sqlite3Fts5BufferAppendPrintf(&rc, &buf, "T.%Q", p->zContentRowid);
  if( p->eContent!=FTS5_CONTENT_NONE ){
    for(i=0; i<p->nCol; i++){
      if( p->eContent==FTS5_CONTENT_EXTERNAL ){
        sqlite3Fts5BufferAppendPrintf(&rc, &buf, ", T.%Q", p->azCol[i]);
      }else{
        sqlite3Fts5BufferAppendPrintf(&rc, &buf, ", T.c%d", i);
      }
    }
  }

  assert( p->zContentExprlist==0 );
  p->zContentExprlist = (char*)buf.p;
  return rc;
}

/*
** Arguments nArg/azArg contain the string arguments passed to the xCreate
** or xConnect method of the virtual table. This function attempts to 
** allocate an instance of Fts5Config containing the results of parsing
** those arguments.
**
** If successful, SQLITE_OK is returned and *ppOut is set to point to the
** new Fts5Config object. If an error occurs, an SQLite error code is 
** returned, *ppOut is set to NULL and an error message may be left in
** *pzErr. It is the responsibility of the caller to eventually free any 
** such error message using sqlite3_free().
*/
int sqlite3Fts5ConfigParse(
  Fts5Global *pGlobal,
  sqlite3 *db,
  int nArg,                       /* Number of arguments */
  const char **azArg,             /* Array of nArg CREATE VIRTUAL TABLE args */
  Fts5Config **ppOut,             /* OUT: Results of parse */
  char **pzErr                    /* OUT: Error message */
){
  int rc = SQLITE_OK;             /* Return code */
  Fts5Config *pRet;               /* New object to return */
  int i;
  sqlite3_int64 nByte;

  *ppOut = pRet = (Fts5Config*)sqlite3_malloc(sizeof(Fts5Config));
  if( pRet==0 ) return SQLITE_NOMEM;
  memset(pRet, 0, sizeof(Fts5Config));
  pRet->db = db;
  pRet->iCookie = -1;

  nByte = nArg * (sizeof(char*) + sizeof(u8));
  pRet->azCol = (char**)sqlite3Fts5MallocZero(&rc, nByte);
  pRet->abUnindexed = (u8*)&pRet->azCol[nArg];
  pRet->zDb = sqlite3Fts5Strndup(&rc, azArg[1], -1);
  pRet->zName = sqlite3Fts5Strndup(&rc, azArg[2], -1);
  pRet->bColumnsize = 1;
  pRet->eDetail = FTS5_DETAIL_FULL;
#ifdef SQLITE_DEBUG
  pRet->bPrefixIndex = 1;
#endif
  if( rc==SQLITE_OK && sqlite3_stricmp(pRet->zName, FTS5_RANK_NAME)==0 ){
    *pzErr = sqlite3_mprintf("reserved fts5 table name: %s", pRet->zName);
    rc = SQLITE_ERROR;
  }

  for(i=3; rc==SQLITE_OK && i<nArg; i++){
    const char *zOrig = azArg[i];
    const char *z;
    char *zOne = 0;
    char *zTwo = 0;
    int bOption = 0;
    int bMustBeCol = 0;

    z = fts5ConfigGobbleWord(&rc, zOrig, &zOne, &bMustBeCol);
    z = fts5ConfigSkipWhitespace(z);
    if( z && *z=='=' ){
      bOption = 1;
      z++;
      if( bMustBeCol ) z = 0;
    }
    z = fts5ConfigSkipWhitespace(z);
    if( z && z[0] ){
      int bDummy;
      z = fts5ConfigGobbleWord(&rc, z, &zTwo, &bDummy);
      if( z && z[0] ) z = 0;
    }

    if( rc==SQLITE_OK ){
      if( z==0 ){
        *pzErr = sqlite3_mprintf("parse error in \"%s\"", zOrig);
        rc = SQLITE_ERROR;
      }else{
        if( bOption ){
          rc = fts5ConfigParseSpecial(pGlobal, pRet, zOne, zTwo?zTwo:"", pzErr);
        }else{
          rc = fts5ConfigParseColumn(pRet, zOne, zTwo, pzErr);
          zOne = 0;
        }
      }
    }

    sqlite3_free(zOne);
    sqlite3_free(zTwo);
  }

  /* If a tokenizer= option was successfully parsed, the tokenizer has
  ** already been allocated. Otherwise, allocate an instance of the default
  ** tokenizer (unicode61) now.  */
  if( rc==SQLITE_OK && pRet->pTok==0 ){
    rc = fts5ConfigDefaultTokenizer(pGlobal, pRet);
  }

  /* If no zContent option was specified, fill in the default values. */
  if( rc==SQLITE_OK && pRet->zContent==0 ){
    const char *zTail = 0;
    assert( pRet->eContent==FTS5_CONTENT_NORMAL 
         || pRet->eContent==FTS5_CONTENT_NONE 
    );
    if( pRet->eContent==FTS5_CONTENT_NORMAL ){
      zTail = "content";
    }else if( pRet->bColumnsize ){
      zTail = "docsize";
    }

    if( zTail ){
      pRet->zContent = sqlite3Fts5Mprintf(
          &rc, "%Q.'%q_%s'", pRet->zDb, pRet->zName, zTail
      );
    }
  }

  if( rc==SQLITE_OK && pRet->zContentRowid==0 ){
    pRet->zContentRowid = sqlite3Fts5Strndup(&rc, "rowid", -1);
  }

  /* Formulate the zContentExprlist text */
  if( rc==SQLITE_OK ){
    rc = fts5ConfigMakeExprlist(pRet);
  }

  if( rc!=SQLITE_OK ){
    sqlite3Fts5ConfigFree(pRet);
    *ppOut = 0;
  }
  return rc;
}

/*
** Free the configuration object passed as the only argument.
*/
void sqlite3Fts5ConfigFree(Fts5Config *pConfig){
  if( pConfig ){
    int i;
    if( pConfig->pTok ){
      pConfig->pTokApi->xDelete(pConfig->pTok);
    }
    sqlite3_free(pConfig->zDb);
    sqlite3_free(pConfig->zName);
    for(i=0; i<pConfig->nCol; i++){
      sqlite3_free(pConfig->azCol[i]);
    }
    sqlite3_free(pConfig->azCol);
    sqlite3_free(pConfig->aPrefix);
    sqlite3_free(pConfig->zRank);
    sqlite3_free(pConfig->zRankArgs);
    sqlite3_free(pConfig->zContent);
    sqlite3_free(pConfig->zContentRowid);
    sqlite3_free(pConfig->zContentExprlist);
    sqlite3_free(pConfig);
  }
}

/*
** Call sqlite3_declare_vtab() based on the contents of the configuration
** object passed as the only argument. Return SQLITE_OK if successful, or
** an SQLite error code if an error occurs.
*/
int sqlite3Fts5ConfigDeclareVtab(Fts5Config *pConfig){
  int i;
  int rc = SQLITE_OK;
  char *zSql;

  zSql = sqlite3Fts5Mprintf(&rc, "CREATE TABLE x(");
  for(i=0; zSql && i<pConfig->nCol; i++){
    const char *zSep = (i==0?"":", ");
    zSql = sqlite3Fts5Mprintf(&rc, "%z%s%Q", zSql, zSep, pConfig->azCol[i]);
  }
  zSql = sqlite3Fts5Mprintf(&rc, "%z, %Q HIDDEN, %s HIDDEN)", 
      zSql, pConfig->zName, FTS5_RANK_NAME
  );

  assert( zSql || rc==SQLITE_NOMEM );
  if( zSql ){
    rc = sqlite3_declare_vtab(pConfig->db, zSql);
    sqlite3_free(zSql);
  }
 
  return rc;
}

/*
** Tokenize the text passed via the second and third arguments.
**
** The callback is invoked once for each token in the input text. The
** arguments passed to it are, in order:
**
**     void *pCtx          // Copy of 4th argument to sqlite3Fts5Tokenize()
**     const char *pToken  // Pointer to buffer containing token
**     int nToken          // Size of token in bytes
**     int iStart          // Byte offset of start of token within input text
**     int iEnd            // Byte offset of end of token within input text
**     int iPos            // Position of token in input (first token is 0)
**
** If the callback returns a non-zero value the tokenization is abandoned
** and no further callbacks are issued. 
**
** This function returns SQLITE_OK if successful or an SQLite error code
** if an error occurs. If the tokenization was abandoned early because
** the callback returned SQLITE_DONE, this is not an error and this function
** still returns SQLITE_OK. Or, if the tokenization was abandoned early
** because the callback returned another non-zero value, it is assumed
** to be an SQLite error code and returned to the caller.
*/
int sqlite3Fts5Tokenize(
  Fts5Config *pConfig,            /* FTS5 Configuration object */
  int flags,                      /* FTS5_TOKENIZE_* flags */
  const char *pText, int nText,   /* Text to tokenize */
  void *pCtx,                     /* Context passed to xToken() */
  int (*xToken)(void*, int, const char*, int, int, int)    /* Callback */
){
  if( pText==0 ) return SQLITE_OK;
  return pConfig->pTokApi->xTokenize(
      pConfig->pTok, pCtx, flags, pText, nText, xToken
  );
}

/*
** Argument pIn points to the first character in what is expected to be
** a comma-separated list of SQL literals followed by a ')' character.
** If it actually is this, return a pointer to the ')'. Otherwise, return
** NULL to indicate a parse error.
*/
static const char *fts5ConfigSkipArgs(const char *pIn){
  const char *p = pIn;
  
  while( 1 ){
    p = fts5ConfigSkipWhitespace(p);
    p = fts5ConfigSkipLiteral(p);
    p = fts5ConfigSkipWhitespace(p);
    if( p==0 || *p==')' ) break;
    if( *p!=',' ){
      p = 0;
      break;
    }
    p++;
  }

  return p;
}

/*
** Parameter zIn contains a rank() function specification. The format of 
** this is:
**
**   + Bareword (function name)
**   + Open parenthesis - "("
**   + Zero or more SQL literals in a comma separated list
**   + Close parenthesis - ")"
*/
int sqlite3Fts5ConfigParseRank(
  const char *zIn,                /* Input string */
  char **pzRank,                  /* OUT: Rank function name */
  char **pzRankArgs               /* OUT: Rank function arguments */
){
  const char *p = zIn;
  const char *pRank;
  char *zRank = 0;
  char *zRankArgs = 0;
  int rc = SQLITE_OK;

  *pzRank = 0;
  *pzRankArgs = 0;

  if( p==0 ){
    rc = SQLITE_ERROR;
  }else{
    p = fts5ConfigSkipWhitespace(p);
    pRank = p;
    p = fts5ConfigSkipBareword(p);

    if( p ){
      zRank = sqlite3Fts5MallocZero(&rc, 1 + p - pRank);
      if( zRank ) memcpy(zRank, pRank, p-pRank);
    }else{
      rc = SQLITE_ERROR;
    }

    if( rc==SQLITE_OK ){
      p = fts5ConfigSkipWhitespace(p);
      if( *p!='(' ) rc = SQLITE_ERROR;
      p++;
    }
    if( rc==SQLITE_OK ){
      const char *pArgs; 
      p = fts5ConfigSkipWhitespace(p);
      pArgs = p;
      if( *p!=')' ){
        p = fts5ConfigSkipArgs(p);
        if( p==0 ){
          rc = SQLITE_ERROR;
        }else{
          zRankArgs = sqlite3Fts5MallocZero(&rc, 1 + p - pArgs);
          if( zRankArgs ) memcpy(zRankArgs, pArgs, p-pArgs);
        }
      }
    }
  }

  if( rc!=SQLITE_OK ){
    sqlite3_free(zRank);
    assert( zRankArgs==0 );
  }else{
    *pzRank = zRank;
    *pzRankArgs = zRankArgs;
  }
  return rc;
}

int sqlite3Fts5ConfigSetValue(
  Fts5Config *pConfig, 
  const char *zKey, 
  sqlite3_value *pVal,
  int *pbBadkey
){
  int rc = SQLITE_OK;

  if( 0==sqlite3_stricmp(zKey, "pgsz") ){
    int pgsz = 0;
    if( SQLITE_INTEGER==sqlite3_value_numeric_type(pVal) ){
      pgsz = sqlite3_value_int(pVal);
    }
    if( pgsz<32 || pgsz>FTS5_MAX_PAGE_SIZE ){
      *pbBadkey = 1;
    }else{
      pConfig->pgsz = pgsz;
    }
  }

  else if( 0==sqlite3_stricmp(zKey, "hashsize") ){
    int nHashSize = -1;
    if( SQLITE_INTEGER==sqlite3_value_numeric_type(pVal) ){
      nHashSize = sqlite3_value_int(pVal);
    }
    if( nHashSize<=0 ){
      *pbBadkey = 1;
    }else{
      pConfig->nHashSize = nHashSize;
    }
  }

  else if( 0==sqlite3_stricmp(zKey, "automerge") ){
    int nAutomerge = -1;
    if( SQLITE_INTEGER==sqlite3_value_numeric_type(pVal) ){
      nAutomerge = sqlite3_value_int(pVal);
    }
    if( nAutomerge<0 || nAutomerge>64 ){
      *pbBadkey = 1;
    }else{
      if( nAutomerge==1 ) nAutomerge = FTS5_DEFAULT_AUTOMERGE;
      pConfig->nAutomerge = nAutomerge;
    }
  }

  else if( 0==sqlite3_stricmp(zKey, "usermerge") ){
    int nUsermerge = -1;
    if( SQLITE_INTEGER==sqlite3_value_numeric_type(pVal) ){
      nUsermerge = sqlite3_value_int(pVal);
    }
    if( nUsermerge<2 || nUsermerge>16 ){
      *pbBadkey = 1;
    }else{
      pConfig->nUsermerge = nUsermerge;
    }
  }

  else if( 0==sqlite3_stricmp(zKey, "crisismerge") ){
    int nCrisisMerge = -1;
    if( SQLITE_INTEGER==sqlite3_value_numeric_type(pVal) ){
      nCrisisMerge = sqlite3_value_int(pVal);
    }
    if( nCrisisMerge<0 ){
      *pbBadkey = 1;
    }else{
      if( nCrisisMerge<=1 ) nCrisisMerge = FTS5_DEFAULT_CRISISMERGE;
      if( nCrisisMerge>=FTS5_MAX_SEGMENT ) nCrisisMerge = FTS5_MAX_SEGMENT-1;
      pConfig->nCrisisMerge = nCrisisMerge;
    }
  }

  else if( 0==sqlite3_stricmp(zKey, "rank") ){
    const char *zIn = (const char*)sqlite3_value_text(pVal);
    char *zRank;
    char *zRankArgs;
    rc = sqlite3Fts5ConfigParseRank(zIn, &zRank, &zRankArgs);
    if( rc==SQLITE_OK ){
      sqlite3_free(pConfig->zRank);
      sqlite3_free(pConfig->zRankArgs);
      pConfig->zRank = zRank;
      pConfig->zRankArgs = zRankArgs;
    }else if( rc==SQLITE_ERROR ){
      rc = SQLITE_OK;
      *pbBadkey = 1;
    }
  }else{
    *pbBadkey = 1;
  }
  return rc;
}

/*
** Load the contents of the %_config table into memory.
*/
int sqlite3Fts5ConfigLoad(Fts5Config *pConfig, int iCookie){
  const char *zSelect = "SELECT k, v FROM %Q.'%q_config'";
  char *zSql;
  sqlite3_stmt *p = 0;
  int rc = SQLITE_OK;
  int iVersion = 0;

  /* Set default values */
  pConfig->pgsz = FTS5_DEFAULT_PAGE_SIZE;
  pConfig->nAutomerge = FTS5_DEFAULT_AUTOMERGE;
  pConfig->nUsermerge = FTS5_DEFAULT_USERMERGE;
  pConfig->nCrisisMerge = FTS5_DEFAULT_CRISISMERGE;
  pConfig->nHashSize = FTS5_DEFAULT_HASHSIZE;

  zSql = sqlite3Fts5Mprintf(&rc, zSelect, pConfig->zDb, pConfig->zName);
  if( zSql ){
    rc = sqlite3_prepare_v2(pConfig->db, zSql, -1, &p, 0);
    sqlite3_free(zSql);
  }

  assert( rc==SQLITE_OK || p==0 );
  if( rc==SQLITE_OK ){
    while( SQLITE_ROW==sqlite3_step(p) ){
      const char *zK = (const char*)sqlite3_column_text(p, 0);
      sqlite3_value *pVal = sqlite3_column_value(p, 1);
      if( 0==sqlite3_stricmp(zK, "version") ){
        iVersion = sqlite3_value_int(pVal);
      }else{
        int bDummy = 0;
        sqlite3Fts5ConfigSetValue(pConfig, zK, pVal, &bDummy);
      }
    }
    rc = sqlite3_finalize(p);
  }
  
  if( rc==SQLITE_OK && iVersion!=FTS5_CURRENT_VERSION ){
    rc = SQLITE_ERROR;
    if( pConfig->pzErrmsg ){
      assert( 0==*pConfig->pzErrmsg );
      *pConfig->pzErrmsg = sqlite3_mprintf(
          "invalid fts5 file format (found %d, expected %d) - run 'rebuild'",
          iVersion, FTS5_CURRENT_VERSION
      );
    }
  }

  if( rc==SQLITE_OK ){
    pConfig->iCookie = iCookie;
  }
  return rc;
}
