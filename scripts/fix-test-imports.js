#!/usr/bin/env node

const fs = require( 'fs' );
const path = require( 'path' );
const glob = require( 'glob' );

const testDir = path.join( process.cwd(), 'tests' );
const testPath = path.join( testDir , '**', '*.js' );

for ( const filePath of glob.sync( testPath ) ) {
	const fileContent = fs.readFileSync( filePath, 'utf-8' )
		// import { someClass } from 'some-module'
		.replace( /import\s*\{[^\}]+}\s*from\s*'([^']+)'/g,  fixImport )

		// import defaultExport from 'some-module'
		.replace( /import\s*[\w]+\s*from\s*'([^']+)'/g, fixImport )

		// import 'some-module'
		.replace( /import\s*'([^']+)'/g, fixImport )

		// import * as someModule from 'some-module'
		.replace( /import\s*\*\s*as\s*[\w]+\s*from\s*'([^']+)'/g, fixImport );

	fs.writeFileSync( filePath, fileContent , 'utf-8' );
}

function fixImport( wholeImport , path ) {
	let fixedImport = fixCkeditorPaths( wholeImport, path );
	fixedImport = fixTestPaths( fixedImport, path );

	return fixedImport;
}

function fixCkeditorPaths( wholeImport, path ) {
	if ( path.indexOf( 'ckeditor5/' ) !== 0 ) {
		return wholeImport;
	}

	const index = wholeImport.indexOf( path );
	const pathChunks = path.split( '/' );

	return (
		wholeImport.slice( 0, index ) +
		'ckeditor5-' + pathChunks[1] + '/src/' + pathChunks.slice( 2 ).join( '/' ) +
		wholeImport.slice( path.length + index )
	);
}

function fixTestPaths( wholeImport, path ) {
	if ( path.indexOf( 'tests/' ) !== 0 ) {
		return wholeImport;
	}

	const index = wholeImport.indexOf( path );
	const pathChunks = path.split( '/' );

	return (
		wholeImport.slice( 0, index ) +
		'ckeditor5-' + pathChunks[1] + '/tests/' + pathChunks.slice( 2 ).join( '/' ) +
		wholeImport.slice( path.length + index )
	);
}