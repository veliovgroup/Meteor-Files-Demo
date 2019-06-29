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
var Github;

var require = meteorInstall({"node_modules":{"meteor":{"github-oauth":{"github_server.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                     //
// packages/github-oauth/github_server.js                                                              //
//                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                       //
Github = {};
OAuth.registerService('github', 2, null, query => {
  const accessToken = getAccessToken(query);
  const identity = getIdentity(accessToken);
  const emails = getEmails(accessToken);
  const primaryEmail = emails.find(email => email.primary);
  return {
    serviceData: {
      id: identity.id,
      accessToken: OAuth.sealSecret(accessToken),
      email: identity.email || primaryEmail && primaryEmail.email || '',
      username: identity.login,
      emails
    },
    options: {
      profile: {
        name: identity.name
      }
    }
  };
}); // http://developer.github.com/v3/#user-agent-required

let userAgent = "Meteor";
if (Meteor.release) userAgent += `/${Meteor.release}`;

const getAccessToken = query => {
  const config = ServiceConfiguration.configurations.findOne({
    service: 'github'
  });
  if (!config) throw new ServiceConfiguration.ConfigError();
  let response;

  try {
    response = HTTP.post("https://github.com/login/oauth/access_token", {
      headers: {
        Accept: 'application/json',
        "User-Agent": userAgent
      },
      params: {
        code: query.code,
        client_id: config.clientId,
        client_secret: OAuth.openSecret(config.secret),
        redirect_uri: OAuth._redirectUri('github', config),
        state: query.state
      }
    });
  } catch (err) {
    throw Object.assign(new Error(`Failed to complete OAuth handshake with Github. ${err.message}`), {
      response: err.response
    });
  }

  if (response.data.error) {
    // if the http response was a json object with an error attribute
    throw new Error(`Failed to complete OAuth handshake with GitHub. ${response.data.error}`);
  } else {
    return response.data.access_token;
  }
};

const getIdentity = accessToken => {
  try {
    return HTTP.get("https://api.github.com/user", {
      headers: {
        "User-Agent": userAgent
      },
      // http://developer.github.com/v3/#user-agent-required
      params: {
        access_token: accessToken
      }
    }).data;
  } catch (err) {
    throw Object.assign(new Error(`Failed to fetch identity from Github. ${err.message}`), {
      response: err.response
    });
  }
};

const getEmails = accessToken => {
  try {
    return HTTP.get("https://api.github.com/user/emails", {
      headers: {
        "User-Agent": userAgent
      },
      // http://developer.github.com/v3/#user-agent-required
      params: {
        access_token: accessToken
      }
    }).data;
  } catch (err) {
    return [];
  }
};

Github.retrieveCredential = (credentialToken, credentialSecret) => OAuth.retrieveCredential(credentialToken, credentialSecret);
/////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/github-oauth/github_server.js");

/* Exports */
Package._define("github-oauth", {
  Github: Github
});

})();

//# sourceURL=meteor://💻app/packages/github-oauth.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvZ2l0aHViLW9hdXRoL2dpdGh1Yl9zZXJ2ZXIuanMiXSwibmFtZXMiOlsiR2l0aHViIiwiT0F1dGgiLCJyZWdpc3RlclNlcnZpY2UiLCJxdWVyeSIsImFjY2Vzc1Rva2VuIiwiZ2V0QWNjZXNzVG9rZW4iLCJpZGVudGl0eSIsImdldElkZW50aXR5IiwiZW1haWxzIiwiZ2V0RW1haWxzIiwicHJpbWFyeUVtYWlsIiwiZmluZCIsImVtYWlsIiwicHJpbWFyeSIsInNlcnZpY2VEYXRhIiwiaWQiLCJzZWFsU2VjcmV0IiwidXNlcm5hbWUiLCJsb2dpbiIsIm9wdGlvbnMiLCJwcm9maWxlIiwibmFtZSIsInVzZXJBZ2VudCIsIk1ldGVvciIsInJlbGVhc2UiLCJjb25maWciLCJTZXJ2aWNlQ29uZmlndXJhdGlvbiIsImNvbmZpZ3VyYXRpb25zIiwiZmluZE9uZSIsInNlcnZpY2UiLCJDb25maWdFcnJvciIsInJlc3BvbnNlIiwiSFRUUCIsInBvc3QiLCJoZWFkZXJzIiwiQWNjZXB0IiwicGFyYW1zIiwiY29kZSIsImNsaWVudF9pZCIsImNsaWVudElkIiwiY2xpZW50X3NlY3JldCIsIm9wZW5TZWNyZXQiLCJzZWNyZXQiLCJyZWRpcmVjdF91cmkiLCJfcmVkaXJlY3RVcmkiLCJzdGF0ZSIsImVyciIsIk9iamVjdCIsImFzc2lnbiIsIkVycm9yIiwibWVzc2FnZSIsImRhdGEiLCJlcnJvciIsImFjY2Vzc190b2tlbiIsImdldCIsInJldHJpZXZlQ3JlZGVudGlhbCIsImNyZWRlbnRpYWxUb2tlbiIsImNyZWRlbnRpYWxTZWNyZXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxNQUFNLEdBQUcsRUFBVDtBQUVBQyxLQUFLLENBQUNDLGVBQU4sQ0FBc0IsUUFBdEIsRUFBZ0MsQ0FBaEMsRUFBbUMsSUFBbkMsRUFBeUNDLEtBQUssSUFBSTtBQUVoRCxRQUFNQyxXQUFXLEdBQUdDLGNB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S0QsR0FORCxDQU1FLE9BQU9MLEdBQVAsRUFBWTtBQUNaLFVBQU1DLE1BQU0sQ0FBQ0MsTUFBUCxDQUNKLElBQUlDLEtBQUosQ0FBVyx5Q0FBd0NILEdBQUcsQ0FBQ0ksT0FBUSxFQUEvRCxDQURJLEVBRUo7QUFBRW5CLGNBQVEsRUFBRWUsR0FBRyxDQUFDZjtBQUFoQixLQUZJLENBQU47QUFJRDtBQUNGLENBYkQ7O0FBZUEsTUFBTXRCLFNBQVMsR0FBR0wsV0FBVyxJQUFJO0FBQy9CLE1BQUk7QUFDRixXQUFPNEIsSUFBSSxDQUFDc0IsR0FBTCxDQUNMLG9DQURLLEVBQ2lDO0FBQ3BDcEIsYUFBTyxFQUFFO0FBQUMsc0JBQWNaO0FBQWYsT0FEMkI7QUFDQTtBQUNwQ2MsWUFBTSxFQUFFO0FBQUNpQixvQkFBWSxFQUFFakQ7QUFBZjtBQUY0QixLQURqQyxFQUlGK0MsSUFKTDtBQUtELEdBTkQsQ0FNRSxPQUFPTCxHQUFQLEVBQVk7QUFDWixXQUFPLEVBQVA7QUFDRDtBQUNGLENBVkQ7O0FBWUE5QyxNQUFNLENBQUN1RCxrQkFBUCxHQUE0QixDQUFDQyxlQUFELEVBQWtCQyxnQkFBbEIsS0FDMUJ4RCxLQUFLLENBQUNzRCxrQkFBTixDQUF5QkMsZUFBekIsRUFBMENDLGdCQUExQyxDQURGLEMiLCJmaWxlIjoiL3BhY2thZ2VzL2dpdGh1Yi1vYXV0aC5qcyIsInNvdXJjZXNDb250ZW50IjpbIkdpdGh1YiA9IHt9O1xuXG5PQXV0aC5yZWdpc3RlclNlcnZpY2UoJ2dpdGh1YicsIDIsIG51bGwsIHF1ZXJ5ID0+IHtcblxuICBjb25zdCBhY2Nlc3NUb2tlbiA9IGdldEFjY2Vzc1Rva2VuKHF1ZXJ5KTtcbiAgY29uc3QgaWRlbnRpdHkgPSBnZXRJZGVudGl0eShhY2Nlc3NUb2tlbik7XG4gIGNvbnN0IGVtYWlscyA9IGdldEVtYWlscyhhY2Nlc3NUb2tlbik7XG4gIGNvbnN0IHByaW1hcnlFbWFpbCA9IGVtYWlscy5maW5kKGVtYWlsID0+IGVtYWlsLnByaW1hcnkpO1xuXG4gIHJldHVybiB7XG4gICAgc2VydmljZURhdGE6IHtcbiAgICAgIGlkOiBpZGVudGl0eS5pZCxcbiAgICAgIGFjY2Vzc1Rva2VuOiBPQXV0aC5zZWFsU2VjcmV0KGFjY2Vzc1Rva2VuKSxcbiAgICAgIGVtYWlsOiBpZGVudGl0eS5lbWFpbCB8fCAocHJpbWFyeUVtYWlsICYmIHByaW1hcnlFbWFpbC5lbWFpbCkgfHwgJycsXG4gICAgICB1c2VybmFtZTogaWRlbnRpdHkubG9naW4sXG4gICAgICBlbWFpbHMsXG4gICAgfSxcbiAgICBvcHRpb25zOiB7cHJvZmlsZToge25hbWU6IGlkZW50aXR5Lm5hbWV9fVxuICB9O1xufSk7XG5cbi8vIGh0dHA6Ly9kZXZlbG9wZXIuZ2l0aHViLmNvbS92My8jdXNlci1hZ2VudC1yZXF1aXJlZFxubGV0IHVzZXJBZ2VudCA9IFwiTWV0ZW9yXCI7XG5pZiAoTWV0ZW9yLnJlbGVhc2UpXG4gIHVzZXJBZ2VudCArPSBgLyR7TWV0ZW9yLnJlbGVhc2V9YDtcblxuY29uc3QgZ2V0QWNjZXNzVG9rZW4gPSBxdWVyeSA9PiB7XG4gIGNvbnN0IGNvbmZpZyA9IFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLmZpbmRPbmUoe3NlcnZpY2U6ICdnaXRodWInfSk7XG4gIGlmICghY29uZmlnKVxuICAgIHRocm93IG5ldyBTZXJ2aWNlQ29uZmlndXJhdGlvbi5Db25maWdFcnJvcigpO1xuXG4gIGxldCByZXNwb25zZTtcbiAgdHJ5IHtcbiAgICByZXNwb25zZSA9IEhUVFAucG9zdChcbiAgICAgIFwiaHR0cHM6Ly9naXRodWIuY29tL2xvZ2luL29hdXRoL2FjY2Vzc190b2tlblwiLCB7XG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBBY2NlcHQ6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICBcIlVzZXItQWdlbnRcIjogdXNlckFnZW50XG4gICAgICAgIH0sXG4gICAgICAgIHBhcmFtczoge1xuICAgICAgICAgIGNvZGU6IHF1ZXJ5LmNvZGUsXG4gICAgICAgICAgY2xpZW50X2lkOiBjb25maWcuY2xpZW50SWQsXG4gICAgICAgICAgY2xpZW50X3NlY3JldDogT0F1dGgub3BlblNlY3JldChjb25maWcuc2VjcmV0KSxcbiAgICAgICAgICByZWRpcmVjdF91cmk6IE9BdXRoLl9yZWRpcmVjdFVyaSgnZ2l0aHViJywgY29uZmlnKSxcbiAgICAgICAgICBzdGF0ZTogcXVlcnkuc3RhdGVcbiAgICAgICAgfVxuICAgICAgfSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHRocm93IE9iamVjdC5hc3NpZ24oXG4gICAgICBuZXcgRXJyb3IoYEZhaWxlZCB0byBjb21wbGV0ZSBPQXV0aCBoYW5kc2hha2Ugd2l0aCBHaXRodWIuICR7ZXJyLm1lc3NhZ2V9YCksXG4gICAgICB7IHJlc3BvbnNlOiBlcnIucmVzcG9uc2UgfSxcbiAgICApO1xuICB9XG4gIGlmIChyZXNwb25zZS5kYXRhLmVycm9yKSB7IC8vIGlmIHRoZSBodHRwIHJlc3BvbnNlIHdhcyBhIGpzb24gb2JqZWN0IHdpdGggYW4gZXJyb3IgYXR0cmlidXRlXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY29tcGxldGUgT0F1dGggaGFuZHNoYWtlIHdpdGggR2l0SHViLiAke3Jlc3BvbnNlLmRhdGEuZXJyb3J9YCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHJlc3BvbnNlLmRhdGEuYWNjZXNzX3Rva2VuO1xuICB9XG59O1xuXG5jb25zdCBnZXRJZGVudGl0eSA9IGFjY2Vzc1Rva2VuID0+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gSFRUUC5nZXQoXG4gICAgICBcImh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vdXNlclwiLCB7XG4gICAgICAgIGhlYWRlcnM6IHtcIlVzZXItQWdlbnRcIjogdXNlckFnZW50fSwgLy8gaHR0cDovL2RldmVsb3Blci5naXRodWIuY29tL3YzLyN1c2VyLWFnZW50LXJlcXVpcmVkXG4gICAgICAgIHBhcmFtczoge2FjY2Vzc190b2tlbjogYWNjZXNzVG9rZW59XG4gICAgICB9KS5kYXRhO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICB0aHJvdyBPYmplY3QuYXNzaWduKFxuICAgICAgbmV3IEVycm9yKGBGYWlsZWQgdG8gZmV0Y2ggaWRlbnRpdHkgZnJvbSBHaXRodWIuICR7ZXJyLm1lc3NhZ2V9YCksXG4gICAgICB7IHJlc3BvbnNlOiBlcnIucmVzcG9uc2UgfSxcbiAgICApO1xuICB9XG59O1xuXG5jb25zdCBnZXRFbWFpbHMgPSBhY2Nlc3NUb2tlbiA9PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEhUVFAuZ2V0KFxuICAgICAgXCJodHRwczovL2FwaS5naXRodWIuY29tL3VzZXIvZW1haWxzXCIsIHtcbiAgICAgICAgaGVhZGVyczoge1wiVXNlci1BZ2VudFwiOiB1c2VyQWdlbnR9LCAvLyBodHRwOi8vZGV2ZWxvcGVyLmdpdGh1Yi5jb20vdjMvI3VzZXItYWdlbnQtcmVxdWlyZWRcbiAgICAgICAgcGFyYW1zOiB7YWNjZXNzX3Rva2VuOiBhY2Nlc3NUb2tlbn1cbiAgICAgIH0pLmRhdGE7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBbXTtcbiAgfVxufTtcblxuR2l0aHViLnJldHJpZXZlQ3JlZGVudGlhbCA9IChjcmVkZW50aWFsVG9rZW4sIGNyZWRlbnRpYWxTZWNyZXQpID0+XG4gIE9BdXRoLnJldHJpZXZlQ3JlZGVudGlhbChjcmVkZW50aWFsVG9rZW4sIGNyZWRlbnRpYWxTZWNyZXQpO1xuIl19
