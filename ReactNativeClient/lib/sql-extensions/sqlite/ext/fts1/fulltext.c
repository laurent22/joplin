/* The author disclaims copyright to this source code.
 *
 * This is an SQLite module implementing full-text search.
 */

#include <assert.h>
#if !defined(__APPLE__)
#include <malloc.h>
#else
#include <stdlib.h>
#endif
#include <stdio.h>
#include <string.h>
#include <ctype.h>

#include "fulltext.h"
#include "ft_hash.h"
#include "tokenizer.h"
#include "sqlite3.h"
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1

/* utility functions */

/* We encode variable-length integers in little-endian order using seven bits
 * per byte as follows:
**
** KEY:
**         A = 0xxxxxxx    7 bits of data and one flag bit
**         B = 1xxxxxxx    7 bits of data and one flag bit
**
**  7 bits - A
** 14 bits - BA
** 21 bits - BBA
** and so on.
*/

/* We may need up to VARINT_MAX bytes to store an encoded 64-bit integer. */
#define VARINT_MAX 10

/* Write a 64-bit variable-length integer to memory starting at p[0].
 * The length of data written will be between 1 and VARINT_MAX bytes.
 * The number of bytes written is returned. */
static int putVarint(char *p, sqlite_int64 v){
  unsigned char *q = (unsigned char *) p;
  sqlite_uint64 vu = v;
  do{
    *q++ = (unsigned char) ((vu & 0x7f) | 0x80);
    vu >>= 7;
  }while( vu!=0 );
  q[-1] &= 0x7f;  /* turn off high bit in final byte */
  assert( q - (unsigned char *)p <= VARINT_MAX );
  return (int) (q - (unsigned char *)p);
}

/* Read a 64-bit variable-length integer from memory starting at p[0].
 * Return the number of bytes read, or 0 on error.
 * The value is stored in *v. */
static int getVarint(const char *p, sqlite_int64 *v){
  const unsigned char *q = (const unsigned char *) p;
  sqlite_uint64 x = 0, y = 1;
  while( (*q & 0x80) == 0x80 ){
    x += y * (*q++ & 0x7f);
    y <<= 7;
    if( q - (unsigned char *)p >= VARINT_MAX ){  /* bad data */
      assert( 0 );
      return 0;
    }
  }
  x += y * (*q++);
  *v = (sqlite_int64) x;
  return (int) (q - (unsigned char *)p);
}

static int getVarint32(const char *p, int *pi){
 sqlite_int64 i;
 int ret = getVarint(p, &i);
 *pi = (int) i;
 assert( *pi==i );
 return ret;
}

/*** Document lists ***
 *
 * A document list holds a sorted list of varint-encoded document IDs.
 *
 * A doclist with type DL_POSITIONS_OFFSETS is stored like this:
 *
 * array {
 *   varint docid;
 *   array {
 *     varint position;     (delta from previous position plus 1, or 0 for end)
 *     varint startOffset;  (delta from previous startOffset)
 *     varint endOffset;    (delta from startOffset)
 *   }
 * }
 *
 * Here, array { X } means zero or more occurrences of X, adjacent in memory.
 *
 * A doclist with type DL_POSITIONS is like the above, but holds only docids
 * and positions without offset information.
 *
 * A doclist with type DL_DOCIDS is like the above, but holds only docids
 * without positions or offset information.
 *
 * On disk, every document list has positions and offsets, so we don't bother
 * to serialize a doclist's type.
 * 
 * We don't yet delta-encode document IDs; doing so will probably be a
 * modest win.
 *
 * NOTE(shess) I've thought of a slightly (1%) better offset encoding.
 * After the first offset, estimate the next offset by using the
 * current token position and the previous token position and offset,
 * offset to handle some variance.  So the estimate would be
 * (iPosition*w->iStartOffset/w->iPosition-64), which is delta-encoded
 * as normal.  Offsets more than 64 chars from the estimate are
 * encoded as the delta to the previous start offset + 128.  An
 * additional tiny increment can be gained by using the end offset of
 * the previous token to make the estimate a tiny bit more precise.
*/

typedef enum DocListType {
  DL_DOCIDS,              /* docids only */
  DL_POSITIONS,           /* docids + positions */
  DL_POSITIONS_OFFSETS    /* docids + positions + offsets */
} DocListType;

typedef struct DocList {
  char *pData;
  int nData;
  DocListType iType;
  int iLastPos;       /* the last position written */
  int iLastOffset;    /* the last start offset written */
} DocList;

/* Initialize a new DocList to hold the given data. */
static void docListInit(DocList *d, DocListType iType,
                        const char *pData, int nData){
  d->nData = nData;
  if( nData>0 ){
    d->pData = malloc(nData);
    memcpy(d->pData, pData, nData);
  } else {
    d->pData = NULL;
  }
  d->iType = iType;
  d->iLastPos = 0;
  d->iLastOffset = 0;
}

/* Create a new dynamically-allocated DocList. */
static DocList *docListNew(DocListType iType){
  DocList *d = (DocList *) malloc(sizeof(DocList));
  docListInit(d, iType, 0, 0);
  return d;
}

static void docListDestroy(DocList *d){
  free(d->pData);
#ifndef NDEBUG
  memset(d, 0x55, sizeof(*d));
#endif
}

static void docListDelete(DocList *d){
  docListDestroy(d);
  free(d);
}

static char *docListEnd(DocList *d){
  return d->pData + d->nData;
}

/* Append a varint to a DocList's data. */
static void appendVarint(DocList *d, sqlite_int64 i){
  char c[VARINT_MAX];
  int n = putVarint(c, i);
  d->pData = realloc(d->pData, d->nData + n);
  memcpy(d->pData + d->nData, c, n);
  d->nData += n;
}

static void docListAddDocid(DocList *d, sqlite_int64 iDocid){
  appendVarint(d, iDocid);
  d->iLastPos = 0;
}

/* Add a position to the last position list in a doclist. */
static void docListAddPos(DocList *d, int iPos){
  assert( d->iType>=DL_POSITIONS );
  appendVarint(d, iPos-d->iLastPos+1);
  d->iLastPos = iPos;
}

static void docListAddPosOffset(DocList *d, int iPos,
                                int iStartOffset, int iEndOffset){
  assert( d->iType==DL_POSITIONS_OFFSETS );
  docListAddPos(d, iPos);
  appendVarint(d, iStartOffset-d->iLastOffset);
  d->iLastOffset = iStartOffset;
  appendVarint(d, iEndOffset-iStartOffset);
}

/* Terminate the last position list in the given doclist. */
static void docListAddEndPos(DocList *d){
  appendVarint(d, 0);
}

