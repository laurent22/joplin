#!/bin/sh
# This script is used to build the amalgamation autoconf package.
# It assumes the following:
#
#   1. The files "sqlite3.c", "sqlite3.h", "sqlite3ext.h", "shell.c",
#      and "sqlite3rc.h" are available in the current directory.
#
#   2. Variable $TOP is set to the full path of the root directory
#      of the SQLite source tree.
#
#   3. There is nothing of value in the ./mkpkg_tmp_dir directory.
#      This is important, as the script executes "rm -rf ./mkpkg_tmp_dir".
#


# Bail out of the script if any command returns a non-zero exit 
# status. Or if the script tries to use an unset variable. These
# may fail for old /bin/sh interpreters.
#
set -e
set -u

TMPSPACE=./mkpkg_tmp_dir
VERSION=`cat $TOP/VERSION`
HASH=`sed 's/^\(..........\).*/\1/' $TOP/manifest.uuid`
DATETIME=`grep '^D' $TOP/manifest | sed -e 's/[^0-9]//g' -e 's/\(............\).*/\1/'`

# If this script is given an argument of --snapshot, then generate a
# snapshot tarball named for the current checkout SHA1 hash, rather than
# the version number.
#
if test "$#" -ge 1 -a x$1 != x--snapshot
then
  # Set global variable $ARTIFACT to the "3xxyyzz" string incorporated 
  # into artifact filenames. And $VERSION2 to the "3.x.y[.z]" form.
  xx=`echo $VERSION|sed 's/3\.\([0-9]*\)\..*/\1/'`
  yy=`echo $VERSION|sed 's/3\.[^.]*\.\([0-9]*\).*/\1/'`
  zz=0
  set +e
    zz=`echo $VERSION|sed 's/3\.[^.]*\.[^.]*\.\([0-9]*\).*/\1/'|grep -v '\.'`
  set -e
  TARBALLNAME=`printf "sqlite-autoconf-3%.2d%.2d%.2d" $xx $yy $zz`
else
  TARBALLNAME=sqlite-snapshot-$DATETIME
fi

rm -rf $TMPSPACE
cp -R $TOP/autoconf       $TMPSPACE
cp sqlite3.c              $TMPSPACE
cp sqlite3.h              $TMPSPACE
cp sqlite3ext.h           $TMPSPACE
cp sqlite3rc.h            $TMPSPACE
cp $TOP/sqlite3.1         $TMPSPACE
cp $TOP/sqlite3.pc.in     $TMPSPACE
cp shell.c                $TMPSPACE
cp $TOP/src/sqlite3.rc    $TMPSPACE
cp $TOP/tool/Replace.cs   $TMPSPACE

cat $TMPSPACE/configure.ac |
sed "s/--SQLITE-VERSION--/$VERSION/" > $TMPSPACE/tmp
mv $TMPSPACE/tmp $TMPSPACE/configure.ac

cd $TMPSPACE
autoreconf -i
#libtoolize
#aclocal
#autoconf
#automake --add-missing

mkdir -p tea/generic
echo "#ifdef USE_SYSTEM_SQLITE"      > tea/generic/tclsqlite3.c 
echo "# include <sqlite3.h>"        >> tea/generic/tclsqlite3.c
echo "#else"                        >> tea/generic/tclsqlite3.c
echo "#include \"sqlite3.c\""       >> tea/generic/tclsqlite3.c
echo "#endif"                       >> tea/generic/tclsqlite3.c
cat  $TOP/src/tclsqlite.c           >> tea/generic/tclsqlite3.c

cat tea/configure.ac | 
  sed "s/AC_INIT(\[sqlite\], .*)/AC_INIT([sqlite], [$VERSION])/" > tmp
mv tmp tea/configure.ac

cd tea
autoconf
rm -rf autom4te.cache

cd ../
./configure && make dist
tar -xzf sqlite-$VERSION.tar.gz
mv sqlite-$VERSION $TARBALLNAME
tar -czf $TARBALLNAME.tar.gz $TARBALLNAME
mv $TARBALLNAME.tar.gz ..
cd ..
ls -l $TARBALLNAME.tar.gz
