/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { ClassicTestEditor } from '@ckeditor/ckeditor5-core/tests/_utils/classictesteditor.js';
import { BalloonEditor } from '@ckeditor/ckeditor5-editor-balloon/src/ballooneditor.js';
import { MediaEmbed } from '../src/mediaembed.js';
import { MediaEmbedToolbar } from '../src/mediaembedtoolbar.js';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph/src/paragraph.js';
import { _setModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model.js';
import { View } from '@ckeditor/ckeditor5-ui/src/view.js';
import { Plugin } from '@ckeditor/ckeditor5-core/src/plugin.js';
import { ButtonView } from '@ckeditor/ckeditor5-ui/src/button/buttonview.js';
import { Bold } from '@ckeditor/ckeditor5-basic-styles/src/bold.js';

import { testUtils } from '@ckeditor/ckeditor5-core/tests/_utils/utils.js';

describe( 'MediaEmbedToolbar', () => {
	let editor, element, widgetToolbarRepository, balloon, toolbar, model;

	testUtils.createSinonSandbox();

	beforeEach( () => {
		element = document.createElement( 'div' );
		document.body.appendChild( element );

		return ClassicTestEditor.create( element, {
			plugins: [ Paragraph, MediaEmbed, MediaEmbedToolbar, FakeButton ],
			mediaEmbed: {
				toolbar: [ 'fake_button' ]
			}
		} ).then( _editor => {
			editor = _editor;
			model = editor.model;
			widgetToolbarRepository = editor.plugins.get( 'WidgetToolbarRepository' );
			toolbar = widgetToolbarRepository._toolbarDefinitions.get( 'mediaEmbed' ).view;
			balloon = editor.plugins.get( 'ContextualBalloon' );
		} );
	} );

	afterEach( () => {
		return editor.destroy()
			.then( () => element.remove() );
	} );

	it( 'should have `isOfficialPlugin` static flag set to `true`', () => {
		expect( MediaEmbedToolbar.isOfficialPlugin ).to.be.true;
	} );

	it( 'should have `isPremiumPlugin` static flag set to `false`', () => {
		expect( MediaEmbedToolbar.isPremiumPlugin ).to.be.false;
	} );

	it( 'should be loaded', () => {
		expect( editor.plugins.get( MediaEmbedToolbar ) ).to.be.instanceOf( MediaEmbedToolbar );
	} );

	describe( 'toolbar', () => {
		it( 'should use the config.table.tableWidget to create items', () => {
			// Make sure that toolbar is empty before first show.
			expect( toolbar.items.length ).to.equal( 0 );

			editor.ui.focusTracker.isFocused = true;

			_setModelData( model, '[<media url=""></media>]' );

			expect( toolbar.items ).to.have.length( 1 );
			expect( toolbar.items.get( 0 ).label ).to.equal( 'fake button' );
		} );

		it( 'should set proper CSS classes', () => {
			const spy = sinon.spy( balloon, 'add' );

			editor.ui.focusTracker.isFocused = true;

			_setModelData( model, '[<media url=""></media>]' );

			sinon.assert.calledWithMatch( spy, sinon.match( ( { balloonClassName, view } ) => {
				return view === toolbar && balloonClassName === 'ck-toolbar-container';
			} ) );
		} );

		it( 'should set aria-label attribute', () => {
			toolbar.render();

			expect( toolbar.element.getAttribute( 'aria-label' ) ).to.equal( 'Media toolbar' );

			toolbar.destroy();
		} );
	} );

	describe( 'integration with the editor focus', () => {
		it( 'should show the toolbar when the editor gains focus and the media widget is selected', () => {
			editor.ui.focusTracker.isFocused = true;

			_setModelData( editor.model, '[<media url=""></media>]' );

			editor.ui.focusTracker.isFocused = false;
			expect( balloon.visibleView ).to.be.null;

			editor.ui.focusTracker.isFocused = true;
			expect( balloon.visibleView ).to.equal( toolbar );
		} );

		it( 'should hide the toolbar when the editor loses focus and the media widget is selected', () => {
			editor.ui.focusTracker.isFocused = false;

			_setModelData( editor.model, '[<media url=""></media>]' );

			editor.ui.focusTracker.isFocused = true;
			expect( balloon.visibleView ).to.equal( toolbar );

			editor.ui.focusTracker.isFocused = false;
			expect( balloon.visibleView ).to.be.null;
		} );
	} );

	describe( 'integration with the editor selection', () => {
		beforeEach( () => {
			editor.ui.focusTracker.isFocused = true;
		} );

		it( 'should show the toolbar on ui#update when the media widget is selected', () => {
			_setModelData( editor.model, '<paragraph>[foo]</paragraph><media url=""></media>' );

			expect( balloon.visibleView ).to.be.null;

			editor.ui.fire( 'update' );

			expect( balloon.visibleView ).to.be.null;

			editor.model.change( writer => {
				// Select the [<media></media>]
				writer.setSelection( editor.model.document.getRoot().getChild( 1 ), 'on' );
			} );

			expect( balloon.visibleView ).to.equal( toolbar );

			// Make sure successive change does not throw, e.g. attempting
			// to insert the toolbar twice.
			editor.ui.fire( 'update' );
			expect( balloon.visibleView ).to.equal( toolbar );
		} );

		it( 'should not engage when the toolbar is in the balloon yet invisible', () => {
			_setModelData( editor.model, '<media url=""></media>' );

			expect( balloon.visibleView ).to.equal( toolbar );

			const lastView = new View();
			lastView.element = document.createElement( 'div' );

			balloon.add( {
				view: lastView,
				position: {
					target: document.body
				}
			} );

			expect( balloon.visibleView ).to.equal( lastView );

			editor.ui.fire( 'update' );

			expect( balloon.visibleView ).to.equal( lastView );
		} );

		it( 'should hide the toolbar on ui#update if the media is de–selected', () => {
			_setModelData( model, '<paragraph>foo</paragraph>[<media url=""></media>]' );

			expect( balloon.visibleView ).to.equal( toolbar );

			model.change( writer => {
				// Select the <paragraph>[...]</paragraph>
				writer.setSelection( model.document.getRoot().getChild( 0 ), 'in' );
			} );

			expect( balloon.visibleView ).to.be.null;

			// Make sure successive change does not throw, e.g. attempting
			// to remove the toolbar twice.
			editor.ui.fire( 'update' );
			expect( balloon.visibleView ).to.be.null;
		} );
	} );
} );

describe( 'MediaEmbedToolbar - integration with BalloonEditor', () => {
	let clock, editor, balloonToolbar, element, widgetToolbarRepository, balloon, toolbar, model;

	testUtils.createSinonSandbox();

	beforeEach( () => {
		element = document.createElement( 'div' );
		document.body.appendChild( element );
		clock = testUtils.sinon.useFakeTimers();

		return BalloonEditor.create( element, {
			plugins: [ Paragraph, MediaEmbed, MediaEmbedToolbar, FakeButton, Bold ],
			balloonToolbar: [ 'bold' ],
			mediaEmbed: {
				toolbar: [ 'fake_button' ]
			}
		} ).then( _editor => {
			editor = _editor;
			model = editor.model;
			widgetToolbarRepository = editor.plugins.get( 'WidgetToolbarRepository' );
			toolbar = widgetToolbarRepository._toolbarDefinitions.get( 'mediaEmbed' ).view;
			balloon = editor.plugins.get( 'ContextualBalloon' );
			balloonToolbar = editor.plugins.get( 'BalloonToolbar' );

			editor.ui.focusTracker.isFocused = true;
		} );
	} );

	afterEach( () => {
		return editor.destroy()
			.then( () => element.remove() );
	} );

	it( 'balloon toolbar should be hidden when media widget is selected', () => {
		_setModelData( model, '<paragraph>[abc]</paragraph><media url=""></media>' );
		editor.editing.view.document.isFocused = true;

		expect( balloon.visibleView ).to.equal( null );

		model.change( writer => {
			// Select the [<media></media>]
			writer.setSelection( model.document.getRoot().getChild( 1 ), 'on' );
		} );

		expect( balloon.visibleView ).to.equal( toolbar );

		clock.tick( 200 );

		expect( balloon.visibleView ).to.equal( toolbar );
	} );

	it( 'balloon toolbar should be visible when media widget is not selected', () => {
		_setModelData( model, '<paragraph>abc</paragraph>[<media url=""></media>]' );
		editor.editing.view.document.isFocused = true;

		expect( balloon.visibleView ).to.equal( toolbar );

		model.change( writer => {
			// Select the <paragraph>[abc]</paragraph>
			writer.setSelection( model.document.getRoot().getChild( 0 ), 'in' );
		} );

		clock.tick( 200 );

		expect( balloon.visibleView ).to.equal( balloonToolbar.toolbarView );
	} );

	it( 'does not create the toolbar if its items are not specified', () => {
		const consoleWarnStub = sinon.stub( console, 'warn' );
		const element = document.createElement( 'div' );

		return BalloonEditor.create( element, {
			plugins: [ Paragraph, MediaEmbed, MediaEmbedToolbar, Bold ]
		} ).then( editor => {
			widgetToolbarRepository = editor.plugins.get( 'WidgetToolbarRepository' );

			expect( widgetToolbarRepository._toolbarDefinitions.get( 'mediaEmbed' ) ).to.be.undefined;
			expect( consoleWarnStub.calledOnce ).to.equal( true );
			expect( consoleWarnStub.firstCall.args[ 0 ] ).to.match( /^widget-toolbar-no-items/ );

			element.remove();
			return editor.destroy();
		} );
	} );
} );

// Plugin that adds fake_button to editor's component factory.
class FakeButton extends Plugin {
	init() {
		this.editor.ui.componentFactory.add( 'fake_button', locale => {
			const view = new ButtonView( locale );

			view.set( {
				label: 'fake button'
			} );

			return view;
		} );
	}
}