typedef struct DocListReader {
  DocList *pDoclist;
  char *p;
  int iLastPos;    /* the last position read */
} DocListReader;

static void readerInit(DocListReader *r, DocList *pDoclist){
  r->pDoclist = pDoclist;
  if( pDoclist!=NULL ){
    r->p = pDoclist->pData;
  }
  r->iLastPos = 0;
}

static int readerAtEnd(DocListReader *pReader){
  return pReader->p >= docListEnd(pReader->pDoclist);
}

/* Peek at the next docid without advancing the read pointer. */
static sqlite_int64 peekDocid(DocListReader *pReader){
  sqlite_int64 ret;
  assert( !readerAtEnd(pReader) );
  getVarint(pReader->p, &ret);
  return ret;
}

/* Read the next docid. */
static sqlite_int64 readDocid(DocListReader *pReader){
  sqlite_int64 ret;
  assert( !readerAtEnd(pReader) );
  pReader->p += getVarint(pReader->p, &ret);
  pReader->iLastPos = 0;
  return ret;
}

/* Read the next position from a position list.
 * Returns the position, or -1 at the end of the list. */
static int readPosition(DocListReader *pReader){
  int i;
  int iType = pReader->pDoclist->iType;
  assert( iType>=DL_POSITIONS );
  assert( !readerAtEnd(pReader) );

  pReader->p += getVarint32(pReader->p, &i);
  if( i==0 ){
    pReader->iLastPos = -1;
    return -1;
  }
  pReader->iLastPos += ((int) i)-1;
  if( iType>=DL_POSITIONS_OFFSETS ){
    /* Skip over offsets, ignoring them for now. */
    int iStart, iEnd;
    pReader->p += getVarint32(pReader->p, &iStart);
    pReader->p += getVarint32(pReader->p, &iEnd);
  }
  return pReader->iLastPos;
}

/* Skip past the end of a position list. */
static void skipPositionList(DocListReader *pReader){
  while( readPosition(pReader)!=-1 )
    ;
}

/* Skip over a docid, including its position list if the doclist has
 * positions. */
static void skipDocument(DocListReader *pReader){
  readDocid(pReader);
  if( pReader->pDoclist->iType >= DL_POSITIONS ){
    skipPositionList(pReader);
  }
}

static sqlite_int64 firstDocid(DocList *d){
  DocListReader r;
  readerInit(&r, d);
  return readDocid(&r);
}

/* Doclist multi-tool.  Pass pUpdate==NULL to delete the indicated docid;
 * otherwise pUpdate, which must contain only the single docid [iDocid], is
 * inserted (if not present) or updated (if already present). */
static int docListUpdate(DocList *d, sqlite_int64 iDocid, DocList *pUpdate){
  int modified = 0;
  DocListReader reader;
  char *p;

  if( pUpdate!=NULL ){
    assert( d->iType==pUpdate->iType);
    assert( iDocid==firstDocid(pUpdate) );
  }

  readerInit(&reader, d);
  while( !readerAtEnd(&reader) && peekDocid(&reader)<iDocid ){
    skipDocument(&reader);
  }

  p = reader.p;
  /* Delete if there is a matching element. */
  if( !readerAtEnd(&reader) && iDocid==peekDocid(&reader) ){
    skipDocument(&reader);
    memmove(p, reader.p, docListEnd(d) - reader.p);
    d->nData -= (reader.p - p);
    modified = 1;
  }

  /* Insert if indicated. */
  if( pUpdate!=NULL ){
    int iDoclist = p-d->pData;
    docListAddEndPos(pUpdate);

    d->pData = realloc(d->pData, d->nData+pUpdate->nData);
    p = d->pData + iDoclist;

    memmove(p+pUpdate->nData, p, docListEnd(d) - p);
    memcpy(p, pUpdate->pData, pUpdate->nData);
    d->nData += pUpdate->nData;
    modified = 1;
  }

  return modified;
}

/* Split the second half of doclist d into a separate doclist d2.  Returns 1
 * if successful, or 0 if d contains a single document and hence can't be
 * split. */
static int docListSplit(DocList *d, DocList *d2){
  const char *pSplitPoint = d->pData + d->nData / 2;
  DocListReader reader;

  readerInit(&reader, d);
  while( reader.p<pSplitPoint ){
    skipDocument(&reader);
  }
  if( readerAtEnd(&reader) ) return 0;
  docListInit(d2, d->iType, reader.p, docListEnd(d) - reader.p);
  d->nData = reader.p - d->pData;
  d->pData = realloc(d->pData, d->nData);
  return 1;
}

/* A DocListMerge computes the AND of an in-memory DocList [in] and a chunked
 * on-disk doclist, resulting in another in-memory DocList [out].  [in]
 * and [out] may or may not store position information according to the
 * caller's wishes.  The on-disk doclist always comes with positions.
 *
 * The caller must read each chunk of the on-disk doclist in succession and
 * pass it to mergeBlock().
 *
 * If [in] has positions, then the merge output contains only documents with
 * matching positions in the two input doclists.  If [in] does not have
 * positions, then the merge output contains all documents common to the two
 * input doclists.
 *
 * If [in] is NULL, then the on-disk doclist is copied to [out] directly.
 *
 * A merge is performed using an integer [iOffset] provided by the caller.
 * [iOffset] is subtracted from each position in the on-disk doclist for the
 * purpose of position comparison; this is helpful in implementing phrase
 * searches.
 *
 * A DocListMerge is not yet able to propagate offsets through query
 * processing; we should add that capability soon.
*/
typedef struct DocListMerge {
  DocListReader in;
  DocList *pOut;
  int iOffset;
} DocListMerge;

static void mergeInit(DocListMerge *m,
                      DocList *pIn, int iOffset, DocList *pOut){
  readerInit(&m->in, pIn);
  m->pOut = pOut;
  m->iOffset = iOffset;

  /* can't handle offsets yet */
  assert( pIn==NULL || pIn->iType <= DL_POSITIONS );
  assert( pOut->iType <= DL_POSITIONS );
}

/* A helper function for mergeBlock(), below.  Merge the position lists
 * pointed to by m->in and pBlockReader.
 * If the merge matches, write [iDocid] to m->pOut; if m->pOut
 * has positions then write all matching positions as well. */
