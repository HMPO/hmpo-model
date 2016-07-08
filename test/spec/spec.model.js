var util = require('util'),
    url = require('url');

var Model = require('../../');

describe('Model model', function () {

    var model, cb, apiRequest, error, success, empty, fail, invalid;

    beforeEach(function () {
        model = new Model();
        cb = sinon.stub();
        apiRequest = {};
        error = new Error('An Error');
        error.status = 500;
        success = {
            statusCode: 200,
            body: '{ "message": "success" }'
        };
        empty = {
            statusCode: 200,
            body: ''
        };
        fail = {
            statusCode: 500,
            body: '{ "message": "error" }'
        };
        invalid = {
            statusCode: 200,
            body: 'invalid'
        };
        sinon.stub(Model, '_request').returns(apiRequest);

        sinon.spy(model, 'parseResponse');

    });

    afterEach(function () {
        Model._request.restore();
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

    describe('request', function () {
        var settings,
            bodyData;

        beforeEach(function () {
            bodyData = '{"name":"Test name"}';

            settings = url.parse('http://example.com:3002/foo/bar');
            settings.method = 'POST';
        });

        it('sends an http POST request to requested url with data in settings', function (done) {
            Model._request.yieldsAsync(success);
            settings.data = bodyData;

            model.request(settings, cb);

            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.method.should.equal('POST');
            options.uri.should.equal('http://example.com:3002/foo/bar');
            options.body.should.equal('{"name":"Test name"}');
            process.nextTick(function () {
                cb.should.have.been.calledOnce;
                cb.should.have.been.calledWith(success);
                done();
            });
        });

        it('sends an http POST request to requested url with data passed as argument', function (done) {
            Model._request.yieldsAsync(success);

            model.request(settings, bodyData, cb);

            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.method.should.equal('POST');
            options.uri.should.equal('http://example.com:3002/foo/bar');
            options.body.should.equal('{"name":"Test name"}');
            process.nextTick(function () {
                cb.should.have.been.calledOnce;
                cb.should.have.been.calledWith(success);
                done();
            });
        });

        it('sends an http POST request to requested url with data passed as argument and no callback given', function () {
            Model._request.yieldsAsync(success);

            model.request(settings, bodyData);

            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.method.should.equal('POST');
            options.uri.should.equal('http://example.com:3002/foo/bar');
            options.body.should.equal('{"name":"Test name"}');
        });

        it('sends an http GET request to requested url and no callback given', function () {
            Model._request.yieldsAsync(success);
            settings = url.parse('http://example.com:3002/foo/bar');
            settings.method = 'GET';

            model.request(settings);

            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.method.should.equal('GET');
            options.uri.should.equal('http://example.com:3002/foo/bar');
            expect(options.body).to.not.be.ok;
        });

        it('can parse failiure when no callback given', function (done) {
            Model._request.yieldsAsync(fail);

            model.request(settings, bodyData);

            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.method.should.equal('POST');
            options.uri.should.equal('http://example.com:3002/foo/bar');
            options.body.should.equal('{"name":"Test name"}');

            process.nextTick(function () {
                cb.should.not.have.been.called;
                done();
            });
        });

        it('can parse failiure when no data or callback given', function (done) {
            Model._request.yieldsAsync(fail);

            model.request(settings);

            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.method.should.equal('POST');
            options.uri.should.equal('http://example.com:3002/foo/bar');
            expect(options.body).to.not.be.ok;

            model.on('fail', cb);

            process.nextTick(function () {
                cb.should.have.been.calledOnce;
                cb.should.have.been.calledWith(fail);
                done();
            });
        });

        it('sets the timeout from model options', function () {
            model.options.timeout = 100;

            model.request(settings, cb);

            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.timeout.should.equal(100);
        });

        it('sets the timeout from request options', function () {
            settings.timeout = 100;

            model.request(settings, cb);

            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.timeout.should.equal(100);
        });

    });

    describe('save', function () {

        beforeEach(function () {
            model.set('name', 'Test name');
            model.url = function () { return 'http://example.com:3002/foo/bar'; };
        });

        it('sends an http POST request to configured url containing model attributes as body', function () {
            model.save(cb);

            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.method.should.equal('POST');
            options.uri.should.equal('http://example.com:3002/foo/bar');
            options.body.should.equal('{"name":"Test name"}');
        });

        it('sends an https POST request if configured url is `https`', function () {
            model.url = function () { return 'https://secure-example.com/foo/bar'; };
            model.save(cb);

            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.method.should.equal('POST');
            options.uri.should.equal('https://secure-example.com/foo/bar');
            options.body.should.equal('{"name":"Test name"}');
        });

        it('sends an http PUT request if method option is "PUT"', function () {
            model.save({ method: 'PUT' }, cb);

            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.method.should.equal('PUT');
            options.uri.should.equal('http://example.com:3002/foo/bar');
            options.body.should.equal('{"name":"Test name"}');
        });

        it('adds content type and length headers to request', function () {
            model.set('name', 'Test name - ハセマペヨ');
            model.save(cb);
            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.headers['Content-Type'].should.equal('application/json');
            options.headers['Content-Length'].should.equal(38);
        });

        it('calls callback with an error if API response returns an error code', function (done) {
            Model._request.yieldsAsync(null, fail);
            model.save(function (e, data, responseTime) {
                e.should.eql({ status: 500, message: 'error' });
                responseTime.should.be.a('number');
                done();
            });
        });

        it('calls callback with an error if request throws error event', function (done) {
            Model._request.yieldsAsync(error);
            model.save(function (e, data, responseTime) {
                e.should.eql(error);
                responseTime.should.be.a('number');
                done();
            });
        });

        it('calls callback with no error and json data if response has success code', function (done) {
            Model._request.yieldsAsync(null, success);
            model.save(function (err, data, responseTime) {
                expect(err).to.be.null;
                data.should.eql({ message: 'success' });
                responseTime.should.be.a('number');
                done();
            });
        });

        it('passes returned data through parse method on success', function (done) {
            sinon.stub(model, 'parse').returns({ parsed: 'message' });
            Model._request.yieldsAsync(null, success);
            model.save(function (err, data, responseTime) {
                expect(err).to.be.null;
                model.parse.should.have.been.calledOnce;
                model.parse.should.have.been.calledWithExactly({ message: 'success' });
                data.should.eql({ parsed: 'message' });
                responseTime.should.be.a('number');
                done();
            });
        });

        it('does not parse response on error', function (done) {
            Model._request.yieldsAsync(null, fail);
            sinon.stub(model, 'parse');
            model.save(function (err, data, responseTime) {
                model.parse.should.not.have.been.called;
                data.should.eql({ message: 'error' });
                responseTime.should.be.a('number');
                done();
            });
        });

        it('calls parseError on error to extract error status from response', function (done) {
            Model._request.yieldsAsync(null, fail);
            sinon.stub(model, 'parseError').returns({ error: 'parsed' });
            model.save(function (err, data, responseTime) {
                model.parseError.should.have.been.calledOnce;
                model.parseError.should.have.been.calledWithExactly(500, { message: 'error' });
                err.should.eql({ error: 'parsed' });
                responseTime.should.be.a('number');
                done();
            });
        });

        it('calls callback with error if response is not valid json', function (done) {
            Model._request.yieldsAsync(null, invalid);
            model.save(function (err, data, responseTime) {
                err.should.be.an.instanceOf(Error);
                err.status.should.equal(200);
                err.body.should.equal('invalid');
                expect(data).to.be.null;
                responseTime.should.be.a('number');
                done();
            });
        });

        it('can handle optional options parameter', function (done) {
            Model._request.yieldsAsync(success);
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

        it('can handle a parsed URL object', function () {
            var url = {
                protocol: 'http:',
                port: '1234',
                hostname: 'proxy-example.com',
                pathname: '/'
            };
            model.url = sinon.stub().returns(url);
            model.save(cb);
            Model._request.should.have.been.called;
            Model._request.args[0][0].uri.should.equal('http://proxy-example.com:1234/');
        });

        it('calls callback with error if parse fails', function (done) {
            model.parse = function () {
                throw new Error('parse');
            };
            Model._request.yieldsAsync(null, success);
            model.save(function (err, data, responseTime) {
                err.should.eql(new Error('parse'));
                responseTime.should.be.a('number');
                done();
            });
        });

        it('allows custom headers', function () {
            var endPoint = url.parse('http://proxy-example.com:1234');
            endPoint.headers = {
                Host: url.parse('http://example.com/').host
            };
            model.url = sinon.stub().returns(endPoint);
            model.save(cb);
            Model._request.args[0][0].headers['Content-Type'].should.equal('application/json');
            Model._request.args[0][0].headers.Host.should.equal('example.com');
        });

        it('includes auth setting if defined', function () {
            model.auth = sinon.stub().returns('user:pass');
            model.save(cb);
            Model._request.args[0][0].auth.should.deep.equal({
                user: 'user',
                pass: 'pass',
                sendImmediately: true
            });
        });

        it('emits a "sync" event', function () {
            var sync = sinon.stub();
            model.on('sync', sync);
            model.save(function () {});
            sync.should.have.been.calledOnce;
            sync.should.have.been.calledWith(sinon.match({ method: 'POST' }));
        });

        it('emits a "fail" event on error', function (done) {
            Model._request.yieldsAsync(null, fail);
            model.on('fail', function (err, data, settings, statusCode, responseTime) {
                err.should.eql({ message: 'error', status: 500 });
                data.should.eql({ message: 'error' });
                settings.method.should.equal('POST');
                statusCode.should.equal(500);
                responseTime.should.be.a('number');
                done();
            });
            model.save(function () {});
        });

        it('emits a "success" event on success', function (done) {
            Model._request.yieldsAsync(null, success);
            model.on('success', function (data, settings, statusCode, responseTime) {
                data.should.eql({ message: 'success' });
                settings.method.should.equal('POST');
                statusCode.should.equal(200);
                responseTime.should.be.a('number');
                done();
            });
            model.save(function () {});
        });

        it('allows an empty response body', function (done) {
            Model._request.yieldsAsync(null, empty);
            model.save(function (err, data, responseTime) {
                expect(err).to.be.null;
                data.should.eql({});
                responseTime.should.be.a('number');
                done();
            });
        });

        it('passes statusCode, response body and callback to `parseResponse`', function (done) {
            Model._request.yieldsAsync(null, success);
            model.save(function () {
                model.parseResponse.should.have.been.calledWith(200, { message: 'success' }, sinon.match.func);
                done();
            });
        });

        it('ignores callback if one is not given on success', function () {
            Model._request.yieldsAsync(null, success);
            expect(function () {
                model.save();
            }).to.not.throw;
        });

        it('ignores callback if one is not given if API response returns an error code', function () {
            Model._request.yieldsAsync(null, fail);
            expect(function () {
                model.save();
            }).to.not.throw;
        });

    });

    describe('fetch', function () {

        var cb;

        beforeEach(function () {
            cb = sinon.stub();
            model.url = function () { return 'http://example.com:3002/foo/bar'; };
        });

        it('sends an http GET request to API server', function (done) {
            Model._request.yieldsAsync(null, success);

            model.fetch(cb);

            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.method.should.equal('GET');
            options.uri.should.equal('http://example.com:3002/foo/bar');
            process.nextTick(function () {
                cb.should.have.been.calledOnce;
                cb.should.have.been.calledWithExactly(null, { message: 'success' }, sinon.match.number);
                done();
            });
        });

        it('calls callback with an error if API response returns an error code', function (done) {
            Model._request.yieldsAsync(null, fail);
            model.fetch(function (e, data, responseTime) {
                e.should.eql({ status: 500, message: 'error' });
                responseTime.should.be.a('number');
                done();
            });
        });

        it('calls callback with an error if Model._request throws error event', function (done) {
            Model._request.yieldsAsync(error, fail);
            model.fetch(function (e, data, responseTime) {
                e.should.eql(error);
                responseTime.should.be.a('number');
                done();
            });
        });

        it('calls callback with no error and json data if response has success code', function (done) {
            Model._request.yieldsAsync(null, success);
            model.fetch(function (err, data, responseTime) {
                expect(err).to.be.null;
                data.should.eql({ message: 'success' });
                responseTime.should.be.a('number');
                done();
            });
        });

        it('passes returned data through parse method on success', function (done) {
            sinon.stub(model, 'parse').returns({ parsed: 'message' });
            Model._request.yieldsAsync(null, success);
            model.fetch(function (err, data, responseTime) {
                expect(err).to.be.null;
                model.parse.should.have.been.calledOnce;
                model.parse.should.have.been.calledWithExactly({ message: 'success' });
                data.should.eql({ parsed: 'message' });
                responseTime.should.be.a('number');
                done();
            });
        });

        it('does not parse response on error', function (done) {
            Model._request.yieldsAsync(null, fail);
            sinon.stub(model, 'parse');
            model.fetch(function (err, data, responseTime) {
                model.parse.should.not.have.been.called;
                data.should.eql({ message: 'error' });
                responseTime.should.be.a('number');
                done();
            });
        });

        it('calls callback with error if response is not valid json', function (done) {
            Model._request.yieldsAsync(null, invalid);
            model.fetch(function (err, data, responseTime) {
                err.should.be.an.instanceOf(Error);
                err.status.should.equal(200);
                err.body.should.equal('invalid');
                expect(data).to.be.null;
                responseTime.should.be.a('number');
                done();
            });
        });

        it('passes options to url method if provided', function () {
            model.url = sinon.stub().returns('http://example.com/');
            model.fetch({ url: 'foo' }, cb);
            model.url.should.have.been.calledOnce;
            model.url.should.have.been.calledWithExactly({ url: 'foo' });
        });

        it('can handle a parsed URL object', function () {
            var url = {
                protocol: 'http:',
                port: '1234',
                hostname: 'proxy-example.com',
                pathname: '/'
            };
            model.url = sinon.stub().returns(url);
            model.fetch(cb);
            Model._request.should.have.been.called;
            Model._request.args[0][0].uri.should.equal('http://proxy-example.com:1234/');
        });

        it('allows custom headers', function () {
            var endPoint = url.parse('http://proxy-example.com:1234');
            endPoint.headers = {
                Host: url.parse('http://example.com/').host
            };
            model.url = sinon.stub().returns(endPoint);
            model.fetch(cb);
            Model._request.args[0][0].headers.Host.should.equal('example.com');
        });

        it('calls callback with error if parse fails', function (done) {
            model.parse = function () {
                throw new Error('parse');
            };
            Model._request.yieldsAsync(null, success);
            model.fetch(function (err, data, responseTime) {
                err.should.eql(new Error('parse'));
                responseTime.should.be.a('number');
                done();
            });
        });

        it('includes auth setting if defined', function () {
            model.auth = sinon.stub().returns('user:pass');
            model.fetch(cb);
            Model._request.args[0][0].auth.should.deep.equal({
                user: 'user',
                pass: 'pass',
                sendImmediately: true
            });
        });

        it('emits a "sync" event', function () {
            var sync = sinon.stub();
            model.on('sync', sync);
            model.fetch(function () {});
            sync.should.have.been.calledOnce;
            sync.should.have.been.calledWith(sinon.match({ method: 'GET' }));
        });

        it('emits a "fail" event on failure', function (done) {
            Model._request.yieldsAsync(null, fail);
            model.on('fail', function (err, data, settings, statusCode, responseTime) {
                err.should.eql({ message: 'error', status: 500 });
                data.should.eql({ message: 'error' });
                settings.method.should.equal('GET');
                statusCode.should.equal(500);
                responseTime.should.be.a('number');
                done();
            });
            model.fetch(function () {});
        });

        it('emits a "fail" event on error', function (done) {
            Model._request.yieldsAsync(error);
            model.on('fail', function (err, data, settings, statusCode, responseTime) {
                err.should.eql(error);
                expect(data).to.be.null;
                settings.method.should.equal('GET');
                statusCode.should.equal(500);
                responseTime.should.be.a('number');
                done();
            });
            model.fetch(function () {});
        });

        it('emits a "success" event on success', function (done) {
            Model._request.yieldsAsync(null, success);
            model.on('success', function (data, settings, statusCode, responseTime) {
                data.should.eql({ message: 'success' });
                settings.method.should.equal('GET');
                statusCode.should.equal(200);
                responseTime.should.be.a('number');
                done();
            });
            model.fetch(function () {});
        });

        it('allows an empty response body', function (done) {
            Model._request.yieldsAsync(null, empty);
            model.fetch(function (err, data, responseTime) {
                expect(err).to.be.null;
                data.should.eql({});
                responseTime.should.be.a('number');
                done();
            });
        });

        it('passes statusCode, response body and callback to `parseResponse`', function (done) {
            Model._request.yieldsAsync(null, success);
            model.fetch(function () {
                model.parseResponse.should.have.been.calledWith(200, { message: 'success' }, sinon.match.func);
                done();
            });
        });

        it('ignores callback if one is not given on success', function () {
            Model._request.yieldsAsync(null, success);
            expect(function () {
                model.fetch();
            }).to.not.throw;
        });

        it('ignores callback if one not given if API response returns an error code', function () {
            Model._request.yieldsAsync(null, fail);
            expect(function () {
                model.fetch();
            }).to.not.throw;
        });
    });

    describe('delete', function () {

        var cb;

        beforeEach(function () {
            cb = sinon.stub();
            model.url = function () { return 'http://example.com:3002/foo/bar'; };
        });

        it('sends an http DELETE request to API server', function (done) {
            Model._request.yieldsAsync(null, success);

            model.delete(cb);

            Model._request.should.have.been.calledOnce;
            var options = Model._request.args[0][0];
            options.method.should.equal('DELETE');
            options.uri.should.equal('http://example.com:3002/foo/bar');
            process.nextTick(function () {
                cb.should.have.been.calledOnce;
                cb.should.have.been.calledWithExactly(null, { message: 'success' }, sinon.match.number);
                done();
            });
        });

        it('calls callback with an error if API response returns an error code', function (done) {
            Model._request.yieldsAsync(null, fail);
            model.delete(function (e, data, responseTime) {
                e.should.eql({ status: 500, message: 'error' });
                responseTime.should.be.a('number');
                done();
            });
        });

        it('calls callback with an error if Model._request throws error event', function (done) {
            Model._request.yieldsAsync(error, fail);
            model.delete(function (e, data, responseTime) {
                e.should.eql(error);
                responseTime.should.be.a('number');
                done();
            });
        });

        it('calls callback with no error and json data if response has success code', function (done) {
            Model._request.yieldsAsync(null, success);
            model.delete(function (err, data, responseTime) {
                expect(err).to.be.null;
                data.should.eql({ message: 'success' });
                responseTime.should.be.a('number');
                done();
            });
        });

        it('passes returned data through parse method on success', function (done) {
            sinon.stub(model, 'parse').returns({ parsed: 'message' });
            Model._request.yieldsAsync(null, success);
            model.delete(function (err, data, responseTime) {
                expect(err).to.be.null;
                model.parse.should.have.been.calledOnce;
                model.parse.should.have.been.calledWithExactly({ message: 'success' });
                data.should.eql({ parsed: 'message' });
                responseTime.should.be.a('number');
                done();
            });
        });

        it('does not parse response on error', function (done) {
            Model._request.yieldsAsync(null, fail);
            sinon.stub(model, 'parse');
            model.delete(function (err, data, responseTime) {
                model.parse.should.not.have.been.called;
                data.should.eql({ message: 'error' });
                responseTime.should.be.a('number');
                done();
            });
        });

        it('calls callback with error if response is not valid json', function (done) {
            Model._request.yieldsAsync(null, invalid);
            model.delete(function (err, data, responseTime) {
                err.should.be.an.instanceOf(Error);
                err.status.should.equal(200);
                err.body.should.equal('invalid');
                expect(data).to.be.null;
                responseTime.should.be.a('number');
                done();
            });
        });

        it('passes options to url method if provided', function () {
            model.url = sinon.stub().returns('http://example.com/');
            model.delete({ url: 'foo' }, cb);
            model.url.should.have.been.calledOnce;
            model.url.should.have.been.calledWithExactly({ url: 'foo' });
        });

        it('can handle a parsed URL object', function () {
            var url = {
                protocol: 'http:',
                port: '1234',
                hostname: 'proxy-example.com',
                pathname: '/'
            };
            model.url = sinon.stub().returns(url);
            model.delete(cb);
            Model._request.should.have.been.called;
            Model._request.args[0][0].uri.should.equal('http://proxy-example.com:1234/');
        });

        it('allows custom headers', function () {
            var endPoint = url.parse('http://proxy-example.com:1234');
            endPoint.headers = {
                Host: url.parse('http://example.com/').host
            };
            model.url = sinon.stub().returns(endPoint);
            model.delete(cb);
            Model._request.args[0][0].headers.Host.should.equal('example.com');
        });

        it('calls callback with error if parse fails', function (done) {
            model.parse = function () {
                throw new Error('parse');
            };
            Model._request.yieldsAsync(null, success);
            model.delete(function (err, data, responseTime) {
                err.should.eql(new Error('parse'));
                responseTime.should.be.a('number');
                done();
            });
        });

        it('emits a "sync" event', function () {
            var sync = sinon.stub();
            model.on('sync', sync);
            model.delete(function () {});
            sync.should.have.been.calledOnce;
            sync.should.have.been.calledWith(sinon.match({ method: 'DELETE' }));
        });

        it('emits a "fail" event on error', function (done) {
            Model._request.yieldsAsync(null, fail);
            model.on('fail', function (err, data, settings, statusCode, responseTime) {
                err.should.eql({ message: 'error', status: 500 });
                data.should.eql({ message: 'error' });
                settings.method.should.equal('DELETE');
                statusCode.should.equal(500);
                responseTime.should.be.a('number');
                done();
            });
            model.delete(function () {});
        });

        it('emits a "success" event on success', function (done) {
            Model._request.yieldsAsync(null, success);
            model.on('success', function (data, settings, statusCode, responseTime) {
                data.should.eql({ message: 'success' });
                settings.method.should.equal('DELETE');
                statusCode.should.equal(200);
                responseTime.should.be.a('number');
                done();
            });
            model.delete(function () {});
        });

        it('allows an empty response body', function (done) {
            Model._request.yieldsAsync(null, empty);
            model.delete(function (err, data, responseTime) {
                expect(err).to.be.null;
                data.should.eql({});
                responseTime.should.be.a('number');
                done();
            });
        });

        it('passes statusCode, response body and callback to `parseResponse`', function (done) {
            Model._request.yieldsAsync(null, success);
            model.delete(function () {
                model.parseResponse.should.have.been.calledWith(200, { message: 'success' }, sinon.match.func);
                done();
            });
        });

        it('ignores callback if one is not given on success', function () {
            Model._request.yieldsAsync(null, success);
            expect(function () {
                model.delete();
            }).to.not.throw;
        });

        it('ignores callback if one is not given if API response returns an error code', function () {
            Model._request.yieldsAsync(null, fail);
            expect(function () {
                model.delete();
            }).to.not.throw;
        });
    });

    describe('parseResponse', function () {

        beforeEach(function () {
            sinon.stub(model, 'parse').returns({ parsed: 'true' });
            sinon.stub(model, 'parseError').returns({ error: 'true' });
        });

        it('sends response bodies with "success" status codes to parse', function (done) {
            model.parseResponse(200, { parsed: 'false' }, function (err, data, statusCode) {
                expect(err).to.be.null;
                model.parse.should.have.been.calledWith({ parsed: 'false' });
                data.should.eql({ parsed: 'true' });
                statusCode.should.equal(200);
                done();
            });
        });

        it('sends response bodies with "failure" status codes to parseError', function (done) {
            model.parseResponse(400, { parsed: 'false' }, function (err, data, statusCode) {
                err.should.eql({ error: 'true' });
                data.should.eql({ parsed: 'false' });
                statusCode.should.equal(400);
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
