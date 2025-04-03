# hmpo-model

* localModel - Simple model for data persistance
* remoteModel - Simple model for interacting with http/rest apis.

## Upgrading

The deprecated `request` library has been replaced with `got`. The API is very similar, and some args are translated, like auth, and proxy.
The new `got` library doesn't automatically use the proxy environment variables so you would need to use something like `global-agent` in your
app if you need to specify proxies by environment arguments.

The `request` method no longer takes a body. This should be inserted as `json`, `body`, or `form` into the `requestConfig` method.

## Local Model Usage

### `get(key)`

* Gets a model property via a key.

### `set(key, value, [options])` or `set({ key: value }, [options])`

* Sets a property on the model to a value and dispatches events.
* * suppresses `change` event notifications if `options.silent` is set. e.g. `reset({silent: true})`

### `unset(fields, [options])`

* Unsets a field or fields. `fields` can be passed as a string or an array. If `fields` is of type `'string'` it will be wrapped in an array with this string as its single element.
* Suppresses `change` event notifications if `options.silent` is set. E.g. `reset({silent: true})`

### `reset([options])`

* Resets a model.
* Suppresses `change` event notifications if `options.silent` is set. E.g. `reset({silent: true})`

### `increment(propertyName, [amount])`

* Increments a property by the specified amount. Amount defaults to 1 if not provided.

### `toJSON([bare])`

* Returns a JSON representation of the data in the model.
* Optional paramter `bare` can be set to `true` or `false`. Defaults to `false`.
* If `bare` is set to `true`, the JSON object will have a `null` prototype and will not inherit object methods from `Object.prototype`. Helpful info on this can be found on [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object#null-prototype_objects).

## Remote Model Usage

Normally this would be used as an abstract class and extended with your own implementation.

Implementations would normally define at least a `url():url` method to define the target of API calls.

Example implimentation:

```javascript
class MyModel extends HmpoModel {
    url() {
        return super.url('https://my.example.com/url')
    }

    auth() {
        return super.auth('username:password');
    }

    requestConfig(config) {
        config.proxy = 'http://proxy.example.com:3128'
        return super.requestConfig(config);
    }

    // add data to JSON post body
    prepare(callback) {
        super.prepare((err, data) => {
            if (err) return callback(err);
            data.foo = 'bar';
            callback(null, data);
        });
    }

    // transform returned data
    parse(data) {
        data.additionalItem = true;
        return super.parse(data);
    }
}

const model = new MyModel();
model.set('boo', 'baz');
model.save((err, data, responseTime) => {
    if (err) return console.error(err);
    console.log(data);
});
```

There are three methods for API interaction corresponding to GET, POST, and DELETE http methods:

### `fetch([args, ][callback])`

`fetch` performs a `GET` request on the url

```javascript
const model = new Model();
model.fetch((err, data, responseTime) => {
    console.log(data);
});
```

#### Request

* Request args for the `got` library, can be set by overriding the `requestConfig({}):{}` method.
* The `url` can be configured either by setting a default in the model options or `requestConfig()` data, or by overriding the `url(default, args):url` method.

* `proxy`, `timeout`, and basic `auth` can be set in the same way, using model options, setting in `requestConfig()`, or by overriding a method.
* Specifying a `proxy` will set up a proxy tunneling `agent` for the request.
* Specifying a numeric `timeout` will set the same timeout for all `got` timeout values.
* Basic `auth` can be a colon separated string, or a `{username, password}` or `{user, pass}` object.

#### Response

* The returned body will be expected to be in JSON format.
* If `statusCode < 400` the JSON response will be set to the model.
This behaviour can be changed by overriding the `parse(data):data` method.
* If `statusCode >= 400` the data will be passed to the `parseError(statusCode, data):error` method, and the `fetch` callback will be called with the returned error.
* If response statuses need to be treated differently than the above, the `parseResponse(statusCode, data, cb)` method can be overridden.
* If the response body is not going to be JSON, the `handleResponse(response, cb)` method can be overridden.

### `save([args, ][callback])`

`save` performs a `POST` request on the url

```javascript
const model = new Model();
model.set({
    property: 'properties are sent as JSON request body by default'
});
model.save((err, data, responseTime) => {
    console.log(data);
});
```

* By default the post body will be a JSON encoded object containing all attributes set to the model using, extracted using `model.toJSON()`. This behaviour can be changed by overriding the `prepare(callback(err, data))` method.
* The response and body will be treated the same way as the `fetch` request above.

### `delete([args, ][callback])`

`delete` performs a `DELETE` request on the url

```javascript
const model = new Model();
model.delete((err, data, responseTime) => {
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
