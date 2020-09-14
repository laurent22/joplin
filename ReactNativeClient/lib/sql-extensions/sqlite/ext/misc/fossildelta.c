/*
** 2019-02-19
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
** This SQLite extension implements the delta functions used by the RBU
** extension. Three scalar functions and one table-valued function are
** implemented here:
**
**   delta_apply(X,D)     -- apply delta D to file X and return the result
**   delta_create(X,Y)    -- compute and return a delta that carries X into Y
**   delta_output_size(D) -- blob size in bytes output from applying delta D
**   delta_parse(D)       -- returns rows describing delta D
**
** The delta format is the Fossil delta format, described in a comment
** on the delete_create() function implementation below, and also at
**
**    https://www.fossil-scm.org/fossil/doc/trunk/www/delta_format.wiki
**
** This delta format is used by the RBU extension, which is the main
** reason that these routines are included in the extension library.
** RBU does not use this extension directly.  Rather, this extension is
** provided as a convenience to developers who want to analyze RBU files 
** that contain deltas.
*/
#include <string.h>
#include <assert.h>
#include <stdlib.h>
#include "sqlite3ext.h"
SQLITE_EXTENSION_INIT1

#ifndef SQLITE_AMALGAMATION
/*
** The "u32" type must be an unsigned 32-bit integer.  Adjust this
*/
typedef unsigned int u32;

/*
** Must be a 16-bit value
*/
typedef short int s16;
typedef unsigned short int u16;

#endif /* SQLITE_AMALGAMATION */


/*
** The width of a hash window in bytes.  The algorithm only works if this
** is a power of 2.
*/
#define NHASH 16

/*
** The current state of the rolling hash.
**
** z[] holds the values that have been hashed.  z[] is a circular buffer.
** z[i] is the first entry and z[(i+NHASH-1)%NHASH] is the last entry of
** the window.
**
** Hash.a is the sum of all elements of hash.z[].  Hash.b is a weighted
** sum.  Hash.b is z[i]*NHASH + z[i+1]*(NHASH-1) + ... + z[i+NHASH-1]*1.
** (Each index for z[] should be module NHASH, of course.  The %NHASH operator
** is omitted in the prior expression for brevity.)
*/
typedef struct hash hash;
struct hash {
  u16 a, b;         /* Hash values */
  u16 i;            /* Start of the hash window */
  char z[NHASH];    /* The values that have been hashed */
};

/*
** Initialize the rolling hash using the first NHASH characters of z[]
*/
static void hash_init(hash *pHash, const char *z){
  u16 a, b, i;
  a = b = z[0];
  for(i=1; i<NHASH; i++){
    a += z[i];
    b += a;
  }
  memcpy(pHash->z, z, NHASH);
  pHash->a = a & 0xffff;
  pHash->b = b & 0xffff;
  pHash->i = 0;
}

/*
** Advance the rolling hash by a single character "c"
*/
static void hash_next(hash *pHash, int c){
  u16 old = pHash->z[pHash->i];
  pHash->z[pHash->i] = c;
  pHash->i = (pHash->i+1)&(NHASH-1);
  pHash->a = pHash->a - old + c;
  pHash->b = pHash->b - NHASH*old + pHash->a;
}

/*
** Return a 32-bit hash value
*/
static u32 hash_32bit(hash *pHash){
  return (pHash->a & 0xffff) | (((u32)(pHash->b & 0xffff))<<16);
}

/*
** Compute a hash on NHASH bytes.
**
** This routine is intended to be equivalent to:
**    hash h;
**    hash_init(&h, zInput);
**    return hash_32bit(&h);
*/
static u32 hash_once(const char *z){
  u16 a, b, i;
  a = b = z[0];
  for(i=1; i<NHASH; i++){
    a += z[i];
    b += a;
  }
  return a | (((u32)b)<<16);
}

/*
** Write an base-64 integer into the given buffer.
*/
static void putInt(unsigned int v, char **pz){
  static const char zDigits[] =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz~";
  /*  123456789 123456789 123456789 123456789 123456789 123456789 123 */
  int i, j;
  char zBuf[20];
  if( v==0 ){
    *(*pz)++ = '0';
    return;
  }
  for(i=0; v>0; i++, v>>=6){
    zBuf[i] = zDigits[v&0x3f];
  }
  for(j=i-1; j>=0; j--){
    *(*pz)++ = zBuf[j];
  }
}

