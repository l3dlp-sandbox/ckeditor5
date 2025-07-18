/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { ViewDowncastWriter } from '../../../src/view/downcastwriter.js';
import { ViewDocument } from '../../../src/view/document.js';
import { ViewEditableElement } from '../../../src/view/editableelement.js';
import { ViewPosition } from '../../../src/view/position.js';
import { ViewRange } from '../../../src/view/range.js';
import { createViewRoot } from '../_utils/createroot.js';
import { ViewElement } from '../../../src/view/element.js';
import { ViewSelection } from '../../../src/view/selection.js';
import { StylesProcessor } from '../../../src/view/stylesmap.js';
import { ViewDocumentFragment } from '../../../src/view/documentfragment.js';
import { HtmlDataProcessor } from '../../../src/dataprocessor/htmldataprocessor.js';

import { CKEditorError } from '@ckeditor/ckeditor5-utils/src/ckeditorerror.js';
import { testUtils } from '@ckeditor/ckeditor5-core/tests/_utils/utils.js';

describe( 'DowncastWriter', () => {
	let writer, attributes, root, doc;

	testUtils.createSinonSandbox();

	beforeEach( () => {
		attributes = { foo: 'bar', baz: 'quz' };
		doc = new ViewDocument( new StylesProcessor() );
		root = createViewRoot( doc );
		writer = new ViewDowncastWriter( doc );
	} );

	describe( 'setSelection()', () => {
		it( 'should set document view selection', () => {
			const position = ViewPosition._createAt( root, 0 );
			writer.setSelection( position );

			const ranges = Array.from( doc.selection.getRanges() );

			expect( ranges.length ).to.equal( 1 );
			expect( ranges[ 0 ].start.compareWith( position ) ).to.equal( 'same' );
			expect( ranges[ 0 ].end.compareWith( position ) ).to.equal( 'same' );
		} );

		it( 'should be able to set fake selection', () => {
			const position = ViewPosition._createAt( root, 0 );
			writer.setSelection( position, { fake: true, label: 'foo' } );

			expect( doc.selection.isFake ).to.be.true;
			expect( doc.selection.fakeSelectionLabel ).to.equal( 'foo' );
		} );
	} );

	describe( 'setSelectionFocus()', () => {
		it( 'should use selection._setFocus method internally', () => {
			const position = ViewPosition._createAt( root, 0 );
			writer.setSelection( position );

			const spy = sinon.spy( writer.document.selection, '_setFocus' );
			writer.setSelectionFocus( root, 0 );

			sinon.assert.calledWithExactly( spy, root, 0 );
			spy.restore();
		} );
	} );

	describe( 'createDocumentFragment', () => {
		let view;

		beforeEach( () => {
			const dataProcessor = new HtmlDataProcessor( doc );

			const html = '' +
				'<h1 style="color:blue;position:fixed;">Heading <strong>1</strong></h1>' +
				'<p class="foo1 bar2" style="text-align:left;" data-attr="abc">Foo <i>Bar</i> <strong>Bold</strong></p>' +
				'<p><u>Some underlined</u> text</p>' +
				'<ul>' +
				'<li class="single">Item 1</li>' +
				'<li><span>Item <s>1</s></span></li>' +
				'<li><h2>Item 1</h2></li>' +
				'</ul>';

			view = dataProcessor.toView( html );
		} );

		it( 'should create empty document fragment', () => {
			const df = writer.createDocumentFragment();

			expect( df ).to.instanceOf( ViewDocumentFragment );
			expect( df.childCount ).to.equal( 0 );
		} );

		it( 'should create document fragment with children', () => {
			const df = writer.createDocumentFragment( [ view.getChild( 0 ), view.getChild( 1 ) ] );

			expect( df ).to.instanceOf( ViewDocumentFragment );
			expect( df.childCount ).to.equal( 2 );
		} );
	} );

	describe( 'createText()', () => {
		it( 'should create Text instance', () => {
			const text = writer.createText( 'foo bar' );

			expect( text.is( '$text' ) ).to.be.true;
			expect( text.data ).to.equal( 'foo bar' );
		} );
	} );

	describe( 'createAttributeElement()', () => {
		it( 'should create ViewAttributeElement', () => {
			const element = writer.createAttributeElement( 'foo', attributes );

			expect( element.is( 'attributeElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			assertElementAttributes( element, attributes );
		} );

		it( 'should allow to pass additional options', () => {
			const element = writer.createAttributeElement( 'foo', attributes, {
				priority: 99,
				id: 'bar',
				renderUnsafeAttributes: [ 'baz' ]
			} );

			expect( element.is( 'attributeElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			expect( element.priority ).to.equal( 99 );
			expect( element.id ).to.equal( 'bar' );
			expect( element.shouldRenderUnsafeAttribute( 'baz' ) ).to.be.true;
			assertElementAttributes( element, attributes );
		} );

		it( 'should pass priority 0', () => {
			const element = writer.createAttributeElement( 'foo', attributes, { priority: 0 } );

			expect( element.priority ).to.equal( 0 );
		} );
	} );

	describe( 'createContainerElement()', () => {
		it( 'should create ViewContainerElement', () => {
			const element = writer.createContainerElement( 'foo', attributes );

			expect( element.is( 'containerElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			assertElementAttributes( element, attributes );
			expect( element.childCount ).to.equal( 0 );
		} );

		it( 'should allow to pass additional options', () => {
			const element = writer.createContainerElement( 'foo', attributes, {
				renderUnsafeAttributes: [ 'baz' ]
			} );

			expect( element.is( 'containerElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			expect( element.shouldRenderUnsafeAttribute( 'baz' ) ).to.be.true;
			assertElementAttributes( element, attributes );
		} );

		it( 'should create element without attributes', () => {
			const element = writer.createContainerElement( 'foo', null );

			expect( element.is( 'containerElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			expect( Array.from( element.getAttributes() ).length ).to.equal( 0 );
			expect( element.childCount ).to.equal( 0 );
		} );

		it( 'should create element with single child', () => {
			const child = writer.createEmptyElement( 'bar' );
			const element = writer.createContainerElement( 'foo', null, child );

			expect( element.is( 'containerElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			expect( Array.from( element.getAttributes() ).length ).to.equal( 0 );
			expect( element.childCount ).to.equal( 1 );
			expect( element.getChild( 0 ) ).to.equal( child );
		} );

		it( 'should create element with children and attributes', () => {
			const first = writer.createEmptyElement( 'aaa' );
			const second = writer.createEmptyElement( 'bbb' );
			const element = writer.createContainerElement( 'foo', attributes, [ first, second ] );

			expect( element.is( 'containerElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			assertElementAttributes( element, attributes );
			expect( element.childCount ).to.equal( 2 );
			expect( element.getChild( 0 ) ).to.equal( first );
			expect( element.getChild( 1 ) ).to.equal( second );
		} );

		it( 'should create element with children attributes and allow additional options', () => {
			const child = writer.createEmptyElement( 'bar' );
			const element = writer.createContainerElement( 'foo', attributes, child, { renderUnsafeAttributes: [ 'baz' ] } );

			expect( element.is( 'containerElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			expect( element.shouldRenderUnsafeAttribute( 'baz' ) ).to.be.true;
			assertElementAttributes( element, attributes );
			expect( element.childCount ).to.equal( 1 );
			expect( element.getChild( 0 ) ).to.equal( child );
		} );
	} );

	describe( 'createEditableElement()', () => {
		it( 'should create ViewEditableElement', () => {
			const element = writer.createEditableElement( 'foo', attributes );

			expect( element ).to.be.instanceOf( ViewEditableElement );
			expect( element.name ).to.equal( 'foo' );
			assertElementAttributes( element, attributes );
		} );

		it( 'should allow to pass additional options', () => {
			const element = writer.createEditableElement( 'foo', attributes, {
				renderUnsafeAttributes: [ 'baz' ]
			} );

			expect( element.shouldRenderUnsafeAttribute( 'baz' ) ).to.be.true;
		} );
	} );

	describe( 'createEmptyElement()', () => {
		it( 'should create ViewEmptyElement', () => {
			const element = writer.createEmptyElement( 'foo', attributes );

			expect( element.is( 'emptyElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			assertElementAttributes( element, attributes );
		} );

		it( 'should allow to pass additional options', () => {
			const element = writer.createEmptyElement( 'foo', attributes, {
				renderUnsafeAttributes: [ 'baz' ]
			} );

			expect( element.is( 'emptyElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			expect( element.shouldRenderUnsafeAttribute( 'baz' ) ).to.be.true;
			assertElementAttributes( element, attributes );
		} );
	} );

	describe( 'createUIElement()', () => {
		it( 'should create UIElement', () => {
			const element = writer.createUIElement( 'foo', attributes );

			expect( element.is( 'uiElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			assertElementAttributes( element, attributes );
		} );

		it( 'should allow to pass custom rendering method', () => {
			const renderFn = function() {};
			const element = writer.createUIElement( 'foo', attributes, renderFn );

			expect( element.is( 'uiElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			expect( element.render ).to.equal( renderFn );
			assertElementAttributes( element, attributes );
		} );

		it( 'should allow to pass additional options', () => {
			const renderFn = function() {};
			const element = writer.createUIElement( 'foo', attributes, renderFn );

			expect( element.is( 'uiElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			assertElementAttributes( element, attributes );
		} );
	} );

	describe( 'createRawElement()', () => {
		it( 'should create a RawElement', () => {
			const element = writer.createRawElement( 'foo', attributes );

			expect( element.is( 'rawElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			assertElementAttributes( element, attributes );

			expect( element.render ).to.be.a( 'function' );
		} );

		it( 'should provide a default empty render() method', () => {
			const element = writer.createRawElement( 'foo' );

			expect( element.render ).to.be.a( 'function' );

			expect( () => {
				element.render();
			} ).to.not.throw();
		} );

		it( 'should allow to pass custom rendering method', () => {
			const renderFn = function() {};
			const element = writer.createRawElement( 'foo', attributes, renderFn );

			expect( element.is( 'rawElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			expect( element.render ).to.equal( renderFn );
			assertElementAttributes( element, attributes );
		} );

		it( 'should allow to pass additional options', () => {
			const renderFn = function() {};
			const element = writer.createRawElement( 'foo', attributes, renderFn, {
				renderUnsafeAttributes: [ 'baz' ]
			} );

			expect( element.is( 'rawElement' ) ).to.be.true;
			expect( element.name ).to.equal( 'foo' );
			expect( element.shouldRenderUnsafeAttribute( 'baz' ) ).to.be.true;
			assertElementAttributes( element, attributes );
		} );
	} );

	describe( 'setAttribute()', () => {
		it( 'should set attribute on given element', () => {
			const element = writer.createAttributeElement( 'span' );

			writer.setAttribute( 'foo', 'bar', element );

			expect( element.getAttribute( 'foo' ) ).to.equal( 'bar' );
		} );

		it( 'should add class token if reset is not set', () => {
			const element = writer.createAttributeElement( 'span' );

			writer.setAttribute( 'class', 'foo', false, element );
			writer.setAttribute( 'class', 'bar', false, element );

			expect( element.getAttribute( 'class' ) ).to.equal( 'foo bar' );
			expect( element.hasClass( 'foo' ) ).to.be.true;
			expect( element.hasClass( 'bar' ) ).to.be.true;
		} );

		it( 'should add style token if reset is not set', () => {
			const element = writer.createAttributeElement( 'span' );

			writer.setAttribute( 'style', [ 'font-size', '20px' ], false, element );
			writer.setAttribute( 'style', [ 'color', 'red' ], false, element );

			expect( element.getAttribute( 'style' ) ).to.equal( 'color:red;font-size:20px;' );
			expect( element.getStyle( 'font-size' ) ).to.equal( '20px' );
			expect( element.getStyle( 'color' ) ).to.equal( 'red' );
		} );

		it( 'should add rel attribute token if reset is not set', () => {
			const element = writer.createAttributeElement( 'a' );

			writer.setAttribute( 'rel', 'foo', false, element );
			writer.setAttribute( 'rel', 'bar', false, element );

			expect( element.getAttribute( 'rel' ) ).to.equal( 'foo bar' );
		} );
	} );

	describe( 'removeAttribute()', () => {
		it( 'should remove attribute on given element', () => {
			const element = writer.createAttributeElement( 'span', { foo: 'bar' } );

			writer.removeAttribute( 'foo', element );

			expect( element.getAttribute( 'foo' ) ).to.be.undefined;
		} );

		it( 'should remove class token if remove value is set', () => {
			const element = writer.createAttributeElement( 'span', { class: 'foo bar' } );

			writer.removeAttribute( 'class', 'foo', element );
			expect( element.getAttribute( 'class' ) ).to.equal( 'bar' );

			writer.removeAttribute( 'class', 'bar', element );
			expect( element.getAttribute( 'class' ) ).to.be.undefined;
		} );

		it( 'should remove style token if remove value is set', () => {
			const element = writer.createAttributeElement( 'span', { style: 'font-size: 20px; color: red' } );

			writer.removeAttribute( 'style', 'font-size', element );
			expect( element.getAttribute( 'style' ) ).to.equal( 'color:red;' );

			writer.removeAttribute( 'style', 'color', element );
			expect( element.getAttribute( 'style' ) ).to.be.undefined;
		} );

		it( 'should remove rel attribute token if remove value is set', () => {
			const element = writer.createAttributeElement( 'a', { rel: 'foo bar' } );

			expect( element.getAttribute( 'rel' ) ).to.equal( 'foo bar' );

			writer.removeAttribute( 'rel', 'foo', element );
			expect( element.getAttribute( 'rel' ) ).to.equal( 'bar' );

			writer.removeAttribute( 'rel', 'bar', element );
			expect( element.getAttribute( 'rel' ) ).to.be.undefined;
		} );
	} );

	describe( 'addClass()', () => {
		it( 'should add class to given element', () => {
			const element = writer.createAttributeElement( 'span' );

			writer.addClass( 'foo', element );

			expect( element.hasClass( 'foo' ) ).to.be.true;
		} );

		it( 'should add multiple classes to given element', () => {
			const element = writer.createAttributeElement( 'span' );

			writer.addClass( [ 'foo', 'bar' ], element );

			expect( element.hasClass( 'foo' ) ).to.be.true;
			expect( element.hasClass( 'bar' ) ).to.be.true;
		} );
	} );

	describe( 'removeClass()', () => {
		it( 'should remove class from given element', () => {
			const element = writer.createAttributeElement( 'span', { class: 'foo bar' } );

			writer.removeClass( 'foo', element );

			expect( element.hasClass( 'foo' ) ).to.be.false;
			expect( element.hasClass( 'bar' ) ).to.be.true;
		} );

		it( 'should remove multiple classes from given element', () => {
			const element = writer.createAttributeElement( 'span', { class: 'foo bar' } );

			writer.removeClass( [ 'foo', 'bar' ], element );

			expect( element.hasClass( 'foo' ) ).to.be.false;
			expect( element.hasClass( 'bar' ) ).to.be.false;
		} );
	} );

	describe( 'addStyle()', () => {
		it( 'should add style to given element', () => {
			const element = writer.createAttributeElement( 'span' );

			writer.setStyle( 'foo', 'bar', element );

			expect( element.getStyle( 'foo' ) ).to.equal( 'bar' );
		} );

		it( 'should allow to add multiple styles to given element', () => {
			const element = writer.createAttributeElement( 'span' );

			writer.setStyle( {
				foo: 'bar',
				baz: 'quiz'
			}, element );

			expect( element.getStyle( 'foo' ) ).to.equal( 'bar' );
			expect( element.getStyle( 'baz' ) ).to.equal( 'quiz' );
		} );
	} );

	describe( 'removeStyle()', () => {
		it( 'should remove style from given element', () => {
			const element = writer.createAttributeElement( 'span', { style: 'foo:bar;baz:quiz;' } );

			writer.removeStyle( 'foo', element );

			expect( element.hasStyle( 'foo' ) ).to.be.false;
			expect( element.hasStyle( 'baz' ) ).to.be.true;
		} );

		it( 'should remove multiple styles from given element', () => {
			const element = writer.createAttributeElement( 'span', { style: 'foo:bar;baz:quiz;' } );

			writer.removeStyle( [ 'foo', 'bar' ], element );

			expect( element.hasStyle( 'foo' ) ).to.be.false;
			expect( element.hasStyle( 'baz' ) ).to.be.true;
		} );
	} );

	describe( 'setCustomProperty()', () => {
		it( 'should set custom property to given element', () => {
			const element = writer.createAttributeElement( 'span' );

			writer.setCustomProperty( 'foo', 'bar', element );

			expect( element.getCustomProperty( 'foo' ) ).to.equal( 'bar' );
		} );

		it( 'should set custom property to given document fragment', () => {
			const fragment = writer.createDocumentFragment();

			writer.setCustomProperty( 'foo', 'bar', fragment );

			expect( fragment.getCustomProperty( 'foo' ) ).to.equal( 'bar' );
		} );
	} );

	describe( 'removeCustomProperty()', () => {
		it( 'should remove custom property from given element', () => {
			const element = writer.createAttributeElement( 'span' );

			writer.setCustomProperty( 'foo', 'bar', element );
			expect( element.getCustomProperty( 'foo' ) ).to.equal( 'bar' );

			writer.removeCustomProperty( 'foo', element );
			expect( element.getCustomProperty( 'foo' ) ).to.be.undefined;
		} );

		it( 'should remove custom property from given document fragment', () => {
			const fragment = writer.createDocumentFragment();

			writer.setCustomProperty( 'foo', 'bar', fragment );
			expect( fragment.getCustomProperty( 'foo' ) ).to.equal( 'bar' );

			writer.removeCustomProperty( 'foo', fragment );
			expect( fragment.getCustomProperty( 'foo' ) ).to.be.undefined;
		} );
	} );

	describe( 'createPositionAt()', () => {
		it( 'should return instance of Position', () => {
			doc.getRoot()._appendChild( new ViewElement( 'p' ) );

			expect( writer.createPositionAt( doc.getRoot(), 0 ) ).to.be.instanceof( ViewPosition );
		} );
	} );

	describe( 'createPositionAfter()', () => {
		it( 'should return instance of Position', () => {
			doc.getRoot()._appendChild( new ViewElement( 'p' ) );

			expect( writer.createPositionAfter( doc.getRoot().getChild( 0 ) ) ).to.be.instanceof( ViewPosition );
		} );
	} );

	describe( 'createPositionBefore()', () => {
		it( 'should return instance of Position', () => {
			doc.getRoot()._appendChild( new ViewElement( 'p' ) );

			expect( writer.createPositionBefore( doc.getRoot().getChild( 0 ) ) ).to.be.instanceof( ViewPosition );
		} );
	} );

	describe( 'createRange()', () => {
		it( 'should return instance of Range', () => {
			doc.getRoot()._appendChild( new ViewElement( 'p' ) );

			expect( writer.createRange( writer.createPositionAt( doc.getRoot(), 0 ) ) ).to.be.instanceof( ViewRange );
		} );
	} );

	describe( 'createRangeIn()', () => {
		it( 'should return instance of Range', () => {
			doc.getRoot()._appendChild( new ViewElement( 'p' ) );

			expect( writer.createRangeIn( doc.getRoot().getChild( 0 ) ) ).to.be.instanceof( ViewRange );
		} );
	} );

	describe( 'createRangeOn()', () => {
		it( 'should return instance of Range', () => {
			doc.getRoot()._appendChild( new ViewElement( 'p' ) );

			expect( writer.createRangeOn( doc.getRoot().getChild( 0 ) ) ).to.be.instanceof( ViewRange );
		} );
	} );

	describe( 'createSelection()', () => {
		it( 'should return instance of Selection', () => {
			doc.getRoot()._appendChild( new ViewElement( 'p' ) );

			expect( writer.createSelection() ).to.be.instanceof( ViewSelection );
		} );
	} );

	describe( 'createSlot()', () => {
		it( 'should throw if called before slot factory is initialized', () => {
			expect( () => {
				writer.createSlot();
			} ).to.throw( CKEditorError, 'view-writer-invalid-create-slot-context' );
		} );

		it( 'should call slot factory and pass the parameter', () => {
			const spy = sinon.spy();

			writer._registerSlotFactory( spy );
			writer.createSlot( 'foo' );

			sinon.assert.calledWithExactly( spy, writer, 'foo' );
		} );

		it( 'should throw if called after slot factory is cleared', () => {
			const spy = sinon.spy();

			writer._registerSlotFactory( spy );
			writer._clearSlotFactory();

			expect( () => {
				writer.createSlot( 'foo' );
			} ).to.throw( CKEditorError, 'view-writer-invalid-create-slot-context' );

			sinon.assert.notCalled( spy );
		} );
	} );

	describe( 'manages ViewAttributeElement#_clonesGroup', () => {
		it( 'should return all clones of a broken attribute element with id', () => {
			const text = writer.createText( 'abccccde' );

			writer.insert( ViewPosition._createAt( root, 0 ), text );

			const span = writer.createAttributeElement( 'span', null, { id: 'foo' } );
			span._priority = 20;

			// <div>ab<span>cccc</span>de</div>
			writer.wrap( ViewRange._createFromParentsAndOffsets( text, 2, text, 6 ), span );

			const i = writer.createAttributeElement( 'i' );

			// <div>a<i>b<span>c</span></i><span>cc</span>de</div>
			writer.wrap(
				ViewRange._createFromParentsAndOffsets(
					root.getChild( 0 ), 1,
					root.getChild( 1 ).getChild( 0 ), 1
				),
				i
			);

			// <div>a<i>b<span>c</span></i><span>c</span><i><span>cc</span>d</i>e</div>
			writer.wrap(
				ViewRange._createFromParentsAndOffsets(
					root.getChild( 2 ).getChild( 0 ), 1,
					root.getChild( 3 ), 1
				),
				i
			);

			// Find all spans.
			const allSpans = Array.from( ViewRange._createIn( root ).getItems() ).filter( element => element.is( 'element', 'span' ) );

			// For each of the spans created above...
			for ( const oneOfAllSpans of allSpans ) {
				const brokenSet = oneOfAllSpans.getElementsWithSameId();
				const brokenArray = Array.from( brokenSet );

				// Check if all spans are included.
				for ( const s of allSpans ) {
					expect( brokenSet.has( s ) ).to.be.true;
				}

				expect( brokenArray.length ).to.equal( allSpans.length );
			}
		} );

		it( 'should not create groups for attribute elements that are not created in document root', () => {
			const p = writer.createContainerElement( 'p' );
			const foo = writer.createText( 'foo' );
			writer.insert( ViewPosition._createAt( p, 0 ), foo );
			// <p>foo</p>

			const span = writer.createAttributeElement( 'span', null, { id: 'span' } );

			// <p><span>foo</span></p>
			writer.wrap( ViewRange._createFromParentsAndOffsets( foo, 0, foo, 3 ), span );

			// Find the span.
			const createdSpan = p.getChild( 0 );

			expect( createdSpan.getElementsWithSameId().size ).to.equal( 0 );
		} );

		it( 'should add attribute elements to clone groups deeply', () => {
			const p = writer.createContainerElement( 'p' );
			const foo = writer.createText( 'foo' );
			writer.insert( ViewPosition._createAt( p, 0 ), foo );
			// <p>foo</p>

			const span = writer.createAttributeElement( 'span', null, { id: 'span' } );

			// <p><span>foo</span></p>
			writer.wrap( ViewRange._createFromParentsAndOffsets( foo, 0, foo, 3 ), span );

			// <div><p><span>foo</span></p>
			writer.insert( ViewPosition._createAt( root, 0 ), p );

			// Find the span.
			const createdSpan = p.getChild( 0 );

			expect( Array.from( createdSpan.getElementsWithSameId() ) ).to.deep.equal( [ createdSpan ] );
		} );

		it( 'should remove attribute elements from clone groups deeply', () => {
			const p1 = writer.createContainerElement( 'p' );
			const p2 = writer.createContainerElement( 'p' );
			const foo = writer.createText( 'foo' );
			const bar = writer.createText( 'bar' );

			writer.insert( ViewPosition._createAt( root, 0 ), p1 );
			writer.insert( ViewPosition._createAt( root, 1 ), p2 );
			writer.insert( ViewPosition._createAt( p1, 0 ), foo );
			writer.insert( ViewPosition._createAt( p2, 0 ), bar );
			// <div><p>foo</p><p>bar</p></div>

			const span = writer.createAttributeElement( 'span', null, { id: 'span' } );

			// <div><p>fo<span>o</span></p><p>bar</p></div>
			writer.wrap( ViewRange._createFromParentsAndOffsets( foo, 2, foo, 3 ), span );

			// <div><p>fo<span>o</span></p><p><span>b</span>ar</p></div>
			writer.wrap( ViewRange._createFromParentsAndOffsets( bar, 0, bar, 1 ), span );

			// <div><p><span>b</span>ar</p></div>
			writer.remove( ViewRange._createOn( p1 ) );

			// Find the span.
			const spanInTree = p2.getChild( 0 );

			expect( Array.from( spanInTree.getElementsWithSameId() ) ).to.deep.equal( [ spanInTree ] );
		} );
	} );

	function assertElementAttributes( element, attributes ) {
		for ( const key of Object.keys( attributes ) ) {
			if ( element.getAttribute( key ) !== attributes[ key ] ) {
				throw new Error( 'Attributes in element are different that those passed to the constructor method.' );
			}
		}
	}
} );
