/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { SuperscriptEditing } from '../../src/superscript/superscriptediting.js';

import { VirtualTestEditor } from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor.js';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph/src/paragraph.js';
import { AttributeCommand } from '../../src/attributecommand.js';

import { _getModelData, _setModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model.js';
import { _getViewData } from '@ckeditor/ckeditor5-engine/src/dev-utils/view.js';

describe( 'SuperscriptEditing', () => {
	let editor, model;

	beforeEach( () => {
		return VirtualTestEditor
			.create( {
				plugins: [ Paragraph, SuperscriptEditing ]
			} )
			.then( newEditor => {
				editor = newEditor;
				model = editor.model;
			} );
	} );

	afterEach( () => {
		return editor.destroy();
	} );

	it( 'should have pluginName', () => {
		expect( SuperscriptEditing.pluginName ).to.equal( 'SuperscriptEditing' );
	} );

	it( 'should have `isOfficialPlugin` static flag set to `true`', () => {
		expect( SuperscriptEditing.isOfficialPlugin ).to.be.true;
	} );

	it( 'should have `isPremiumPlugin` static flag set to `false`', () => {
		expect( SuperscriptEditing.isPremiumPlugin ).to.be.false;
	} );

	it( 'should be loaded', () => {
		expect( editor.plugins.get( SuperscriptEditing ) ).to.be.instanceOf( SuperscriptEditing );
	} );

	it( 'should set proper schema rules', () => {
		expect( model.schema.checkAttribute( [ '$root', '$block', '$text' ], 'superscript' ) ).to.be.true;
		expect( model.schema.checkAttribute( [ '$clipboardHolder', '$text' ], 'superscript' ) ).to.be.true;
	} );

	it( 'should be marked with a formatting property', () => {
		expect( model.schema.getAttributeProperties( 'superscript' ) ).to.include( {
			isFormatting: true
		} );
	} );

	it( 'its attribute is marked with a copOnEnter property', () => {
		expect( model.schema.getAttributeProperties( 'superscript' ) ).to.include( {
			copyOnEnter: true
		} );
	} );

	describe( 'command', () => {
		it( 'should register superscript command', () => {
			const command = editor.commands.get( 'superscript' );

			expect( command ).to.be.instanceOf( AttributeCommand );
			expect( command ).to.have.property( 'attributeKey', 'superscript' );
		} );
	} );

	describe( 'data pipeline conversions', () => {
		it( 'should convert <sup> to superscript attribute', () => {
			editor.setData( '<p><sup>foo</sup>bar</p>' );

			expect( _getModelData( model, { withoutSelection: true } ) )
				.to.equal( '<paragraph><$text superscript="true">foo</$text>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p><sup>foo</sup>bar</p>' );
		} );

		it( 'should convert vertical-align:super to super attribute', () => {
			editor.setData( '<p><span style="vertical-align: super;">foo</span>bar</p>' );

			expect( _getModelData( model, { withoutSelection: true } ) )
				.to.equal( '<paragraph><$text superscript="true">foo</$text>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p><sup>foo</sup>bar</p>' );
		} );

		it( 'should be integrated with autoparagraphing', () => {
			editor.setData( '<sup>foo</sup>bar' );

			expect( _getModelData( model, { withoutSelection: true } ) )
				.to.equal( '<paragraph><$text superscript="true">foo</$text>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p><sup>foo</sup>bar</p>' );
		} );
	} );

	describe( 'editing pipeline conversion', () => {
		it( 'should convert attribute', () => {
			_setModelData( model, '<paragraph><$text superscript="true">foo</$text>bar</paragraph>' );

			expect( _getViewData( editor.editing.view, { withoutSelection: true } ) ).to.equal( '<p><sup>foo</sup>bar</p>' );
		} );
	} );
} );
