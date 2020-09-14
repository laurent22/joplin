#/bin/sh
#
# Run this script in a directory with a working makefile to check for 
# compiler warnings in SQLite.
#

if uname | grep -i openbsd ; then
  # Use these for testing on OpenBSD:
  WARNING_OPTS=-Wall
  WARNING_ANDROID_OPTS=-Wall
else
  # Use these for testing on Linux and Mac OSX:
  WARNING_OPTS="-Wshadow -Wall -Wextra -pedantic-errors -Wno-long-long"
  WARNING_ANDROID_OPTS="-Wshadow -Wall -Wextra"
fi

rm -f sqlite3.c
make sqlite3.c
echo '********** No optimizations.  Includes FTS4/5, GEOPOLY, JSON1 ***'
echo '**********    ' Options: $WARNING_OPTS
gcc -c $WARNING_OPTS -std=c89 \
      -ansi -DHAVE_STDINT_H -DSQLITE_ENABLE_FTS4 -DSQLITE_ENABLE_GEOPOLY \
      -DSQLITE_ENABLE_FTS5 -DSQLITE_ENABLE_JSON1 \
      sqlite3.c
if test x`uname` = 'xLinux'; then
echo '********** Android configuration ******************************'
echo '**********    ' Options: $WARNING_ANDROID_OPTS
gcc -c \
  -DHAVE_USLEEP=1 \
  -DSQLITE_HAVE_ISNAN \
  -DSQLITE_DEFAULT_JOURNAL_SIZE_LIMIT=1048576 \
  -DSQLITE_THREADSAFE=2 \
  -DSQLITE_TEMP_STORE=3 \
  -DSQLITE_POWERSAFE_OVERWRITE=1 \
  -DSQLITE_DEFAULT_FILE_FORMAT=4 \
  -DSQLITE_DEFAULT_AUTOVACUUM=1 \
  -DSQLITE_ENABLE_MEMORY_MANAGEMENT=1 \
  -DSQLITE_ENABLE_FTS3 \
  -DSQLITE_ENABLE_FTS3_BACKWARDS \
  -DSQLITE_ENABLE_FTS4 \
  -DSQLITE_OMIT_BUILTIN_TEST \
  -DSQLITE_OMIT_COMPILEOPTION_DIAGS \
  -DSQLITE_OMIT_LOAD_EXTENSION \
  -DSQLITE_DEFAULT_FILE_PERMISSIONS=0600 \
  -DSQLITE_ENABLE_ICU \
  -DUSE_PREAD64 \
  $WARNING_ANDROID_OPTS \
  -Os sqlite3.c shell.c
fi
echo '********** No optimizations. ENABLE_STAT4. THREADSAFE=0 *******'
echo '**********    ' Options: $WARNING_OPTS
gcc -c $WARNING_OPTS -std=c89 \
      -ansi -DSQLITE_ENABLE_STAT4 -DSQLITE_THREADSAFE=0 \
      sqlite3.c
echo '********** Optimized -O3.  Includes FTS4/5, GEOPOLY, JSON1 ******'
echo '**********    ' Options: $WARNING_OPTS
gcc -O3 -c $WARNING_OPTS -std=c89 \
      -ansi -DHAVE_STDINT_H -DSQLITE_ENABLE_FTS4 -DSQLITE_ENABLE_GEOPOLY \
      -DSQLITE_ENABLE_FTS5 -DSQLITE_ENABLE_JSON1 \
      sqlite3.c
