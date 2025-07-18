/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { ClickObserver } from '../../../src/view/observer/clickobserver.js';
import { EditingView } from '../../../src/view/view.js';
import { StylesProcessor } from '../../../src/view/stylesmap.js';

describe( 'ClickObserver', () => {
	let view, viewDocument, observer;

	beforeEach( () => {
		view = new EditingView( new StylesProcessor() );
		viewDocument = view.document;
		observer = view.addObserver( ClickObserver );
	} );

	afterEach( () => {
		view.destroy();
	} );

	it( 'should define domEventType', () => {
		expect( observer.domEventType ).to.equal( 'click' );
	} );

	describe( 'onDomEvent', () => {
		it( 'should fire click with the right event data', () => {
			const spy = sinon.spy();

			viewDocument.on( 'click', spy );

			observer.onDomEvent( { type: 'click', target: document.body } );

			expect( spy.calledOnce ).to.be.true;

			const data = spy.args[ 0 ][ 1 ];
			expect( data.domTarget ).to.equal( document.body );
		} );
	} );
} );
