


proc bc_find_binaries {zCaption} {
  # Search for binaries to test against. Any executable files that match
  # our naming convention are assumed to be testfixture binaries to test
  # against.
  #
  set binaries [list]
  set self [info nameofexec]
  set pattern "$self?*"
  if {$::tcl_platform(platform)=="windows"} {
    set pattern [string map {\.exe {}} $pattern]
  }
  foreach file [glob -nocomplain $pattern] {
    if {$file==$self} continue
    if {[file executable $file] && [file isfile $file]} {lappend binaries $file}
  }

  if {[llength $binaries]==0} {
    puts "WARNING: No historical binaries to test against."
    puts "WARNING: Omitting backwards-compatibility tests"
  }

  foreach bin $binaries {
    puts -nonewline "Testing against $bin - "
    flush stdout
    puts "version [get_version $bin]"
  }

  set ::BC(binaries) $binaries
  return $binaries
}

proc get_version {binary} {
  set chan [launch_testfixture $binary]
  set v [testfixture $chan { sqlite3 -version }]
  close $chan
  set v
}

proc do_bc_test {bin script} {

  forcedelete test.db
  set ::bc_chan [launch_testfixture $bin]

  proc code1 {tcl} { uplevel #0 $tcl }
  proc code2 {tcl} { testfixture $::bc_chan $tcl }
  proc sql1 sql { code1 [list db eval $sql] }
  proc sql2 sql { code2 [list db eval $sql] }

  code1 { sqlite3 db test.db }
  code2 { sqlite3 db test.db }

  set bintag $bin
  regsub {.*testfixture\.} $bintag {} bintag
  set bintag [string map {\.exe {}} $bintag]
  if {$bintag == ""} {set bintag self}
  set saved_prefix $::testprefix
  append ::testprefix ".$bintag"

  uplevel $script

  set ::testprefix $saved_prefix

  catch { code1 { db close } }
  catch { code2 { db close } }
  catch { close $::bc_chan }
}

proc do_all_bc_test {script} {
  foreach bin $::BC(binaries) {
    uplevel [list do_bc_test $bin $script]
  }
}
