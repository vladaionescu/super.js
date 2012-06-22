'use strict';

/*!
 *  Copyright (c) 2012 Vlad Alexandru Ionescu (vladalexandruionescu.com)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */ 


/**
 * Use as
 * 
 * declareClass(
 *   function MyClass(constrArg1, constrArg2) {
 *     this.member1 = "some value";
 *     this.member2 = constrArg1;
 *     this.yetAnotherMember = "yet another value";
 *     this._super.contructor(constrArg1, constrArg2);
 *   },
 *   
 *   extend(MyBaseClass),
 *   
 *   function method1(param1) {
 *     console.log(this.member1);
 *     console.log(param1);
 *     return this._super.method1(param1, param2);
 *   },
 *   
 *   function method2() {
 *     this.member1 = "a new value";
 *     this.method1(this.member1);
 *   }
 * );
 * 
 * // ... ...
 * 
 * var myInstance = new MyClass("1", "two");
 * myInstance.method1("Three");
 * console.log(myInstance.member1);
 * 
 * NOTE: Don't forget to name all of the functions you pass in.
 */
function declareClass(constructor, extendOrMethod0, method1, method2, etc) {
  // Get the name of the constructor - that will be the class name.
  var className = constructor.__SJS_name();
  if (!className) {
    throw "Named functions only";
  }
  
  // Get the base class if there is one. Otherwise derive from Object.
  var baseClass = Object;
  var methodArgsStartAt = 1;
  if (typeof arguments[1] == "object" && arguments[1].baseClass != null) {
    baseClass = arguments[1].baseClass;
    methodArgsStartAt = 2;
  }
  
  // Augment the constructor to build _super before actually running the
  // provided constructor.
  var augmentedConstructor = constructor.__SJS_augmentBefore(superJSClassInit);
  
  // Declare the class globally.
  // TODO: Could define a "package" concept.
  //        Something like window.packages.path.to.package.className.
  window[className] = augmentedConstructor;
  var klass = window[className];
  
  // Inherit.
  klass.prototype = superJSPrototypeMethodsClone(baseClass);
  klass.prototype.constructor = augmentedConstructor;
  klass.prototype.__parent = baseClass.prototype;
  
  // Nice to have the name of the class.
  // TODO: Based on this, we can write an "instanceof" or "istype" function.
  klass.prototype.__className = className;
  
  // Build __methods and add each method to the prototype.
  var methods = [];
  for (var i = methodArgsStartAt; i < arguments.length; i++) {
    var method = arguments[i];
    if (typeof method != "function") {
      console.error("Class method " + method + " is not a function.");
      continue;
    }
    var methodName = method.__SJS_name();
    klass.prototype[methodName] = method;

    methods.push(arguments[i]);
  }
  klass.prototype.__methods = methods;
  
  // Build __superMethods object. Used to access parent's methods even though
  // they have been overridden.
  // __superMethods is used to build the _super object on instantiation.
  var superMethods = {};
  superMethods.constructor = {
    method: klass.prototype.__parent.constructor,
    level: 1,
  };
  var jParent = klass.prototype.__parent;
  var superLevel = 1;
  while (jParent) {
    if (!jParent.__methods) {
      jParent = jParent.__parent;
      superLevel++;
      continue;
    }

    for (var i = 0; i < jParent.__methods.length; i++) {
      var parentMethod = jParent.__methods[i];
      var parentMethodName = parentMethod.__SJS_name();
      if (parentMethodName in superMethods) {
        continue;
      }
      superMethods[parentMethodName] = {
        method: parentMethod,
        level: superLevel,
      };
    }

    jParent = jParent.__parent;
    superLevel++;
  }
  klass.prototype.__superMethods = superMethods;
  
  // Build __allMethods object - used as a base for inheriting classes.
  klass.prototype.__allMethods = {};
  for (var member in klass.prototype) {
    if (member === "constructor") {
      continue;
    }
    if (typeof klass.prototype[member] === "function") {
      klass.prototype.__allMethods[member] = klass.prototype[member];
    }
  }
  
  // Alter all methods to include superLevel stack frame initialization.
  // Note that we do this *after* creating the __allMethods object.
  // TODO: Methods may have some operations repeatedly wrapped
  // around them. It should be possible to only wrap once each method,
  // and do different things depending on the superLevel the method comes from.
  for (var member in klass.prototype) {
    if (member === "constructor") {
      continue;
    }
    if (typeof klass.prototype[member] === "function") {
      klass.prototype[member] = superJSmethod(klass.prototype[member]);
    }
  }
  
  // Return class, in case user wants to use it immediately.
  return klass;
}

// TODO: The following is actually pretty much Function.bind.
//        Could use that instead.
//        See also https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
//        for workaround for browsers that do not support Function.bind.
/**
 * Use this function whenever you want to provide a class's method as a
 * param (perhaps as an event handler).
 * e.g.:
 *   $("#mydiv").click(
 *     this.myMethod.__methodAsParameter(this, arg1, arg2, arg3));
 */
