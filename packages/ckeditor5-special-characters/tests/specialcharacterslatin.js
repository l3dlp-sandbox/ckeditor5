/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { ClassicTestEditor } from '@ckeditor/ckeditor5-core/tests/_utils/classictesteditor.js';
import { SpecialCharacters } from '../src/specialcharacters.js';
import { SpecialCharactersLatin } from '../src/specialcharacterslatin.js';
import { testUtils } from '@ckeditor/ckeditor5-core/tests/_utils/utils.js';

describe( 'SpecialCharactersLatin', () => {
	testUtils.createSinonSandbox();

	let editor, editorElement, addItemsSpy, addItemsFirstCallArgs;

	beforeEach( () => {
		editorElement = document.createElement( 'div' );

		addItemsSpy = sinon.spy( SpecialCharacters.prototype, 'addItems' );

		document.body.appendChild( editorElement );
		return ClassicTestEditor
			.create( editorElement, {
				plugins: [ SpecialCharacters, SpecialCharactersLatin ]
			} )
			.then( newEditor => {
				editor = newEditor;
				addItemsFirstCallArgs = addItemsSpy.args[ 0 ];
			} );
	} );

	afterEach( () => {
		addItemsSpy.restore();

		editorElement.remove();
		return editor.destroy();
	} );

	it( 'should have `isOfficialPlugin` static flag set to `true`', () => {
		expect( SpecialCharactersLatin.isOfficialPlugin ).to.be.true;
	} );

	it( 'should have `isPremiumPlugin` static flag set to `false`', () => {
		expect( SpecialCharactersLatin.isPremiumPlugin ).to.be.false;
	} );

	it( 'adds new items', () => {
		expect( addItemsSpy.callCount ).to.equal( 1 );
	} );

	it( 'properly names the category', () => {
		expect( addItemsFirstCallArgs[ 0 ] ).to.equal( 'Latin' );
	} );

	it( 'defines a label displayed in the toolbar', () => {
		expect( addItemsFirstCallArgs[ 2 ] ).to.deep.equal( {
			label: 'Latin'
		} );
	} );

	it( 'adds proper characters', () => {
		expect( addItemsFirstCallArgs[ 1 ] ).to.deep.include( {
			character: 'Ō',
			title: 'Latin capital letter o with macron'
		} );

		expect( addItemsFirstCallArgs[ 1 ] ).to.deep.include( {
			character: 'Ō',
			title: 'Latin capital letter o with macron'
		} );
	} );
} );
