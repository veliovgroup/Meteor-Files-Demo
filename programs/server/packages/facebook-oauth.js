(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var OAuth = Package.oauth.OAuth;
var Oauth = Package.oauth.Oauth;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Facebook;

var require = meteorInstall({"node_modules":{"meteor":{"facebook-oauth":{"facebook_server.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                       //
// packages/facebook-oauth/facebook_server.js                                                            //
//                                                                                                       //
///////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                         //
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/objectSpread"));

let crypto;
module.link("crypto", {
  default(v) {
    crypto = v;
  }

}, 0);
Facebook = {};

Facebook.handleAuthFromAccessToken = (accessToken, expiresAt) => {
  // include basic fields from facebook
  // https://developers.facebook.com/docs/facebook-login/permissions/
  const whitelisted = ['id', 'email', 'name', 'first_name', 'last_name', 'middle_name', 'name_format', 'picture', 'short_name'];
  const identity = getIdentity(accessToken, whitelisted);
  const fields = {};
  whitelisted.forEach(field => fields[field] = identity[field]);
  const serviceData = (0, _objectSpread2.default)({
    accessToken,
    expiresAt
  }, fields);
  return {
    serviceData,
    options: {
      profile: {
        name: identity.name
      }
    }
  };
};

OAuth.registerService('facebook', 2, null, query => {
  const response = getTokenResponse(query);
  const {
    accessToken
  } = response;
  const {
    expiresIn
  } = response;
  return Facebook.handleAuthFromAccessToken(accessToken, +new Date() + 1000 * expiresIn);
}); // checks whether a string parses as JSON

const isJSON = str => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}; // returns an object containing:
// - accessToken
// - expiresIn: lifetime of token in seconds


const getTokenResponse = query => {
  const config = ServiceConfiguration.configurations.findOne({
    service: 'facebook'
  });
  if (!config) throw new ServiceConfiguration.ConfigError();
  let responseContent;

  try {
    // Request an access token
    responseContent = HTTP.get("https://graph.facebook.com/v3.0/oauth/access_token", {
      params: {
        client_id: config.appId,
        redirect_uri: OAuth._redirectUri('facebook', config),
        client_secret: OAuth.openSecret(config.secret),
        code: query.code
      }
    }).data;
  } catch (err) {
    throw Object.assign(new Error(`Failed to complete OAuth handshake with Facebook. ${err.message}`), {
      response: err.response
    });
  }

  const fbAccessToken = responseContent.access_token;
  const fbExpires = responseContent.expires_in;

  if (!fbAccessToken) {
    throw new Error("Failed to complete OAuth handshake with facebook " + `-- can't find access token in HTTP response. ${responseContent}`);
  }

  return {
    accessToken: fbAccessToken,
    expiresIn: fbExpires
  };
};

const getIdentity = (accessToken, fields) => {
  const config = ServiceConfiguration.configurations.findOne({
    service: 'facebook'
  });
  if (!config) throw new ServiceConfiguration.ConfigError(); // Generate app secret proof that is a sha256 hash of the app access token, with the app secret as the key
  // https://developers.facebook.com/docs/graph-api/securing-requests#appsecret_proof

  const hmac = crypto.createHmac('sha256', OAuth.openSecret(config.secret));
  hmac.update(accessToken);

  try {
    return HTTP.get("https://graph.facebook.com/v3.0/me", {
      params: {
        access_token: accessToken,
        appsecret_proof: hmac.digest('hex'),
        fields: fields.join(",")
      }
    }).data;
  } catch (err) {
    throw Object.assign(new Error(`Failed to fetch identity from Facebook. ${err.message}`), {
      response: err.response
    });
  }
};

Facebook.retrieveCredential = (credentialToken, credentialSecret) => OAuth.retrieveCredential(credentialToken, credentialSecret);
///////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/facebook-oauth/facebook_server.js");

/* Exports */
Package._define("facebook-oauth", {
  Facebook: Facebook
});

})();

//# sourceURL=meteor://💻app/packages/facebook-oauth.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZmFjZWJvb2stb2F1dGgvZmFjZWJvb2tfc2VydmVyLmpzIl0sIm5hbWVzIjpbImNyeXB0byIsIm1vZHVsZSIsImxpbmsiLCJkZWZhdWx0IiwidiIsIkZhY2Vib29rIiwiaGFuZGxlQXV0aEZyb21BY2Nlc3NUb2tlbiIsImFjY2Vzc1Rva2VuIiwiZXhwaXJlc0F0Iiwid2hpdGVsaXN0ZWQiLCJpZGVudGl0eSIsImdldElkZW50aXR5IiwiZmllbGRzIiwiZm9yRWFjaCIsImZpZWxkIiwic2VydmljZURhdGEiLCJvcHRpb25zIiwicHJvZmlsZSIsIm5hbWUiLCJPQXV0aCIsInJlZ2lzdGVyU2VydmljZSIsInF1ZXJ5IiwicmVzcG9uc2UiLCJnZXRUb2tlblJlc3BvbnNlIiwiZXhwaXJlc0luIiwiRGF0ZSIsImlzSlNPTiIsInN0ciIsIkpTT04iLCJwYXJzZSIsImUiLCJjb25maWciLCJTZXJ2aWNlQ29uZmlndXJhdGlvbiIsImNvbmZpZ3VyYXRpb25zIiwiZmluZE9uZSIsInNlcnZpY2UiLCJDb25maWdFcnJvciIsInJlc3BvbnNlQ29udGVudCIsIkhUVFAiLCJnZXQiLCJwYXJhbXMiLCJjbGllbnRfaWQiLCJhcHBJZCIsInJlZGlyZWN0X3VyaSIsIl9yZWRpcmVjdFVyaSIsImNsaWVudF9zZWNyZXQiLCJvcGVuU2VjcmV0Iiwic2VjcmV0IiwiY29kZSIsImRhdGEiLCJlcnIiLCJPYmplY3QiLCJhc3NpZ24iLCJFcnJvciIsIm1lc3NhZ2UiLCJmYkFjY2Vzc1Rva2VuIiwiYWNjZXNzX3Rva2VuIiwiZmJFeHBpcmVzIiwiZXhwaXJlc19pbiIsImhtYWMiLCJjcmVhdGVIbWFjIiwidXBkYXRlIiwiYXBwc2VjcmV0X3Byb29mIiwiZGlnZXN0Iiwiam9pbiIsInJldHJpZXZlQ3JlZGVudGlhbCIsImNyZWRlbnRpYWxUb2tlbiIsImNyZWRlbnRpYWxTZWNyZXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxNQUFKO0FBQVdDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZLFFBQVosRUFBcUI7QUFBQ0MsU0FBTyxDQUFDQyxDQUFELEVBQUc7QUFBQ0osVUFBTSxHQUFDSSxDQUFQO0FBQVM7O0FBQXJCLENBQXJCLEVBQTRDLENBQTVDO0FBQVhDLFFBQVEsR0FBRyxFQUFYOztBQUdBQSxRQUFRLENBQUNDLHlCQUFULEdBQXFDLENBQUNDLFdBQUQsRUFBY0MsU0FBZCxLQUE0QjtBQUMvRDtBQUNBO0FBQ0EsUUFBTUMsV0FBVyxHQUFHLENBQUMsSUFBRCxFQUFPLE9BQVAsRUFBZ0IsTUFBaEIsRUFBd0IsWUFBeEIsRUFBc0MsV0FBdEMsRUFDbEIsYUFEa0IsRUFDSCxhQURHLEVBQ1ksU0FEWixFQUN1QixZQUR2QixDQUFwQjtBQUdBLFFBQU1DLFFBQVEsR0FBR0MsV0FBVyxDQUFDSixXQUFELEVBQWNFLFdBQWQsQ0FBNUI7QUFFQSxRQUFNRyxNQUFNLEdBQUcsRUFBZjtBQUNBSCxhQUFXLENBQUNJLE9BQVosQ0FBb0JDLEtBQUssSUFBSUYsTUFBTSxDQUFDRSxLQUFELENBQU4sR0FBZ0JKLFFBQVEsQ0FBQ0ksS0FBRCxDQUFyRDtBQUNBLFFBQU1DLFdBQVc7QUFDZlIsZUFEZTtBQUVmQztBQUZlLEtBR1pJLE1BSFksQ0FBakI7QUFNQSxTQUFPO0FBQ0xHLGVBREs7QUFFTEMsV0FBTyxFQUFFO0FBQUNDLGFBQU8sRUFBRTtBQUFDQyxZQUFJLEVBQUVSLFFBQVEsQ0FBQ1E7QUFBaEI7QUFBVjtBQUZKLEdBQVA7QUFJRCxDQXBCRDs7QUFzQkFDLEtBQUssQ0FBQ0MsZUFBTixDQUFzQixVQUF0QixFQUFrQyxDQUFsQyxFQUFxQyxJQUFyQyxFQUEyQ0MsS0FBSyxJQUFJO0FBQ2xELFFBQU1DLFFBQVEsR0FBR0MsZ0JBQWdCLENBQUNGLEtBQUQsQ0FBakM7QUFDQSxRQUFNO0FBQUVkO0FBQUYsTUFBa0JlLFFBQXhCO0FBQ0EsUUFBTTtBQUFFRTtBQUFGLE1BQWdCRixRQUF0QjtBQUVBLFNBQU9qQixRQUFRLENBQUNDLHlCQUFULENBQW1DQyxXQUFuQyxFQUFpRCxDQUFDLElBQUlrQixJQUFKLEVBQUYsR0FBZSxPQUFPRCxTQUF0RSxDQUFQO0FBQ0QsQ0FORCxFLENBUUE7O0FBQ0EsTUFBTUUsTUFBTSxHQUFHQyxHQUFHLElBQUk7QUFDcEIsTUFBSTtBQUNGQyxRQUFJLENBQUNDLEtBQUwsQ0FBV0YsR0FBWDtBQUNBLFdBQU8sSUFBUDtBQUNELEdBSEQsQ0FHRSxPQUFPRyxDQUFQLEVBQVU7QUFDVixXQUFPLEtBQVA7QUFDRDtBQUNGLENBUEQsQyxDQVNBO0FBQ0E7QUFDQTs7O0FBQ0EsTUFBTVAsZ0JBQWdCLEdBQUdGLEtBQUssSUFBSTtBQUNoQyxRQUFNVSxNQUFNLEdBQUdDLG9CQUFvQixDQUFDQyxjQUFyQixDQUFvQ0MsT0FBcEMsQ0FBNEM7QUFBQ0MsV0FBTyxFQUFFO0FBQVYsR0FBNUMsQ0FBZjtBQUNBLE1BQUksQ0FBQ0osTUFBTCxFQUNFLE1BQU0sSUFBSUMsb0JBQW9CLENBQUNJLFdBQXpCLEVBQU47QUFFRixNQUFJQyxlQUFKOztBQUNBLE1BQUk7QUFDRjtBQUNBQSxtQkFBZSxHQUFHQyxJQUFJLENBQUNDLEdBQUwsQ0FDaEIsb0RBRGdCLEVBQ3NDO0FBQ3BEQyxZQUFNLEVBQUU7QUFDTkMsaUJBQVMsRUFBRVYsTUFBTSxDQUFDVyxLQURaO0FBRU5DLG9CQUFZLEVBQUV4QixLQUFLLENBQUN5QixZQUFOLENBQW1CLFVBQW5CLEVBQStCYixNQUEvQixDQUZSO0FBR05jLHFCQUFhLEVBQUUxQixLQUFLLENBQUMyQixVQUFOLENBQWlCZixNQUFNLENBQUNnQixNQUF4QixDQUhUO0FBSU5DLFlBQUksRUFBRTNCLEtBQUssQ0FBQzJCO0FBSk47QUFENEMsS0FEdEMsRUFRYkMsSUFSTDtBQVNELEdBWEQsQ0FXRSxPQUFPQyxHQUFQLEVBQVk7QUFDWixVQUFNQyxNQUFNLENBQUNDLE1BQVAsQ0FDSixJQUFJQyxLQUFKLENBQVcscURBQW9ESCxHQUFHLENBQUNJLE9BQVEsRUFBM0UsQ0FESSxFQUVKO0FBQUVoQyxjQUFRLEVBQUU0QixHQUFHLENBQUM1QjtBQUFoQixLQUZJLENBQU47QUFJRDs7QUFFRCxRQUFNaUMsYUFBYSxHQUFHbEIsZUFBZSxDQUFDbUIsWUFBdEM7QUFDQSxRQUFNQyxTQUFTLEdBQUdwQixlQUFlLENBQUNxQixVQUFsQzs7QUFFQSxNQUFJLENBQUNILGFBQUwsRUFBb0I7QUFDbEIsVUFBTSxJQUFJRixLQUFKLENBQVUsc0RBQ0MsZ0RBQStDaEIsZUFBZ0IsRUFEMUUsQ0FBTjtBQUVEOztBQUNELFNBQU87QUFDTDlCLGVBQVcsRUFBRWdELGFBRFI7QUFFTC9CLGFBQVMsRUFBRWlDO0FBRk4sR0FBUDtBQUlELENBbkNEOztBQXFDQSxNQUFNOUMsV0FBVyxHQUFHLENBQUNKLFdBQUQsRUFBY0ssTUFBZCxLQUF5QjtBQUMzQyxRQUFNbUIsTUFBTSxHQUFHQyxvQkFBb0IsQ0FBQ0MsY0FBckIsQ0FBb0NDLE9BQXBDLENBQTRDO0FBQUNDLFdBQU8sRUFBRTtBQUFWLEdBQTVDLENBQWY7QUFDQSxNQUFJLENBQUNKLE1BQUwsRUFDRSxNQUFNLElBQUlDLG9CQUFvQixDQUFDSSxXQUF6QixFQUFOLENBSHlDLENBSzNDO0FBQ0E7O0FBQ0EsUUFBTXVCLElBQUksR0FBRzNELE1BQU0sQ0FBQzRELFVBQVAsQ0FBa0IsUUFBbEIsRUFBNEJ6QyxLQUFLLENBQUMyQixVQUFOLENBQWlCZixNQUFNLENBQUNnQixNQUF4QixDQUE1QixDQUFiO0FBQ0FZLE1BQUksQ0FBQ0UsTUFBTCxDQUFZdEQsV0FBWjs7QUFFQSxNQUFJO0FBQ0YsV0FBTytCLElBQUksQ0FBQ0MsR0FBTCxDQUFTLG9DQUFULEVBQStDO0FBQ3BEQyxZQUFNLEVBQUU7QUFDTmdCLG9CQUFZLEVBQUVqRCxXQURSO0FBRU51RCx1QkFBZSxFQUFFSCxJQUFJLENBQUNJLE1BQUwsQ0FBWSxLQUFaLENBRlg7QUFHTm5ELGNBQU0sRUFBRUEsTUFBTSxDQUFDb0QsSUFBUCxDQUFZLEdBQVo7QUFIRjtBQUQ0QyxLQUEvQyxFQU1KZixJQU5IO0FBT0QsR0FSRCxDQVFFLE9BQU9DLEdBQVAsRUFBWTtBQUNaLFVBQU1DLE1BQU0sQ0FBQ0MsTUFBUCxDQUNKLElBQUlDLEtBQUosQ0FBVywyQ0FBMENILEdBQUcsQ0FBQ0ksT0FBUSxFQUFqRSxDQURJLEVBRUo7QUFBRWhDLGNBQVEsRUFBRTRCLEdBQUcsQ0FBQzVCO0FBQWhCLEtBRkksQ0FBTjtBQUlEO0FBQ0YsQ0F4QkQ7O0FBMEJBakIsUUFBUSxDQUFDNEQsa0JBQVQsR0FBOEIsQ0FBQ0MsZUFBRCxFQUFrQkMsZ0JBQWxCLEtBQzVCaEQsS0FBSyxDQUFDOEMsa0JBQU4sQ0FBeUJDLGVBQXpCLEVBQTBDQyxnQkFBMUMsQ0FERixDIiwiZmlsZSI6Ii9wYWNrYWdlcy9mYWNlYm9vay1vYXV0aC5qcyIsInNvdXJjZXNDb250ZW50IjpbIkZhY2Vib29rID0ge307XG5pbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5cbkZhY2Vib29rLmhhbmRsZUF1dGhGcm9tQWNjZXNzVG9rZW4gPSAoYWNjZXNzVG9rZW4sIGV4cGlyZXNBdCkgPT4ge1xuICAvLyBpbmNsdWRlIGJhc2ljIGZpZWxkcyBmcm9tIGZhY2Vib29rXG4gIC8vIGh0dHBzOi8vZGV2ZWxvcGVycy5mYWNlYm9vay5jb20vZG9jcy9mYWNlYm9vay1sb2dpbi9wZXJtaXNzaW9ucy9cbiAgY29uc3Qgd2hpdGVsaXN0ZWQgPSBbJ2lkJywgJ2VtYWlsJywgJ25hbWUnLCAnZmlyc3RfbmFtZScsICdsYXN0X25hbWUnLFxuICAgICdtaWRkbGVfbmFtZScsICduYW1lX2Zvcm1hdCcsICdwaWN0dXJlJywgJ3Nob3J0X25hbWUnXTtcblxuICBjb25zdCBpZGVudGl0eSA9IGdldElkZW50aXR5KGFjY2Vzc1Rva2VuLCB3aGl0ZWxpc3RlZCk7XG5cbiAgY29uc3QgZmllbGRzID0ge307XG4gIHdoaXRlbGlzdGVkLmZvckVhY2goZmllbGQgPT4gZmllbGRzW2ZpZWxkXSA9IGlkZW50aXR5W2ZpZWxkXSk7XG4gIGNvbnN0IHNlcnZpY2VEYXRhID0ge1xuICAgIGFjY2Vzc1Rva2VuLFxuICAgIGV4cGlyZXNBdCxcbiAgICAuLi5maWVsZHMsXG4gIH07XG4gIFxuICByZXR1cm4ge1xuICAgIHNlcnZpY2VEYXRhLFxuICAgIG9wdGlvbnM6IHtwcm9maWxlOiB7bmFtZTogaWRlbnRpdHkubmFtZX19XG4gIH07XG59O1xuXG5PQXV0aC5yZWdpc3RlclNlcnZpY2UoJ2ZhY2Vib29rJywgMiwgbnVsbCwgcXVlcnkgPT4ge1xuICBjb25zdCByZXNwb25zZSA9IGdldFRva2VuUmVzcG9uc2UocXVlcnkpO1xuICBjb25zdCB7IGFjY2Vzc1Rva2VuIH0gPSByZXNwb25zZTtcbiAgY29uc3QgeyBleHBpcmVzSW4gfSA9IHJlc3BvbnNlO1xuXG4gIHJldHVybiBGYWNlYm9vay5oYW5kbGVBdXRoRnJvbUFjY2Vzc1Rva2VuKGFjY2Vzc1Rva2VuLCAoK25ldyBEYXRlKSArICgxMDAwICogZXhwaXJlc0luKSk7XG59KTtcblxuLy8gY2hlY2tzIHdoZXRoZXIgYSBzdHJpbmcgcGFyc2VzIGFzIEpTT05cbmNvbnN0IGlzSlNPTiA9IHN0ciA9PiB7XG4gIHRyeSB7XG4gICAgSlNPTi5wYXJzZShzdHIpO1xuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59O1xuXG4vLyByZXR1cm5zIGFuIG9iamVjdCBjb250YWluaW5nOlxuLy8gLSBhY2Nlc3NUb2tlblxuLy8gLSBleHBpcmVzSW46IGxpZmV0aW1lIG9mIHRva2VuIGluIHNlY29uZHNcbmNvbnN0IGdldFRva2VuUmVzcG9uc2UgPSBxdWVyeSA9PiB7XG4gIGNvbnN0IGNvbmZpZyA9IFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLmZpbmRPbmUoe3NlcnZpY2U6ICdmYWNlYm9vayd9KTtcbiAgaWYgKCFjb25maWcpXG4gICAgdGhyb3cgbmV3IFNlcnZpY2VDb25maWd1cmF0aW9uLkNvbmZpZ0Vycm9yKCk7XG5cbiAgbGV0IHJlc3BvbnNlQ29udGVudDtcbiAgdHJ5IHtcbiAgICAvLyBSZXF1ZXN0IGFuIGFjY2VzcyB0b2tlblxuICAgIHJlc3BvbnNlQ29udGVudCA9IEhUVFAuZ2V0KFxuICAgICAgXCJodHRwczovL2dyYXBoLmZhY2Vib29rLmNvbS92My4wL29hdXRoL2FjY2Vzc190b2tlblwiLCB7XG4gICAgICAgIHBhcmFtczoge1xuICAgICAgICAgIGNsaWVudF9pZDogY29uZmlnLmFwcElkLFxuICAgICAgICAgIHJlZGlyZWN0X3VyaTogT0F1dGguX3JlZGlyZWN0VXJpKCdmYWNlYm9vaycsIGNvbmZpZyksXG4gICAgICAgICAgY2xpZW50X3NlY3JldDogT0F1dGgub3BlblNlY3JldChjb25maWcuc2VjcmV0KSxcbiAgICAgICAgICBjb2RlOiBxdWVyeS5jb2RlXG4gICAgICAgIH1cbiAgICAgIH0pLmRhdGE7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHRocm93IE9iamVjdC5hc3NpZ24oXG4gICAgICBuZXcgRXJyb3IoYEZhaWxlZCB0byBjb21wbGV0ZSBPQXV0aCBoYW5kc2hha2Ugd2l0aCBGYWNlYm9vay4gJHtlcnIubWVzc2FnZX1gKSxcbiAgICAgIHsgcmVzcG9uc2U6IGVyci5yZXNwb25zZSB9LFxuICAgICk7XG4gIH1cblxuICBjb25zdCBmYkFjY2Vzc1Rva2VuID0gcmVzcG9uc2VDb250ZW50LmFjY2Vzc190b2tlbjtcbiAgY29uc3QgZmJFeHBpcmVzID0gcmVzcG9uc2VDb250ZW50LmV4cGlyZXNfaW47XG5cbiAgaWYgKCFmYkFjY2Vzc1Rva2VuKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGNvbXBsZXRlIE9BdXRoIGhhbmRzaGFrZSB3aXRoIGZhY2Vib29rIFwiICtcbiAgICAgICAgICAgICAgICAgICAgYC0tIGNhbid0IGZpbmQgYWNjZXNzIHRva2VuIGluIEhUVFAgcmVzcG9uc2UuICR7cmVzcG9uc2VDb250ZW50fWApO1xuICB9XG4gIHJldHVybiB7XG4gICAgYWNjZXNzVG9rZW46IGZiQWNjZXNzVG9rZW4sXG4gICAgZXhwaXJlc0luOiBmYkV4cGlyZXNcbiAgfTtcbn07XG5cbmNvbnN0IGdldElkZW50aXR5ID0gKGFjY2Vzc1Rva2VuLCBmaWVsZHMpID0+IHtcbiAgY29uc3QgY29uZmlnID0gU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMuZmluZE9uZSh7c2VydmljZTogJ2ZhY2Vib29rJ30pO1xuICBpZiAoIWNvbmZpZylcbiAgICB0aHJvdyBuZXcgU2VydmljZUNvbmZpZ3VyYXRpb24uQ29uZmlnRXJyb3IoKTtcblxuICAvLyBHZW5lcmF0ZSBhcHAgc2VjcmV0IHByb29mIHRoYXQgaXMgYSBzaGEyNTYgaGFzaCBvZiB0aGUgYXBwIGFjY2VzcyB0b2tlbiwgd2l0aCB0aGUgYXBwIHNlY3JldCBhcyB0aGUga2V5XG4gIC8vIGh0dHBzOi8vZGV2ZWxvcGVycy5mYWNlYm9vay5jb20vZG9jcy9ncmFwaC1hcGkvc2VjdXJpbmctcmVxdWVzdHMjYXBwc2VjcmV0X3Byb29mXG4gIGNvbnN0IGhtYWMgPSBjcnlwdG8uY3JlYXRlSG1hYygnc2hhMjU2JywgT0F1dGgub3BlblNlY3JldChjb25maWcuc2VjcmV0KSk7XG4gIGhtYWMudXBkYXRlKGFjY2Vzc1Rva2VuKTtcblxuICB0cnkge1xuICAgIHJldHVybiBIVFRQLmdldChcImh0dHBzOi8vZ3JhcGguZmFjZWJvb2suY29tL3YzLjAvbWVcIiwge1xuICAgICAgcGFyYW1zOiB7XG4gICAgICAgIGFjY2Vzc190b2tlbjogYWNjZXNzVG9rZW4sXG4gICAgICAgIGFwcHNlY3JldF9wcm9vZjogaG1hYy5kaWdlc3QoJ2hleCcpLFxuICAgICAgICBmaWVsZHM6IGZpZWxkcy5qb2luKFwiLFwiKVxuICAgICAgfVxuICAgIH0pLmRhdGE7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHRocm93IE9iamVjdC5hc3NpZ24oXG4gICAgICBuZXcgRXJyb3IoYEZhaWxlZCB0byBmZXRjaCBpZGVudGl0eSBmcm9tIEZhY2Vib29rLiAke2Vyci5tZXNzYWdlfWApLFxuICAgICAgeyByZXNwb25zZTogZXJyLnJlc3BvbnNlIH0sXG4gICAgKTtcbiAgfVxufTtcblxuRmFjZWJvb2sucmV0cmlldmVDcmVkZW50aWFsID0gKGNyZWRlbnRpYWxUb2tlbiwgY3JlZGVudGlhbFNlY3JldCkgPT5cbiAgT0F1dGgucmV0cmlldmVDcmVkZW50aWFsKGNyZWRlbnRpYWxUb2tlbiwgY3JlZGVudGlhbFNlY3JldCk7XG5cbiJdfQ==
