#!/usr/bin/tcl
#
# This script reads the regular MSVC makefile (../Makefile.msc) and outputs
# a revised version of that Makefile that is "minimal" in the sense that
# it uses the sqlite3.c amalgamation as input and does not require tclsh.
# The resulting "../Makefile.min.msc" is suitable for use in the amalgamation
# tarballs.
#
if {$argc==0} {
  set basedir [file dir [file dir [file normalize $argv0]]]
  set fromFileName [file join $basedir Makefile.msc]
  set toFileName [file join $basedir autoconf Makefile.msc]
} else {
  set fromFileName [lindex $argv 0]
  if {![file exists $fromFileName]} {
    error "input file \"$fromFileName\" does not exist"
  }
  set toFileName [lindex $argv 1]
  if {[file exists $toFileName]} {
    error "output file \"$toFileName\" already exists"
  }
}

proc readFile { fileName } {
  set file_id [open $fileName RDONLY]
  fconfigure $file_id -encoding binary -translation binary
  set result [read $file_id]
  close $file_id
  return $result
}

proc writeFile { fileName data } {
  set file_id [open $fileName {WRONLY CREAT TRUNC}]
  fconfigure $file_id -encoding binary -translation binary
  puts -nonewline $file_id $data
  close $file_id
  return ""
}

proc escapeSubSpec { data } {
  regsub -all -- {&} $data {\\\&} data
  regsub -all -- {\\(\d+)} $data {\\\\\1} data
  return $data
}

proc substVars { data } {
  return [uplevel 1 [list subst -nocommands -nobackslashes $data]]
}

#
# NOTE: This block is used to replace the section marked <<block1>> in
#       the Makefile, if it exists.
#
set blocks(1) [string trimleft [string map [list \\\\ \\] {
_HASHCHAR=^#
!IF ![echo !IFNDEF VERSION > rcver.vc] && \\
    ![for /F "delims=" %V in ('type "$(SQLITE3H)" ^| "%SystemRoot%\System32\find.exe" "$(_HASHCHAR)define SQLITE_VERSION "') do (echo VERSION = ^^%V >> rcver.vc)] && \\
    ![echo !ENDIF >> rcver.vc]
!INCLUDE rcver.vc
!ENDIF

RESOURCE_VERSION = $(VERSION:^#=)
RESOURCE_VERSION = $(RESOURCE_VERSION:define=)
RESOURCE_VERSION = $(RESOURCE_VERSION:SQLITE_VERSION=)
RESOURCE_VERSION = $(RESOURCE_VERSION:"=)
RESOURCE_VERSION = $(RESOURCE_VERSION:.=,)

$(LIBRESOBJS):	$(TOP)\sqlite3.rc rcver.vc $(SQLITE3H)
	echo #ifndef SQLITE_RESOURCE_VERSION > sqlite3rc.h
	echo #define SQLITE_RESOURCE_VERSION $(RESOURCE_VERSION) >> sqlite3rc.h
	echo #endif >> sqlite3rc.h
	$(LTRCOMPILE) -fo $(LIBRESOBJS) -DRC_VERONLY $(TOP)\sqlite3.rc
}]]

#
# NOTE: This block is used to replace the section marked <<block2>> in
#       the Makefile, if it exists.
#
set blocks(2) [string trimleft [string map [list \\\\ \\] {
Replace.exe:
	$(CSC) /target:exe $(TOP)\Replace.cs

sqlite3.def:	Replace.exe $(LIBOBJ)
	echo EXPORTS > sqlite3.def
	dumpbin /all $(LIBOBJ) \\
		| .\Replace.exe "^\s+/EXPORT:_?(sqlite3(?:session|changeset|changegroup|rebaser|rbu)?_[^@,]*)(?:@\d+|,DATA)?$$" $$1 true \\
		| sort >> sqlite3.def
}]]

set data "#### DO NOT EDIT ####\n"
append data "# This makefile is automatically "
append data "generated from the [file tail $fromFileName] at\n"
append data "# the root of the canonical SQLite source tree (not the\n"
append data "# amalgamation tarball) using the tool/[file tail $argv0]\n"
append data "# script.\n#\n\n"
append data [readFile $fromFileName]

regsub -all -- {# <<mark>>\n.*?# <</mark>>\n} \
    $data "" data

foreach i [lsort -integer [array names blocks]] {
  regsub -all -- [substVars \
      {# <<block${i}>>\n.*?# <</block${i}>>\n}] \
      $data [escapeSubSpec $blocks($i)] data
}

set data [string map [list " -I\$(TOP)\\src" ""] $data]
set data [string map [list " libsqlite3.lib" ""] $data]
set data [string map [list " \$(ALL_TCL_TARGETS)" ""] $data]
set data [string map [list "\$(TOP)\\src\\" "\$(TOP)\\"] $data]

writeFile $toFileName $data
