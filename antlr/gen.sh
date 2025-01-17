#!/bin/bash

set -e

classpath=src/main/java/com/rescribe/antlr

package_base=com.rescribe.antlr.gen

mkdir -p $classpath/gen
rm -rf $classpath/gen/*

# comment channels for java
java_multiline_comment=109
java_line_comment=110

if [ ! -d "./grammars" ]; then
  git clone https://github.com/antlr/grammars-v4 grammars
  cd grammars/java/java
  sed -i -r "s/^(COMMENT:.*-> channel)\(HIDDEN\);$/\1\($java_multiline_comment\);/g" JavaLexer.g4
  sed -i -r "s/^(LINE_COMMENT:.*-> channel)\(HIDDEN\);$/\1\($java_line_comment\);/g" JavaLexer.g4
  cd -
fi

cd grammars/python/python3
antlr4 -visitor Python3.g4 -package $package_base.python3 -o gen
mv gen/ ../../../$classpath/gen/python3
cd -

cd grammars/java/java
antlr4 -visitor JavaParser.g4 JavaLexer.g4 -package $package_base.java -o gen
mv gen/ ../../../$classpath/gen/java
cd -

cd grammars/cpp
antlr4 -visitor CPP14Parser.g4 CPP14Lexer.g4 -package $package_base.cpp -o gen
mv gen/ ../../$classpath/gen/cpp
cd -

# cd grammars/typescript
# antlr4 -visitor TypeScriptParser.g4 TypeScriptLexer.g4 -package $package_base.typescript -o gen
# path=../../$classpath/gen/typescript
# mv gen/ $path
# cp Java/*.java $path
# sed -i "1i package $package_base.typescript;" $path/TypeScriptLexerBase.java $path/TypeScriptParserBase.java
# cd -

# cd grammars/javascript/ecmascript
# antlr4 -visitor ECMAScript.g4 -package $package_base.ecmascript -o gen
# mv gen/ ../../../$classpath/gen/ecmascript
# cd -

cd grammars/javascript/javascript 
antlr4 -visitor JavaScriptParser.g4 JavaScriptLexer.g4 -package $package_base.javascript -o gen
path=../../../$classpath/gen/javascript
mv gen/ $path
cp Java/*.java $path
sed -i "1i package $package_base.javascript;" $path/JavaScriptLexerBase.java $path/JavaScriptParserBase.java
cd -