/*
** Read bytes from *pz and convert them into a positive integer.  When
** finished, leave *pz pointing to the first character past the end of
** the integer.  The *pLen parameter holds the length of the string
** in *pz and is decremented once for each character in the integer.
*/
static unsigned int deltaGetInt(const char **pz, int *pLen){
  static const signed char zValue[] = {
    -1, -1, -1, -1, -1, -1, -1, -1,   -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,   -1, -1, -1, -1, -1, -1, -1, -1,
    -1, -1, -1, -1, -1, -1, -1, -1,   -1, -1, -1, -1, -1, -1, -1, -1,
     0,  1,  2,  3,  4,  5,  6,  7,    8,  9, -1, -1, -1, -1, -1, -1,
    -1, 10, 11, 12, 13, 14, 15, 16,   17, 18, 19, 20, 21, 22, 23, 24,
    25, 26, 27, 28, 29, 30, 31, 32,   33, 34, 35, -1, -1, -1, -1, 36,
    -1, 37, 38, 39, 40, 41, 42, 43,   44, 45, 46, 47, 48, 49, 50, 51,
    52, 53, 54, 55, 56, 57, 58, 59,   60, 61, 62, -1, -1, -1, 63, -1,
  };
  unsigned int v = 0;
  int c;
  unsigned char *z = (unsigned char*)*pz;
  unsigned char *zStart = z;
  while( (c = zValue[0x7f&*(z++)])>=0 ){
     v = (v<<6) + c;
  }
  z--;
  *pLen -= z - zStart;
  *pz = (char*)z;
  return v;
}

/*
** Return the number digits in the base-64 representation of a positive integer
*/
static int digit_count(int v){
  unsigned int i, x;
  for(i=1, x=64; v>=x; i++, x <<= 6){}
  return i;
}

#ifdef __GNUC__
# define GCC_VERSION (__GNUC__*1000000+__GNUC_MINOR__*1000+__GNUC_PATCHLEVEL__)
#else
# define GCC_VERSION 0
#endif

/*
** Compute a 32-bit big-endian checksum on the N-byte buffer.  If the
** buffer is not a multiple of 4 bytes length, compute the sum that would
** have occurred if the buffer was padded with zeros to the next multiple
** of four bytes.
*/
static unsigned int checksum(const char *zIn, size_t N){
  static const int byteOrderTest = 1;
  const unsigned char *z = (const unsigned char *)zIn;
  const unsigned char *zEnd = (const unsigned char*)&zIn[N&~3];
  unsigned sum = 0;
  assert( (z - (const unsigned char*)0)%4==0 );  /* Four-byte alignment */
  if( 0==*(char*)&byteOrderTest ){
    /* This is a big-endian machine */
    while( z<zEnd ){
      sum += *(unsigned*)z;
      z += 4;
    }
  }else{
    /* A little-endian machine */
#if GCC_VERSION>=4003000
    while( z<zEnd ){
      sum += __builtin_bswap32(*(unsigned*)z);
      z += 4;
    }
#elif defined(_MSC_VER) && _MSC_VER>=1300
    while( z<zEnd ){
      sum += _byteswap_ulong(*(unsigned*)z);
      z += 4;
    }
#else
    unsigned sum0 = 0;
    unsigned sum1 = 0;
    unsigned sum2 = 0;
    while(N >= 16){
      sum0 += ((unsigned)z[0] + z[4] + z[8] + z[12]);
      sum1 += ((unsigned)z[1] + z[5] + z[9] + z[13]);
      sum2 += ((unsigned)z[2] + z[6] + z[10]+ z[14]);
      sum  += ((unsigned)z[3] + z[7] + z[11]+ z[15]);
      z += 16;
      N -= 16;
    }
    while(N >= 4){
      sum0 += z[0];
      sum1 += z[1];
      sum2 += z[2];
      sum  += z[3];
      z += 4;
      N -= 4;
    }
    sum += (sum2 << 8) + (sum1 << 16) + (sum0 << 24);
#endif
  }
  switch(N&3){
    case 3:   sum += (z[2] << 8);
    case 2:   sum += (z[1] << 16);
    case 1:   sum += (z[0] << 24);
    default:  ;
  }
  return sum;
}

