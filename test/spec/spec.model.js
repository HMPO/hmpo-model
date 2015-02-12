var http = require('http'),
    https = require('https'),
    util = require('util');

var Model = require('../../');

describe('Model model', function () {

    var model, cb, apiRequest, success;

    beforeEach(function () {
        model = new Model();
        cb = sinon.stub();
        apiRequest = {
            on: sinon.stub(),
            write: sinon.stub(),
            end: sinon.stub()
        };
        success = {
            statusCode: 200,
            pipe: function (s) {
                s.write('{ "message": "success" }');
                s.end();
            }
        };
        sinon.stub(http, 'request').returns(apiRequest);
        sinon.stub(https, 'request').returns(apiRequest);
    });

    afterEach(function () {
        http.request.restore();
        https.request.restore();
    });

    it('exports a constructor', function () {
        Model.should.be.a('function');
    });

    it('has `save`, `prepare`, `get`, `set` and `toJSON` methods', function () {
        model.save.should.be.a('function');
        model.prepare.should.be.a('function');
        model.get.should.be.a('function');
        model.set.should.be.a('function');
        model.toJSON.should.be.a('function');
    });

    it('has an attributes property of type object', function () {
        model.attributes.should.be.a('object');
    });

    describe('constructor', function () {

        it('sets attributes passed to self silently', function () {
            var listener = sinon.stub();
            var EventedModel = function (attrs, options) {
                this.on('change', listener);
                Model.call(this, attrs, options);
            };
            util.inherits(EventedModel, Model);
            var model = new EventedModel({ prop: 'value' });
            listener.should.not.have.been.called;
            model.get('prop').should.equal('value');
        });

    });

    describe('save', function () {

        beforeEach(function () {
            model.set('name', 'Test name');
            model.url = function () { return 'http://example.com:3002/foo/bar'; };
        });

        it('sends an http POST request to configured url containing model attributes as body', function () {
            model.save(cb);

            http.request.should.have.been.called;
            http.request.args[0][0].method.should.equal('POST');
            http.request.args[0][0].path.should.equal('/foo/bar');
            http.request.args[0][0].port.should.equal('3002');
            http.request.args[0][0].hostname.should.equal('example.com');

            apiRequest.write.should.have.been.calledWith('{"name":"Test name"}');
            apiRequest.end.should.have.been.called;
        });

        it('sends an https POST request if configured url is `https`', function () {
            model.url = function () { return 'https://secure-example.com/foo/bar'; };
            model.save(cb);

            https.request.should.have.been.called;
            https.request.args[0][0].method.should.equal('POST');
            https.request.args[0][0].path.should.equal('/foo/bar');
            https.request.args[0][0].hostname.should.equal('secure-example.com');

            apiRequest.write.should.have.been.calledWith('{"name":"Test name"}');
            apiRequest.end.should.have.been.called;
        });

        it('sends an http PUT request if method option is "PUT"', function () {
            model.save({ method: 'PUT' }, cb);

            http.request.should.have.been.called;
            http.request.args[0][0].method.should.equal('PUT');
            http.request.args[0][0].path.should.equal('/foo/bar');
            http.request.args[0][0].port.should.equal('3002');
            http.request.args[0][0].hostname.should.equal('example.com');

            apiRequest.write.should.have.been.calledWith('{"name":"Test name"}');
            apiRequest.end.should.have.been.called;
        });

        it('adds content type and length headers to request', function () {
            model.save(cb);
            http.request.should.have.been.called;
            http.request.args[0][0].headers['Content-Type'].should.equal('application/json');
            http.request.args[0][0].headers['Content-Length'].should.equal('{"name":"Test name"}'.length);
        });

        it('calls callback with an error if API response returns an error code', function (done) {
            http.request.yieldsAsync({
                statusCode: 500,
                pipe: function (s) {
                    s.write('{ "message": "error" }');
                    s.end();
                }
            });
            model.save(function (e) {
                e.should.eql({ status: 500, message: 'error' });
                done();
            });
        });

        it('calls callback with an error if http.request throws error event', function (done) {
            var err = new Error('Test error');
            apiRequest.on.withArgs('error').yields(err);
            model.save(function (e) {
                e.should.eql(err);
                done();
            });
        });

        it('calls callback with no error and json data if response has success code', function (done) {
            http.request.yieldsAsync(success);
            model.save(function (err, data) {
                expect(err).to.be.null;
                data.should.eql({ message: 'success' });
                done();
            });
        });

        it('passes returned data through parse method on success', function (done) {
            sinon.stub(model, 'parse').returns({ parsed: 'message' });
            http.request.yieldsAsync(success);
            model.save(function (err, data) {
                expect(err).to.be.null;
                model.parse.should.have.been.calledOnce;
                model.parse.should.have.been.calledWithExactly({ message: 'success' });
                data.should.eql({ parsed: 'message' });
                done();
            });
        });

        it('does not parse response on error', function (done) {
            http.request.yieldsAsync({
                statusCode: 500,
                pipe: function (s) {
                    s.write('{ "error": true }');
                    s.end();
                }
            });
            sinon.stub(model, 'parse');
            model.save(function (err, data) {
                model.parse.should.not.have.been.called;
                data.should.eql({ error: true });
                done();
            });
        });

        it('calls parseError on error to extract error status from response', function (done) {
            http.request.yieldsAsync({
                statusCode: 500,
                pipe: function (s) {
                    s.write('{ "error": true }');
                    s.end();
                }
            });
            sinon.stub(model, 'parseError').returns({ error: 'parsed' });
            model.save(function (err) {
                model.parseError.should.have.been.calledOnce;
                model.parseError.should.have.been.calledWithExactly(500, {error: true});
                err.should.eql({ error: 'parsed' });
                done();
            });
        });

        it('calls callback with error if response is not valid json', function (done) {
            http.request.yieldsAsync({
                statusCode: 200,
                pipe: function (s) {
                    s.write('success');
                    s.end();
                }
            });
            model.save(function (err, data) {
                err.should.be.an.instanceOf(Error);
                data.should.eql({});
                done();
            });
        });

        it('calls callback with error status if response is not valid json', function (done) {
            http.request.yieldsAsync({
                statusCode: 501,
                pipe: function (s) {
                    s.write('success');
                    s.end();
                }
            });
            model.save(function (err) {
                err.should.eql({ status: 501 });
                done();
            });
        });

        it('can handle optional options parameter', function (done) {
            http.request.yieldsAsync(success);
            model.url = sinon.stub().returns('http://example.com/');
            model.save({ url: 'foo' }, function () {
                done();
            });
        });

        it('passes options to url method if provided', function () {
            model.url = sinon.stub().returns('http://example.com/');
            model.save({ url: 'foo' }, cb);
            model.url.should.have.been.calledOnce;
            model.url.should.have.been.calledWithExactly({ url: 'foo' });
        });

        it('calls callback with error if parse fails', function (done) {
            model.parse = function () {
                throw new Error('parse');
            };
            http.request.yieldsAsync(success);
            model.save(function (err) {
                err.should.eql(new Error('parse'));
                done();
            });
        });

        it('includes auth setting if defined', function () {
            model.auth = sinon.stub().returns('user:pass');
            model.save(cb);
            http.request.args[0][0].auth.should.equal('user:pass');
        });

    });

    describe('fetch', function () {


        var cb;

        beforeEach(function () {
            cb = sinon.stub();
            model.url = function () { return 'http://example.com:3002/foo/bar'; };
        });

        it('sends an http GET request to API server', function () {
            model.fetch(cb);

            http.request.should.have.been.called;
            http.request.args[0][0].method.should.equal('GET');
            http.request.args[0][0].path.should.equal('/foo/bar');
            http.request.args[0][0].port.should.equal('3002');
            http.request.args[0][0].hostname.should.equal('example.com');

            apiRequest.write.should.not.have.been.called;
            apiRequest.end.should.have.been.called;
        });

        it('sends an https GET request if configured url is `https`', function () {
            model.url = function () { return 'https://secure-example.com/foo/bar'; };
            model.fetch(cb);

            https.request.should.have.been.called;
            https.request.args[0][0].method.should.equal('GET');
            https.request.args[0][0].path.should.equal('/foo/bar');
            https.request.args[0][0].hostname.should.equal('secure-example.com');

            apiRequest.write.should.not.have.been.called;
            apiRequest.end.should.have.been.called;
        });

        it('calls callback with an error if API response returns an error code', function (done) {
            http.request.yieldsAsync({
                statusCode: 500,
                pipe: function (s) {
                    s.write('{ "message": "error" }');
                    s.end();
                }
            });
            model.fetch(function (e) {
                e.should.eql({ status: 500, message: 'error' });
                done();
            });
        });

        it('calls callback with an error if http.request throws error event', function (done) {
            var err = new Error('Test error');
            apiRequest.on.withArgs('error').yields(err);
            model.fetch(function (e) {
                e.should.eql(err);
                done();
            });
        });

        it('calls callback with no error and json data if response has success code', function (done) {
            http.request.yieldsAsync(success);
            model.fetch(function (err, data) {
                expect(err).to.be.null;
                data.should.eql({ message: 'success' });
                done();
            });
        });

        it('passes returned data through parse method on success', function (done) {
            sinon.stub(model, 'parse').returns({ parsed: 'message' });
            http.request.yieldsAsync(success);
            model.fetch(function (err, data) {
                expect(err).to.be.null;
                model.parse.should.have.been.calledOnce;
                model.parse.should.have.been.calledWithExactly({ message: 'success' });
                data.should.eql({ parsed: 'message' });
                done();
            });
        });

        it('does not parse response on error', function (done) {
            http.request.yieldsAsync({
                statusCode: 500,
                pipe: function (s) {
                    s.write('{ "error": true }');
                    s.end();
                }
            });
            sinon.stub(model, 'parse');
            model.fetch(function (err, data) {
                model.parse.should.not.have.been.called;
                data.should.eql({ error: true });
                done();
            });
        });

        it('calls callback with raw data if it is not valid json', function (done) {
            http.request.yieldsAsync({
                statusCode: 200,
                pipe: function (s) {
                    s.write('success');
                    s.end();
                }
            });
            model.fetch(function (err, data) {
                expect(err).to.be.null;
                data.should.eql('success');
                done();
            });
        });

        it('calls callback with error status if response is not valid json', function (done) {
            http.request.yieldsAsync({
                statusCode: 501,
                pipe: function (s) {
                    s.write('success');
                    s.end();
                }
            });
            model.fetch(function (err) {
                err.should.eql({ status: 501 });
                done();
            });
        });

        it('passes options to url method if provided', function () {
            model.url = sinon.stub().returns('http://example.com/');
            model.fetch({ url: 'foo' }, cb);
            model.url.should.have.been.calledOnce;
            model.url.should.have.been.calledWithExactly({ url: 'foo' });
        });

        it('calls callback with error if parse fails', function (done) {
            model.parse = function () {
                throw new Error('parse');
            };
            http.request.yieldsAsync(success);
            model.fetch(function (err) {
                err.should.eql(new Error('parse'));
                done();
            });
        });

        it('includes auth setting if defined', function () {
            model.auth = sinon.stub().returns('user:pass');
            model.fetch(cb);
            http.request.args[0][0].auth.should.equal('user:pass');
        });

    });

    describe('delete', function () {

        var cb;

        beforeEach(function () {
            cb = sinon.stub();
            model.url = function () { return 'http://example.com:3002/foo/bar'; };
        });

        it('sends an http DELETE request to API server', function () {
            model.delete(cb);

            http.request.should.have.been.called;
            http.request.args[0][0].method.should.equal('DELETE');
            http.request.args[0][0].path.should.equal('/foo/bar');
            http.request.args[0][0].port.should.equal('3002');
            http.request.args[0][0].hostname.should.equal('example.com');

            apiRequest.write.should.not.have.been.called;
            apiRequest.end.should.have.been.called;
        });

        it('sends an https DELETE request if configured url is `https`', function () {
            model.url = function () { return 'https://secure-example.com/foo/bar'; };
            model.delete(cb);

            https.request.should.have.been.called;
            https.request.args[0][0].method.should.equal('DELETE');
            https.request.args[0][0].path.should.equal('/foo/bar');
            https.request.args[0][0].hostname.should.equal('secure-example.com');

            apiRequest.write.should.not.have.been.called;
            apiRequest.end.should.have.been.called;
        });

        it('calls callback with an error if API response returns an error code', function (done) {
            http.request.yieldsAsync({
                statusCode: 500,
                pipe: function (s) {
                    s.write('{ "message": "error" }');
                    s.end();
                }
            });
            model.delete(function (e) {
                e.should.eql({ status: 500, message: 'error' });
                done();
            });
        });

        it('calls callback with an error if http.request throws error event', function (done) {
            var err = new Error('Test error');
            apiRequest.on.withArgs('error').yields(err);
            model.delete(function (e) {
                e.should.eql(err);
                done();
            });
        });

        it('calls callback with no error and json data if response has success code', function (done) {
            http.request.yieldsAsync(success);
            model.delete(function (err, data) {
                expect(err).to.be.null;
                data.should.eql({ message: 'success' });
                done();
            });
        });

        it('passes returned data through parse method on success', function (done) {
            sinon.stub(model, 'parse').returns({ parsed: 'message' });
            http.request.yieldsAsync(success);
            model.delete(function (err, data) {
                expect(err).to.be.null;
                model.parse.should.have.been.calledOnce;
                model.parse.should.have.been.calledWithExactly({ message: 'success' });
                data.should.eql({ parsed: 'message' });
                done();
            });
        });

        it('does not parse response on error', function (done) {
            http.request.yieldsAsync({
                statusCode: 500,
                pipe: function (s) {
                    s.write('{ "error": true }');
                    s.end();
                }
            });
            sinon.stub(model, 'parse');
            model.delete(function (err, data) {
                model.parse.should.not.have.been.called;
                data.should.eql({ error: true });
                done();
            });
        });

        it('calls callback with raw data if it is not valid json', function (done) {
            http.request.yieldsAsync({
                statusCode: 200,
                pipe: function (s) {
                    s.write('success');
                    s.end();
                }
            });
            model.delete(function (err, data) {
                expect(err).to.be.null;
                data.should.eql('success');
                done();
            });
        });

        it('calls callback with error status if response is not valid json', function (done) {
            http.request.yieldsAsync({
                statusCode: 501,
                pipe: function (s) {
                    s.write('success');
                    s.end();
                }
            });
            model.delete(function (err) {
                err.should.eql({ status: 501 });
                done();
            });
        });

        it('passes options to url method if provided', function () {
            model.url = sinon.stub().returns('http://example.com/');
            model.delete({ url: 'foo' }, cb);
            model.url.should.have.been.calledOnce;
            model.url.should.have.been.calledWithExactly({ url: 'foo' });
        });

        it('calls callback with error if parse fails', function (done) {
            model.parse = function () {
                throw new Error('parse');
            };
            http.request.yieldsAsync(success);
            model.delete(function (err) {
                err.should.eql(new Error('parse'));
                done();
            });
        });


    });

    describe('prepare', function () {

        beforeEach(function () {
            sinon.stub(model, 'toJSON').returns( {name: 'Test name'} );
        });

        afterEach(function () {
            model.toJSON.restore();
        });

        it('returns JSON data', function () {

            var cb = sinon.stub();
            model.prepare(cb);
            cb.should.have.been.calledOnce;
            cb.should.have.been.calledWith(null, {
                name: 'Test name'
            });
        });
    });

    describe('get', function () {

        beforeEach(function () {
            model.attributes = {
                name: 'Test name'
            };
        });

        it('returns the property of the passed in key', function () {
            model.get('name').should.eql('Test name');
        });
    });

    describe('set', function () {

        beforeEach(function () {
            model.attributes = {
                name: 'Test name'
            };
        });

        it('adds a key to the model attributes if the key is a string', function () {
            model.set('age', 20).attributes.should.eql({
                name: 'Test name',
                age: 20
            });
        });

        it('accepts an object as the key', function () {
            model.set( { placeOfBirth: 'London' } ).attributes.should.eql({
                name: 'Test name',
                placeOfBirth: 'London'
            });
        });

        it('emits a change event with the changed attributes', function () {
            var listener = sinon.stub();
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

        it('does not pass unchanged attributes to listener', function () {
            var listener = sinon.stub();
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

        it('emits property specific change events', function () {
            var listener = sinon.stub();
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

        it('does not emit events if silent option is set to true', function () {
            var listener = sinon.stub();
            model.on('change', listener);
            model.on('change:prop', listener);
            model.set('prop', 'value', { silent: true });
            listener.should.not.have.been.called;
            model.set({ 'prop': 'value' }, { silent: true });
            listener.should.not.have.been.called;
        });

    });

    describe('unset', function () {

        beforeEach(function () {
            model.set({
                a: 1,
                b: 2,
                c: 3
            });
        });

        it('removes properties from model when passed a string', function () {
            model.unset('a');
            model.toJSON().should.eql({ b: 2, c: 3 });
        });

        it('removes properties from model when passed an array', function () {
            model.unset(['a', 'b']);
            model.toJSON().should.eql({ c: 3 });
        });

        it('does nothing if passed a property that does not exist', function () {
            model.unset('foo');
            model.toJSON().should.eql({ a: 1, b: 2, c: 3 });
        });

        it('emits a change event', function () {
            var listener = sinon.stub();
            model.on('change', listener);
            model.unset('a');
            listener.should.have.been.calledOnce;
            listener.should.have.been.calledWithExactly({ a: undefined });
        });

        it('emits property-specific change events', function () {
            var listener = sinon.stub();
            model.on('change:a', listener);
            model.unset('a');
            listener.should.have.been.calledOnce;
            listener.should.have.been.calledWithExactly(undefined, 1);
        });

        it('emits no events if passed silent: true', function () {
            var listener = sinon.stub();
            model.on('change', listener);
            model.on('change:a', listener);
            model.unset('a', { silent: true });
            listener.should.not.have.been.called;
        });

    });

    describe('increment', function () {

        it('throws if no property is defined', function () {
            var fn = function () {
                model.increment();
            };
            fn.should.throw();
        });

        it('throws if property is not a string', function () {
            var fn = function () {
                model.increment({});
            };
            fn.should.throw();
        });

        it('increases the defined property value by 1', function () {
            model.set('value', 1);
            model.increment('value');
            model.get('value').should.equal(2);
        });

        it('increases the defined property value by an amount specified', function () {
            model.set('value', 10);
            model.increment('value', 10);
            model.get('value').should.equal(20);
        });

        it('initialises value to 0 if value was previously undefined', function () {
            model.increment('value');
            model.get('value').should.equal(1);
        });

    });

    describe('reset', function () {

        beforeEach(function () {
            model.set({
                name: 'John',
                age: 30
            }, { silent: true });
        });

        it('clears model attributes', function () {
            model.reset();
            model.toJSON().should.eql({});
            expect(model.get('name')).to.be.undefined;
            expect(model.get('age')).to.be.undefined;
        });

        it('emits reset event', function () {
            var listener = sinon.stub();
            model.on('reset', listener);
            model.reset();
            listener.should.have.been.calledOnce;
        });

        it('emits property change events', function () {
            var listener1 = sinon.stub();
            var listener2 = sinon.stub();
            model.on('change:name', listener1);
            model.on('change:age', listener2);
            model.reset();
            listener1.should.have.been.calledOnce;
            listener1.should.have.been.calledWithExactly(undefined);
            listener2.should.have.been.calledOnce;
            listener2.should.have.been.calledWithExactly(undefined);
        });

        it('emits no events if called with silent: true', function () {
            var listener = sinon.stub();
            model.on('reset', listener);
            model.on('change:name', listener);
            model.on('change:age', listener);
            model.reset({ silent: true });
            listener.should.not.have.been.called;
        });

    });

    describe('toJSON', function () {

        beforeEach(function () {
            model.attributes = {
                name: 'Test name'
            };
        });

        it('returns an object that\'s the same as the attributes property', function () {
            model.toJSON().should.eql({
                name: 'Test name'
            });
        });
    });

    describe('url', function () {

        it('returns options.url by default', function () {
            model.url({ url: 'http://example.com/' }).should.equal('http://example.com/');
        });

        it('extends url passed with options', function () {
            var output = model.url({
                url: 'http://example.com',
                query: {
                    foo: 'bar'
                },
                port: 3000
            });
            output.should.equal('http://example.com:3000/?foo=bar');
        });

    });

    describe('parse', function () {

        it('returns data passed', function () {
            model.parse({ data: 1 }).should.eql({ data: 1 });
        });

    });

    describe('parseError', function () {

        it('returns data passed extednded with the status code', function () {
            model.parseError(500, { data: 1 }).should.eql({ status: 500, data: 1 });
            model.parseError(400, { data: 'message' }).should.eql({ status: 400, data: 'message' });
        });

    });

});