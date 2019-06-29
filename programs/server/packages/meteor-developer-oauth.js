(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var OAuth = Package.oauth.OAuth;
var Oauth = Package.oauth.Oauth;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var ECMAScript = Package.ecmascript.ECMAScript;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var MeteorDeveloperAccounts;

var require = meteorInstall({"node_modules":{"meteor":{"meteor-developer-oauth":{"meteor_developer_common.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/meteor-developer-oauth/meteor_developer_common.js                                                   //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
MeteorDeveloperAccounts = {};
MeteorDeveloperAccounts._server = "https://www.meteor.com"; // Options are:
//  - developerAccountsServer: defaults to "https://www.meteor.com"

MeteorDeveloperAccounts._config = options => {
  if (options.developerAccountsServer) {
    MeteorDeveloperAccounts._server = options.developerAccountsServer;
  }
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"meteor_developer_server.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/meteor-developer-oauth/meteor_developer_server.js                                                   //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
OAuth.registerService("meteor-developer", 2, null, query => {
  const response = getTokens(query);
  const {
    accessToken
  } = response;
  const identity = getIdentity(accessToken);
  const serviceData = {
    accessToken: OAuth.sealSecret(accessToken),
    expiresAt: +new Date() + 1000 * response.expiresIn
  };
  Object.assign(serviceData, identity); // only set the token in serviceData if it's there. this ensures
  // that we don't lose old ones (since we only get this on the first
  // log in attempt)

  if (response.refreshToken) serviceData.refreshToken = OAuth.sealSecret(response.refreshToken);
  return {
    serviceData,
    options: {
      profile: {
        name: serviceData.username
      } // XXX use username for name until meteor accounts has a profile with a name

    }
  };
}); // returns an object containing:
// - accessToken
// - expiresIn: lifetime of token in seconds
// - refreshToken, if this is the first authorization request and we got a
//   refresh token from the server

const getTokens = query => {
  const config = ServiceConfiguration.configurations.findOne({
    service: 'meteor-developer'
  });
  if (!config) throw new ServiceConfiguration.ConfigError();
  let response;

  try {
    response = HTTP.post(MeteorDeveloperAccounts._server + "/oauth2/token", {
      params: {
        grant_type: "authorization_code",
        code: query.code,
        client_id: config.clientId,
        client_secret: OAuth.openSecret(config.secret),
        redirect_uri: OAuth._redirectUri('meteor-developer', config)
      }
    });
  } catch (err) {
    throw Object.assign(new Error("Failed to complete OAuth handshake with Meteor developer accounts. " + err.message), {
      response: err.response
    });
  }

  if (!response.data || response.data.error) {
    // if the http response was a json object with an error attribute
    throw new Error("Failed to complete OAuth handshake with Meteor developer accounts. " + (response.data ? response.data.error : "No response data"));
  } else {
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresIn: response.data.expires_in
    };
  }
};

const getIdentity = accessToken => {
  try {
    return HTTP.get(`${MeteorDeveloperAccounts._server}/api/v1/identity`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).data;
  } catch (err) {
    throw Object.assign(new Error("Failed to fetch identity from Meteor developer accounts. " + err.message), {
      response: err.response
    });
  }
};

MeteorDeveloperAccounts.retrieveCredential = (credentialToken, credentialSecret) => OAuth.retrieveCredential(credentialToken, credentialSecret);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/meteor-developer-oauth/meteor_developer_common.js");
require("/node_modules/meteor/meteor-developer-oauth/meteor_developer_server.js");

/* Exports */
Package._define("meteor-developer-oauth", {
  MeteorDeveloperAccounts: MeteorDeveloperAccounts
});

})();

//# sourceURL=meteor://💻app/packages/meteor-developer-oauth.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWV0ZW9yLWRldmVsb3Blci1vYXV0aC9tZXRlb3JfZGV2ZWxvcGVyX2NvbW1vbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbWV0ZW9yLWRldmVsb3Blci1vYXV0aC9tZXRlb3JfZGV2ZWxvcGVyX3NlcnZlci5qcyJdLCJuYW1lcyI6WyJNZXRlb3JEZXZlbG9wZXJBY2NvdW50cyIsIl9zZXJ2ZXIiLCJfY29uZmlnIiwib3B0aW9ucyIsImRldmVsb3BlckFjY291bnRzU2VydmVyIiwiT0F1dGgiLCJyZWdpc3RlclNlcnZpY2UiLCJxdWVyeSIsInJlc3BvbnNlIiwiZ2V0VG9rZW5zIiwiYWNjZXNzVG9rZW4iLCJpZGVudGl0eSIsImdldElkZW50aXR5Iiwic2VydmljZURhdGEiLCJzZWFsU2VjcmV0IiwiZXhwaXJlc0F0IiwiRGF0ZSIsImV4cGlyZXNJbiIsIk9iamVjdCIsImFzc2lnbiIsInJlZnJlc2hUb2tlbiIsInByb2ZpbGUiLCJuYW1lIiwidXNlcm5hbWUiLCJjb25maWciLCJTZXJ2aWNlQ29uZmlndXJhdGlvbiIsImNvbmZpZ3VyYXRpb25zIiwiZmluZE9uZSIsInNlcnZpY2UiLCJDb25maWdFcnJvciIsIkhUVFAiLCJwb3N0IiwicGFyYW1zIiwiZ3JhbnRfdHlwZSIsImNvZGUiLCJjbGllbnRfaWQiLCJjbGllbnRJZCIsImNsaWVudF9zZWNyZXQiLCJvcGVuU2VjcmV0Iiwic2VjcmV0IiwicmVkaXJlY3RfdXJpIiwiX3JlZGlyZWN0VXJpIiwiZXJyIiwiRXJyb3IiLCJtZXNzYWdlIiwiZGF0YSIsImVycm9yIiwiYWNjZXNzX3Rva2VuIiwicmVmcmVzaF90b2tlbiIsImV4cGlyZXNfaW4iLCJnZXQiLCJoZWFkZXJzIiwiQXV0aG9yaXphdGlvbiIsInJldHJpZXZlQ3JlZGVudGlhbCIsImNyZWRlbnRpYWxUb2tlbiIsImNyZWRlbnRpYWxTZWNyZXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7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QyxLQUE5QixHQUNBLGtCQUZILENBREksQ0FBTjtBQUtELEdBUEQsTUFPTztBQUNMLFdBQU87QUFDTHBDLGlCQUFXLEVBQUVGLFFBQVEsQ0FBQ3FDLElBQVQsQ0FBY0UsWUFEdEI7QUFFTDNCLGtCQUFZLEVBQUVaLFFBQVEsQ0FBQ3FDLElBQVQsQ0FBY0csYUFGdkI7QUFHTC9CLGVBQVMsRUFBRVQsUUFBUSxDQUFDcUMsSUFBVCxDQUFjSTtBQUhwQixLQUFQO0FBS0Q7QUFDRixDQTVDRDs7QUE4Q0EsTUFBTXJDLFdBQVcsR0FBR0YsV0FBVyxJQUFJO0FBQ2pDLE1BQUk7QUFDRixXQUFPb0IsSUFBSSxDQUFDb0IsR0FBTCxDQUNKLEdBQUVsRCx1QkFBdUIsQ0FBQ0MsT0FBUSxrQkFEOUIsRUFFTDtBQUNFa0QsYUFBTyxFQUFFO0FBQUVDLHFCQUFhLEVBQUcsVUFBUzFDLFdBQVk7QUFBdkM7QUFEWCxLQUZLLEVBS0xtQyxJQUxGO0FBTUQsR0FQRCxDQU9FLE9BQU9ILEdBQVAsRUFBWTtBQUNaLFVBQU14QixNQUFNLENBQUNDLE1BQVAsQ0FDSixJQUFJd0IsS0FBSixDQUFVLDhEQUNBRCxHQUFHLENBQUNFLE9BRGQsQ0FESSxFQUdKO0FBQUNwQyxjQUFRLEVBQUVrQyxHQUFHLENBQUNsQztBQUFmLEtBSEksQ0FBTjtBQUtEO0FBQ0YsQ0FmRDs7QUFpQkFSLHVCQUF1QixDQUFDcUQsa0JBQXhCLEdBQ0UsQ0FBQ0MsZUFBRCxFQUFrQkMsZ0JBQWxCLEtBQ0VsRCxLQUFLLENBQUNnRCxrQkFBTixDQUF5QkMsZUFBekIsRUFBMENDLGdCQUExQyxDQUZKLEMiLCJmaWxlIjoiL3BhY2thZ2VzL21ldGVvci1kZXZlbG9wZXItb2F1dGguanMiLCJzb3VyY2VzQ29udGVudCI6WyJNZXRlb3JEZXZlbG9wZXJBY2NvdW50cyA9IHt9O1xuXG5NZXRlb3JEZXZlbG9wZXJBY2NvdW50cy5fc2VydmVyID0gXCJodHRwczovL3d3dy5tZXRlb3IuY29tXCI7XG5cbi8vIE9wdGlvbnMgYXJlOlxuLy8gIC0gZGV2ZWxvcGVyQWNjb3VudHNTZXJ2ZXI6IGRlZmF1bHRzIHRvIFwiaHR0cHM6Ly93d3cubWV0ZW9yLmNvbVwiXG5NZXRlb3JEZXZlbG9wZXJBY2NvdW50cy5fY29uZmlnID0gb3B0aW9ucyA9PiB7XG4gIGlmIChvcHRpb25zLmRldmVsb3BlckFjY291bnRzU2VydmVyKSB7XG4gICAgTWV0ZW9yRGV2ZWxvcGVyQWNjb3VudHMuX3NlcnZlciA9IG9wdGlvbnMuZGV2ZWxvcGVyQWNjb3VudHNTZXJ2ZXI7XG4gIH1cbn07XG4iLCJPQXV0aC5yZWdpc3RlclNlcnZpY2UoXCJtZXRlb3ItZGV2ZWxvcGVyXCIsIDIsIG51bGwsIHF1ZXJ5ID0+IHtcbiAgY29uc3QgcmVzcG9uc2UgPSBnZXRUb2tlbnMocXVlcnkpO1xuICBjb25zdCB7IGFjY2Vzc1Rva2VuIH0gPSByZXNwb25zZTtcbiAgY29uc3QgaWRlbnRpdHkgPSBnZXRJZGVudGl0eShhY2Nlc3NUb2tlbik7XG5cbiAgY29uc3Qgc2VydmljZURhdGEgPSB7XG4gICAgYWNjZXNzVG9rZW46IE9BdXRoLnNlYWxTZWNyZXQoYWNjZXNzVG9rZW4pLFxuICAgIGV4cGlyZXNBdDogKCtuZXcgRGF0ZSkgKyAoMTAwMCAqIHJlc3BvbnNlLmV4cGlyZXNJbilcbiAgfTtcblxuICBPYmplY3QuYXNzaWduKHNlcnZpY2VEYXRhLCBpZGVudGl0eSk7XG5cbiAgLy8gb25seSBzZXQgdGhlIHRva2VuIGluIHNlcnZpY2VEYXRhIGlmIGl0J3MgdGhlcmUuIHRoaXMgZW5zdXJlc1xuICAvLyB0aGF0IHdlIGRvbid0IGxvc2Ugb2xkIG9uZXMgKHNpbmNlIHdlIG9ubHkgZ2V0IHRoaXMgb24gdGhlIGZpcnN0XG4gIC8vIGxvZyBpbiBhdHRlbXB0KVxuICBpZiAocmVzcG9uc2UucmVmcmVzaFRva2VuKVxuICAgIHNlcnZpY2VEYXRhLnJlZnJlc2hUb2tlbiA9IE9BdXRoLnNlYWxTZWNyZXQocmVzcG9uc2UucmVmcmVzaFRva2VuKTtcblxuICByZXR1cm4ge1xuICAgIHNlcnZpY2VEYXRhLFxuICAgIG9wdGlvbnM6IHtwcm9maWxlOiB7bmFtZTogc2VydmljZURhdGEudXNlcm5hbWV9fVxuICAgIC8vIFhYWCB1c2UgdXNlcm5hbWUgZm9yIG5hbWUgdW50aWwgbWV0ZW9yIGFjY291bnRzIGhhcyBhIHByb2ZpbGUgd2l0aCBhIG5hbWVcbiAgfTtcbn0pO1xuXG4vLyByZXR1cm5zIGFuIG9iamVjdCBjb250YWluaW5nOlxuLy8gLSBhY2Nlc3NUb2tlblxuLy8gLSBleHBpcmVzSW46IGxpZmV0aW1lIG9mIHRva2VuIGluIHNlY29uZHNcbi8vIC0gcmVmcmVzaFRva2VuLCBpZiB0aGlzIGlzIHRoZSBmaXJzdCBhdXRob3JpemF0aW9uIHJlcXVlc3QgYW5kIHdlIGdvdCBhXG4vLyAgIHJlZnJlc2ggdG9rZW4gZnJvbSB0aGUgc2VydmVyXG5jb25zdCBnZXRUb2tlbnMgPSBxdWVyeSA9PiB7XG4gIGNvbnN0IGNvbmZpZyA9IFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLmZpbmRPbmUoe1xuICAgIHNlcnZpY2U6ICdtZXRlb3ItZGV2ZWxvcGVyJ1xuICB9KTtcbiAgaWYgKCFjb25maWcpXG4gICAgdGhyb3cgbmV3IFNlcnZpY2VDb25maWd1cmF0aW9uLkNvbmZpZ0Vycm9yKCk7XG5cbiAgbGV0IHJlc3BvbnNlO1xuICB0cnkge1xuICAgIHJlc3BvbnNlID0gSFRUUC5wb3N0KFxuICAgICAgTWV0ZW9yRGV2ZWxvcGVyQWNjb3VudHMuX3NlcnZlciArIFwiL29hdXRoMi90b2tlblwiLCB7XG4gICAgICAgIHBhcmFtczoge1xuICAgICAgICAgIGdyYW50X3R5cGU6IFwiYXV0aG9yaXphdGlvbl9jb2RlXCIsXG4gICAgICAgICAgY29kZTogcXVlcnkuY29kZSxcbiAgICAgICAgICBjbGllbnRfaWQ6IGNvbmZpZy5jbGllbnRJZCxcbiAgICAgICAgICBjbGllbnRfc2VjcmV0OiBPQXV0aC5vcGVuU2VjcmV0KGNvbmZpZy5zZWNyZXQpLFxuICAgICAgICAgIHJlZGlyZWN0X3VyaTogT0F1dGguX3JlZGlyZWN0VXJpKCdtZXRlb3ItZGV2ZWxvcGVyJywgY29uZmlnKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3cgT2JqZWN0LmFzc2lnbihcbiAgICAgIG5ldyBFcnJvcihcbiAgICAgICAgXCJGYWlsZWQgdG8gY29tcGxldGUgT0F1dGggaGFuZHNoYWtlIHdpdGggTWV0ZW9yIGRldmVsb3BlciBhY2NvdW50cy4gXCJcbiAgICAgICAgICArIGVyci5tZXNzYWdlXG4gICAgICApLFxuICAgICAge3Jlc3BvbnNlOiBlcnIucmVzcG9uc2V9XG4gICAgKTtcbiAgfVxuXG4gIGlmICghIHJlc3BvbnNlLmRhdGEgfHwgcmVzcG9uc2UuZGF0YS5lcnJvcikge1xuICAgIC8vIGlmIHRoZSBodHRwIHJlc3BvbnNlIHdhcyBhIGpzb24gb2JqZWN0IHdpdGggYW4gZXJyb3IgYXR0cmlidXRlXG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJGYWlsZWQgdG8gY29tcGxldGUgT0F1dGggaGFuZHNoYWtlIHdpdGggTWV0ZW9yIGRldmVsb3BlciBhY2NvdW50cy4gXCIgK1xuICAgICAgICAocmVzcG9uc2UuZGF0YSA/IHJlc3BvbnNlLmRhdGEuZXJyb3IgOlxuICAgICAgICAgXCJObyByZXNwb25zZSBkYXRhXCIpXG4gICAgKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgYWNjZXNzVG9rZW46IHJlc3BvbnNlLmRhdGEuYWNjZXNzX3Rva2VuLFxuICAgICAgcmVmcmVzaFRva2VuOiByZXNwb25zZS5kYXRhLnJlZnJlc2hfdG9rZW4sXG4gICAgICBleHBpcmVzSW46IHJlc3BvbnNlLmRhdGEuZXhwaXJlc19pblxuICAgIH07XG4gIH1cbn07XG5cbmNvbnN0IGdldElkZW50aXR5ID0gYWNjZXNzVG9rZW4gPT4ge1xuICB0cnkge1xuICAgIHJldHVybiBIVFRQLmdldChcbiAgICAgIGAke01ldGVvckRldmVsb3BlckFjY291bnRzLl9zZXJ2ZXJ9L2FwaS92MS9pZGVudGl0eWAsXG4gICAgICB7XG4gICAgICAgIGhlYWRlcnM6IHsgQXV0aG9yaXphdGlvbjogYEJlYXJlciAke2FjY2Vzc1Rva2VufWB9XG4gICAgICB9XG4gICAgKS5kYXRhO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICB0aHJvdyBPYmplY3QuYXNzaWduKFxuICAgICAgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGZldGNoIGlkZW50aXR5IGZyb20gTWV0ZW9yIGRldmVsb3BlciBhY2NvdW50cy4gXCIgK1xuICAgICAgICAgICAgICAgIGVyci5tZXNzYWdlKSxcbiAgICAgIHtyZXNwb25zZTogZXJyLnJlc3BvbnNlfVxuICAgICk7XG4gIH1cbn07XG5cbk1ldGVvckRldmVsb3BlckFjY291bnRzLnJldHJpZXZlQ3JlZGVudGlhbCA9IFxuICAoY3JlZGVudGlhbFRva2VuLCBjcmVkZW50aWFsU2VjcmV0KSA9PiBcbiAgICBPQXV0aC5yZXRyaWV2ZUNyZWRlbnRpYWwoY3JlZGVudGlhbFRva2VuLCBjcmVkZW50aWFsU2VjcmV0KTtcbiJdfQ==
