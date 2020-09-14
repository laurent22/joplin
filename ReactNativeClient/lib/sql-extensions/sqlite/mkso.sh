#!/bin/sh
#
# This script is used to compile SQLite into a shared library on Linux.
#
# Two separate shared libraries are generated.  "sqlite3.so" is the core
# library.  "tclsqlite3.so" contains the TCL bindings and is the
# library that is loaded into TCL in order to run SQLite.
#
make target_source
cd tsrc
rm shell.c
TCLDIR=/home/drh/tcltk/846/linux/846linux
TCLSTUBLIB=$TCLDIR/libtclstub8.4g.a
OPTS='-DUSE_TCL_STUBS=1 -DNDEBUG=1 -DHAVE_DLOPEN=1'
OPTS="$OPTS -DSQLITE_THREADSAFE=1"
OPTS="$OPTS -DSQLITE_ENABLE_FTS3=1"
OPTS="$OPTS -DSQLITE_ENABLE_COLUMN_METADATA=1"
for i in *.c; do
  if test $i != 'keywordhash.c'; then
    CMD="cc -fPIC $OPTS -O2 -I. -I$TCLDIR -c $i"
    echo $CMD
    $CMD
  fi
done
echo gcc -shared *.o $TCLSTUBLIB -o tclsqlite3.so
gcc -shared *.o $TCLSTUBLIB -o tclsqlite3.so
strip tclsqlite3.so
rm tclsqlite.c tclsqlite.o
echo gcc -shared *.o -o sqlite3.so
gcc -shared *.o -o sqlite3.so
strip sqlite3.so
cd ..
