#!/bin/sh
#
# Run this script in a directory that contains a valid SQLite makefile in
# order to verify that unintentionally exported symbols.
#
make sqlite3.c

echo '****** Exported symbols from a build including RTREE && FTS4 ******'
gcc -c -DSQLITE_ENABLE_FTS3 -DSQLITE_ENABLE_RTREE \
  -DSQLITE_ENABLE_MEMORY_MANAGEMENT -DSQLITE_ENABLE_STAT3 \
  -DSQLITE_ENABLE_MEMSYS5 -DSQLITE_ENABLE_UNLOCK_NOTIFY \
  -DSQLITE_ENABLE_COLUMN_METADATA -DSQLITE_ENABLE_ATOMIC_WRITE \
  sqlite3.c
nm sqlite3.o | grep " [TD] "

echo '****** Surplus symbols from a build including RTREE & FTS4 ******'
nm sqlite3.o | grep " [TD] " | grep -v " .*sqlite3_"

echo '****** Dependencies of the core. No extensions. No OS interface *******'
gcc -c -DSQLITE_ENABLE_MEMORY_MANAGEMENT -DSQLITE_ENABLE_STAT3 \
  -DSQLITE_ENABLE_MEMSYS5 -DSQLITE_ENABLE_UNLOCK_NOTIFY \
  -DSQLITE_ENABLE_COLUMN_METADATA -DSQLITE_ENABLE_ATOMIC_WRITE \
  -DSQLITE_OS_OTHER -DSQLITE_THREADSAFE=0 \
  sqlite3.c
nm sqlite3.o | grep " U "

echo '****** Dependencies including RTREE & FTS4 *******'
gcc -c -DSQLITE_ENABLE_FTS3 -DSQLITE_ENABLE_RTREE \
  -DSQLITE_ENABLE_MEMORY_MANAGEMENT -DSQLITE_ENABLE_STAT3 \
  -DSQLITE_ENABLE_MEMSYS5 -DSQLITE_ENABLE_UNLOCK_NOTIFY \
  -DSQLITE_ENABLE_COLUMN_METADATA -DSQLITE_ENABLE_ATOMIC_WRITE \
  sqlite3.c
nm sqlite3.o | grep " U "
