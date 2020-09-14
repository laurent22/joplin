/*
** A utility for printing an SQLite database journal.
*/
#include <stdio.h>
#include <ctype.h>
#include <stdlib.h>
#include <string.h>

/*
** state information
*/
static int pageSize = 1024;
static int sectorSize = 512;
static FILE *db = 0;
static int fileSize = 0;
static unsigned cksumNonce = 0;

/* Report a memory allocation error */
static void out_of_memory(void){
  fprintf(stderr,"Out of memory...\n");
  exit(1);
}

/*
** Read N bytes of memory starting at iOfst into space obtained
** from malloc().
*/
static unsigned char *read_content(int N, int iOfst){
  int got;
  unsigned char *pBuf = malloc(N);
  if( pBuf==0 ) out_of_memory();
  fseek(db, iOfst, SEEK_SET);
  got = (int)fread(pBuf, 1, N, db);
  if( got<0 ){
    fprintf(stderr, "I/O error reading %d bytes from %d\n", N, iOfst);
    memset(pBuf, 0, N);
  }else if( got<N ){
    fprintf(stderr, "Short read: got only %d of %d bytes from %d\n",
                     got, N, iOfst);
    memset(&pBuf[got], 0, N-got);
  }
  return pBuf;
}

/* Print a line of decode output showing a 4-byte integer.
*/
static unsigned print_decode_line(
  const unsigned char *aData,  /* Content being decoded */
  int ofst, int nByte,         /* Start and size of decode */
  const char *zMsg             /* Message to append */
){
  int i, j;
  unsigned val = aData[ofst];
  char zBuf[100];
  sprintf(zBuf, " %05x: %02x", ofst, aData[ofst]);
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
  sprintf(&zBuf[i], "   %10u", val);
  printf("%s  %s\n", zBuf, zMsg);
  return val;
}

/*
** Read and print a journal header.  Store key information (page size, etc)
** in global variables.
*/
static unsigned decode_journal_header(int iOfst){
  unsigned char *pHdr = read_content(64, iOfst);
  unsigned nPage;
  printf("Header at offset %d:\n", iOfst);
  print_decode_line(pHdr, 0, 4, "Header part 1 (3654616569)");
  print_decode_line(pHdr, 4, 4, "Header part 2 (547447767)");
  nPage =
  print_decode_line(pHdr, 8, 4, "page count");
  cksumNonce =
  print_decode_line(pHdr, 12, 4, "chksum nonce");
  print_decode_line(pHdr, 16, 4, "initial database size in pages");
  sectorSize =
  print_decode_line(pHdr, 20, 4, "sector size");
  pageSize =
  print_decode_line(pHdr, 24, 4, "page size");
  print_decode_line(pHdr, 28, 4, "zero");
  print_decode_line(pHdr, 32, 4, "zero");
  print_decode_line(pHdr, 36, 4, "zero");
  print_decode_line(pHdr, 40, 4, "zero");
  free(pHdr);
  return nPage;
}

static void print_page(int iOfst){
  unsigned char *aData;
  char zTitle[50];
  aData = read_content(pageSize+8, iOfst);
  sprintf(zTitle, "page number for page at offset %d", iOfst);
  print_decode_line(aData-iOfst, iOfst, 4, zTitle);
  free(aData);
}

int main(int argc, char **argv){
  int nPage, cnt;
  int iOfst;
  if( argc!=2 ){
    fprintf(stderr,"Usage: %s FILENAME\n", argv[0]);
    exit(1);
  }
  db = fopen(argv[1], "rb");
  if( db==0 ){
    fprintf(stderr,"%s: can't open %s\n", argv[0], argv[1]);
    exit(1);
  }
  fseek(db, 0, SEEK_END);
  fileSize = ftell(db);
  printf("journal file size: %d bytes\n", fileSize);
  fseek(db, 0, SEEK_SET);
  iOfst = 0;
  while( iOfst<fileSize ){
    cnt = nPage = (int)decode_journal_header(iOfst);
    if( cnt==0 ){
      cnt = (fileSize - sectorSize)/(pageSize+8);
    }
    iOfst += sectorSize;
    while( cnt && iOfst<fileSize ){
      print_page(iOfst);
      iOfst += pageSize+8;
    }
    iOfst = (iOfst/sectorSize + 1)*sectorSize;
  }
  fclose(db);
  return 0;
}
