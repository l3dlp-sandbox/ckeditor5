/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { VirtualTestEditor } from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor.js';

import { Plugin } from '@ckeditor/ckeditor5-core/src/plugin.js';
import { ImageBlockEditing } from '../../src/image/imageblockediting.js';
import { ImageUploadEditing } from '../../src/imageupload/imageuploadediting.js';
import { ImageUploadProgress } from '../../src/imageupload/imageuploadprogress.js';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph/src/paragraph.js';
import { FileRepository } from '@ckeditor/ckeditor5-upload/src/filerepository.js';
import { ClipboardPipeline } from '@ckeditor/ckeditor5-clipboard/src/clipboardpipeline.js';

import { createNativeFileMock, NativeFileReaderMock, UploadAdapterMock } from '@ckeditor/ckeditor5-upload/tests/_utils/mocks.js';
import { _setModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model.js';
import { _getViewData } from '@ckeditor/ckeditor5-engine/src/dev-utils/view.js';
import { testUtils } from '@ckeditor/ckeditor5-core/tests/_utils/utils.js';
import { ImageInlineEditing } from '../../src/image/imageinlineediting.js';

describe( 'ImageUploadProgress', () => {
	// eslint-disable-next-line @stylistic/max-len
	const base64Sample = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
	let editor, model, doc, fileRepository, view, nativeReaderMock, loader, adapterMock, imagePlaceholder;

	class UploadAdapterPluginMock extends Plugin {
		init() {
			fileRepository = this.editor.plugins.get( FileRepository );
			fileRepository.createUploadAdapter = newLoader => {
				loader = newLoader;
				adapterMock = new UploadAdapterMock( loader );

				return adapterMock;
			};
		}
	}

	testUtils.createSinonSandbox();

	beforeEach( () => {
		testUtils.sinon.stub( window, 'FileReader' ).callsFake( () => {
			nativeReaderMock = new NativeFileReaderMock();

			return nativeReaderMock;
		} );

		return VirtualTestEditor
			.create( {
				plugins: [
					ImageBlockEditing, ImageInlineEditing, Paragraph, ImageUploadEditing,
					ImageUploadProgress, UploadAdapterPluginMock, ClipboardPipeline
				],
				image: { insert: { type: 'auto' } }
			} )
			.then( newEditor => {
				editor = newEditor;
				model = editor.model;
				doc = model.document;
				view = editor.editing.view;

				fileRepository = editor.plugins.get( FileRepository );
				fileRepository.createUploadAdapter = newLoader => {
					loader = newLoader;
					adapterMock = new UploadAdapterMock( loader );

					return adapterMock;
				};

				imagePlaceholder = editor.plugins.get( 'ImageUploadProgress' ).placeholder;
			} );
	} );

	it( 'should have `isOfficialPlugin` static flag set to `true`', () => {
		expect( ImageUploadProgress.isOfficialPlugin ).to.be.true;
	} );

	it( 'should have `isPremiumPlugin` static flag set to `false`', () => {
		expect( ImageUploadProgress.isPremiumPlugin ).to.be.false;
	} );

	it( 'should convert image\'s "reading" uploadStatus attribute', () => {
		_setModelData( model, '<paragraph>[]foo</paragraph>' );
		editor.execute( 'uploadImage', { file: createNativeFileMock() } );

		expect( _getViewData( view ) ).to.equal(
			'<p>[<span class="ck-appear ck-image-upload-placeholder ck-widget image-inline" contenteditable="false">' +
				`<img src="${ imagePlaceholder }"></img>` +
				'<div class="ck-upload-placeholder-loader"></div>' +
			'</span>}foo</p>'
		);
	} );

	it( 'should convert image\'s "uploading" uploadStatus attribute', done => {
		_setModelData( model, '<paragraph>[]foo</paragraph>' );
		editor.execute( 'uploadImage', { file: createNativeFileMock() } );

		model.document.once( 'change', () => {
			try {
				expect( _getViewData( view ) ).to.equal(
					'<p>[<span class="ck-appear ck-widget image-inline" contenteditable="false">' +
						`<img src="${ base64Sample }"></img>` +
						'<div class="ck-progress-bar"></div>' +
					'</span>}foo</p>'
				);

				done();
			} catch ( err ) {
				done( err );
			}
		}, { priority: 'lowest' } );

		loader.file.then( () => nativeReaderMock.mockSuccess( base64Sample ) );
	} );

	// See https://github.com/ckeditor/ckeditor5/issues/1985.
	// Might be obsolete after changes in table refreshing (now it refreshes siblings of an image and not its parent).
	it( 'should work if image parent is refreshed by the differ', function( done ) {
		model.schema.register( 'outerBlock', {
			allowWhere: '$block',
			isBlock: true
		} );

		model.schema.register( 'innerBlock', {
			allowIn: 'outerBlock',
			isLimit: true
		} );

		model.schema.extend( '$block', { allowIn: 'innerBlock' } );
		editor.conversion.elementToElement( { model: 'outerBlock', view: 'outerBlock' } );
		editor.conversion.elementToElement( { model: 'innerBlock', view: 'innerBlock' } );

		model.document.registerPostFixer( () => {
			for ( const change of doc.differ.getChanges() ) {
				// The editing.reconvertItem() simulates remove and insert of and image parent thus preventing image from proper work.
				if ( change.type == 'insert' && change.name == 'imageBlock' ) {
					editor.editing.reconvertItem( change.position.parent );

					return false; // Refreshing item should not trigger calling post-fixer again.
				}
			}
		} );

		_setModelData( model, '<outerBlock><innerBlock><paragraph>[]</paragraph></innerBlock></outerBlock>' );

		editor.execute( 'uploadImage', { file: createNativeFileMock() } );

		model.document.once( 'change', () => {
			try {
				expect( _getViewData( view ) ).to.equal(
					'<outerBlock>' +
						'<innerBlock>' +
							'[<figure class="ck-appear ck-widget image" contenteditable="false">' +
								`<img src="${ base64Sample }"></img>` +
								'<div class="ck-progress-bar"></div>' +
							'</figure>]' +
						'</innerBlock>' +
					'</outerBlock>'
				);

				done();
			} catch ( err ) {
				done( err );
			}
		}, { priority: 'lowest' } );

		loader.file.then( () => nativeReaderMock.mockSuccess( base64Sample ) );
	} );

	it( 'should work correctly when there is no "reading" status and go straight to "uploading"', () => {
		const fileRepository = editor.plugins.get( FileRepository );
		const file = createNativeFileMock();
		const loader = fileRepository.createLoader( file );

		_setModelData( model, '<imageBlock></imageBlock>' );
		const image = doc.getRoot().getChild( 0 );

		// Set attributes directly on image to simulate instant "uploading" status.
		model.change( writer => {
			writer.setAttribute( 'uploadStatus', 'uploading', image );
			writer.setAttribute( 'uploadId', loader.id, image );
			writer.setAttribute( 'src', 'image.png', image );
		} );

		expect( _getViewData( view ) ).to.equal(
			'[<figure class="ck-appear ck-widget image" contenteditable="false">' +
				'<img src="image.png"></img>' +
				'<div class="ck-progress-bar"></div>' +
			'</figure>]'
		);
	} );

	it( 'should work correctly when there is no "reading" status and go straight to "uploading" - external changes', () => {
		_setModelData( model, '<imageBlock></imageBlock>' );
		const image = doc.getRoot().getChild( 0 );

		// Set attributes directly on image to simulate instant "uploading" status.
		model.change( writer => {
			writer.setAttribute( 'uploadStatus', 'uploading', image );
			writer.setAttribute( 'uploadId', '12345', image );
		} );

		expect( _getViewData( view ) ).to.equal(
			'[<figure class="ck-appear ck-image-upload-placeholder ck-widget image" contenteditable="false">' +
				`<img src="${ imagePlaceholder }"></img>` +
				'<div class="ck-upload-placeholder-loader"></div>' +
			'</figure>]'
		);
	} );

	it( 'should "clear" image when uploadId changes to null', () => {
		_setModelData( model, '<imageBlock></imageBlock>' );
		const image = doc.getRoot().getChild( 0 );

		// Set attributes directly on image to simulate instant "uploading" status.
		model.change( writer => {
			writer.setAttribute( 'uploadStatus', 'uploading', image );
			writer.setAttribute( 'uploadId', '12345', image );
		} );

		model.change( writer => {
			writer.setAttribute( 'uploadStatus', null, image );
			writer.setAttribute( 'uploadId', null, image );
		} );

		expect( _getViewData( view ) ).to.equal(
			'[<figure class="ck-widget image" contenteditable="false">' +
				`<img src="${ imagePlaceholder }"></img>` +
			'</figure>]'
		);
	} );

	it( 'should update progressbar width on progress', done => {
		_setModelData( model, '<paragraph>[]foo</paragraph>' );
		editor.execute( 'uploadImage', { file: createNativeFileMock() } );

		model.document.once( 'change', () => {
			adapterMock.mockProgress( 40, 100 );

			try {
				expect( _getViewData( view ) ).to.equal(
					'<p>[<span class="ck-appear ck-widget image-inline" contenteditable="false">' +
						`<img src="${ base64Sample }"></img>` +
						'<div class="ck-progress-bar" style="width:40%"></div>' +
					'</span>}foo</p>'
				);

				done();
			} catch ( err ) {
				done( err );
			}
		}, { priority: 'lowest' } );

		loader.file.then( () => nativeReaderMock.mockSuccess( base64Sample ) );
	} );

	it( 'should convert image\'s "complete" uploadStatus attribute and display temporary icon', done => {
		const clock = testUtils.sinon.useFakeTimers();

		_setModelData( model, '<paragraph>[]foo</paragraph>' );
		editor.execute( 'uploadImage', { file: createNativeFileMock() } );

		model.document.once( 'change', () => {
			model.document.once( 'change', () => {
				try {
					expect( _getViewData( view ) ).to.equal(
						'<p>[<span class="ck-widget image-inline" contenteditable="false">' +
							'<img src="image.png"></img>' +
							'<div class="ck-image-upload-complete-icon"></div>' +
						'</span>}foo</p>'
					);

					clock.tick( 3000 );

					expect( _getViewData( view ) ).to.equal(
						'<p>[<span class="ck-widget image-inline" contenteditable="false">' +
							'<img src="image.png"></img>' +
						'</span>}foo</p>'
					);

					done();
				} catch ( err ) {
					done( err );
				}
			}, { priority: 'lowest' } );

			loader.file.then( () => adapterMock.mockSuccess( { default: 'image.png' } ) );
		} );

		loader.file.then( () => nativeReaderMock.mockSuccess( base64Sample ) );
	} );

	it( 'should allow to customize placeholder image', () => {
		const uploadProgress = editor.plugins.get( ImageUploadProgress );
		uploadProgress.placeholder = base64Sample;

		_setModelData( model, '<paragraph>[]foo</paragraph>' );
		editor.execute( 'uploadImage', { file: createNativeFileMock() } );

		expect( _getViewData( view ) ).to.equal(
			'<p>[<span class="ck-appear ck-image-upload-placeholder ck-widget image-inline" contenteditable="false">' +
				`<img src="${ base64Sample }"></img>` +
				'<div class="ck-upload-placeholder-loader"></div>' +
			'</span>}foo</p>'
		);
	} );

	it( 'should not process attribute change if it is already consumed', () => {
		editor.editing.downcastDispatcher.on( 'attribute:uploadStatus:imageInline', ( evt, data, conversionApi ) => {
			conversionApi.consumable.consume( data.item, evt.name );
		}, { priority: 'highest' } );

		_setModelData( model, '<paragraph>[]foo</paragraph>' );
		editor.execute( 'uploadImage', { file: createNativeFileMock() } );

		expect( _getViewData( view ) ).to.equal(
			'<p>[<span class="ck-widget image-inline" contenteditable="false"><img></img></span>}foo</p>'
		);
	} );

	it( 'should not show progress bar and complete icon if there is no loader with given uploadId', () => {
		_setModelData( model, '<imageBlock uploadId="123" uploadStatus="reading"></imageBlock>' );

		const image = doc.getRoot().getChild( 0 );

		model.change( writer => {
			writer.setAttribute( 'uploadStatus', 'uploading', image );
		} );

		expect( _getViewData( view ) ).to.equal(
			'[<figure class="ck-appear ck-image-upload-placeholder ck-widget image" contenteditable="false">' +
				`<img src="${ imagePlaceholder }"></img>` +
				'<div class="ck-upload-placeholder-loader"></div>' +
			'</figure>]'
		);

		model.change( writer => {
			writer.setAttribute( 'uploadStatus', 'complete', image );
		} );

		expect( _getViewData( view ) ).to.equal(
			'[<figure class="ck-widget image" contenteditable="false">' +
				`<img src="${ imagePlaceholder }"></img>` +
			'</figure>]'
		);
	} );

	it( 'should work correctly when there is no ImageBlockEditing plugin enabled', async () => {
		const newEditor = await VirtualTestEditor.create( {
			plugins: [
				ImageInlineEditing, Paragraph, ImageUploadEditing,
				ImageUploadProgress, UploadAdapterPluginMock, ClipboardPipeline
			]
		} );

		_setModelData( newEditor.model, '<paragraph>[]foo</paragraph>' );
		newEditor.execute( 'imageUpload', { file: createNativeFileMock() } );

		expect( _getViewData( newEditor.editing.view ) ).to.equal(
			'<p>[<span class="ck-appear ck-image-upload-placeholder ck-widget image-inline" contenteditable="false">' +
				`<img src="${ imagePlaceholder }"></img>` +
				'<div class="ck-upload-placeholder-loader"></div>' +
			'</span>}foo</p>'
		);

		await newEditor.destroy();
	} );

	it( 'should work correctly when there is no ImageInlineEditing plugin enabled', async () => {
		const newEditor = await VirtualTestEditor.create( {
			plugins: [
				ImageBlockEditing, Paragraph, ImageUploadEditing,
				ImageUploadProgress, UploadAdapterPluginMock, ClipboardPipeline
			]
		} );

		_setModelData( newEditor.model, '<paragraph>[]foo</paragraph>' );
		newEditor.execute( 'imageUpload', { file: createNativeFileMock() } );

		expect( _getViewData( newEditor.editing.view ) ).to.equal(
			'[<figure class="ck-appear ck-image-upload-placeholder ck-widget image" contenteditable="false">' +
				`<img src="${ imagePlaceholder }"></img>` +
				'<div class="ck-upload-placeholder-loader"></div>' +
			'</figure>]<p>foo</p>'
		);

		await newEditor.destroy();
	} );
} );