static void mergePosList(DocListMerge *m, sqlite_int64 iDocid,
                  DocListReader *pBlockReader){
  int block_pos = readPosition(pBlockReader);
  int in_pos = readPosition(&m->in);
  int match = 0;
  while( block_pos!=-1 || in_pos!=-1 ){
    if( block_pos-m->iOffset==in_pos ){
      if( !match ){
        docListAddDocid(m->pOut, iDocid);
        match = 1;
      }
      if( m->pOut->iType >= DL_POSITIONS ){
        docListAddPos(m->pOut, in_pos);
      }
      block_pos = readPosition(pBlockReader);
      in_pos = readPosition(&m->in);
    } else if( in_pos==-1 || (block_pos!=-1 && block_pos-m->iOffset<in_pos) ){
      block_pos = readPosition(pBlockReader);
    } else {
      in_pos = readPosition(&m->in);
    }
  }
  if( m->pOut->iType >= DL_POSITIONS && match ){
    docListAddEndPos(m->pOut);
  }
}

/* Merge one block of an on-disk doclist into a DocListMerge. */
static void mergeBlock(DocListMerge *m, DocList *pBlock){
  DocListReader blockReader;
  assert( pBlock->iType >= DL_POSITIONS );
  readerInit(&blockReader, pBlock);
  while( !readerAtEnd(&blockReader) ){
    sqlite_int64 iDocid = readDocid(&blockReader);
    if( m->in.pDoclist!=NULL ){
      while( 1 ){
        if( readerAtEnd(&m->in) ) return;  /* nothing more to merge */
        if( peekDocid(&m->in)>=iDocid ) break;
        skipDocument(&m->in);
      }
      if( peekDocid(&m->in)>iDocid ){  /* [pIn] has no match with iDocid */
        skipPositionList(&blockReader);  /* skip this docid in the block */
        continue;
      }
      readDocid(&m->in);
    }
    /* We have a document match. */
    if( m->in.pDoclist==NULL || m->in.pDoclist->iType < DL_POSITIONS ){
      /* We don't need to do a poslist merge. */
      docListAddDocid(m->pOut, iDocid);
      if( m->pOut->iType >= DL_POSITIONS ){
        /* Copy all positions to the output doclist. */
        while( 1 ){
          int pos = readPosition(&blockReader);
          if( pos==-1 ) break;
          docListAddPos(m->pOut, pos);
        }
        docListAddEndPos(m->pOut);
      } else skipPositionList(&blockReader);
      continue;
    }
    mergePosList(m, iDocid, &blockReader);
  }
}

static char *string_dup_n(const char *s, int n){
  char *str = malloc(n + 1);
  memcpy(str, s, n);
  str[n] = '\0';
  return str;
}

/* Duplicate a string; the caller must free() the returned string.
 * (We don't use strdup() since it's not part of the standard C library and
 * may not be available everywhere.) */
static char *string_dup(const char *s){
  return string_dup_n(s, strlen(s));
}

/* Format a string, replacing each occurrence of the % character with
 * zName.  This may be more convenient than sqlite_mprintf()
 * when one string is used repeatedly in a format string.
 * The caller must free() the returned string. */
static char *string_format(const char *zFormat, const char *zName){
  const char *p;
  size_t len = 0;
  size_t nName = strlen(zName);
  char *result;
  char *r;

  /* first compute length needed */
  for(p = zFormat ; *p ; ++p){
    len += (*p=='%' ? nName : 1);
  }
  len += 1;  /* for null terminator */

  r = result = malloc(len);
  for(p = zFormat; *p; ++p){
    if( *p=='%' ){
      memcpy(r, zName, nName);
      r += nName;
    } else {
      *r++ = *p;
    }
  }
  *r++ = '\0';
  assert( r == result + len );
  return result;
}

static int sql_exec(sqlite3 *db, const char *zName, const char *zFormat){
  char *zCommand = string_format(zFormat, zName);
  int rc = sqlite3_exec(db, zCommand, NULL, 0, NULL);
  free(zCommand);
  return rc;
}

static int sql_prepare(sqlite3 *db, const char *zName, sqlite3_stmt **ppStmt,
                const char *zFormat){
  char *zCommand = string_format(zFormat, zName);
  int rc = sqlite3_prepare(db, zCommand, -1, ppStmt, NULL);
  free(zCommand);
  return rc;
}

/* end utility functions */

#define QUERY_GENERIC 0
#define QUERY_FULLTEXT 1

#define CHUNK_MAX 1024

typedef enum fulltext_statement {
  CONTENT_INSERT_STMT,
  CONTENT_SELECT_STMT,
  CONTENT_DELETE_STMT,

  TERM_SELECT_STMT,
  TERM_CHUNK_SELECT_STMT,
  TERM_INSERT_STMT,
  TERM_UPDATE_STMT,
  TERM_DELETE_STMT,

  MAX_STMT                     /* Always at end! */
} fulltext_statement;

/* These must exactly match the enum above. */
/* TODO(adam): Is there some risk that a statement (in particular,
** pTermSelectStmt) will be used in two cursors at once, e.g.  if a
** query joins a virtual table to itself?  If so perhaps we should
** move some of these to the cursor object.
*/
static const char *fulltext_zStatement[MAX_STMT] = {
  /* CONTENT_INSERT */ "insert into %_content (rowid, content) values (?, ?)",
  /* CONTENT_SELECT */ "select content from %_content where rowid = ?",
  /* CONTENT_DELETE */ "delete from %_content where rowid = ?",

  /* TERM_SELECT */
  "select rowid, doclist from %_term where term = ? and first = ?",
  /* TERM_CHUNK_SELECT */
  "select max(first) from %_term where term = ? and first <= ?",
  /* TERM_INSERT */
  "insert into %_term (term, first, doclist) values (?, ?, ?)",
  /* TERM_UPDATE */ "update %_term set doclist = ? where rowid = ?",
  /* TERM_DELETE */ "delete from %_term where rowid = ?",
};

typedef struct fulltext_vtab {
  sqlite3_vtab base;
  sqlite3 *db;
  const char *zName;               /* virtual table name */
  sqlite3_tokenizer *pTokenizer;   /* tokenizer for inserts and queries */

  /* Precompiled statements which we keep as long as the table is
  ** open.
  */
  sqlite3_stmt *pFulltextStatements[MAX_STMT];
} fulltext_vtab;

typedef struct fulltext_cursor {
  sqlite3_vtab_cursor base;
  int iCursorType;  /* QUERY_GENERIC or QUERY_FULLTEXT */

  sqlite3_stmt *pStmt;

  int eof;

  /* The following is used only when iCursorType == QUERY_FULLTEXT. */
  DocListReader result;
} fulltext_cursor;

static struct fulltext_vtab *cursor_vtab(fulltext_cursor *c){
  return (fulltext_vtab *) c->base.pVtab;
}

static sqlite3_module fulltextModule;   /* forward declaration */

