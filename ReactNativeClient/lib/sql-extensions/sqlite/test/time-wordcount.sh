#!/bin/sh
#
# This script runs the wordcount program in different ways and generates
# an output useful for performance comparisons.
#

# Select the source text to be analyzed.
#
if test "x$1" = "x";
then echo "Usage: $0 FILENAME [ARGS...]"; exit 1;
fi

# Do test runs
#
rm -f wcdb1.db
./wordcount --tag A: --timer --summary wcdb1.db $* --insert
rm -f wcdb2.db
./wordcount --tag B: --timer --summary wcdb2.db $* --insert --without-rowid
rm -f wcdb1.db
./wordcount --tag C: --timer --summary wcdb1.db $* --replace
rm -f wcdb2.db
./wordcount --tag D: --timer --summary wcdb2.db $* --replace --without-rowid
rm -f wcdb1.db
./wordcount --tag E: --timer --summary wcdb1.db $* --select
rm -f wcdb2.db
./wordcount --tag F: --timer --summary wcdb2.db $* --select --without-rowid
./wordcount --tag G: --timer --summary wcdb1.db $* --query
./wordcount --tag H: --timer --summary wcdb1.db $* --query --without-rowid
./wordcount --tag I: --timer --summary wcdb1.db $* --delete
./wordcount --tag J: --timer --summary wcdb2.db $* --delete --without-rowid

# Clean up temporary files created.
#
rm -f wcdb1.db wcdb2.db
