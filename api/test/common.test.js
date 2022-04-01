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
    describe('clearObj()', () => {
        it('default', () => {
            // Arrange
            const source = {a_: 1, b__: 'foo', __c: true};
            // Act
            testing.clearObj(source);
            // Assert
            assert.strictEqual(source.__c, undefined);
            assert.strictEqual(source.b__, 'foo');
            assert.strictEqual(source.a_, 1);
        });
        it('multiple', () => {
            // Arrange
            const source = {a_: 1, b__: 'foo', __c: true, _d: new Date()};
            // Act
            testing.clearObj(source, ['__','_']);
            // Assert
            assert.strictEqual(source.__c, undefined);
            assert.strictEqual(source._d, undefined);
            assert.strictEqual(source.b__, 'foo');
            assert.strictEqual(source.a_, 1);
        });
        it('recursive', () => {
            // Arrange
            const source = {a_: 1, b__: {__ba: 'foo', bb__: 'bar'}, __c: true};
            // Act
            testing.clearObj(source);
            // Assert
            assert.strictEqual(source.__c, undefined);
            assert.strictEqual(source.b__.__ba, undefined);
            assert.strictEqual(source.b__.bb__, 'bar');
            assert.strictEqual(source.a_, 1);
        });
    });
});
