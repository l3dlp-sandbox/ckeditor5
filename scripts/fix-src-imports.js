#!/usr/bin/env node

const fs = require( 'fs' );
const path = require( 'path' );
const glob = require( 'glob' );

const srcDir = path.join( process.cwd(), 'src' );
const srcPath = path.join( srcDir , '**', '*.js' );

for ( const filePath of glob.sync( srcPath ) ) {
	const fileDepth = countOcurrences( filePath.replace( srcDir + '/', '' ), path.sep );
	const fix = ( wholeImport, pathStart ) => fixImport( wholeImport, pathStart, fileDepth );

	const fileContent = fs.readFileSync( filePath, 'utf-8' )
		// import { someClass } from 'some-module'
		.replace( /import\s*\{[^\}]+}\s*from\s*'((\.\.\/)+[\w-]+)\/[^']+'/g,  fix )

		// import defaultExport from 'some-module'
		.replace( /import\s*[\w]+\s*from\s*'((\.\.\/)+[\w-]+)\/[^']+'/g, fix )

		// import 'some-module'
		.replace( /import\s*'((\.\.\/)+[\w-]+)\/[^']+'/g, fix )

		// import * as someModule from 'some-module'
		.replace( /import\s*\*\s*as\s*[\w]+\s*from\s*'((\.\.\/)+[\w-]+)\/[^']+'/g, fix );

	fs.writeFileSync( filePath, fileContent , 'utf-8' );
}

function fixImport( wholeImport, pathStart, fileDepth ) {
	const indexOfPathStart = wholeImport.indexOf( '../' );
	const packageShortName = pathStart.split( '/' ).slice( -1 )[0];
	const importDepth = countOcurrences( pathStart, '../' );

	if ( importDepth <= fileDepth ) {
		return wholeImport;
	}

	return (
		wholeImport.slice( 0, indexOfPathStart ) +
		'ckeditor5-' + packageShortName +
		'/src' +
		wholeImport.slice( indexOfPathStart + pathStart.length )
	);
}

function countOcurrences( str, pattern ) {
	return str.split( pattern ).length - 1;
}
