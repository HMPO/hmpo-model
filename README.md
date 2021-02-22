# hmpo-model
* localModel - Simple model for data persistance
* remoteModel - Simple model for interacting with http/rest apis.

## Local Model Usage
### get
* gets a model property via a key

### set
* sets a property on the model to a value and dispatches events

### unset
* unsets a property

### reset
* resets a model
* suppresses `change` event notifications if `options.silent` is set

### increment
* Increments a property

### toJSON
* returns a JSON representation of the data in the model

## Remote Model Usage

Normally this would be used as an abstract class and extended with your own implementation.

Implementations would normally define at least a `url` method to define the target of API calls.

There are three methods for API interaction corresponding to GET, POST, and DELETE http methods:

### `fetch`

```javascript
var model = new Model();
model.fetch(function (err, data, responseTime) {
    console.log(data);
});
```

### `save`

```javascript
var model = new Model();
model.set({
    property: 'properties are sent as JSON request body by default'
});
model.save(function (err, data, responseTime) {
    console.log(data);
});
```

The method can also be overwritten by passing options

```javascript
var model = new Model();
model.set({
    property: 'this will be sent as a PUT request'
});
model.save({ method: 'PUT' }, function (err, data, responseTime) {
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
}, function (err, data, responseTime) {
    console.log(data);
});
```

## Events

API requests will emit events as part of their lifecycle.

`sync` is emitted when an API request is sent
```javascript
model.on('sync', function (settings) { });
```

`success` is emitted when an API request successfully completes
```javascript
model.on('success', function (data, settings, statusCode, responseTime) { });
```

`fail` is emitted when an API request fails
```javascript
model.on('fail', function (err, data, settings, statusCode, responseTime) { });
```

## Hooks

API requests will fire hooks specified in model options as part of their lifecycle.

```javascript
new Model(null, options);
```

`sync` hook is fired when an API request is sent
```javascript
options.hooks.sync({ settings });
```

`success` hook is fired when an API request successfully completes
```javascript
options.hooks.success({ data, settings, statusCode, responseTime });
```

`fail` hook is fired when an API request fails
```javascript
options.hooks.fail({ err, data, settings, statusCode, responseTime });
```

