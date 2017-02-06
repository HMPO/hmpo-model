'use strict';

const url = require('url');
const Model = require('../../');

describe('Model', () => {
  let model;
  let apiRequest;
  let error;
  let success;
  let empty;
  let fail;
  let invalid;

  const sandbox = (assertions, done) => {
    return function testAssertions() {
      try {
        assertions.apply(this, arguments);
        done();
      } catch (err) {
        done(err);
      }
    };
  };

  beforeEach(() => {
    apiRequest = {};
    model = new Model();
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
    sinon.stub(model, '_request').returns(apiRequest);
    sinon.spy(model, 'parseResponse');
  });

  afterEach(() => {
    model._request.restore();
  });

  it('exports a constructor', () => {
    Model.should.be.a('function');
  });

  it('has `save`, `prepare`, `get`, `set` and `toJSON` methods', () => {
    model.save.should.be.a('function');
    model.prepare.should.be.a('function');
    model.get.should.be.a('function');
    model.set.should.be.a('function');
    model.toJSON.should.be.a('function');
  });

  it('has an attributes property of type object', () => {
    model.attributes.should.be.a('object');
  });

  describe('constructor', () => {

    it('sets attributes passed to self silently', () => {
      var listener = sinon.stub();
      class EventedModel extends Model {
        constructor(attrs, options) {
          super(attrs, options);
          this.on('change', listener);
        }
      }
      var eventedModel = new EventedModel({
        prop: 'value'
      });
      listener.should.not.have.been.called;
      eventedModel.get('prop').should.equal('value');
    });

  });

  describe('request', () => {
    let settings;
    let bodyData;

    beforeEach(() => {
      bodyData = '{"name":"Test name"}';

      settings = url.parse('http://example.com:3002/foo/bar');
      settings.method = 'POST';
    });

    it('sends an http POST request to requested url with data in settings', done => {
      model._request.yieldsAsync(success);
      settings.data = bodyData;

      model.request(settings, sandbox(() => {
        model._request.should.have.been.calledOnce;

        var options = model._request.args[0][0];
        options.method.should.equal('POST');
        options.uri.should.equal('http://example.com:3002/foo/bar');
        options.body.should.equal('{"name":"Test name"}');
      }, done));

    });

    it('sends an http POST request to requested url with data passed as argument', done => {
      model._request.yieldsAsync(success);

      model.request(settings, bodyData, sandbox(() => {
        model._request.should.have.been.calledOnce;

        var options = model._request.args[0][0];
        options.method.should.equal('POST');
        options.uri.should.equal('http://example.com:3002/foo/bar');
        options.body.should.equal('{"name":"Test name"}');
      }, done));
    });

    it('sends an http POST request to requested url with data passed as argument and no callback given', done => {
      model._request.yieldsAsync(success);

      model.request(settings, bodyData, sandbox(() => {
        model._request.should.have.been.calledOnce;
        const options = model._request.args[0][0];
        options.method.should.equal('POST');
        options.uri.should.equal('http://example.com:3002/foo/bar');
        options.body.should.equal('{"name":"Test name"}');
      }, done));
    });

    it('sends an http GET request to requested url and no callback given', done => {
      model._request.yieldsAsync(success);
      settings = url.parse('http://example.com:3002/foo/bar');
      settings.method = 'GET';

      model.request(settings, sandbox(() => {
        model._request.should.have.been.calledOnce;
        var options = model._request.args[0][0];
        options.method.should.equal('GET');
        options.uri.should.equal('http://example.com:3002/foo/bar');
        expect(options.body).to.not.be.ok;
      }, done));
    });

    it('can parse failiure when no callback given', done => {
      model._request.yieldsAsync(fail);

      model.request(settings, bodyData, sandbox(() => {
        model._request.should.have.been.calledOnce;
        var options = model._request.args[0][0];
        options.method.should.equal('POST');
        options.uri.should.equal('http://example.com:3002/foo/bar');
        options.body.should.equal('{"name":"Test name"}');
      }, done));
    });

    it('can parse failiure when no data or callback given', done => {
      model._request.yieldsAsync(fail);

      model.request(settings, sandbox(() => {
        model._request.should.have.been.calledOnce;
        var options = model._request.args[0][0];
        options.method.should.equal('POST');
        options.uri.should.equal('http://example.com:3002/foo/bar');
        expect(options.body).to.not.be.ok;
      }, done));
    });

    it('sets the timeout from model options', done => {
      model.options.timeout = 100;
      model._request.yieldsAsync(success);

      model.request(settings, sandbox(() => {
        model._request.should.have.been.calledOnce;
        var options = model._request.args[0][0];
        options.timeout.should.equal(100);
      }, done));
    });

    it('sets the timeout from request options', done => {
      settings.timeout = 100;
      model._request.yieldsAsync(success);

      model.request(settings, sandbox(() => {
        model._request.should.have.been.calledOnce;
        var options = model._request.args[0][0];
        options.timeout.should.equal(100);
      }, done));
    });

  });

  describe('save', () => {

    beforeEach(() => {
      model.set('name', 'Test name');
      model.url = () => 'http://example.com:3002/foo/bar';
    });

    it('sends an http POST request to configured url containing model attributes as body', done => {
      model._request.yieldsAsync(success);

      model.save(sandbox(() => {
        model._request.should.have.been.calledOnce;
        var options = model._request.args[0][0];
        options.method.should.equal('POST');
        options.uri.should.equal('http://example.com:3002/foo/bar');
        options.body.should.equal('{"name":"Test name"}');
      }, done));
    });

    it('sends an https POST request if configured url is `https`', done => {
      model.url = () => 'https://secure-example.com/foo/bar';
      model._request.yieldsAsync(success);

      model.save(sandbox(() => {
        model._request.should.have.been.calledOnce;
        var options = model._request.args[0][0];
        options.method.should.equal('POST');
        options.uri.should.equal('https://secure-example.com/foo/bar');
        options.body.should.equal('{"name":"Test name"}');
     }, done));
    });

    it('sends an http PUT request if method option is "PUT"', done => {
      model._request.yieldsAsync(success);

      model.save({ method: 'PUT' }, sandbox(() => {
        model._request.should.have.been.calledOnce;
        var options = model._request.args[0][0];
        options.method.should.equal('PUT');
        options.uri.should.equal('http://example.com:3002/foo/bar');
        options.body.should.equal('{"name":"Test name"}');
      }, done));
    });

    it('adds content type and length headers to request', done => {
      model.set('name', 'Test name - ハセマペヨ');
      model._request.yieldsAsync(success);

      model.save(sandbox(() => {
        model._request.should.have.been.calledOnce;
        var options = model._request.args[0][0];
        options.headers['Content-Type'].should.equal('application/json');
        options.headers['Content-Length'].should.equal(38);
      }, done));
    });

    it('calls callback with an error if API response returns an error code', done => {
      model._request.yieldsAsync(null, fail);
      model.save((e, data, responseTime) => {
        e.should.eql({ status: 500, message: 'error' });
        responseTime.should.be.a('number');
        done();
      });
    });

    it('calls callback with an error if request throws error event', done => {
      model._request.yieldsAsync(error);
      model.save((e, data, responseTime) => {
        e.should.eql(error);
        responseTime.should.be.a('number');
        done();
      });
    });

    it('calls callback with no error and json data if response has success code', done => {
      model._request.yieldsAsync(null, success);
      model.save((err, data, responseTime) => {
        expect(err).to.be.null;
        data.should.eql({ message: 'success' });
        responseTime.should.be.a('number');
        done();
      });
    });

    it('passes returned data through parse method on success', done => {
      sinon.stub(model, 'parse').returns({ parsed: 'message' });
      model._request.yieldsAsync(null, success);
      model.save((err, data, responseTime) => {
        expect(err).to.be.null;
        model.parse.should.have.been.calledOnce;
        model.parse.should.have.been.calledWithExactly({ message: 'success' });
        data.should.eql({ parsed: 'message' });
        responseTime.should.be.a('number');
        done();
      });
    });

    it('does not parse response on error', done => {
      model._request.yieldsAsync(null, fail);
      sinon.stub(model, 'parse');
      model.save((err, data, responseTime) => {
        model.parse.should.not.have.been.called;
        data.should.eql({ message: 'error' });
        responseTime.should.be.a('number');
        done();
      });
    });

    it('calls parseError on error to extract error status from response', done => {
      model._request.yieldsAsync(null, fail);
      sinon.stub(model, 'parseError').returns({ error: 'parsed' });
      model.save((err, data, responseTime) => {
        model.parseError.should.have.been.calledOnce;
        model.parseError.should.have.been.calledWithExactly(500, { message: 'error' });
        err.should.eql({ error: 'parsed' });
        responseTime.should.be.a('number');
        done();
      });
    });

    it('calls callback with error if response is not valid json', done => {
      model._request.yieldsAsync(null, invalid);
      model.save((err, data, responseTime) => {
        err.should.be.an.instanceOf(Error);
        err.status.should.equal(200);
        err.body.should.equal('invalid');
        expect(data).to.be.null;
        responseTime.should.be.a('number');
        done();
      });
    });

    it('can handle optional options parameter', done => {
      model._request.yieldsAsync(success);
      model.url = sinon.stub().returns('http://example.com/');
      model.save({ url: 'foo' }, () => done());
    });

    it('passes options to url method if provided', done => {
      model.url = sinon.stub().returns('http://example.com/');
      model._request.yieldsAsync(success);
      model.save({ url: 'foo' }, sandbox(() => {
        model.url.should.have.been.calledOnce;
        model.url.should.have.been.calledWithExactly({ url: 'foo' });
      }, done));
    });

    it('can handle a parsed URL object', done => {
      var urlStub = {
        protocol: 'http:',
        port: '1234',
        hostname: 'proxy-example.com',
        pathname: '/'
      };
      model.url = sinon.stub().returns(urlStub);
      model._request.yieldsAsync(success);
      model.save(sandbox(() => {
        model._request.should.have.been.called;
        model._request.args[0][0].uri.should.equal('http://proxy-example.com:1234/');
      }, done));
    });

    it('calls callback with error if parse fails', done => {
      model.parse = () => {
        throw new Error('parse');
      };
      model._request.yieldsAsync(null, success);
      model.save((err, data, responseTime) => {
        err.should.eql(new Error('parse'));
        responseTime.should.be.a('number');
        done();
      });
    });

    it('allows custom headers', done => {
      var endPoint = url.parse('http://proxy-example.com:1234');
      endPoint.headers = {
        Host: url.parse('http://example.com/').host
      };
      model.url = sinon.stub().returns(endPoint);
      model._request.yieldsAsync(success);

      model.save(sandbox(() => {
        model._request.args[0][0].headers['Content-Type'].should.equal('application/json');
        model._request.args[0][0].headers.Host.should.equal('example.com');
      }, done));
    });

    it('includes auth setting if defined', done => {
      model.auth = sinon.stub().returns('user:pass');
      model._request.yieldsAsync(success);

      model.save(sandbox(() => {
        model._request.args[0][0].auth.should.deep.equal({
          user: 'user',
          pass: 'pass',
          sendImmediately: true
        });
      }, done));
    });

    it('emits a "sync" event', () => {
      var sync = sinon.stub();
      model.on('sync', sync);
      model.save(() => {});
      sync.should.have.been.calledOnce;
      sync.should.have.been.calledWith(sinon.match({ method: 'POST' }));
    });

    it('emits a "fail" event on error', done => {
      model._request.yieldsAsync(null, fail);
      model.on('fail', (err, data, settings, statusCode, responseTime) => {
        err.should.eql({ message: 'error', status: 500 });
        data.should.eql({ message: 'error' });
        settings.method.should.equal('POST');
        statusCode.should.equal(500);
        responseTime.should.be.a('number');
        done();
      });
      model.save(() => {});
    });

    it('emits a "success" event on success', done => {
      model._request.yieldsAsync(null, success);
      model.on('success', (data, settings, statusCode, responseTime) => {
        data.should.eql({ message: 'success' });
        settings.method.should.equal('POST');
        statusCode.should.equal(200);
        responseTime.should.be.a('number');
        done();
      });
      model.save(() => {});
    });

    it('allows an empty response body', done => {
      model._request.yieldsAsync(null, empty);
      model.save((err, data, responseTime) => {
        expect(err).to.be.null;
        data.should.eql({});
        responseTime.should.be.a('number');
        done();
      });
    });

    it('passes statusCode, response body and callback to `parseResponse`', done => {
      model._request.yieldsAsync(null, success);
      model.save(() => {
        model.parseResponse.should.have.been.calledWith(200, { message: 'success' }, sinon.match.func);
        done();
      });
    });

    it('ignores callback if one is not given on success', () => {
      model._request.yieldsAsync(null, success);
      expect(() => {
        model.save();
      }).to.not.throw();
    });

    it('ignores callback if one is not given if API response returns an error code', () => {
      model._request.yieldsAsync(null, fail);
      expect(() => {
        model.save();
      }).to.not.throw();
    });

  });

  describe('fetch', () => {
    var callback;

    beforeEach(() => {
      callback = sinon.stub();
      model.url = () => 'http://example.com:3002/foo/bar';
    });

    it('sends an http GET request to API server', done => {
      model._request.yieldsAsync(null, success);

      model.fetch(sandbox(() => {
        model._request.should.have.been.calledOnce;
        var options = model._request.args[0][0];
        options.method.should.equal('GET');
        options.uri.should.equal('http://example.com:3002/foo/bar');
      }, done));
    });

    it('calls callback with an error if API response returns an error code', done => {
      model._request.yieldsAsync(null, fail);
      model.fetch((e, data, responseTime) => {
        e.should.eql({ status: 500, message: 'error' });
        responseTime.should.be.a('number');
        done();
      });
    });

    it('calls callback with an error if model._request throws error event', done => {
      model._request.yieldsAsync(error, fail);
      model.fetch((e, data, responseTime) => {
        e.should.eql(error);
        responseTime.should.be.a('number');
        done();
      });
    });

    it('calls callback with no error and json data if response has success code', done => {
      model._request.yieldsAsync(null, success);
      model.fetch((err, data, responseTime) => {
        expect(err).to.be.null;
        data.should.eql({ message: 'success' });
        responseTime.should.be.a('number');
        done();
      });
    });

    it('passes returned data through parse method on success', done => {
      sinon.stub(model, 'parse').returns({ parsed: 'message' });
      model._request.yieldsAsync(null, success);
      model.fetch((err, data, responseTime) => {
        expect(err).to.be.null;
        model.parse.should.have.been.calledOnce;
        model.parse.should.have.been.calledWithExactly({ message: 'success' });
        data.should.eql({ parsed: 'message' });
        responseTime.should.be.a('number');
        done();
      });
    });

    it('does not parse response on error', done => {
      model._request.yieldsAsync(null, fail);
      sinon.stub(model, 'parse');
      model.fetch((err, data, responseTime) => {
        model.parse.should.not.have.been.called;
        data.should.eql({ message: 'error' });
        responseTime.should.be.a('number');
        done();
      });
    });

    it('calls callback with error if response is not valid json', done => {
      model._request.yieldsAsync(null, invalid);
      model.fetch((err, data, responseTime) => {
        err.should.be.an.instanceOf(Error);
        err.status.should.equal(200);
        err.body.should.equal('invalid');
        expect(data).to.be.null;
        responseTime.should.be.a('number');
        done();
      });
    });

    it('passes options to url method if provided', () => {
      model.url = sinon.stub().returns('http://example.com/');
      model.fetch({ url: 'foo' }, callback);
      model.url.should.have.been.calledOnce;
      model.url.should.have.been.calledWithExactly({ url: 'foo' });
    });

    it('can handle a parsed URL object', done => {
      var urlStub = {
        protocol: 'http:',
        port: '1234',
        hostname: 'proxy-example.com',
        pathname: '/'
      };
      model.url = sinon.stub().returns(urlStub);
      model._request.yieldsAsync(success);
      model.fetch(sandbox(() => {
        model._request.should.have.been.called;
        model._request.args[0][0].uri.should.equal('http://proxy-example.com:1234/');
      }, done));
    });

    it('allows custom headers', done => {
      var endPoint = url.parse('http://proxy-example.com:1234');
      endPoint.headers = {
        Host: url.parse('http://example.com/').host
      };
      model.url = sinon.stub().returns(endPoint);
      model._request.yieldsAsync(success);
      model.fetch(sandbox(() => {
        model._request.args[0][0].headers.Host.should.equal('example.com');
      }, done));
    });

    it('calls callback with error if parse fails', done => {
      model.parse = () => {
        throw new Error('parse');
      };
      model._request.yieldsAsync(null, success);
      model.fetch((err, data, responseTime) => {
        err.should.eql(new Error('parse'));
        responseTime.should.be.a('number');
        done();
      });
    });

    it('includes auth setting if defined', done => {
      model.auth = sinon.stub().returns('user:pass');
      model._request.yieldsAsync(success);
      model.fetch(sandbox(() => {
        model._request.args[0][0].auth.should.deep.equal({
          user: 'user',
          pass: 'pass',
          sendImmediately: true
        });
      }, done));
    });

    it('emits a "sync" event', () => {
      var sync = sinon.stub();
      model.on('sync', sync);
      model.fetch(() => {});
      sync.should.have.been.calledOnce;
      sync.should.have.been.calledWith(sinon.match({ method: 'GET' }));
    });

    it('emits a "fail" event on failure', done => {
      model._request.yieldsAsync(null, fail);
      model.on('fail', (err, data, settings, statusCode, responseTime) => {
        err.should.eql({ message: 'error', status: 500 });
        data.should.eql({ message: 'error' });
        settings.method.should.equal('GET');
        statusCode.should.equal(500);
        responseTime.should.be.a('number');
        done();
      });
      model.fetch(() => {});
    });

    it('emits a "fail" event on error', done => {
      model._request.yieldsAsync(error);
      model.on('fail', (err, data, settings, statusCode, responseTime) => {
        err.should.eql(error);
        expect(data).to.be.null;
        settings.method.should.equal('GET');
        statusCode.should.equal(500);
        responseTime.should.be.a('number');
        done();
      });
      model.fetch(() => {});
    });

    it('emits a "success" event on success', done => {
      model._request.yieldsAsync(null, success);
      model.on('success', (data, settings, statusCode, responseTime) => {
        data.should.eql({ message: 'success' });
        settings.method.should.equal('GET');
        statusCode.should.equal(200);
        responseTime.should.be.a('number');
        done();
      });
      model.fetch(() => {});
    });

    it('allows an empty response body', done => {
      model._request.yieldsAsync(null, empty);
      model.fetch((err, data, responseTime) => {
        expect(err).to.be.null;
        data.should.eql({});
        responseTime.should.be.a('number');
        done();
      });
    });

    it('passes statusCode, response body and callback to `parseResponse`', done => {
      model._request.yieldsAsync(null, success);
      model.fetch(() => {
        model.parseResponse.should.have.been.calledWith(200, { message: 'success' }, sinon.match.func);
        done();
      });
    });

    it('ignores callback if one is not given on success', () => {
      model._request.yieldsAsync(null, success);
      expect(() => {
        model.fetch();
      }).to.not.throw();
    });

    it('ignores callback if one not given if API response returns an error code', () => {
      model._request.yieldsAsync(null, fail);
      expect(() => {
        model.fetch();
      }).to.not.throw();
    });
  });

  describe('delete', () => {

    var callback;

    beforeEach(() => {
      callback = sinon.stub();
      model.url = () => 'http://example.com:3002/foo/bar';
    });

    it('sends an http DELETE request to API server', done => {
      model._request.yieldsAsync(null, success);

      model.delete(sandbox(() => {
        model._request.should.have.been.calledOnce;
        var options = model._request.args[0][0];
        options.method.should.equal('DELETE');
        options.uri.should.equal('http://example.com:3002/foo/bar');
      }, done));
    });

    it('calls callback with an error if API response returns an error code', done => {
      model._request.yieldsAsync(null, fail);
      model.delete((e, data, responseTime) => {
        e.should.eql({ status: 500, message: 'error' });
        responseTime.should.be.a('number');
        done();
      });
    });

    it('calls callback with an error if model._request throws error event', done => {
      model._request.yieldsAsync(error, fail);
      model.delete((e, data, responseTime) => {
        e.should.eql(error);
        responseTime.should.be.a('number');
        done();
      });
    });

    it('calls callback with no error and json data if response has success code', done => {
      model._request.yieldsAsync(null, success);
      model.delete((err, data, responseTime) => {
        expect(err).to.be.null;
        data.should.eql({ message: 'success' });
        responseTime.should.be.a('number');
        done();
      });
    });

    it('passes returned data through parse method on success', done => {
      sinon.stub(model, 'parse').returns({ parsed: 'message' });
      model._request.yieldsAsync(null, success);
      model.delete((err, data, responseTime) => {
        expect(err).to.be.null;
        model.parse.should.have.been.calledOnce;
        model.parse.should.have.been.calledWithExactly({ message: 'success' });
        data.should.eql({ parsed: 'message' });
        responseTime.should.be.a('number');
        done();
      });
    });

    it('does not parse response on error', done => {
      model._request.yieldsAsync(null, fail);
      sinon.stub(model, 'parse');
      model.delete((err, data, responseTime) => {
        model.parse.should.not.have.been.called;
        data.should.eql({ message: 'error' });
        responseTime.should.be.a('number');
        done();
      });
    });

    it('calls callback with error if response is not valid json', done => {
      model._request.yieldsAsync(null, invalid);
      model.delete((err, data, responseTime) => {
        err.should.be.an.instanceOf(Error);
        err.status.should.equal(200);
        err.body.should.equal('invalid');
        expect(data).to.be.null;
        responseTime.should.be.a('number');
        done();
      });
    });

    it('passes options to url method if provided', () => {
      model.url = sinon.stub().returns('http://example.com/');
      model.delete({ url: 'foo' }, callback);
      model.url.should.have.been.calledOnce;
      model.url.should.have.been.calledWithExactly({ url: 'foo' });
    });

    it('can handle a parsed URL object', done => {
      var urlStub = {
        protocol: 'http:',
        port: '1234',
        hostname: 'proxy-example.com',
        pathname: '/'
      };
      model.url = sinon.stub().returns(urlStub);
      model._request.yieldsAsync(success);
      model.delete(sandbox(() => {
        model._request.should.have.been.called;
        model._request.args[0][0].uri.should.equal('http://proxy-example.com:1234/');
      }, done));
    });

    it('allows custom headers', done => {
      var endPoint = url.parse('http://proxy-example.com:1234');
      endPoint.headers = {
        Host: url.parse('http://example.com/').host
      };
      model.url = sinon.stub().returns(endPoint);
      model._request.yieldsAsync(success);
      model.delete(sandbox(() => {
        model._request.args[0][0].headers.Host.should.equal('example.com');
      }, done));
    });

    it('calls callback with error if parse fails', done => {
      model.parse = () => {
        throw new Error('parse');
      };
      model._request.yieldsAsync(null, success);
      model.delete((err, data, responseTime) => {
        err.should.eql(new Error('parse'));
        responseTime.should.be.a('number');
        done();
      });
    });

    it('emits a "sync" event', () => {
      var sync = sinon.stub();
      model.on('sync', sync);
      model.delete(() => {});
      sync.should.have.been.calledOnce;
      sync.should.have.been.calledWith(sinon.match({ method: 'DELETE' }));
    });

    it('emits a "fail" event on error', done => {
      model._request.yieldsAsync(null, fail);
      model.on('fail', (err, data, settings, statusCode, responseTime) => {
        err.should.eql({ message: 'error', status: 500 });
        data.should.eql({ message: 'error' });
        settings.method.should.equal('DELETE');
        statusCode.should.equal(500);
        responseTime.should.be.a('number');
        done();
      });
      model.delete(() => {});
    });

    it('emits a "success" event on success', done => {
      model._request.yieldsAsync(null, success);
      model.on('success', (data, settings, statusCode, responseTime) => {
        data.should.eql({ message: 'success' });
        settings.method.should.equal('DELETE');
        statusCode.should.equal(200);
        responseTime.should.be.a('number');
        done();
      });
      model.delete(() => {});
    });

    it('allows an empty response body', done => {
      model._request.yieldsAsync(null, empty);
      model.delete((err, data, responseTime) => {
        expect(err).to.be.null;
        data.should.eql({});
        responseTime.should.be.a('number');
        done();
      });
    });

    it('passes statusCode, response body and callback to `parseResponse`', done => {
      model._request.yieldsAsync(null, success);
      model.delete(() => {
        model.parseResponse.should.have.been.calledWith(200, { message: 'success' }, sinon.match.func);
        done();
      });
    });

    it('ignores callback if one is not given on success', () => {
      model._request.yieldsAsync(null, success);
      expect(() => {
        model.delete();
      }).to.not.throw();
    });

    it('ignores callback if one is not given if API response returns an error code', () => {
      model._request.yieldsAsync(null, fail);
      expect(() => {
        model.delete();
      }).to.not.throw();
    });
  });

  describe('parseResponse', () => {

    beforeEach(() => {
      sinon.stub(model, 'parse').returns({ parsed: 'true' });
      sinon.stub(model, 'parseError').returns({ error: 'true' });
    });

    it('sends response bodies with "success" status codes to parse', done => {
      model.parseResponse(200, { parsed: 'false' }, (err, data, statusCode) => {
        expect(err).to.be.null;
        model.parse.should.have.been.calledWith({ parsed: 'false' });
        data.should.eql({ parsed: 'true' });
        statusCode.should.equal(200);
        done();
      });
    });

    it('sends response bodies with "failure" status codes to parseError', done => {
      model.parseResponse(400, { parsed: 'false' }, (err, data, statusCode) => {
        err.should.eql({ error: 'true' });
        data.should.eql({ parsed: 'false' });
        statusCode.should.equal(400);
        done();
      });
    });

  });

  describe('prepare', () => {

    beforeEach(() => {
      sinon.stub(model, 'toJSON').returns({ name: 'Test name' });
    });

    afterEach(() => {
      model.toJSON.restore();
    });

    it('returns JSON data', () => {

      var callback = sinon.stub();
      model.prepare(callback);
      callback.should.have.been.calledOnce;
      callback.should.have.been.calledWith(null, {
        name: 'Test name'
      });
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
      model.attributes = {
        name: 'Test name'
      };
    });

    it('adds a key to the model attributes if the key is a string', () => {
      model.set('age', 20).attributes.should.eql({
        name: 'Test name',
        age: 20
      });
    });

    it('accepts an object as the key', () => {
      model.set({ placeOfBirth: 'London' }).attributes.should.eql({
        name: 'Test name',
        placeOfBirth: 'London'
      });
    });

    it('emits a change event with the changed attributes', () => {
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

    it('does not pass unchanged attributes to listener', () => {
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

    it('emits property specific change events', () => {
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

    it('does not emit events if silent option is set to true', () => {
      var listener = sinon.stub();
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
      model.toJSON().should.eql({ b: 2, c: 3 });
    });

    it('removes properties from model when passed an array', () => {
      model.unset(['a', 'b']);
      model.toJSON().should.eql({ c: 3 });
    });

    it('does nothing if passed a property that does not exist', () => {
      model.unset('foo');
      model.toJSON().should.eql({ a: 1, b: 2, c: 3 });
    });

    it('emits a change event', () => {
      var listener = sinon.stub();
      model.on('change', listener);
      model.unset('a');
      listener.should.have.been.calledOnce;
      listener.should.have.been.calledWithExactly({ a: undefined });
    });

    it('emits property-specific change events', () => {
      var listener = sinon.stub();
      model.on('change:a', listener);
      model.unset('a');
      listener.should.have.been.calledOnce;
      listener.should.have.been.calledWithExactly(undefined, 1);
    });

    it('emits no events if passed silent: true', () => {
      var listener = sinon.stub();
      model.on('change', listener);
      model.on('change:a', listener);
      model.unset('a', { silent: true });
      listener.should.not.have.been.called;
    });

  });

  describe('increment', () => {

    it('throws if no property is defined', () => {
      var fn = () => {
        model.increment();
      };
      fn.should.throw();
    });

    it('throws if property is not a string', () => {
      var fn = () => {
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
      model.toJSON().should.eql({});
      expect(model.get('name')).to.be.undefined;
      expect(model.get('age')).to.be.undefined;
    });

    it('emits reset event', () => {
      var listener = sinon.stub();
      model.on('reset', listener);
      model.reset();
      listener.should.have.been.calledOnce;
    });

    it('emits property change events', () => {
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

    it('emits no events if called with silent: true', () => {
      var listener = sinon.stub();
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

    it('returns an object that\'s the same as the attributes property', () => {
      model.toJSON().should.eql({
        name: 'Test name'
      });
    });
  });

  describe('url', () => {

    it('returns options.url by default', () => {
      model.url({ url: 'http://example.com/' }).should.equal('http://example.com/');
    });

    it('extends url passed with options', () => {
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

  describe('parse', () => {

    it('returns data passed', () => {
      model.parse({ data: 1 }).should.eql({ data: 1 });
    });

  });


  describe('parseError', () => {


    it('returns data passed extednded with the status code', () => {
      model.parseError(500, { data: 1 }).should.eql({ status: 500, data: 1 });
      model.parseError(400, { data: 'message' }).should.eql({ status: 400, data: 'message' });
    });

  });

});
