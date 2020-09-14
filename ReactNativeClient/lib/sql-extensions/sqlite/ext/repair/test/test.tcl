# Run this script using
#
#       sqlite3_checker --test $thisscript $testscripts
#
# The $testscripts argument is optional.  If omitted, all *.test files
# in the same directory as $thisscript are run.
#
set NTEST 0
set NERR  0


# Invoke the do_test procedure to run a single test
#
# The $expected parameter is the expected result.  The result is the return
# value from the last TCL command in $cmd.
#
# Normally, $expected must match exactly.  But if $expected is of the form
# "/regexp/" then regular expression matching is used.  If $expected is
# "~/regexp/" then the regular expression must NOT match.  If $expected is
# of the form "#/value-list/" then each term in value-list must be numeric
# and must approximately match the corresponding numeric term in $result.
# Values must match within 10%.  Or if the $expected term is A..B then the
# $result term must be in between A and B.
#
proc do_test {name cmd expected} {
  if {[info exists ::testprefix]} {
    set name "$::testprefix$name"
  }

  incr ::NTEST
  puts -nonewline $name...
  flush stdout

  if {[catch {uplevel #0 "$cmd;\n"} result]} {
    puts -nonewline $name...
    puts "\nError: $result"
    incr ::NERR
  } else {
    set ok [expr {[string compare $result $expected]==0}]
    if {!$ok} {
      puts "\n!  $name expected: \[$expected\]\n! $name got:      \[$result\]"
      incr ::NERR
    } else {
      puts " Ok"
    }
  }
  flush stdout
}

#
#   do_execsql_test TESTNAME SQL RES
#
proc do_execsql_test {testname sql {result {}}} {
  uplevel [list do_test $testname [list db eval $sql] [list {*}$result]]
}

if {[llength $argv]==0} {
  set dir [file dirname $argv0]
  set argv [glob -nocomplain $dir/*.test]
}
foreach testfile $argv {
  file delete -force test.db
  sqlite3 db test.db
  source $testfile
  catch {db close}
}
puts "$NERR errors out of $NTEST tests"
