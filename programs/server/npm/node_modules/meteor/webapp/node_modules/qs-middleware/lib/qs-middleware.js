'use strict';

var url = require('url');
var qs = require('qs');

module.exports = qsMiddleware;

function qsMiddleware(options) {
	return function (request, response, next) {
		request.query = qs.parse(url.parse(request.url).query, options);
		next();
	};
}
