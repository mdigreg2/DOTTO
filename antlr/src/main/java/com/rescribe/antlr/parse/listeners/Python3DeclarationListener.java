package com.rescribe.antlr.parse.listeners;

import com.rescribe.antlr.gen.python3.Python3BaseListener;
import com.rescribe.antlr.gen.python3.Python3Parser;
import com.rescribe.antlr.parse.FileInput;
import com.rescribe.antlr.parse.schema.*;
import com.rescribe.antlr.parse.schema.File;
import java.util.Stack;
import lombok.Getter;
import org.antlr.v4.runtime.BufferedTokenStream;

public class Python3DeclarationListener extends Python3BaseListener implements CustomListener {
  // ! This should not exist in production build.
  private static Boolean hasOutputtedHeader = false;
  @Getter File file;
  BufferedTokenStream tokens;
  Stack<Parent> parents = new Stack<>();

  public Python3DeclarationListener(
      BufferedTokenStream tokens, FileInput input, LanguageType languageType) {
    super();
    this.tokens = tokens;
    this.file = new File(input);
    parents.push(new Parent(this.file.get_id(), ParentType.FILE));
    file.setLanguage(languageType);
  }

  public File getFileData() {
    return this.file;
  }

  /** Overriding enter file from Python3Parser.java */
  @Override
  public void enterImport_stmt(Python3Parser.Import_stmtContext ctx) {}

  /**
   * Overriding enter function def from Python3Parser.java<br>
   * Example in Python:
   *
   * <pre>
   * def main():
   *  pass
   * </pre>
   */
  @Override
  public void enterFuncdef(Python3Parser.FuncdefContext ctx) {
    /** Print out the contents of the children for development purposes */
    output("ENTERED A FUNCDEF!!!!!");
    for (int i = 0; i < ctx.getChildCount(); i++) {
      output(Integer.toString(i) + ctx.getChild(i).getText());
    }
    // ─────────────────────────────────────────────────────────────────
    if (ctx.children == null) {
      return; // ? Why return if children are null? When would this get triggered?
    }

    String name = ctx.NAME().getText();
    Boolean isConstructor = Boolean.FALSE;
    String returnType = "";
    /**
     * ? Should this be: 1. Empty, as found? 2. void, as found in JavaDeclarationListener.java 3.
     * None, as would be standard in Python?
     */
    Function fn = new Function(name, returnType, isConstructor);
    String fnID = fn.get_id();
    ParentType fnParentType = ParentType.FUNCTION;

    // get the last item on the parents stack and set the parent of this function as
    // the retrieved item
    Parent parentOfFunction = parents.peek();
    fn.setParent(parentOfFunction);

    // Create a parent object and throw on stack for next object that comes along
    Parent thisFunctionAsParent = new Parent(fnID, fnParentType);
    parents.push(thisFunctionAsParent);

    // Determine the starting & ending locations of the function and add to Function
    // object.
    Integer startLine = ctx.getStart().getLine();
    Integer endLine = ctx.getStop().getLine();
    Location locationOfFunctionInFile = new Location(startLine, endLine);
    fn.setLocation(locationOfFunctionInFile);

    //// final int offset = isConstructor ? 0 : 1;
    // * next step in JavaDeclarationListener is to set the return type... does
    // * Python do this at all? see lns 53-57
    // TODO: figure this out.

    String args = ctx.parameters().getText();
    String contents = ctx.children.get(4).getText();

    this.file.getFunctions().add(fn);
  }

  /**
   * Outputs text to the console. Could be done by System.out.println but this adds a header and
   * clearly separates its output from the rest of the springboot output
   */
  // ! Should not be in production environment.
  private static void output(String s) {
    if (!hasOutputtedHeader) {
      outputHeader();
    }
    System.out.println(s);
  }

  /**
   * Outputs a header to separate the output of the SpringBoot Application from the output generated
   * by this file.
   */
  // ! Should not be in production environment.
  private static void outputHeader() {
    for (int i = 0; i < 5; i++) {
      System.out.println(); // print 5 empty spaces
    }
    System.out.println("──────────OUTPUT──────────");
    // clearly demarcate the app output from SpringBoot output
    Python3DeclarationListener.hasOutputtedHeader = true;
    // set static class variable
    return;
  }
}

