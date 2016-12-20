/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint node: true */

const path = require( 'path' );
const fs = require( 'fs' );

/**
 * @param {String} name Name of the package.
 * @returns {String} Path to package.
 */
module.exports = function getPathToPackage( name ) {
	const pathToPackage = path.join( __dirname, '..', '..', 'ckeditor5-' + name );

	try {
		fs.statSync( pathToPackage );
	} catch ( err ) {
		throw new Error( `Missing package: ckeditor5-${ name } in ${ path.join( __dirname, '..', '..' ) }.` );
	}

	return pathToPackage;
};