/*
** Create a new delta.
**
** The delta is written into a preallocated buffer, zDelta, which
** should be at least 60 bytes longer than the target file, zOut.
** The delta string will be NUL-terminated, but it might also contain
** embedded NUL characters if either the zSrc or zOut files are
** binary.  This function returns the length of the delta string
** in bytes, excluding the final NUL terminator character.
**
** Output Format:
**
** The delta begins with a base64 number followed by a newline.  This
** number is the number of bytes in the TARGET file.  Thus, given a
** delta file z, a program can compute the size of the output file
** simply by reading the first line and decoding the base-64 number
** found there.  The delta_output_size() routine does exactly this.
**
** After the initial size number, the delta consists of a series of
** literal text segments and commands to copy from the SOURCE file.
** A copy command looks like this:
**
**     NNN@MMM,
**
** where NNN is the number of bytes to be copied and MMM is the offset
** into the source file of the first byte (both base-64).   If NNN is 0
** it means copy the rest of the input file.  Literal text is like this:
**
**     NNN:TTTTT
**
** where NNN is the number of bytes of text (base-64) and TTTTT is the text.
**
** The last term is of the form
**
**     NNN;
**
** In this case, NNN is a 32-bit bigendian checksum of the output file
** that can be used to verify that the delta applied correctly.  All
** numbers are in base-64.
**
** Pure text files generate a pure text delta.  Binary files generate a
** delta that may contain some binary data.
**
** Algorithm:
**
** The encoder first builds a hash table to help it find matching
** patterns in the source file.  16-byte chunks of the source file
** sampled at evenly spaced intervals are used to populate the hash
** table.
**
** Next we begin scanning the target file using a sliding 16-byte
** window.  The hash of the 16-byte window in the target is used to
** search for a matching section in the source file.  When a match
** is found, a copy command is added to the delta.  An effort is
** made to extend the matching section to regions that come before
** and after the 16-byte hash window.  A copy command is only issued
** if the result would use less space that just quoting the text
** literally. Literal text is added to the delta for sections that
** do not match or which can not be encoded efficiently using copy
** commands.
*/
static int delta_create(
  const char *zSrc,      /* The source or pattern file */
  unsigned int lenSrc,   /* Length of the source file */
  const char *zOut,      /* The target file */
  unsigned int lenOut,   /* Length of the target file */
  char *zDelta           /* Write the delta into this buffer */
){
  int i, base;
  char *zOrigDelta = zDelta;
  hash h;
  int nHash;                 /* Number of hash table entries */
  int *landmark;             /* Primary hash table */
  int *collide;              /* Collision chain */
  int lastRead = -1;         /* Last byte of zSrc read by a COPY command */

  /* Add the target file size to the beginning of the delta
  */
  putInt(lenOut, &zDelta);
  *(zDelta++) = '\n';

  /* If the source file is very small, it means that we have no
  ** chance of ever doing a copy command.  Just output a single
  ** literal segment for the entire target and exit.
  */
  if( lenSrc<=NHASH ){
    putInt(lenOut, &zDelta);
    *(zDelta++) = ':';
    memcpy(zDelta, zOut, lenOut);
    zDelta += lenOut;
    putInt(checksum(zOut, lenOut), &zDelta);
    *(zDelta++) = ';';
    return zDelta - zOrigDelta;
  }

  /* Compute the hash table used to locate matching sections in the
  ** source file.
  */
  nHash = lenSrc/NHASH;
  collide = sqlite3_malloc64( (sqlite3_int64)nHash*2*sizeof(int) );
  memset(collide, -1, nHash*2*sizeof(int));
  landmark = &collide[nHash];
  for(i=0; i<lenSrc-NHASH; i+=NHASH){
    int hv = hash_once(&zSrc[i]) % nHash;
    collide[i/NHASH] = landmark[hv];
    landmark[hv] = i/NHASH;
  }

  /* Begin scanning the target file and generating copy commands and
  ** literal sections of the delta.
  */
  base = 0;    /* We have already generated everything before zOut[base] */
  while( base+NHASH<lenOut ){
    int iSrc, iBlock;
    unsigned int bestCnt, bestOfst=0, bestLitsz=0;
    hash_init(&h, &zOut[base]);
    i = 0;     /* Trying to match a landmark against zOut[base+i] */
    bestCnt = 0;
    while( 1 ){
      int hv;
      int limit = 250;

      hv = hash_32bit(&h) % nHash;
      iBlock = landmark[hv];
      while( iBlock>=0 && (limit--)>0 ){
        /*
        ** The hash window has identified a potential match against
        ** landmark block iBlock.  But we need to investigate further.
        **
        ** Look for a region in zOut that matches zSrc. Anchor the search
        ** at zSrc[iSrc] and zOut[base+i].  Do not include anything prior to
        ** zOut[base] or after zOut[outLen] nor anything after zSrc[srcLen].
        **
        ** Set cnt equal to the length of the match and set ofst so that
        ** zSrc[ofst] is the first element of the match.  litsz is the number
        ** of characters between zOut[base] and the beginning of the match.
        ** sz will be the overhead (in bytes) needed to encode the copy
        ** command.  Only generate copy command if the overhead of the
        ** copy command is less than the amount of literal text to be copied.
        */
        int cnt, ofst, litsz;
        int j, k, x, y;
        int sz;
        int limitX;

        /* Beginning at iSrc, match forwards as far as we can.  j counts
        ** the number of characters that match */
        iSrc = iBlock*NHASH;
        y = base+i;
        limitX = ( lenSrc-iSrc <= lenOut-y ) ? lenSrc : iSrc + lenOut - y;
        for(x=iSrc; x<limitX; x++, y++){
          if( zSrc[x]!=zOut[y] ) break;
        }
        j = x - iSrc - 1;

        /* Beginning at iSrc-1, match backwards as far as we can.  k counts
        ** the number of characters that match */
        for(k=1; k<iSrc && k<=i; k++){
          if( zSrc[iSrc-k]!=zOut[base+i-k] ) break;
        }
        k--;

        /* Compute the offset and size of the matching region */
        ofst = iSrc-k;
        cnt = j+k+1;
        litsz = i-k;  /* Number of bytes of literal text before the copy */
        /* sz will hold the number of bytes needed to encode the "insert"
        ** command and the copy command, not counting the "insert" text */
        sz = digit_count(i-k)+digit_count(cnt)+digit_count(ofst)+3;
        if( cnt>=sz && cnt>bestCnt ){
          /* Remember this match only if it is the best so far and it
          ** does not increase the file size */
          bestCnt = cnt;
          bestOfst = iSrc-k;
          bestLitsz = litsz;
        }

        /* Check the next matching block */
        iBlock = collide[iBlock];
      }

      /* We have a copy command that does not cause the delta to be larger
      ** than a literal insert.  So add the copy command to the delta.
      */
      if( bestCnt>0 ){
        if( bestLitsz>0 ){
          /* Add an insert command before the copy */
          putInt(bestLitsz,&zDelta);
          *(zDelta++) = ':';
          memcpy(zDelta, &zOut[base], bestLitsz);
          zDelta += bestLitsz;
          base += bestLitsz;
        }
        base += bestCnt;
        putInt(bestCnt, &zDelta);
        *(zDelta++) = '@';
        putInt(bestOfst, &zDelta);
        *(zDelta++) = ',';
        if( bestOfst + bestCnt -1 > lastRead ){
          lastRead = bestOfst + bestCnt - 1;
        }
        bestCnt = 0;
        break;
      }

      /* If we reach this point, it means no match is found so far */
      if( base+i+NHASH>=lenOut ){
        /* We have reached the end of the file and have not found any
        ** matches.  Do an "insert" for everything that does not match */
        putInt(lenOut-base, &zDelta);
        *(zDelta++) = ':';
        memcpy(zDelta, &zOut[base], lenOut-base);
        zDelta += lenOut-base;
        base = lenOut;
        break;
      }

      /* Advance the hash by one character.  Keep looking for a match */
      hash_next(&h, zOut[base+i+NHASH]);
      i++;
    }
  }
  /* Output a final "insert" record to get all the text at the end of
  ** the file that does not match anything in the source file.
  */
  if( base<lenOut ){
    putInt(lenOut-base, &zDelta);
    *(zDelta++) = ':';
    memcpy(zDelta, &zOut[base], lenOut-base);
    zDelta += lenOut-base;
  }
  /* Output the final checksum record. */
  putInt(checksum(zOut, lenOut), &zDelta);
  *(zDelta++) = ';';
  sqlite3_free(collide);
  return zDelta - zOrigDelta;
}

