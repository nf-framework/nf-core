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
    describe('cloneDeep()', () => {
        it('primitives', () => {
            // Arrange
            const source = {a: 1, b: 'foo', c: true};
            // Act
            const res = testing.cloneDeep(source);
            // Assert
            assert.strictEqual(source === res, false);
            assert.deepStrictEqual(res, source);
        });
        it('date', () => {
            // Arrange
            const source = {a: new Date()};
            // Act
            const res = testing.cloneDeep(source);
            // Assert
            assert.strictEqual(source === res, false);
            assert.deepStrictEqual(res, source);
            assert.strictEqual(res.a instanceof Date, true);
        });
        it('array', () => {
            // Arrange
            const source = {a: [['a',1],['b','t'],['c',true]]};
            // Act
            const res = testing.cloneDeep(source);
            // Assert
            assert.strictEqual(source === res, false);
            assert.deepStrictEqual(res, source);
            assert.strictEqual(Array.isArray(res.a), true);
        });
        it('map', () => {
            // Arrange
            const source = {a: new Map([['a',1],['b','t'],['c',true]])};
            // Act
            const res = testing.cloneDeep(source);
            // Assert
            assert.strictEqual(source === res, false);
            assert.deepStrictEqual(res, source);
            assert.strictEqual(res.a instanceof Map, true);
        });
    });
});
