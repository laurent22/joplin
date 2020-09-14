/*
** A utility for printing content from the wal-index or "shm" file.
*/
#include <stdio.h>
#include <ctype.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <assert.h>

#define ISDIGIT(X)  isdigit((unsigned char)(X))
#define ISPRINT(X)  isprint((unsigned char)(X))

#if !defined(_MSC_VER)
#include <unistd.h>
#include <sys/types.h>
#else
#include <io.h>
#endif

#include <stdlib.h>
#include <string.h>

static int fd = -1;             /* The open SHM file */

/* Report an out-of-memory error and die.
*/
static void out_of_memory(void){
  fprintf(stderr,"Out of memory...\n");
  exit(1);
}

/*
** Read content from the file.
**
** Space to hold the content is obtained from malloc() and needs to be
** freed by the caller.
*/
static unsigned char *getContent(int ofst, int nByte){
  unsigned char *aData;
  aData = malloc(nByte);
  if( aData==0 ) out_of_memory();
  lseek(fd, ofst, SEEK_SET);
  read(fd, aData, nByte);
  return aData;
}

/*
** Flags values
*/
#define FG_HEX     1    /* Show as hex */
#define FG_NBO     2    /* Native byte order */
#define FG_PGSZ    4    /* Show as page-size */

/* Print a line of decode output showing a 4-byte integer.
*/
static void print_decode_line(
  unsigned char *aData,      /* Content being decoded */
  int ofst, int nByte,       /* Start and size of decode */
  unsigned flg,              /* Display flags */
  const char *zMsg           /* Message to append */
){
  int i, j;
  int val = aData[ofst];
  char zBuf[100];
  sprintf(zBuf, " %03x: %02x", ofst, aData[ofst]);
  i = (int)strlen(zBuf);
  for(j=1; j<4; j++){
    if( j>=nByte ){
      sprintf(&zBuf[i], "   ");
    }else{
      sprintf(&zBuf[i], " %02x", aData[ofst+j]);
      val = val*256 + aData[ofst+j];
    }
    i += (int)strlen(&zBuf[i]);
  }
  if( nByte==8 ){
    for(j=4; j<8; j++){
      sprintf(&zBuf[i], " %02x", aData[ofst+j]);
      i += (int)strlen(&zBuf[i]);
    }
  }
  if( flg & FG_NBO ){
    assert( nByte==4 );
    memcpy(&val, aData+ofst, 4);
  }
  sprintf(&zBuf[i], "            ");
  i += 12;
  if( flg & FG_PGSZ ){
    unsigned short sz;
    memcpy(&sz, aData+ofst, 2);
    sprintf(&zBuf[i], "   %9d", sz==1 ? 65536 : sz);
  }else if( flg & FG_HEX ){
    sprintf(&zBuf[i], "  0x%08x", val);
  }else if( nByte<8 ){
    sprintf(&zBuf[i], "   %9d", val);
  }
  printf("%s  %s\n", zBuf, zMsg);
}

/*
** Print an instance of the WalIndexHdr object.  ix is either 0 or 1
** to select which header to print.
*/
static void print_index_hdr(unsigned char *aData, int ix){
  int i;
  assert( ix==0 || ix==1 );
  i = ix ? 48 : 0;
  print_decode_line(aData, 0+i, 4, FG_NBO,  "Wal-index version");
  print_decode_line(aData, 4+i, 4, 0,       "unused padding");
  print_decode_line(aData, 8+i, 4, FG_NBO,  "transaction counter");
  print_decode_line(aData,12+i, 1, 0,       "1 when initialized");
  print_decode_line(aData,13+i, 1, 0,       "true if WAL cksums are bigendian");
  print_decode_line(aData,14+i, 2, FG_PGSZ, "database page size");
  print_decode_line(aData,16+i, 4, FG_NBO,  "mxFrame");
  print_decode_line(aData,20+i, 4, FG_NBO,  "Size of database in pages");
  print_decode_line(aData,24+i, 8, 0, "Cksum of last frame in -wal");
  print_decode_line(aData,32+i, 8, 0,  "Salt values from the -wal");
  print_decode_line(aData,40+i, 8, 0,  "Cksum over all prior fields");
}

/*
** Print the WalCkptInfo object
*/
static void print_ckpt_info(unsigned char *aData){
  const int i = 96;
  int j;
  print_decode_line(aData, 0+i, 4, FG_NBO,  "nBackfill");
  for(j=0; j<5; j++){
    char zLabel[100];
    sprintf(zLabel, "aReadMark[%d]", j);
    print_decode_line(aData, 4*j+4+i, 4, FG_NBO, zLabel);
  }
  print_decode_line(aData,24+i, 8, 0,       "aLock");
  print_decode_line(aData,32+i, 4, FG_NBO,  "nBackfillAttempted");
  print_decode_line(aData,36+i, 4, FG_NBO,  "notUsed0");
}


int main(int argc, char **argv){
  unsigned char *aData;
  if( argc<2 ){
    fprintf(stderr,"Usage: %s FILENAME\n", argv[0]);
    exit(1);
  }
  fd = open(argv[1], O_RDONLY);
  if( fd<0 ){
    fprintf(stderr,"%s: can't open %s\n", argv[0], argv[1]);
    exit(1);
  }
  aData = getContent(0, 136);
  print_index_hdr(aData, 0);
  print_index_hdr(aData, 1);
  print_ckpt_info(aData);
  free(aData);
  close(fd);
  return 0;
}