/*
** Return the size (in bytes) of the output from applying
** a delta.
**
** This routine is provided so that an procedure that is able
** to call delta_apply() can learn how much space is required
** for the output and hence allocate nor more space that is really
** needed.
*/
static int delta_output_size(const char *zDelta, int lenDelta){
  int size;
  size = deltaGetInt(&zDelta, &lenDelta);
  if( *zDelta!='\n' ){
    /* ERROR: size integer not terminated by "\n" */
    return -1;
  }
  return size;
}


/*
** Apply a delta.
**
** The output buffer should be big enough to hold the whole output
** file and a NUL terminator at the end.  The delta_output_size()
** routine will determine this size for you.
**
** The delta string should be null-terminated.  But the delta string
** may contain embedded NUL characters (if the input and output are
** binary files) so we also have to pass in the length of the delta in
** the lenDelta parameter.
**
** This function returns the size of the output file in bytes (excluding
** the final NUL terminator character).  Except, if the delta string is
** malformed or intended for use with a source file other than zSrc,
** then this routine returns -1.
**
** Refer to the delta_create() documentation above for a description
** of the delta file format.
*/
static int delta_apply(
  const char *zSrc,      /* The source or pattern file */
  int lenSrc,            /* Length of the source file */
  const char *zDelta,    /* Delta to apply to the pattern */
  int lenDelta,          /* Length of the delta */
  char *zOut             /* Write the output into this preallocated buffer */
){
  unsigned int limit;
  unsigned int total = 0;
#ifdef FOSSIL_ENABLE_DELTA_CKSUM_TEST
  char *zOrigOut = zOut;
#endif

  limit = deltaGetInt(&zDelta, &lenDelta);
  if( *zDelta!='\n' ){
    /* ERROR: size integer not terminated by "\n" */
    return -1;
  }
  zDelta++; lenDelta--;
  while( *zDelta && lenDelta>0 ){
    unsigned int cnt, ofst;
    cnt = deltaGetInt(&zDelta, &lenDelta);
    switch( zDelta[0] ){
      case '@': {
        zDelta++; lenDelta--;
        ofst = deltaGetInt(&zDelta, &lenDelta);
        if( lenDelta>0 && zDelta[0]!=',' ){
          /* ERROR: copy command not terminated by ',' */
          return -1;
        }
        zDelta++; lenDelta--;
        total += cnt;
        if( total>limit ){
          /* ERROR: copy exceeds output file size */
          return -1;
        }
        if( ofst+cnt > lenSrc ){
          /* ERROR: copy extends past end of input */
          return -1;
        }
        memcpy(zOut, &zSrc[ofst], cnt);
        zOut += cnt;
        break;
      }
      case ':': {
        zDelta++; lenDelta--;
        total += cnt;
        if( total>limit ){
          /* ERROR:  insert command gives an output larger than predicted */
          return -1;
        }
        if( cnt>lenDelta ){
          /* ERROR: insert count exceeds size of delta */
          return -1;
        }
        memcpy(zOut, zDelta, cnt);
        zOut += cnt;
        zDelta += cnt;
        lenDelta -= cnt;
        break;
      }
      case ';': {
        zDelta++; lenDelta--;
        zOut[0] = 0;
#ifdef FOSSIL_ENABLE_DELTA_CKSUM_TEST
        if( cnt!=checksum(zOrigOut, total) ){
          /* ERROR:  bad checksum */
          return -1;
        }
#endif
        if( total!=limit ){
          /* ERROR: generated size does not match predicted size */
          return -1;
        }
        return total;
      }
      default: {
        /* ERROR: unknown delta operator */
        return -1;
      }
    }
  }
  /* ERROR: unterminated delta */
  return -1;
}