/* Puts a freshly-prepared statement determined by iStmt in *ppStmt.
** If the indicated statement has never been prepared, it is prepared
** and cached, otherwise the cached version is reset.
*/
static int sql_get_statement(fulltext_vtab *v, fulltext_statement iStmt,
                             sqlite3_stmt **ppStmt){
  assert( iStmt<MAX_STMT );
  if( v->pFulltextStatements[iStmt]==NULL ){
    int rc = sql_prepare(v->db, v->zName, &v->pFulltextStatements[iStmt],
                         fulltext_zStatement[iStmt]);
    if( rc!=SQLITE_OK ) return rc;
  } else {
    int rc = sqlite3_reset(v->pFulltextStatements[iStmt]);
    if( rc!=SQLITE_OK ) return rc;
  }

  *ppStmt = v->pFulltextStatements[iStmt];
  return SQLITE_OK;
}

/* Step the indicated statement, handling errors SQLITE_BUSY (by
** retrying) and SQLITE_SCHEMA (by re-preparing and transferring
** bindings to the new statement).
** TODO(adam): We should extend this function so that it can work with
** statements declared locally, not only globally cached statements.
*/
static int sql_step_statement(fulltext_vtab *v, fulltext_statement iStmt,
                              sqlite3_stmt **ppStmt){
  int rc;
  sqlite3_stmt *s = *ppStmt;
  assert( iStmt<MAX_STMT );
  assert( s==v->pFulltextStatements[iStmt] );

  while( (rc=sqlite3_step(s))!=SQLITE_DONE && rc!=SQLITE_ROW ){
    sqlite3_stmt *pNewStmt;

    if( rc==SQLITE_BUSY ) continue;
    if( rc!=SQLITE_ERROR ) return rc;

    rc = sqlite3_reset(s);
    if( rc!=SQLITE_SCHEMA ) return SQLITE_ERROR;

    v->pFulltextStatements[iStmt] = NULL;   /* Still in s */
    rc = sql_get_statement(v, iStmt, &pNewStmt);
    if( rc!=SQLITE_OK ) goto err;
    *ppStmt = pNewStmt;

    rc = sqlite3_transfer_bindings(s, pNewStmt);
    if( rc!=SQLITE_OK ) goto err;

    rc = sqlite3_finalize(s);
    if( rc!=SQLITE_OK ) return rc;
    s = pNewStmt;
  }
  return rc;

 err:
  sqlite3_finalize(s);
  return rc;
}

/* Like sql_step_statement(), but convert SQLITE_DONE to SQLITE_OK.
** Useful for statements like UPDATE, where we expect no results.
*/
static int sql_single_step_statement(fulltext_vtab *v,
                                     fulltext_statement iStmt,
                                     sqlite3_stmt **ppStmt){
  int rc = sql_step_statement(v, iStmt, ppStmt);
  return (rc==SQLITE_DONE) ? SQLITE_OK : rc;
}

/* insert into %_content (rowid, content) values ([rowid], [zContent]) */
static int content_insert(fulltext_vtab *v, sqlite3_value *rowid,
                          const char *zContent, int nContent){
  sqlite3_stmt *s;
  int rc = sql_get_statement(v, CONTENT_INSERT_STMT, &s);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_value(s, 1, rowid);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_text(s, 2, zContent, nContent, SQLITE_STATIC);
  if( rc!=SQLITE_OK ) return rc;

  return sql_single_step_statement(v, CONTENT_INSERT_STMT, &s);
}

/* select content from %_content where rowid = [iRow]
 * The caller must delete the returned string. */
static int content_select(fulltext_vtab *v, sqlite_int64 iRow,
                          char **pzContent){
  sqlite3_stmt *s;
  int rc = sql_get_statement(v, CONTENT_SELECT_STMT, &s);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_int64(s, 1, iRow);
  if( rc!=SQLITE_OK ) return rc;

  rc = sql_step_statement(v, CONTENT_SELECT_STMT, &s);
  if( rc!=SQLITE_ROW ) return rc;

  *pzContent = string_dup((const char *)sqlite3_column_text(s, 0));

  /* We expect only one row.  We must execute another sqlite3_step()
   * to complete the iteration; otherwise the table will remain locked. */
  rc = sqlite3_step(s);
  if( rc==SQLITE_DONE ) return SQLITE_OK;

  free(*pzContent);
  return rc;
}

/* delete from %_content where rowid = [iRow ] */
static int content_delete(fulltext_vtab *v, sqlite_int64 iRow){
  sqlite3_stmt *s;
  int rc = sql_get_statement(v, CONTENT_DELETE_STMT, &s);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_int64(s, 1, iRow);
  if( rc!=SQLITE_OK ) return rc;

  return sql_single_step_statement(v, CONTENT_DELETE_STMT, &s);
}

/* select rowid, doclist from %_term where term = [zTerm] and first = [iFirst]
 * If found, returns SQLITE_OK; the caller must free the returned doclist.
 * If no rows found, returns SQLITE_ERROR. */
static int term_select(fulltext_vtab *v, const char *zTerm, int nTerm,
                       sqlite_int64 iFirst,
                       sqlite_int64 *rowid,
                       DocList *out){
  sqlite3_stmt *s;
  int rc = sql_get_statement(v, TERM_SELECT_STMT, &s);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_text(s, 1, zTerm, nTerm, SQLITE_TRANSIENT);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_int64(s, 2, iFirst);
  if( rc!=SQLITE_OK ) return rc;

  rc = sql_step_statement(v, TERM_SELECT_STMT, &s);
  if( rc!=SQLITE_ROW ) return rc==SQLITE_DONE ? SQLITE_ERROR : rc;

  *rowid = sqlite3_column_int64(s, 0);
  docListInit(out, DL_POSITIONS_OFFSETS,
              sqlite3_column_blob(s, 1), sqlite3_column_bytes(s, 1));

  /* We expect only one row.  We must execute another sqlite3_step()
   * to complete the iteration; otherwise the table will remain locked. */
  rc = sqlite3_step(s);
  return rc==SQLITE_DONE ? SQLITE_OK : rc;
}

/* select max(first) from %_term where term = [zTerm] and first <= [iFirst]
 * If found, returns SQLITE_ROW and result in *piResult; if the query returns
 * NULL (meaning no row found) returns SQLITE_DONE.
 */
