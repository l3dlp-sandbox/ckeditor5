/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { ViewTextProxy } from '../../src/view/textproxy.js';
import { ViewText } from '../../src/view/text.js';
import { ViewContainerElement } from '../../src/view/containerelement.js';
import { ViewDocumentFragment } from '../../src/view/documentfragment.js';
import { ViewRootEditableElement } from '../../src/view/rooteditableelement.js';

import { createViewDocumentMock } from '../../tests/view/_utils/createdocumentmock.js';
import { expectToThrowCKEditorError } from '@ckeditor/ckeditor5-utils/tests/_utils/utils.js';
import { ViewDocument } from '../../src/view/document.js';
import { StylesProcessor } from '../../src/view/stylesmap.js';

describe( 'TextProxy', () => {
	let text, parent, wrapper, textProxy, document;

	beforeEach( () => {
		document = new ViewDocument( new StylesProcessor() );
		text = new ViewText( document, 'abcdefgh' );
		parent = new ViewContainerElement( document, 'p', [], [ text ] );
		wrapper = new ViewContainerElement( document, 'div', [], parent );

		textProxy = new ViewTextProxy( text, 2, 3 );
	} );

	describe( 'constructor()', () => {
		it( 'should create ViewTextProxy instance with specified properties', () => {
			expect( textProxy ).to.have.property( 'parent' ).to.equal( parent );
			expect( textProxy ).to.have.property( 'data' ).to.equal( 'cde' );
			expect( textProxy ).to.have.property( 'textNode' ).to.equal( text );
			expect( textProxy ).to.have.property( 'offsetInText' ).to.equal( 2 );
		} );

		it( 'should have isPartial property', () => {
			const startTextProxy = new ViewTextProxy( text, 0, 4 );
			const fullTextProxy = new ViewTextProxy( text, 0, 8 );

			expect( textProxy.isPartial ).to.be.true;
			expect( startTextProxy.isPartial ).to.be.true;
			expect( fullTextProxy.isPartial ).to.be.false;
		} );

		it( 'should throw if wrong offsetInText is passed', () => {
			expectToThrowCKEditorError( () => {
				new ViewTextProxy( text, -1, 2 ); // eslint-disable-line no-new
			}, /view-textproxy-wrong-offsetintext/ );

			expectToThrowCKEditorError( () => {
				new ViewTextProxy( text, 9, 1 ); // eslint-disable-line no-new
			}, /view-textproxy-wrong-offsetintext/ );
		} );

		it( 'should throw if wrong length is passed', () => {
			expectToThrowCKEditorError( () => {
				new ViewTextProxy( text, 2, -1 ); // eslint-disable-line no-new
			}, /view-textproxy-wrong-length/ );

			expectToThrowCKEditorError( () => {
				new ViewTextProxy( text, 2, 9 ); // eslint-disable-line no-new
			}, /view-textproxy-wrong-length/ );
		} );
	} );

	describe( 'is()', () => {
		it( 'should return true for $textProxy', () => {
			expect( textProxy.is( '$textProxy' ) ).to.be.true;
			expect( textProxy.is( 'view:$textProxy' ) ).to.be.true;
			expect( textProxy.is( 'textProxy' ) ).to.be.true;
			expect( textProxy.is( 'view:textProxy' ) ).to.be.true;
		} );

		it( 'should return false for other accept values', () => {
			expect( textProxy.is( 'node' ) ).to.be.false;
			expect( textProxy.is( 'view:node' ) ).to.be.false;
			expect( textProxy.is( '$text' ) ).to.be.false;
			expect( textProxy.is( 'view:$text' ) ).to.be.false;
			expect( textProxy.is( 'element' ) ).to.be.false;
			expect( textProxy.is( 'containerElement' ) ).to.be.false;
			expect( textProxy.is( 'attributeElement' ) ).to.be.false;
			expect( textProxy.is( 'uiElement' ) ).to.be.false;
			expect( textProxy.is( 'emptyElement' ) ).to.be.false;
			expect( textProxy.is( 'rootElement' ) ).to.be.false;
			expect( textProxy.is( 'documentFragment' ) ).to.be.false;
			expect( textProxy.is( 'model:$textProxy' ) ).to.be.false;
		} );
	} );

	describe( 'offsetSize', () => {
		it( 'should be equal to the number of characters in text proxy', () => {
			expect( textProxy.offsetSize ).to.equal( 3 );
		} );
	} );

	describe( 'getDocument', () => {
		it( 'should return Document attached to the parent element', () => {
			const root = new ViewRootEditableElement( document, 'div' );

			wrapper.parent = root;

			expect( textProxy.document ).to.equal( document );
		} );

		it( 'should return Document if element is inside DocumentFragment', () => {
			new ViewDocumentFragment( document, [ wrapper ] ); // eslint-disable-line no-new

			expect( textProxy.document ).to.equal( document );
		} );
	} );

	describe( 'getRoot', () => {
		it( 'should return root element', () => {
			const docMock = createViewDocumentMock();
			const root = new ViewRootEditableElement( docMock, 'div' );

			wrapper.parent = root;

			expect( textProxy.root ).to.equal( root );
		} );
	} );

	describe( 'getAncestors', () => {
		it( 'should return array of ancestors', () => {
			const result = textProxy.getAncestors();

			expect( result ).to.be.an( 'array' );
			expect( result ).to.length( 2 );
			expect( result[ 0 ] ).to.equal( wrapper );
			expect( result[ 1 ] ).to.equal( parent );
		} );

		it( 'should return array of ancestors starting from parent `parentFirst`', () => {
			const result = textProxy.getAncestors( { parentFirst: true } );

			expect( result.length ).to.equal( 2 );
			expect( result[ 0 ] ).to.equal( parent );
			expect( result[ 1 ] ).to.equal( wrapper );
		} );

		it( 'should return array including node itself `includeSelf`', () => {
			const result = textProxy.getAncestors( { includeSelf: true } );

			expect( result ).to.be.an( 'array' );
			expect( result ).to.length( 3 );
			expect( result[ 0 ] ).to.equal( wrapper );
			expect( result[ 1 ] ).to.equal( parent );
			expect( result[ 2 ] ).to.equal( text );
		} );

		it( 'should return array of ancestors including node itself `includeSelf` starting from parent `parentFirst`', () => {
			const result = textProxy.getAncestors( { includeSelf: true, parentFirst: true } );

			expect( result.length ).to.equal( 3 );
			expect( result[ 0 ] ).to.equal( text );
			expect( result[ 1 ] ).to.equal( parent );
			expect( result[ 2 ] ).to.equal( wrapper );
		} );
	} );
} );
