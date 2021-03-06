// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* eslint-disable import/first */
jest.mock('./conv-raven-to-ga', () => () => ({ message: 'jaeger/a' }));

jest.mock('./index', () => {
  process.env.REACT_APP_VSN_STATE = '{}';
  return require.requireActual('./index');
});

import ReactGA from 'react-ga';

import * as tracking from './index';

let longStr = '---';
function getStr(len: number) {
  while (longStr.length < len) {
    longStr += longStr.slice(0, len - longStr.length);
  }
  return longStr.slice(0, len);
}

describe('tracking', () => {
  let calls;

  beforeEach(() => {
    calls = ReactGA.testModeAPI.calls;
    calls.length = 0;
  });

  describe('trackPageView', () => {
    it('tracks a page view', () => {
      tracking.trackPageView('a', 'b');
      expect(calls).toEqual([['send', { hitType: 'pageview', page: 'ab' }]]);
    });

    it('ignores search when it is falsy', () => {
      tracking.trackPageView('a');
      expect(calls).toEqual([['send', { hitType: 'pageview', page: 'a' }]]);
    });
  });

  describe('trackError', () => {
    it('tracks an error', () => {
      tracking.trackError('a');
      expect(calls).toEqual([
        ['send', { hitType: 'exception', exDescription: jasmine.any(String), exFatal: false }],
      ]);
    });

    it('ensures "jaeger" is prepended', () => {
      tracking.trackError('a');
      expect(calls).toEqual([['send', { hitType: 'exception', exDescription: 'jaeger/a', exFatal: false }]]);
    });

    it('truncates if needed', () => {
      const str = `jaeger/${getStr(200)}`;
      tracking.trackError(str);
      expect(calls).toEqual([
        ['send', { hitType: 'exception', exDescription: str.slice(0, 149), exFatal: false }],
      ]);
    });
  });

  describe('trackEvent', () => {
    it('tracks an event', () => {
      tracking.trackEvent({ value: 10 });
      expect(calls).toEqual([
        [
          'send',
          {
            hitType: 'event',
            eventCategory: jasmine.any(String),
            eventAction: jasmine.any(String),
            eventValue: 10,
          },
        ],
      ]);
    });

    it('prepends "jaeger/" to the category, if needed', () => {
      tracking.trackEvent({ category: 'a' });
      expect(calls).toEqual([
        ['send', { hitType: 'event', eventCategory: 'jaeger/a', eventAction: jasmine.any(String) }],
      ]);
    });

    it('truncates values, if needed', () => {
      const str = `jaeger/${getStr(600)}`;
      tracking.trackEvent({ category: str, action: str, label: str });
      expect(calls).toEqual([
        [
          'send',
          {
            hitType: 'event',
            eventCategory: str.slice(0, 149),
            eventAction: str.slice(0, 499),
            eventLabel: str.slice(0, 499),
          },
        ],
      ]);
    });
  });

  it('converting raven-js errors', () => {
    window.onunhandledrejection({ reason: new Error('abc') });
    expect(calls).toEqual([
      ['send', { hitType: 'exception', exDescription: jasmine.any(String), exFatal: false }],
      ['send', { hitType: 'event', eventCategory: jasmine.any(String), eventAction: jasmine.any(String) }],
    ]);
  });
});