/*
** SQL functions:  delta_create(X,Y)
**
** Return a delta for carrying X into Y.
*/
static void deltaCreateFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *aOrig; int nOrig;  /* old blob */
  const char *aNew;  int nNew;   /* new blob */
  char *aOut;        int nOut;   /* output delta */

  assert( argc==2 );
  if( sqlite3_value_type(argv[0])==SQLITE_NULL ) return;
  if( sqlite3_value_type(argv[1])==SQLITE_NULL ) return;
  nOrig = sqlite3_value_bytes(argv[0]);
  aOrig = (const char*)sqlite3_value_blob(argv[0]);
  nNew = sqlite3_value_bytes(argv[1]);
  aNew = (const char*)sqlite3_value_blob(argv[1]);
  aOut = sqlite3_malloc64(nNew+70);
  if( aOut==0 ){
    sqlite3_result_error_nomem(context);
  }else{
    nOut = delta_create(aOrig, nOrig, aNew, nNew, aOut);
    if( nOut<0 ){
      sqlite3_free(aOut);
      sqlite3_result_error(context, "cannot create fossil delta", -1);
    }else{
      sqlite3_result_blob(context, aOut, nOut, sqlite3_free);
    }
  }
}

/*
** SQL functions:  delta_apply(X,D)
**
** Return the result of applying delta D to input X.
*/
static void deltaApplyFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *aOrig;   int nOrig;        /* The X input */
  const char *aDelta;  int nDelta;       /* The input delta (D) */
  char *aOut;          int nOut, nOut2;  /* The output */

  assert( argc==2 );
  if( sqlite3_value_type(argv[0])==SQLITE_NULL ) return;
  if( sqlite3_value_type(argv[1])==SQLITE_NULL ) return;
  nOrig = sqlite3_value_bytes(argv[0]);
  aOrig = (const char*)sqlite3_value_blob(argv[0]);
  nDelta = sqlite3_value_bytes(argv[1]);
  aDelta = (const char*)sqlite3_value_blob(argv[1]);

  /* Figure out the size of the output */
  nOut = delta_output_size(aDelta, nDelta);
  if( nOut<0 ){
    sqlite3_result_error(context, "corrupt fossil delta", -1);
    return;
  }
  aOut = sqlite3_malloc64((sqlite3_int64)nOut+1);
  if( aOut==0 ){
    sqlite3_result_error_nomem(context);
  }else{
    nOut2 = delta_apply(aOrig, nOrig, aDelta, nDelta, aOut);
    if( nOut2!=nOut ){
      sqlite3_free(aOut);
      sqlite3_result_error(context, "corrupt fossil delta", -1);
    }else{
      sqlite3_result_blob(context, aOut, nOut, sqlite3_free);
    }
  }
}


/*
** SQL functions:  delta_output_size(D)
**
** Return the size of the output that results from applying delta D.
*/
static void deltaOutputSizeFunc(
  sqlite3_context *context,
  int argc,
  sqlite3_value **argv
){
  const char *aDelta;  int nDelta;       /* The input delta (D) */
  int nOut;                              /* Size of output */
  assert( argc==1 );
  if( sqlite3_value_type(argv[0])==SQLITE_NULL ) return;
  nDelta = sqlite3_value_bytes(argv[0]);
  aDelta = (const char*)sqlite3_value_blob(argv[0]);

  /* Figure out the size of the output */
  nOut = delta_output_size(aDelta, nDelta);
  if( nOut<0 ){
    sqlite3_result_error(context, "corrupt fossil delta", -1);
    return;
  }else{
    sqlite3_result_int(context, nOut);
  }
}

