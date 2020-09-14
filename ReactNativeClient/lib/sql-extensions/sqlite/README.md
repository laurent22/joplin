<h1 align="center">SQLite Source Repository</h1>

This repository contains the complete source code for the 
[SQLite database engine](https://sqlite.org/).  Some test scripts 
are also included.  However, many other test scripts
and most of the documentation are managed separately.

## Version Control

SQLite sources are managed using the
[Fossil](https://www.fossil-scm.org/), a distributed version control system
that was specifically designed and written to support SQLite development.
The [Fossil repository](https://sqlite.org/src/timeline) contains the urtext.

If you are reading this on GitHub or some other Git repository or service,
then you are looking at a mirror.  The names of check-ins and
other artifacts in a Git mirror are different from the official
names for those objects.  The offical names for check-ins are
found in a footer on the check-in comment for authorized mirrors.
The official check-in name can also be seen in the `manifest.uuid` file
in the root of the tree.  Always use the official name, not  the
Git-name, when communicating about an SQLite check-in.

If you pulled your SQLite source code from a secondary source and want to
verify its integrity, there are hints on how to do that in the
[Verifying Code Authenticity](#vauth) section below.

## Obtaining The Code

If you do not want to use Fossil, you can download tarballs or ZIP
archives or [SQLite archives](https://sqlite.org/cli.html#sqlar) as follows:

  *  Lastest trunk check-in as
     [Tarball](https://www.sqlite.org/src/tarball/sqlite.tar.gz),
     [ZIP-archive](https://www.sqlite.org/src/zip/sqlite.zip), or
     [SQLite-archive](https://www.sqlite.org/src/sqlar/sqlite.sqlar).

  *  Latest release as
     [Tarball](https://www.sqlite.org/src/tarball/sqlite.tar.gz?r=release),
     [ZIP-archive](https://www.sqlite.org/src/zip/sqlite.zip?r=release), or
     [SQLite-archive](https://www.sqlite.org/src/sqlar/sqlite.sqlar?r=release).

  *  For other check-ins, substitute an appropriate branch name or
     tag or hash prefix in place of "release" in the URLs of the previous
     bullet.  Or browse the [timeline](https://www.sqlite.org/src/timeline)
     to locate the check-in desired, click on its information page link,
     then click on the "Tarball" or "ZIP Archive" links on the information
     page.

If you do want to use Fossil to check out the source tree, 
first install Fossil version 2.0 or later.
(Source tarballs and precompiled binaries available
[here](https://www.fossil-scm.org/fossil/uv/download.html).  Fossil is
a stand-alone program.  To install, simply download or build the single 
executable file and put that file someplace on your $PATH.)
Then run commands like this:

        mkdir ~/sqlite
        cd ~/sqlite
        fossil clone https://www.sqlite.org/src sqlite.fossil
        fossil open sqlite.fossil
    
After setting up a repository using the steps above, you can always
update to the lastest version using:

        fossil update trunk   ;# latest trunk check-in
        fossil update release ;# latest official release

Or type "fossil ui" to get a web-based user interface.

## Compiling

First create a directory in which to place
the build products.  It is recommended, but not required, that the
build directory be separate from the source directory.  Cd into the
build directory and then from the build directory run the configure
script found at the root of the source tree.  Then run "make".

For example:

        tar xzf sqlite.tar.gz    ;#  Unpack the source tree into "sqlite"
        mkdir bld                ;#  Build will occur in a sibling directory
        cd bld                   ;#  Change to the build directory
        ../sqlite/configure      ;#  Run the configure script
        make                     ;#  Run the makefile.
        make sqlite3.c           ;#  Build the "amalgamation" source file
        make test                ;#  Run some tests (requires Tcl)

See the makefile for additional targets.

The configure script uses autoconf 2.61 and libtool.  If the configure
script does not work out for you, there is a generic makefile named
"Makefile.linux-gcc" in the top directory of the source tree that you
can copy and edit to suit your needs.  Comments on the generic makefile
show what changes are needed.

## Using MSVC

On Windows, all applicable build products can be compiled with MSVC.
First open the command prompt window associated with the desired compiler
version (e.g. "Developer Command Prompt for VS2013").  Next, use NMAKE
with the provided "Makefile.msc" to build one of the supported targets.

For example:

        mkdir bld
        cd bld
        nmake /f Makefile.msc TOP=..\sqlite
        nmake /f Makefile.msc sqlite3.c TOP=..\sqlite
        nmake /f Makefile.msc sqlite3.dll TOP=..\sqlite
        nmake /f Makefile.msc sqlite3.exe TOP=..\sqlite
        nmake /f Makefile.msc test TOP=..\sqlite

There are several build options that can be set via the NMAKE command
line.  For example, to build for WinRT, simply add "FOR_WINRT=1" argument
to the "sqlite3.dll" command line above.  When debugging into the SQLite
code, adding the "DEBUG=1" argument to one of the above command lines is
recommended.

SQLite does not require [Tcl](http://www.tcl.tk/) to run, but a Tcl installation
is required by the makefiles (including those for MSVC).  SQLite contains
a lot of generated code and Tcl is used to do much of that code generation.

## Source Code Tour

Most of the core source files are in the **src/** subdirectory.  The
**src/** folder also contains files used to build the "testfixture" test
harness. The names of the source files used by "testfixture" all begin
with "test".
The **src/** also contains the "shell.c" file
which is the main program for the "sqlite3.exe"
[command-line shell](https://sqlite.org/cli.html) and
the "tclsqlite.c" file which implements the
[Tcl bindings](https://sqlite.org/tclsqlite.html) for SQLite.
(Historical note:  SQLite began as a Tcl
extension and only later escaped to the wild as an independent library.)

Test scripts and programs are found in the **test/** subdirectory.
Addtional test code is found in other source repositories.
See [How SQLite Is Tested](http://www.sqlite.org/testing.html) for
additional information.

The **ext/** subdirectory contains code for extensions.  The
Full-text search engine is in **ext/fts3**.  The R-Tree engine is in
**ext/rtree**.  The **ext/misc** subdirectory contains a number of
smaller, single-file extensions, such as a REGEXP operator.

The **tool/** subdirectory contains various scripts and programs used
for building generated source code files or for testing or for generating
accessory programs such as "sqlite3_analyzer(.exe)".

### Generated Source Code Files

Several of the C-language source files used by SQLite are generated from
other sources rather than being typed in manually by a programmer.  This
section will summarize those automatically-generated files.  To create all
of the automatically-generated files, simply run "make target&#95;source".
The "target&#95;source" make target will create a subdirectory "tsrc/" and
fill it with all the source files needed to build SQLite, both
manually-edited files and automatically-generated files.

The SQLite interface is defined by the **sqlite3.h** header file, which is
generated from src/sqlite.h.in, ./manifest.uuid, and ./VERSION.  The
[Tcl script](http://www.tcl.tk) at tool/mksqlite3h.tcl does the conversion.
The manifest.uuid file contains the SHA3 hash of the particular check-in
and is used to generate the SQLITE\_SOURCE\_ID macro.  The VERSION file
contains the current SQLite version number.  The sqlite3.h header is really
just a copy of src/sqlite.h.in with the source-id and version number inserted
at just the right spots. Note that comment text in the sqlite3.h file is
used to generate much of the SQLite API documentation.  The Tcl scripts
used to generate that documentation are in a separate source repository.

The SQL language parser is **parse.c** which is generate from a grammar in
the src/parse.y file.  The conversion of "parse.y" into "parse.c" is done
by the [lemon](./doc/lemon.html) LALR(1) parser generator.  The source code
for lemon is at tool/lemon.c.  Lemon uses the tool/lempar.c file as a
template for generating its parser.
Lemon also generates the **parse.h** header file, at the same time it
generates parse.c.

The **opcodes.h** header file contains macros that define the numbers
corresponding to opcodes in the "VDBE" virtual machine.  The opcodes.h
file is generated by the scanning the src/vdbe.c source file.  The
Tcl script at ./mkopcodeh.tcl does this scan and generates opcodes.h.
A second Tcl script, ./mkopcodec.tcl, then scans opcodes.h to generate
the **opcodes.c** source file, which contains a reverse mapping from
opcode-number to opcode-name that is used for EXPLAIN output.

The **keywordhash.h** header file contains the definition of a hash table
that maps SQL language keywords (ex: "CREATE", "SELECT", "INDEX", etc.) into
the numeric codes used by the parse.c parser.  The keywordhash.h file is
generated by a C-language program at tool mkkeywordhash.c.

The **pragma.h** header file contains various definitions used to parse
and implement the PRAGMA statements.  The header is generated by a
script **tool/mkpragmatab.tcl**. If you want to add a new PRAGMA, edit
the **tool/mkpragmatab.tcl** file to insert the information needed by the
parser for your new PRAGMA, then run the script to regenerate the
**pragma.h** header file.

### The Amalgamation

All of the individual C source code and header files (both manually-edited
and automatically-generated) can be combined into a single big source file
**sqlite3.c** called "the amalgamation".  The amalgamation is the recommended
way of using SQLite in a larger application.  Combining all individual
source code files into a single big source code file allows the C compiler
to perform more cross-procedure analysis and generate better code.  SQLite
runs about 5% faster when compiled from the amalgamation versus when compiled
from individual source files.

The amalgamation is generated from the tool/mksqlite3c.tcl Tcl script.
First, all of the individual source files must be gathered into the tsrc/
subdirectory (using the equivalent of "make target_source") then the
tool/mksqlite3c.tcl script is run to copy them all together in just the
right order while resolving internal "#include" references.

The amalgamation source file is more than 200K lines long.  Some symbolic
debuggers (most notably MSVC) are unable to deal with files longer than 64K
lines.  To work around this, a separate Tcl script, tool/split-sqlite3c.tcl,
can be run on the amalgamation to break it up into a single small C file
called **sqlite3-all.c** that does #include on about seven other files
named **sqlite3-1.c**, **sqlite3-2.c**, ..., **sqlite3-7.c**.  In this way,
all of the source code is contained within a single translation unit so
that the compiler can do extra cross-procedure optimization, but no
individual source file exceeds 32K lines in length.

## How It All Fits Together

SQLite is modular in design.
See the [architectural description](http://www.sqlite.org/arch.html)
for details. Other documents that are useful in
(helping to understand how SQLite works include the
[file format](http://www.sqlite.org/fileformat2.html) description,
the [virtual machine](http://www.sqlite.org/opcode.html) that runs
prepared statements, the description of
[how transactions work](http://www.sqlite.org/atomiccommit.html), and
the [overview of the query planner](http://www.sqlite.org/optoverview.html).

Years of effort have gone into optimizating SQLite, both
for small size and high performance.  And optimizations tend to result in
complex code.  So there is a lot of complexity in the current SQLite
implementation.  It will not be the easiest library in the world to hack.

Key files:

  *  **sqlite.h.in** - This file defines the public interface to the SQLite
     library.  Readers will need to be familiar with this interface before
     trying to understand how the library works internally.

  *  **sqliteInt.h** - this header file defines many of the data objects
     used internally by SQLite.  In addition to "sqliteInt.h", some
     subsystems have their own header files.

  *  **parse.y** - This file describes the LALR(1) grammar that SQLite uses
     to parse SQL statements, and the actions that are taken at each step
     in the parsing process.

  *  **vdbe.c** - This file implements the virtual machine that runs
     prepared statements.  There are various helper files whose names
     begin with "vdbe".  The VDBE has access to the vdbeInt.h header file
     which defines internal data objects.  The rest of SQLite interacts
     with the VDBE through an interface defined by vdbe.h.

  *  **where.c** - This file (together with its helper files named
     by "where*.c") analyzes the WHERE clause and generates
     virtual machine code to run queries efficiently.  This file is
     sometimes called the "query optimizer".  It has its own private
     header file, whereInt.h, that defines data objects used internally.

  *  **btree.c** - This file contains the implementation of the B-Tree
     storage engine used by SQLite.  The interface to the rest of the system
     is defined by "btree.h".  The "btreeInt.h" header defines objects
     used internally by btree.c and not published to the rest of the system.

  *  **pager.c** - This file contains the "pager" implementation, the
     module that implements transactions.  The "pager.h" header file
     defines the interface between pager.c and the rest of the system.

  *  **os_unix.c** and **os_win.c** - These two files implement the interface
     between SQLite and the underlying operating system using the run-time
     pluggable VFS interface.

  *  **shell.c.in** - This file is not part of the core SQLite library.  This
     is the file that, when linked against sqlite3.a, generates the
     "sqlite3.exe" command-line shell.  The "shell.c.in" file is transformed
     into "shell.c" as part of the build process.

  *  **tclsqlite.c** - This file implements the Tcl bindings for SQLite.  It
     is not part of the core SQLite library.  But as most of the tests in this
     repository are written in Tcl, the Tcl language bindings are important.

  *  **test*.c** - Files in the src/ folder that begin with "test" go into
     building the "testfixture.exe" program.  The testfixture.exe program is
     an enhanced Tcl shell.  The testfixture.exe program runs scripts in the
     test/ folder to validate the core SQLite code.  The testfixture program
     (and some other test programs too) is build and run when you type
     "make test".

  *  **ext/misc/json1.c** - This file implements the various JSON functions
     that are build into SQLite.

There are many other source files.  Each has a succinct header comment that
describes its purpose and role within the larger system.

<a name="vauth"></a>
## Verifying Code Authenticity

The `manifest` file at the root directory of the source tree
contains either a SHA3-256 hash (for newer files) or a SHA1 hash (for 
older files) for every source file in the repository.
The SHA3-256 hash of the `manifest`
file itself is the official name of the version of the source tree that you
have. The `manifest.uuid` file should contain the SHA3-256 hash of the
`manifest` file. If all of the above hash comparisons are correct, then
you can be confident that your source tree is authentic and unadulterated.

The format of the `manifest` file should be mostly self-explanatory, but
if you want details, they are available
[here](https://fossil-scm.org/fossil/doc/trunk/www/fileformat.wiki#manifest).

## Contacts

The main SQLite website is [http://www.sqlite.org/](http://www.sqlite.org/)
with geographically distributed backups at
[http://www2.sqlite.org/](http://www2.sqlite.org) and
[http://www3.sqlite.org/](http://www3.sqlite.org).
