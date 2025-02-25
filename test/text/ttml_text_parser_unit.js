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

describe('TtmlTextParser', () => {
  const Cue = shaka.text.Cue;
  const CueRegion = shaka.text.CueRegion;
  const Util = shaka.test.Util;

  it('supports no cues', () => {
    verifyHelper([],
        '<tt></tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('supports div with no cues but whitespace', () => {
    verifyHelper(
        [],
        '<tt><body><div>  \r\n </div></body></tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('supports xml:space', () => {
    const ttBody = '\n' +
        '  <body>\n' +
        '    <p begin="01:02.03" end="01:02.05">\n' +
        '      <span> A    B   C  </span>\n' +
        '    </p>\n' +
        '  </body>\n';

    // When xml:space="default", ignore whitespace outside tags.
    verifyHelper(
        [
          {startTime: 62.03, endTime: 62.05, payload: 'A B C'},
        ],
        '<tt xml:space="default">' + ttBody + '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    // When xml:space="preserve", take them into account.
    verifyHelper(
        [
          {
            startTime: 62.03,
            endTime: 62.05,
            payload: '\n       A    B   C  \n    ',
          },
        ],
        '<tt xml:space="preserve">' + ttBody + '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    // The default value for xml:space is "default".
    verifyHelper(
        [
          {startTime: 62.03, endTime: 62.05, payload: 'A B C'},
        ],
        '<tt>' + ttBody + '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    // Any other value is rejected as an error.
    errorHelper(shaka.util.Error.Code.INVALID_XML,
        '<tt xml:space="invalid">' + ttBody + '</tt>');
  });

  it('rejects invalid ttml', () => {
    errorHelper(shaka.util.Error.Code.INVALID_XML, '<test></test>');
    errorHelper(shaka.util.Error.Code.INVALID_XML, '');
  });

  it('rejects invalid time format', () => {
    errorHelper(shaka.util.Error.Code.INVALID_TEXT_CUE,
        '<tt><body><p begin="test" end="test"></p></body></tt>');
    errorHelper(shaka.util.Error.Code.INVALID_TEXT_CUE,
        '<tt><body><p begin="3.45" end="1a"></p></body></tt>');
  });

  it('supports colon formatted time', () => {
    verifyHelper(
        [
          {startTime: 62.05, endTime: 3723.2, payload: 'Test'},
        ],
        '<tt><body><p begin="01:02.05" ' +
        'end="01:02:03.200">Test</p></body></tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('accounts for offset', () => {
    verifyHelper(
        [
          {startTime: 69.05, endTime: 3730.2, payload: 'Test'},
        ],
        '<tt><body><p begin="01:02.05" ' +
        'end="01:02:03.200">Test</p></body></tt>',
        {periodStart: 7, segmentStart: 0, segmentEnd: 0});
  });

  it('supports time in 0.00h 0.00m 0.00s format', () => {
    verifyHelper(
        [
          {startTime: 3567.03, endTime: 5402.3, payload: 'Test'},
        ],
        '<tt><body><p begin="59.45m30ms" ' +
        'end="1.5h2.3s">Test</p></body></tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('supports time with frame rate', () => {
    verifyHelper(
        [
          {startTime: 615.5, endTime: 663, payload: 'Test'},
        ],
        '<tt xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ' +
        'ttp:frameRate="30"> ' +
        '<body>' +
        '<p begin="00:10:15:15" end="00:11:02:30">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('supports time with frame rate multiplier', () => {
    verifyHelper(
        [
          {startTime: 615.5, endTime: 663, payload: 'Test'},
        ],
        '<tt xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ' +
        'ttp:frameRate="60" ' +
        'ttp:frameRateMultiplier="1 2"> ' +
        '<body>' +
        '<p begin="00:10:15:15" end="00:11:02:30">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('supports time with subframes', () => {
    verifyHelper(
        [
          {
            startTime: Util.closeTo(615.5 + 1 / 60),
            endTime: 663,
            payload: 'Test',
          },
        ],
        '<tt xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ' +
        'ttp:frameRate="30" ' +
        'ttp:subFrameRate="2"> ' +
        '<body>' +
        '<p begin="00:10:15:15.1" end="00:11:02:29.2">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('supports time in frame format', () => {
    verifyHelper(
        [
          {startTime: 2.5, endTime: Util.closeTo(10.01), payload: 'Test'},
        ],
        '<tt xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ' +
        'ttp:frameRate="60" ' +
        'ttp:frameRateMultiplier="1 2">' +
        '<body>' +
        '<p begin="75f" end="300.3f">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('supports time in tick format', () => {
    verifyHelper(
        [
          {startTime: 5, endTime: Util.closeTo(6.02), payload: 'Test'},
        ],
        '<tt xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ' +
        'ttp:frameRate="60" ' +
        'ttp:tickRate="10">' +
        '<body>' +
        '<p begin="50t" end="60.2t">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('supports time with duration', () => {
    verifyHelper(
        [
          {startTime: 62.05, endTime: 67.05, payload: 'Test'},
        ],
        '<tt><body><p begin="01:02.05" ' +
        'dur="5s">Test</p></body></tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('parses alignment from textAlign attribute of a region', () => {
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            lineAlign: Cue.textAlign.START,
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" tts:textAlign="start" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('allows non-standard namespace names', () => {
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            lineAlign: Cue.textAlign.START,
          },
        ],
        '<tt xmlns:p1="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" p1:textAlign="start" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('parses alignment from <style> block with id on region', () => {
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            lineAlign: Cue.textAlign.END,
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<styling>' +
        '<style xml:id="s1" tts:textAlign="end"/>' +
        '</styling>' +
        '<layout>' +
        '<region xml:id="subtitleArea" style="s1" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('parses alignment from <style> block with id on p', () => {
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            lineAlign: Cue.textAlign.END,
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<styling>' +
        '<style xml:id="s1" tts:textAlign="end"/>' +
        '</styling>' +
        '<layout>' +
        '<region xml:id="subtitleArea" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200" style="s1">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('supports region settings for horizontal text', () => {
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            region: {
              id: 'subtitleArea',
              viewportAnchorX: 50,
              viewportAnchorY: 16,
              width: 100,
              height: 100,
            },
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" tts:origin="50% 16%"/>' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            region: {
              viewportAnchorX: 50,
              viewportAnchorY: 16,
              width: 100,
              height: 100,
            },
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" tts:origin="50% 16%" ' +
        'tts:writingMode="lrtb" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            region: {
              viewportAnchorX: 50,
              viewportAnchorY: 16,
              width: 100,
              height: 100,
            },
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" tts:origin="50% 16%" ' +
        'tts:writingMode="lr" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('supports region settings in pixels', () => {
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            region: {
              id: 'subtitleArea',
              viewportAnchorX: 50,
              viewportAnchorY: 16,
              regionAnchorX: 0,
              regionAnchorY: 0,
              width: 100,
              height: 100,
              heightUnits: CueRegion.units.PERCENTAGE,
              widthUnits: CueRegion.units.PERCENTAGE,
              viewportAnchorUnits: CueRegion.units.PX,
              scroll: CueRegion.scrollMode.NONE,
            },
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" tts:origin="50px 16px"/>' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            region: {
              id: 'subtitleArea',
              viewportAnchorX: 0,
              viewportAnchorY: 0,
              regionAnchorX: 0,
              regionAnchorY: 0,
              width: 50,
              height: 16,
              heightUnits: CueRegion.units.PX,
              widthUnits: CueRegion.units.PX,
              viewportAnchorUnits: CueRegion.units.PERCENTAGE,
              scroll: CueRegion.scrollMode.NONE,
            },
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" tts:extent="50px 16px" ' +
        'tts:writingMode="lrtb" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('supports region settings for vertical text', () => {
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            region: {
              id: 'subtitleArea',
              viewportAnchorX: 50,
              viewportAnchorY: 16,
              width: 100,
              height: 100,
            },
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" tts:origin="50% 16%" ' +
        'tts:writingMode="tb" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            region: {
              viewportAnchorX: 50,
              viewportAnchorY: 16,
              width: 100,
              height: 100,
            },
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" tts:origin="50% 16%" ' +
        'tts:writingMode="tblr" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            region: {
              viewportAnchorX: 50,
              viewportAnchorY: 16,
              width: 100,
              height: 100,
            },
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" tts:origin="50% 16%" ' +
        'tts:writingMode="tbrl" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('supports writingMode setting', () => {
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            writingMode: Cue.writingMode.VERTICAL_LEFT_TO_RIGHT,
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" ' +
        'tts:writingMode="tb" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            writingMode: Cue.writingMode.VERTICAL_RIGHT_TO_LEFT,
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" ' +
        'tts:writingMode="tbrl" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            writingMode: Cue.writingMode.VERTICAL_LEFT_TO_RIGHT,
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" ' +
        'tts:writingMode="tblr" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            direction: Cue.direction.HORIZONTAL_RIGHT_TO_LEFT,
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" ' +
        'tts:direction="rtl" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            direction: Cue.direction.HORIZONTAL_LEFT_TO_RIGHT,
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<layout>' +
        '<region xml:id="subtitleArea" ' +
        'tts:direction="rtl" tts:writingMode="lrtb"/>' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('disregards empty divs and ps', () => {
    verifyHelper(
        [
          {startTime: 62.05, endTime: 3723.2, payload: 'Test'},
        ],
        '<tt>' +
        '<body>' +
        '<div>' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '</div>' +
        '<div></div>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    verifyHelper(
        [
          {startTime: 62.05, endTime: 3723.2, payload: 'Test'},
        ],
        '<tt>' +
        '<body>' +
        '<div>' +
        '<p begin="01:02.05" end="01:02:03.200">Test</p>' +
        '<p></p>' +
        '</div>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    verifyHelper(
        [],
        '<tt>' +
        '<body>' +
        '<div>' +
        '<p></p>' +
        '</div>' +
        '<div></div>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('inserts newline characters into <br> tags', () => {
    verifyHelper(
        [
          {startTime: 62.05, endTime: 3723.2, payload: 'Line1\nLine2'},
        ],
        '<tt><body><p begin="01:02.05" ' +
        'end="01:02:03.200">Line1<br/>Line2</p></body></tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    verifyHelper(
        [
          {startTime: 62.05, endTime: 3723.2, payload: 'Line1\nLine2'},
        ],
        '<tt><body><p begin="01:02.05" ' +
        'end="01:02:03.200"><span>Line1<br/>Line2</span></p></body></tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('parses cue alignment from textAlign attribute', () => {
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            lineAlign: Cue.lineAlign.START,
            textAlign: Cue.textAlign.LEFT,
            positionAlign: Cue.positionAlign.LEFT,
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<styling>' +
        '<style xml:id="s1" tts:textAlign="left"/>' +
        '</styling>' +
        '<layout>' +
        '<region xml:id="subtitleArea" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200" style="s1">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('parses text style information', () => {
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            color: 'red',
            backgroundColor: 'blue',
            fontWeight: Cue.fontWeight.BOLD,
            fontFamily: 'Times New Roman',
            fontStyle: Cue.fontStyle.ITALIC,
            lineHeight: '20px',
            fontSize: '10em',
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<styling>' +
        '<style xml:id="s1" tts:color="red" ' +
        'tts:backgroundColor="blue" ' +
        'tts:fontWeight="bold" ' +
        'tts:fontFamily="Times New Roman" ' +
        'tts:fontStyle="italic" ' +
        'tts:lineHeight="20px" ' +
        'tts:fontSize="10em"/>' +
        '</styling>' +
        '<layout>' +
        '<region xml:id="subtitleArea" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200" style="s1">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('parses wrapping option', () => {
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            wrapLine: false,
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<styling>' +
        '<style xml:id="s1" tts:wrapOption="noWrap"/>' +
        '</styling>' +
        '<layout xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<region xml:id="subtitleArea" />' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200" style="s1">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('parses text decoration', () => {
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            textDecoration: [Cue.textDecoration.UNDERLINE,
              Cue.textDecoration.OVERLINE],
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<styling>' +
        '<style xml:id="s1" tts:textDecoration="underline ' +
        'overline lineThrough"/>' +
        '<style xml:id="s2" tts:textDecoration="noLineThrough"/>' +
        '</styling>' +
        '<layout>' +
        '<region xml:id="subtitleArea" style="s1"/>' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200" style="s2">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });

  it('chooses style on element over style on region', () => {
    verifyHelper(
        [
          {
            startTime: 62.05,
            endTime: 3723.2,
            payload: 'Test',
            color: 'blue',
          },
        ],
        '<tt xmlns:tts="http://www.w3.org/ns/ttml#styling">' +
        '<styling>' +
        '<style xml:id="s1" tts:color="red"/>' +
        '<style xml:id="s2" tts:color="blue"/>' +
        '</styling>' +
        '<layout>' +
        '<region xml:id="subtitleArea" style="s1"/>' +
        '</layout>' +
        '<body region="subtitleArea">' +
        '<p begin="01:02.05" end="01:02:03.200" style="s2">Test</p>' +
        '</body>' +
        '</tt>',
        {periodStart: 0, segmentStart: 0, segmentEnd: 0});
  });


  /**
   * @param {!Array} cues
   * @param {string} text
   * @param {shaka.extern.TextParser.TimeContext} time
   */
  function verifyHelper(cues, text, time) {
    const data = new Uint8Array(shaka.util.StringUtils.toUTF8(text));
    const result = new shaka.text.TtmlTextParser().parseMedia(data, time);

    const expected = cues.map((cue) => {
      if (cue.region) {
        cue.region = jasmine.objectContaining(cue.region);
      }
      return jasmine.objectContaining(cue);
    });
    expect(result).toEqual(expected);
  }


  /**
   * @param {shaka.util.Error.Code} code
   * @param {string} text
   */
  function errorHelper(code, text) {
    const error = shaka.test.Util.jasmineError(new shaka.util.Error(
        shaka.util.Error.Severity.CRITICAL, shaka.util.Error.Category.TEXT,
        code));
    const data = shaka.util.StringUtils.toUTF8(text);
    expect(() => {
      new shaka.text.TtmlTextParser().parseMedia(
          new Uint8Array(data),
          {periodStart: 0, segmentStart: 0, segmentEnd: 0});
    }).toThrow(error);
  }
});
