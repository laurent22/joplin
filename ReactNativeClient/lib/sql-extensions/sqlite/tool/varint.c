/*
** A utility program to translate SQLite varints into decimal and decimal
** integers into varints.
*/
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#if defined(_MSC_VER) || defined(__BORLANDC__)
  typedef __int64 i64;
  typedef unsigned __int64 u64;
#else
  typedef long long int i64;
  typedef unsigned long long int u64;
#endif

static int hexValue(char c){
  if( c>='0' && c<='9' ) return c - '0';
  if( c>='a' && c<='f' ) return c - 'a' + 10;
  if( c>='A' && c<='F' ) return c - 'A' + 10;
  return -1;
}

static char toHex(unsigned char c){
  return "0123456789abcdef"[c&0xf];
}

static int putVarint(unsigned char *p, u64 v){
  int i, j, n;
  unsigned char buf[10];
  if( v & (((u64)0xff000000)<<32) ){
    p[8] = (unsigned char)v;
    v >>= 8;
    for(i=7; i>=0; i--){
      p[i] = (unsigned char)((v & 0x7f) | 0x80);
      v >>= 7;
    }
    return 9;
  }    
  n = 0;
  do{
    buf[n++] = (unsigned char)((v & 0x7f) | 0x80);
    v >>= 7;
  }while( v!=0 );
  buf[0] &= 0x7f;
  for(i=0, j=n-1; j>=0; j--, i++){
    p[i] = buf[j];
  }
  return n;
}


int main(int argc, char **argv){
  int i;
  u64 x;
  u64 uX = 0;
  i64 iX;
  int n;
  unsigned char zHex[20];

  if( argc==1 ){
    fprintf(stderr, 
         "Usage:\n"
         "  %s HH HH HH ...   Convert varint to decimal\n"
         "  %s DDDDD          Convert decimal to varint\n"
         "                    Add '+' or '-' before DDDDD to disambiguate.\n",
         argv[0], argv[0]);
    exit(1);
  }
  if( argc>2 
   || (strlen(argv[1])==2 && hexValue(argv[1][0])>=0 && hexValue(argv[1][1])>=0)
  ){
    /* Hex to decimal */
    for(i=1; i<argc && i<9; i++){
      if( strlen(argv[i])!=2 ){
        fprintf(stderr, "Not a hex byte: %s\n", argv[i]);
        exit(1);
      }
      x = (hexValue(argv[i][0])<<4) + hexValue(argv[i][1]);
      uX = (uX<<7) + (x&0x7f);
      if( (x&0x80)==0 ) break;
    }
    if( i==9 && i<argc ){
      if( strlen(argv[i])!=2 ){
        fprintf(stderr, "Not a hex byte: %s\n", argv[i]);
        exit(1);
      }
      x = (hexValue(argv[i][0])<<4) + hexValue(argv[i][1]);
      uX = (uX<<8) + x;
    }
    i++;
    if( i<argc ){
      fprintf(stderr, "Extra arguments: %s...\n", argv[i]);
      exit(1);
    }
  }else{
    char *z = argv[1];
    int sign = 1;
    if( z[0]=='+' ) z++;
    else if( z[0]=='-' ){ z++; sign = -1; }
    uX = 0;
    while( z[0] ){
      if( z[0]<'0' || z[0]>'9' ){
        fprintf(stderr, "Not a decimal number: %s", argv[1]);
        exit(1);
      }
      uX = uX*10 + z[0] - '0';
      z++;
    }
    if( sign<0 ){
      memcpy(&iX, &uX, 8);
      iX = -iX;
      memcpy(&uX, &iX, 8);
    }
  }
  n = putVarint(zHex, uX);
  printf("%lld =", (i64)uX);
  for(i=0; i<n; i++){
    printf(" %c%c", toHex(zHex[i]>>4), toHex(zHex[i]&0x0f));
  }
  printf("\n");
  return 0;
}
