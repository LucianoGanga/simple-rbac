'use strict';
/**
 * Export src/simple-rbac.js
 *
 */

exports = module.exports = {
	init: require('./src/simple-rbac.js'),
	utils: require('./src/simple-rbac-utils.js'),
	dustHelper: require('./src/dust/user-can.js')
};

/*
  Export the version
*/

exports.version = require('./package').version;
