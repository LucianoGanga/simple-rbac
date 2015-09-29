'use strict';

/**
 * Global modules
 */
var _ = require('lodash');

var User = function(user) {
	return {
		/**
		 * Check if a user an make certain operation over a permission.
		 * @param  {String|Array} operationName  Name of the operation.
		 * @param  {String} permissionName Name of the permission to evaluate
		 * @return {Boolean}                Tells if the user can or can't make certain operation over a permission
		 */
		can: function(operationName, permissionName) {
				var can = false;
				var userPermissions = _.groupBy(user.permissions, 'permission');
				// Check if user has the permission
				if (userPermissions[permissionName]) {
					// Then, check if the user can do that operation on the permission
					var permission = userPermissions[permissionName];
					var hasOperation = _.some(permission, function(permissionElement) {
						return permissionElement.operation === operationName;
					});
					if (hasOperation) {
						can = true;
					}
				}
				return can;
			}
			// ,
			// hasRole: function(roleName) {
			// 	var userRoles = _.groupBy(user.roles, 'name');
			// 	//if (userRoles.)
			// }
	};
};

/**
 * Public methods exported
 */
module.exports = {
	User: User
};
