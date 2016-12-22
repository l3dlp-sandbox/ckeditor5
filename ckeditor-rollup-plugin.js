/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint browser: false, node: true, strict: true */

'use strict';

const resolvePathInContext = require( './compiler-utils/resolvepathincontext' );

function ckeditorRollupPlugin( options ) {
	return {
		resolveId( importPath, requesterPath ) {
			if ( options.useMainPackageModules ) {
				return resolvePathInContext( requesterPath, importPath, options.mainPackagePath );
			}
		}
	};
}

module.exports = ckeditorRollupPlugin;
