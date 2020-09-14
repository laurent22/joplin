#!/bin/sh
#
# Run this script in a directory that contains a valid SQLite makefile in
# order to verify that unintentionally exported symbols.
#
make sqlite3.c

echo '****** Exported symbols from a build including RTREE, FTS4 & FTS5 ******'
gcc -c -DSQLITE_ENABLE_FTS3 -DSQLITE_ENABLE_RTREE \
  -DSQLITE_ENABLE_MEMORY_MANAGEMENT -DSQLITE_ENABLE_STAT3 \
  -DSQLITE_ENABLE_MEMSYS5 -DSQLITE_ENABLE_UNLOCK_NOTIFY \
  -DSQLITE_ENABLE_COLUMN_METADATA -DSQLITE_ENABLE_ATOMIC_WRITE \
  -DSQLITE_ENABLE_PREUPDATE_HOOK -DSQLITE_ENABLE_SESSION \
  -DSQLITE_ENABLE_FTS5 -DSQLITE_ENABLE_GEOPOLY \
  sqlite3.c
nm sqlite3.o | grep ' [TD] ' | sort -k 3

echo '****** Surplus symbols from a build including RTREE, FTS4 & FTS5 ******'
nm sqlite3.o | grep ' [TD] ' |
   egrep -v ' .*sqlite3(session|rebaser|changeset|changegroup)?_'

echo '****** Dependencies of the core. No extensions. No OS interface *******'
gcc -c -DSQLITE_ENABLE_MEMORY_MANAGEMENT -DSQLITE_ENABLE_STAT3 \
  -DSQLITE_ENABLE_MEMSYS5 -DSQLITE_ENABLE_UNLOCK_NOTIFY \
  -DSQLITE_ENABLE_COLUMN_METADATA -DSQLITE_ENABLE_ATOMIC_WRITE \
  -DSQLITE_OS_OTHER -DSQLITE_THREADSAFE=0 \
  sqlite3.c
nm sqlite3.o | grep ' U ' | sort -k 3

echo '****** Dependencies including RTREE & FTS4 *******'
gcc -c -DSQLITE_ENABLE_FTS3 -DSQLITE_ENABLE_RTREE \
  -DSQLITE_ENABLE_MEMORY_MANAGEMENT -DSQLITE_ENABLE_STAT3 \
  -DSQLITE_ENABLE_MEMSYS5 -DSQLITE_ENABLE_UNLOCK_NOTIFY \
  -DSQLITE_ENABLE_COLUMN_METADATA -DSQLITE_ENABLE_ATOMIC_WRITE \
  sqlite3.c
nm sqlite3.o | grep ' U ' | sort -k 3
