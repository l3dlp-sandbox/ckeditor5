/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint browser: false, node: true, strict: true */

'use strict';

const resolvePathInContext = require( './compiler-utils/resolvepathincontext' );

class CKEditorWebpackPlugin {
	constructor( options = {} ) {
		this.options = options;
	}

	apply( compiler ) {
		if ( this.options.useMainPackageModules ) {
			compiler.resolvers.normal.plugin( 'before-resolve', ( obj, done ) => {
				const resolvedPath = resolvePathInContext( obj.context.issuer, obj.request, this.options.mainPackagePath );

				if ( resolvedPath ) {
					const index = resolvedPath.lastIndexOf( '/node_modules/' );

					obj.path = resolvedPath.slice( 0, index ) + '/node_modules/';
					obj.request = './' + obj.request;
				}

				done();
			} );
		}
	}
}

module.exports = CKEditorWebpackPlugin;
