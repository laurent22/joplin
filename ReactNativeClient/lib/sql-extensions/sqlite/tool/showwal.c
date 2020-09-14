/*
** A utility for printing content from a write-ahead log file.
*/
#include <stdio.h>
#include <ctype.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>

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


static int pagesize = 1024;     /* Size of a database page */
static int fd = -1;             /* File descriptor for reading the WAL file */
static int mxFrame = 0;         /* Last frame */
static int perLine = 16;        /* HEX elements to print per line */

typedef long long int i64;      /* Datatype for 64-bit integers */

/* Information for computing the checksum */
typedef struct Cksum Cksum;
struct Cksum {
  int bSwap;           /* True to do byte swapping on 32-bit words */
  unsigned s0, s1;     /* Current checksum value */
};

/*
** extract a 32-bit big-endian integer
*/
static unsigned int getInt32(const unsigned char *a){
  unsigned int x = (a[0]<<24) + (a[1]<<16) + (a[2]<<8) + a[3];
  return x;
}

/*
** Swap bytes on a 32-bit unsigned integer
*/
static unsigned int swab32(unsigned int x){
  return (((x)&0x000000FF)<<24) + (((x)&0x0000FF00)<<8)
         + (((x)&0x00FF0000)>>8)  + (((x)&0xFF000000)>>24);
}

/* Extend the checksum.  Reinitialize the checksum if bInit is true.
*/
static void extendCksum(
  Cksum *pCksum,
  unsigned char *aData,
  unsigned int nByte,
  int bInit
){
  unsigned int *a32;
  if( bInit ){
    int a = 0;
    *((char*)&a) = 1;
    if( a==1 ){
      /* Host is little-endian */
      pCksum->bSwap = getInt32(aData)!=0x377f0682;
    }else{
      /* Host is big-endian */
      pCksum->bSwap = getInt32(aData)!=0x377f0683;
    }
    pCksum->s0 = 0;
    pCksum->s1 = 0;
  }
  a32 = (unsigned int*)aData;
  while( nByte>0 ){
    unsigned int x0 = a32[0];
    unsigned int x1 = a32[1];
    if( pCksum->bSwap ){
      x0 = swab32(x0);
      x1 = swab32(x1);
    }
    pCksum->s0 += x0 + pCksum->s1;
    pCksum->s1 += x1 + pCksum->s0;
    nByte -= 8;
    a32 += 2;
  }
}

/*
** Convert the var-int format into i64.  Return the number of bytes
** in the var-int.  Write the var-int value into *pVal.
*/
static int decodeVarint(const unsigned char *z, i64 *pVal){
  i64 v = 0;
  int i;
  for(i=0; i<8; i++){
    v = (v<<7) + (z[i]&0x7f);
    if( (z[i]&0x80)==0 ){ *pVal = v; return i+1; }
  }
  v = (v<<8) + (z[i]&0xff);
  *pVal = v;
  return 9;
}

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
** Print a range of bytes as hex and as ascii.
*/
static void print_byte_range(
  int ofst,              /* First byte in the range of bytes to print */
  int nByte,             /* Number of bytes to print */
  unsigned char *aData,  /* Content to print */
  int printOfst          /* Add this amount to the index on the left column */
){
  int i, j;
  const char *zOfstFmt;

  if( ((printOfst+nByte)&~0xfff)==0 ){
    zOfstFmt = " %03x: ";
  }else if( ((printOfst+nByte)&~0xffff)==0 ){
    zOfstFmt = " %04x: ";
  }else if( ((printOfst+nByte)&~0xfffff)==0 ){
    zOfstFmt = " %05x: ";
  }else if( ((printOfst+nByte)&~0xffffff)==0 ){
    zOfstFmt = " %06x: ";
  }else{
    zOfstFmt = " %08x: ";
  }

  for(i=0; i<nByte; i += perLine){
    fprintf(stdout, zOfstFmt, i+printOfst);
    for(j=0; j<perLine; j++){
      if( i+j>nByte ){
        fprintf(stdout, "   ");
      }else{
        fprintf(stdout,"%02x ", aData[i+j]);
      }
    }
    for(j=0; j<perLine; j++){
      if( i+j>nByte ){
        fprintf(stdout, " ");
      }else{
        fprintf(stdout,"%c", ISPRINT(aData[i+j]) ? aData[i+j] : '.');
      }
    }
    fprintf(stdout,"\n");
  }
}

/* Print a line of decode output showing a 4-byte integer.
*/
static void print_decode_line(
  unsigned char *aData,      /* Content being decoded */
  int ofst, int nByte,       /* Start and size of decode */
  int asHex,                 /* If true, output value as hex */
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
  if( asHex ){
    sprintf(&zBuf[i], "  0x%08x", val);
  }else{
    sprintf(&zBuf[i], "   %9d", val);
  }
  printf("%s  %s\n", zBuf, zMsg);
}

