'use strict';
/**
 * Global modules
 */
var winston = require('winston');

module.exports = function(dust) {

	dust.helpers.can = function(chunk, context, bodies, params) {
		var body = bodies.block;

		var user = params.user;
		var permission = dust.helpers.tap(params.permission, chunk, context);
		var operation = dust.helpers.tap(params.operation, chunk, context);

		if (!user) {
			winston.info('[HLPR:dust._userCan] Parameter "user" is required');
			return chunk;
		}

		if (!user.utils || !user.utils.can) {
			winston.info('[HLPR:dust._userCan] The user does not have the required method "can"');
			return chunk;
		}

		if (!permission) {
			winston.info('[HLPR:dust._userCan] Parameter "permission" is required');
			return chunk;
		}

		if (!operation) {
			winston.info('[HLPR:dust._userCan] Parameter "operation" is required');
			return chunk;
		}
		if (user.utils.can(operation, permission)) {
			if (body) {
				return chunk.render(body, context);
			} else {
				winston.info('[HLPR:dust._userCan] Missing body block in the "can" helper ');
				return chunk;
			}
		} else if (bodies.else) {
			return chunk.render(bodies.else, context);
		}

		return chunk;

	};

};
