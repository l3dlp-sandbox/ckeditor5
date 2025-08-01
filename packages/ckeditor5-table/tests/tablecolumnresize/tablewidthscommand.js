/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { ClassicTestEditor } from '@ckeditor/ckeditor5-core/tests/_utils/classictesteditor.js';
import { _getModelData, _setModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model.js';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph/src/paragraph.js';
import { ClipboardPipeline } from '@ckeditor/ckeditor5-clipboard/src/clipboardpipeline.js';

import { TableColumnResize } from '../../src/tablecolumnresize.js';
import { Table } from '../../src/table.js';
import { modelTable } from '../_utils/utils.js';

describe( 'TableWidthsCommand', () => {
	let model, editor, editorElement, command;

	beforeEach( async () => {
		editorElement = document.createElement( 'div' );
		document.body.appendChild( editorElement );

		editor = await ClassicTestEditor.create( editorElement, {
			plugins: [ Table, TableColumnResize, Paragraph, ClipboardPipeline ]
		} );

		model = editor.model;
		command = editor.commands.get( 'resizeTableWidth' );
	} );

	afterEach( async () => {
		if ( editorElement ) {
			editorElement.remove();
		}

		if ( editor ) {
			await editor.destroy();
		}
	} );

	it( 'should work on the currently selected table if it was not passed to execute()', () => {
		_setModelData( model, modelTable( [
			[ '11', '12' ],
			[ '21', '22' ]
		] ) );

		command.execute( { columnWidths: [ '40%', '60%' ], tableWidth: '40%' } );

		expect( _getModelData( model, { withoutSelection: true } ) ).to.equal(
			'<table tableWidth="40%">' +
				'<tableRow>' +
					'<tableCell>' +
						'<paragraph>11</paragraph>' +
					'</tableCell>' +
					'<tableCell>' +
						'<paragraph>12</paragraph>' +
					'</tableCell>' +
				'</tableRow>' +
				'<tableRow>' +
					'<tableCell>' +
						'<paragraph>21</paragraph>' +
					'</tableCell>' +
					'<tableCell>' +
						'<paragraph>22</paragraph>' +
					'</tableCell>' +
				'</tableRow>' +
				'<tableColumnGroup>' +
					'<tableColumn columnWidth="40%"></tableColumn>' +
					'<tableColumn columnWidth="60%"></tableColumn>' +
				'</tableColumnGroup>' +
			'</table>'
		);
	} );

	it( 'should remove the attribute if new value was not passed', () => {
		_setModelData( model, modelTable( [
			[ '11', '12' ],
			[ '21', '22' ]
		], { columnWidths: '40%,60%', tableWidth: '40%' } ) );

		command.execute();

		expect( _getModelData( model, { withoutSelection: true } ) ).to.equal(
			'<table>' +
				'<tableRow>' +
					'<tableCell>' +
						'<paragraph>11</paragraph>' +
					'</tableCell>' +
					'<tableCell>' +
						'<paragraph>12</paragraph>' +
					'</tableCell>' +
				'</tableRow>' +
				'<tableRow>' +
					'<tableCell>' +
						'<paragraph>21</paragraph>' +
					'</tableCell>' +
					'<tableCell>' +
						'<paragraph>22</paragraph>' +
					'</tableCell>' +
				'</tableRow>' +
			'</table>'
		);
	} );

	it( 'shouldn\'t do anything if the new value is not passed and <tableColumnGroup> doesn\'t exists', () => {
		_setModelData( model, modelTable( [
			[ '11', '12' ],
			[ '21', '22' ]
		] ) );

		const modelDataBeforeExecute = _getModelData( model, { withoutSelection: true } );

		command.execute();

		expect( _getModelData( model, { withoutSelection: true } ) ).to.equal( modelDataBeforeExecute );
	} );

	it( 'should work when only tableWidth is provided', () => {
		const data = [ [ '11', '12' ], [ '21', '22' ] ];
		const attributesBefore = { columnWidths: '40%,60%', tableWidth: '40%' };
		_setModelData( model, modelTable( data, attributesBefore ) );

		command.execute( { tableWidth: '50%' } );

		const expectedModel = modelTable( data, { tableWidth: '50%' } );
		expect( _getModelData( model, { withoutSelection: true } ) ).to.equal( expectedModel );
	} );

	it( 'should work when only columnWidths is provided', () => {
		const data = [ [ '11', '12' ], [ '21', '22' ] ];
		const attributesBefore = { columnWidths: '40%,60%', tableWidth: '40%' };
		_setModelData( model, modelTable( data, attributesBefore ) );

		command.execute( { columnWidths: [ '30%', '70%' ] } );

		const expectedModel = modelTable( data, { columnWidths: '30%,70%' } );
		expect( _getModelData( model, { withoutSelection: true } ) ).to.equal( expectedModel );
	} );

	it( 'should work when columnWidths is a string of comma-separated values', () => {
		const data = [ [ '11', '12' ], [ '21', '22' ] ];
		const attributesBefore = { columnWidths: '40%,60%', tableWidth: '40%' };
		_setModelData( model, modelTable( data, attributesBefore ) );

		command.execute( { columnWidths: '30%,70%' } );

		const expectedModel = modelTable( data, { columnWidths: '30%,70%' } );
		expect( _getModelData( model, { withoutSelection: true } ) ).to.equal( expectedModel );
	} );

	it( 'should add attributes when they are provided, but were not present before', () => {
		const data = [ [ '11', '12' ], [ '21', '22' ] ];
		const attributesBefore = {};
		_setModelData( model, modelTable( data, attributesBefore ) );

		command.execute( { columnWidths: [ '30%', '70%' ], tableWidth: '40%' } );

		const expectedModel = modelTable( data, { columnWidths: '30%,70%', tableWidth: '40%' } );
		expect( _getModelData( model, { withoutSelection: true } ) ).to.equal( expectedModel );
	} );

	it( 'should change attributes when they were present before', () => {
		const data = [ [ '11', '12' ], [ '21', '22' ] ];
		const attributesBefore = { columnWidths: '40%,60%', tableWidth: '40%' };
		_setModelData( model, modelTable( data, attributesBefore ) );

		command.execute( { columnWidths: [ '30%', '70%' ], tableWidth: '50%' } );

		const expectedModel = modelTable( data, { columnWidths: '30%,70%', tableWidth: '50%' } );
		expect( _getModelData( model, { withoutSelection: true } ) ).to.equal( expectedModel );
	} );
} );
