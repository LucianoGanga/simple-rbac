# simple-rbac Introduction
Simple RBAC (Role-based access control) for mongoose apps

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

```
var simpleRbac = require('simple-rbac').rbac;
var rbac = simpleRbac.init();

```

"By default" means that RBAC will add the 3 collections to save the information with default names and basic schemas for each of them:
- Permissions collection: 'rbac_permissions'
- Roles collection: 'rbac_roles'
- Users collection: 'rbac_users'


### 2) Initializate RBAC with your own collections

```
var simpleRbac = require('simple-rbac').rbac;
var rbac = simpleRbac.init({
	permission: 'my_rbac_permissions_collection',
	role: 'my_rbac_roles_collection',
	user: 'my_rbac_users_collection'
});

```

### 3) Initializate RBAC extending the collections schemas

*Example 1:* customizing collection names and extending user's schema
```
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
```
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
## Importing base data
A nice thing about this module is that it allows you to import the RBAC structure from a JS Object, allowing you to easily set your basic structure to start using the module without a UI.

Doing this is really simple, you just need to prepare the bulk that you want to import, set the roles inheritance (if exists), and presto!

```
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

