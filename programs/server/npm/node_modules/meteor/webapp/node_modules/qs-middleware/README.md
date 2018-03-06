
QS Middleware
=============

Connect querystring middleware.

[![NPM version][shield-npm]][info-npm]
[![Node.js version support][shield-node]][info-node]
[![Build status][shield-build]][info-build]
[![Dependencies][shield-dependencies]][info-dependencies]
[![LGPL-3.0 licensed][shield-license]][info-license]

```js
var connect = require('connect');
var query = require('qs-middleware');
var app = connect();
app.use(query());
```


Table Of Contents
-----------------

- [Install](#install)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)


Install
-------

Install QS Middleware with [npm][npm]:

```sh
npm install qs-middleware
```


Usage
-----

### `query(options)`

Create a querystring middleware which adds a parsed `query` property to the request object:

```js
app.use(query());

app.use(function(request, response) {
    console.log(request.query);
});
```

You can optionally pass in options which are handed directly to the [qs module][qs], which handles querystring parsing:

```js
app.use(query({
    allowDots: true
}));
```


Contributing
------------

To contribute to QS Middleware, clone this repo locally and commit your code on a separate branch.

Please write unit tests for your code, and check that everything works by running the following before opening a pull-request:

```sh
make ci
```


License
-------

QS Middleware is licensed under the [Lesser General Public License (LGPL-3.0)][info-license] license.  
Copyright &copy; 2016, Springer Nature



[npm]: https://npmjs.org/
[qs]: https://github.com/hapijs/qs

[info-coverage]: https://coveralls.io/github/springernature/qs-middleware
[info-dependencies]: https://gemnasium.com/springernature/qs-middleware
[info-license]: LICENSE
[info-node]: package.json
[info-npm]: https://www.npmjs.com/package/qs-middleware
[info-build]: https://travis-ci.org/springernature/qs-middleware
[shield-coverage]: https://img.shields.io/coveralls/springernature/qs-middleware.svg
[shield-dependencies]: https://img.shields.io/gemnasium/springernature/qs-middleware.svg
[shield-license]: https://img.shields.io/badge/license-LGPL%203.0-blue.svg
[shield-node]: https://img.shields.io/badge/node.js%20support-0.10–5-brightgreen.svg
[shield-npm]: https://img.shields.io/npm/v/qs-middleware.svg
[shield-build]: https://img.shields.io/travis/springernature/qs-middleware/master.svg
