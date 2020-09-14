/*
** The program does some simple static analysis of the sqlite3.c source
** file looking for mistakes.
**
** Usage:
**
**      ./srcck1 sqlite3.c
**
** This program looks for instances of assert(), ALWAYS(), NEVER() or
** testcase() that contain side-effects and reports errors if any such
** instances are found.
**
** The aim of this utility is to prevent recurrences of errors such
** as the one fixed at:
**
**   https://www.sqlite.org/src/info/a2952231ac7abe16
**
** Note that another similar error was found by this utility when it was
** first written.  That other error was fixed by the same check-in that
** committed the first version of this utility program.
*/
#include <stdlib.h>
#include <ctype.h>
#include <stdio.h>
#include <string.h>

/* Read the complete text of a file into memory.  Return a pointer to
** the result.  Panic if unable to read the file or allocate memory.
*/
static char *readFile(const char *zFilename){
  FILE *in;
  char *z;
  long n;
  size_t got;

  in = fopen(zFilename, "rb");
  if( in==0 ){
    fprintf(stderr, "unable to open '%s' for reading\n", zFilename);
    exit(1);
  }
  fseek(in, 0, SEEK_END);
  n = ftell(in);
  rewind(in);
  z = malloc( n+1 );
  if( z==0 ){
    fprintf(stderr, "cannot allocate %d bytes to store '%s'\n", 
            (int)(n+1), zFilename);
    exit(1);
  }
  got = fread(z, 1, n, in);
  fclose(in);
  if( got!=(size_t)n ){
    fprintf(stderr, "only read %d of %d bytes from '%s'\n",
           (int)got, (int)n, zFilename);
    exit(1);
  }
  z[n] = 0;
  return z;
}

/* Check the C code in the argument to see if it might have
** side effects.  The only accurate way to know this is to do a full
** parse of the C code, which this routine does not do.  This routine
** uses a simple heuristic of looking for:
**
**    *  '=' not immediately after '>', '<', '!', or '='.
**    *  '++'
**    *  '--'
**
** If the code contains the phrase "side-effects-ok" is inside a 
** comment, then always return false.  This is used to disable checking
** for assert()s with deliberate side-effects, such as used by
** SQLITE_TESTCTRL_ASSERT - a facility that allows applications to
** determine at runtime whether or not assert()s are enabled.  
** Obviously, that determination cannot be made unless the assert()
** has some side-effect.
**
** Return true if a side effect is seen.  Return false if not.
*/
static int hasSideEffect(const char *z, unsigned int n){
  unsigned int i;
  for(i=0; i<n; i++){
    if( z[i]=='/' && strncmp(&z[i], "/*side-effects-ok*/", 19)==0 ) return 0;
    if( z[i]=='=' && i>0 && z[i-1]!='=' && z[i-1]!='>'
           && z[i-1]!='<' && z[i-1]!='!' && z[i+1]!='=' ) return 1;
    if( z[i]=='+' && z[i+1]=='+' ) return 1;
    if( z[i]=='-' && z[i+1]=='-' ) return 1;
  }
  return 0;
}

/* Return the number of bytes in string z[] prior to the first unmatched ')'
** character.
*/
static unsigned int findCloseParen(const char *z){
  unsigned int nOpen = 0;
  unsigned i;
  for(i=0; z[i]; i++){
    if( z[i]=='(' ) nOpen++;
    if( z[i]==')' ){
      if( nOpen==0 ) break;
      nOpen--;
    }
  }
  return i;
}

/* Search for instances of assert(...), ALWAYS(...), NEVER(...), and/or
** testcase(...) where the argument contains side effects.
**
** Print error messages whenever a side effect is found.  Return the number
** of problems seen.
*/
static unsigned int findAllSideEffects(const char *z){
  unsigned int lineno = 1;   /* Line number */
  unsigned int i;
  unsigned int nErr = 0;
  char c, prevC = 0;
  for(i=0; (c = z[i])!=0; prevC=c, i++){
    if( c=='\n' ){ lineno++; continue; }
    if( isalpha(c) && !isalpha(prevC) ){
      if( strncmp(&z[i],"assert(",7)==0
       || strncmp(&z[i],"ALWAYS(",7)==0
       || strncmp(&z[i],"NEVER(",6)==0
       || strncmp(&z[i],"testcase(",9)==0
      ){
        unsigned int n;
        const char *z2 = &z[i+5];
        while( z2[0]!='(' ){ z2++; }
        z2++;
        n = findCloseParen(z2);
        if( hasSideEffect(z2, n) ){
          nErr++;
          fprintf(stderr, "side-effect line %u: %.*s\n", lineno,
                  (int)(&z2[n+1] - &z[i]), &z[i]);
        }
      }
    }
  }
  return nErr;
}

int main(int argc, char **argv){
  char *z;
  unsigned int nErr = 0;
  if( argc!=2 ){
    fprintf(stderr, "Usage: %s FILENAME\n", argv[0]);
    return 1;
  }
  z = readFile(argv[1]);
  nErr = findAllSideEffects(z);
  free(z);
  if( nErr ){
    fprintf(stderr, "Found %u undesirable side-effects\n", nErr);
    return 1;
  }
  return 0; 
}