/*
** Print an entire page of content as hex
*/
static void print_frame(int iFrame){
  int iStart;
  unsigned char *aData;
  iStart = 32 + (iFrame-1)*(pagesize+24);
  fprintf(stdout, "Frame %d:   (offsets 0x%x..0x%x)\n",
          iFrame, iStart, iStart+pagesize+24);
  aData = getContent(iStart, pagesize+24);
  print_decode_line(aData, 0, 4, 0, "Page number");
  print_decode_line(aData, 4, 4, 0, "DB size, or 0 for non-commit");
  print_decode_line(aData, 8, 4, 1, "Salt-1");
  print_decode_line(aData,12, 4, 1, "Salt-2");
  print_decode_line(aData,16, 4, 1, "Checksum-1");
  print_decode_line(aData,20, 4, 1, "Checksum-2");
  print_byte_range(iStart+24, pagesize, aData+24, 0);
  free(aData);
}

/*
** Summarize a single frame on a single line.
*/
static void print_oneline_frame(int iFrame, Cksum *pCksum){
  int iStart;
  unsigned char *aData;
  unsigned int s0, s1;
  iStart = 32 + (iFrame-1)*(pagesize+24);
  aData = getContent(iStart, 24);
  extendCksum(pCksum, aData, 8, 0);
  extendCksum(pCksum, getContent(iStart+24, pagesize), pagesize, 0);
  s0 = getInt32(aData+16);
  s1 = getInt32(aData+20);
  fprintf(stdout, "Frame %4d: %6d %6d 0x%08x,%08x 0x%08x,%08x %s\n",
          iFrame, 
          getInt32(aData),
          getInt32(aData+4),
          getInt32(aData+8),
          getInt32(aData+12),
          s0,
          s1,
          (s0==pCksum->s0 && s1==pCksum->s1) ? "" : "cksum-fail"
  );

  /* Reset the checksum so that a single frame checksum failure will not
  ** cause all subsequent frames to also show a failure. */
  pCksum->s0 = s0;
  pCksum->s1 = s1;
  free(aData);
}

/*
** Decode the WAL header.
*/
static void print_wal_header(Cksum *pCksum){
  unsigned char *aData;
  aData = getContent(0, 32);
  if( pCksum ){
    extendCksum(pCksum, aData, 24, 1);
    printf("Checksum byte order: %s\n", pCksum->bSwap ? "swapped" : "native");
  }
  printf("WAL Header:\n");
  print_decode_line(aData, 0, 4,1,"Magic.  0x377f0682 (le) or 0x377f0683 (be)");
  print_decode_line(aData, 4, 4, 0, "File format");
  print_decode_line(aData, 8, 4, 0, "Database page size");
  print_decode_line(aData, 12,4, 0, "Checkpoint sequence number");
  print_decode_line(aData, 16,4, 1, "Salt-1");
  print_decode_line(aData, 20,4, 1, "Salt-2");
  print_decode_line(aData, 24,4, 1, "Checksum-1");
  print_decode_line(aData, 28,4, 1, "Checksum-2");
  if( pCksum ){
    if( pCksum->s0!=getInt32(aData+24) ){
      printf("**** cksum-1 mismatch: 0x%08x\n", pCksum->s0);
    }
    if( pCksum->s1!=getInt32(aData+28) ){
      printf("**** cksum-2 mismatch: 0x%08x\n", pCksum->s1);
    }
  }
  free(aData);
}
/*
** Describe cell content.
*/
static i64 describeContent(
  unsigned char *a,       /* Cell content */
  i64 nLocal,             /* Bytes in a[] */
  char *zDesc             /* Write description here */
){
  int nDesc = 0;
  int n, j;
  i64 i, x, v;
  const unsigned char *pData;
  const unsigned char *pLimit;
  char sep = ' ';

  pLimit = &a[nLocal];
  n = decodeVarint(a, &x);
  pData = &a[x];
  a += n;
  i = x - n;
  while( i>0 && pData<=pLimit ){
    n = decodeVarint(a, &x);
    a += n;
    i -= n;
    nLocal -= n;
    zDesc[0] = sep;
    sep = ',';
    nDesc++;
    zDesc++;
    if( x==0 ){
      sprintf(zDesc, "*");     /* NULL is a "*" */
    }else if( x>=1 && x<=6 ){
      v = (signed char)pData[0];
      pData++;
      switch( x ){
        case 6:  v = (v<<16) + (pData[0]<<8) + pData[1];  pData += 2;
        case 5:  v = (v<<16) + (pData[0]<<8) + pData[1];  pData += 2;
        case 4:  v = (v<<8) + pData[0];  pData++;
        case 3:  v = (v<<8) + pData[0];  pData++;
        case 2:  v = (v<<8) + pData[0];  pData++;
      }
      sprintf(zDesc, "%lld", v);
    }else if( x==7 ){
      sprintf(zDesc, "real");
      pData += 8;
    }else if( x==8 ){
      sprintf(zDesc, "0");
    }else if( x==9 ){
      sprintf(zDesc, "1");
    }else if( x>=12 ){
      i64 size = (x-12)/2;
      if( (x&1)==0 ){
        sprintf(zDesc, "blob(%lld)", size);
      }else{
        sprintf(zDesc, "txt(%lld)", size);
      }
      pData += size;
    }
    j = (int)strlen(zDesc);
    zDesc += j;
    nDesc += j;
  }
  return nDesc;
}

