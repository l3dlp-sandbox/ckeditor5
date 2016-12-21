/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint browser: false, node: true, strict: true */

'use strict';

const path = require( 'path' );
const fs = require( 'fs' );

class CKEditorWebpackPlugin {
	constructor( options ) {
		this.options = options || {};
		this.useMainRepoModulesFirst = !!options.useMainRepoModulesFirst;
	}

	apply( compiler ) {
		if ( this.useMainRepoModulesFirst ) {
			compiler.resolvers.normal.plugin( 'resolve', ( obj, done ) => {
				obj.path = maybeFixPath( obj.path, obj.request );
				done();
			} );
		}
	}
}

/**
 * @param {String} path
 * @param {String} request
 * @param {Function} done Callback.
 */
function maybeFixPath( _path, request ) {
	if ( _path.includes( 'node_modules' ) && _path.includes( 'ckeditor5-' ) ) {
		const fixedPath = path.join( process.cwd(), 'node_modules' );
		const pathToFile = path.join( fixedPath, request );

		try {
			// Arguments of next calls of maybeFixPath should change so this be checked sync way.
			fs.statSync( pathToFile );
			_path = fixedPath;
		} catch ( err ) {}
	}

	return _path;
}

module.exports = CKEditorWebpackPlugin;
