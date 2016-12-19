/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint browser: false, node: true, strict: true */

'use strict';

const path = require( 'path' );
const fs = require( 'fs' );

function CKEditorWebpackPlugin( options ) {
	this.options = options || {};
	this.useMainRepoModulesFirst = !!options.useMainRepoModulesFirst;
}

CKEditorWebpackPlugin.prototype.apply = function( compiler ) {
	if ( this.useMainRepoModulesFirst ) {
		compiler.resolvers.normal.plugin( 'resolve', this.maybeFixPath.bind( this ) );
	}
};

CKEditorWebpackPlugin.prototype.maybeFixPath = function( obj, done ) {
	if ( obj.path.includes( 'node_modules' ) && obj.path.includes( 'ckeditor5-' ) ) {
		const fixedPath = path.join( process.cwd(), 'node_modules' );
		const pathToFile = path.join( fixedPath, obj.request );

		try {
			// Arguments of next calls of maybeFixPath should change so this be checked sync way.
			fs.statSync( pathToFile );
			obj.path = fixedPath;
		} catch ( err ) {}
	}
	done();
};

module.exports = CKEditorWebpackPlugin;
