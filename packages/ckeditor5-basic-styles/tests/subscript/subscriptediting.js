/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { SubscriptEditing } from '../../src/subscript/subscriptediting.js';

import { VirtualTestEditor } from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor.js';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph/src/paragraph.js';
import { AttributeCommand } from '../../src/attributecommand.js';

import { _getModelData, _setModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model.js';
import { _getViewData } from '@ckeditor/ckeditor5-engine/src/dev-utils/view.js';

describe( 'SubscriptEditing', () => {
	let editor, model;

	beforeEach( () => {
		return VirtualTestEditor
			.create( {
				plugins: [ Paragraph, SubscriptEditing ]
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
		expect( SubscriptEditing.pluginName ).to.equal( 'SubscriptEditing' );
	} );

	it( 'should have `isOfficialPlugin` static flag set to `true`', () => {
		expect( SubscriptEditing.isOfficialPlugin ).to.be.true;
	} );

	it( 'should have `isPremiumPlugin` static flag set to `false`', () => {
		expect( SubscriptEditing.isPremiumPlugin ).to.be.false;
	} );

	it( 'should be loaded', () => {
		expect( editor.plugins.get( SubscriptEditing ) ).to.be.instanceOf( SubscriptEditing );
	} );

	it( 'should set proper schema rules', () => {
		expect( model.schema.checkAttribute( [ '$root', '$block', '$text' ], 'subscript' ) ).to.be.true;
		expect( model.schema.checkAttribute( [ '$clipboardHolder', '$text' ], 'subscript' ) ).to.be.true;
	} );

	it( 'should be marked with a formatting property', () => {
		expect( model.schema.getAttributeProperties( 'subscript' ) ).to.include( {
			isFormatting: true
		} );
	} );

	it( 'its attribute is marked with a copOnEnter property', () => {
		expect( model.schema.getAttributeProperties( 'subscript' ) ).to.include( {
			copyOnEnter: true
		} );
	} );

	describe( 'command', () => {
		it( 'should register subscript command', () => {
			const command = editor.commands.get( 'subscript' );

			expect( command ).to.be.instanceOf( AttributeCommand );
			expect( command ).to.have.property( 'attributeKey', 'subscript' );
		} );
	} );

	describe( 'data pipeline conversions', () => {
		it( 'should convert <sub> to sub attribute', () => {
			editor.setData( '<p><sub>foo</sub>bar</p>' );

			expect( _getModelData( model, { withoutSelection: true } ) )
				.to.equal( '<paragraph><$text subscript="true">foo</$text>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p><sub>foo</sub>bar</p>' );
		} );

		it( 'should convert vertical-align:sub to sub attribute', () => {
			editor.setData( '<p><span style="vertical-align: sub;">foo</span>bar</p>' );

			expect( _getModelData( model, { withoutSelection: true } ) )
				.to.equal( '<paragraph><$text subscript="true">foo</$text>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p><sub>foo</sub>bar</p>' );
		} );

		it( 'should be integrated with autoparagraphing', () => {
			editor.setData( '<sub>foo</sub>bar' );

			expect( _getModelData( model, { withoutSelection: true } ) )
				.to.equal( '<paragraph><$text subscript="true">foo</$text>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p><sub>foo</sub>bar</p>' );
		} );
	} );

	describe( 'editing pipeline conversion', () => {
		it( 'should convert attribute', () => {
			_setModelData( model, '<paragraph><$text subscript="true">foo</$text>bar</paragraph>' );

			expect( _getViewData( editor.editing.view, { withoutSelection: true } ) ).to.equal( '<p><sub>foo</sub>bar</p>' );
		} );
	} );
} );
