'use strict';

const Model = require('../../lib/local-model');
const { expect } = require('chai');

describe('Local Model', () => {
    let model;

    beforeEach(() => {
        model = new Model();
    });

    it('has `save`, `prepare`, `get`, `set` and `toJSON` methods', () => {
        model.get.should.be.a('function');
        model.set.should.be.a('function');
        model.toJSON.should.be.a('function');
    });

    it('has an attributes property of type object', () => {
        expect(model.attributes).to.be.an('object');
    });

    describe('constructor', () => {
        let Model;
        beforeEach(() => {
            Model = require('../../lib/local-model');
            sinon.stub(Model.prototype, 'set');
        });

        afterEach(() => {
            Model.prototype.set.restore();
        });

        it('sets attributes passed to self silently', () => {
            let model = new Model({ prop: 'value' });
            model.set.should.have.been.calledWith({prop: 'value'}, {silent: true});
        });
    });

    describe('get', () => {

        beforeEach(() => {
            model.attributes = {
                name: 'Test name'
            };
        });

        it('returns the property of the passed in key', () => {
            model.get('name').should.eql('Test name');
        });
    });

    describe('set', () => {

        beforeEach(() => {
            model = new Model({ name: 'Test name' });
        });

        it('adds a key to the model attributes if the key is a string', () => {
            model.set('age', 20);
            expect(model.attributes).to.eql({
                name: 'Test name',
                age: 20
            });
        });

        it('accepts an object as the key', () => {
            model.set( { placeOfBirth: 'London' } );
            expect(model.attributes).to.eql({
                name: 'Test name',
                placeOfBirth: 'London'
            });
        });

        it('accepts a Map as the key', () => {
            model.set( new Map([['placeOfBirth', 'London']]));
            expect(model.attributes).to.eql({
                name: 'Test name',
                placeOfBirth: 'London'
            });
        });

        it('emits a change event with the changed attributes', () => {
            let listener = sinon.stub();
            model.on('change', listener);
            model.set({
                foo: 'bar',
                bar: 'baz'
            });
            listener.should.have.been.calledOnce;
            listener.should.have.been.calledWithExactly({
                foo: 'bar',
                bar: 'baz'
            });
        });

        it('does not pass unchanged attributes to listener', () => {
            let listener = sinon.stub();
            model.set({
                foo: 'bar',
                bar: 'baz'
            });
            model.on('change', listener);
            model.set({
                bar: 'changed'
            });
            listener.should.have.been.calledOnce;
            listener.should.have.been.calledWithExactly({
                bar: 'changed'
            });
        });

        it('emits property specific change events', () => {
            let listener = sinon.stub();
            model.on('change:prop', listener);
            model.set('prop', 'value');
            listener.should.have.been.calledOnce;
            listener.should.have.been.calledWithExactly('value', undefined);
            listener.reset();
            model.set('prop', 'newvalue');
            listener.should.have.been.calledOnce;
            listener.should.have.been.calledWithExactly('newvalue', 'value');
            listener.reset();
            model.set('prop', 'newvalue');
            listener.should.not.have.been.called;
        });

        it('does not emit events if silent option is set to true', () => {
            let listener = sinon.stub();
            model.on('change', listener);
            model.on('change:prop', listener);
            model.set('prop', 'value', { silent: true });
            listener.should.not.have.been.called;
            model.set({ 'prop': 'value' }, { silent: true });
            listener.should.not.have.been.called;
        });
    });

    describe('unset', () => {

        beforeEach(() => {
            model.set({
                a: 1,
                b: 2,
                c: 3
            });
        });

        it('removes properties from model when passed a string', () => {
            model.unset('a');
            expect(model.toJSON()).to.eql({ b: 2, c: 3 });
        });

        it('removes properties from model when passed an array', () => {
            model.unset(['a', 'b']);
            expect(model.toJSON()).to.eql({ c: 3 });
        });

        it('does nothing if passed a property that does not exist', () => {
            model.unset('foo');
            expect(model.toJSON()).to.eql({ a: 1, b: 2, c: 3 });
        });

        it('emits a change event', () => {
            let listener = sinon.stub();
            model.on('change', listener);
            model.unset('a');
            listener.should.have.been.calledOnce;
            listener.should.have.been.calledWithExactly({ a: undefined });
        });

        it('emits property-specific change events', () => {
            let listener = sinon.stub();
            model.on('change:a', listener);
            model.unset('a');
            listener.should.have.been.calledOnce;
            listener.should.have.been.calledWithExactly(undefined, 1);
        });

        it('emits no events if passed silent: true', () => {
            let listener = sinon.stub();
            model.on('change', listener);
            model.on('change:a', listener);
            model.unset('a', { silent: true });
            listener.should.not.have.been.called;
        });

    });

    describe('increment', () => {

        it('throws if no property is defined', () => {
            let fn = () => {
                model.increment();
            };
            fn.should.throw();
        });

        it('throws if property is not a string', () => {
            let fn = () => {
                model.increment({});
            };
            fn.should.throw();
        });

        it('increases the defined property value by 1', () => {
            model.set('value', 1);
            model.increment('value');
            model.get('value').should.equal(2);
        });

        it('increases the defined property value by an amount specified', () => {
            model.set('value', 10);
            model.increment('value', 10);
            model.get('value').should.equal(20);
        });

        it('initialises value to 0 if value was previously undefined', () => {
            model.increment('value');
            model.get('value').should.equal(1);
        });
    });

    describe('reset', () => {

        beforeEach(() => {
            model.set({
                name: 'John',
                age: 30
            }, { silent: true });
        });

        it('clears model attributes', () => {
            model.reset();
            expect(model.toJSON()).to.eql({});
            expect(model.get('name')).to.be.undefined;
            expect(model.get('age')).to.be.undefined;
        });

        it('emits reset event', () => {
            let listener = sinon.stub();
            model.on('reset', listener);
            model.reset();
            listener.should.have.been.calledOnce;
        });

        it('emits property change events', () => {
            let listener1 = sinon.stub();
            let listener2 = sinon.stub();
            model.on('change:name', listener1);
            model.on('change:age', listener2);
            model.reset();
            listener1.should.have.been.calledOnce;
            listener1.should.have.been.calledWithExactly(undefined, 'John');
            listener2.should.have.been.calledOnce;
            listener2.should.have.been.calledWithExactly(undefined, 30);
        });

        it('emits no events if called with silent: true', () => {
            let listener = sinon.stub();
            model.on('reset', listener);
            model.on('change:name', listener);
            model.on('change:age', listener);
            model.reset({ silent: true });
            listener.should.not.have.been.called;
        });
    });

    describe('toJSON', () => {
        beforeEach(() => {
            model.attributes = {
                name: 'Test name'
            };
        });

        it('returns a bare object that\'s the same as the attributes property', () => {
            const result = model.toJSON(true);
            expect(result).to.eql({
                name: 'Test name'
            });

            expect(result.constructor).to.be.undefined;
        });

        it('returns an object that\'s the same as the attributes property with object prototype', () => {
            const result = model.toJSON();
            expect(result).to.eql({
                name: 'Test name'
            });

            expect(result.constructor).to.be.a('function');
        });
    });

});
