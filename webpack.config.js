/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint browser: false, node: true, strict: true */

const path = require( 'path' );
const CKEditorWebpackPlugin = require( './ckeditor-webpack-plugin' );

module.exports = {
	context: __dirname,
	target: 'web',

	entry: './webpack-entry-point',

	output: {
		path: path.join( 'build', 'dist' ),
		filename: 'ckeditor.js',
	},

	devtool: 'cheap-source-map',

	plugins: [
		new CKEditorWebpackPlugin( {
			useMainPackageModules: true,
			mainPackagePath: process.cwd()
		} ),
	],
};
