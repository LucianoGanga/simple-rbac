# simple-rbac
Simple RBAC (Role-based access control) for mongoose apps

## Requirements
* [mongoose](https://github.com/learnboost/mongoose/)

## Also works with
* [Dust.js](https://github.com/linkedin/dustjs/)

## What is RBAC?
Role-based access control (RBAC) is a method of regulating access based on the roles of individual users within an enterprise/app. In this context, access is the ability of an individual user to perform a specific task, such as view, create, or modify information or get aditional tools in an application. Roles are defined according to job competency, authority, responsibility or any other established condition.

## Module description
simple-rbac gives you the base code to implement a RBAC with mongoose, allowing you to use it together with your own user's collection.

It's really simple to use and has tools to integrate it with a templating engine as Dust.js (more engines comming soon! :) ), in case you want to render your app based on the role-based access controll settings, and tools to make role-based decisions server-side.

## Installation

```
npm install simple-rbac --save
```

## Usage
# Initialization

You will need to initializate RBAC. There are a few options to do that. 

1) Initializate RBAC by default:

```
var simpleRbac = require('simple-rbac').rbac;
var rbac = rbac.init();

```

By default means that RBAC will add the 3 collections to save the information with default names and basic schemas for each of them:
- Permissions collection: 'rbac_permissions'
- Roles collection: 'rbac_roles'
- Users collection: 'rbac_users'


2) Initializate RBAC with your own collections

```
var simpleRbac = require('simple-rbac').rbac;
var rbac = rbac.init({
	permission: 'my_rbac_permissions_collection',
	role: 'my_rbac_roles_collection',
	user: 'my_rbac_users_collection'
});

```

3) Initializate RBAC extending the collections schemas

Example 1: customizing collection names and extending user's schema
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
Example 2: extending user's schema and permission's schema
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
