/*
** This program checks for formatting problems in source code:
**
**    *  Any use of tab characters
**    *  White space at the end of a line
**    *  Blank lines at the end of a file
**
** Any violations are reported.
*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CR_OK      0x001
#define WSEOL_OK   0x002

static void checkSpacing(const char *zFile, unsigned flags){
  FILE *in = fopen(zFile, "rb");
  int i;
  int seenSpace;
  int seenTab;
  int ln = 0;
  int lastNonspace = 0;
  char zLine[2000];
  if( in==0 ){
    printf("cannot open %s\n", zFile);
    return;
  }
  while( fgets(zLine, sizeof(zLine), in) ){
    seenSpace = 0;
    seenTab = 0;
    ln++;
    for(i=0; zLine[i]; i++){
      if( zLine[i]=='\t' && seenTab==0 ){
        printf("%s:%d: tab (\\t) character\n", zFile, ln);
        seenTab = 1;
      }else if( zLine[i]=='\r' ){
        if( (flags & CR_OK)==0 ){
          printf("%s:%d: carriage-return (\\r) character\n", zFile, ln);
        }
      }else if( zLine[i]==' ' ){
        seenSpace = 1;
      }else if( zLine[i]!='\n' ){
        lastNonspace = ln;
        seenSpace = 0;
      }
    }
    if( seenSpace && (flags & WSEOL_OK)==0 ){
      printf("%s:%d: whitespace at end-of-line\n", zFile, ln);
    }
  }
  fclose(in);
  if( lastNonspace<ln ){
    printf("%s:%d: blank lines at end of file (%d)\n",
        zFile, ln, ln - lastNonspace);
  }
}

int main(int argc, char **argv){
  int i;
  unsigned flags = WSEOL_OK;
  for(i=1; i<argc; i++){
    const char *z = argv[i];
    if( z[0]=='-' ){
      while( z[0]=='-' ) z++;
      if( strcmp(z,"crok")==0 ){
        flags |= CR_OK;
      }else if( strcmp(z, "wseol")==0 ){
        flags &= ~WSEOL_OK;
      }else if( strcmp(z, "help")==0 ){
        printf("Usage: %s [options] FILE ...\n", argv[0]);
        printf("  --crok      Do not report on carriage-returns\n");
        printf("  --wseol     Complain about whitespace at end-of-line\n");
        printf("  --help      This message\n");
      }else{
        printf("unknown command-line option: [%s]\n", argv[i]);
        printf("use --help for additional information\n");
      }
    }else{
      checkSpacing(argv[i], flags);
    }
  }
  return 0;
}
