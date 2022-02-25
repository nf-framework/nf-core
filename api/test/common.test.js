import assert from 'assert';
import { describe, it } from 'mocha';

import * as testing from '../common.js';

describe('@nfjs/core/api/common', () => {
    describe('setPath()', () => {
        it('simple', () => {
            // Arrange
            const o = { some: 1 };
            // Act
            testing.setPath(o, 'another.some', 2);
            // Assert
            assert.strictEqual(o.another.some, 2);
        });
    });
    describe('getPath()', () => {
        it('simple', () => {
            // Arrange
            const o = { another: { some: 2 } };
            // Act
            const res = testing.getPath(o, 'another.some');
            // Assert
            assert.strictEqual(o.another.some, 2);
        });
    });
});
