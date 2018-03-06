// jshint maxstatements: false
// jscs:disable disallowMultipleVarDecl, maximumLineLength
'use strict';

var assert = require('proclaim');
var mockery = require('mockery');
var sinon = require('sinon');

describe('lib/qs-middleware', function () {
	var qs;
	var qsMiddleware;
	var url;

	beforeEach(function () {
		qs = require('../mock/qs');
		mockery.registerMock('qs', qs);

		url = require('../mock/url');
		mockery.registerMock('url', url);

		qsMiddleware = require('../../../lib/qs-middleware');
	});

	it('should be a function', function () {
		assert.isFunction(qsMiddleware);
	});

	describe('qsMiddleware()', function () {
		var middleware;

		beforeEach(function () {
			middleware = qsMiddleware();
		});

		it('should return a function', function () {
			assert.isFunction(middleware);
		});

		describe('returnedFunction(request, response, next)', function () {
			var next;
			var parsedQuery;
			var parsedUrl;
			var request;

			beforeEach(function () {
				next = sinon.spy();
				parsedQuery = {
					a: 'b',
					b: 'c'
				};
				parsedUrl = {
					query: 'a=b&b=c'
				};
				request = {
					url: 'http://foo.bar/baz?a=b&b=c'
				};
				url.parse.returns(parsedUrl);
				qs.parse.returns(parsedQuery);
				middleware(request, {}, next);
			});

			it('should parse the `request` url', function () {
				assert.calledOnce(url.parse);
				assert.calledWithExactly(url.parse, request.url);
			});

			it('should parse the `request` query string', function () {
				assert.calledOnce(qs.parse);
				assert.calledWith(qs.parse, parsedUrl.query);
			});

			it('should add the parsed query string to the `request` object', function () {
				assert.strictEqual(request.query, parsedQuery);
			});

			it('should call `next`', function () {
				assert.calledOnce(next);
				assert.calledWithExactly(next);
			});
		});
	});

	describe('qsMiddleware(options)', function () {
		var middleware;
		var options;

		beforeEach(function () {
			options = {
				foo: 'bar'
			};
			middleware = qsMiddleware(options);
		});

		it('should return a function', function () {
			assert.isFunction(middleware);
		});

		describe('returnedFunction(request, response, next)', function () {
			var next;
			var parsedUrl;

			beforeEach(function () {
				next = sinon.spy();
				parsedUrl = {
					query: 'a=b&b=c'
				};
				url.parse.returns(parsedUrl);
				middleware({}, {}, next);
			});

			it('should parse the `request` query string with the given `options`', function () {
				assert.calledOnce(qs.parse);
				assert.calledWith(qs.parse, parsedUrl.query, options);
			});
		});
	});
});