static int term_chunk_select(fulltext_vtab *v, const char *zTerm, int nTerm,
                           sqlite_int64 iFirst, sqlite_int64 *piResult){
  sqlite3_stmt *s;
  int rc = sql_get_statement(v, TERM_CHUNK_SELECT_STMT, &s);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_text(s, 1, zTerm, nTerm, SQLITE_STATIC);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_int64(s, 2, iFirst);
  if( rc!=SQLITE_OK ) return rc;

  rc = sql_step_statement(v, TERM_CHUNK_SELECT_STMT, &s);
  if( rc!=SQLITE_ROW ) return rc==SQLITE_DONE ? SQLITE_ERROR : rc;

  switch( sqlite3_column_type(s, 0) ){
    case SQLITE_NULL:
      rc = SQLITE_DONE;
      break;
    case SQLITE_INTEGER:
     *piResult = sqlite3_column_int64(s, 0);
     break;
    default:
      return SQLITE_ERROR;
  }
  /* We expect only one row.  We must execute another sqlite3_step()
   * to complete the iteration; otherwise the table will remain locked. */
  if( sqlite3_step(s) != SQLITE_DONE ) return SQLITE_ERROR;
  return rc;
}

/* insert into %_term (term, first, doclist)
               values ([zTerm], [iFirst], [doclist]) */
static int term_insert(fulltext_vtab *v, const char *zTerm, int nTerm,
                       sqlite_int64 iFirst, DocList *doclist){
  sqlite3_stmt *s;
  int rc = sql_get_statement(v, TERM_INSERT_STMT, &s);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_text(s, 1, zTerm, nTerm, SQLITE_STATIC);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_int64(s, 2, iFirst);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_blob(s, 3, doclist->pData, doclist->nData, SQLITE_STATIC);
  if( rc!=SQLITE_OK ) return rc;

  return sql_single_step_statement(v, TERM_INSERT_STMT, &s);
}

/* update %_term set doclist = [doclist] where rowid = [rowid] */
static int term_update(fulltext_vtab *v, sqlite_int64 rowid,
                       DocList *doclist){
  sqlite3_stmt *s;
  int rc = sql_get_statement(v, TERM_UPDATE_STMT, &s);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_blob(s, 1, doclist->pData, doclist->nData,
                         SQLITE_STATIC);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_int64(s, 2, rowid);
  if( rc!=SQLITE_OK ) return rc;

  return sql_single_step_statement(v, TERM_UPDATE_STMT, &s);
}

static int term_delete(fulltext_vtab *v, sqlite_int64 rowid){
  sqlite3_stmt *s;
  int rc = sql_get_statement(v, TERM_DELETE_STMT, &s);
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_int64(s, 1, rowid);
  if( rc!=SQLITE_OK ) return rc;

  return sql_single_step_statement(v, TERM_DELETE_STMT, &s);
}

static void fulltext_vtab_destroy(fulltext_vtab *v){
  int iStmt;

  for( iStmt=0; iStmt<MAX_STMT; iStmt++ ){
    if( v->pFulltextStatements[iStmt]!=NULL ){
      sqlite3_finalize(v->pFulltextStatements[iStmt]);
      v->pFulltextStatements[iStmt] = NULL;
    }
  }

  if( v->pTokenizer!=NULL ){
    v->pTokenizer->pModule->xDestroy(v->pTokenizer);
    v->pTokenizer = NULL;
  }

  free((void *) v->zName);
  free(v);
}

/* Current interface:
** argv[0] - module name
** argv[1] - database name
** argv[2] - table name
** argv[3] - tokenizer name (optional, a sensible default is provided)
** argv[4..] - passed to tokenizer (optional based on tokenizer)
**/
static int fulltextConnect(
  sqlite3 *db,
  void *pAux,
  int argc,
  const char * const *argv,
  sqlite3_vtab **ppVTab,
  char **pzErr
){
  int rc;
  fulltext_vtab *v;
  sqlite3_tokenizer_module *m = NULL;

  assert( argc>=3 );
  v = (fulltext_vtab *) malloc(sizeof(fulltext_vtab));
  /* sqlite will initialize v->base */
  v->db = db;
  v->zName = string_dup(argv[2]);
  v->pTokenizer = NULL;

  if( argc==3 ){
    get_simple_tokenizer_module(&m);
  } else {
    /* TODO(shess) For now, add new tokenizers as else if clauses. */
    if( !strcmp(argv[3], "simple") ){
      get_simple_tokenizer_module(&m);
    } else {
      assert( "unrecognized tokenizer"==NULL );
    }
  }

  /* TODO(shess) Since tokenization impacts the index, the parameters
  ** to the tokenizer need to be identical when a persistent virtual
  ** table is re-created.  One solution would be a meta-table to track
  ** such information in the database.  Then we could verify that the
  ** information is identical on subsequent creates.
  */
  /* TODO(shess) Why isn't argv already (const char **)? */
  rc = m->xCreate(argc-3, (const char **) (argv+3), &v->pTokenizer);
  if( rc!=SQLITE_OK ) return rc;
  v->pTokenizer->pModule = m;

  /* TODO: verify the existence of backing tables foo_content, foo_term */

  rc = sqlite3_declare_vtab(db, "create table x(content text)");
  if( rc!=SQLITE_OK ) return rc;

  memset(v->pFulltextStatements, 0, sizeof(v->pFulltextStatements));

  *ppVTab = &v->base;
  return SQLITE_OK;
}

static int fulltextCreate(
  sqlite3 *db,
  void *pAux,
  int argc,
  const char * const *argv,
  sqlite3_vtab **ppVTab,
  char **pzErr
){
  int rc;
  assert( argc>=3 );

  /* The %_content table holds the text of each full-text item, with
  ** the rowid used as the docid.
  **
  ** The %_term table maps each term to a document list blob
  ** containing elements sorted by ascending docid, each element
  ** encoded as:
  **
  **   docid varint-encoded
  **   token count varint-encoded
  **   "count" token elements (poslist):
  **     position varint-encoded as delta from previous position
  **     start offset varint-encoded as delta from previous start offset
  **     end offset varint-encoded as delta from start offset
  **
  ** Additionally, doclist blobs can be chunked into multiple rows,
  ** using "first" to order the blobs.  "first" is simply the first
  ** docid in the blob.
  */
  /*
  ** NOTE(shess) That last sentence is incorrect in the face of
  ** deletion, which can leave a doclist that doesn't contain the
  ** first from that row.  I _believe_ this does not matter to the
  ** operation of the system, but it might be reasonable to update
  ** appropriately in case this assumption becomes more important.
  */
  rc = sql_exec(db, argv[2],
    "create table %_content(content text);"
    "create table %_term(term text, first integer, doclist blob);"
    "create index %_index on %_term(term, first)");
  if( rc!=SQLITE_OK ) return rc;

  return fulltextConnect(db, pAux, argc, argv, ppVTab, pzErr);
}