/*
** Compute the local payload size given the total payload size and
** the page size.
*/
static i64 localPayload(i64 nPayload, char cType){
  i64 maxLocal;
  i64 minLocal;
  i64 surplus;
  i64 nLocal;
  if( cType==13 ){
    /* Table leaf */
    maxLocal = pagesize-35;
    minLocal = (pagesize-12)*32/255-23;
  }else{
    maxLocal = (pagesize-12)*64/255-23;
    minLocal = (pagesize-12)*32/255-23;
  }
  if( nPayload>maxLocal ){
    surplus = minLocal + (nPayload-minLocal)%(pagesize-4);
    if( surplus<=maxLocal ){
      nLocal = surplus;
    }else{
      nLocal = minLocal;
    }
  }else{
    nLocal = nPayload;
  }
  return nLocal;
}

/*
** Create a description for a single cell.
**
** The return value is the local cell size.
*/
static i64 describeCell(
  unsigned char cType,    /* Page type */
  unsigned char *a,       /* Cell content */
  int showCellContent,    /* Show cell content if true */
  char **pzDesc           /* Store description here */
){
  int i;
  i64 nDesc = 0;
  int n = 0;
  int leftChild;
  i64 nPayload;
  i64 rowid;
  i64 nLocal;
  static char zDesc[1000];
  i = 0;
  if( cType<=5 ){
    leftChild = ((a[0]*256 + a[1])*256 + a[2])*256 + a[3];
    a += 4;
    n += 4;
    sprintf(zDesc, "lx: %d ", leftChild);
    nDesc = strlen(zDesc);
  }
  if( cType!=5 ){
    i = decodeVarint(a, &nPayload);
    a += i;
    n += i;
    sprintf(&zDesc[nDesc], "n: %lld ", nPayload);
    nDesc += strlen(&zDesc[nDesc]);
    nLocal = localPayload(nPayload, cType);
  }else{
    nPayload = nLocal = 0;
  }
  if( cType==5 || cType==13 ){
    i = decodeVarint(a, &rowid);
    a += i;
    n += i;
    sprintf(&zDesc[nDesc], "r: %lld ", rowid);
    nDesc += strlen(&zDesc[nDesc]);
  }
  if( nLocal<nPayload ){
    int ovfl;
    unsigned char *b = &a[nLocal];
    ovfl = ((b[0]*256 + b[1])*256 + b[2])*256 + b[3];
    sprintf(&zDesc[nDesc], "ov: %d ", ovfl);
    nDesc += strlen(&zDesc[nDesc]);
    n += 4;
  }
  if( showCellContent && cType!=5 ){
    nDesc += describeContent(a, nLocal, &zDesc[nDesc-1]);
  }
  *pzDesc = zDesc;
  return nLocal+n;
}

