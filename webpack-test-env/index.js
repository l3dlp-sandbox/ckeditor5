/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* jshint browser: false, node: true, strict: true */

module.exports = {
	runAutomatedTests: require( './tasks/runautomatedtests' ),
	runManualTests: require( './tasks/runmanualtests' ),
	parseArguments: require( './utils/parsearguments' ),
};