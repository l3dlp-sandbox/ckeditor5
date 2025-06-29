/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { ModelTestEditor } from '@ckeditor/ckeditor5-core/tests/_utils/modeltesteditor.js';
import { _setModelData, _getModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model.js';

import { RestrictedEditingModeNavigationCommand } from '../src/restrictededitingmodenavigationcommand.js';

describe( 'RestrictedEditingModeNavigationCommand', () => {
	let editor, forwardCommand, backwardCommand, model;

	beforeEach( () => {
		return ModelTestEditor
			.create()
			.then( newEditor => {
				editor = newEditor;
				model = editor.model;

				forwardCommand = new RestrictedEditingModeNavigationCommand( editor, 'forward' );
				backwardCommand = new RestrictedEditingModeNavigationCommand( editor, 'backward' );

				model.schema.register( 'paragraph', { inheritAllFrom: '$block' } );
				editor.model.schema.extend( '$text', { allowAttributes: [ 'restrictedEditingException' ] } );
			} );
	} );

	afterEach( () => {
		forwardCommand.destroy();
		backwardCommand.destroy();

		return editor.destroy();
	} );

	describe( 'constructor()', () => {
		it( 'should set public properties', () => {
			expect( forwardCommand ).to.have.property( 'affectsData', false );
		} );
	} );

	describe( 'forward command', () => {
		describe( 'isEnabled', () => {
			describe( 'collapsed selection', () => {
				it( 'should be true when there is a marker after the selection position if editor is read-write', () => {
					_setModelData( model, '<paragraph>[]foo bar baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>[]foo <marker>bar</marker> baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( forwardCommand.isEnabled ).to.be.true;
				} );

				it( 'should be true when there is a marker after the selection position if editor is read-only', () => {
					_setModelData( model, '<paragraph>[]foo bar baz</paragraph>' );
					editor.enableReadOnlyMode( 'unit-test' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>[]foo <marker>bar</marker> baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( forwardCommand.isEnabled ).to.be.true;
				} );

				it( 'should be false when there is no marker after the selection position', () => {
					_setModelData( model, '<paragraph>foo bar baz[]</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>bar</marker> baz[]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( forwardCommand.isEnabled ).to.be.false;
				} );

				it( 'should be false when the selection position is at a marker start and there are no more markers', () => {
					_setModelData( model, '<paragraph>foo []bar baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo []<marker>bar</marker> baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( forwardCommand.isEnabled ).to.be.false;
				} );

				it( 'should be false when the selection position is in a marker and there are no more markers', () => {
					_setModelData( model, '<paragraph>foo b[]ar baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>b[]ar</marker> baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( forwardCommand.isEnabled ).to.be.false;
				} );

				it( 'should be false when the selection position is at a marker end and there are no more markers', () => {
					_setModelData( model, '<paragraph>foo bar[] baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>bar</marker>[] baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( forwardCommand.isEnabled ).to.be.false;
				} );
			} );

			describe( 'expanded selection', () => {
				it( 'should be true when there is a marker after the first selection position if editor is read-write', () => {
					_setModelData( model, '<paragraph>[fo]o bar baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>[fo]o <marker>bar</marker> baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( forwardCommand.isEnabled ).to.be.true;
				} );

				it( 'should be true when there is a marker after the first selection position if editor is read-only', () => {
					_setModelData( model, '<paragraph>[fo]o bar baz</paragraph>' );
					editor.enableReadOnlyMode( 'unit-test' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>[fo]o <marker>bar</marker> baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( forwardCommand.isEnabled ).to.be.true;
				} );

				it( 'should be true when the selection overlaps the marker but the start position is before it', () => {
					_setModelData( model, '<paragraph>[foo ba]r baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>[foo <marker>ba]r</marker> baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( forwardCommand.isEnabled ).to.be.true;
				} );

				it( 'should be false when the selection overlaps the marker but the start position is after it', () => {
					_setModelData( model, '<paragraph>foo ba[r baz]</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>ba[r</marker> baz]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( forwardCommand.isEnabled ).to.be.false;
				} );
			} );
		} );

		describe( 'execute()', () => {
			describe( 'collapsed selection', () => {
				it( 'should move to the next marker', () => {
					_setModelData( model, '<paragraph>[]foo bar baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>[]foo <marker>bar</marker> baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					// <paragraph>[]foo <marker>bar</marker> <marker>baz</marker></paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:2', {
							range: writer.createRange( writer.createPositionAt( paragraph, 8 ), writer.createPositionAt( paragraph, 11 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					forwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo [bar] baz</paragraph>' );

					forwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo bar [baz]</paragraph>' );
				} );

				it( 'should move to the next marker when at the end of adjacent one', () => {
					_setModelData( model, '<paragraph>foo[]</paragraph><paragraph>bar</paragraph>' );

					const fiirstParagraph = model.document.getRoot().getChild( 0 );
					const secondParagraph = model.document.getRoot().getChild( 1 );

					// <paragraph><marker>foo</marker>[]</paragraph><paragraph>bar</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRangeIn( fiirstParagraph ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					// <paragraph><marker>foo</marker>[]</paragraph><paragraph><marker>bar</marker></paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:2', {
							range: writer.createRangeIn( secondParagraph ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					forwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo</paragraph><paragraph>[bar]</paragraph>' );
				} );

				it( 'should move to the closest marker when created in a reverse order', () => {
					_setModelData( model, '<paragraph>[]foo bar baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>[]foo bar <marker>baz</marker></paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:2', {
							range: writer.createRange( writer.createPositionAt( paragraph, 8 ), writer.createPositionAt( paragraph, 11 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					// <paragraph>[]foo <marker>bar</marker> <marker>baz</marker></paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					forwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo [bar] baz</paragraph>' );

					forwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo bar [baz]</paragraph>' );
				} );
			} );

			describe( 'expanded selection', () => {
				it( 'should move to the next marker when the selection end overlaps the marker', () => {
					_setModelData( model, '<paragraph>[foo b]ar baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>[foo <marker>b]ar</marker> baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					// <paragraph>[foo <marker>b]ar</marker> <marker>baz</marker></paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:2', {
							range: writer.createRange( writer.createPositionAt( paragraph, 8 ), writer.createPositionAt( paragraph, 11 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					forwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo [bar] baz</paragraph>' );

					forwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo bar [baz]</paragraph>' );
				} );

				it( 'should move to the next marker when the selection start overlaps the marker', () => {
					_setModelData( model, '<paragraph>foo b[ar b]az</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>b[ar</marker> b]az</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					// <paragraph>foo <marker>b[ar</marker> <marker>b]az</marker></paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:2', {
							range: writer.createRange( writer.createPositionAt( paragraph, 8 ), writer.createPositionAt( paragraph, 11 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					forwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo bar [baz]</paragraph>' );
				} );
			} );
		} );
	} );

	describe( 'backward command', () => {
		describe( 'isEnabled', () => {
			describe( 'collapsed selection', () => {
				it( 'should be true when there is a marker before the selection position if editor is read-write', () => {
					_setModelData( model, '<paragraph>foo bar baz[]</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>bar</marker> baz[]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( backwardCommand.isEnabled ).to.be.true;
				} );

				it( 'should be true when there is a marker before the selection position if editor is read-only', () => {
					_setModelData( model, '<paragraph>foo bar baz[]</paragraph>' );
					editor.enableReadOnlyMode( 'unit-test' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>bar</marker> baz[]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( backwardCommand.isEnabled ).to.be.true;
				} );

				it( 'should be false when there is no marker before the selection position', () => {
					_setModelData( model, '<paragraph>[]foo bar baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>[]foo <marker>bar</marker> baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( backwardCommand.isEnabled ).to.be.false;
				} );

				it( 'should be false when the selection position is at a marker end and there are no more markers', () => {
					_setModelData( model, '<paragraph>foo bar[] baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>bar</marker>[] baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( backwardCommand.isEnabled ).to.be.false;
				} );

				it( 'should be false when the selection position is in a marker and there are no more markers', () => {
					_setModelData( model, '<paragraph>foo b[]ar baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>b[]ar</marker> baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( backwardCommand.isEnabled ).to.be.false;
				} );

				it( 'should be false when the selection position is at a marker start and there are no more markers', () => {
					_setModelData( model, '<paragraph>foo []bar baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo []<marker>bar</marker> baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( backwardCommand.isEnabled ).to.be.false;
				} );
			} );

			describe( 'expanded selection', () => {
				it( 'should be true when there is a marker before the first selection position if editor is read-write', () => {
					_setModelData( model, '<paragraph>foo bar b[az]</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>bar</marker> b[az]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( backwardCommand.isEnabled ).to.be.true;
				} );

				it( 'should be true when there is a marker before the first selection position if editor is read-only', () => {
					_setModelData( model, '<paragraph>foo bar b[az]</paragraph>' );
					editor.enableReadOnlyMode( 'unit-test' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>bar</marker> b[az]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( backwardCommand.isEnabled ).to.be.true;
				} );

				it( 'should be false when the selection overlaps the marker but the start position is after it', () => {
					_setModelData( model, '<paragraph>foo b[ar baz]</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>b[ar</marker> baz]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( backwardCommand.isEnabled ).to.be.false;
				} );

				it( 'should be false when the selection overlaps the marker but the after position is after it', () => {
					_setModelData( model, '<paragraph>[foo b]ar baz</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>[foo <marker>b]ar</marker> baz</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					expect( backwardCommand.isEnabled ).to.be.false;
				} );
			} );
		} );

		describe( 'execute()', () => {
			describe( 'collapsed selection', () => {
				it( 'should move to the previous marker', () => {
					_setModelData( model, '<paragraph>foo bar baz[]</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>bar</marker> baz[]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					// <paragraph>foo <marker>bar</marker> <marker>baz</marker>[]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:2', {
							range: writer.createRange( writer.createPositionAt( paragraph, 8 ), writer.createPositionAt( paragraph, 11 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					backwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo [bar] baz</paragraph>' );
				} );

				it( 'should move to the previous marker when at the beginning of adjacent one', () => {
					_setModelData( model, '<paragraph>foo</paragraph><paragraph>[]bar</paragraph>' );

					const fiirstParagraph = model.document.getRoot().getChild( 0 );
					const secondParagraph = model.document.getRoot().getChild( 1 );

					// <paragraph><marker>foo</marker></paragraph><paragraph>[]bar</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRangeIn( fiirstParagraph ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					// <paragraph><marker>foo</marker></paragraph><paragraph><marker>[]bar</marker></paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:2', {
							range: writer.createRangeIn( secondParagraph ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					backwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>[foo]</paragraph><paragraph>bar</paragraph>' );
				} );

				it( 'should move to the closest previous marker', () => {
					_setModelData( model, '<paragraph>foo bar baz qux[]</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>bar</marker> baz qux[]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					// <paragraph>foo <marker>bar</marker> <marker>baz</marker> qux[]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:2', {
							range: writer.createRange( writer.createPositionAt( paragraph, 8 ), writer.createPositionAt( paragraph, 11 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					backwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo bar [baz] qux</paragraph>' );

					backwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo [bar] baz qux</paragraph>' );
				} );

				it( 'should move to the closest previous marker when created in a reverse order', () => {
					_setModelData( model, '<paragraph>foo bar baz qux[]</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo bar <marker>baz</marker> qux[]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:2', {
							range: writer.createRange( writer.createPositionAt( paragraph, 8 ), writer.createPositionAt( paragraph, 11 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					// <paragraph>foo <marker>bar</marker> <marker>baz</marker> qux[]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					backwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo bar [baz] qux</paragraph>' );

					backwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo [bar] baz qux</paragraph>' );
				} );
			} );

			describe( 'expanded selection', () => {
				it( 'should move to the previous marker when the selection end overlaps the marker', () => {
					_setModelData( model, '<paragraph>foo bar b[az]</paragraph>' );

					const paragraph = model.document.getRoot().getChild( 0 );

					// <paragraph>foo <marker>bar</marker> b[az]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:1', {
							range: writer.createRange( writer.createPositionAt( paragraph, 4 ), writer.createPositionAt( paragraph, 7 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					// <paragraph>foo <marker>bar</marker> <marker>b[az</marker>]</paragraph>
					model.change( writer => {
						writer.addMarker( 'restrictedEditingException:2', {
							range: writer.createRange( writer.createPositionAt( paragraph, 8 ), writer.createPositionAt( paragraph, 11 ) ),
							usingOperation: true,
							affectsData: true
						} );
					} );

					backwardCommand.execute();
					expect( _getModelData( model ) ).to.equal( '<paragraph>foo [bar] baz</paragraph>' );
				} );
			} );
		} );
	} );
} );
