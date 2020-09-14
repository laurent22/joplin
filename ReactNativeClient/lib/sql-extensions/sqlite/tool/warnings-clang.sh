#/bin/sh
#
# Run this script in a directory with a working makefile to check for 
# compiler warnings in SQLite.
#
rm -f sqlite3.c shell.c
make sqlite3.c shell.c
echo '************* FTS4 and RTREE ****************'
scan-build gcc -c -DHAVE_STDINT_H -DSQLITE_ENABLE_FTS4 -DSQLITE_ENABLE_RTREE \
      -DSQLITE_DEBUG -DSQLITE_ENABLE_STAT3 sqlite3.c 2>&1 | grep -v 'ANALYZE:'
echo '********** ENABLE_STAT3. THREADSAFE=0 *******'
scan-build gcc -c -I. -DSQLITE_ENABLE_STAT3 -DSQLITE_THREADSAFE=0 \
      -DSQLITE_DEBUG \
      sqlite3.c shell.c -ldl 2>&1 | grep -v 'ANALYZE:'
