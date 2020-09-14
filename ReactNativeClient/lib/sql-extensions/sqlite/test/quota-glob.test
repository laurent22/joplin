# 2011 December 1
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# Tests for the glob-style string compare operator embedded in the
# quota shim.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

catch { unset testnum }
catch { unset pattern }
catch { unset text }
catch { unset ans }

foreach {testnum pattern text ans} {
   1  abcdefg   abcdefg   1
   2  abcdefG   abcdefg   0
   3  abcdef    abcdefg   0
   4  abcdefgh  abcdefg   0
   5  abcdef?   abcdefg   1
   6  abcdef?   abcdef    0
   7  abcdef?   abcdefgh  0
   8  abcdefg   abcdef?   0
   9  abcdef?   abcdef?   1
  10  abc/def   abc/def   1
  11  abc//def  abc/def   0
  12  */abc/*   x/abc/y   1
  13  */abc/*   /abc/     1
  16  */abc/*   x///a/ab/abc   0
  17  */abc/*   x//a/ab/abc/   1
  16  */abc/*   x///a/ab/abc   0
  17  */abc/*   x//a/ab/abc/   1
  18  **/abc/** x//a/ab/abc/   1
  19  *?/abc/*? x//a/ab/abc/y  1
  20  ?*/abc/?* x//a/ab/abc/y  1
  21  {abc[cde]efg}   abcbefg  0
  22  {abc[cde]efg}   abccefg  1
  23  {abc[cde]efg}   abcdefg  1
  24  {abc[cde]efg}   abceefg  1
  25  {abc[cde]efg}   abcfefg  0
  26  {abc[^cde]efg}  abcbefg  1
  27  {abc[^cde]efg}  abccefg  0
  28  {abc[^cde]efg}  abcdefg  0
  29  {abc[^cde]efg}  abceefg  0
  30  {abc[^cde]efg}  abcfefg  1
  31  {abc[c-e]efg}   abcbefg  0
  32  {abc[c-e]efg}   abccefg  1
  33  {abc[c-e]efg}   abcdefg  1
  34  {abc[c-e]efg}   abceefg  1
  35  {abc[c-e]efg}   abcfefg  0
  36  {abc[^c-e]efg}  abcbefg  1
  37  {abc[^c-e]efg}  abccefg  0
  38  {abc[^c-e]efg}  abcdefg  0
  39  {abc[^c-e]efg}  abceefg  0
  40  {abc[^c-e]efg}  abcfefg  1
  41  {abc[c-e]efg}   abc-efg  0
  42  {abc[-ce]efg}   abc-efg  1
  43  {abc[ce-]efg}   abc-efg  1
  44  {abc[][*?]efg}  {abc]efg} 1
  45  {abc[][*?]efg}  {abc*efg} 1
  46  {abc[][*?]efg}  {abc?efg} 1
  47  {abc[][*?]efg}  {abc[efg} 1
  48  {abc[^][*?]efg} {abc]efg} 0
  49  {abc[^][*?]efg} {abc*efg} 0
  50  {abc[^][*?]efg} {abc?efg} 0
  51  {abc[^][*?]efg} {abc[efg} 0
  52  {abc[^][*?]efg} {abcdefg} 1
  53  {*[xyz]efg}     {abcxefg} 1
  54  {*[xyz]efg}     {abcwefg} 0
} {
  do_test quota-glob-$testnum.1 {
    sqlite3_quota_glob $::pattern $::text
  } $::ans
  do_test quota-glob-$testnum.2 {
    sqlite3_quota_glob $::pattern [string map {/ \\} $::text]
  } $::ans
}
finish_test
