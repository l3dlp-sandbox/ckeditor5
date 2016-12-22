/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint browser: false, node: true, strict: true */

'use strict';

const CKEditorWebpackPlugin = require( '../../ckeditor-webpack-plugin' );

/**
 * @param {Object} options
 * @returns {Object}
 */
module.exports = function getWebpackConfig( options ) {
	const webpackConfig = {
		resolve: {
			root: options.sourcePath
		},

		plugins: [
			new CKEditorWebpackPlugin( {
				useMainPackageModules: true,
				mainPackagePath: process.cwd(),
			} ),
		],
	};

	if ( options.sourceMap ) {
		webpackConfig.devtool = 'cheap-source-map';
	}

	return webpackConfig;
};