/* Decide how to handle an SQL query.
 * At the moment, MATCH queries can include implicit boolean ANDs; we
 * haven't implemented phrase searches or OR yet. */
static int fulltextBestIndex(sqlite3_vtab *pVTab, sqlite3_index_info *pInfo){
  int i;

  for(i=0; i<pInfo->nConstraint; ++i){
    const struct sqlite3_index_constraint *pConstraint;
    pConstraint = &pInfo->aConstraint[i];
    if( pConstraint->iColumn==0 &&
        pConstraint->op==SQLITE_INDEX_CONSTRAINT_MATCH &&
        pConstraint->usable ){   /* a full-text search */
      pInfo->aConstraintUsage[i].argvIndex = 1;
      pInfo->aConstraintUsage[i].omit = 1;
      pInfo->idxNum = QUERY_FULLTEXT;
      pInfo->estimatedCost = 1.0;   /* an arbitrary value for now */
      return SQLITE_OK;
    }
  }
  pInfo->idxNum = QUERY_GENERIC;
  return SQLITE_OK;
}

static int fulltextDisconnect(sqlite3_vtab *pVTab){
  fulltext_vtab_destroy((fulltext_vtab *)pVTab);
  return SQLITE_OK;
}

static int fulltextDestroy(sqlite3_vtab *pVTab){
  fulltext_vtab *v = (fulltext_vtab *)pVTab;

  int rc = sql_exec(v->db, v->zName,
                    "drop table %_content; drop table %_term");
  if( rc!=SQLITE_OK ) return rc;

  fulltext_vtab_destroy((fulltext_vtab *)pVTab);
  return SQLITE_OK;
}

static int fulltextOpen(sqlite3_vtab *pVTab, sqlite3_vtab_cursor **ppCursor){
  fulltext_cursor *c;

  c = (fulltext_cursor *) calloc(sizeof(fulltext_cursor), 1);
  /* sqlite will initialize c->base */
  *ppCursor = &c->base;

  return SQLITE_OK;
}

static int fulltextClose(sqlite3_vtab_cursor *pCursor){
  fulltext_cursor *c = (fulltext_cursor *) pCursor;
  sqlite3_finalize(c->pStmt);
  if( c->result.pDoclist!=NULL ){
    docListDelete(c->result.pDoclist);
  }
  free(c);
  return SQLITE_OK;
}

static int fulltextNext(sqlite3_vtab_cursor *pCursor){
  fulltext_cursor *c = (fulltext_cursor *) pCursor;
  sqlite_int64 iDocid;
  int rc;

  switch( c->iCursorType ){
    case QUERY_GENERIC:
      /* TODO(shess) Handle SQLITE_SCHEMA AND SQLITE_BUSY. */
      rc = sqlite3_step(c->pStmt);
      switch( rc ){
        case SQLITE_ROW:
          c->eof = 0;
          return SQLITE_OK;
        case SQLITE_DONE:
          c->eof = 1;
          return SQLITE_OK;
        default:
          c->eof = 1;
          return rc;
      }
    case QUERY_FULLTEXT:
      rc = sqlite3_reset(c->pStmt);
      if( rc!=SQLITE_OK ) return rc;

      if( readerAtEnd(&c->result)){
        c->eof = 1;
        return SQLITE_OK;
      }
      iDocid = readDocid(&c->result);
      rc = sqlite3_bind_int64(c->pStmt, 1, iDocid);
      if( rc!=SQLITE_OK ) return rc;
      /* TODO(shess) Handle SQLITE_SCHEMA AND SQLITE_BUSY. */
      rc = sqlite3_step(c->pStmt);
      if( rc==SQLITE_ROW ){   /* the case we expect */
        c->eof = 0;
        return SQLITE_OK;
      }
      /* an error occurred; abort */
      return rc==SQLITE_DONE ? SQLITE_ERROR : rc;
    default:
      assert( 0 );
      return SQLITE_ERROR;  /* not reached */
  }
}

static int term_select_doclist(fulltext_vtab *v, const char *pTerm, int nTerm,
                               sqlite3_stmt **ppStmt){
  int rc;
  if( *ppStmt ){
    rc = sqlite3_reset(*ppStmt);
  } else {
    rc = sql_prepare(v->db, v->zName, ppStmt,
      "select doclist from %_term where term = ? order by first");
  }
  if( rc!=SQLITE_OK ) return rc;

  rc = sqlite3_bind_text(*ppStmt, 1, pTerm, nTerm, SQLITE_TRANSIENT);
  if( rc!=SQLITE_OK ) return rc;

  return sqlite3_step(*ppStmt);   /* TODO(adamd): handle schema error */
}

/* Read the posting list for [zTerm]; AND it with the doclist [in] to
 * produce the doclist [out], using the given offset [iOffset] for phrase
 * matching.
 * (*pSelect) is used to hold an SQLite statement used inside this function;
 * the caller should initialize *pSelect to NULL before the first call.
 */
static int query_merge(fulltext_vtab *v, sqlite3_stmt **pSelect,
                       const char *zTerm,
                       DocList *pIn, int iOffset, DocList *out){
  int rc;
  DocListMerge merge;

  if( pIn!=NULL && !pIn->nData ){
    /* If [pIn] is already empty, there's no point in reading the
     * posting list to AND it in; return immediately. */
      return SQLITE_OK;
  }

  rc = term_select_doclist(v, zTerm, -1, pSelect);
  if( rc!=SQLITE_ROW && rc!=SQLITE_DONE ) return rc;

  mergeInit(&merge, pIn, iOffset, out);
  while( rc==SQLITE_ROW ){
    DocList block;
    docListInit(&block, DL_POSITIONS_OFFSETS,
                sqlite3_column_blob(*pSelect, 0),
                sqlite3_column_bytes(*pSelect, 0));
    mergeBlock(&merge, &block);
    docListDestroy(&block);

    rc = sqlite3_step(*pSelect);
    if( rc!=SQLITE_ROW && rc!=SQLITE_DONE ){
      return rc;
    }
  }
  
  return SQLITE_OK;
}

typedef struct QueryTerm {
  int is_phrase;    /* true if this term begins a new phrase */
  const char *zTerm;
} QueryTerm;

/* A parsed query.
 *
 * As an example, parsing the query ["four score" years "new nation"] will
 * yield a Query with 5 terms:
 *   "four",   is_phrase = 1
 *   "score",  is_phrase = 0
 *   "years",  is_phrase = 1
 *   "new",    is_phrase = 1
 *   "nation", is_phrase = 0
 */
typedef struct Query {
  int nTerms;
  QueryTerm *pTerm;
} Query;

