/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { VirtualTestEditor } from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor.js';
import { ClassicTestEditor } from '@ckeditor/ckeditor5-core/tests/_utils/classictesteditor.js';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph/src/paragraph.js';
import { ViewDataTransfer } from '@ckeditor/ckeditor5-engine/src/view/datatransfer.js';
import { Clipboard } from '@ckeditor/ckeditor5-clipboard/src/clipboard.js';
import { LinkImage } from '@ckeditor/ckeditor5-link/src/linkimage.js';
import { LegacyListEditing } from '@ckeditor/ckeditor5-list/src/legacylist/legacylistediting.js';

import { testUtils } from '@ckeditor/ckeditor5-core/tests/_utils/utils.js';
import { normalizeHtml } from '@ckeditor/ckeditor5-utils/tests/_utils/normalizehtml.js';
import { _getModelData, _setModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model.js';
import { _getViewData } from '@ckeditor/ckeditor5-engine/src/dev-utils/view.js';

import { ImageBlockEditing } from '../../src/image/imageblockediting.js';
import { ImageTypeCommand } from '../../src/image/imagetypecommand.js';
import { InsertImageCommand } from '../../src/image/insertimagecommand.js';
import { ImageCaption } from '../../src/imagecaption.js';
import { ImageLoadObserver } from '../../src/image/imageloadobserver.js';
import { ImageInlineEditing } from '../../src/image/imageinlineediting.js';
import { ImageResizeEditing } from '../../src/imageresize/imageresizeediting.js';

describe( 'ImageInlineEditing', () => {
	let editor, model, doc, view, viewDocument;

	testUtils.createSinonSandbox();

	beforeEach( async () => {
		editor = await VirtualTestEditor.create( {
			plugins: [ ImageInlineEditing, Paragraph ]
		} );

		model = editor.model;
		doc = model.document;
		view = editor.editing.view;
		viewDocument = view.document;
	} );

	afterEach( async () => {
		await editor.destroy();
	} );

	it( 'should have pluginName', () => {
		expect( ImageInlineEditing.pluginName ).to.equal( 'ImageInlineEditing' );
	} );

	it( 'should have `isOfficialPlugin` static flag set to `true`', () => {
		expect( ImageInlineEditing.isOfficialPlugin ).to.be.true;
	} );

	it( 'should have `isPremiumPlugin` static flag set to `false`', () => {
		expect( ImageInlineEditing.isPremiumPlugin ).to.be.false;
	} );

	it( 'should be loaded', () => {
		expect( editor.plugins.get( ImageInlineEditing ) ).to.be.instanceOf( ImageInlineEditing );
	} );

	describe( 'schema rules', () => {
		it( 'should be set', () => {
			expect( model.schema.isRegistered( 'imageInline' ) ).to.be.true;
			expect( model.schema.isInline( 'imageInline' ) ).to.be.true;
			expect( model.schema.isObject( 'imageInline' ) ).to.be.true;

			expect( model.schema.checkChild( [ '$root', '$block' ], 'imageInline' ) ).to.be.true;
			expect( model.schema.checkAttribute( [ '$root', '$block', 'imageInline' ], 'src' ) ).to.be.true;
			expect( model.schema.checkAttribute( [ '$root', '$block', 'imageInline' ], 'alt' ) ).to.be.true;

			expect( model.schema.checkChild( [ '$root' ], 'imageInline' ) ).to.be.false;
			expect( model.schema.checkChild( [ '$root', '$block', 'imageInline' ], 'imageBlock' ) ).to.be.false;
			expect( model.schema.checkChild( [ '$root', '$block', 'imageInline' ], '$text' ) ).to.be.false;
		} );

		it( 'should disallow imageInline in the caption element', () => {
			model.schema.register( 'caption', {
				allowIn: '$root',
				allowContentOf: '$block',
				isLimit: true
			} );

			expect( model.schema.checkChild( [ '$root', 'caption' ], 'imageInline' ) ).to.be.false;
		} );
	} );

	it( 'should register ImageLoadObserver', () => {
		expect( view.getObserver( ImageLoadObserver ) ).to.be.instanceOf( ImageLoadObserver );
	} );

	it( 'should register the insertImage command', () => {
		expect( editor.commands.get( 'insertImage' ) ).to.be.instanceOf( InsertImageCommand );
	} );

	it( 'should register the imageInsert command as an alias for the insertImage command', () => {
		expect( editor.commands.get( 'imageInsert' ) ).to.equal( editor.commands.get( 'insertImage' ) );
	} );

	describe( 'imageTypeInline command', () => {
		it( 'should be registered if ImageBlockEditing is loaded', async () => {
			const editor = await VirtualTestEditor.create( {
				plugins: [ ImageInlineEditing, ImageBlockEditing ]
			} );

			expect( editor.commands.get( 'imageTypeInline' ) ).to.be.instanceOf( ImageTypeCommand );

			await editor.destroy();
		} );

		it( 'should not be registered if ImageBlockEditing is not loaded', () => {
			expect( editor.commands.get( 'imageTypeInline' ) ).to.be.undefined;
		} );
	} );

	it( 'should update the ui after inline image has been loaded in the DOM', async () => {
		const element = document.createElement( 'div' );
		document.body.appendChild( element );

		const editor = await ClassicTestEditor.create( element, {
			plugins: [ ImageInlineEditing, Paragraph ]
		} );

		editor.data.set( '<p><img src="/assets/sample.png" alt="bar" /></p>' );

		const spy = sinon.spy();

		editor.ui.on( 'update', spy );

		const htmlImageElement = editor.ui.getEditableElement().querySelector( 'img' );
		htmlImageElement.dispatchEvent( new Event( 'load' ) );

		sinon.assert.calledOnce( spy );

		await editor.destroy();
		element.remove();
	} );

	describe( 'conversion in data pipeline', () => {
		describe( 'model to view', () => {
			it( 'should convert', () => {
				_setModelData( model, '<paragraph><imageInline src="/assets/sample.png" alt="alt text"></imageInline></paragraph>' );

				expect( editor.getData() ).to.equal( '<p><img src="/assets/sample.png" alt="alt text"></p>' );
			} );

			it( 'should convert without alt attribute', () => {
				_setModelData( model, '<paragraph><imageInline src="/assets/sample.png"></imageInline></paragraph>' );

				expect( editor.getData() ).to.equal( '<p><img src="/assets/sample.png"></p>' );
			} );

			it( 'should convert srcset attribute to srcset and sizes attribute', () => {
				_setModelData( model,
					'<paragraph>' +
						'<imageInline src="/assets/sample.png" alt="alt text" srcset="small.png 148w, big.png 1024w">' +
					'</imageInline></paragraph>'
				);

				expect( normalizeHtml( editor.getData() ) ).to.equal(
					'<p><img alt="alt text" sizes="100vw" src="/assets/sample.png" srcset="small.png 148w, big.png 1024w"></img></p>'
				);
			} );

			it( 'should not convert srcset attribute if is already consumed', () => {
				editor.data.downcastDispatcher.on( 'attribute:srcset:imageInline', ( evt, data, conversionApi ) => {
					const modelImage = data.item;

					conversionApi.consumable.consume( modelImage, evt.name );
				}, { priority: 'high' } );

				_setModelData( model,
					'<paragraph><imageInline ' +
						'src="/assets/sample.png" ' +
						'alt="alt text" ' +
						'srcset="small.png 148w, big.png 1024w">' +
					'</imageInline></paragraph>'
				);

				expect( editor.getData() ).to.equal( '<p><img src="/assets/sample.png" alt="alt text"></p>' );
			} );

			it( 'should not convert srcset attribute if has no data', () => {
				_setModelData( model,
					'<paragraph><imageInline ' +
						'src="/assets/sample.png" ' +
						'alt="alt text" ' +
						'srcset="">' +
					'</imageInline></paragraph>' );

				const imageInline = doc.getRoot().getChild( 0 ).getChild( 0 );
				model.change( writer => {
					writer.removeAttribute( 'srcset', imageInline );
				} );

				expect( editor.getData() ).to.equal( '<p><img src="/assets/sample.png" alt="alt text"></p>' );
			} );
		} );

		describe( 'view to model', () => {
			it( 'should convert image inline', () => {
				editor.setData( '<p><img src="/assets/sample.png" alt="alt text" /></p>' );

				expect( _getModelData( model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><imageInline alt="alt text" src="/assets/sample.png"></imageInline></paragraph>' );
			} );

			it( 'should not convert if there is no img inside #1', () => {
				editor.setData( '<span class="image"></span>' );

				expect( _getModelData( model, { withoutSelection: true } ) )
					.to.equal( '<paragraph></paragraph>' );
			} );

			it( 'should not convert if there is no img inside #2', () => {
				editor.setData( '<span class="image">test</span>' );

				expect( _getModelData( model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>test</paragraph>' );
			} );

			it( 'should convert without alt attribute', () => {
				editor.setData( '<p><img src="/assets/sample.png" /></p>' );

				expect( _getModelData( model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><imageInline src="/assets/sample.png"></imageInline></paragraph>' );
			} );

			it( 'should convert without src attribute', () => {
				editor.setData( '<p><img alt="alt text" /></p>' );

				expect( _getModelData( model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><imageInline alt="alt text"></imageInline></paragraph>' );
			} );

			it( 'should not convert in wrong context', () => {
				model.schema.register( 'div', { inheritAllFrom: '$block' } );
				model.schema.addChildCheck( ( ctx, childDef ) => {
					if ( childDef.name == 'imageInline' ) {
						return false;
					}
				} );

				editor.conversion.elementToElement( { model: 'div', view: 'div' } );

				editor.setData( '<div><img src="/assets/sample.png" alt="alt text" /></div>' );

				expect( _getModelData( model, { withoutSelection: true } ) )
					.to.equal( '<div></div>' );
			} );

			it( 'should not convert if img is already consumed', () => {
				editor.data.upcastDispatcher.on( 'element:p', ( evt, data, conversionApi ) => {
					const img = data.viewItem.getChild( 0 );
					conversionApi.consumable.consume( img, { name: true } );
				}, { priority: 'high' } );

				editor.setData( '<p><img src="/assets/sample.png" alt="alt text" /></p>' );

				expect( _getModelData( model, { withoutSelection: true } ) )
					.to.equal( '<paragraph></paragraph>' );
			} );

			it( 'should consume the src attribute on <img>', () => {
				editor.data.upcastDispatcher.on( 'element:img', ( evt, data, conversionApi ) => {
					expect( conversionApi.consumable.test( data.viewItem, { attributes: 'src' } ) ).to.be.false;
				}, { priority: 'low' } );

				editor.setData( '<p><img src="/assets/sample.png" alt="alt text" /></p>' );
			} );

			it( 'should dispatch conversion for nested elements', () => {
				const conversionSpy = sinon.spy();
				editor.data.upcastDispatcher.on( 'element:img', conversionSpy );

				editor.setData( '<span class="image"><img src="/assets/sample.png" alt="alt text" /></span>' );

				sinon.assert.calledOnce( conversionSpy );
			} );

			it( 'should convert bare img element', () => {
				editor.setData( '<img src="/assets/sample.png" alt="alt text" />' );

				expect( _getModelData( model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><imageInline alt="alt text" src="/assets/sample.png"></imageInline></paragraph>' );
			} );

			it( 'should not convert alt attribute on non-img element', () => {
				model.schema.register( 'div', {
					inheritAllFrom: '$block',
					allowAttributes: 'alt'
				} );

				editor.conversion.elementToElement( { model: 'div', view: 'div' } );

				editor.setData( '<div alt="foo"></div>' );

				expect( _getModelData( model, { withoutSelection: true } ) ).to.equal( '<div></div>' );
			} );

			it( 'should convert image with srcset attribute', () => {
				editor.setData(
					'<p><img src="/assets/sample.png" alt="alt text" srcset="small.png 148w, big.png 1024w" /></p>'
				);

				expect( _getModelData( model, { withoutSelection: true } ) )
					.to.equal(
						'<paragraph>' +
							'<imageInline alt="alt text" src="/assets/sample.png" srcset="small.png 148w, big.png 1024w">' +
							'</imageInline>' +
						'</paragraph>'
					);
			} );

			it( 'should ignore sizes attribute', () => {
				editor.setData(
					'<p><img src="/assets/sample.png" alt="alt text" srcset="small.png 148w, big.png 1024w" sizes="50vw" /></p>'
				);

				expect( _getModelData( model, { withoutSelection: true } ) )
					.to.equal(
						'<paragraph>' +
							'<imageInline alt="alt text" src="/assets/sample.png" srcset="small.png 148w, big.png 1024w">' +
							'</imageInline>' +
						'</paragraph>'
					);
			} );

			it( 'should not convert a link on an inline image', () => {
				editor.setData(
					'<a href="http://ckeditor.com"><img src="/assets/sample.png" alt="alt text" /></a>'
				);

				expect( _getModelData( model, { withoutSelection: true } ) )
					.to.equal(
						'<paragraph>' +
							'<imageInline alt="alt text" src="/assets/sample.png"></imageInline>' +
						'</paragraph>'
					);
			} );

			it( 'should preserve the white space before the image', () => {
				editor.setData( '<p>foo <img alt="alt text" src="/assets/sample.png"></p>' );

				expect( editor.getData() ).to.equal(
					'<p>foo <img src="/assets/sample.png" alt="alt text"></p>'
				);

				expect( _getModelData( model, { withoutSelection: true } ) ).to.equal(
					'<paragraph>foo <imageInline alt="alt text" src="/assets/sample.png"></imageInline></paragraph>'
				);
			} );

			it( 'should preserve the white space after the image', () => {
				editor.setData( '<p><img alt="alt text" src="/assets/sample.png"> foo</p>' );

				expect( editor.getData() ).to.equal(
					'<p><img src="/assets/sample.png" alt="alt text"> foo</p>'
				);

				expect( _getModelData( model, { withoutSelection: true } ) ).to.equal(
					'<paragraph><imageInline alt="alt text" src="/assets/sample.png"></imageInline> foo</paragraph>'
				);
			} );

			it( 'should preserve white spaces surrounding the image', () => {
				editor.setData( '<p>foo <img alt="alt text" src="/assets/sample.png"> bar</p>' );

				expect( editor.getData() ).to.equal(
					'<p>foo <img src="/assets/sample.png" alt="alt text"> bar</p>'
				);

				expect( _getModelData( model, { withoutSelection: true } ) ).to.equal(
					'<paragraph>foo <imageInline alt="alt text" src="/assets/sample.png"></imageInline> bar</paragraph>'
				);
			} );

			describe( 'should autohoist images', () => {
				beforeEach( () => {
					model.schema.register( 'div', { inheritAllFrom: '$block' } );

					editor.conversion.elementToElement( { model: 'div', view: 'div' } );
				} );

				it( 'image between non-hoisted elements', () => {
					editor.setData( '<div>foo<img src="foo.jpg" alt="foo" />bar</div>' );

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equal(
						'<div>foo<imageInline alt="foo" src="foo.jpg"></imageInline>bar</div>'
					);
				} );

				it( 'multiple images', () => {
					editor.setData( '<div>foo<img src="foo.jpg" alt="foo" />ba<img src="foo.jpg" alt="foo" />r</div>' );

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equal(
						'<div>foo' +
						'<imageInline alt="foo" src="foo.jpg"></imageInline>' +
						'ba' +
						'<imageInline alt="foo" src="foo.jpg"></imageInline>' +
						'r</div>'
					);
				} );

				it( 'images on borders of parent', () => {
					editor.setData( '<div><img src="foo.jpg" alt="foo" />foobar<img src="foo.jpg" alt="foo" /></div>' );

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equal(
						'<div>' +
						'<imageInline alt="foo" src="foo.jpg"></imageInline>' +
						'foobar' +
						'<imageInline alt="foo" src="foo.jpg"></imageInline>' +
						'</div>'
					);
				} );

				it( 'images are only content of parent', () => {
					editor.setData( '<div><img src="foo.jpg" alt="foo" /><img src="foo.jpg" alt="foo" /></div>' );

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equal(
						'<div><imageInline alt="foo" src="foo.jpg"></imageInline><imageInline alt="foo" src="foo.jpg"></imageInline></div>'
					);
				} );

				it( 'deep autohoisting #1', () => {
					model.schema.extend( 'div', { allowIn: 'div' } );

					editor.setData( '<div>foo<div>xx<img src="foo.jpg" alt="foo" /></div>bar</div>' );

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equal(
						'<div>foo<div>xx<imageInline alt="foo" src="foo.jpg"></imageInline></div>bar</div>'
					);
				} );

				it( 'deep autohoisting #2', () => {
					model.schema.extend( 'div', { allowIn: 'div' } );

					editor.setData(
						'<div>x</div>' +
						'<div><div><div><img src="foo.jpg" alt="foo" /></div></div></div>' +
						'<div>y</div>'
					);

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equal(
						'<div>x</div><div><div><div>' +
							'<imageInline alt="foo" src="foo.jpg"></imageInline>' +
						'</div></div></div><div>y</div>'
					);
				} );

				it( 'should not break a limiting element', () => {
					model.schema.register( 'limit', {
						inheritAllFrom: '$block',
						isLimit: true
					} );
					model.schema.extend( 'div', { allowIn: 'limit' } );

					editor.conversion.elementToElement( { model: 'limit', view: 'limit' } );

					editor.setData( '<limit><div>foo<img src="foo.jpg" alt="foo" />bar</div></limit>' );

					// <limit> element does not have converters so it is not converted.
					expect( _getModelData( model, { withoutSelection: true } ) ).to.equal(
						'<limit><div>foo<imageInline alt="foo" src="foo.jpg"></imageInline>bar</div></limit>'
					);
				} );

				it( 'should convert and autohoist image element without src attribute', () => {
					editor.setData( '<div>foo<img alt="foo" />bar</div>' );

					expect( _getModelData( model, { withoutSelection: true } ) ).to.equal(
						'<div>foo<imageInline alt="foo"></imageInline>bar</div>'
					);
				} );
			} );
		} );
	} );

	describe( 'conversion in editing pipeline', () => {
		describe( 'model to view', () => {
			it( 'should convert', () => {
				_setModelData( model, '<paragraph><imageInline src="/assets/sample.png" alt="alt text"></imageInline></paragraph>' );

				expect( _getViewData( view, { withoutSelection: true } ) ).to.equal(
					'<p><span class="ck-widget image-inline" contenteditable="false">' +
						'<img alt="alt text" src="/assets/sample.png"></img>' +
					'</span></p>'
				);
			} );

			it( 'converted element should be widgetized', () => {
				_setModelData( model, '<paragraph><imageInline src="/assets/sample.png" alt="alt text"></imageInline></paragraph>' );
				const element = viewDocument.getRoot().getChild( 0 ).getChild( 0 );

				expect( element.name ).to.equal( 'span' );
				expect( editor.plugins.get( 'ImageUtils' ).isImageWidget( element ) ).to.be.true;
			} );

			it( 'should convert attribute change', () => {
				_setModelData( model, '<paragraph><imageInline src="/assets/sample.png" alt="alt text"></imageInline></paragraph>' );
				const image = doc.getRoot().getChild( 0 ).getChild( 0 );

				model.change( writer => {
					writer.setAttribute( 'alt', 'new text', image );
				} );

				expect( _getViewData( view, { withoutSelection: true } ) ).to.equal(
					'<p><span class="ck-widget image-inline" contenteditable="false">' +
						'<img alt="new text" src="/assets/sample.png"></img>' +
					'</span></p>'
				);
			} );

			it( 'should convert attribute removal (but keeps an empty "alt" to the data)', () => {
				_setModelData( model, '<paragraph><imageInline src="/assets/sample.png" alt="alt text"></imageInline></paragraph>' );
				const image = doc.getRoot().getChild( 0 ).getChild( 0 );

				model.change( writer => {
					writer.removeAttribute( 'alt', image );
				} );

				expect( _getViewData( view, { withoutSelection: true } ) ).to.equal(
					'<p><span class="ck-widget image-inline" contenteditable="false"><img alt="" src="/assets/sample.png"></img></span></p>'
				);
			} );

			it( 'should not convert change if is already consumed', () => {
				_setModelData( model, '<paragraph><imageInline src="/assets/sample.png" alt="alt text"></imageInline></paragraph>' );
				const image = doc.getRoot().getChild( 0 ).getChild( 0 );

				editor.editing.downcastDispatcher.on( 'attribute:alt:imageInline', ( evt, data, conversionApi ) => {
					conversionApi.consumable.consume( data.item, 'attribute:alt' );
				}, { priority: 'high' } );

				model.change( writer => {
					writer.removeAttribute( 'alt', image );
				} );

				expect( _getViewData( view, { withoutSelection: true } ) ).to.equal(
					'<p><span class="ck-widget image-inline" contenteditable="false">' +
						'<img alt="alt text" src="/assets/sample.png"></img>' +
					'</span></p>'
				);
			} );

			it( 'should convert srcset attribute to srcset and sizes', () => {
				_setModelData( model,
					'<paragraph><imageInline ' +
						'src="/assets/sample.png" ' +
						'alt="alt text" ' +
						'srcset="small.png 148w, big.png 1024w">' +
					'</imageInline></paragraph>' );

				expect( _getViewData( view, { withoutSelection: true } ) ).to.equal(
					'<p><span class="ck-widget image-inline" contenteditable="false">' +
						'<img alt="alt text" sizes="100vw" src="/assets/sample.png" srcset="small.png 148w, big.png 1024w"></img>' +
					'</span></p>'
				);
			} );

			it( 'should not convert srcset attribute if has no data', () => {
				_setModelData( model,
					'<paragraph><imageInline ' +
						'src="/assets/sample.png" ' +
						'alt="alt text" ' +
						'srcset="">' +
					'</imageInline></paragraph>' );

				const image = doc.getRoot().getChild( 0 ).getChild( 0 );
				model.change( writer => {
					writer.removeAttribute( 'srcset', image );
				} );

				expect( _getViewData( view, { withoutSelection: true } ) ).to.equal(
					'<p><span class="ck-widget image-inline" contenteditable="false">' +
						'<img alt="alt text" src="/assets/sample.png"></img>' +
					'</span></p>'
				);
			} );

			it( 'should remove sizes and srcsset attribute when srcset attribute is removed from model', () => {
				_setModelData( model,
					'<paragraph>' +
						'<imageInline src="/assets/sample.png" srcset="small.png 148w, big.png 1024w" ></imageInline>' +
					'</paragraph>'
				);
				const image = doc.getRoot().getChild( 0 ).getChild( 0 );

				model.change( writer => {
					writer.removeAttribute( 'srcset', image );
				} );

				expect( _getViewData( view, { withoutSelection: true } ) ).to.equal(
					'<p><span class="ck-widget image-inline" contenteditable="false">' +
						'<img src="/assets/sample.png"></img>' +
					'</span></p>'
				);
			} );

			it( 'should not convert srcset attribute if is already consumed', () => {
				editor.editing.downcastDispatcher.on( 'attribute:srcset:imageInline', ( evt, data, conversionApi ) => {
					const modelImage = data.item;

					conversionApi.consumable.consume( modelImage, evt.name );
				}, { priority: 'high' } );

				_setModelData( model,
					'<paragraph><imageInline ' +
						'src="/assets/sample.png" ' +
						'alt="alt text" ' +
						'srcset="small.png 148w, big.png 1024w">' +
					'</imageInline></paragraph>'
				);

				expect( _getViewData( view, { withoutSelection: true } ) ).to.equal(
					'<p><span class="ck-widget image-inline" contenteditable="false">' +
						'<img alt="alt text" src="/assets/sample.png"></img>' +
					'</span></p>'
				);
			} );
		} );
	} );

	describe( 'integration with the clipboard pipeline', () => {
		let editorElement, editor, model, doc, view, viewDocument;

		beforeEach( async () => {
			editorElement = document.createElement( 'div' );
			document.body.appendChild( editorElement );

			editor = await ClassicTestEditor.create( editorElement, {
				plugins: [
					ImageInlineEditing,
					ImageBlockEditing,
					ImageCaption,
					ImageResizeEditing,
					Clipboard,
					LinkImage,
					Paragraph,
					LegacyListEditing
				]
			} );

			model = editor.model;
			doc = model.document;
			view = editor.editing.view;
			viewDocument = view.document;
		} );

		afterEach( async () => {
			await editor.destroy();
			editorElement.remove();
		} );

		it( 'should paste or drop a block image as inline in the middle of a non-empty paragraph', () => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => '<figure class="image"><img src="/assets/sample.png" /></figure>'
			} );

			_setModelData( model, '<paragraph>f[]oo</paragraph>' );

			viewDocument.fire( 'clipboardInput', { dataTransfer } );

			expect( _getModelData( model ) ).to.equal(
				'<paragraph>f<imageInline src="/assets/sample.png"></imageInline>[]oo</paragraph>'
			);
		} );

		it( 'should paste or drop a block image as inline in the empty list item', () => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => '<figure class="image"><img src="/assets/sample.png" /></figure>'
			} );

			_setModelData( model, '<listItem listType="bulleted" listIndent="0"></listItem>' );

			viewDocument.fire( 'clipboardInput', { dataTransfer } );

			expect( _getModelData( model ) ).to.equal(
				'<listItem listIndent="0" listType="bulleted">' +
					'<imageInline src="/assets/sample.png"></imageInline>[]' +
				'</listItem>'
			);
		} );

		it( 'should not work if there are elements other than block images in the pipeline data', () => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => '<figure class="image"><img src="/assets/sample.png?id=A" /></figure><img src="/assets/sample.png?id=B" />'
			} );

			_setModelData( model, '<paragraph>f[]oo</paragraph>' );

			viewDocument.fire( 'clipboardInput', { dataTransfer } );

			expect( _getModelData( model ) ).to.equal(
				'<paragraph>f</paragraph>' +
				'<imageBlock src="/assets/sample.png?id=A"></imageBlock>' +
				'<paragraph><imageInline src="/assets/sample.png?id=B"></imageInline>[]oo</paragraph>'
			);
		} );

		it( 'should use targetRanges from the data when present (when dropping)', () => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => '<figure class="image"><img src="/assets/sample.png" /></figure>'
			} );

			_setModelData( model, '<paragraph>[]</paragraph><paragraph>foo</paragraph>' );

			const targetRange = model.createRange( model.createPositionAt( doc.getRoot().getChild( 1 ), 1 ) );
			const targetViewRange = editor.editing.mapper.toViewRange( targetRange );
			const viewElement = viewDocument.getRoot().getChild( 1 );
			const domNode = view.domConverter.mapViewToDom( viewElement );

			viewDocument.fire( 'clipboardInput', {
				method: 'drop',
				domTarget: domNode,
				target: viewElement,
				dataTransfer,
				targetRanges: [ targetViewRange ],
				domEvent: sinon.spy()
			} );

			expect( _getModelData( model ) ).to.equal(
				'<paragraph></paragraph><paragraph>f<imageInline src="/assets/sample.png"></imageInline>[]oo</paragraph>'
			);
		} );

		it( 'should not interfere if dropped or pasted in the middle of a non-empty paragraph when the image has caption', () => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => '<figure class="image"><img src="/assets/sample.png" /><figcaption>abc</figcaption></figure>'
			} );

			_setModelData( model, '<paragraph>f[]oo</paragraph>' );

			viewDocument.fire( 'clipboardInput', { dataTransfer } );

			expect( _getModelData( model ) ).to.equal(
				'<paragraph>f</paragraph>' +
				'[<imageBlock src="/assets/sample.png"><caption>abc</caption></imageBlock>]' +
				'<paragraph>oo</paragraph>'
			);
		} );

		it( 'should not interfere if pasted or dropped in an empty paragraph', () => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => '<figure class="image"><img src="/assets/sample.png" /></figure>'
			} );

			_setModelData( model, '<paragraph>[]</paragraph>' );

			viewDocument.fire( 'clipboardInput', { dataTransfer } );

			expect( _getModelData( model ) ).to.equal(
				'[<imageBlock src="/assets/sample.png"></imageBlock>]'
			);
		} );

		it( 'should not interfere if pasted or dropped on another block widget', () => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => '<figure class="image"><img src="/assets/sample.png?id=A" /></figure>'
			} );

			_setModelData( model, '[<imageBlock src="/assets/sample.png?id=B"></imageBlock>]' );

			viewDocument.fire( 'clipboardInput', { dataTransfer } );

			expect( _getModelData( model ) ).to.equal(
				'[<imageBlock src="/assets/sample.png?id=A"></imageBlock>]'
			);
		} );

		it( 'should preserve image attributes (such as alt) when converting to an inline image', () => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => '<figure class="image"><img src="/assets/sample.png" alt="abc" /></figure>'
			} );

			_setModelData( model, '<paragraph>f[]oo</paragraph>' );

			viewDocument.fire( 'clipboardInput', { dataTransfer } );

			expect( _getModelData( model ) ).to.equal(
				'<paragraph>f<imageInline alt="abc" src="/assets/sample.png"></imageInline>[]oo</paragraph>'
			);
		} );

		it( 'should preserve image link when converting to an inline image (LinkImage integration)', () => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => '<figure class="image"><a href="https://cksource.com"><img src="/assets/sample.png" /></a></figure>'
			} );

			_setModelData( model, '<paragraph>f[]oo</paragraph>' );

			viewDocument.fire( 'clipboardInput', { dataTransfer } );

			expect( _getModelData( model ) ).to.equal(
				'<paragraph>f<imageInline linkHref="https://cksource.com" src="/assets/sample.png"></imageInline>[]oo</paragraph>'
			);
		} );

		it( 'should pass custom attributes present only on the figure when converting to an inline image', () => {
			model.schema.extend( 'imageInline', { allowAttributes: [ 'foo' ] } );
			editor.conversion.for( 'upcast' ).attributeToAttribute( { model: 'foo', view: 'foo' } );

			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => (
					'<figure class="image" foo="bar">' +
						'<img src="/assets/sample.png" />' +
					'</figure>'
				)
			} );

			_setModelData( model, '<paragraph>f[]oo</paragraph>' );
			viewDocument.fire( 'clipboardInput', { dataTransfer } );

			expect( _getModelData( model ) ).to.equal(
				'<paragraph>f<imageInline foo="bar" src="/assets/sample.png"></imageInline>[]oo</paragraph>'
			);
		} );

		it( 'should pass the style#width from figure when converting to an inline image (ImageResize integration)', () => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => (
					'<figure class="image image_resized" style="width:25%">' +
						'<img src="/assets/sample.png" />' +
					'</figure>'
				)
			} );

			_setModelData( model, '<paragraph>f[]oo</paragraph>' );
			viewDocument.fire( 'clipboardInput', { dataTransfer } );

			expect( _getModelData( model ) ).to.equal(
				'<paragraph>f<imageInline resizedWidth="25%" src="/assets/sample.png"></imageInline>[]oo</paragraph>'
			);
		} );

		it( 'should add image width and height on image paste', done => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => '<img src="/assets/sample.png" />'
			} );

			_setModelData( model, '<paragraph>f[]oo</paragraph>' );

			viewDocument.fire( 'clipboardInput', { dataTransfer, method: 'paste' } );

			setTimeout( () => {
				expect( _getModelData( model ) ).to.equal(
					'<paragraph>f<imageInline height="96" src="/assets/sample.png" width="96"></imageInline>[]oo</paragraph>'
				);

				done();
			}, 100 );
		} );

		it( 'should not add image width and height on image method other than paste', done => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => '<img src="/assets/sample.png" />'
			} );

			_setModelData( model, '<paragraph>f[]oo</paragraph>' );

			viewDocument.fire( 'clipboardInput', { dataTransfer, method: 'foo' } );

			setTimeout( () => {
				expect( _getModelData( model ) ).to.equal(
					'<paragraph>f<imageInline src="/assets/sample.png"></imageInline>[]oo</paragraph>'
				);

				done();
			}, 100 );
		} );
	} );

	describe( 'integration with the caption element', () => {
		let editorElement, editor, model, view;

		beforeEach( async () => {
			editorElement = document.createElement( 'div' );
			document.body.appendChild( editorElement );

			editor = await ClassicTestEditor.create( editorElement, {
				plugins: [
					ImageInlineEditing,
					ImageBlockEditing,
					ImageCaption,
					ImageResizeEditing,
					Clipboard,
					LinkImage,
					Paragraph,
					LegacyListEditing
				]
			} );

			model = editor.model;
			doc = model.document;
			view = editor.editing.view;
			viewDocument = view.document;
		} );

		afterEach( async () => {
			await editor.destroy();
			editorElement.remove();
		} );

		it( 'should disallow (nested) inline images inside the caption', () => {
			editor.setData(
				'<figure class="image">' +
					'<img src="/assets/sample.png" />' +
					'<figcaption>foo<img src="/assets/sample.png" />bar</figcaption>' +
				'</figure>'
			);

			expect( _getModelData( model, { withoutSelection: true } ) )
				.to.equal( '<imageBlock src="/assets/sample.png"><caption>foobar</caption></imageBlock>' );
		} );

		it( 'should disallow (nested) linked inline images inside the caption', () => {
			editor.setData(
				'<figure class="image">' +
					'<img src="/assets/sample.png" />' +
					'<figcaption>foo<a href="https://cksource.com"><img src="/assets/sample.png" /></a>bar</figcaption>' +
				'</figure>'
			);

			expect( _getModelData( model, { withoutSelection: true } ) )
				.to.equal( '<imageBlock src="/assets/sample.png"><caption>foobar</caption></imageBlock>' );
		} );

		it( 'should disallow pasting inline images into the caption', () => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => '<img src="/assets/sample.png" />'
			} );

			_setModelData( model, '<imageBlock src="/assets/sample.png"><caption>foo[]bar</caption></imageBlock>' );

			viewDocument.fire( 'clipboardInput', { dataTransfer } );

			expect( _getModelData( model ) ).to.equal(
				'<imageBlock src="/assets/sample.png"><caption>foo[]bar</caption></imageBlock>'
			);
		} );

		it( 'should disallow pasting linked inline images into the caption', () => {
			const dataTransfer = new ViewDataTransfer( {
				types: [ 'text/html' ],
				getData: () => '<a href="https://cksource.com"><img src="/assets/sample.png" /></a>'
			} );

			_setModelData( model, '<imageBlock src="/assets/sample.png"><caption>foo[]bar</caption></imageBlock>' );

			viewDocument.fire( 'clipboardInput', { dataTransfer } );

			expect( _getModelData( model ) ).to.equal(
				'<imageBlock src="/assets/sample.png"><caption>foo[]bar</caption></imageBlock>'
			);
		} );
	} );
} );
