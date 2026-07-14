import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Run cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock window.EyeDropper for JSDOM
class MockEyeDropper {
  open() {
    return Promise.resolve({ sRGBHex: '#ff0000' });
  }
}

Object.defineProperty(window, 'EyeDropper', {
  writable: true,
  configurable: true,
  value: MockEyeDropper,
});
