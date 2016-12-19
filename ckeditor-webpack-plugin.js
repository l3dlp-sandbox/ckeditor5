/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint browser: false, node: true, strict: true */

'use strict';

function CKEditorWebpackPlugin() {}

CKEditorWebpackPlugin.prototype.apply = function( compiler ) {
	compiler.plugin( 'emit', function( compilation, cb ) {
		const fs = require( 'fs' );

		fs.writeFileSync( 'webpack-plugin-output.json', compilation );

		cb();
	} );
};

module.exports = CKEditorWebpackPlugin;