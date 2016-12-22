/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint browser: false, node: true, strict: true */

'use strict';

const path = require( 'path' );
const fs = require( 'fs' );

function resolvePathInContext( requesterPath, importPath, contextPackagePath ) {
	// importPath = importPath.replace( /^\.\//, '' );

	if ( !importPath.startsWith( 'ckeditor5-' ) ) {
		return null;
	}

	let pathToResolve = path.join( contextPackagePath, 'node_modules', importPath );

	if ( !path.parse( pathToResolve ).ext ) {
		// If requesterPath is undefined (resolving main file or sth),
		// then default to .js.
		pathToResolve += path.parse( requesterPath || 'index.js' ).ext;
	}

	if ( fs.existsSync( pathToResolve ) ) {
		return pathToResolve;
	}

	return null;
}

module.exports = resolvePathInContext;
