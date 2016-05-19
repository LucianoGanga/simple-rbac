/* eslint new-cap: 0 */
'use strict';

/**
 * Global modules
 */
var _ = require('lodash');
var winston = require('winston');
var mongoose = require('mongoose');
var findOneOrCreate = require('mongoose-find-one-or-create');
var async = require('async');
var Promise = require('bluebird');

/**
 * Initializes the RBAC module, by receiving the name of the 3 main collections to work with them.
 * This is made like this to allow multiple apps make use of RBAC, using their own collections
 * @param  {object} collections 	An object with the 3 main collections: permission, role and user
 * @param  {object} options 		Adicional options that allow, for example, extending schemas
 * @return {object}        			Object with the methods to work with the rbac instance
 */
function init(collections, options) {
	options = options || {};
	/**
	 * Reference names of the collections and models
	 */

	var collectionNames = {
		permission: 'rbac_permissions',
		role: 'rbac_roles',
		user: 'rbac_users'
	};

	if (collections && typeof collections === 'object') {
		_.assign(collectionNames, {
			permission: collections.permission || collectionNames.permission,
			role: collections.role || collectionNames.role,
			user: collections.user || collectionNames.user
		});
	}

	/**
	 * Define the schemas structure
	 * @type {Object}
	 */
	var schemas = {
		permission: {
			permission: {
				type: String,
				required: true
			},
			operation: {
				type: String,
				required: true,
				enum: ['create', 'read', 'update', 'delete', 'scan', '']
			},
			displayName: {
				type: String,
				required: true
			},
			description: {
				type: String
			},
			createdAt: {
				type: Date
			},
			updatedAt: {
				type: Date
			}
		},
		role: {
			name: {
				type: String,
				required: true
			},
			displayName: {
				type: String
			},
			description: {
				type: String
			},
			inheritRoles: [{
				type: mongoose.Schema.Types.ObjectId,
				ref: _makeModelName(collectionNames.role)
			}],
			permissions: [{
				type: mongoose.Schema.Types.ObjectId,
				ref: _makeModelName(collectionNames.permission)
			}],
			createdAt: {
				type: Date
			},
			updatedAt: {
				type: Date
			}
		},
		user: {
			userName: {
				type: String,
				required: true
			},
			roles: [{
				type: mongoose.Schema.Types.ObjectId,
				ref: _makeModelName(collectionNames.role)
			}],
			createdAt: {
				type: Date
			},
			updatedAt: {
				type: Date
			}
		}
	};

	/**
	 * Extend schemas with optional additional parameters
	 */
	if (options.extendSchemas && typeof options.extendSchemas.permission === 'object') {
		schemas.permission = _.assign(schemas.permission, options.extendSchemas.permission);
	}
	if (options.extendSchemas && typeof options.extendSchemas.role === 'object') {
		schemas.role = _.assign(schemas.role, options.extendSchemas.role);
	}
	if (options.extendSchemas && typeof options.extendSchemas.user === 'object') {
		schemas.user = _.assign(schemas.user, options.extendSchemas.user);
	}

	/**
	 * Permission Schema instance
	 */
	var PermissionSchema = new mongoose.Schema(schemas.permission, {
		collection: collectionNames.permission,
		timestamps: true
	});

	/**
	 * Edits a permission properties
	 * @param  {Object}   newData Object with the new properties
	 * @param  {Function} done    Callback
	 */
	PermissionSchema.methods.edit = function(newData, done) {
		this.set(newData);
		return this.save(done);
	};

	/**
	 * Adds a virtual field called namespace, that is the union of the permission + the operation
	 */
	PermissionSchema.virtual('namespace').get(function() {
		return this.permission + ':' + this.operation;
	});

	/**
	 * Add the findOneOrCreate plugin
	 */
	PermissionSchema.plugin(findOneOrCreate);

	/**
	 * Permission Model definition
	 */
	var PermissionModel = mongoose.model(_makeModelName(collectionNames.permission), PermissionSchema);

	/**
	 * Role Schema Instance
	 */
	var RoleSchema = new mongoose.Schema(schemas.role, {
		collection: collectionNames.role,
		timestamps: true
	});

	/**
	 * Edits a role properties
	 * @param  {Object}   newData Object with the new properties
	 * @param  {Function} done    Callback
	 */
	RoleSchema.methods.edit = function(newData, done) {
		this.set(newData);
		return this.save(done);
	};

	/**
	 * Add all the roles listed in the rolesArray param
	 * @param {Array}   rolesArray 	Array filled with role names
	 * @param {Function} done       Callback
	 */
	RoleSchema.methods.addInheritedRoles = function(rolesArray, done) {
		var role = this;
		_getRolesIds(rolesArray, function(err, roleIds) {
			if (err) {
				done(err);
			} else {
				for (var i = 0; i < roleIds.length; i++) {
					var roleId = roleIds[i];
					if (_.findIndex(role.inheritRoles, roleId) === -1) {
						role.inheritRoles.push(roleId);
					}
				}
				role.save(done);
			}
		});
	};

	/**
	 * Removes all the inheritRoles listed in the permissionsArray param
	 * @param  {Array}   rolesArray 	Array filled with roles names
	 * @param  {Function} done          Callback
	 */
	RoleSchema.methods.removeInheritedRoles = function(rolesArray, done) {
		var role = this;
		_getRolesIds(rolesArray, function(err, roleIds) {
			if (err) {
				done(err);
			} else {
				for (var i = 0; i < roleIds.length; i++) {
					var roleId = roleIds[i];
					var roleIdIndex = role.inheritRoles.indexOf(roleId);
					// If the role exists, delete it
					if (roleIdIndex > -1) {
						role.inheritRoles.splice(roleIdIndex, 1);
					}
				}
				role.save(done);
			}
		});
	};

	/**
	 * Add all the permissions listed in the permissionsArray param
	 * @param {Array}   permissionsArray Array filled with permissionsIds
	 * @param {Function} done             Callback
	 */
	RoleSchema.methods.addPermissions = function(permissionsArray, done) {
		for (var p = 0; p < permissionsArray.length; p++) {
			var permission = permissionsArray[p];
			if (_.findIndex(this.permissions, mongoose.Types.ObjectId(permission)) === -1) {
				this.permissions.push(permission);
			}
		}
		return this.save(done);
	};

	/**
	 * Removes all the permissions listed in the permissionsArray param
	 * @param  {Array}   permissionsArray Array filled with permissionsIds
	 * @param  {Function} done             Callback
	 */
	RoleSchema.methods.removePermissions = function(permissionsArray, done) {
		for (var p = 0; p < permissionsArray.length; p++) {
			var permission = permissionsArray[p];
			var permissionIndex = this.permissions.indexOf(permission);
			// If the permission exists, delete it
			if (permissionIndex > -1) {
				this.permissions.splice(permissionIndex, 1);
			}
		}
		return this.save(done);
	};

	/**
	 * Returns all the permissions of a role
	 * @param  {Boolean} 	populate 	If true, populates the permission IDs with their full data
	 * @param  {Function} 	done 		Callback
	 */
	RoleSchema.methods.getPermissions = function(populate, done) {
		var role = this;

		async.auto({
				populatedRole: function(asyncDone) {
					role.populate('inheritRoles permissions', asyncDone);
				},
				inheritedPermissions: ['populatedRole', function(asyncDone, results) {
					RoleModel.populate(results.populatedRole.inheritRoles, {
						path: 'permissions'
					}, function(err, response) {
						if (err) {
							asyncDone(err);
						} else {
							asyncDone(null, _extractPermissionsFromRoles(response));
						}
					});
				}]
			},
			function(err, results) {
				if (err) {
					done(err);
				} else {
					// Index by _id the permissions and the inherated permissions
					var permissions = _.indexBy(results.populatedRole.permissions, '_id');
					var inheritedPermissions = _.indexBy(results.inheritedPermissions, '_id');

					// Get the union of both to eliminate repetitions
					var resultingPermissions = _
						.union(_.keys(permissions), _.keys(inheritedPermissions))
						.map(function(key) {
							return permissions[key] || inheritedPermissions[key];
						});

					// If populate parameter is false, get only the permissions IDs
					if (!populate) {
						resultingPermissions = _.keys(_.indexBy(resultingPermissions, '_id'));
					}

					done(null, resultingPermissions);
				}
			});
	};

	/**
	 * Add the findOneOrCreate plugin to Role Schema
	 */
	RoleSchema.plugin(findOneOrCreate);

	/**
	 * Role Model definition
	 */
	var RoleModel = mongoose.model(_makeModelName(collectionNames.role), RoleSchema);

	/**
	 * User Schema instance
	 */
	var UserSchema = new mongoose.Schema(schemas.user, {
		collection: collectionNames.user,
		timestamps: true
	});

	/**
	 * Edits a user properties
	 * @param  {Object}   newData Object with the new properties
	 * @param  {Function} done    Callback
	 */
	UserSchema.methods.edit = function(newData, done) {
		this.set(newData);
		return this.save(done);
	};

	/**
	 * Add all the roles listed in the rolesArray param
	 * @param {Array}   rolesArray Array filled with roleIds
	 * @param {Function} done             Callback
	 */
	UserSchema.methods.addRoles = function(rolesArray, done) {
		for (var p = 0; p < rolesArray.length; p++) {
			var role = rolesArray[p];
			if (_.findIndex(this.roles, mongoose.Types.ObjectId(role)) === -1) {
				this.roles.push(role);
			}
		}
		return this.save(done);
	};

	/**
	 * Removes all the roles listed in the rolesArray param
	 * @param  {Array}   rolesArray Array filled with roleIds
	 * @param  {Function} done             Callback
	 */
	UserSchema.methods.removeRoles = function(rolesArray, done) {
		for (var p = 0; p < rolesArray.length; p++) {
			var role = rolesArray[p];
			var roleIndex = this.roles.indexOf(role);
			// If the role exists, delete it
			if (roleIndex > -1) {
				this.roles.splice(roleIndex, 1);
			}
		}
		return this.save(done);
	};

	/**
	 * Returns all the user of a user
	 * @param  {Boolean} 	populate 	If true, populates the role IDs with their full data
	 * @param  {Function} 	done 		Callback
	 */
	UserSchema.methods.getRoles = function(populate, done) {
		var user = this;
		async.auto({
				populatedUser: function(asyncDone) {
					user.populate('roles', asyncDone);
				},
				inheritedRoles: ['populatedUser', function(asyncDone, results) {
					RoleModel.populate(results.populatedUser.roles, {
						path: 'inheritRoles'
					}, function(err, response) {
						if (err) {
							asyncDone(err);
						} else {
							asyncDone(null, _extractRolesFromInheritRoles(response));
						}
					});
				}]
			},
			function(err, results) {
				if (err) {
					done(err);
				} else {
					// Index by _id the roles and the inherated roles
					var roles = _.indexBy(results.populatedUser.roles, '_id');
					var inheritedRoles = _.indexBy(results.inheritedRoles, '_id');

					// Get the union of both to eliminate repetitions
					var resultingRoles = _
						.union(_.keys(roles), _.keys(inheritedRoles))
						.map(function(key) {
							return roles[key] || inheritedRoles[key];
						});

					// If populate parameter is false, get only the permissions IDs
					if (!populate) {
						resultingRoles = _.keys(_.indexBy(resultingRoles, '_id'));
					}

					done(null, resultingRoles);
				}
			});
	};

	/**
	 * Returns all the permissions of a user.
	 * @param  {Boolean} 	populate 	If true, populates the permission IDs with their full data
	 * @param  {Function} 	done 		Callback
	 */
	UserSchema.methods.getPermissions = function(populate, done) {
		this.getRoles(true, function(rolesErr, roles) {
			if (rolesErr) {
				done(rolesErr);
			} else {
				if (populate) {
					RoleModel.populate(roles, {
						path: 'permissions'
					}, function(err, response) {
						if (err) {
							done(err);
						} else {
							done(null, _extractPermissionsFromRoles(response));
						}
					});
				} else {
					done(null, _extractPermissionsFromRoles(roles));
				}
			}
		});
	};

	/**
	 * Model definition
	 */
	var UserModel = mongoose.model(_makeModelName(collectionNames.user), UserSchema);

	/**
	 * Permission methods
	 */
	var Permissions = {
		/**
		 * Permission.add() method tries to add a new permission to the database and then return it back.
		 * If the permission exists, it just returns the existent one
		 * @param {object}   permission 	Data that defines the permission. permission.permission and permission.operation are required
		 * @param {Function} done       	Callback that returns an error or the permission object
		 */
		add: function(permission, done) {
			if (permission.permission && permission.operation) {
				permission = _.assign({
					displayName: permission.permission + ':' + permission.operation,
					description: null
				}, permission);

				PermissionModel.findOneOrCreate(permission, permission, done);
			} else {
				done(new Error('Error when using "add" method in "Permission" object: permission.permission and permission.operation are required.'));
			}
		},

		/**
		 * Permission.remove() method tries to remove all the permissions with certain parameters.
		 * Returns the status of the removal and the number of elements removed
		 * @param {object}   parameters 	Parameters to find the permissions to be removed. parameters.permission is required
		 * @param {Function} done       	Callback that returns an error or the status of the removal and the number of elements removed
		 */
		remove: function(parameters, done) {
			if (parameters.permission) {
				PermissionModel.remove(parameters, done);
			} else {
				done(new Error('Error when using "remove" method in "Permission" object: a permission.permission is required.'));
			}
		},

		/**
		 * Permission.get() method tries to get a permissions with certain parameters.
		 * @param {object}   parameters 	Parameters to find the permissions.
		 * @param {Function} done       	Callback that returns an error or founded permission. Returns null if nothing was found.
		 * @param {object} opts 		Aditional options
		 *                        			{object}	opts.select		Allows to send an object with the field to be selected
		 *                        			{boolean}	opts.lean		Makes the mongo query "lean" (mongoose)
		 */
		get: function(parameters, done, opts) {
			opts = opts || {};
			parameters = parameters || {};
			var query = PermissionModel.findOne(parameters);
			if (opts.select) {
				query.select(opts.select);
			}
			if (opts.lean) {
				query.lean();
			}
			query.exec(done);
		},

		/**
		 * Permission.getAll() method tries to get all the permissions that match a filter.
		 * @param {object}   filter 	Filter to find the permissions.
		 * @param {Function} done       Callback that returns an error or founded permissions.
		 * @param {object} opts 		Aditional options
		 *                        			{object}	opts.select		Allows to send an object with the field to be selected
		 *                        			{boolean}	opts.lean		Makes the mongo query "lean" (mongoose)
		 */
		getAll: function(filter, done, opts) {
			opts = opts || {};
			filter = filter || {};
			var query = PermissionModel.find(filter);
			if (opts.select) {
				query.select(opts.select);
			}
			if (opts.lean) {
				query.lean();
			}
			query.exec(done);
		}
	};

	/**
	 * Role methods
	 */
	var Roles = {
		/**
		 * Role.add() method tries to add a new role to the database and then return back that new role object.
		 * If the role exists, it just returns the existent one
		 * @param {object}   role	Data that defines the role. role.name is required
		 * @param {Function} done	Callback that returns an error or the role object
		 */
		add: function(role, done) {
			if (role.name) {
				role = _.assign({
					displayName: role.name,
					description: null,
					permissions: [],
					inheritRoles: []
				}, role);

				async.auto({
					permissionIds: async.apply(_getPermissionIds, role.permissions),
					inheritRolesIds: async.apply(_getRolesIds, role.inheritRoles)
				}, function(err, results) {
					if (err) {
						done(err);
					} else {
						role.permissions = results.permissionIds;
						role.inheritRoles = results.inheritRolesIds;
						RoleModel.findOneOrCreate({
							name: role.name
						}, role, done);

					}
				});

			} else {
				done(new Error('Error when using "add" method in "Role" object: a role name is required.'));
			}
		},

		/**
		 * Role.remove() method tries to remove a role matching roleName parameter.
		 * Returns the status of the removal and the number of elements removed
		 * @param {object}   parameters 	Name of the role to be deleted
		 * @param {Function} done       	Callback that returns an error or the status of the removal and the number of elements removed
		 */
		remove: function(roleName, done) {
			if (roleName) {
				RoleModel.remove({
					name: roleName
				}, done);
			} else {
				done(new Error('Error when using "remove" method in "Role" object: a role name is required.'));
			}
		},

		/**
		 * Role.get() method tries to get a role by role name
		 * @param {string}   roleName 	Role name
		 * @param {Function} done       	Callback that returns an error or founded role. Returns null if nothing was found.
		 * @param {object} opts 		Aditional options
		 *                        			{object}	opts.select		Allows to send an object with the field to be selected
		 *                        			{boolean}	opts.lean		Makes the mongo query "lean" (mongoose)
		 */
		get: function(roleName, done, opts) {
			opts = opts || {};
			if (roleName) {
				var query = RoleModel.findOne({
					name: roleName
				});
				if (opts.select) {
					query.select(opts.select);
				}
				if (opts.lean) {
					query.lean();
				}
				query.exec(done);
			} else {
				done(new Error('Error when using "get" method in "Role" object: a role name is required.'));
			}
		},

		/**
		 * Role.getById() method tries to get a role by id
		 * @param {string}   roleId 	Role name. parameters.permission is && parameters.operation are required
		 * @param {Function} done       	Callback that returns an error or founded role. Returns null if nothing was found.
		 * @param {object} opts 		Aditional options
		 *                        			{object}	opts.select		Allows to send an object with the field to be selected
		 *                        			{boolean}	opts.lean		Makes the mongo query "lean" (mongoose)
		 */
		getById: function(roleId, done, opts) {
			opts = opts || {};
			if (roleId) {
				var query = RoleModel.findOne({
					_id: roleId
				});
				if (opts.select) {
					query.select(opts.select);
				}
				if (opts.lean) {
					query.lean();
				}
				query.exec(done);
			} else {
				done(new Error('Error when using "getById" method in "Role" object: a role id is required.'));
			}
		},

		/**
		 * Role.getAll() method tries to get all the roles that match a filter.
		 * Returns the found roles,
		 * @param {object}   filter 	Filter to find the roles.
		 * @param {Function} done       	Callback that returns an error or founded roles.
		 * @param {object} opts 		Aditional options
		 *                        			{object}	opts.select		Allows to send an object with the field to be selected
		 *                        			{boolean}	opts.lean		Makes the mongo query "lean" (mongoose)
		 */
		getAll: function(filter, done, opts) {
			opts = opts || {};
			filter = filter || {};
			var query = RoleModel.find(filter);
			if (opts.select) {
				query.select(opts.select);
			}
			if (opts.lean) {
				query.lean();
			}
			query.exec(done);
		}
	};

	/**
	 * User methods
	 */
	var Users = {
		/**
		 * User.add() method tries to add a new user to the database and then return back that new user object.
		 * If the user exists, it just returns the existent one and returns 'true' as third parameter of the callback
		 * @param {object}   user 	Data that defines the user. user.permission and permission.operation are required
		 * @param {Function} done   Callback that returns an error or the user
		 */
		add: function(user, done) {
			if (user.userName) {
				user = _.assign({
					userName: user.userName,
					roles: []
				}, user);

				UserModel.findOne({
					userName: user.userName
				}, function(err, result) {
					if (err) {
						done(err);
					} else if (result) {
						done(null, result, true);
					} else {
						// Replace the roles names for their corresponding ids
						_getRolesIds(user.roles, function(rolesIdsErr, rolesIds) {
							if (rolesIdsErr) {
								done(rolesIdsErr);
							} else {
								user.roles = rolesIds;
								UserModel.create(user, function(createErr, createResult) {
									done(createErr, createResult);
								});
							}
						});
					}
				});

			} else {
				done(new Error('Error when using "add" method in "User" object: a user name is required.'));
			}
		},

		/**
		 * User.remove() method tries to remove a user matching roleName parameter.
		 * Returns the status of the removal and the number of elements removed
		 * @param {string}   userName 	Name of the user to be deleted
		 * @param {Function} done       	Callback that returns an error or the status of the removal and the number of elements removed
		 */
		remove: function(userName, done) {
			if (userName) {
				UserModel.remove({
					userName: userName
				}, done);
			} else {
				done(new Error('Error when using "remove" method in "User" object: a user name is required.'));
			}
		},

		/**
		 * User.get() method tries to get a user with it's username
		 * @param {object}   userName 	Username
		 * @param {Function} done       Callback that returns an error or founded user. Returns null if nothing was found.
		 * @param {object} opts 		Aditional options
		 *                        			{object}	opts.select		Allows to send an object with the field to be selected
		 *                        			{boolean}	opts.lean		Makes the mongo query "lean" (mongoose)
		 */
		get: function(userName, done, opts) {
			opts = opts || {};
			if (userName) {
				var query = UserModel.findOne({
					userName: userName
				});

				if (opts.select) {
					query.select(opts.select);
				}
				if (opts.lean) {
					query.lean();
				}

				async.auto({
						user: function(next) {
							query.exec(next);
						},
						permissions: ['user', _getUserPermissions],
						roles: ['user', _getUserRoles]
					},
					function(userDataErr, results) {
						if (userDataErr) {
							done(userDataErr);
						} else if (!results.user) {
							done(new Error('User ' + userName + ' could not be found.'));
						} else {
							// Add the effective permissions and roles for this user
							results.user.effectivePermissions = results.permissions;
							results.user.effectiveRoles = results.roles;

							done(null, results.user);
						}
					});
			} else {
				done(new Error('Error when using "get" method in "User" object: a user name is required.'));
			}
		},

		/**
		 * User.getAll() method tries to get all the users that match a filter
		 * @param {object}   filter 	Filter
		 * @param {Function} done       Callback that returns an error or founded users
		 * @param {object} opts 		Aditional options
		 *                        			{object}	opts.select		Allows to send an object with the field to be selected
		 *                        			{boolean}	opts.lean		Makes the mongo query "lean" (mongoose)
		 */
		getAll: function(filter, done, opts) {
			opts = opts || {};
			filter = filter || {};
			var query = UserModel.find(filter);
			if (opts.select) {
				query.select(opts.select);
			}
			if (opts.lean) {
				query.lean();
			}
			query.exec(done);
		},

		/**
		 * User.getById() method tries to get a user with it's ID
		 * @param {String}   userId 	Username
		 * @param {Function} done       Callback that returns an error or founded user. Returns null if nothing was found.
		 * @param {object} opts 		Aditional options
		 *                        			{object}	opts.select		Allows to send an object with the field to be selected
		 *                        			{boolean}	opts.lean		Makes the mongo query "lean" (mongoose)
		 *                        			{boolean}	opts.toObject	Before returning the user, it converts it to an object, merging the effectivePermissions and effectiveRoles in the user's permissions and roles parameters
		 */
		getById: function(userId, done, opts) {
			opts = opts || {};
			if (userId) {
				var query = UserModel.findOne({
					_id: userId
				});
				if (opts.select) {
					query.select(opts.select);
				}
				if (opts.lean) {
					query.lean();
				}

				async.auto({
						user: function(next) {
							query.exec(next);
						},
						permissions: ['user', _getUserPermissions],
						roles: ['user', _getUserRoles]
					},
					function(userDataErr, results) {
						if (userDataErr) {
							done(userDataErr);
						} else if (!results.user) {
							done(new Error('User ' + userId + ' could not be found.'));
						} else {
							var userData = results.user;
							// Save the efective permissions and roles in a variable
							var effectivePermissions = results.permissions;
							var effectiveRoles = results.roles;

							if (opts.toObject) {
								// Remove all the mongoose functions, and get only the user data
								userData = userData.toObject({
									virtuals: true
								});

								// Apply the effective permissions and roles to the userData object
								userData.permissions = effectivePermissions;
								userData.roles = effectiveRoles;
							} else {
								// Add the effective permissions and roles for this user
								userData.effectivePermissions = effectivePermissions;
								userData.effectiveRoles = effectiveRoles;
							}
							done(null, userData);
						}
					});
			} else {
				done(new Error('Error when using "getById" method in "User" object: a user id is required.'));
			}
		},

		/**
		 * User.getFull() method tries to get all the user data, using it's ID or it's userName. 
		 * Also, removes all the mongoose methods. It just returns an object with all the user data + roles + permissions
		 * @param {string}   id 	Username or ID
		 * @param {Function} done   Callback that returns an error or founded user. Returns null if nothing was found.
		 */
		getFull: function(id, done) {
			// Regex to validate objectId
			var checkForHexRegExp = new RegExp('^[0-9a-fA-F]{24}$');
			var filter = {};

			// If is an objectId
			if (checkForHexRegExp.test(id)) {
				filter._id = id;
			} else {
				filter.userName = id;
			}

			if (id) {
				var query = UserModel.findOne(filter);

				var sequence = {
					user: function(next) {
						query.exec(next);
					},
					permissions: ['user', _getUserPermissions],
					roles: ['user', _getUserRoles]
				};

				async.auto(sequence,
					function(userDataErr, results) {
						if (userDataErr) {
							done(userDataErr);
						} else if (!results.user) {
							done(null, null);
						} else {

							// Save the efective permissions and roles in a variable
							var effectivePermissions = results.permissions;
							var effectiveRoles = results.roles;

							// Remove all the mongoose functions, and get only the user data
							var user = results.user.toObject({
								virtuals: true
							});

							// Apply the effective permissions and roles to the userData object
							user.permissions = effectivePermissions;
							user.roles = effectiveRoles;

							done(null, user);
						}
					});
			} else {
				done(new Error('Error when using "getFull" method in "User" object: a userName or userId is required.'));
			}
		}
	};

	var importData = function(permissionsBulk, rolesBulk, usersBulk, callback) {
		// Import permissions
		async.auto({
			permissions: async.apply(async.map, permissionsBulk, Permissions.add),
			roles: ['permissions', async.apply(async.map, rolesBulk, Roles.add)],
			users: ['roles', async.apply(async.map, usersBulk, Users.add)]
		}, callback);

	};

	// Get all the permissions of a user
	function _getUserPermissions(done, results) {
		var user = results.user;
		if (user) {
			user.getPermissions(true, done);
		} else {
			done(null, null);
		}
	}

	// Get all the roles of a user
	function _getUserRoles(done, results) {
		var user = results.user;
		if (user) {
			user.getRoles(true, done);
		} else {
			done(null, null);
		}
	}

	/**
	 * Given an array of role names, returns an array of their IDs
	 * @param  {Array}   roleNames 	Array with the role names
	 * @param  {Function} callback      Callback
	 */
	function _getRolesIds(roleNames, callback) {
		if (roleNames.length === 0) {
			return callback(null, []);
		}
		var aggregate = [{
			'$match': {
				name: {
					$in: roleNames
				}
			}
		}, {
			'$project': {
				name: 1
			}
		}];
		RoleModel.aggregate(aggregate).exec(function(err, queryResult) {
			if (err) {
				callback(err);
			} else {
				var roleIds = _.map(queryResult, function(roleData) {
					return roleData._id;
				});
				callback(null, roleIds);
			}
		});
	}

	/**
	 * Given an array of permission names or permission names + operation, returns an array of their IDs
	 * @param  {Array}   permissionNames 	Array with the permission names or permission names + operation
	 * @param  {Function} callback        	Callback
	 */
	function _getPermissionIds(permissionNames, callback) {
		if (permissionNames.length === 0) {
			return callback(null, []);
		}
		// Get all the combinations of permission-operation for the permissions passed for this role
		var aggregate = [{
			'$match': {
				permission: {
					$in: _.map(permissionNames, function(permission) {
						return permission.split('.')[0];
					})
				}
			}
		}, {
			'$group': {
				_id: {
					'$concat': ['$permission', '.', '$operation']
				},
				permissionId: {
					'$first': '$_id'
				},
				permissionName: {
					'$first': '$permission'
				}
			}
		}, {
			'$project': {
				_id: '$permissionId',
				namespace: '$_id',
				name: '$permissionName'
			}
		}];

		PermissionModel.aggregate(aggregate).exec(function(err, queryResult) {
			if (err) {
				callback(err);
			} else {
				var permissionIds = [];
				// Loop over the results to get the ids of the permissions
				for (var i = 0; i < queryResult.length; i++) {
					var permission = queryResult[i];
					// If it's one of the permissions-operations that needs to be included, add it's id to an array
					if (_.indexOf(permissionNames, permission.namespace) > -1 || _.indexOf(permissionNames, permission.name) > -1) {
						permissionIds.push(permission._id);
					}
				}

				callback(null, permissionIds);
			}
		});
	}

	/**
	 * Returns an array of the permissions found in the array of roles passed as parameter.
	 * If the roles are populated, it returns the full permission data. If not, it only returns
	 * the permissions ids
	 * @param  {Array} roles Array with roles
	 * @return {Array}       Array with the permissions from the roles
	 */
	function _extractPermissionsFromRoles(roles) {
		var permissions = [];
		_.map(roles, function(rol) {
			_.each(rol.permissions, function(permission) {
				permissions.push(permission);
			});
		});
		return permissions;
	}

	/**
	 * Returns an array of the roles found in the array of inheritRoles passed as parameter.
	 * If the inheritRoles are populated, it returns the full role data. If not, it only returns
	 * the roles ids
	 * @param  {Array} inheritRoles Array with inheritRoles
	 * @return {Array}       		Array with the roles from the inheritRoles array
	 */
	function _extractRolesFromInheritRoles(inheritRoles) {
		var roles = [];
		_.map(inheritRoles, function(rol) {
			_.each(rol.inheritRoles, function(role) {
				if (role.inheritRoles.length > 0) {
					winston.warn('WARNING: This module does not support multilevel roles inheritance yet. Only one level is allowed, so others levels won\'t be returned');
				}
				roles.push(role);
			});
		});
		return roles;
	}

	/** Returns a name to handle the models, adding a suffix to the collection name passes as a parameter */
	function _makeModelName(collectionName) {
		return collectionName + '_model';
	}

	var rbacMethods = {
		Permission: Permissions,
		Role: Roles,
		User: Users,
		importData: importData,
		models: {
			permission: PermissionModel,
			role: RoleModel,
			user: UserModel
		},
		schemas: schemas
	};

	// Promisify all the public functions of the module
	Promise.promisifyAll(rbacMethods);
	Promise.promisifyAll(Permissions);
	Promise.promisifyAll(Roles);
	Promise.promisifyAll(Users);

	return rbacMethods;
}

/**
 * Public methods exported
 */
module.exports = {
	init: init
};
