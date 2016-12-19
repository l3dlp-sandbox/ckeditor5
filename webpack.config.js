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
		path: path.resolve( __dirname, 'build/dist' ),
		filename: 'ckeditor.js',
	},

	devtool: 'source-map',

	resolve: {
		extensions: [ '.webpack.js', '.web.js', '.js' ],
	},

	module: {

	},

	plugins: [
		new CKEditorWebpackPlugin( {
			useMainRepoModulesFirst: true,
		} ),
	],
};
