/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { testUtils } from '@ckeditor/ckeditor5-core/tests/_utils/utils.js';

import { ViewRange } from '../../../src/view/range.js';
import { ViewDocumentSelection } from '../../../src/view/documentselection.js';
import { ViewSelection } from '../../../src/view/selection.js';
import { EditingView } from '../../../src/view/view.js';
import { SelectionObserver } from '../../../src/view/observer/selectionobserver.js';
import { FocusObserver } from '../../../src/view/observer/focusobserver.js';
import { MutationObserver } from '../../../src/view/observer/mutationobserver.js';
import { createViewRoot } from '../_utils/createroot.js';
import { _parseView } from '../../../src/dev-utils/view.js';
import { StylesProcessor } from '../../../src/view/stylesmap.js';
import { env } from '@ckeditor/ckeditor5-utils/src/env.js';
import { priorities } from '@ckeditor/ckeditor5-utils';

describe( 'SelectionObserver', () => {
	let view, viewDocument, viewRoot, selectionObserver, domRoot, domMain, domDocument;

	testUtils.createSinonSandbox();

	beforeEach( done => {
		domDocument = document;
		domRoot = domDocument.createElement( 'div' );
		domRoot.innerHTML = '<div contenteditable="true"></div><div contenteditable="true" id="additional"></div>';
		domMain = domRoot.childNodes[ 0 ];
		domDocument.body.appendChild( domRoot );
		view = new EditingView( new StylesProcessor() );
		viewDocument = view.document;
		createViewRoot( viewDocument );
		view.attachDomRoot( domMain );

		selectionObserver = view.getObserver( SelectionObserver );

		viewRoot = viewDocument.getRoot();

		view.change( writer => {
			viewRoot._appendChild( _parseView(
				'<container:p>xxx<ui:span></ui:span></container:p>' +
				'<container:p>yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy</container:p>' ) );

			writer.setSelection( null );
			domDocument.getSelection().removeAllRanges();

			viewDocument.isFocused = true;

			domMain.focus();

			viewDocument._isFocusChanging = false;
		} );

		selectionObserver.enable();

		// Ensure selectionchange will not be fired.
		setTimeout( () => done(), 100 );
	} );

	afterEach( () => {
		sinon.restore();
		domRoot.parentElement.removeChild( domRoot );

		view.destroy();
	} );

	it( 'should fire selectionChange when it is the only change', done => {
		viewDocument.on( 'selectionChange', ( evt, data ) => {
			expect( data ).to.have.property( 'domSelection' ).that.equals( domDocument.getSelection() );

			expect( data ).to.have.property( 'oldSelection' ).that.is.instanceof( ViewDocumentSelection );
			expect( data.oldSelection.rangeCount ).to.equal( 0 );

			expect( data ).to.have.property( 'newSelection' ).that.is.instanceof( ViewSelection );
			expect( data.newSelection.rangeCount ).to.equal( 1 );

			const newViewRange = data.newSelection.getFirstRange();
			const viewFoo = viewDocument.getRoot().getChild( 1 ).getChild( 0 );

			expect( newViewRange.start.parent ).to.equal( viewFoo );
			expect( newViewRange.start.offset ).to.equal( 2 );
			expect( newViewRange.end.parent ).to.equal( viewFoo );
			expect( newViewRange.end.offset ).to.equal( 2 );

			done();
		} );

		changeDomSelection();
	} );

	it( 'should call focusObserver#flush when selection is changed', done => {
		const flushSpy = testUtils.sinon.spy( selectionObserver.focusObserver, 'flush' );

		viewDocument.on( 'selectionChange', () => {
			sinon.assert.calledOnce( flushSpy );

			done();
		} );

		changeDomSelection();
	} );

	// See https://github.com/ckeditor/ckeditor5/issues/14569.
	it( 'should call focusObserver#flush when selection is in the editable but not changed', () => {
		// Set DOM selection.
		changeDomSelection();

		// Update view selection to match DOM selection.
		const domSelection = domDocument.getSelection();
		const viewPosition = view.domConverter.domPositionToView( domSelection.focusNode, domSelection.focusOffset );

		view.change( writer => writer.setSelection( viewPosition ) );

		const flushSpy = testUtils.sinon.spy( selectionObserver.focusObserver, 'flush' );

		// Fire selection change without actually moving selection.
		domDocument.dispatchEvent( new Event( 'selectionchange' ) );

		sinon.assert.calledOnce( flushSpy );
	} );

	it( 'should not fire selectionChange while editable is not focused', done => {
		viewDocument.on( 'selectionChange', () => {
			throw new Error( 'selectionChange fired while editable is not focused' );
		} );

		viewDocument.isFocused = false;
		changeDomSelection();

		setTimeout( done, 100 );
	} );

	it( 'should fire selectionChange after editor is focused and there were pending selection changes', done => {
		viewDocument.on( 'selectionChange', () => done() );

		viewDocument.isFocused = false;
		changeDomSelection();

		setTimeout( () => {
			viewDocument.isFocused = true;
		}, 100 );
	} );

	// See https://github.com/ckeditor/ckeditor5/issues/18514.
	it( 'should fire selectionChange while editable is not focused but the editor is in read-only mode', done => {
		const spy = sinon.spy();

		viewDocument.on( 'selectionChange', spy );

		viewDocument.isReadOnly = true;
		viewDocument.isFocused = false;
		changeDomSelection();

		setTimeout( () => {
			expect( spy.calledOnce ).to.be.true;
			done();
		}, 100 );
	} );

	it( 'should not fire selectionChange while user is composing', done => {
		viewDocument.on( 'selectionChange', () => {
			throw new Error( 'selectionChange fired while composing' );
		} );

		viewDocument.isComposing = true;
		changeDomSelection();

		setTimeout( done, 100 );
	} );

	it( 'should fire selectionChange while user is composing on Android', done => {
		testUtils.sinon.stub( env, 'isAndroid' ).value( true );

		viewDocument.isComposing = true;

		viewDocument.on( 'selectionChange', ( evt, data ) => {
			expect( data ).to.have.property( 'domSelection' ).that.equals( domDocument.getSelection() );

			expect( data ).to.have.property( 'oldSelection' ).that.is.instanceof( ViewDocumentSelection );
			expect( data.oldSelection.rangeCount ).to.equal( 0 );

			expect( data ).to.have.property( 'newSelection' ).that.is.instanceof( ViewSelection );
			expect( data.newSelection.rangeCount ).to.equal( 1 );

			const newViewRange = data.newSelection.getFirstRange();
			const viewFoo = viewDocument.getRoot().getChild( 1 ).getChild( 0 );

			expect( newViewRange.start.parent ).to.equal( viewFoo );
			expect( newViewRange.start.offset ).to.equal( 2 );
			expect( newViewRange.end.parent ).to.equal( viewFoo );
			expect( newViewRange.end.offset ).to.equal( 2 );

			done();
		} );

		changeDomSelection();
	} );

	it( 'should detect "restricted objects" in Firefox DOM ranges and prevent an error being thrown', () => {
		testUtils.sinon.stub( env, 'isGecko' ).value( true );

		changeDomSelection();
		domDocument.dispatchEvent( new Event( 'selectionchange' ) );

		expect( view.hasDomSelection ).to.be.true;

		const domFoo = domDocument.getSelection().anchorNode;

		sinon.stub( domFoo, Symbol.toStringTag ).get( () => {
			throw new Error( 'Permission denied to access property Symbol.toStringTag' );
		} );

		domDocument.dispatchEvent( new Event( 'selectionchange' ) );

		expect( view.hasDomSelection ).to.be.false;
	} );

	it( 'should add only one #selectionChange listener to one document', done => {
		// Add second roots to ensure that listener is added once.
		createViewRoot( viewDocument, 'div', 'additional' );
		view.attachDomRoot( domDocument.getElementById( 'additional' ), 'additional' );

		viewDocument.on( 'selectionChange', () => {
			done();
		} );

		changeDomSelection();
	} );

	it( 'should fire selectionChange synchronously on composition start event (at lowest priority)', () => {
		let eventCount = 0;
		let priorityCheck = 0;

		viewDocument.on( 'selectionChange', ( evt, data ) => {
			expect( data ).to.have.property( 'domSelection' ).that.equals( domDocument.getSelection() );

			expect( data ).to.have.property( 'oldSelection' ).that.is.instanceof( ViewDocumentSelection );
			expect( data.oldSelection.rangeCount ).to.equal( 0 );

			expect( data ).to.have.property( 'newSelection' ).that.is.instanceof( ViewSelection );
			expect( data.newSelection.rangeCount ).to.equal( 1 );

			const newViewRange = data.newSelection.getFirstRange();
			const viewFoo = viewDocument.getRoot().getChild( 1 ).getChild( 0 );

			expect( newViewRange.start.parent ).to.equal( viewFoo );
			expect( newViewRange.start.offset ).to.equal( 2 );
			expect( newViewRange.end.parent ).to.equal( viewFoo );
			expect( newViewRange.end.offset ).to.equal( 2 );

			expect( priorityCheck ).to.equal( 1 );

			eventCount++;
		} );

		viewDocument.on( 'compositionstart', () => {
			priorityCheck++;
		}, { priority: priorities.lowest + 1 } );

		viewDocument.on( 'compositionstart', () => {
			priorityCheck++;
		}, { priority: priorities.lowest - 1 } );

		changeDomSelection();

		viewDocument.fire( 'compositionstart' );

		expect( eventCount ).to.equal( 1 );
		expect( priorityCheck ).to.equal( 2 );
	} );

	it( 'should not fire selectionChange for ignored target', done => {
		viewDocument.on( 'selectionChange', () => {
			throw new Error( 'selectionChange fired in ignored elements' );
		} );

		view.getObserver( MutationObserver ).disable();
		domMain.childNodes[ 1 ].setAttribute( 'data-cke-ignore-events', 'true' );

		changeDomSelection();

		setTimeout( done, 100 );
	} );

	it( 'should not fire selectionChange on render', done => {
		viewDocument.on( 'selectionChange', () => {
			throw new Error( 'selectionChange on render' );
		} );

		setTimeout( done, 70 );

		const viewBar = viewDocument.getRoot().getChild( 1 ).getChild( 0 );

		view.change( writer => {
			writer.setSelection( ViewRange._createFromParentsAndOffsets( viewBar, 1, viewBar, 2 ) );
		} );
	} );

	it( 'should not fire if observer is disabled', done => {
		view.getObserver( SelectionObserver ).disable();

		viewDocument.on( 'selectionChange', () => {
			throw new Error( 'selectionChange on render' );
		} );

		setTimeout( done, 70 );

		changeDomSelection();
	} );

	it( 'should not fire if the DOM selection was set outside editable', done => {
		const viewFoo = viewDocument.getRoot().getChild( 0 ).getChild( 0 );

		view.change( writer => {
			writer.setSelection( viewFoo, 0 );
		} );

		const spy = sinon.spy();

		viewDocument.on( 'selectionChange', spy );

		setTimeout( () => {
			expect( spy.called ).to.be.false;

			done();
		}, 70 );

		const domSelection = domDocument.getSelection();
		const editable = domRoot.childNodes[ 1 ];
		editable.focus();

		domSelection.collapse( editable, 0 );
	} );

	it( 'should not enter infinite loop', () => {
		const viewFoo = viewDocument.getRoot().getChild( 0 ).getChild( 0 );
		view.change( writer => {
			writer.setSelection( viewFoo, 0 );
		} );

		let wasInfiniteLoopDetected = false;
		sinon.stub( selectionObserver, '_reportInfiniteLoop' ).callsFake( () => {
			wasInfiniteLoopDetected = true;
		} );
		const selectionChangeSpy = sinon.spy();

		selectionObserver._clearInfiniteLoop();
		viewDocument.on( 'selectionChange', selectionChangeSpy );

		let counter = 70;

		const simulateSelectionChanges = () => {
			if ( !counter ) {
				return;
			}

			changeDomSelection();
			counter--;

			setTimeout( simulateSelectionChanges, 10 );
		};

		return new Promise( resolve => {
			viewDocument.on( 'selectionChangeDone', () => {
				expect( wasInfiniteLoopDetected ).to.be.true;
				expect( selectionChangeSpy.callCount ).to.equal( 60 );

				counter = 0;
				resolve();
			} );

			simulateSelectionChanges();
		} );
	} );

	it.skip( 'SelectionObserver#_reportInfiniteLoop() should throw an error', () => {
		expect( () => {
			selectionObserver._reportInfiniteLoop();
		} ).to.throw( Error,
			'Selection change observer detected an infinite rendering loop.\n\n' +
			'⚠️⚠️ Report this error on https://github.com/ckeditor/ckeditor5/issues/11658.'
		);
	} );

	it( 'should not be treated as an infinite loop if selection is changed only few times', done => {
		const viewFoo = viewDocument.getRoot().getChild( 0 ).getChild( 0 );
		viewDocument.selection._setTo( ViewRange._createFromParentsAndOffsets( viewFoo, 0, viewFoo, 0 ) );
		const consoleWarnSpy = sinon.spy( console, 'warn' );

		viewDocument.on( 'selectionChangeDone', () => {
			expect( consoleWarnSpy.called ).to.be.false;
			done();
		} );

		for ( let i = 0; i < 10; i++ ) {
			changeDomSelection();
		}
	} );

	it( 'should not be treated as an infinite loop if changes are not often', () => {
		const clock = sinon.useFakeTimers( {
			toFake: [ 'setInterval', 'clearInterval' ]
		} );
		const consoleWarnStub = sinon.stub( console, 'warn' );

		// We need to recreate SelectionObserver, so it will use mocked setInterval.
		selectionObserver.disable();
		selectionObserver.destroy();
		view._observers.delete( SelectionObserver );
		view.addObserver( SelectionObserver );

		return doChanges()
			.then( doChanges )
			.then( () => {
				sinon.assert.notCalled( consoleWarnStub );
				clock.restore();
			} );

		function doChanges() {
			return new Promise( resolve => {
				viewDocument.once( 'selectionChangeDone', () => {
					clock.tick( 1100 );
					resolve();
				} );

				for ( let i = 0; i < 50; i++ ) {
					changeDomSelection();
				}
			} );
		}
	} );

	it( 'should fire `selectionChangeDone` event after selection stop changing', done => {
		const spy = sinon.spy();

		viewDocument.on( 'selectionChangeDone', spy );

		// Disable focus observer to not re-render view on each focus.
		view.getObserver( FocusObserver ).disable();

		// Change selection.
		changeDomSelection();

		// Wait 100ms.
		setTimeout( () => {
			// Check if spy was called.
			expect( spy.notCalled ).to.true;

			// Change selection one more time.
			changeDomSelection();

			// Wait 210ms (debounced function should be called).
			setTimeout( () => {
				const data = spy.firstCall.args[ 1 ];

				expect( spy.calledOnce ).to.true;
				expect( data ).to.have.property( 'domSelection' ).to.equal( domDocument.getSelection() );

				expect( data ).to.have.property( 'oldSelection' ).to.instanceof( ViewDocumentSelection );
				expect( data.oldSelection.rangeCount ).to.equal( 0 );

				expect( data ).to.have.property( 'newSelection' ).to.instanceof( ViewSelection );
				expect( data.newSelection.rangeCount ).to.equal( 1 );

				const newViewRange = data.newSelection.getFirstRange();
				const viewFoo = viewDocument.getRoot().getChild( 1 ).getChild( 0 );

				expect( newViewRange.start.parent ).to.equal( viewFoo );
				expect( newViewRange.start.offset ).to.equal( 3 );
				expect( newViewRange.end.parent ).to.equal( viewFoo );
				expect( newViewRange.end.offset ).to.equal( 3 );

				done();
			}, 210 );
		}, 100 );
	} );

	it( 'should not fire `selectionChangeDone` event when observer will be destroyed', done => {
		const spy = sinon.spy();

		viewDocument.on( 'selectionChangeDone', spy );

		// Change selection.
		changeDomSelection();

		// Wait 100ms.
		setTimeout( () => {
			// And destroy observer.
			selectionObserver.destroy();

			// Wait another 110ms.
			setTimeout( () => {
				// Check that event won't be called.
				expect( spy.notCalled ).to.true;

				done();
			}, 110 );
		}, 100 );
	} );

	it( 'should re-render view if selections are similar if DOM selection is in incorrect place', done => {
		const sel = domDocument.getSelection();
		const domParagraph = domMain.childNodes[ 0 ];
		const domText = domParagraph.childNodes[ 0 ];
		const domUI = domParagraph.childNodes[ 1 ];
		const viewRenderSpy = sinon.spy();

		// Add rendering on selectionChange event to check this feature.
		viewDocument.on( 'selectionChange', () => {
			// Manually set selection because no handlers are set for selectionChange event in this test.
			// Normally this is handled by view -> model -> view selection converters chain.
			const viewAnchor = view.domConverter.domPositionToView( sel.anchorNode, sel.anchorOffset );
			const viewFocus = view.domConverter.domPositionToView( sel.focusNode, sel.focusOffset );

			view.change( writer => {
				writer.setSelection( viewAnchor );
				writer.setSelectionFocus( viewFocus );
			} );
		} );

		viewDocument.once( 'selectionChange', () => {
			// 2. Selection change has been handled.

			selectionObserver.listenTo( domDocument, 'selectionchange', () => {
				// 4. Check if view was re-rendered.
				sinon.assert.calledOnce( viewRenderSpy );

				done();
			}, { priority: 'lowest' } );

			// 3. Now, collapse selection in similar position, but in UI element.
			// Current and new selection position are similar in view (but not equal!).
			// Also add a spy to `viewDocument#render` to see if view will be re-rendered.
			sel.collapse( domUI, 0 );
			view.on( 'render', viewRenderSpy );

			// Some browsers like Safari won't allow to put selection inside empty ui element.
			// In that situation selection should stay in correct place.
			if ( sel.anchorNode !== domUI ) {
				expect( sel.anchorNode ).to.equal( domText );
				expect( sel.anchorOffset ).to.equal( 3 );
				expect( sel.isCollapsed ).to.be.true;

				done();
			}
		}, { priority: 'lowest' } );

		// 1. Collapse in a text node, before ui element, and wait for async selectionchange to fire selection change handling.
		sel.collapse( domText, 3 );
	} );

	describe( 'stopListening()', () => {
		it( 'should not fire selectionChange after stopped observing a DOM element', () => {
			const spy = sinon.spy();

			viewDocument.on( 'selectionChange', spy );

			selectionObserver.stopListening( domMain );

			changeDomSelection();

			expect( spy.called ).to.be.false;
		} );
	} );

	describe( 'Management of view Document#isSelecting', () => {
		it( 'should not set #isSelecting to true upon the "selectstart" event outside the DOM root', () => {
			const selectStartChangedSpy = sinon.spy();

			expect( viewDocument.isSelecting ).to.be.false;

			// Make sure isSelecting was already updated by the listener with the highest priority.
			// Note: The listener in SelectionObserver has the same priority but was attached first.
			selectionObserver.listenTo( domMain, 'selectstart', selectStartChangedSpy, { priority: 'highest' } );

			// The event was fired somewhere else in DOM.
			domDocument.dispatchEvent( new Event( 'selectstart' ) );

			expect( viewDocument.isSelecting ).to.be.false;
			sinon.assert.notCalled( selectStartChangedSpy );
		} );

		it( 'should set #isSelecting to true upon the "selectstart" event', () => {
			expect( viewDocument.isSelecting ).to.be.false;

			// Make sure isSelecting was already updated by the listener with the highest priority.
			// Note: The listener in SelectionObserver has the same priority but was attached first.
			selectionObserver.listenTo( domMain, 'selectstart', () => {
				expect( viewDocument.isSelecting ).to.be.true;
			}, { priority: 'highest' } );

			domMain.dispatchEvent( new Event( 'selectstart' ) );

			expect( viewDocument.isSelecting ).to.be.true;
		} );

		it( 'should set #isSelecting to false upon the "mouseup" event', () => {
			viewDocument.isSelecting = true;

			// Make sure isSelecting was already updated by the listener with the highest priority.
			// Note: The listener in SelectionObserver has the same priority but was attached first.
			selectionObserver.listenTo( domDocument, 'mouseup', () => {
				expect( viewDocument.isSelecting ).to.be.false;
			}, { priority: 'highest', useCapture: true } );

			domDocument.dispatchEvent( new Event( 'mouseup' ) );

			expect( viewDocument.isSelecting ).to.be.false;
		} );

		it( 'should fire selectionChange event upon the "mouseup" event (if DOM selection differs from view selection', done => {
			// Disable DOM selectionchange event to make sure that mouseup triggered view event.
			selectionObserver.listenTo( domDocument, 'selectionchange', evt => {
				evt.stop();
			}, { priority: 'highest' } );

			viewDocument.on( 'selectionChange', ( evt, data ) => {
				expect( data ).to.have.property( 'domSelection' ).that.equals( domDocument.getSelection() );

				expect( data ).to.have.property( 'oldSelection' ).that.is.instanceof( ViewDocumentSelection );
				expect( data.oldSelection.rangeCount ).to.equal( 0 );

				expect( data ).to.have.property( 'newSelection' ).that.is.instanceof( ViewSelection );
				expect( data.newSelection.rangeCount ).to.equal( 1 );

				const newViewRange = data.newSelection.getFirstRange();
				const viewFoo = viewDocument.getRoot().getChild( 1 ).getChild( 0 );

				expect( newViewRange.start.parent ).to.equal( viewFoo );
				expect( newViewRange.start.offset ).to.equal( 2 );
				expect( newViewRange.end.parent ).to.equal( viewFoo );
				expect( newViewRange.end.offset ).to.equal( 2 );

				// Make sure that selectionChange event was triggered before the isSelecting flag reset
				// so that model and view selection could get updated before isSelecting is reset
				// and renderer updates the DOM selection.
				expect( viewDocument.isSelecting ).to.be.true;

				done();
			} );

			viewDocument.isSelecting = true;

			changeDomSelection();
			domDocument.dispatchEvent( new Event( 'mouseup' ) );

			expect( viewDocument.isSelecting ).to.be.false;
		} );

		it( 'should not fire selectionChange event upon the "mouseup" event if it was not selecting', done => {
			// Disable DOM selectionchange event to make sure that mouseup triggered view event.
			selectionObserver.listenTo( domDocument, 'selectionchange', evt => {
				evt.stop();
			}, { priority: 'highest' } );

			viewDocument.on( 'selectionChange', () => {
				throw new Error( 'selectionChange fired' );
			} );

			viewDocument.isSelecting = false;

			changeDomSelection();
			domDocument.dispatchEvent( new Event( 'mouseup' ) );

			setTimeout( done, 100 );
		} );

		it( 'should set #isSelecting to false upon the "mouseup" event only once (editor with multiple roots)', () => {
			const isSelectingSetSpy = sinon.spy();

			createViewRoot( viewDocument, 'div', 'additional' );
			view.attachDomRoot( domDocument.getElementById( 'additional' ), 'additional' );

			viewDocument.isSelecting = true;

			viewDocument.on( 'set:isSelecting', isSelectingSetSpy );

			domDocument.dispatchEvent( new Event( 'mouseup' ) );
			expect( viewDocument.isSelecting ).to.be.false;
			sinon.assert.calledOnce( isSelectingSetSpy );
		} );

		it( 'should not set #isSelecting to false upon the "keydown" event outside the DOM root', () => {
			const keydownSpy = sinon.spy();

			viewDocument.isSelecting = true;

			// Make sure isSelecting was already updated by the listener with the highest priority.
			// Note: The listener in SelectionObserver has the same priority but was attached first.
			selectionObserver.listenTo( domMain, 'keydown', () => keydownSpy, { priority: 'highest' } );

			domMain.dispatchEvent( new Event( 'keydown' ) );

			expect( viewDocument.isSelecting ).to.be.false;
			sinon.assert.notCalled( keydownSpy );
		} );

		it( 'should set #isSelecting to false upon the "keydown" event', () => {
			viewDocument.isSelecting = true;

			// Make sure isSelecting was already updated by the listener with the highest priority.
			// Note: The listener in SelectionObserver has the same priority but was attached first.
			selectionObserver.listenTo( domMain, 'keydown', () => {
				expect( viewDocument.isSelecting ).to.be.false;
			}, { priority: 'highest', useCapture: true } );

			domMain.dispatchEvent( new Event( 'keydown' ) );

			expect( viewDocument.isSelecting ).to.be.false;
		} );

		it( 'should not set #isSelecting to false upon the "keyup" event outside the DOM root', () => {
			const keyupSpy = sinon.spy();

			viewDocument.isSelecting = true;

			// Make sure isSelecting was already updated by the listener with the highest priority.
			// Note: The listener in SelectionObserver has the same priority but was attached first.
			selectionObserver.listenTo( domMain, 'keyup', () => keyupSpy, { priority: 'highest' } );

			domMain.dispatchEvent( new Event( 'keyup' ) );

			expect( viewDocument.isSelecting ).to.be.false;
			sinon.assert.notCalled( keyupSpy );
		} );

		it( 'should set #isSelecting to false upon the "keyup" event', () => {
			viewDocument.isSelecting = true;

			// Make sure isSelecting was already updated by the listener with the highest priority.
			// Note: The listener in SelectionObserver has the same priority but was attached first.
			selectionObserver.listenTo( domMain, 'keyup', () => {
				expect( viewDocument.isSelecting ).to.be.false;
			}, { priority: 'highest', useCapture: true } );

			domMain.dispatchEvent( new Event( 'keyup' ) );

			expect( viewDocument.isSelecting ).to.be.false;
		} );

		describe( 'isSelecting restoring after a timeout', () => {
			let clock;

			beforeEach( () => {
				clock = testUtils.sinon.useFakeTimers();

				// We need to recreate SelectionObserver, so it will use mocked setTimeout.
				selectionObserver.disable();
				selectionObserver.destroy();
				view._observers.delete( SelectionObserver );
				view.addObserver( SelectionObserver );
			} );

			afterEach( () => {
				clock.restore();
			} );

			it( 'should set #isSelecting to false after 5000ms since the selectstart event', done => {
				expect( viewDocument.isSelecting ).to.be.false;

				domMain.dispatchEvent( new Event( 'selectstart' ) );

				expect( viewDocument.isSelecting ).to.be.true;

				setTimeout( () => {
					expect( viewDocument.isSelecting ).to.be.true;
				}, 4500 );

				setTimeout( () => {
					expect( viewDocument.isSelecting ).to.be.false;
					done();
				}, 5500 );

				clock.tick( 6000 );
			} );

			it( 'should postpone setting #isSelecting to false after 5000ms if "selectionchange" fired in the meantime', done => {
				expect( viewDocument.isSelecting ).to.be.false;

				domMain.dispatchEvent( new Event( 'selectstart' ) );

				expect( viewDocument.isSelecting ).to.be.true;

				setTimeout( () => {
					expect( viewDocument.isSelecting ).to.be.true;

					// This will postpone the timeout by another 5000ms.
					domDocument.dispatchEvent( new Event( 'selectionchange' ) );
				}, 2500 );

				setTimeout( () => {
					// It would normally be false by now if not for the selectionchange event that was fired.
					expect( viewDocument.isSelecting ).to.be.true;
				}, 5500 );

				setTimeout( () => {
					expect( viewDocument.isSelecting ).to.be.false;
					done();
				}, 8000 );

				clock.tick( 8000 );
			} );

			it( 'should cancel the 5000s timeout if the observer is destroyed', () => {
				const spy = sinon.spy( selectionObserver._documentIsSelectingInactivityTimeoutDebounced, 'cancel' );

				selectionObserver.destroy();

				sinon.assert.calledOnce( spy );
			} );
		} );
	} );

	function changeDomSelection() {
		const domSelection = domDocument.getSelection();
		const domFoo = domMain.childNodes[ 1 ].childNodes[ 0 ];
		const offset = domSelection.anchorOffset;

		domSelection.collapse( domFoo, offset == 2 ? 3 : 2 );
	}
} );
