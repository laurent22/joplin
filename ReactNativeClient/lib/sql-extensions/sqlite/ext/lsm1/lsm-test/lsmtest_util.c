
#include "lsmtest.h"
#include <stdarg.h>
#include <stdio.h>
#include <string.h>
#ifndef _WIN32
# include <sys/time.h>
#endif

/*
** Global variables used within this module.
*/
static struct TestutilGlobal {
  char **argv;
  int argc;
} g = {0, 0};

static struct TestutilRnd {
  unsigned int aRand1[2048];          /* Bits 0..10 */
  unsigned int aRand2[2048];          /* Bits 11..21 */
  unsigned int aRand3[1024];          /* Bits 22..31 */
} r;

/*************************************************************************
** The following block is a copy of the implementation of SQLite function
** sqlite3_randomness. This version has two important differences:
**
**   1. It always uses the same seed. So the sequence of random data output
**      is the same for every run of the program.
**
**   2. It is not threadsafe.
*/
static struct sqlite3PrngType {
  unsigned char i, j;             /* State variables */
  unsigned char s[256];           /* State variables */
} sqlite3Prng = {
    0xAF, 0x28,
  {
    0x71, 0xF5, 0xB4, 0x6E, 0x80, 0xAB, 0x1D, 0xB8, 
    0xFB, 0xB7, 0x49, 0xBF, 0xFF, 0x72, 0x2D, 0x14, 
    0x79, 0x09, 0xE3, 0x78, 0x76, 0xB0, 0x2C, 0x0A, 
    0x8E, 0x23, 0xEE, 0xDF, 0xE0, 0x9A, 0x2F, 0x67, 
    0xE1, 0xBE, 0x0E, 0xA7, 0x08, 0x97, 0xEB, 0x77, 
    0x78, 0xBA, 0x9D, 0xCA, 0x49, 0x4C, 0x60, 0x9A, 
    0xF6, 0xBD, 0xDA, 0x7F, 0xBC, 0x48, 0x58, 0x52, 
    0xE5, 0xCD, 0x83, 0x72, 0x23, 0x52, 0xFF, 0x6D, 
    0xEF, 0x0F, 0x82, 0x29, 0xA0, 0x83, 0x3F, 0x7D, 
    0xA4, 0x88, 0x31, 0xE7, 0x88, 0x92, 0x3B, 0x9B, 
    0x3B, 0x2C, 0xC2, 0x4C, 0x71, 0xA2, 0xB0, 0xEA, 
    0x36, 0xD0, 0x00, 0xF1, 0xD3, 0x39, 0x17, 0x5D, 
    0x2A, 0x7A, 0xE4, 0xAD, 0xE1, 0x64, 0xCE, 0x0F, 
    0x9C, 0xD9, 0xF5, 0xED, 0xB0, 0x22, 0x5E, 0x62, 
    0x97, 0x02, 0xA3, 0x8C, 0x67, 0x80, 0xFC, 0x88, 
    0x14, 0x0B, 0x15, 0x10, 0x0F, 0xC7, 0x40, 0xD4, 
    0xF1, 0xF9, 0x0E, 0x1A, 0xCE, 0xB9, 0x1E, 0xA1, 
    0x72, 0x8E, 0xD7, 0x78, 0x39, 0xCD, 0xF4, 0x5D, 
    0x2A, 0x59, 0x26, 0x34, 0xF2, 0x73, 0x0B, 0xA0, 
    0x02, 0x51, 0x2C, 0x03, 0xA3, 0xA7, 0x43, 0x13, 
    0xE8, 0x98, 0x2B, 0xD2, 0x53, 0xF8, 0xEE, 0x91, 
    0x7D, 0xE7, 0xE3, 0xDA, 0xD5, 0xBB, 0xC0, 0x92, 
    0x9D, 0x98, 0x01, 0x2C, 0xF9, 0xB9, 0xA0, 0xEB, 
    0xCF, 0x32, 0xFA, 0x01, 0x49, 0xA5, 0x1D, 0x9A, 
    0x76, 0x86, 0x3F, 0x40, 0xD4, 0x89, 0x8F, 0x9C, 
    0xE2, 0xE3, 0x11, 0x31, 0x37, 0xB2, 0x49, 0x28, 
    0x35, 0xC0, 0x99, 0xB6, 0xD0, 0xBC, 0x66, 0x35, 
    0xF7, 0x83, 0x5B, 0xD7, 0x37, 0x1A, 0x2B, 0x18, 
    0xA6, 0xFF, 0x8D, 0x7C, 0x81, 0xA8, 0xFC, 0x9E, 
    0xC4, 0xEC, 0x80, 0xD0, 0x98, 0xA7, 0x76, 0xCC, 
    0x9C, 0x2F, 0x7B, 0xFF, 0x8E, 0x0E, 0xBB, 0x90, 
    0xAE, 0x13, 0x06, 0xF5, 0x1C, 0x4E, 0x52, 0xF7
  }
};

