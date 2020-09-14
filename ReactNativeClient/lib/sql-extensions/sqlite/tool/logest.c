/*
** 2013-06-10
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** This file contains a simple command-line utility for converting from
** integers and LogEst values and back again and for doing simple
** arithmetic operations (multiple and add) on LogEst values.
**
** Usage:
**
**      ./LogEst ARGS
**
** See the showHelp() routine for a description of valid arguments.
** Examples:
**
** To convert 123 from LogEst to integer:
** 
**         ./LogEst ^123
**
** To convert 123456 from integer to LogEst:
**
**         ./LogEst 123456
**
*/
#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <assert.h>
#include <string.h>
#include "sqlite3.h"

typedef short int LogEst;  /* 10 times log2() */

LogEst logEstMultiply(LogEst a, LogEst b){ return a+b; }
LogEst logEstAdd(LogEst a, LogEst b){
  static const unsigned char x[] = {
     10, 10,                         /* 0,1 */
      9, 9,                          /* 2,3 */
      8, 8,                          /* 4,5 */
      7, 7, 7,                       /* 6,7,8 */
      6, 6, 6,                       /* 9,10,11 */
      5, 5, 5,                       /* 12-14 */
      4, 4, 4, 4,                    /* 15-18 */
      3, 3, 3, 3, 3, 3,              /* 19-24 */
      2, 2, 2, 2, 2, 2, 2,           /* 25-31 */
  };
  if( a<b ){ LogEst t = a; a = b; b = t; }
  if( a>b+49 ) return a;
  if( a>b+31 ) return a+1;
  return a+x[a-b];
}
LogEst logEstFromInteger(sqlite3_uint64 x){
  static LogEst a[] = { 0, 2, 3, 5, 6, 7, 8, 9 };
  LogEst y = 40;
  if( x<8 ){
    if( x<2 ) return 0;
    while( x<8 ){  y -= 10; x <<= 1; }
  }else{
    while( x>255 ){ y += 40; x >>= 4; }
    while( x>15 ){  y += 10; x >>= 1; }
  }
  return a[x&7] + y - 10;
}
static sqlite3_uint64 logEstToInt(LogEst x){
  sqlite3_uint64 n;
  if( x<10 ) return 1;
  n = x%10;
  x /= 10;
  if( n>=5 ) n -= 2;
  else if( n>=1 ) n -= 1;
  if( x>=3 ) return (n+8)<<(x-3);
  return (n+8)>>(3-x);
}
static LogEst logEstFromDouble(double x){
  sqlite3_uint64 a;
  LogEst e;
  assert( sizeof(x)==8 && sizeof(a)==8 );
  if( x<=0.0 ) return -32768;
  if( x<0.01 ) return -logEstFromDouble(1.0/x);
  if( x<1.0 ) return logEstFromDouble(100.0*x) - 66;
  if( x<1024.0 ) return logEstFromInteger((sqlite3_uint64)(1024.0*x)) - 100;
  if( x<=2000000000.0 ) return logEstFromInteger((sqlite3_uint64)x);
  memcpy(&a, &x, 8);
  e = (a>>52) - 1022;
  return e*10;
}

int isInteger(const char *z){
  while( z[0]>='0' && z[0]<='9' ) z++;
  return z[0]==0;
}

int isFloat(const char *z){
  char c;
  while( ((c=z[0])>='0' && c<='9') || c=='.' || c=='E' || c=='e'
          || c=='+' || c=='-'  ) z++;
  return z[0]==0;
}

static void showHelp(const char *zArgv0){
  printf("Usage: %s ARGS...\n", zArgv0);
  printf("Arguments:\n"
    "  NUM    Convert NUM from integer to LogEst and push onto the stack\n"
    " ^NUM    Interpret NUM as a LogEst and push onto stack\n"
    "  x      Multiple the top two elements of the stack\n"
    "  +      Add the top two elements of the stack\n"
    "  dup    Dupliate the top element on the stack\n"
    "  inv    Take the reciprocal of the top of stack.  N = 1/N.\n"
    "  log    Find the LogEst of the number on top of stack\n"
    "  nlogn  Compute NlogN where N is the top of stack\n"
  );
  exit(1);
}

int main(int argc, char **argv){
  int i;
  int n = 0;
  LogEst a[100];
  for(i=1; i<argc; i++){
    const char *z = argv[i];
    if( strcmp(z,"+")==0 ){
      if( n>=2 ){
        a[n-2] = logEstAdd(a[n-2],a[n-1]);
        n--;
      }
    }else if( strcmp(z,"x")==0 ){
      if( n>=2 ){
        a[n-2] = logEstMultiply(a[n-2],a[n-1]);
        n--;
      }
    }else if( strcmp(z,"dup")==0 ){
      if( n>0 ){
        a[n] = a[n-1];
        n++;
      }
    }else if( strcmp(z,"log")==0 ){
      if( n>0 ) a[n-1] = logEstFromInteger(a[n-1]) - 33;
    }else if( strcmp(z,"nlogn")==0 ){
      if( n>0 ) a[n-1] += logEstFromInteger(a[n-1]) - 33;
    }else if( strcmp(z,"inv")==0 ){
      if( n>0 ) a[n-1] = -a[n-1];
    }else if( z[0]=='^' ){
      a[n++] = (LogEst)atoi(z+1);
    }else if( isInteger(z) ){
      a[n++] = logEstFromInteger(atoi(z));
    }else if( isFloat(z) && z[0]!='-' ){
      a[n++] = logEstFromDouble(atof(z));
    }else{
      showHelp(argv[0]);
    }
  }
  for(i=n-1; i>=0; i--){
    if( a[i]<-40 ){
      printf("%5d (%f)\n", a[i], 1.0/(double)logEstToInt(-a[i]));
    }else if( a[i]<10 ){
      printf("%5d (%f)\n", a[i], logEstToInt(a[i]+100)/1024.0);
    }else{
      sqlite3_uint64 x = logEstToInt(a[i]+100)*100/1024;
      printf("%5d (%lld.%02lld)\n", a[i], x/100, x%100);
    }
  }
  return 0;
}
