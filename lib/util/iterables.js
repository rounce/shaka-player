/**
 * @license
 * Copyright 2016 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

goog.provide('shaka.util.Iterables');


/**
 * Recreations of Array-like functions so that they work on any iterable
 * type.
 * @final
 */
shaka.util.Iterables = class {
  /**
   * @param {!Iterable.<FROM>} iterable
   * @param {function(FROM):TO} mapping
   * @return {!Iterable.<TO>}
   * @template FROM,TO
   */
  static map(iterable, mapping) {
    const array = [];
    for (const x of iterable) {
      array.push(mapping(x));
    }
    return array;
  }

  /**
   * @param {!Iterable.<T>} iterable
   * @param {function(T):boolean} test
   * @return {boolean}
   * @template T
   */
  static every(iterable, test) {
    for (const x of iterable) {
      if (!test(x)) {
        return false;
      }
    }
    return true;
  }

  /**
   * @param {!Iterable.<T>} iterable
   * @param {function(T):boolean} test
   * @return {boolean}
   * @template T
   */
  static some(iterable, test) {
    for (const x of iterable) {
      if (test(x)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Iterate over an iterable object and return only the items that |filter|
   * returns true for.
   *
   * @param {!Iterable.<T>} iterable
   * @param {function(T):boolean} filter
   * @return {!Array.<T>}
   * @template T
   */
  static filter(iterable, filter) {
    const out = [];
    for (const x of iterable) {
      if (filter(x)) {
        out.push(x);
      }
    }
    return out;
  }

  /**
   * Iterates over an iterable object and includes additional info about each
   * item:
   * - The zero-based index of the element.
   * - The next item in the list, if it exists.
   * - The previous item in the list, if it exists.
   *
   * @param {!Iterable.<T>} iterable
   * @return {!Iterable.<
   *     {i: number, item: T, prev: (T|undefined), next: (T|undefined)}>}
   * @template T
   */
  static* enumerate(iterable) {
    // Since we want the "next" item, we need to skip the first item and return
    // elements one in the past.  So as we iterate, we are getting the "next"
    // element and yielding the one from the previous iteration.
    let i = -1;
    let prev = undefined;
    let item = undefined;
    for (const next of iterable) {
      if (i >= 0) {
        yield {i, item, prev, next};
      }
      i++;
      prev = item;
      item = next;
    }
    if (i != -1) {
      // If it's still -1, there were no items.  Otherwise we need to yield
      // the last item.
      yield {i, prev, item, next: undefined};
    }
  }
};
