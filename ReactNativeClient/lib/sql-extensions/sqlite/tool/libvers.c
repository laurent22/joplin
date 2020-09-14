/*
** Compile this program against an SQLite library of unknown version
** and then run this program, and it will print out the SQLite version
** information.
*/
#include <stdio.h>

extern const char *sqlite3_libversion(void);
extern const char *sqlite3_sourceid(void);

int main(int argc, char **argv){
  printf("SQLite version %s\n", sqlite3_libversion());
  printf("SQLite source  %s\n", sqlite3_sourceid());
  return 0;
}
