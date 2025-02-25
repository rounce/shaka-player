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

goog.provide('shaka.util.StringUtils');

goog.require('goog.asserts');
goog.require('shaka.log');
goog.require('shaka.util.Error');
goog.require('shaka.util.Iterables');


/**
 * @namespace shaka.util.StringUtils
 * @summary A set of string utility functions.
 * @exportDoc
 */
shaka.util.StringUtils = class {
  /**
   * Creates a string from the given buffer as UTF-8 encoding.
   *
   * @param {?BufferSource} data
   * @return {string}
   * @throws {shaka.util.Error}
   * @export
   */
  static fromUTF8(data) {
    if (!data) {
      return '';
    }

    let uint8 = new Uint8Array(data);
    // If present, strip off the UTF-8 BOM.
    if (uint8[0] == 0xef && uint8[1] == 0xbb && uint8[2] == 0xbf) {
      uint8 = uint8.subarray(3);
    }

    // http://stackoverflow.com/a/13691499
    const utf8 = shaka.util.StringUtils.fromCharCode(uint8);
    // This converts each character in the string to an escape sequence.  If the
    // character is in the ASCII range, it is not converted; otherwise it is
    // converted to a URI escape sequence.
    // Example: '\x67\x35\xe3\x82\xac' -> 'g#%E3%82%AC'
    const escaped = escape(utf8);
    // Decode the escaped sequence.  This will interpret UTF-8 sequences into
    // the correct character.
    // Example: 'g#%E3%82%AC' -> 'g#€'
    try {
      return decodeURIComponent(escaped);
    } catch (e) {
      throw new shaka.util.Error(
          shaka.util.Error.Severity.CRITICAL, shaka.util.Error.Category.TEXT,
          shaka.util.Error.Code.BAD_ENCODING);
    }
  }


  /**
   * Creates a string from the given buffer as UTF-16 encoding.
   *
   * @param {?BufferSource} data
   * @param {boolean} littleEndian
         true to read little endian, false to read big.
   * @param {boolean=} noThrow true to avoid throwing in cases where we may
   *     expect invalid input.  If noThrow is true and the data has an odd
   *     length,it will be truncated.
   * @return {string}
   * @throws {shaka.util.Error}
   * @export
   */
  static fromUTF16(data, littleEndian, noThrow) {
    if (!data) {
      return '';
    }

    if (!noThrow && data.byteLength % 2 != 0) {
      shaka.log.error('Data has an incorrect length, must be even.');
      throw new shaka.util.Error(
          shaka.util.Error.Severity.CRITICAL, shaka.util.Error.Category.TEXT,
          shaka.util.Error.Code.BAD_ENCODING);
    }

    /** @type {ArrayBuffer} */
    let buffer;
    if (data instanceof ArrayBuffer) {
      buffer = data;
    } else {
      // Have to create a new buffer because the argument may be a smaller
      // view on a larger ArrayBuffer.  We cannot use an ArrayBufferView in
      // a DataView.
      const temp = new Uint8Array(data.byteLength);
      temp.set(new Uint8Array(data));
      buffer = temp.buffer;
    }

    // Use a DataView to ensure correct endianness.
    const length = Math.floor(data.byteLength / 2);
    const arr = new Uint16Array(length);
    const dataView = new DataView(buffer);
    for (let i = 0; i < length; i++) {
      arr[i] = dataView.getUint16(i * 2, littleEndian);
    }
    return shaka.util.StringUtils.fromCharCode(arr);
  }


  /**
   * Creates a string from the given buffer, auto-detecting the encoding that is
   * being used.  If it cannot detect the encoding, it will throw an exception.
   *
   * @param {?BufferSource} data
   * @return {string}
   * @throws {shaka.util.Error}
   * @export
   */
  static fromBytesAutoDetect(data) {
    const StringUtils = shaka.util.StringUtils;

    const uint8 = new Uint8Array(data);
    if (uint8[0] == 0xef && uint8[1] == 0xbb && uint8[2] == 0xbf) {
      return StringUtils.fromUTF8(uint8);
    } else if (uint8[0] == 0xfe && uint8[1] == 0xff) {
      return StringUtils.fromUTF16(uint8.subarray(2), false /* littleEndian */);
    } else if (uint8[0] == 0xff && uint8[1] == 0xfe) {
      return StringUtils.fromUTF16(uint8.subarray(2), true /* littleEndian */);
    }

    const isAscii = (i) => {
      // arr[i] >= ' ' && arr[i] <= '~';
      return uint8.byteLength <= i || (uint8[i] >= 0x20 && uint8[i] <= 0x7e);
    };

    shaka.log.debug(
        'Unable to find byte-order-mark, making an educated guess.');
    if (uint8[0] == 0 && uint8[2] == 0) {
      return StringUtils.fromUTF16(data, false /* littleEndian */);
    } else if (uint8[1] == 0 && uint8[3] == 0) {
      return StringUtils.fromUTF16(data, true /* littleEndian */);
    } else if (isAscii(0) && isAscii(1) && isAscii(2) && isAscii(3)) {
      return StringUtils.fromUTF8(data);
    }

    throw new shaka.util.Error(
        shaka.util.Error.Severity.CRITICAL,
        shaka.util.Error.Category.TEXT,
        shaka.util.Error.Code.UNABLE_TO_DETECT_ENCODING);
  }


  /**
   * Creates a ArrayBuffer from the given string, converting to UTF-8 encoding.
   *
   * @param {string} str
   * @return {!ArrayBuffer}
   * @export
   */
  static toUTF8(str) {
    // http://stackoverflow.com/a/13691499
    // Converts the given string to a URI encoded string.  If a character falls
    // in the ASCII range, it is not converted; otherwise it will be converted
    // to a series of URI escape sequences according to UTF-8.
    // Example: 'g#€' -> 'g#%E3%82%AC'
    const encoded = encodeURIComponent(str);
    // Convert each escape sequence individually into a character.  Each escape
    // sequence is interpreted as a code-point, so if an escape sequence happens
    // to be part of a multi-byte sequence, each byte will be converted to a
    // single character.
    // Example: 'g#%E3%82%AC' -> '\x67\x35\xe3\x82\xac'
    const utf8 = unescape(encoded);

    const result = new Uint8Array(utf8.length);
    const enumerate = (it) => shaka.util.Iterables.enumerate(it);
    for (const {i, item} of enumerate(utf8)) {
      result[i] = item.charCodeAt(0);
    }
    return result.buffer;
  }


  /**
   * Creates a ArrayBuffer from the given string, converting to UTF-16 encoding.
   *
   * @param {string} str
   * @param {boolean} littleEndian
   * @return {!ArrayBuffer}
   * @export
   */
  static toUTF16(str, littleEndian) {
    const result = new Uint8Array(str.length * 2);
    const view = new DataView(result.buffer);
    const enumerate = (it) => shaka.util.Iterables.enumerate(it);
    for (const {i, item} of enumerate(str)) {
      const value = item.charCodeAt(0);
      view.setUint16(/* position= */ i * 2, value, littleEndian);
    }
    return result.buffer;
  }


  /**
   * Creates a new string from the given array of char codes.
   *
   * Using String.fromCharCode.apply is risky because you can trigger stack
   * errors on very large arrays.  This breaks up the array into several pieces
   * to avoid this.
   *
   * @param {!TypedArray} array
   * @return {string}
   */
  static fromCharCode(array) {
    // Check the browser for what chunk sizes it supports.  Cache the result
    // in an impl method to avoid checking several times.
    if (!shaka.util.StringUtils.fromCharCodeImpl_) {
      const supportsChunkSize = (size) => {
        try {
          const buffer = new Uint8Array(size);
          // The compiler will complain about suspicious value if this isn't
          // stored in a variable and used.
          const foo = String.fromCharCode(...buffer);
          goog.asserts.assert(foo, 'Should get value');
          return true;
        } catch (error) {
          return false;
        }
      };

      // Different browsers support different chunk sizes; find out the largest
      // this browser supports so we can use larger chunks on supported browsers
      // but still support lower-end devices that require small chunks.
      // 64k is supported on all major desktop browsers.
      for (let size = 64 * 1024; size > 0; size /= 2) {
        if (supportsChunkSize(size)) {
          shaka.util.StringUtils.fromCharCodeImpl_ = (buffer) => {
            let ret = '';
            for (let i = 0; i < buffer.length; i += size) {
              const subArray = buffer.subarray(i, i + size);
              ret += String.fromCharCode(...subArray);
            }
            return ret;
          };
          break;
        }
      }
    }

    goog.asserts.assert(
        shaka.util.StringUtils.fromCharCodeImpl_,
        'Unable to create a fromCharCode method');
    return shaka.util.StringUtils.fromCharCodeImpl_(array);
  }
};


/** @private {?function(!TypedArray):string} */
shaka.util.StringUtils.fromCharCodeImpl_ = null;
