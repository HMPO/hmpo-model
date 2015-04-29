# hmpo-model
Simple model for interacting with http/rest apis.

## Usage

Normally this would be used as an abstract class and extended with your own implementation.

Implementations would normally define at least a `url` method to define the target of API calls.

There are three methods for API interaction corresponding to GET, POST, and DELETE http methods:

### `fetch`

```javascript
var model = new Model();
model.fetch(function (err, data) {
    console.log(data);
});
```

### `save`

```javascript
var model = new Model();
model.set({
    property: 'properties are sent as JSON request body by default'
});
model.save(function (err, data) {
    console.log(data);
});
```

The method can also be overwritten by passing options

```javascript
var model = new Model();
model.set({
    property: 'this will be sent as a PUT request'
});
model.save({ method: 'PUT' }, function (err, data) {
    console.log(data);
});
```

### `delete`

```javascript
var model = new Model();
model.delete(function (err, data) {
    console.log(data);
});
```

If no `url` method is defined then the model will use the options parameter and [Node's url.format method](https://nodejs.org/api/url.html#url_url_format_urlobj) to construct a URL.

```javascript
var model = new Model();

// make a GET request to http://example.com:3000/foo/bar
model.fetch({
    protocol: 'http',
    hostname: 'example.com',
    port: 3000,
    path: '/foo/bar'
}, function (err, data) {
    console.log(data);
});
```

## Events

API requests will emit events as part of their lifecycle.

* `sync` is emitted when an API request is sent
* `success` is emitted when an API request successfully completes
* `fail` is emitted when an API request fails

All events are emitted with the response data, the request settings and the response status as arguments. The fail event has an additional error argument.
