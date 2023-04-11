[![support](https://img.shields.io/badge/support-GitHub-white)](https://github.com/sponsors/dr-dimitru)
[![support](https://img.shields.io/badge/support-PayPal-white)](https://paypal.me/veliovgroup)
<a href="https://ostr.io/info/built-by-developers-for-developers">
  <img src="https://ostr.io/apple-touch-icon-60x60.png" height="20">
</a>

# Demo app

## Links:

- __[Heroku hosted Live Demo](https://files.veliov.com/)__

## Functionality:

- Upload / Download Files
- Stream Audio / Video Files
- Images, PDFs, Texts preview
- Drag'n'drop support (*files only, folders is not supported yet*)
- Image processing (*thumbnails, preview*)
- DropBox as storage (__note:__ *you can use only one of DropBox or S3 at the same app*)
- AWS:S3 as storage (__note:__ *you can use only one of DropBox or S3 at the same app*)
- Login via social networks (*allows to make uploaded files unlisted and/or private*)
- Heroku support (*including one-click-deploy*)

## Quick start:

### Activate AWS:S3

1. Read [this article](https://github.com/VeliovGroup/Meteor-Files/wiki/AWS-S3-Integration)
2. After creating S3 bucket, create CloudFront Distribution and attach it to S3 bucket
3. Set S3 credentials into `METEOR_SETTINGS` env.var or pass as the file, read [here for more info](http://docs.meteor.com/#/full/meteor_settings), alternatively (*if something not working*) set `S3` env.var
4. You can pass S3 credentials as JSON-string when using "*Heroku's one click install-button*"

S3 credentials format (*region is required*):

```json
{
  "s3": {
    "key": "xxx",
    "secret": "xxx",
    "bucket": "xxx",
    "region": "xxx"
  }
}
```

### Activate DropBox

1. Read [this article](https://github.com/VeliovGroup/Meteor-Files/wiki/DropBox-Integration)
2. Set DropBox credentials into `METEOR_SETTINGS` env.var or pass as file, read [here for more info](http://docs.meteor.com/#/full/meteor_settings), alternatively (*if something not working*) set `DROPBOX` env.var
3. You can pass DropBox credentials as JSON-string when using "*Heroku's one click install-button*"

DropBox credentials format:

```json
{
  "dropbox": {
    "key": "xxx",
    "secret": "xxx",
    "token": "xxx"
  }
}
```

### Activate login via Social Networks

All credentials is set via env.var(s), if you're using "*Heroku's one click install-button*" - you will be able to pass all of them.

- Facebook - [Create an App](https://developers.facebook.com/apps/):
  - secret: `ACCOUNTS_FACEBOOK_SEC`
  - appId: `ACCOUNTS_FACEBOOK_ID`
- Twitter - [Create an App](https://apps.twitter.com):
  - secret: `ACCOUNTS_TWITTER_SEC`
  - consumerKey: `ACCOUNTS_TWITTER_ID`
- GitHub - [Create OAuth App](https://github.com/settings/developers):
  - secret: `ACCOUNTS_GITHUB_SEC`
  - clientId: `ACCOUNTS_GITHUB_ID`
- Meteor Developer - [Create an App](https://www.meteor.com/account-settings):
  - secret: `ACCOUNTS_METEOR_SEC`
  - clientId: `ACCOUNTS_METEOR_ID`

### Deploy to Heroku

- Due to "*ephemeral filesystem*" on Heroku, we suggest to use 3rd-party permanent storage, [read DropBox/S3/GridFS tutorial](https://github.com/VeliovGroup/Meteor-Files/wiki/Third-party-storage)
- Go to [Heroku](https://signup.heroku.com/dc) create and confirm your new account
- Go through [Node.js Tutorial](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- Install [Heroku Toolbet](https://devcenter.heroku.com/articles/getting-started-with-nodejs#set-up)
- Then go to Terminal into Meteor's project directory and run:

```shell
# Build an app ypourself, or use pre-build version: https://github.com/VeliovGroup/Meteor-Files-Demo
# Available architectures:
# os.osx.x86_64
# os.linux.x86_64
# os.linux.x86_32
# os.windows.x86_32
meteor build ../build-<your-app-name> --architecture os.linux.x86_64
cd ../build-<your-app-name>
tar xzf <name-of-archive> -C ./
cd bundle/
cp -Rf * ../
cd ../
rm -Rf bundle/
rm -Rf <name-of-archive>
touch Procfile
echo "web: node main.js" > Procfile

heroku create <your-app-name> --buildpack https://github.com/heroku/heroku-buildpack-nodejs
# This command will output something like:
# - https://<your-app-name>.herokuapp.com/
# - https://git.heroku.com/<your-app-name>.git

# ONLY FOR CEDAR <= 14 - Add GraphicsMagick buildpack - for image manipulations
heroku buildpacks:add --index 1 https://github.com/mcollina/heroku-buildpack-graphicsmagick.git

# FOR CEDAR >= 16 - Add APT buildpack - to install graphicksmagick
heroku buildpacks:add --index 1 https://github.com/heroku/heroku-buildpack-apt

git init
heroku git:remote -a <your-app-name>

# Copy this: `https://<your-app-name>.herokuapp.com`, note `http(s)://` protocol
heroku config:set ROOT_URL=https://<your-app-name>.herokuapp.com
# To have a MongoDB, you can create one at https://mlab.com/
# After creating MongoDB instance create user, then copy URL to your MongoDB
# Should be something like: mongodb://<dbuser>:<dbpassword>@dt754268.mlab.com:19470/mydb
heroku config:set MONGO_URL=mongodb://<dbuser>:<dbpassword>@dt754268.mlab.com:19470/mydb

# For DropBox:
# heroku config:set DROPBOX='{"dropbox":{"key": "xxx", "secret": "xxx", "token": "xxx"}}'

# For AWS:S3:
# heroku config:set S3='{"s3":{"key": "xxx", "secret": "xxx", "bucket": "xxx", "region": "xxx"}}'

# For Facebook:
# heroku config:set ACCOUNTS_FACEBOOK_ID=xxx ACCOUNTS_FACEBOOK_SEC=yyy

# For Twitter:
# heroku config:set ACCOUNTS_TWITTER_ID=xxx ACCOUNTS_TWITTER_SEC=yyy

# For GitHub:
# heroku config:set ACCOUNTS_GITHUB_ID=xxx ACCOUNTS_GITHUB_SEC=yyy

# For Meteor Developer:
# heroku config:set ACCOUNTS_METEOR_ID=xxx ACCOUNTS_METEOR_SEC=yyy

# Enable sticky sessions, to support HTTP upload:
heroku features:enable http-session-affinity

git add .
git commit -m "initial"
git push heroku master
```

- Go to `https://<your-app-name>.herokuapp.com`
- If your app has errors:
  - Check logs: `heroku logs --tail`
  - Try to run locally and debug: `heroku run node`

## Support this project:

- Use [ostr.io](https://ostr.io) — [Monitoring](https://snmp-monitoring.com), [Analytics](https://ostr.io/info/web-analytics), [WebSec](https://domain-protection.info), [Web-CRON](https://web-cron.info) and [Pre-rendering](https://prerendering.com) for a website
- [Become a patron](https://www.patreon.com/bePatron?u=20396046) — support our open source contributions with monthly donation
- [Donate via PayPal](https://paypal.me/veliovgroup)
