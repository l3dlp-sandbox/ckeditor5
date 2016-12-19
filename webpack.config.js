/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint browser: false, node: true, strict: true */

const path = require( 'path' );
const CKEditorWebpackPlugin = require( './ckeditor-webpack-plugin' );

module.exports = {
	entry: './webpack-entry-point',

	output: {
		path: __dirname + '/build',
		filename: 'webpack-build.js',
	},

	devtool: 'source-map',

	resolve: {
		extensions: [ '', '.webpack.js', '.web.js', '.js' ],
		modulesDirectories: [
			'node_modules'
		],
		root: [ path.join( __dirname, 'node_modules' ), __dirname ]
	},

	module: {
		loaders: [
			{
				test: /\.js$/,
				loader: 'babel',
				query: {
					presets: [
						require.resolve( 'babel-preset-es2015' ),
					]
				}
			},
		],
	},

	plugins: [
		new CKEditorWebpackPlugin(),
	]
};