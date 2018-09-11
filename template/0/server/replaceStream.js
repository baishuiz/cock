'use strict';
var stream = require('stream');
var Transform = stream.Transform;

module.exports = function ReplaceStream(search, replace, options) {
  var tail = '';
  var totalMatches = 0;
  var isRegex = search instanceof RegExp;

  options = options || {};
  options.limit = options.limit || Infinity;
  options.encoding = options.encoding || 'utf8';
  options.maxMatchLen = options.maxMatchLen || 100;

  var replaceFn = replace;

  replaceFn = createReplaceFn(replace, isRegex);

  var match;
  if (isRegex) {
    match = matchFromRegex(search, options)
  } else {
    throw new Error('need RegExp search');
  }

  function transform(buf, enc, cb) {
    var matches;
    var lastPos = 0;
    var runningMatch = '';
    var matchCount = 0;
    var rewritten = '';
    var haystack = tail + buf.toString(options.encoding);
    tail = '';

    while (totalMatches < options.limit &&
          (matches = match.exec(haystack)) !== null) {

      matchCount++;
      var before = haystack.slice(lastPos, matches.index);
      var regexMatch = matches;
      lastPos = matches.index + regexMatch[0].length;

      if (lastPos > haystack.length && regexMatch[0].length < options.maxMatchLen) {
        tail = regexMatch[0]
      } else {
        var dataToAppend = getDataToAppend(before,regexMatch);
        rewritten += dataToAppend;
      }
    }

    if (tail.length < 1)
      tail = haystack.slice(lastPos) > options.maxMatchLen ? haystack.slice(lastPos).slice(0 - options.maxMatchLen) : haystack.slice(lastPos)

    var dataToQueue = getDataToQueue(matchCount,haystack,rewritten,lastPos);
    cb(null, dataToQueue);
  }

  function getDataToAppend(before, match) {
    var dataToAppend = before;

    totalMatches++;

    dataToAppend += isRegex ? replaceFn.apply(this, match.concat([match.index, match.input])) : replaceFn(match[0]);

    return dataToAppend;
  }

  function getDataToQueue(matchCount, haystack, rewritten, lastPos) {
    if (matchCount > 0) {
      if (haystack.length > tail.length) {
        return rewritten + haystack.slice(lastPos, haystack.length - tail.length);
      }

      return rewritten;
    }

    return haystack.slice(0, haystack.length - tail.length);
  }

  function flush(cb) {
    if (tail) {
      this.push(tail);
    }
    cb();
  }

  return new Transform({
    transform: transform,
    flush: flush
  });
};

function createReplaceFn(replace, isRegEx) {
  var regexReplaceFunction = function () {
    var newReplace = replace;
    // ability to us $1 with captures
    // Start at 1 and end at length - 2 to avoid the match parameter and offset
    // And string parameters
    var paramLength = arguments.length - 2;
    for (var i = 1; i < paramLength; i++) {
      newReplace = newReplace.replace('$' + i, arguments[i] || '')
    }
    return newReplace;
  };

  if (isRegEx && !(replace instanceof Function)) {
    return regexReplaceFunction;
  }

  if (!(replace instanceof Function)) {
    return function stringReplaceFunction() {
      return replace;
    };
  }

  return replace;
}

function matchFromRegex(regex, options) {
  if (options.regExpOptions) {
    regex = new RegExp(regex.source, options.regExpOptions)
  }

  // If there is no global flag then there can only be one match
  if (!regex.global) {
    options.limit = 1;
  }
  return regex;
}
