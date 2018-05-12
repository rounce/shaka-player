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

describe('OfflineScheme', function() {
  beforeEach(checkAndRun(async function() {
    // Make sure we start with a clean slate.
    await clearStorage();
  }));

  afterEach(checkAndRun(async function() {
    // Make sure that we don't waste storage by leaving stuff in storage.
    await clearStorage();
  }));

  it('returns special content-type header for manifests',
      checkAndRun(async function() {
        const expectedContentType = 'application/x-offline-manifest';
        const request = createRequest();
        /** @type {!shaka.offline.OfflineUri} */
        const uri = shaka.offline.OfflineUri.manifest(
            'mechanism', 'cell', 1024);

        let response = await shaka.offline.OfflineScheme(
            uri.toString(), request, function() {}).promise;

        expect(response).toBeTruthy();
        expect(response.uri).toBe(uri.toString());
        expect(response.headers['content-type']).toBe(expectedContentType);
      }));

  it('returns segment data from storage', checkAndRun(async function() {
    const request = createRequest();
    const segment = createSegment();

    /** @type {!shaka.offline.OfflineUri} */
    let uri;

    /** @type {!shaka.offline.StorageMuxer} */
    let muxer = new shaka.offline.StorageMuxer();
    await shaka.util.IDestroyable.with([muxer], async () => {
      await muxer.init();
      let handle = await muxer.getActive();
      let keys = await handle.cell.addSegments([segment]);
      uri = shaka.offline.OfflineUri.segment(
          handle.path.mechanism, handle.path.cell, keys[0]);
    });

    let response = await shaka.offline.OfflineScheme(
        uri.toString(), request, function() {}).promise;

      // The whole request is ignored by the OfflineScheme.
      let retry = shaka.net.NetworkingEngine.defaultRetryParameters();
      request = shaka.net.NetworkingEngine.makeRequest([], retry);
    });

    afterEach(function() {
      mockSEFactory.resetAll();
    });

    it('will return special content-type header for manifests', function(done) {
      /** @type {string} */
      let uri;

      Promise.resolve()
          .then(function() {
            return fakeStorageEngine.addManifest({
              originalManifestUri: '',
              duration: 0,
              size: 0,
              expiration: 0,
              periods: [],
              sessionIds: [],
              drmInfo: null,
              appMetadata: {}
            });
          })
          .then(function(id) {
            uri = OfflineUri.manifestIdToUri(id);
            return OfflineScheme(uri, request).promise;
          })
          .then(function(response) {
            expect(response).toBeTruthy();
            expect(response.uri).toBe(uri);
            expect(response.headers['content-type'])
                .toBe('application/x-offline-manifest');
          })
          .catch(fail)
          .then(done);
    });

    it('will get segment data from storage engine', function(done) {
      const originalData = new Uint8Array([0, 1, 2, 3]);

      /** @type {string} */
      let uri;

      Promise.resolve()
          .then(function() {
            return fakeStorageEngine.addSegment({
              data: originalData.buffer
            });
          })
          .then(function(id) {
            uri = OfflineUri.segmentIdToUri(id);
            return OfflineScheme(uri, request).promise;
          })
          .then(function(response) {
            expect(response).toBeTruthy();
            expect(response.uri).toBe(uri);
            expect(response.data).toBeTruthy();

            const responseData = new Uint8Array(response.data);
            expect(responseData).toEqual(originalData);
          })
          .catch(fail)
          .then(done);
    });

    it('will fail if segment not found', function(done) {
      const id = 789;
      const uri = OfflineUri.segmentIdToUri(id);

      OfflineScheme(uri, request).promise
          .then(fail)
          .catch(function(err) {
            shaka.test.Util.expectToEqualError(
                err,
                new shaka.util.Error(
                    shaka.util.Error.Severity.CRITICAL,
                    shaka.util.Error.Category.STORAGE,
                    shaka.util.Error.Code.REQUESTED_ITEM_NOT_FOUND,
                    id));
          })
          .catch(fail)
          .then(done);
    });

    try {
      await shaka.offline.OfflineScheme(uri.toString(), request, function() {})
          .promise;
      fail();
    } catch (e) {
      expect(e.code).toBe(shaka.util.Error.Code.KEY_NOT_FOUND);
    }
  }));

  it('fails for invalid URI', checkAndRun(async function() {
    const request = createRequest();
    const uri = 'this-in-an-invalid-uri';

    try {
      await shaka.offline.OfflineScheme(uri, request, function() {}).promise;
      fail();
    } catch (e) {
      expect(e.code).toBe(shaka.util.Error.Code.MALFORMED_OFFLINE_URI);
    }
  }));

  /**
   * @return {shaka.extern.Request}
   */
  function createRequest() {
    let retry = shaka.net.NetworkingEngine.defaultRetryParameters();
    let request = shaka.net.NetworkingEngine.makeRequest([], retry);

    return request;
  }

  /**
   * @return {shaka.extern.SegmentDataDB}
   */
  function createSegment() {
    const dataLength = 12;

    let segment = {
      data: new ArrayBuffer(dataLength)
    };

    return segment;
  }

  /**
   * @return {!Promise}
   */
  function clearStorage() {
    /** @type {!shaka.offline.StorageMuxer} */
    let muxer = new shaka.offline.StorageMuxer();
    return shaka.util.IDestroyable.with([muxer], async () => {
      await muxer.init();
      await muxer.erase();
    });
  });
});
