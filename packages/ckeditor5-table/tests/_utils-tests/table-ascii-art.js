/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { createTableAsciiArt, modelTable, prepareModelTableInput, prettyFormatModelTableInput } from '../_utils/utils.js';
import { TableEditing } from '../../src/tableediting.js';

import { VirtualTestEditor } from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor.js';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph/src/paragraph.js';
import { _setModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model.js';

describe( 'table ascii-art and model helpers', () => {
	let editor, model, modelRoot;

	beforeEach( () => {
		return VirtualTestEditor
			.create( {
				plugins: [ TableEditing, Paragraph ]
			} )
			.then( newEditor => {
				editor = newEditor;

				model = editor.model;
				modelRoot = model.document.getRoot();
			} );
	} );

	afterEach( async () => {
		await editor.destroy();
	} );

	describe( 'for the table with only one cell', () => {
		let table, tableData;

		beforeEach( () => {
			tableData = [
				[ '00' ]
			];

			_setModelData( model, modelTable( tableData ) );

			table = modelRoot.getChild( 0 );
		} );

		it( 'should create proper ascii-art', () => {
			const asciiArt = createTableAsciiArt( model, table );

			expect( asciiArt ).to.equal( [
				'+----+',
				'| 00 |',
				'+----+'
			].join( '\n' ) );
		} );

		it( 'should create proper tableData', () => {
			const modelData = prepareModelTableInput( model, table );
			const modelDataString = prettyFormatModelTableInput( modelData );

			expect( modelData ).to.deep.equal( tableData );

			assertSameCodeString( modelDataString,
				`[
					[ '00' ]
				]`
			);
		} );
	} );

	describe( 'for the table containing only one row', () => {
		let table, tableData;

		beforeEach( () => {
			tableData = [
				[ '00', '01' ]
			];

			_setModelData( model, modelTable( tableData ) );

			table = modelRoot.getChild( 0 );
		} );

		it( 'should create proper ascii-art', () => {
			const asciiArt = createTableAsciiArt( model, table );

			expect( asciiArt ).to.equal( [
				'+----+----+',
				'| 00 | 01 |',
				'+----+----+'
			].join( '\n' ) );
		} );

		it( 'should create proper tableData', () => {
			const modelData = prepareModelTableInput( model, table );
			const modelDataString = prettyFormatModelTableInput( modelData );

			expect( modelData ).to.deep.equal( tableData );

			assertSameCodeString( modelDataString,
				`[
					[ '00', '01' ]
				]`
			);
		} );
	} );

	describe( 'for the table containing only one column', () => {
		let table, tableData;

		beforeEach( () => {
			tableData = [
				[ '00' ],
				[ '10' ]
			];

			_setModelData( model, modelTable( tableData ) );

			table = modelRoot.getChild( 0 );
		} );

		it( 'should create proper ascii-art', () => {
			const asciiArt = createTableAsciiArt( model, table );

			expect( asciiArt ).to.equal( [
				'+----+',
				'| 00 |',
				'+----+',
				'| 10 |',
				'+----+'
			].join( '\n' ) );
		} );

		it( 'should create proper tableData', () => {
			const modelData = prepareModelTableInput( model, table );
			const modelDataString = prettyFormatModelTableInput( modelData );

			expect( modelData ).to.deep.equal( tableData );

			assertSameCodeString( modelDataString,
				`[
					[ '00' ],
					[ '10' ]
				]`
			);
		} );
	} );

	describe( 'for the table containing two rows and two columns', () => {
		let table, tableData;

		beforeEach( () => {
			tableData = [
				[ '00', '01' ],
				[ '10', '11' ]
			];

			_setModelData( model, modelTable( tableData ) );

			table = modelRoot.getChild( 0 );
		} );

		it( 'should create proper ascii-art', () => {
			const asciiArt = createTableAsciiArt( model, table );

			expect( asciiArt ).to.equal( [
				'+----+----+',
				'| 00 | 01 |',
				'+----+----+',
				'| 10 | 11 |',
				'+----+----+'
			].join( '\n' ) );
		} );

		it( 'should create proper tableData', () => {
			const modelData = prepareModelTableInput( model, table );
			const modelDataString = prettyFormatModelTableInput( modelData );

			expect( modelData ).to.deep.equal( tableData );

			assertSameCodeString( modelDataString,
				`[
					[ '00', '01' ],
					[ '10', '11' ]
				]`
			);
		} );
	} );

	describe( 'for the table containing column and row-spanned cells', () => {
		let table, tableData;

		beforeEach( () => {
			tableData = [
				[ { contents: '00', colspan: 2, rowspan: 2 }, { contents: '02', rowspan: 2 }, '03' ],
				[ '13' ],
				[ { contents: '20', colspan: 2 }, { contents: '22', colspan: 2, rowspan: 2 } ],
				[ '30', '31' ]
			];

			_setModelData( model, modelTable( structuredClone( tableData ) ) );

			table = modelRoot.getChild( 0 );
		} );

		it( 'should create proper ascii-art', () => {
			const asciiArt = createTableAsciiArt( model, table );

			expect( asciiArt ).to.equal( [
				'+----+----+----+----+',
				'| 00      | 02 | 03 |',
				'+         +    +----+',
				'|         |    | 13 |',
				'+----+----+----+----+',
				'| 20      | 22      |',
				'+----+----+         +',
				'| 30 | 31 |         |',
				'+----+----+----+----+'
			].join( '\n' ) );
		} );

		it( 'should create proper tableData', () => {
			const modelData = prepareModelTableInput( model, table );
			const modelDataString = prettyFormatModelTableInput( modelData );

			expect( modelData ).to.deep.equal( tableData );

			assertSameCodeString( modelDataString,
				`[
					[ { contents: '00', colspan: 2, rowspan: 2 }, { contents: '02', rowspan: 2 }, '03' ],
					[ '13' ],
					[ { contents: '20', colspan: 2 }, { contents: '22', colspan: 2, rowspan: 2 } ],
					[ '30', '31' ]
				]`
			);
		} );
	} );

	describe( 'for the table containing larger column and row-spanned cells', () => {
		let table, tableData;

		beforeEach( () => {
			tableData = [
				[ '00', { contents: '01', rowspan: 2 }, { contents: '02', rowspan: 3 }, { contents: '03', rowspan: 4 } ],
				[ '10' ],
				[ { contents: '20', colspan: 2 } ],
				[ { contents: '30', colspan: 3 } ],
				[ { contents: '40', colspan: 4 } ]
			];

			_setModelData( model, modelTable( structuredClone( tableData ) ) );

			table = modelRoot.getChild( 0 );
		} );

		it( 'should create proper ascii-art', () => {
			const asciiArt = createTableAsciiArt( model, table );

			expect( asciiArt ).to.equal( [
				'+----+----+----+----+',
				'| 00 | 01 | 02 | 03 |',
				'+----+    +    +    +',
				'| 10 |    |    |    |',
				'+----+----+    +    +',
				'| 20      |    |    |',
				'+----+----+----+    +',
				'| 30           |    |',
				'+----+----+----+----+',
				'| 40                |',
				'+----+----+----+----+'
			].join( '\n' ) );
		} );

		it( 'should create proper tableData', () => {
			const modelData = prepareModelTableInput( model, table );
			const modelDataString = prettyFormatModelTableInput( modelData );

			expect( modelData ).to.deep.equal( tableData );

			assertSameCodeString( modelDataString,
				`[
					[ '00', { contents: '01', rowspan: 2 }, { contents: '02', rowspan: 3 }, { contents: '03', rowspan: 4 } ],
					[ '10' ],
					[ { contents: '20', colspan: 2 } ],
					[ { contents: '30', colspan: 3 } ],
					[ { contents: '40', colspan: 4 } ]
				]`
			);
		} );
	} );

	describe( 'with cells\' content not matching cell\'s coordinates', () => {
		let table, tableData;

		beforeEach( () => {
			tableData = [
				[ '', 'x' ],
				[ '10', 'foobar' ]
			];

			_setModelData( model, modelTable( tableData ) );

			table = modelRoot.getChild( 0 );
		} );

		it( 'should create proper ascii-art', () => {
			const asciiArt = createTableAsciiArt( model, table );

			expect( asciiArt ).to.equal( [
				'+----+----+',
				'|    | x  |',
				'+----+----+',
				'| 10 | fo |',
				'+----+----+'
			].join( '\n' ) );
		} );

		it( 'should create proper tableData', () => {
			const modelData = prepareModelTableInput( model, table );
			const modelDataString = prettyFormatModelTableInput( modelData );

			tableData = [
				[ '', 'x' ],
				[ '10', 'foobar' ]
			];

			expect( modelData ).to.deep.equal( tableData );

			assertSameCodeString( modelDataString,
				`[
					[ '', 'x' ],
					[ '10', 'foobar' ]
				]`
			);
		} );
	} );

	function structuredClone( data ) {
		return JSON.parse( JSON.stringify( data ) );
	}

	function assertSameCodeString( actual, expected ) {
		expect( trimLines( actual ) ).to.equal( trimLines( expected ) );
	}

	function trimLines( string ) {
		return string.replace( /^\s+|\s+$/gm, '' );
	}
} );