/*****************************************************************************
** Table-valued SQL function:   delta_parse(DELTA)
**
** Schema:
**
**     CREATE TABLE delta_parse(
**       op TEXT,
**       a1 INT,
**       a2 ANY,
**       delta HIDDEN BLOB
**     );
**
** Given an input DELTA, this function parses the delta and returns
** rows for each entry in the delta.  The op column has one of the
** values SIZE, COPY, INSERT, CHECKSUM, ERROR.
**
** Assuming no errors, the first row has op='SIZE'.  a1 is the size of
** the output in bytes and a2 is NULL.
**
** After the initial SIZE row, there are zero or more 'COPY' and/or 'INSERT'
** rows.  A COPY row means content is copied from the source into the
** output.  Column a1 is the number of bytes to copy and a2 is the offset
** into source from which to begin copying.  An INSERT row means to
** insert text into the output stream.  Column a1 is the number of bytes
** to insert and column is a BLOB that contains the text to be inserted.
**
** The last row of a well-formed delta will have an op value of 'CHECKSUM'.
** The a1 column will be the value of the checksum and a2 will be NULL.
**
** If the input delta is not well-formed, then a row with an op value
** of 'ERROR' is returned.  The a1 value of the ERROR row is the offset
** into the delta where the error was encountered and a2 is NULL.
*/
typedef struct deltaparsevtab_vtab deltaparsevtab_vtab;
typedef struct deltaparsevtab_cursor deltaparsevtab_cursor;
struct deltaparsevtab_vtab {
  sqlite3_vtab base;  /* Base class - must be first */
  /* No additional information needed */
};
struct deltaparsevtab_cursor {
  sqlite3_vtab_cursor base;  /* Base class - must be first */
  char *aDelta;              /* The delta being parsed */
  int nDelta;                /* Number of bytes in the delta */
  int iCursor;               /* Current cursor location */
  int eOp;                   /* Name of current operator */
  unsigned int a1, a2;       /* Arguments to current operator */
  int iNext;                 /* Next cursor value */
};

/* Operator names:
*/
static const char *azOp[] = {
  "SIZE", "COPY", "INSERT", "CHECKSUM", "ERROR", "EOF"
};
#define DELTAPARSE_OP_SIZE         0
#define DELTAPARSE_OP_COPY         1
#define DELTAPARSE_OP_INSERT       2
#define DELTAPARSE_OP_CHECKSUM     3
#define DELTAPARSE_OP_ERROR        4
#define DELTAPARSE_OP_EOF          5

/*
** The deltaparsevtabConnect() method is invoked to create a new
** deltaparse virtual table.
**
** Think of this routine as the constructor for deltaparsevtab_vtab objects.
**
** All this routine needs to do is:
**
**    (1) Allocate the deltaparsevtab_vtab object and initialize all fields.
**
**    (2) Tell SQLite (via the sqlite3_declare_vtab() interface) what the
**        result set of queries against the virtual table will look like.
*/
static int deltaparsevtabConnect(
  sqlite3 *db,
  void *pAux,
  int argc, const char *const*argv,
  sqlite3_vtab **ppVtab,
  char **pzErr
){
  deltaparsevtab_vtab *pNew;
  int rc;

  rc = sqlite3_declare_vtab(db,
           "CREATE TABLE x(op,a1,a2,delta HIDDEN)"
       );
  /* For convenience, define symbolic names for the index to each column. */
#define DELTAPARSEVTAB_OP     0
#define DELTAPARSEVTAB_A1     1
#define DELTAPARSEVTAB_A2     2
#define DELTAPARSEVTAB_DELTA  3
  if( rc==SQLITE_OK ){
    pNew = sqlite3_malloc64( sizeof(*pNew) );
    *ppVtab = (sqlite3_vtab*)pNew;
    if( pNew==0 ) return SQLITE_NOMEM;
    memset(pNew, 0, sizeof(*pNew));
    sqlite3_vtab_config(db, SQLITE_VTAB_INNOCUOUS);
  }
  return rc;
}

/*
** This method is the destructor for deltaparsevtab_vtab objects.
*/
static int deltaparsevtabDisconnect(sqlite3_vtab *pVtab){
  deltaparsevtab_vtab *p = (deltaparsevtab_vtab*)pVtab;
  sqlite3_free(p);
  return SQLITE_OK;
}