static void query_add(Query *q, int is_phrase, const char *zTerm){
  QueryTerm *t;
  ++q->nTerms;
  q->pTerm = realloc(q->pTerm, q->nTerms * sizeof(q->pTerm[0]));
  t = &q->pTerm[q->nTerms - 1];
  t->is_phrase = is_phrase;
  t->zTerm = zTerm;
}
    
static void query_free(Query *q){
  int i;
  for(i = 0; i < q->nTerms; ++i){
    free((void *) q->pTerm[i].zTerm);
  }
  free(q->pTerm);
}

static int tokenize_segment(sqlite3_tokenizer *pTokenizer,
                            const char *zQuery, int in_phrase,
                            Query *pQuery){
  sqlite3_tokenizer_module *pModule = pTokenizer->pModule;
  sqlite3_tokenizer_cursor *pCursor;
  int is_first = 1;
  
  int rc = pModule->xOpen(pTokenizer, zQuery, -1, &pCursor);
  if( rc!=SQLITE_OK ) return rc;
  pCursor->pTokenizer = pTokenizer;

  while( 1 ){
    const char *zToken;
    int nToken, iStartOffset, iEndOffset, dummy_pos;

    rc = pModule->xNext(pCursor,
                        &zToken, &nToken,
                        &iStartOffset, &iEndOffset,
                        &dummy_pos);
    if( rc!=SQLITE_OK ) break;
    query_add(pQuery, !in_phrase || is_first, string_dup_n(zToken, nToken));
    is_first = 0;
  }

  return pModule->xClose(pCursor);
}

/* Parse a query string, yielding a Query object. */
static int parse_query(fulltext_vtab *v, const char *zQuery, Query *pQuery){
  char *zQuery1 = string_dup(zQuery);
  int in_phrase = 0;
  char *s = zQuery1;
  pQuery->nTerms = 0;
  pQuery->pTerm = NULL;

  while( *s ){
    char *t = s;
    while( *t ){
      if( *t=='"' ){
        *t++ = '\0';
        break;
      }
      ++t;
    }
    if( *s ){
      tokenize_segment(v->pTokenizer, s, in_phrase, pQuery);
    }
    s = t;
    in_phrase = !in_phrase;
  }
  
  free(zQuery1);
  return SQLITE_OK;
}

/* Perform a full-text query; return a list of documents in [pResult]. */
static int fulltext_query(fulltext_vtab *v, const char *zQuery,
                          DocList **pResult){
  Query q;
  int phrase_start = -1;
  int i;
  sqlite3_stmt *pSelect = NULL;
  DocList *d = NULL;

  int rc = parse_query(v, zQuery, &q);
  if( rc!=SQLITE_OK ) return rc;

  /* Merge terms. */
  for(i = 0 ; i < q.nTerms ; ++i){
    /* In each merge step, we need to generate positions whenever we're
     * processing a phrase which hasn't ended yet. */
    int need_positions = i<q.nTerms-1 && !q.pTerm[i+1].is_phrase;
    DocList *next = docListNew(need_positions ? DL_POSITIONS : DL_DOCIDS);
    if( q.pTerm[i].is_phrase ){
      phrase_start = i;
    }
    rc = query_merge(v, &pSelect, q.pTerm[i].zTerm, d, i - phrase_start, next);
    if( rc!=SQLITE_OK ) break;
    if( d!=NULL ){
      docListDelete(d);
    }
    d = next;
  }

  sqlite3_finalize(pSelect);
  query_free(&q);
  *pResult = d;
  return rc;
}

static int fulltextFilter(sqlite3_vtab_cursor *pCursor,
                          int idxNum, const char *idxStr,
                          int argc, sqlite3_value **argv){
  fulltext_cursor *c = (fulltext_cursor *) pCursor;
  fulltext_vtab *v = cursor_vtab(c);
  int rc;
  const char *zStatement;

  c->iCursorType = idxNum;
  switch( idxNum ){
    case QUERY_GENERIC:
      zStatement = "select rowid, content from %_content";
      break;

    case QUERY_FULLTEXT:   /* full-text search */
    {
      const char *zQuery = (const char *)sqlite3_value_text(argv[0]);
      DocList *pResult;
      assert( argc==1 );
      rc = fulltext_query(v, zQuery, &pResult);
      if( rc!=SQLITE_OK ) return rc;
      readerInit(&c->result, pResult);
      zStatement = "select rowid, content from %_content where rowid = ?";
      break;
    }

    default:
      assert( 0 );
  }

  rc = sql_prepare(v->db, v->zName, &c->pStmt, zStatement);
  if( rc!=SQLITE_OK ) return rc;

  return fulltextNext(pCursor);
}

static int fulltextEof(sqlite3_vtab_cursor *pCursor){
  fulltext_cursor *c = (fulltext_cursor *) pCursor;
  return c->eof;
}

static int fulltextColumn(sqlite3_vtab_cursor *pCursor,
                          sqlite3_context *pContext, int idxCol){
  fulltext_cursor *c = (fulltext_cursor *) pCursor;
  const char *s;

  assert( idxCol==0 );
  s = (const char *) sqlite3_column_text(c->pStmt, 1);
  sqlite3_result_text(pContext, s, -1, SQLITE_TRANSIENT);

  return SQLITE_OK;
}

static int fulltextRowid(sqlite3_vtab_cursor *pCursor, sqlite_int64 *pRowid){
  fulltext_cursor *c = (fulltext_cursor *) pCursor;

  *pRowid = sqlite3_column_int64(c->pStmt, 0);
  return SQLITE_OK;
}

