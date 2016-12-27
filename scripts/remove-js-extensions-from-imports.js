#!/usr/bin/env node

const fs = require( 'fs' );
const path = require( 'path' );
const glob = require( 'glob' );

const srcPath = path.join( process.cwd(), '@(src|tests)', '**', '*.js' );

for ( const filePath of glob.sync( srcPath ) ) {
	const fileContent = fs.readFileSync( filePath, 'utf-8' )
		.replace( /\nimport([^;]+)\.js';/g, '\nimport$1\';' );

	fs.writeFileSync( filePath, fileContent , 'utf-8' );
}