/*
** Constructor for a new deltaparsevtab_cursor object.
*/
static int deltaparsevtabOpen(sqlite3_vtab *p, sqlite3_vtab_cursor **ppCursor){
  deltaparsevtab_cursor *pCur;
  pCur = sqlite3_malloc( sizeof(*pCur) );
  if( pCur==0 ) return SQLITE_NOMEM;
  memset(pCur, 0, sizeof(*pCur));
  *ppCursor = &pCur->base;
  return SQLITE_OK;
}

/*
** Destructor for a deltaparsevtab_cursor.
*/
static int deltaparsevtabClose(sqlite3_vtab_cursor *cur){
  deltaparsevtab_cursor *pCur = (deltaparsevtab_cursor*)cur;
  sqlite3_free(pCur->aDelta);
  sqlite3_free(pCur);
  return SQLITE_OK;
}


/*
** Advance a deltaparsevtab_cursor to its next row of output.
*/
static int deltaparsevtabNext(sqlite3_vtab_cursor *cur){
  deltaparsevtab_cursor *pCur = (deltaparsevtab_cursor*)cur;
  const char *z;
  int i = 0;

  pCur->iCursor = pCur->iNext;
  z = pCur->aDelta + pCur->iCursor;
  pCur->a1 = deltaGetInt(&z, &i);
  switch( z[0] ){
    case '@': {
      z++;
      pCur->a2 = deltaGetInt(&z, &i);
      pCur->eOp = DELTAPARSE_OP_COPY;
      pCur->iNext = (int)(&z[1] - pCur->aDelta);
      break;
    }
    case ':': {
      z++;
      pCur->a2 = (unsigned int)(z - pCur->aDelta);
      pCur->eOp = DELTAPARSE_OP_INSERT;
      pCur->iNext = (int)(&z[pCur->a1] - pCur->aDelta);
      break;
    }
    case ';': {
      pCur->eOp = DELTAPARSE_OP_CHECKSUM;
      pCur->iNext = pCur->nDelta;
      break;
    }
    default: {
      if( pCur->iNext==pCur->nDelta ){
        pCur->eOp = DELTAPARSE_OP_EOF;
      }else{
        pCur->eOp = DELTAPARSE_OP_ERROR;
        pCur->iNext = pCur->nDelta;
      }
      break;
    }
  }
  return SQLITE_OK;
}

/*
** Return values of columns for the row at which the deltaparsevtab_cursor
** is currently pointing.
*/
static int deltaparsevtabColumn(
  sqlite3_vtab_cursor *cur,   /* The cursor */
  sqlite3_context *ctx,       /* First argument to sqlite3_result_...() */
  int i                       /* Which column to return */
){
  deltaparsevtab_cursor *pCur = (deltaparsevtab_cursor*)cur;
  switch( i ){
    case DELTAPARSEVTAB_OP: {
      sqlite3_result_text(ctx, azOp[pCur->eOp], -1, SQLITE_STATIC);
      break;
    }
    case DELTAPARSEVTAB_A1: {
      sqlite3_result_int(ctx, pCur->a1);
      break;
    }
    case DELTAPARSEVTAB_A2: {
      if( pCur->eOp==DELTAPARSE_OP_COPY ){
        sqlite3_result_int(ctx, pCur->a2);
      }else if( pCur->eOp==DELTAPARSE_OP_INSERT ){
        sqlite3_result_blob(ctx, pCur->aDelta+pCur->a2, pCur->a1,
                            SQLITE_TRANSIENT);
      }
      break;
    }
    case DELTAPARSEVTAB_DELTA: {
      sqlite3_result_blob(ctx, pCur->aDelta, pCur->nDelta, SQLITE_TRANSIENT);
      break;
    }
  }
  return SQLITE_OK;
}

/*
** Return the rowid for the current row.  In this implementation, the
** rowid is the same as the output value.
*/
static int deltaparsevtabRowid(sqlite3_vtab_cursor *cur, sqlite_int64 *pRowid){
  deltaparsevtab_cursor *pCur = (deltaparsevtab_cursor*)cur;
  *pRowid = pCur->iCursor;
  return SQLITE_OK;
}

/*
** Return TRUE if the cursor has been moved off of the last
** row of output.
*/
static int deltaparsevtabEof(sqlite3_vtab_cursor *cur){
  deltaparsevtab_cursor *pCur = (deltaparsevtab_cursor*)cur;
  return pCur->eOp==DELTAPARSE_OP_EOF;
}

