/*
** 2014 May 31
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
******************************************************************************
**
*/


// All token codes are small integers with #defines that begin with "TK_"
%token_prefix FTS5_

// The type of the data attached to each token is Token.  This is also the
// default type for non-terminals.
//
%token_type {Fts5Token}
%default_type {Fts5Token}

// The generated parser function takes a 4th argument as follows:
%extra_argument {Fts5Parse *pParse}

// This code runs whenever there is a syntax error
//
%syntax_error {
  UNUSED_PARAM(yymajor); /* Silence a compiler warning */
  sqlite3Fts5ParseError(
    pParse, "fts5: syntax error near \"%.*s\"",TOKEN.n,TOKEN.p
  );
}
%stack_overflow {
  sqlite3Fts5ParseError(pParse, "fts5: parser stack overflow");
}

// The name of the generated procedure that implements the parser
// is as follows:
%name sqlite3Fts5Parser

// The following text is included near the beginning of the C source
// code file that implements the parser.
//
%include {
#include "fts5Int.h"
#include "fts5parse.h"

/*
** Disable all error recovery processing in the parser push-down
** automaton.
*/
#define YYNOERRORRECOVERY 1

/*
** Make yytestcase() the same as testcase()
*/
#define yytestcase(X) testcase(X)

/*
** Indicate that sqlite3ParserFree() will never be called with a null
** pointer.
*/
#define YYPARSEFREENOTNULL 1

/*
** Alternative datatype for the argument to the malloc() routine passed
** into sqlite3ParserAlloc().  The default is size_t.
*/
#define YYMALLOCARGTYPE  u64

} // end %include

%left OR.
%left AND.
%left NOT.
%left TERM.
%left COLON.

input ::= expr(X). { sqlite3Fts5ParseFinished(pParse, X); }
%destructor input { (void)pParse; }

%type cnearset    {Fts5ExprNode*}
%type expr        {Fts5ExprNode*}
%type exprlist    {Fts5ExprNode*}
%destructor cnearset { sqlite3Fts5ParseNodeFree($$); }
%destructor expr     { sqlite3Fts5ParseNodeFree($$); }
%destructor exprlist { sqlite3Fts5ParseNodeFree($$); }

%type colset {Fts5Colset*}
%destructor colset { sqlite3_free($$); }
%type colsetlist {Fts5Colset*}
%destructor colsetlist { sqlite3_free($$); }

colset(A) ::= MINUS LCP colsetlist(X) RCP. { 
    A = sqlite3Fts5ParseColsetInvert(pParse, X);
}
colset(A) ::= LCP colsetlist(X) RCP. { A = X; }
colset(A) ::= STRING(X). {
  A = sqlite3Fts5ParseColset(pParse, 0, &X);
}
colset(A) ::= MINUS STRING(X). {
  A = sqlite3Fts5ParseColset(pParse, 0, &X);
  A = sqlite3Fts5ParseColsetInvert(pParse, A);
}

colsetlist(A) ::= colsetlist(Y) STRING(X). { 
  A = sqlite3Fts5ParseColset(pParse, Y, &X); }
colsetlist(A) ::= STRING(X). { 
  A = sqlite3Fts5ParseColset(pParse, 0, &X); 
}

expr(A) ::= expr(X) AND expr(Y). {
  A = sqlite3Fts5ParseNode(pParse, FTS5_AND, X, Y, 0);
}
expr(A) ::= expr(X) OR expr(Y). {
  A = sqlite3Fts5ParseNode(pParse, FTS5_OR, X, Y, 0);
}
expr(A) ::= expr(X) NOT expr(Y). {
  A = sqlite3Fts5ParseNode(pParse, FTS5_NOT, X, Y, 0);
}

expr(A) ::= colset(X) COLON LP expr(Y) RP. {
  sqlite3Fts5ParseSetColset(pParse, Y, X);
  A = Y;
}
expr(A) ::= LP expr(X) RP. {A = X;}
expr(A) ::= exprlist(X).   {A = X;}

exprlist(A) ::= cnearset(X). {A = X;}
exprlist(A) ::= exprlist(X) cnearset(Y). {
  A = sqlite3Fts5ParseImplicitAnd(pParse, X, Y);
}

cnearset(A) ::= nearset(X). { 
  A = sqlite3Fts5ParseNode(pParse, FTS5_STRING, 0, 0, X); 
}
cnearset(A) ::= colset(X) COLON nearset(Y). { 
  A = sqlite3Fts5ParseNode(pParse, FTS5_STRING, 0, 0, Y); 
  sqlite3Fts5ParseSetColset(pParse, A, X);
}


%type nearset     {Fts5ExprNearset*}
%type nearphrases {Fts5ExprNearset*}
%destructor nearset { sqlite3Fts5ParseNearsetFree($$); }
%destructor nearphrases { sqlite3Fts5ParseNearsetFree($$); }

nearset(A) ::= phrase(Y). { A = sqlite3Fts5ParseNearset(pParse, 0, Y); }
nearset(A) ::= CARET phrase(Y). { 
  sqlite3Fts5ParseSetCaret(Y);
  A = sqlite3Fts5ParseNearset(pParse, 0, Y); 
}
nearset(A) ::= STRING(X) LP nearphrases(Y) neardist_opt(Z) RP. {
  sqlite3Fts5ParseNear(pParse, &X);
  sqlite3Fts5ParseSetDistance(pParse, Y, &Z);
  A = Y;
}

nearphrases(A) ::= phrase(X). { 
  A = sqlite3Fts5ParseNearset(pParse, 0, X); 
}
nearphrases(A) ::= nearphrases(X) phrase(Y). {
  A = sqlite3Fts5ParseNearset(pParse, X, Y);
}

/*
** The optional ", <integer>" at the end of the NEAR() arguments.
*/
neardist_opt(A) ::= . { A.p = 0; A.n = 0; }
neardist_opt(A) ::= COMMA STRING(X). { A = X; }

/*
** A phrase. A set of primitives connected by "+" operators. Examples:
**
**     "the" + "quick brown" + fo *
**     "the quick brown fo" *
**     the+quick+brown+fo*
*/
%type phrase {Fts5ExprPhrase*}
%destructor phrase { sqlite3Fts5ParsePhraseFree($$); }

phrase(A) ::= phrase(X) PLUS STRING(Y) star_opt(Z). { 
  A = sqlite3Fts5ParseTerm(pParse, X, &Y, Z);
}
phrase(A) ::= STRING(Y) star_opt(Z). { 
  A = sqlite3Fts5ParseTerm(pParse, 0, &Y, Z);
}

/*
** Optional "*" character.
*/
%type star_opt {int}
star_opt(A) ::= STAR. { A = 1; }
star_opt(A) ::= . { A = 0; }