// private static Boolean hasOutputtedHeader = false;
//  @Getter
//  File file;
//  BufferedTokenStream tokens;
//  Stack<Parent> parents = new Stack<>();
//
//  public File getFileData() {
//    output("Call to getFileData() intercepted\t" + Thread.currentThread().getStackTrace());
//    return file;
//  }
//
//  public Python3DeclarationListener(BufferedTokenStream tokens, FileInput input) {
//    super();
//    this.tokens = tokens;
//    this.file = new File(input);
//  }
//
//  /**
//   * Overriding enter file from Python3Parser.java
//   */
//  @Override
//  public void enterFile_input(Python3Parser.File_inputContext ctx) {
//    // TODO: Add file to stack to stop enterFuncDef from breaking due to peeking at
//    // empty stack.
//    output("ENTERED A FILE!!!");
//    for (int i = 0; i < ctx.getChildCount(); i++) {
//      output(Integer.toString(i) + ctx.getChild(i).getText());
//    }
//    String fID = null;
//    ParentType fileParentType = ParentType.FILE;
//    Parent file = new Parent(fID, fileParentType);
//    parents.push(file);
//  }
//
//  /**
//   * Overriding enter function def from Python3Parser.java<br>
//   * Example in Python:
//   *
//   * <pre>
//   * def main():
//   *  pass
//   * </pre>
//   */
//  @Override
//  public void enterFuncdef(Python3Parser.FuncdefContext ctx) {
//    /** Print out the contents of the children for development purposes */
//    output("ENTERED A FUNCDEF!!!!!");
//    for (int i = 0; i < ctx.getChildCount(); i++) {
//      output(Integer.toString(i) + ctx.getChild(i).getText());
//    }
//    // ─────────────────────────────────────────────────────────────────
//    if (ctx.children == null) {
//      return; // ? Why return if children are null? When would this get triggered?
//    }
//
//    String name = ctx.NAME().getText();
//    Boolean isConstructor = Boolean.FALSE;
//    String returnType = "";
//    /**
//     * ? Should this be: 1. Empty, as found? 2. void, as found in
//     * JavaDeclarationListener.java 3. None, as would be standard in Python?
//     */
//    Function fn = new Function(name, returnType, isConstructor);
//    String fnID = fn.get_id();
//    ParentType fnParentType = ParentType.FUNCTION;
//
//    // get the last item on the parents stack and set the parent of this function as
//    // the retrieved item
//    Parent parentOfFunction = parents.peek();
//    fn.setParent(parentOfFunction);
//
//    // Create a parent object and throw on stack for next object that comes along
//    Parent thisFunctionAsParent = new Parent(fnID, fnParentType);
//    parents.push(thisFunctionAsParent);
//
//    // Determine the starting & ending locations of the function and add to Function
//    // object.
//    Integer startLine = ctx.getStart().getLine();
//    Integer endLine = ctx.getStop().getLine();
//    Location locationOfFunctionInFile = new Location(startLine, endLine);
//    fn.setLocation(locationOfFunctionInFile);
//
//    //// final int offset = isConstructor ? 0 : 1;
//    // * next step in JavaDeclarationListener is to set the return type... does
//    // * Python do this at all? see lns 53-57
//    // TODO: figure this out.
//
//    String args = ctx.parameters().getText();
//    String contents = ctx.children.get(4).getText();
//
//    this.file.getFunctions().add(fn);

// ! This should not exist in production build.
//

/**
 * Outputs text to the console. Could be done by System.out.println but this adds a header and
 * clearly separates its output from the rest of the springboot output
 */
// ! Should not be in production environment.
// private static void output(String s) {
//        if (!hasOutputtedHeader) {
//        outputHeader();
//        }
//        System.out.println(s);
//        }
//
/// **
// * Outputs a header to separate the output of the SpringBoot Application from
// * the output generated by this file.
// */
//// ! Should not be in production environment.
// private static void outputHeader() {
//        for (int i = 0; i < 5; i++) {
//        System.out.println(); // print 5 empty spaces
//        }
//        System.out.println("──────────OUTPUT──────────");
//        // clearly demarcate the app output from SpringBoot output
//        Python3DeclarationListener.hasOutputtedHeader = true;
//        // set static class variable
//        return;
//        }