/* Generate and return single random byte */
static unsigned char randomByte(void){
  unsigned char t;
  sqlite3Prng.i++;
  t = sqlite3Prng.s[sqlite3Prng.i];
  sqlite3Prng.j += t;
  sqlite3Prng.s[sqlite3Prng.i] = sqlite3Prng.s[sqlite3Prng.j];
  sqlite3Prng.s[sqlite3Prng.j] = t;
  t += sqlite3Prng.s[sqlite3Prng.i];
  return sqlite3Prng.s[t];
}

/*
** Return N random bytes.
*/
static void randomBlob(int nBuf, unsigned char *zBuf){
  int i;
  for(i=0; i<nBuf; i++){
    zBuf[i] = randomByte();
  }
}
/*
** End of code copied from SQLite.
*************************************************************************/


int testPrngInit(void){
  randomBlob(sizeof(r.aRand1), (unsigned char *)r.aRand1);
  randomBlob(sizeof(r.aRand2), (unsigned char *)r.aRand2);
  randomBlob(sizeof(r.aRand3), (unsigned char *)r.aRand3);
  return 0;
}

unsigned int testPrngValue(unsigned int iVal){
  return
    r.aRand1[iVal & 0x000007FF] ^
    r.aRand2[(iVal>>11) & 0x000007FF] ^
    r.aRand3[(iVal>>22) & 0x000003FF]
  ;
}

void testPrngArray(unsigned int iVal, unsigned int *aOut, int nOut){
  int i;
  for(i=0; i<nOut; i++){
    aOut[i] = testPrngValue(iVal+i);
  }
}

void testPrngString(unsigned int iVal, char *aOut, int nOut){
  int i;
  for(i=0; i<(nOut-1); i++){
    aOut[i] = 'a' + (testPrngValue(iVal+i) % 26);
  }
  aOut[i] = '\0';
}

void testErrorInit(int argc, char **argv){
  g.argc = argc;
  g.argv = argv;
}

void testPrintError(const char *zFormat, ...){
  va_list ap;
  va_start(ap, zFormat);
  vfprintf(stderr, zFormat, ap);
  va_end(ap);
}

void testPrintFUsage(const char *zFormat, ...){
  va_list ap;
  va_start(ap, zFormat);
  fprintf(stderr, "Usage: %s %s ", g.argv[0], g.argv[1]);
  vfprintf(stderr, zFormat, ap);
  fprintf(stderr, "\n");
  va_end(ap);
}

void testPrintUsage(const char *zArgs){
  testPrintError("Usage: %s %s %s\n", g.argv[0], g.argv[1], zArgs);
}


static void argError(void *aData, const char *zType, int sz, const char *zArg){
  struct Entry { const char *zName; };
  struct Entry *pEntry;
  const char *zPrev = 0;

  testPrintError("unrecognized %s \"%s\": must be ", zType, zArg);
  for(pEntry=(struct Entry *)aData; 
      pEntry->zName; 
      pEntry=(struct Entry *)&((unsigned char *)pEntry)[sz]
  ){
    if( zPrev ){ testPrintError("%s, ", zPrev); }
    zPrev = pEntry->zName;
  }
  testPrintError("or %s\n", zPrev);
}

int testArgSelectX(
  void *aData, 
  const char *zType, 
  int sz, 
  const char *zArg, 
  int *piOut
){
  struct Entry { const char *zName; };
  struct Entry *pEntry;
  int nArg = strlen(zArg);

  int i = 0;
  int iOut = -1;
  int nOut = 0;

  for(pEntry=(struct Entry *)aData; 
      pEntry->zName; 
      pEntry=(struct Entry *)&((unsigned char *)pEntry)[sz]
  ){
    int nName = strlen(pEntry->zName);
    if( nArg<=nName && memcmp(pEntry->zName, zArg, nArg)==0 ){
      iOut = i;
      if( nName==nArg ){
        nOut = 1;
        break;
      }
      nOut++;
    }
    i++;
  }

  if( nOut!=1 ){
    argError(aData, zType, sz, zArg);
  }else{
    *piOut = iOut;
  }
  return (nOut!=1);
}

struct timeval zero_time;

void testTimeInit(void){
  gettimeofday(&zero_time, 0);
}

int testTimeGet(void){
  struct timeval now;
  gettimeofday(&now, 0);
  return
    (((int)now.tv_sec - (int)zero_time.tv_sec)*1000) +
    (((int)now.tv_usec - (int)zero_time.tv_usec)/1000);
}