/*
** Decode a btree page
*/
static void decode_btree_page(
  unsigned char *a,   /* Content of the btree page to be decoded */
  int pgno,           /* Page number */
  int hdrSize,        /* Size of the page1-header in bytes */
  const char *zArgs   /* Flags to control formatting */
){
  const char *zType = "unknown";
  int nCell;
  int i, j;
  int iCellPtr;
  int showCellContent = 0;
  int showMap = 0;
  char *zMap = 0;
  switch( a[0] ){
    case 2:  zType = "index interior node";  break;
    case 5:  zType = "table interior node";  break;
    case 10: zType = "index leaf";           break;
    case 13: zType = "table leaf";           break;
  }
  while( zArgs[0] ){
    switch( zArgs[0] ){
      case 'c': showCellContent = 1;  break;
      case 'm': showMap = 1;          break;
    }
    zArgs++;
  }
  printf("Decode of btree page %d:\n", pgno);
  print_decode_line(a, 0, 1, 0, zType);
  print_decode_line(a, 1, 2, 0, "Offset to first freeblock");
  print_decode_line(a, 3, 2, 0, "Number of cells on this page");
  nCell = a[3]*256 + a[4];
  print_decode_line(a, 5, 2, 0, "Offset to cell content area");
  print_decode_line(a, 7, 1, 0, "Fragmented byte count");
  if( a[0]==2 || a[0]==5 ){
    print_decode_line(a, 8, 4, 0, "Right child");
    iCellPtr = 12;
  }else{
    iCellPtr = 8;
  }
  if( nCell>0 ){
    printf(" key: lx=left-child n=payload-size r=rowid\n");
  }
  if( showMap ){
    zMap = malloc(pagesize);
    memset(zMap, '.', pagesize);
    memset(zMap, '1', hdrSize);
    memset(&zMap[hdrSize], 'H', iCellPtr);
    memset(&zMap[hdrSize+iCellPtr], 'P', 2*nCell);
  }
  for(i=0; i<nCell; i++){
    int cofst = iCellPtr + i*2;
    char *zDesc;
    i64 n;

    cofst = a[cofst]*256 + a[cofst+1];
    n = describeCell(a[0], &a[cofst-hdrSize], showCellContent, &zDesc);
    if( showMap ){
      char zBuf[30];
      memset(&zMap[cofst], '*', (size_t)n);
      zMap[cofst] = '[';
      zMap[cofst+n-1] = ']';
      sprintf(zBuf, "%d", i);
      j = (int)strlen(zBuf);
      if( j<=n-2 ) memcpy(&zMap[cofst+1], zBuf, j);
    }
    printf(" %03x: cell[%d] %s\n", cofst, i, zDesc);
  }
  if( showMap ){
    for(i=0; i<pagesize; i+=64){
      printf(" %03x: %.64s\n", i, &zMap[i]);
    }
    free(zMap);
  }  
}

int main(int argc, char **argv){
  struct stat sbuf;
  unsigned char zPgSz[4];
  if( argc<2 ){
    fprintf(stderr,"Usage: %s FILENAME ?PAGE? ...\n", argv[0]);
    exit(1);
  }
  fd = open(argv[1], O_RDONLY);
  if( fd<0 ){
    fprintf(stderr,"%s: can't open %s\n", argv[0], argv[1]);
    exit(1);
  }
  zPgSz[0] = 0;
  zPgSz[1] = 0;
  lseek(fd, 8, SEEK_SET);
  read(fd, zPgSz, 4);
  pagesize = zPgSz[1]*65536 + zPgSz[2]*256 + zPgSz[3];
  if( pagesize==0 ) pagesize = 1024;
  printf("Pagesize: %d\n", pagesize);
  fstat(fd, &sbuf);
  if( sbuf.st_size<32 ){
    printf("file too small to be a WAL\n");
    return 0;
  }
  mxFrame = (sbuf.st_size - 32)/(pagesize + 24);
  printf("Available pages: 1..%d\n", mxFrame);
  if( argc==2 ){
    int i;
    Cksum x;
    print_wal_header(&x);
    for(i=1; i<=mxFrame; i++){
      print_oneline_frame(i, &x);
    }
  }else{
    int i;
    for(i=2; i<argc; i++){
      int iStart, iEnd;
      char *zLeft;
      if( strcmp(argv[i], "header")==0 ){
        print_wal_header(0);
        continue;
      }
      if( !ISDIGIT(argv[i][0]) ){
        fprintf(stderr, "%s: unknown option: [%s]\n", argv[0], argv[i]);
        continue;
      }
      iStart = strtol(argv[i], &zLeft, 0);
      if( zLeft && strcmp(zLeft,"..end")==0 ){
        iEnd = mxFrame;
      }else if( zLeft && zLeft[0]=='.' && zLeft[1]=='.' ){
        iEnd = strtol(&zLeft[2], 0, 0);
      }else if( zLeft && zLeft[0]=='b' ){
        int ofst, nByte, hdrSize;
        unsigned char *a;
        if( iStart==1 ){
          hdrSize = 100;
          ofst = hdrSize = 100;
          nByte = pagesize-100;
        }else{
          hdrSize = 0;
          ofst = (iStart-1)*pagesize;
          nByte = pagesize;
        }
        ofst = 32 + hdrSize + (iStart-1)*(pagesize+24) + 24;
        a = getContent(ofst, nByte);
        decode_btree_page(a, iStart, hdrSize, zLeft+1);
        free(a);
        continue;
#if !defined(_MSC_VER)
      }else if( zLeft && strcmp(zLeft,"truncate")==0 ){
        /* Frame number followed by "truncate" truncates the WAL file
        ** after that frame */
        off_t newSize = 32 + iStart*(pagesize+24);
        truncate(argv[1], newSize);
        continue;
#endif
      }else{
        iEnd = iStart;
      }
      if( iStart<1 || iEnd<iStart || iEnd>mxFrame ){
        fprintf(stderr,
          "Page argument should be LOWER?..UPPER?.  Range 1 to %d\n",
          mxFrame);
        exit(1);
      }
      while( iStart<=iEnd ){
        print_frame(iStart);
        iStart++;
      }
    }
  }
  close(fd);
  return 0;
}
