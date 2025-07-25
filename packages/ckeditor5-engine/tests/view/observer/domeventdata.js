/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { ViewDocumentDomEventData } from '../../../src/view/observer/domeventdata.js';
import { EditingView } from '../../../src/view/view.js';
import { StylesProcessor } from '../../../src/view/stylesmap.js';

describe( 'ViewDocumentDomEventData', () => {
	let view, viewDocument, viewBody, domRoot;

	beforeEach( () => {
		view = new EditingView( new StylesProcessor() );
		viewDocument = view.document;

		domRoot = document.createElement( 'div' );
		domRoot.innerHTML = '<div contenteditable="true" id="main"></div><div contenteditable="true" id="additional"></div>';
		document.body.appendChild( domRoot );

		viewBody = view.domConverter.domToView( document.body, { bind: true } );
	} );

	afterEach( () => {
		domRoot.parentElement.removeChild( domRoot );
		view.destroy();
	} );

	describe( 'constructor()', () => {
		it( 'sets properties', () => {
			const domEvt = { target: document.body };
			const data = new ViewDocumentDomEventData( view, domEvt, { foo: 1, bar: true } );

			expect( data ).to.have.property( 'view', view );
			expect( data ).to.have.property( 'document', viewDocument );
			expect( data ).to.have.property( 'domEvent', domEvt );
			expect( data ).to.have.property( 'domTarget', document.body );

			expect( data ).to.have.property( 'foo', 1 );
			expect( data ).to.have.property( 'bar', true );
		} );
	} );

	describe( 'target', () => {
		it( 'returns bound element', () => {
			const domEvt = { target: document.body };
			const data = new ViewDocumentDomEventData( view, domEvt );

			expect( data ).to.have.property( 'target', viewBody );
		} );
	} );

	describe( 'preventDefault', () => {
		it( 'executes native preventDefault()', () => {
			const domEvt = { target: document.body, preventDefault: sinon.spy() };
			const data = new ViewDocumentDomEventData( viewDocument, domEvt );

			data.preventDefault();

			expect( domEvt.preventDefault.calledOnce ).to.be.true;
		} );
	} );

	describe( 'stopPropagation', () => {
		it( 'executes native stopPropagation()', () => {
			const domEvt = { target: document.body, stopPropagation: sinon.spy() };
			const data = new ViewDocumentDomEventData( viewDocument, domEvt );

			data.stopPropagation();

			expect( domEvt.stopPropagation.calledOnce ).to.be.true;
		} );
	} );
} );
