Client Storage
========

 - Bulletproof Client storage functions, `localStorage` with fall-back to `cookies`
 - Works in browser with disabled `localStorage` and `cookies`
 - __100%__ tests coverage

Install:
========
```shell
npm install ClientStorage
```

Install Meteor:
========
```shell
meteor add ostrio:cstorage
```

Require:
========
```jsx
var ClientStorage = require('ClientStorage').ClientStorage;
```

ES6 Import (Meteor):
========
```jsx
import { ClientStorage } from 'meteor/ostrio:cstorage';
```


Usage:
========
#### Get
 - `ClientStorage.get('key')` - Read a record. If the key doesn't exist a null value will be returned.

#### Set
 - `ClientStorage.set('key', value)` - Create/overwrite a value in storage

#### Remove
 - `ClientStorage.remove('key')` - Remove a record

#### Has
 - `ClientStorage.has('key')` - Check whether a record exists, returns boolean value

#### Keys
 - `ClientStorage.keys()` - Returns an array of all storage keys

#### Empty
 - `ClientStorage.empty()` - Empty storage (remove all key/value pairs). __Use with caution! (*May remove cookies which was set not by you*)__

#### Use `cookies` only
To use `cookies` as a driver for `ClientStorage` create new instance of `clientStorage` (*camel-case, first letter __lower-case__*)
```js
var clientStorage  = require('ClientStorage').clientStorage;
var csCookies = new clientStorage('cookies');
```

or in ES6 (Meteor):
```jsx
import { clientStorage } from 'meteor/ostrio:cstorage';
let csLocalStorage = new clientStorage('cookies');
```

#### Use `localStorage` only
To use `localStorage` as a driver for `ClientStorage` create new instance of `clientStorage` (*camel-case, first letter __lower-case__*):
```js
var clientStorage  = require('ClientStorage').clientStorage;
var csLocalStorage = new clientStorage('localStorage');
```

or in ES6 (Meteor):
```jsx
import { clientStorage } from 'meteor/ostrio:cstorage';
let csLocalStorage = new clientStorage('localStorage');
```

__Note:__ *All instances shares same cookies and localStorage records!*



Example:
=========
```javascript
ClientStorage.set('locale', 'en'); // true
ClientStorage.set('country', 'usa'); // true
ClientStorage.set('gender', 'male'); // true

ClientStorage.get('gender'); // male

ClientStorage.has('locale'); // true
ClientStorage.has('city'); // false

ClientStorage.keys(); // ['locale', 'country', 'gender']

ClientStorage.remove('locale'); // true
ClientStorage.get('locale'); // undefined

ClientStorage.keys(); // ['country', 'gender']

ClientStorage.empty(); // true
ClientStorage.keys(); // []

ClientStorage.empty(); // false
```