/* Build a hash table containing all terms in zText. */
static int build_terms(Hash *terms, sqlite3_tokenizer *pTokenizer,
                       const char *zText, sqlite_int64 iDocid){
  sqlite3_tokenizer_cursor *pCursor;
  const char *pToken;
  int nTokenBytes;
  int iStartOffset, iEndOffset, iPosition;

  int rc = pTokenizer->pModule->xOpen(pTokenizer, zText, -1, &pCursor);
  if( rc!=SQLITE_OK ) return rc;

  pCursor->pTokenizer = pTokenizer;
  HashInit(terms, HASH_STRING, 1);
  while( SQLITE_OK==pTokenizer->pModule->xNext(pCursor,
                                               &pToken, &nTokenBytes,
                                               &iStartOffset, &iEndOffset,
                                               &iPosition) ){
    DocList *p;

    /* Positions can't be negative; we use -1 as a terminator internally. */
    if( iPosition<0 ) {
      rc = SQLITE_ERROR;  
      goto err;
    }

    p = HashFind(terms, pToken, nTokenBytes);
    if( p==NULL ){
      p = docListNew(DL_POSITIONS_OFFSETS);
      docListAddDocid(p, iDocid);
      HashInsert(terms, pToken, nTokenBytes, p);
    }
    docListAddPosOffset(p, iPosition, iStartOffset, iEndOffset);
  }

err:
  /* TODO(shess) Check return?  Should this be able to cause errors at
  ** this point?  Actually, same question about sqlite3_finalize(),
  ** though one could argue that failure there means that the data is
  ** not durable.  *ponder*
  */
  pTokenizer->pModule->xClose(pCursor);
  return rc;
}
/* Update the %_terms table to map the term [zTerm] to the given rowid. */
static int index_insert_term(fulltext_vtab *v, const char *zTerm, int nTerm,
                             sqlite_int64 iDocid, DocList *p){
  sqlite_int64 iFirst;
  sqlite_int64 iIndexRow;
  DocList doclist;

  int rc = term_chunk_select(v, zTerm, nTerm, iDocid, &iFirst);
  if( rc==SQLITE_DONE ){
    docListInit(&doclist, DL_POSITIONS_OFFSETS, 0, 0);
    if( docListUpdate(&doclist, iDocid, p) ){
      rc = term_insert(v, zTerm, nTerm, iDocid, &doclist);
      docListDestroy(&doclist);
      return rc;
    }
    return SQLITE_OK;
  }
  if( rc!=SQLITE_ROW ) return SQLITE_ERROR;

  /* This word is in the index; add this document ID to its blob. */

  rc = term_select(v, zTerm, nTerm, iFirst, &iIndexRow, &doclist);
  if( rc!=SQLITE_OK ) return rc;

  if( docListUpdate(&doclist, iDocid, p) ){
    /* If the blob is too big, split it in half. */
    if( doclist.nData>CHUNK_MAX ){
      DocList half;
      if( docListSplit(&doclist, &half) ){
        rc = term_insert(v, zTerm, nTerm, firstDocid(&half), &half);
        docListDestroy(&half);
        if( rc!=SQLITE_OK ) goto err;
      }
    }
    rc = term_update(v, iIndexRow, &doclist);
  }

err:
  docListDestroy(&doclist);
  return rc;
}

/* Insert a row into the full-text index; set *piRowid to be the ID of the
 * new row. */
static int index_insert(fulltext_vtab *v,
                        sqlite3_value *pRequestRowid, const char *zText,
                        sqlite_int64 *piRowid){
  Hash terms;  /* maps term string -> PosList */
  HashElem *e;

  int rc = content_insert(v, pRequestRowid, zText, -1);
  if( rc!=SQLITE_OK ) return rc;
  *piRowid = sqlite3_last_insert_rowid(v->db);

  if( !zText ) return SQLITE_OK;   /* nothing to index */

  rc = build_terms(&terms, v->pTokenizer, zText, *piRowid);
  if( rc!=SQLITE_OK ) return rc;

  for(e=HashFirst(&terms); e; e=HashNext(e)){
    DocList *p = HashData(e);
    rc = index_insert_term(v, HashKey(e), HashKeysize(e), *piRowid, p);
    if( rc!=SQLITE_OK ) break;
  }

  for(e=HashFirst(&terms); e; e=HashNext(e)){
    DocList *p = HashData(e);
    docListDelete(p);
  }
  HashClear(&terms);
  return rc;
}

static int index_delete_term(fulltext_vtab *v, const char *zTerm, int nTerm,
                             sqlite_int64 iDocid){
  sqlite_int64 iFirst;
  sqlite_int64 iIndexRow;
  DocList doclist;

  int rc = term_chunk_select(v, zTerm, nTerm, iDocid, &iFirst);
  if( rc!=SQLITE_ROW ) return SQLITE_ERROR;

  rc = term_select(v, zTerm, nTerm, iFirst, &iIndexRow, &doclist);
  if( rc!=SQLITE_OK ) return rc;

  if( docListUpdate(&doclist, iDocid, NULL) ){
    if( doclist.nData>0 ){
      rc = term_update(v, iIndexRow, &doclist);
    } else {  /* empty posting list */
      rc = term_delete(v, iIndexRow);
    }
  }
  docListDestroy(&doclist);
  return rc;
}

/* Delete a row from the full-text index. */
static int index_delete(fulltext_vtab *v, sqlite_int64 iRow){
  char *zText;
  Hash terms;
  HashElem *e;

  int rc = content_select(v, iRow, &zText);
  if( rc!=SQLITE_OK ) return rc;

  rc = build_terms(&terms, v->pTokenizer, zText, iRow);
  free(zText);
  if( rc!=SQLITE_OK ) return rc;

  for(e=HashFirst(&terms); e; e=HashNext(e)){
    rc = index_delete_term(v, HashKey(e), HashKeysize(e), iRow);
    if( rc!=SQLITE_OK ) break;
  }
  for(e=HashFirst(&terms); e; e=HashNext(e)){
    DocList *p = HashData(e);
    docListDelete(p);
  }
  HashClear(&terms);

  return content_delete(v, iRow);
}

static int fulltextUpdate(sqlite3_vtab *pVtab, int nArg, sqlite3_value **ppArg,
                   sqlite_int64 *pRowid){
  fulltext_vtab *v = (fulltext_vtab *) pVtab;

  if( nArg<2 ){
    return index_delete(v, sqlite3_value_int64(ppArg[0]));
  }

  if( sqlite3_value_type(ppArg[0]) != SQLITE_NULL ){
    return SQLITE_ERROR;   /* an update; not yet supported */
  }

  assert( nArg==3 );    /* ppArg[1] = rowid, ppArg[2] = content */
  return index_insert(v, ppArg[1],
                      (const char *)sqlite3_value_text(ppArg[2]), pRowid);
}

static sqlite3_module fulltextModule = {
  0,
  fulltextCreate,
  fulltextConnect,
  fulltextBestIndex,
  fulltextDisconnect,
  fulltextDestroy,
  fulltextOpen,
  fulltextClose,
  fulltextFilter,
  fulltextNext,
  fulltextEof,
  fulltextColumn,
  fulltextRowid,
  fulltextUpdate
};

int fulltext_init(sqlite3 *db){
 return sqlite3_create_module(db, "fulltext", &fulltextModule, 0);
}

#if !SQLITE_CORE
#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_fulltext_init(sqlite3 *db, char **pzErrMsg,
                          const sqlite3_api_routines *pApi){
 SQLITE_EXTENSION_INIT2(pApi)
 return fulltext_init(db);
}
#endif
