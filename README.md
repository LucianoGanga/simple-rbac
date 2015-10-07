# simple-rbac - introduction
Simple RBAC (Role-based access control) for mongoose apps

#### We recommend using simple-rbac with this modules too
* [simple-rbac-utils](https://github.com/LucianoGanga/simple-rbac-utils): Basic functions to check for permissions setted in RBAC, both for server-side and client-side (through templating engines, like [Dust.js](https://github.com/linkedin/dustjs/))

## Requirements
* [mongoose](https://github.com/learnboost/mongoose/)

## Also works with these templating engines
* [Dust.js](https://github.com/linkedin/dustjs/)

## What is RBAC?
Role-based access control (RBAC) is a method of regulating access based on the roles of individual users within an enterprise/app. In this context, access is the ability of an individual user to perform a specific task, such as view, create, or modify information or get aditional tools in an application. Roles are defined according to job competency, authority, responsibility or any other established condition.

## Module description
simple-rbac gives you the base code to implement a Role-based access control using mongoose, allowing you to use it together with your own user's collection.

It's really simple to use and has tools to integrate it with a templating engine as Dust.js (more engines comming soon! :) ), in case you want to render your app based on the role-based access controll settings, and tools to make role-based decisions server-side.

# Installation

```
npm install simple-rbac --save
```

# Usage
## Initialization

You will need to initializate RBAC. There are a few options to do that. 

### 1) Initializate RBAC by default:

```js
var simpleRbac = require('simple-rbac').rbac;
var rbac = simpleRbac.init();

```

"By default" means that RBAC will add the 3 collections to save the information with default names and basic schemas for each of them:
- Permissions collection: 'rbac_permissions'
- Roles collection: 'rbac_roles'
- Users collection: 'rbac_users'


### 2) Initializate RBAC with your own collections

```js
var simpleRbac = require('simple-rbac').rbac;
var rbac = simpleRbac.init({
	permission: 'my_rbac_permissions_collection',
	role: 'my_rbac_roles_collection',
	user: 'my_rbac_users_collection'
});

```

### 3) Initializate RBAC extending the collections schemas

*Example 1:* customizing collection names and extending user's schema
```js
var simpleRbac = require('simple-rbac').rbac;
var rbac = simpleRbac.init({
	permission: 'my_rbac_permissions_collection',
	role: 'my_rbac_roles_collection',
	user: 'my_rbac_users_collection'
}, {
	extendSchemas: {
		user: {
			user_info: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'user_infos'
			}
		}
	}
});
```
*Example 2:* extending user's schema and permission's schema
```js
var simpleRbac = require('simple-rbac').rbac;
var rbac = simpleRbac.init(null, {
	extendSchemas: {
		user: {
			email: {
				type: String,
				required: true
			},
			phone: {
				type: Number,
				required: true
			}
		},
		permission: {
			dateAdded: {
				type: Date,
				default: Date.now
			}
		}
	}
});
```

# simple-rbac API
After initializating RBAC, we have methods to access the permissions, roles and users. 

## Permissions
### `rbac.Permissions.add(permission, callback);`
Tries to add a new permission to the database and then return it back.
If the permission exists, it just returns the existent one
* `@param	{object}	permission`: Data that defines the permission. permission.permission and permission.operation are required
* `@param	{Function}	callback`: Callback that returns an error or the permission object


### `rbac.Permissions.remove(parameters, callback);`
Tries to remove all the permissions with certain parameters.
Returns the status of the removal and the number of elements removed
* `@param {object}	parameters`:	Parameters to find the permissions to be removed. parameters.permission is required
* `@param	{Function}	callback`:	Callback that returns an error or the status of the removal and the number of elements removed


### `rbac.Permissions.get(parameters, callback, opts);`
Tries to get a permissions with certain parameters.
* `@param {object}   parameters`:	Parameters to find the permissions.
* `@param {Function} callback`:	Callback that returns an error or founded permission. Returns null if nothing was found.
* `@param {object} opts`: Aditional options
  * `{object}	opts.select`:	Allows to send an object with the field to be selected
  * `{boolean}	opts.lean`:	Makes the mongo query "lean" (mongoose)


### `rbac.Permissions.getAll(parameters, callback, opts);`
Tries to get all the permissions that match a filter.
* `@param {object}   filter`:	Filter to find the permissions.
* `@param {Function} callback`:	Callback that returns an error or founded permission. Returns null if nothing was found.
* `@param {object} opts`: Aditional options
  * `{object}	opts.select`:	Allows to send an object with the field to be selected
  * `{boolean}	opts.lean`:	Makes the mongo query "lean" (mongoose)

### Permission's methods
After you get a permission using the API (for example, when you do `rbac.Permission.add` or `rbac.Permission.get`), you get an object with the permission itself. 

This new object is a mongoose object, which means that you can operate with it using any mongoose method on it. 
Besides that, `simple-rbac` has a method to simplify your work. 

So, if you do this:

```js
rbac.Permission.get({
	permission: 'accountSettings',
    operation: 'read'
    }, function(err, permission) {
    	console.log(permission);
});
```

you get all the permission's information, and can use a permission's method:


### `permission.edit(newData, callback);`
Edits a permission properties
* `@param  {Object}   newData`: Object with the new properties for the permission
* `@param  {Function} callback`: Callback. Returns the callback of the mongoose's save() function


## Roles

### `rbac.Roles.add(role, callback);`
Tries to add a new role to the database and then return back that new role object.
If the role exists, it just returns the existent one
* `@param {object}   role`:	Data that defines the role. role.name is required
* `@param {Function} callback`:	Callback that returns an error or the role object

### `rbac.Roles.remove(roleName, callback);`
Tries to remove a role matching roleName parameter.
Returns the status of the removal and the number of elements removed
* `@param {object}	parameters`:	Name of the role to be deleted
* `@param {Function} callback`:	Callback that returns an error or the status of the removal and the number of elements removed

### `rbac.Roles.get(roleName, callback, opts);`
Tries to get a role with certain parameters.
* `@param {object}   parameters`:	Parameters to find the roles. parameters.permission is && parameters.operation are required
* `@param {Function} callback`:	Callback that returns an error or founded role. Returns null if nothing was found.
* `@param {object} opts`: Aditional options
  * `{object}	opts.select`:	Allows to send an object with the field to be selected
  * `{boolean}	opts.lean`:	Makes the mongo query "lean" (mongoose)


### `rbac.Roles.getAll(filter, callback, opts);`
Tries to get all the roles that match a filter
* `@param {object}   filter`:	Filter to find the roles
* `@param {Function} callback`:	Callback that returns an error or founded role
* `@param {object} opts`: Aditional options
  * `{object}	opts.select`:	Allows to send an object with the field to be selected
  * `{boolean}	opts.lean`:	Makes the mongo query "lean" (mongoose)

### Role's methods
After you get a role using the API (for example, when you do `rbac.Role.add` or `rbac.Role.get`), you get an object with the role itself. 

This new object is a mongoose object, which means that you can operate with it using any mongoose method on it. 
Besides that, `simple-rbac` has methods to simplify your work. 

So, if you do this:

```js
rbac.Role.get({
	name: 'manager'
    }, function(err, role) {
    	console.log(role);
});
```

you get all the role's information, and can use any role's method:

### `role.edit(newData, callback);`
Edits a role properties
* `@param  {Object}   newData`: Object with the new properties
* `@param  {Function} callback`: Callback. Returns the callback of the mongoose's save() function

### `role.addInheritedRoles(rolesArray, callback);`
Add all the roles listed in the rolesArray param
* `@param {Array}   rolesArray`: Array filled with role names
* `@param {Function} callback`: Callback. Returns the callback of the mongoose's save() function

### `role.removeInheritedRoles(rolesArray, callback);`
Removes all the inheritRoles listed in the permissionsArray param
* `@param  {Array}   rolesArray`: Array filled with roles names
* `@param  {Function} callback`: Callback. Returns the callback of the mongoose's save() function

### `role.addPermissions(permissionsArray, callback);`
Add all the permissions listed in the permissionsArray param
* `@param {Array}   permissionsArray`: Array filled with permissionsIds
* `@param {Function} callback`: Callback. Returns the callback of the mongoose's save() function

### `role.removePermissions(permissionsArray, callback);`
Removes all the permissions listed in the permissionsArray param
* `@param  {Array}   permissionsArray`: Array filled with permissionsIds
* `@param  {Function} callback`: Callback. Returns the callback of the mongoose's save() function

### `role.getPermissions(populate, callback);`
Returns all the permissions of a role
* `@param  {Boolean} populate`:	If true, populates the permission IDs with their full data
* `@param  {Function} callback`: Callback. Parameters: `callback(error, permissions);`


## Users

### `rbac.Users.add(user, callback);`
Tries to add a new user to the database and then return back that new user object.
If the user exists, it just returns the existent one and returns 'true' as third parameter of the callback

* `@param {object}   user`:	Data that defines the user. user.permission and permission.operation are required
* `@param {Function} callback`:   Callback that returns an error or the user


### `rbac.Users.remove(userName, callback);`
Tries to remove a user matching roleName parameter.
Returns the status of the removal and the number of elements removed
* `@param {string}   userName`:	Name of the user to be deleted
* `@param {Function} callback`:	Callback that returns an error or the status of the removal and the number of elements removed

### `rbac.Users.get(userName, callback, opts);`
Tries to get a user with it's username
* `@param {object}	userName`:	Username
* `@param {Function} callback`:	Callback that returns an error or founded user. Returns null if nothing was found.
* `@param {object} opts`: Aditional options
  * `{object}	opts.select`:	Allows to send an object with the field to be selected
  * `{boolean}	opts.lean`:	Makes the mongo query "lean" (mongoose)

### `rbac.Users.getAll(filter, callback, opts);`
Tries to get all the users that match a filter
* `@param {object}	filter`:	Filter
* `@param {Function} callback`:	Callback that returns an error or founded users
* `@param {object} opts`: Aditional options
  * `{object}	opts.select`:	Allows to send an object with the field to be selected
  * `{boolean}	opts.lean`:	Makes the mongo query "lean" (mongoose)

### `rbac.Users.getById(userId, callback, opts);`
Tries to get a user with it's ID
* `@param {string}   userId`:	Username
* `@param {Function} callback`:	Callback that returns an error or founded user. Returns null if nothing was found.
* `@param {object} opts`: Aditional options
  * `{object}	opts.select`:	Allows to send an object with the field to be selected
  * `{boolean}	opts.lean`:	Makes the mongo query "lean" (mongoose)
  * `{boolean}	opts.toObject`:	Before returning the user, it converts it to an object, merging the effectivePermissions and effectiveRoles in the user's permissions and roles parameters

### `rbac.Users.getFull(userName|userId, callback);`
Tries to get all the user data, using it's ID or it's userName. 
* `@param {object}	userName`:	Username
* `@param {Function} callback`:	Callback that returns an error or founded user. Returns null if nothing was found.

### User's methods
After you get a user using the API (for example, when you do `rbac.User.add` or `rbac.User.getById`), you get an object with the user itself. 

This new object is a mongoose object, which means that you can operate with it using any mongoose method on it. 
Besides that, `simple-rbac` has methods to simplify your work. 

So, if you do this:

```js
rbac.User.get({
	userName: 'bart.simpson'
    }, function(err, user) {
    	console.log(user);
});
```

you get all the user's information, and can use any user's method:


### `user.edit(newData, callback);`
Edits a user properties
* `@param  {Object}   newData`: Object with the new properties
* `@param  {Function} callback`: Callback. Returns the callback of the mongoose's save() function

### `user.addRoles(rolesArray, callback);`
Add all the roles listed in the rolesArray param
* `@param {Array} rolesArray`: Array filled with roleIds
* `@param {Function} callback`: Callback. Returns the callback of the mongoose's save() function

### `user.removeRoles(rolesArray, callback);`
Removes all the roles listed in the rolesArray param
* `@param  {Array} rolesArray`: Array filled with roleIds
* `@param  {Function} callback`: Callback. Returns the callback of the mongoose's save() function

### `user.getRoles(populate, callback);`
Returns all the user of a user
* `@param  {Boolean} 	populate`: If true, populates the role IDs with their full data
* `@param  {Function} 	callback`: Callback

### `user.getPermissions(populate, callback);`
Returns all the permissions of a user.
* `@param  {Boolean} 	populate`:	If true, populates the permission IDs with their full data
* `@param  {Function} 	callback`:	Callback


# Importing base data example
A nice thing about this module is that it allows you to import the RBAC structure from a JS Object, allowing you to easily set your basic structure to start using the module without a UI.

Doing this is really simple, you just need to prepare the bulk that you want to import, set the roles inheritance (if exists), and presto!

```js
'use strict';

/**
 * Dependencies
 */
var async = require('async');

/**
 * Init the rbac module
 */
var simpleRbac = require('simple-rbac').rbac;
var rbac = simpleRbac.init();

/**
 * Prepare the bulk to import the data
 */

var managerInheritedRoles = ['salesman'];
var adminInheritedRoles = ['manager'];

var bulks = {
	permission: [{
		permission: 'accountSettings',
		operation: 'read',
		displayName: 'See settings',
		description: 'Allows the user to see the settings'
	}, {
		permission: 'accountSettings',
		operation: 'update',
		displayName: 'Update settings',
		description: 'Allows the possibility to update the settings'
	}, {
		permission: 'user',
		operation: 'create',
		displayName: 'Create new user',
		description: 'Allows the possibility to create a new user'
	}, {
		permission: 'user',
		operation: 'read',
		displayName: 'See users',
		description: 'Allows the possibility to list all the users and see each user data'
	}, {
		permission: 'user',
		operation: 'update',
		displayName: 'Edit user',
		description: 'Allows the possibility to update a user\'s information'
	}, {
		permission: 'user',
		operation: 'delete',
		displayName: 'Delete user',
		description: 'Allows the possibility to remove a user'
	}],
	role: [
	{
		name: 'salesman',
		displayName: 'Salesman',
		permissions: ['accountSettings.read', 'accountSettings.update']
	}, {
		name: 'manager',
		displayName: 'Manager',
		inheritRoles: managerInheritedRoles,
		permissions: ['user.read']
	}, {
		name: 'admin',
		displayName: 'Admin',
		inheritRoles: adminInheritedRoles,
		permissions: ['user']
	}],
	user: [
	{
		userName: 'bart.simpson',
		roles: ['salesman']
	}, {
		userName: 'homer.simpson',
		roles: ['manager']
	}, {
		userName: 'max.powel',
		roles: ['admin']
	}]
};



console.log('Importing the new users structure...');
// Import all the data presented in the bulks obj
rbac.importData(bulks.permission, bulks.role, bulks.user, function(importErr, response) {
	if (importErr) {
		console.error(importErr);
	}

	// Add the inherited roles
	async.parallel([
		function(done) {
			rbac.Role.get('manager', function(err, role) {
				if (err) {
					console.error(err);
				} else {
					// Attach the inherited roles to the new created role 'manager'
					role.addInheritedRoles(managerInheritedRoles, done);
				}
			});
		},
		function(done) {
			rbac.Role.get('admin', function(err, role) {
				if (err) {
					console.error(err);
				} else {
					// Attach the inherited roles to the new created role 'admin'
					role.addInheritedRoles(adminInheritedRoles, done);
				}
			});
		}
	], function(addInheritRolesErr) {
		if (addInheritRolesErr) {
			console.error(addInheritRolesErr);
		} else {
			console.info('New users structure imported successfully!');
		}
	});
});
```

# TODO
 * Define the collection indexes automatically
 * Make something to graph automatically the user-roles-permissions assignments (Example: http://sigmajs.org/)
 * Change all the methods to work with names instead of ids in the parameters (add role, add permissions, etc)
 * Make permissions and roles inheritance recursive (it only works 1 level deep now)
 * Avoid population of the main object (user/role) when using method getRoles or getPermissions