/*
** This method is called to "rewind" the deltaparsevtab_cursor object back
** to the first row of output.  This method is always called at least
** once prior to any call to deltaparsevtabColumn() or deltaparsevtabRowid() or 
** deltaparsevtabEof().
*/
static int deltaparsevtabFilter(
  sqlite3_vtab_cursor *pVtabCursor, 
  int idxNum, const char *idxStr,
  int argc, sqlite3_value **argv
){
  deltaparsevtab_cursor *pCur = (deltaparsevtab_cursor *)pVtabCursor;
  const char *a;
  int i = 0;
  pCur->eOp = DELTAPARSE_OP_ERROR;
  if( idxNum!=1 ){
    return SQLITE_OK;
  }
  pCur->nDelta = sqlite3_value_bytes(argv[0]);
  a = (const char*)sqlite3_value_blob(argv[0]);
  if( pCur->nDelta==0 || a==0 ){
    return SQLITE_OK;
  }
  pCur->aDelta = sqlite3_malloc64( pCur->nDelta+1 );
  if( pCur->aDelta==0 ){
    pCur->nDelta = 0;
    return SQLITE_NOMEM;
  }
  memcpy(pCur->aDelta, a, pCur->nDelta);
  pCur->aDelta[pCur->nDelta] = 0;
  a = pCur->aDelta;
  pCur->eOp = DELTAPARSE_OP_SIZE;
  pCur->a1 = deltaGetInt(&a, &i);
  if( a[0]!='\n' ){
    pCur->eOp = DELTAPARSE_OP_ERROR;
    pCur->a1 = pCur->a2 = 0;
    pCur->iNext = pCur->nDelta;
    return SQLITE_OK;
  }
  a++;
  pCur->iNext = (unsigned int)(a - pCur->aDelta);
  return SQLITE_OK;
}

/*
** SQLite will invoke this method one or more times while planning a query
** that uses the virtual table.  This routine needs to create
** a query plan for each invocation and compute an estimated cost for that
** plan.
*/
static int deltaparsevtabBestIndex(
  sqlite3_vtab *tab,
  sqlite3_index_info *pIdxInfo
){
  int i;
  for(i=0; i<pIdxInfo->nConstraint; i++){
    if( pIdxInfo->aConstraint[i].iColumn != DELTAPARSEVTAB_DELTA ) continue;
    if( pIdxInfo->aConstraint[i].usable==0 ) continue;
    if( pIdxInfo->aConstraint[i].op!=SQLITE_INDEX_CONSTRAINT_EQ ) continue;
    pIdxInfo->aConstraintUsage[i].argvIndex = 1;
    pIdxInfo->aConstraintUsage[i].omit = 1;
    pIdxInfo->estimatedCost = (double)1;
    pIdxInfo->estimatedRows = 10;
    pIdxInfo->idxNum = 1;
    return SQLITE_OK;
  }
  pIdxInfo->idxNum = 0;
  pIdxInfo->estimatedCost = (double)0x7fffffff;
  pIdxInfo->estimatedRows = 0x7fffffff;
  return SQLITE_CONSTRAINT;
}

/*
** This following structure defines all the methods for the 
** virtual table.
*/
static sqlite3_module deltaparsevtabModule = {
  /* iVersion    */ 0,
  /* xCreate     */ 0,
  /* xConnect    */ deltaparsevtabConnect,
  /* xBestIndex  */ deltaparsevtabBestIndex,
  /* xDisconnect */ deltaparsevtabDisconnect,
  /* xDestroy    */ 0,
  /* xOpen       */ deltaparsevtabOpen,
  /* xClose      */ deltaparsevtabClose,
  /* xFilter     */ deltaparsevtabFilter,
  /* xNext       */ deltaparsevtabNext,
  /* xEof        */ deltaparsevtabEof,
  /* xColumn     */ deltaparsevtabColumn,
  /* xRowid      */ deltaparsevtabRowid,
  /* xUpdate     */ 0,
  /* xBegin      */ 0,
  /* xSync       */ 0,
  /* xCommit     */ 0,
  /* xRollback   */ 0,
  /* xFindMethod */ 0,
  /* xRename     */ 0,
  /* xSavepoint  */ 0,
  /* xRelease    */ 0,
  /* xRollbackTo */ 0,
  /* xShadowName */ 0
};



#ifdef _WIN32
__declspec(dllexport)
#endif
int sqlite3_fossildelta_init(
  sqlite3 *db, 
  char **pzErrMsg, 
  const sqlite3_api_routines *pApi
){
  static const int enc = SQLITE_UTF8|SQLITE_INNOCUOUS;
  int rc = SQLITE_OK;
  SQLITE_EXTENSION_INIT2(pApi);
  (void)pzErrMsg;  /* Unused parameter */
  rc = sqlite3_create_function(db, "delta_create", 2, enc, 0,
                               deltaCreateFunc, 0, 0);
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_function(db, "delta_apply", 2, enc, 0,
                                 deltaApplyFunc, 0, 0);
  }
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_function(db, "delta_output_size", 1, enc, 0,
                                 deltaOutputSizeFunc, 0, 0);
  }
  if( rc==SQLITE_OK ){
    rc = sqlite3_create_module(db, "delta_parse", &deltaparsevtabModule, 0);
  }
  return rc;
}
