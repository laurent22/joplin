
/*
** 2012-02-08
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
** SQLite4-compatible varint implementation.
*/
#include "lsmInt.h"

/*************************************************************************
** The following is a copy of the varint.c module from SQLite 4.
*/

/*
** Decode the varint in z[].  Write the integer value into *pResult and
** return the number of bytes in the varint.
*/
static int lsmSqlite4GetVarint64(const unsigned char *z, u64 *pResult){
  unsigned int x;
  if( z[0]<=240 ){
    *pResult = z[0];
    return 1;
  }
  if( z[0]<=248 ){
    *pResult = (z[0]-241)*256 + z[1] + 240;
    return 2;
  }
  if( z[0]==249 ){
    *pResult = 2288 + 256*z[1] + z[2];
    return 3;
  }
  if( z[0]==250 ){
    *pResult = (z[1]<<16) + (z[2]<<8) + z[3];
    return 4;
  }
  x = (z[1]<<24) + (z[2]<<16) + (z[3]<<8) + z[4];
  if( z[0]==251 ){
    *pResult = x;
    return 5;
  }
  if( z[0]==252 ){
    *pResult = (((u64)x)<<8) + z[5];
    return 6;
  }
  if( z[0]==253 ){
    *pResult = (((u64)x)<<16) + (z[5]<<8) + z[6];
    return 7;
  }
  if( z[0]==254 ){
    *pResult = (((u64)x)<<24) + (z[5]<<16) + (z[6]<<8) + z[7];
    return 8;
  }
  *pResult = (((u64)x)<<32) +
               (0xffffffff & ((z[5]<<24) + (z[6]<<16) + (z[7]<<8) + z[8]));
  return 9;
}

/*
** Write a 32-bit unsigned integer as 4 big-endian bytes.
*/
static void lsmVarintWrite32(unsigned char *z, unsigned int y){
  z[0] = (unsigned char)(y>>24);
  z[1] = (unsigned char)(y>>16);
  z[2] = (unsigned char)(y>>8);
  z[3] = (unsigned char)(y);
}

/*
** Write a varint into z[].  The buffer z[] must be at least 9 characters
** long to accommodate the largest possible varint.  Return the number of
** bytes of z[] used.
*/
static int lsmSqlite4PutVarint64(unsigned char *z, u64 x){
  unsigned int w, y;
  if( x<=240 ){
    z[0] = (unsigned char)x;
    return 1;
  }
  if( x<=2287 ){
    y = (unsigned int)(x - 240);
    z[0] = (unsigned char)(y/256 + 241);
    z[1] = (unsigned char)(y%256);
    return 2;
  }
  if( x<=67823 ){
    y = (unsigned int)(x - 2288);
    z[0] = 249;
    z[1] = (unsigned char)(y/256);
    z[2] = (unsigned char)(y%256);
    return 3;
  }
  y = (unsigned int)x;
  w = (unsigned int)(x>>32);
  if( w==0 ){
    if( y<=16777215 ){
      z[0] = 250;
      z[1] = (unsigned char)(y>>16);
      z[2] = (unsigned char)(y>>8);
      z[3] = (unsigned char)(y);
      return 4;
    }
    z[0] = 251;
    lsmVarintWrite32(z+1, y);
    return 5;
  }
  if( w<=255 ){
    z[0] = 252;
    z[1] = (unsigned char)w;
    lsmVarintWrite32(z+2, y);
    return 6;
  }
  if( w<=32767 ){
    z[0] = 253;
    z[1] = (unsigned char)(w>>8);
    z[2] = (unsigned char)w;
    lsmVarintWrite32(z+3, y);
    return 7;
  }
  if( w<=16777215 ){
    z[0] = 254;
    z[1] = (unsigned char)(w>>16);
    z[2] = (unsigned char)(w>>8);
    z[3] = (unsigned char)w;
    lsmVarintWrite32(z+4, y);
    return 8;
  }
  z[0] = 255;
  lsmVarintWrite32(z+1, w);
  lsmVarintWrite32(z+5, y);
  return 9;
}

/*
** End of SQLite 4 code.
*************************************************************************/

int lsmVarintPut64(u8 *aData, i64 iVal){
  return lsmSqlite4PutVarint64(aData, (u64)iVal);
}

int lsmVarintGet64(const u8 *aData, i64 *piVal){
  return lsmSqlite4GetVarint64(aData, (u64 *)piVal);
}

int lsmVarintPut32(u8 *aData, int iVal){
  return lsmSqlite4PutVarint64(aData, (u64)iVal);
}

int lsmVarintGet32(u8 *z, int *piVal){
  u64 i;
  int ret;

  if( z[0]<=240 ){
    *piVal = z[0];
    return 1;
  }
  if( z[0]<=248 ){
    *piVal = (z[0]-241)*256 + z[1] + 240;
    return 2;
  }
  if( z[0]==249 ){
    *piVal = 2288 + 256*z[1] + z[2];
    return 3;
  }
  if( z[0]==250 ){
    *piVal = (z[1]<<16) + (z[2]<<8) + z[3];
    return 4;
  }

  ret = lsmSqlite4GetVarint64(z, &i);
  *piVal = (int)i;
  return ret;
}

int lsmVarintLen32(int n){
  u8 aData[9];
  return lsmVarintPut32(aData, n);
}

/*
** The argument is the first byte of a varint. This function returns the
** total number of bytes in the entire varint (including the first byte).
*/
int lsmVarintSize(u8 c){
  if( c<241 ) return 1;
  if( c<249 ) return 2;
  return (int)(c - 246);
}