Function.prototype.__methodAsParameter = function(theThis) {
  var method = this;
  // TODO: Make this function have the same name as the method (?)
  return function() { return method.apply(theThis, arguments); }
}

/**
 * Similar to __methodAsParameter, but the "this" object that is normally
 * found in the handler is passed as the first argument instead. "this" itself
 * is the object who owns the method.
 */
Function.prototype.__methodAsParameterWithThis = function(theThis) {
  var method = this;
  return function() {
    var argumentsWithThis = [];
    argumentsWithThis[0] = this;
    for (var i = 0; i < arguments.length; i++) {
      argumentsWithThis[i+1] = arguments[i];
    }
    return method.apply(theThis, argumentsWithThis);
  }
}

/**
 * A convenience function for getting a function's name.
 * e.g.:
 *   var fun = function myFun() { ... };
 *   alert(fun.__SJS_name());  // "myFun"
 */
Function.prototype.__SJS_name = function() {
  var ret = this.toString();
  ret = ret.substr('function '.length);
  ret = ret.substr(0, ret.indexOf('('));
  return ret;
}

/**
 * Returns a function with the same name(!), which calls beforeFunction
 * and then the original function.
 */
Function.prototype.__SJS_augmentBefore =
  function __SJS_augmentBefore(beforeFunction) {
    var name = this.__SJS_name();
    var originalFunction = this;
    // TODO: Any easier/nicer way to return that function?
    eval("window.__SJS_augmented = function " + name + "() {\n" +
         "\tbeforeFunction.apply(this, arguments);\n" +
         "\treturn originalFunction.apply(this, arguments);\n" +
         "}\n");
    return window.__SJS_augmented;
  }

/**
 * Returns an augmented function with the same name(!), with the given source
 * code placed inside the body, at the beginning. Crazy, huh?
 * [Has not been tested]
 */
Function.prototype.__SJS_augmentBefore2 =
  function __SJS_augmentBefore2(sourceAugmentation) {
    var thisString = this.toString();
    var bodyBegin = thisString.indexOf('{') + 1;
    var head = thisString.substr(0, bodyBegin-1);
    var bodyAndFinalBracket = thisString.substr(bodyBegin);
    var augmented =
      head + "{\n" + sourceAugmentation + "\n" + bodyAndFinalBracket;
    eval("window.__SJS_augmented = " + augmented);
    return window.__SJS_augmented;
  }

/**
 * Doesn't really do much, it's just syntactic salt.
 */
function extend(baseClass) {
  return {baseClass: baseClass};
}

/**
 * This is called automatically as part of every constructor.
 */
function superJSClassInit() {
  if (this.__ranSuperJSClassInit) {
    return;
  }
  
  if (this === window) {
    throw "Forgot 'new' on instantiation?";
  }
  
  this.__superLevel = 0;
  this.__superLevelStack = [];
  
  // Build a _super variable that represents a collection of functions that
  // call the equivalent super methods, with the correct "this".
  this._super = {};
  var superMethods = this.__superMethods;
  for (var superMethodName in superMethods) {
    this._super[superMethodName] =
      superJSsuperMethodAsParameter(this, superMethodName); 
  }
  
  this.__ranSuperJSClassInit = true;
}

/**
 * Returns the super method with the given methodName, but with the correct
 * "this".
 * It also takes care about which super method version to call, depending on how
 * high up the parents chain the call happens.
 */
function superJSsuperMethodAsParameter(theThis, methodName) {
  return function() {
    var parent = theThis;
    for (var i = 0; i < theThis.__superLevel; i++) {
      parent = parent.__parent;
    }
    var methodEntry = parent.__superMethods[methodName];
    var method = methodEntry.method;
    var superLevelAdd = methodEntry.level;
    
    theThis.__superLevel += superLevelAdd;
    try {
      return method.apply(theThis, arguments);
    } finally {
      theThis.__superLevel -= superLevelAdd;
    }
  }
}

/**
 * Returns a function which wraps the provided method with superLevel++/--.
 */
function superJSsuperMethod(method) {
  return function() {
    this.__superLevel++;
    try {
      return method.apply(this, arguments);
    } finally {
      this.__superLevel--;
    }
  }
}

/**
 * Wraps a given method with superLevel stack frame initialization code. 
 */
function superJSmethod(method) {
  return function() {
    this.__superLevelStack.push(this.__superLevel);
    this.__superLevel = 0;
    try {
      return method.apply(this, arguments);
    } finally {
      this.__superLevel = this.__superLevelStack.pop();
    }
  }
}

/**
 * Clones a class's methods, but wraps them with superLevel++/--.
 */
function superJSPrototypeMethodsClone(objectType) {
  var proto = objectType.prototype;
  var ret = {};
  if ("__allMethods" in proto) {
    for (var member in proto.__allMethods) {
      ret[member] = superJSsuperMethod(proto.__allMethods[member]);
    }
  }
  return ret;
}

