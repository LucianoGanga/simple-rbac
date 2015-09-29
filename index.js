'use strict';
/**
 * Export
 *
 */

exports = module.exports = {
	rbac: require('./src/simple-rbac.js'),
	utils: require('./src/utils.js'),
	dustHelper: require('./src/dust/user-can.js')
};

/*
  Export the version
*/

exports.version = require('./package').version;
