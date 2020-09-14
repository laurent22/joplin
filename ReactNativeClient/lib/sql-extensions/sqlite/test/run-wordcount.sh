#!/bin/sh
#
# This script runs the wordcount program in different ways, comparing
# the output from each.
#

# Select the source text to be analyzed.
#
if test "x$1" = "x";
then echo "Usage: $0 FILENAME [ARGS...]"; exit 1;
fi

# Do test runs
#
rm -f wcdb1.db
./wordcount --timer --summary wcdb1.db $* --insert >wc-out.txt
mv wc-out.txt wc-baseline.txt
rm -f wcdb2.db
./wordcount --timer --summary wcdb2.db $* --insert --without-rowid >wc-out.txt
  if cmp -s wc-out.txt wc-baseline.txt;
  then echo hi >/dev/null;
  else echo ERROR:;
       diff -u wc-baseline.txt wc-out.txt;
  fi

rm -f wcdb1.db
./wordcount --timer --summary wcdb1.db $* --replace >wc-out.txt
  if cmp -s wc-out.txt wc-baseline.txt;
  then echo hi >/dev/null;
  else echo ERROR:;
       diff -u wc-baseline.txt wc-out.txt;
  fi
rm -f wcdb2.db
./wordcount --timer --summary wcdb2.db $* --replace --without-rowid >wc-out.txt
  if cmp -s wc-out.txt wc-baseline.txt;
  then echo hi >/dev/null;
  else echo ERROR:;
       diff -u wc-baseline.txt wc-out.txt;
  fi

rm -f wcdb1.db
./wordcount --timer --summary wcdb1.db $* --select >wc-out.txt
  if cmp -s wc-out.txt wc-baseline.txt;
  then echo hi >/dev/null;
  else echo ERROR:;
       diff -u wc-baseline.txt wc-out.txt;
  fi

rm -f wcdb2.db
./wordcount --timer --summary wcdb2.db $* --select --without-rowid >wc-out.txt
  if cmp -s wc-out.txt wc-baseline.txt;
  then echo hi >/dev/null;
  else echo ERROR:;
       diff -u wc-baseline.txt wc-out.txt;
  fi

./wordcount --timer --summary wcdb1.db $* --query >wc-out.txt
mv wc-out.txt wc-baseline.txt
./wordcount --timer --summary wcdb2.db $* --query --without-rowid >wc-out.txt
  if cmp -s wc-out.txt wc-baseline.txt;
  then echo hi >/dev/null;
  else echo ERROR:;
       diff -u wc-baseline.txt wc-out.txt;
  fi

./wordcount --timer --summary wcdb1.db $* --delete >wc-out.txt
mv wc-out.txt wc-baseline.txt
./wordcount --timer --summary wcdb2.db $* --delete --without-rowid >wc-out.txt
  if cmp -s wc-out.txt wc-baseline.txt;
  then echo hi >/dev/null;
  else echo ERROR:;
       diff -u wc-baseline.txt wc-out.txt;
  fi


# Clean up temporary files created.
#
rm -rf wcdb1.db wcdb2.db wc-out.txt wc-baseline.txt
