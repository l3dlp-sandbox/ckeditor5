/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { ModelTestEditor } from '@ckeditor/ckeditor5-core/tests/_utils/modeltesteditor.js';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph/src/paragraph.js';
import { _setModelData, _getModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model.js';

import { TableSelection } from '../../src/tableselection.js';
import { TableEditing } from '../../src/tableediting.js';
import { TableLayoutEditing } from '../../src/index.js';
import { assertSelectedCells, modelTable } from '../_utils/utils.js';

import { SetHeaderColumnCommand } from '../../src/commands/setheadercolumncommand.js';

describe( 'SetHeaderColumnCommand', () => {
	let editor, model, command;

	beforeEach( () => {
		return ModelTestEditor
			.create( {
				plugins: [ Paragraph, TableEditing, TableSelection ]
			} )
			.then( newEditor => {
				editor = newEditor;
				model = editor.model;
				command = new SetHeaderColumnCommand( editor );
			} );
	} );

	afterEach( () => {
		return editor.destroy();
	} );

	describe( 'isEnabled', () => {
		it( 'should be false if selection is not in a table', () => {
			_setModelData( model, '<paragraph>foo[]</paragraph>' );
			expect( command.isEnabled ).to.be.false;
		} );

		it( 'should be true if selection is in table', () => {
			_setModelData( model, '<table><tableRow><tableCell><paragraph>foo[]</paragraph></tableCell></tableRow></table>' );
			expect( command.isEnabled ).to.be.true;
		} );

		it( 'should be true if multiple columns are selected', () => {
			_setModelData( model, modelTable( [
				[ '01', '02', '03' ]
			] ) );

			const tableSelection = editor.plugins.get( TableSelection );
			const modelRoot = model.document.getRoot();
			tableSelection.setCellSelection(
				modelRoot.getNodeByPath( [ 0, 0, 0 ] ),
				modelRoot.getNodeByPath( [ 0, 0, 1 ] )
			);

			expect( command.isEnabled ).to.be.true;
		} );

		it( 'should be true if multiple header columns are selected', () => {
			_setModelData( model, modelTable( [
				[ '01', '02', '03' ]
			], { headingColumns: 2 } ) );

			const tableSelection = editor.plugins.get( TableSelection );
			const modelRoot = model.document.getRoot();
			tableSelection.setCellSelection(
				modelRoot.getNodeByPath( [ 0, 0, 0 ] ),
				modelRoot.getNodeByPath( [ 0, 0, 1 ] )
			);

			expect( command.isEnabled ).to.be.true;
		} );

		describe( 'with `TableLayout` plugin', () => {
			let editor, model, command;

			beforeEach( () => {
				return ModelTestEditor
					.create( {
						plugins: [ Paragraph, TableEditing, TableSelection, TableLayoutEditing ]
					} )
					.then( newEditor => {
						editor = newEditor;
						model = editor.model;
						command = new SetHeaderColumnCommand( editor );
					} );
			} );

			afterEach( () => {
				return editor.destroy();
			} );

			it( 'should be true if selection is in table', () => {
				_setModelData( model, '<table><tableRow><tableCell><paragraph>foo[]</paragraph></tableCell></tableRow></table>' );
				expect( command.isEnabled ).to.be.true;
			} );

			it( 'should be false if selection is in table with `tableType="layout"`', () => {
				_setModelData( model,
					'<table tableType="layout">' +
						'<tableRow><tableCell><paragraph>foo[]</paragraph></tableCell></tableRow>' +
					'</table>' );
				expect( command.isEnabled ).to.be.false;
			} );
		} );
	} );

	describe( 'value', () => {
		it( 'should be false if selection is not in a heading column', () => {
			_setModelData( model, modelTable( [
				[ '01', '02' ],
				[ '11', '12[]' ]
			], { headingColumns: 1 } ) );

			expect( command.value ).to.be.false;
		} );

		it( 'should be true if selection is in a heading column', () => {
			_setModelData( model, modelTable( [
				[ '01[]', '02' ],
				[ '11', '12' ]
			], { headingColumns: 1 } ) );

			expect( command.value ).to.be.true;
		} );

		it( 'should be true if multiple header columns are selected', () => {
			_setModelData( model, modelTable( [
				[ '01', '02', '03' ]
			], { headingColumns: 2 } ) );

			const tableSelection = editor.plugins.get( TableSelection );
			const modelRoot = model.document.getRoot();
			tableSelection.setCellSelection(
				modelRoot.getNodeByPath( [ 0, 0, 0 ] ),
				modelRoot.getNodeByPath( [ 0, 0, 1 ] )
			);

			expect( command.value ).to.be.true;
		} );

		it( 'should be true if multiple header columns are selected in reversed order', () => {
			_setModelData( model, modelTable( [
				[ '01', '02', '03' ]
			], { headingColumns: 2 } ) );

			const tableSelection = editor.plugins.get( TableSelection );
			const modelRoot = model.document.getRoot();
			tableSelection.setCellSelection(
				modelRoot.getNodeByPath( [ 0, 0, 1 ] ),
				modelRoot.getNodeByPath( [ 0, 0, 0 ] )
			);

			expect( command.value ).to.be.true;
		} );

		it( 'should be false if selection is in a heading row', () => {
			_setModelData( model, modelTable( [
				[ '01', '02[]' ],
				[ '11', '12' ]
			], { headingRows: 1, headingColumns: 1 } ) );

			expect( command.value ).to.be.false;
		} );

		it( 'should be false if only part of selected columns are headers', () => {
			_setModelData( model, modelTable( [
				[ '01', '02', '03', '04' ]
			], { headingColumns: 2 } ) );

			const tableSelection = editor.plugins.get( TableSelection );
			const modelRoot = model.document.getRoot();
			tableSelection.setCellSelection(
				modelRoot.getNodeByPath( [ 0, 0, 1 ] ),
				modelRoot.getNodeByPath( [ 0, 0, 2 ] )
			);

			expect( command.value ).to.be.false;
		} );
	} );

	describe( 'execute()', () => {
		it( 'should set heading columns attribute that cover column with collapsed selection', () => {
			_setModelData( model, modelTable( [
				[ '00', '01[]', '02', '03' ]
			] ) );

			command.execute();

			expect( _getModelData( model ) ).to.equalMarkup( modelTable( [
				[ '00', '01[]', '02', '03' ]
			], { headingColumns: 2 } ) );
		} );

		it( 'should set heading columns attribute that cover column with entire cell selected', () => {
			_setModelData( model, modelTable( [
				[ '00', '01', '02', '03' ]
			] ) );

			const tableSelection = editor.plugins.get( TableSelection );
			const modelRoot = model.document.getRoot();
			tableSelection.setCellSelection(
				modelRoot.getNodeByPath( [ 0, 0, 1 ] ),
				modelRoot.getNodeByPath( [ 0, 0, 1 ] )
			);

			command.execute();

			expect( _getModelData( model, { withoutSelection: true } ) ).to.equalMarkup( modelTable( [
				[ '00', '01', '02', '03' ]
			], { headingColumns: 2 } ) );

			assertSelectedCells( model, [
				[ 0, 1, 0, 0 ]
			] );
		} );

		it( 'should set heading columns attribute below current selection column', () => {
			_setModelData( model, modelTable( [
				[ '00', '01[]', '02', '03' ]
			], { headingColumns: 3 } ) );

			command.execute();

			expect( _getModelData( model ) ).to.equalMarkup( modelTable( [
				[ '00', '01[]', '02', '03' ]
			], { headingColumns: 1 } ) );
		} );

		it( 'should remove "headingColumns" attribute from table if no value was given', () => {
			_setModelData( model, modelTable( [
				[ '[]00', '01', '02', '03' ]
			], { headingColumns: 3 } ) );

			command.execute();

			expect( _getModelData( model ) ).to.equalMarkup( modelTable( [
				[ '[]00', '01', '02', '03' ]
			] ) );
		} );

		describe( 'multi-cell selection', () => {
			describe( 'setting header', () => {
				it( 'should set it correctly in a middle of single-row, multiple cell selection', () => {
					_setModelData( model, modelTable( [
						[ '00', '01', '02', '03' ]
					] ) );

					const tableSelection = editor.plugins.get( TableSelection );
					const modelRoot = model.document.getRoot();
					tableSelection.setCellSelection(
						modelRoot.getNodeByPath( [ 0, 0, 1 ] ),
						modelRoot.getNodeByPath( [ 0, 0, 2 ] )
					);

					command.execute();

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equalMarkup( modelTable( [
						[ '00', '01', '02', '03' ]
					], {
						headingColumns: 3
					} ) );

					assertSelectedCells( model, [
						[ 0, 1, 1, 0 ]
					] );
				} );

				it( 'should set it correctly in a middle of multi-row, multiple cell selection', () => {
					_setModelData( model, modelTable( [
						[ '00', '01', '02', '03' ],
						[ '10', '11', '12', '13' ]
					] ) );

					const tableSelection = editor.plugins.get( TableSelection );
					const modelRoot = model.document.getRoot();
					tableSelection.setCellSelection(
						modelRoot.getNodeByPath( [ 0, 0, 1 ] ),
						modelRoot.getNodeByPath( [ 0, 1, 1 ] )
					);

					command.execute();

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equalMarkup( modelTable( [
						[ '00', '01', '02', '03' ],
						[ '10', '11', '12', '13' ]
					], {
						headingColumns: 2
					} ) );

					assertSelectedCells( model, [
						[ 0, 1, 0, 0 ],
						[ 0, 1, 0, 0 ]
					] );
				} );

				it( 'should remove header columns in case of multiple cell selection', () => {
					_setModelData( model, modelTable( [
						[ '00', '01', '02', '03' ]
					], { headingColumns: 4 } ) );

					const tableSelection = editor.plugins.get( TableSelection );
					const modelRoot = model.document.getRoot();
					tableSelection.setCellSelection(
						modelRoot.getNodeByPath( [ 0, 0, 1 ] ),
						modelRoot.getNodeByPath( [ 0, 0, 2 ] )
					);

					command.execute();

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equalMarkup( modelTable( [
						[ '00', '01', '02', '03' ]
					], {
						headingColumns: 1
					} ) );

					assertSelectedCells( model, [
						[ 0, 1, 1, 0 ]
					] );
				} );

				it( 'should remove header columns in case of multiple cell selection - reversed order', () => {
					_setModelData( model, modelTable( [
						[ '00', '01', '02', '03' ]
					], {
						headingColumns: 4
					} ) );

					const tableSelection = editor.plugins.get( TableSelection );
					const modelRoot = model.document.getRoot();
					tableSelection.setCellSelection(
						modelRoot.getNodeByPath( [ 0, 0, 2 ] ),
						modelRoot.getNodeByPath( [ 0, 0, 1 ] )
					);

					command.execute();

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equalMarkup(
						modelTable( [ [ '00', '01', '02', '03' ] ], { headingColumns: 1 } )
					);

					assertSelectedCells( model, [
						[ 0, 1, 1, 0 ]
					] );
				} );

				it( 'should respect forceValue=true in case of multiple cell selection', () => {
					_setModelData( model, modelTable( [
						[ '00', '01', '02', '03' ]
					], {
						headingColumns: 3
					} ) );

					const tableSelection = editor.plugins.get( TableSelection );
					const modelRoot = model.document.getRoot();
					tableSelection.setCellSelection(
						modelRoot.getNodeByPath( [ 0, 0, 1 ] ),
						modelRoot.getNodeByPath( [ 0, 0, 2 ] )
					);

					command.execute( { forceValue: true } );

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equalMarkup(
						modelTable( [ [ '00', '01', '02', '03' ] ], { headingColumns: 3 } )
					);

					assertSelectedCells( model, [
						[ 0, 1, 1, 0 ]
					] );
				} );

				it( 'should respect forceValue=false in case of multiple cell selection', () => {
					_setModelData( model, modelTable( [
						[ '00', '01', '02', '03' ]
					], {
						headingColumns: 1
					} ) );

					const tableSelection = editor.plugins.get( TableSelection );
					const modelRoot = model.document.getRoot();
					tableSelection.setCellSelection(
						modelRoot.getNodeByPath( [ 0, 0, 1 ] ),
						modelRoot.getNodeByPath( [ 0, 0, 2 ] )
					);

					command.execute( { forceValue: false } );

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equalMarkup(
						modelTable( [ [ '00', '01', '02', '03' ] ], { headingColumns: 1 } )
					);

					assertSelectedCells( model, [
						[ 0, 1, 1, 0 ]
					] );
				} );

				it( 'should set it correctly in table with more than 10 columns (array sort bug)', () => {
					_setModelData( model, modelTable( [
						[ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14' ]
					] ) );

					const tableSelection = editor.plugins.get( TableSelection );
					const modelRoot = model.document.getRoot();
					tableSelection.setCellSelection(
						modelRoot.getNodeByPath( [ 0, 0, 2 ] ),
						modelRoot.getNodeByPath( [ 0, 0, 13 ] )
					);

					command.execute();

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equalMarkup( modelTable( [
						[ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14' ]
					], { headingColumns: 14 } ) );
				} );
			} );
		} );

		it( 'should toggle of selected column', () => {
			_setModelData( model, modelTable( [
				[ '00', '01[]', '02', '03' ]
			], { headingColumns: 2 } ) );

			command.execute();

			expect( _getModelData( model ) ).to.equalMarkup( modelTable( [
				[ '00', '01[]', '02', '03' ]
			], { headingColumns: 1 } ) );

			command.execute();

			expect( _getModelData( model ) ).to.equalMarkup( modelTable( [
				[ '00', '01[]', '02', '03' ]
			], { headingColumns: 2 } ) );
		} );

		it( 'should respect forceValue parameter (forceValue=true)', () => {
			_setModelData( model, modelTable( [
				[ '00', '01[]', '02', '03' ]
			], { headingColumns: 3 } ) );

			command.execute( { forceValue: true } );

			expect( _getModelData( model ) ).to.equalMarkup( modelTable( [
				[ '00', '01[]', '02', '03' ]
			], { headingColumns: 3 } ) );
		} );

		it( 'should respect forceValue parameter (forceValue=false)', () => {
			_setModelData( model, modelTable( [
				[ '00', '01[]', '02', '03' ]
			], { headingColumns: 1 } ) );

			command.execute( { forceValue: false } );

			expect( _getModelData( model ) ).to.equalMarkup( modelTable( [
				[ '00', '01[]', '02', '03' ]
			], { headingColumns: 1 } ) );
		} );

		it( 'should fix col-spanned cells on the edge of an table heading columns section', () => {
			// +----+----+----+
			// | 00 | 01      |
			// +----+         +
			// | 10 |         |
			// +----+----+----+
			// | 20 | 21 | 22 |
			// +----+----+----+
			//      ^-- heading columns
			_setModelData( model, modelTable( [
				[ '00', { contents: '[]01', colspan: 2, rowspan: 2 } ],
				[ '10' ],
				[ '20', '21', '22' ]
			], { headingColumns: 1 } ) );

			command.execute();

			// +----+----+----+
			// | 00 | 01 |    |
			// +----+    +    +
			// | 10 |    |    |
			// +----+----+----+
			// | 20 | 21 | 22 |
			// +----+----+----+
			//           ^-- heading columns
			expect( _getModelData( model ) ).to.equalMarkup( modelTable( [
				[ '00', { contents: '[]01', rowspan: 2 }, { contents: '', rowspan: 2 } ],
				[ '10' ],
				[ '20', '21', '22' ]
			], { headingColumns: 2 } ) );
		} );

		it( 'should split to at most 2 table cells when fixing col-spanned cells on the edge of an table heading columns section', () => {
			// +----+----+----+----+----+----+
			// | 00 | 01                     |
			// +----+                        +
			// | 10 |                        |
			// +----+----+----+----+----+----+
			// | 20 | 21 | 22 | 23 | 24 | 25 |
			// +----+----+----+----+----+----+
			//      ^-- heading columns
			_setModelData( model, modelTable( [
				[ '00', { contents: '01', colspan: 5, rowspan: 2 } ],
				[ '10' ],
				[ '20', '21', '22[]', '23', '24', '25' ]
			], { headingColumns: 1 } ) );

			command.execute();

			// +----+----+----+----+----+----+
			// | 00 | 01      |              |
			// +----+         +              +
			// | 10 |         |              |
			// +----+----+----+----+----+----+
			// | 20 | 21 | 22 | 23 | 24 | 25 |
			// +----+----+----+----+----+----+
			//                ^-- heading columns
			expect( _getModelData( model ) ).to.equalMarkup( modelTable( [
				[ '00', { contents: '01', colspan: 2, rowspan: 2 }, { contents: '', colspan: 3, rowspan: 2 } ],
				[ '10' ],
				[ '20', '21', '22[]', '23', '24', '25' ]
			], { headingColumns: 3 } ) );
		} );

		it( 'should fix col-spanned cells on the edge of an table heading columns section when creating section', () => {
			// +----+----+
			// | 00      |
			// +----+----+
			// | 10 | 11 |
			// +----+----+
			//           ^-- heading columns
			_setModelData( model, modelTable( [
				[ { contents: '00', colspan: 2 } ],
				[ '10', '[]11' ]
			], { headingColumns: 2 } ) );

			command.execute();

			// +----+----+
			// | 00 |    |
			// +----+----+
			// | 10 | 11 |
			// +----+----+
			//      ^-- heading columns
			expect( _getModelData( model ) ).to.equalMarkup( modelTable( [
				[ '00', '' ],
				[ '10', '[]11' ]
			], { headingColumns: 1 } ) );
		} );
	} );
} );
