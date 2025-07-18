/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { VirtualTestEditor } from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor.js';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph/src/paragraph.js';
import { ImageInlineEditing } from '@ckeditor/ckeditor5-image/src/image/imageinlineediting.js';
import { ShiftEnter } from '@ckeditor/ckeditor5-enter/src/shiftenter.js';
import { createElement } from '@ckeditor/ckeditor5-utils/src/dom/createelement.js';

import { _getModelData } from '../../../src/dev-utils/model.js';
import { getViewFillerOffset } from '../../../src/index.js';

// NOTE:
// dev utils' setData() loses white spaces so don't use it for tests here!!!
// https://github.com/ckeditor/ckeditor5-engine/issues/1428

describe( 'DomConverter – whitespace handling – integration', () => {
	let editor;

	// See https://github.com/ckeditor/ckeditor5-engine/issues/822.
	describe( 'normalizing whitespaces around block boundaries (#822)', () => {
		beforeEach( () => {
			return VirtualTestEditor
				.create( { plugins: [ Paragraph, ImageInlineEditing ] } )
				.then( newEditor => {
					editor = newEditor;

					editor.model.schema.extend( '$text', { allowAttributes: [ 'bold' ] } );
					editor.conversion.attributeToElement( { model: 'bold', view: 'b' } );
				} );
		} );

		afterEach( () => {
			return editor.destroy();
		} );

		it( 'new line at the end of the content is ignored', () => {
			editor.setData( '<p>foo</p>\n' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo</p>' );
		} );

		it( 'whitespaces at the end of the content are ignored', () => {
			editor.setData( '<p>foo</p>\n\r\n \t' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo</p>' );
		} );

		it( 'nbsp at the end of the content is not ignored', () => {
			editor.setData( '<p>foo&nbsp;</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo </paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo&nbsp;</p>' );
		} );

		it( 'new line at the beginning of the content is ignored', () => {
			editor.setData( '\n<p>foo</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo</p>' );
		} );

		it( 'whitespaces at the beginning of the content are ignored', () => {
			editor.setData( '\n\n \t<p>foo</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo</p>' );
		} );

		it( 'nbsp at the beginning of the content is not ignored', () => {
			editor.setData( '<p>&nbsp;foo</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph> foo</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>&nbsp;foo</p>' );
		} );

		it( 'new line between blocks is ignored', () => {
			editor.setData( '<p>foo</p>\n<p>bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo</paragraph><paragraph>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo</p><p>bar</p>' );
		} );

		it( 'whitespaces between blocks are ignored', () => {
			editor.setData( '<p>foo</p>\n\n \t<p>bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo</paragraph><paragraph>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo</p><p>bar</p>' );
		} );

		// Controversial result. See https://github.com/ckeditor/ckeditor5-engine/issues/987.
		// https://github.com/ckeditor/ckeditor5/pull/11744/files#r871377976.
		it( 'nbsp between blocks is ignored (between paragraphs)', () => {
			editor.setData( '<p>foo</p>&nbsp;<p>bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo</paragraph><paragraph>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo</p><p>bar</p>' );
		} );

		it( 'nbsp between blocks is ignored (different blocks)', () => {
			editor.model.schema.register( 'block', { inheritAllFrom: '$block' } );
			editor.conversion.elementToElement( { model: 'block', view: 'block' } );
			editor.setData( '<block>foo</block>&nbsp;<p>bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal(
					'<block>foo</block>' +
					'<paragraph>bar</paragraph>'
				);

			expect( editor.getData() )
				.to.equal(
					'<block>foo</block>' +
					'<p>bar</p>'
				);
		} );

		it( 'whitespaces between custom elements at block level are ignored', () => {
			editor.model.schema.register( 'custom-foo-element', {
				allowWhere: [ '$text', '$block' ],
				allowChildren: '$text',
				isInline: true
			} );
			editor.conversion.elementToElement( { model: 'custom-foo-element', view: 'custom-foo-element' } );
			editor.setData(
				'<p>foo</p>' +
				' <custom-foo-element>a</custom-foo-element>' +
				' <custom-foo-element>b</custom-foo-element>' +
				' <p>bar</p>'
			);

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal(
					'<paragraph>foo</paragraph>' +
					'<custom-foo-element>a</custom-foo-element>' +
					'<custom-foo-element>b</custom-foo-element>' +
					'<paragraph>bar</paragraph>'
				);

			expect( editor.getData() )
				.to.equal(
					'<p>foo</p>' +
					'<custom-foo-element>a</custom-foo-element>' +
					'<custom-foo-element>b</custom-foo-element>' +
					'<p>bar</p>'
				);
		} );

		it( 'new lines inside blocks are ignored', () => {
			editor.setData( '<p>\nfoo\n</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo</p>' );
		} );

		it( 'whitespaces inside blocks are ignored', () => {
			editor.setData( '<p>\n\n \tfoo\n\n \t</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo</p>' );
		} );

		it( 'nbsp inside blocks are not ignored', () => {
			editor.setData( '<p>&nbsp;foo&nbsp;</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph> foo </paragraph>' );

			expect( editor.getData() ).to.equal( '<p>&nbsp;foo&nbsp;</p>' );
		} );

		it( 'single nbsp inside blocks is ignored (NBSP block filler)', () => {
			editor.setData( '<p>&nbsp;</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph></paragraph>' );

			expect( editor.getData() ).to.equal( '' ); // trimmed
			expect( editor.getData( { trim: false } ) ).to.equal( '<p>&nbsp;</p>' );
		} );

		it( 'nbsp with spaces inside blocks is ignored (NBSP block filler)', () => {
			editor.setData( '<p>\n    &nbsp;\n  </p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph></paragraph>' );

			expect( editor.getData() ).to.equal( '' ); // trimmed
			expect( editor.getData( { trim: false } ) ).to.equal( '<p>&nbsp;</p>' );
		} );

		it( 'single nbsp inside blocks is ignored (marked NBSP block filler)', () => {
			editor.data.processor.useFillerType( 'marked' );

			editor.conversion.for( 'upcast' ).add( dispatcher => {
				dispatcher.on( 'element', ( evt, data ) => {
					expect( data.viewItem.name ).to.not.equal( 'span' );
				} );
			} );

			editor.setData( '<p><span data-cke-filler="true">&nbsp;</span></p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph></paragraph>' );

			expect( editor.getData() ).to.equal( '' ); // trimmed
			expect( editor.getData( { trim: false } ) ).to.equal( '<p><span data-cke-filler="true">&nbsp;</span></p>' );
		} );

		it( 'nbsp with spaces inside blocks are ignored (marked NBSP block filler)', () => {
			editor.data.processor.useFillerType( 'marked' );

			editor.conversion.for( 'upcast' ).add( dispatcher => {
				dispatcher.on( 'element', ( evt, data ) => {
					expect( data.viewItem.name ).to.not.equal( 'span' );
				} );
			} );

			editor.setData( '<p>\n    <span data-cke-filler="true">&nbsp;</span>\n  </p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph></paragraph>' );

			expect( editor.getData() ).to.equal( '' ); // trimmed
			expect( editor.getData( { trim: false } ) ).to.equal( '<p><span data-cke-filler="true">&nbsp;</span></p>' );
		} );

		it( 'all whitespaces together are ignored', () => {
			editor.setData( '\n<p>foo\n\r\n \t</p>\n<p> bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo</paragraph><paragraph>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo</p><p>bar</p>' );
		} );

		it( 'nbsp between inline elements is not ignored', () => {
			editor.setData( '<p><b>foo</b>&nbsp;<b>bar</b></p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph><$text bold="true">foo</$text>\u00A0<$text bold="true">bar</$text></paragraph>' );

			expect( editor.getData() ).to.equal( '<p><b>foo</b>&nbsp;<b>bar</b></p>' );
		} );

		it( 'nbsp before inline element is not ignored', () => {
			editor.setData( '<p>&nbsp;<b>bar</b></p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph> <$text bold="true">bar</$text></paragraph>' );

			expect( editor.getData() ).to.equal( '<p>&nbsp;<b>bar</b></p>' );
		} );

		it( 'nbsp after inline element is not ignored', () => {
			editor.setData( '<p><b>bar</b>&nbsp;</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph><$text bold="true">bar</$text> </paragraph>' );

			expect( editor.getData() ).to.equal( '<p><b>bar</b>&nbsp;</p>' );
		} );

		describe( 'around inline objects', () => {
			it( 'white space with text before empty inline object is not ignored', () => {
				editor.setData( '<p>foo <img src="/assets/sample.png"></p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>foo <imageInline src="/assets/sample.png"></imageInline></paragraph>' );

				expect( editor.getData() ).to.equal( '<p>foo <img src="/assets/sample.png"></p>' );
			} );

			it( 'white space with text after empty inline object is not ignored', () => {
				editor.setData( '<p><img src="/assets/sample.png" /> foo</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><imageInline src="/assets/sample.png"></imageInline> foo</paragraph>' );

				expect( editor.getData() ).to.equal( '<p><img src="/assets/sample.png"> foo</p>' );
			} );

			it( 'white spaces with text around empty inline object are not ignored', () => {
				editor.setData( '<p>foo <img src="/assets/sample.png"> bar</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>foo <imageInline src="/assets/sample.png"></imageInline> bar</paragraph>' );

				expect( editor.getData() ).to.equal( '<p>foo <img src="/assets/sample.png"> bar</p>' );
			} );

			it( 'white space before empty inline object is ignored', () => {
				editor.setData( '<p> <img src="/assets/sample.png"></p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><imageInline src="/assets/sample.png"></imageInline></paragraph>' );

				expect( editor.getData() ).to.equal( '<p><img src="/assets/sample.png"></p>' );
			} );

			it( 'white space after empty inline object is ignored', () => {
				editor.setData( '<p><img src="/assets/sample.png" /> </p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><imageInline src="/assets/sample.png"></imageInline></paragraph>' );

				expect( editor.getData() ).to.equal( '<p><img src="/assets/sample.png"></p>' );
			} );

			it( 'white spaces around empty inline object are ignored', () => {
				editor.setData( '<p> <img src="/assets/sample.png"> </p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><imageInline src="/assets/sample.png"></imageInline></paragraph>' );

				expect( editor.getData() ).to.equal( '<p><img src="/assets/sample.png"></p>' );
			} );

			it( 'nbsp before empty inline object is not ignored', () => {
				editor.setData( '<p>&nbsp;<img src="/assets/sample.png"></p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph> <imageInline src="/assets/sample.png"></imageInline></paragraph>' );

				expect( editor.getData() ).to.equal( '<p>&nbsp;<img src="/assets/sample.png"></p>' );
			} );

			it( 'nbsp after empty inline object is not ignored', () => {
				editor.setData( '<p><img src="/assets/sample.png" />&nbsp;</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><imageInline src="/assets/sample.png"></imageInline> </paragraph>' );

				expect( editor.getData() ).to.equal( '<p><img src="/assets/sample.png">&nbsp;</p>' );
			} );

			it( 'nbsp around empty inline object are not ignored', () => {
				editor.setData( '<p>&nbsp;<img src="/assets/sample.png">&nbsp;</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph> <imageInline src="/assets/sample.png"></imageInline> </paragraph>' );

				expect( editor.getData() ).to.equal( '<p>&nbsp;<img src="/assets/sample.png">&nbsp;</p>' );
			} );

			it( 'text+nbsp before empty inline object is not ignored', () => {
				editor.setData( '<p>foo&nbsp;<img src="/assets/sample.png"></p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>foo <imageInline src="/assets/sample.png"></imageInline></paragraph>' );

				expect( editor.getData() ).to.equal( '<p>foo <img src="/assets/sample.png"></p>' );
			} );

			it( 'nbsp+text after empty inline object is not ignored', () => {
				editor.setData( '<p><img src="/assets/sample.png" />&nbsp;foo</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><imageInline src="/assets/sample.png"></imageInline> foo</paragraph>' );

				expect( editor.getData() ).to.equal( '<p><img src="/assets/sample.png"> foo</p>' );
			} );

			it( 'text+nbsp or nbsp+text around empty inline object are not ignored', () => {
				editor.setData( '<p>foo&nbsp;<img src="/assets/sample.png">&nbsp;bar</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>foo <imageInline src="/assets/sample.png"></imageInline> bar</paragraph>' );

				expect( editor.getData() ).to.equal( '<p>foo <img src="/assets/sample.png"> bar</p>' );
			} );

			it( 'white space around inline object elements should not be trimmed', () => {
				editor.model.schema.register( 'button', {
					allowWhere: '$text',
					isInline: true,
					allowChildren: [ '$text' ]
				} );

				editor.conversion.elementToElement( {
					model: 'button',
					view: 'button'
				} );

				editor.setData( '<p>foo <button> Button </button> bar</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>foo <button>Button</button> bar</paragraph>' );

				expect( editor.getData() ).to.equal( '<p>foo <button>Button</button> bar</p>' );
			} );

			it( 'white spaces inside an inline object elements should be trimmed', () => {
				editor.model.schema.register( 'button', {
					allowWhere: '$text',
					isInline: true,
					allowChildren: [ '$text' ]
				} );

				editor.conversion.elementToElement( {
					model: 'button',
					view: 'button'
				} );

				editor.setData( '<p>foo <button>\n\t\t\t\t  Some   button  \n\t\t</button> bar</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>foo <button>Some button</button> bar</paragraph>' );

				expect( editor.getData() ).to.equal( '<p>foo <button>Some button</button> bar</p>' );
			} );

			it( 'white spaces inside a textarea (as inline object element) should not be trimmed', () => {
				editor.model.schema.register( 'textarea', {
					allowWhere: '$text',
					isInline: true,
					allowChildren: [ '$text' ]
				} );

				editor.conversion.elementToElement( {
					model: 'textarea',
					view: 'textarea'
				} );

				editor.setData( '<p>foo <textarea>\n\t\t\t\t  Some   textarea  \n\t\t</textarea> bar</p>' );

				// Note that the first \n is trimmed by the DOMParser.
				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>foo <textarea>\t\t\t\t  Some   textarea  \n\t\t</textarea> bar</paragraph>' );

				expect( editor.getData() ).to.equal( '<p>foo <textarea>\t\t\t\t  Some   textarea  \n\t\t</textarea> bar</p>' );
			} );

			it( 'white spaces around successive inline object elements should not be trimmed', () => {
				editor.model.schema.register( 'button', {
					allowWhere: '$text',
					isInline: true,
					allowChildren: [ '$text' ]
				} );

				editor.conversion.elementToElement( {
					model: 'button',
					view: 'button'
				} );

				editor.setData( '<p>foo <button> Button </button> <button> Another </button> bar</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>foo <button>Button</button> <button>Another</button> bar</paragraph>' );

				expect( editor.getData() ).to.equal( '<p>foo <button>Button</button> <button>Another</button> bar</p>' );
			} );

			it( 'white spaces around nested inline object elements should not be trimmed', () => {
				editor.model.schema.register( 'select', {
					allowWhere: '$text',
					isInline: true,
					allowChildren: [ 'optgroup' ],
					allowAttributes: [ 'name' ]
				} );

				editor.model.schema.register( 'optgroup', {
					allowWhere: 'select',
					isInline: true,
					allowChildren: [ 'option' ],
					allowAttributes: [ 'label' ]
				} );

				editor.model.schema.register( 'option', {
					allowWhere: 'optgroup',
					isInline: true,
					allowChildren: [ '$text' ],
					allowAttributes: [ 'value' ]
				} );

				editor.conversion.elementToElement( { model: 'select', view: 'select' } );
				editor.conversion.elementToElement( { model: 'optgroup', view: 'optgroup' } );
				editor.conversion.elementToElement( { model: 'option', view: 'option' } );
				editor.conversion.attributeToAttribute( { model: 'name', view: 'name' } );
				editor.conversion.attributeToAttribute( { model: 'label', view: 'label' } );
				editor.conversion.attributeToAttribute( { model: 'value', view: 'value' } );

				const initialData = '<p>select <select name="things">' +
						'<optgroup label="FoosAndBars">' +
							'<option value="foo"> Foo </option>' +
							'<option value="bar"> Bar </option>' +
						'</optgroup>' +
						'<optgroup label="letters">' +
							'<option value="a"> A </option>' +
							'<option value="b"> B </option>' +
						'</optgroup>' +
					'</select> with some text' +
				'</p>';

				editor.setData( initialData );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>select ' +
						'<select name="things">' +
							'<optgroup label="FoosAndBars">' +
								'<option value="foo">Foo</option>' +
								'<option value="bar">Bar</option>' +
							'</optgroup>' +
							'<optgroup label="letters">' +
								'<option value="a">A</option>' +
								'<option value="b">B</option>' +
							'</optgroup>' +
						'</select>' +
					' with some text</paragraph>' );

				expect( editor.getData() ).to.equal(
					'<p>select <select name="things">' +
							'<optgroup label="FoosAndBars">' +
								'<option value="foo">Foo</option>' +
								'<option value="bar">Bar</option>' +
							'</optgroup>' +
							'<optgroup label="letters">' +
								'<option value="a">A</option>' +
								'<option value="b">B</option>' +
							'</optgroup>' +
						'</select> with some text' +
					'</p>'
				);
			} );

			// All possible cases have been checked 👆. These are dummy tests only to verify this will work for all elements in the list.
			// Note: <img> is added by ImageInlineEditing plugin in the editor configuration.
			describe( 'detection of ViewDomConverter#inlineObjectElements', () => {
				const elements = [
					'object', 'iframe', 'input', 'button', 'textarea', 'select', 'option', 'video', 'embed', 'audio', 'canvas'
				];

				// Singletons don't have $text children.
				const singletons = [ 'input', 'embed' ];

				for ( const name of elements ) {
					it( `should work for the <${ name }> element`, () => {
						editor.model.schema.register( name, {
							allowWhere: '$text',
							isInline: true,
							allowChildren: singletons.includes( name ) ? [] : [ '$text' ]
						} );

						editor.conversion.elementToElement( {
							model: name,
							view: name
						} );

						if ( singletons.includes( name ) ) {
							editor.setData( `<p>foo <${ name }> bar</p>` );

							expect( _getModelData( editor.model, { withoutSelection: true } ) )
								.to.equal( `<paragraph>foo <${ name }></${ name }> bar</paragraph>` );

							expect( editor.getData() ).to.equal( `<p>foo <${ name }> bar</p>` );
						} else {
							editor.setData( `<p>foo <${ name }>foo</${ name }> bar</p>` );

							expect( _getModelData( editor.model, { withoutSelection: true } ) )
								.to.equal( `<paragraph>foo <${ name }>foo</${ name }> bar</paragraph>` );

							expect( editor.getData() ).to.equal( `<p>foo <${ name }>foo</${ name }> bar</p>` );
						}
					} );
				}
			} );
		} );

		describe( 'around custom inline objects', () => {
			beforeEach( () => {
				editor.model.schema.register( 'inlineObject', { inheritAllFrom: '$inlineObject' } );

				editor.conversion.for( 'upcast' ).elementToElement( {
					view: {
						name: 'span',
						classes: 'foo'
					},
					model: 'inlineObject'
				} );
				editor.conversion.for( 'downcast' ).elementToElement( {
					model: 'inlineObject',
					view: ( modelElement, { writer } ) => {
						const viewElement = writer.createContainerElement( 'span', { class: 'foo' } );

						viewElement.getFillerOffset = () => null;

						return viewElement;
					}
				} );

				editor.data.htmlProcessor.domConverter.registerInlineObjectMatcher( {
					name: 'span',
					classes: 'foo'
				} );
			} );

			it( 'white space with text before empty inline object is not ignored', () => {
				editor.setData( '<p>foo <span class="foo"></span></p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>foo <inlineObject></inlineObject></paragraph>' );

				expect( editor.getData() ).to.equal( '<p>foo <span class="foo"></span></p>' );
			} );

			it( 'white space with text after empty inline object is not ignored', () => {
				editor.setData( '<p><span class="foo"></span> foo</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><inlineObject></inlineObject> foo</paragraph>' );

				expect( editor.getData() ).to.equal( '<p><span class="foo"></span> foo</p>' );
			} );

			it( 'white spaces with text around empty inline object are not ignored', () => {
				editor.setData( '<p>foo <span class="foo"></span> bar</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>foo <inlineObject></inlineObject> bar</paragraph>' );

				expect( editor.getData() ).to.equal( '<p>foo <span class="foo"></span> bar</p>' );
			} );

			it( 'white space before empty inline object is ignored', () => {
				editor.setData( '<p> <span class="foo"></span></p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><inlineObject></inlineObject></paragraph>' );

				expect( editor.getData() ).to.equal( '<p><span class="foo"></span></p>' );
			} );

			it( 'white space after empty inline object is ignored', () => {
				editor.setData( '<p><span class="foo"></span> </p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><inlineObject></inlineObject></paragraph>' );

				expect( editor.getData() ).to.equal( '<p><span class="foo"></span></p>' );
			} );

			it( 'white spaces around empty inline object are ignored', () => {
				editor.setData( '<p> <span class="foo"></span> </p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><inlineObject></inlineObject></paragraph>' );

				expect( editor.getData() ).to.equal( '<p><span class="foo"></span></p>' );
			} );

			it( 'nbsp before empty inline object is not ignored', () => {
				editor.setData( '<p>&nbsp;<span class="foo"></span></p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph> <inlineObject></inlineObject></paragraph>' );

				expect( editor.getData() ).to.equal( '<p>&nbsp;<span class="foo"></span></p>' );
			} );

			it( 'nbsp after empty inline object is not ignored', () => {
				editor.setData( '<p><span class="foo"></span>&nbsp;</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><inlineObject></inlineObject> </paragraph>' );

				expect( editor.getData() ).to.equal( '<p><span class="foo"></span>&nbsp;</p>' );
			} );

			it( 'nbsp around empty inline object are not ignored', () => {
				editor.setData( '<p>&nbsp;<span class="foo"></span>&nbsp;</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph> <inlineObject></inlineObject> </paragraph>' );

				expect( editor.getData() ).to.equal( '<p>&nbsp;<span class="foo"></span>&nbsp;</p>' );
			} );

			it( 'text+nbsp before empty inline object is not ignored', () => {
				editor.setData( '<p>foo&nbsp;<span class="foo"></span></p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>foo <inlineObject></inlineObject></paragraph>' );

				expect( editor.getData() ).to.equal( '<p>foo <span class="foo"></span></p>' );
			} );

			it( 'nbsp+text after empty inline object is not ignored', () => {
				editor.setData( '<p><span class="foo"></span>&nbsp;foo</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph><inlineObject></inlineObject> foo</paragraph>' );

				expect( editor.getData() ).to.equal( '<p><span class="foo"></span> foo</p>' );
			} );

			it( 'text+nbsp or nbsp+text around empty inline object are not ignored', () => {
				editor.setData( '<p>foo&nbsp;<span class="foo"></span>&nbsp;bar</p>' );

				expect( _getModelData( editor.model, { withoutSelection: true } ) )
					.to.equal( '<paragraph>foo <inlineObject></inlineObject> bar</paragraph>' );

				expect( editor.getData() ).to.equal( '<p>foo <span class="foo"></span> bar</p>' );
			} );
		} );

		it( 'around dataPipeline:transparentRendering objects', () => {
			editor.model.schema.register( 'inlineObject', { inheritAllFrom: '$inlineObject' } );

			function converter( isData ) {
				return ( modelElement, { writer } ) => {
					const viewElement = writer.createContainerElement( 'span' );

					if ( isData ) {
						writer.setCustomProperty( 'dataPipeline:transparentRendering', true, viewElement );
						writer.insert( writer.createPositionAt( viewElement, 0 ), writer.createText( 'XXX' ) );
					}

					return viewElement;
				};
			}

			editor.conversion.for( 'editingDowncast' ).elementToElement( {
				model: 'inlineObject',
				view: converter( false )
			} );

			editor.conversion.for( 'dataDowncast' ).elementToElement( {
				model: 'inlineObject',
				view: converter( true )
			} );

			editor.model.change( writer => {
				const p = editor.model.document.getRoot().getChild( 0 );

				writer.insertText( 'Foo ', p, 'end' );
				writer.insertElement( 'inlineObject', p, 'end' );
				writer.insertText( ' bar', p, 'end' );
			} );

			expect( editor.getData() ).to.equal( '<p>Foo XXX bar</p>' );
		} );

		it( 'in preformatted blocks', () => {
			editor.model.schema.register( 'pre', { inheritAllFrom: '$block' } );
			editor.conversion.elementToElement( { model: 'pre', view: 'pre' } );

			editor.setData( '<pre>    foo\n    bar\n    </pre>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<pre>    foo\n    bar\n    </pre>' );

			expect( editor.getData() ).to.equal( '<pre>    foo\n    bar\n    </pre>' );
		} );

		describe( 'in elements that contain preformatted whitespace using the white-space CSS property', () => {
			const preserveWhiteSpaceValues = [ 'pre', 'pre-wrap', 'break-spaces' ];
			const collapseWhiteSpaceValues = [ 'normal', 'nowrap', 'pre-line', 'unset', 'revert' ];

			it( 'which is the direct ancestor', () => {
				for ( const preserveWhiteSpace of preserveWhiteSpaceValues ) {
					editor.setData(
						`<span style="white-space: ${ preserveWhiteSpace };">` +
							'    foo    bar    ' +
						'</span>'
					);

					expect( _getModelData( editor.model, { withoutSelection: true } ) )
						.to.equal( '<paragraph>    foo    bar    </paragraph>' );

					expect( editor.getData() )
						.to.equal( '<p>&nbsp; &nbsp; foo &nbsp; &nbsp;bar &nbsp; &nbsp;</p>' );
				}
			} );

			it( 'which is the indirect ancestor', () => {
				for ( const preserveWhiteSpace of preserveWhiteSpaceValues ) {
					editor.setData(
						`<span style="white-space: ${ preserveWhiteSpace };">` +
							'<span><span>    foo    bar    </span></span>' +
						'</span>'
					);

					expect( _getModelData( editor.model, { withoutSelection: true } ) )
						.to.equal( '<paragraph>    foo    bar    </paragraph>' );

					expect( editor.getData() )
						.to.equal( '<p>&nbsp; &nbsp; foo &nbsp; &nbsp;bar &nbsp; &nbsp;</p>' );
				}
			} );

			it( 'in a block that overwrites the white-space of its parent', () => {
				for ( const collapseWhiteSpace of collapseWhiteSpaceValues ) {
					for ( const preserveWhiteSpace of preserveWhiteSpaceValues ) {
						editor.setData(
							`<span style="white-space: ${ collapseWhiteSpace };">` +
								`<span style="white-space: ${ preserveWhiteSpace }">` +
									'    foo    bar    ' +
								'</span>' +
							'</span>'
						);

						expect( _getModelData( editor.model, { withoutSelection: true } ) )
							.to.equal( '<paragraph>    foo    bar    </paragraph>' );

						expect( editor.getData() )
							.to.equal( '<p>&nbsp; &nbsp; foo &nbsp; &nbsp;bar &nbsp; &nbsp;</p>' );
					}
				}
			} );

			it( 'which contains a child that resets it back to not preformatted', () => {
				for ( const preserveWhiteSpace of preserveWhiteSpaceValues ) {
					for ( const collapseWhiteSpace of collapseWhiteSpaceValues ) {
						editor.setData(
							`<span style="white-space: ${ preserveWhiteSpace };">` +
								`<span style="white-space: ${ collapseWhiteSpace }">` +
									'    foo    bar    ' +
								'</span>' +
							'</span>'
						);

						expect( _getModelData( editor.model, { withoutSelection: true } ) )
							.to.equal( '<paragraph>foo bar</paragraph>' );

						expect( editor.getData() )
							.to.equal( '<p>foo bar</p>' );
					}
				}
			} );

			it( 'which contains a block containing white-space: inherit', () => {
				for ( const preserveWhiteSpace of preserveWhiteSpaceValues ) {
					editor.setData(
						`<span style="white-space: ${ preserveWhiteSpace };">` +
							'<span style="white-space: inherit">' +
								'    foo    bar    ' +
							'</span>' +
						'</span>'
					);

					expect( _getModelData( editor.model, { withoutSelection: true } ) )
						.to.equal( '<paragraph>    foo    bar    </paragraph>' );

					expect( editor.getData() )
						.to.equal( '<p>&nbsp; &nbsp; foo &nbsp; &nbsp;bar &nbsp; &nbsp;</p>' );
				}
			} );

			it( 'a surrounding <pre> will take precedence over an element that sets white-space to collapse', () => {
				for ( const collapseWhiteSpace of collapseWhiteSpaceValues ) {
					editor.setData(
						'<pre>' +
							`<span style="white-space: ${ collapseWhiteSpace };">` +
								'    foo    bar    ' +
							'</span>' +
						'</pre>'
					);

					expect( _getModelData( editor.model, { withoutSelection: true } ) )
						.to.equal( '<paragraph>    foo    bar    </paragraph>' );

					expect( editor.getData() )
						.to.equal( '<p>&nbsp; &nbsp; foo &nbsp; &nbsp;bar &nbsp; &nbsp;</p>' );
				}
			} );
		} );

		it( 'in nested blocks', () => {
			editor.model.schema.register( 'ul', { inheritAllFrom: '$block', allowIn: 'li' } );
			editor.model.schema.register( 'li', { inheritAllFrom: '$block', allowIn: 'ul' } );
			editor.conversion.elementToElement( { model: 'ul', view: 'ul' } );
			editor.conversion.elementToElement( { model: 'li', view: 'li' } );

			editor.setData( `
				<ul>
					<li>1
						<ul>
							<li>2</li>
						</ul>
					</li>
				</ul>
			` );

			expect( _getModelData( editor.model, { withoutSelection: true } ) ).to.equal(
				'<ul>' +
					'<li>1' +
						'<ul>' +
							'<li>2</li>' +
						'</ul>' +
					'</li>' +
				'</ul>'
			);

			expect( editor.getData() ).to.equal(
				'<ul>' +
					'<li>1' +
						'<ul>' +
							'<li>2</li>' +
						'</ul>' +
					'</li>' +
				'</ul>'
			);
		} );

		describe( 'text nodes parse and stringify', () => {
			function testTexts( inputTexts, processedText, outputText ) {
				if ( typeof inputTexts == 'string' ) {
					inputTexts = [ inputTexts ];
				}

				outputText = outputText !== undefined ? outputText : inputTexts.join( '' );

				it( `spaces in a text node: "${ inputTexts.join( '|' ) }" -> "${ processedText }" -> "${ outputText }"`, () => {
					const domElement = createElement( document, 'p', {}, [] );

					for ( const text of inputTexts ) {
						domElement.appendChild( document.createTextNode( text.replace( /_/g, '\u00A0' ) ) );
					}

					const viewElement = editor.data.processor.domConverter.domToView( domElement );
					let viewData = '';

					viewElement.getFillerOffset = getViewFillerOffset;

					for ( const child of viewElement.getChildren() ) {
						viewData += child.data.replace( /\u00A0/g, '_' );
					}

					expect( viewData, 'processed' ).to.equal( processedText );

					const outputDomElement = editor.data.processor.domConverter.viewToDom( viewElement );

					expect( outputDomElement.innerHTML.replace( /&nbsp;/g, '_' ), 'output' ).to.equal( outputText );
				} );
			}

			// Block filler.
			testTexts( '_', '', '_' );
			testTexts( ' _ ', '', '_' );
			testTexts( '  _  ', '', '_' );

			// At the beginning.
			testTexts( '_x', ' x' );
			testTexts( '_ x', '  x' );
			testTexts( '_ _x', '   x' );
			testTexts( '_ _ x', '    x' );

			// At the end.
			testTexts( 'x_', 'x ' );
			testTexts( 'x _', 'x  ' );
			testTexts( 'x __', 'x   ' );
			testTexts( 'x _ _', 'x    ' );

			// In the middle.
			testTexts( 'x x', 'x x' );
			testTexts( 'x _x', 'x  x' );
			testTexts( 'x _ x', 'x   x' );
			testTexts( 'x _ _x', 'x    x' );

			// Complex.
			testTexts( '_x_', ' x ' );
			testTexts( '_ x _x _', '  x  x  ' );
			testTexts( '_ _x x _', '   x x  ' );
			testTexts( '_ _x x __', '   x x   ' );
			testTexts( '_ _x _ _x_', '   x    x ' );

			// With hard &nbsp;
			testTexts( '_x', ' x' );
			testTexts( '__x', ' _x' );
			testTexts( '___x', ' __x' );
			testTexts( '__ x', ' _ x' );

			testTexts( 'x_', 'x ' );
			testTexts( 'x__', 'x_ ' );
			testTexts( 'x___', 'x__ ' );

			testTexts( 'x_x', 'x_x' );
			testTexts( 'x___x', 'x___x' );
			testTexts( 'x____x', 'x____x' );
			testTexts( 'x__ x', 'x__ x' );
			testTexts( 'x___ x', 'x___ x' );
			testTexts( 'x_ _x', 'x_  x' );
			testTexts( 'x __x', 'x  _x' );
			testTexts( 'x _ x', 'x   x' );
			testTexts( 'x __ _x', 'x  _  x' );

			// Two text nodes.
			testTexts( [ 'x', 'y' ], 'xy' );
			testTexts( [ 'x ', 'y' ], 'x y' );
			testTexts( [ 'x _', 'y' ], 'x  y' );
			testTexts( [ 'x __', 'y' ], 'x   y' );
			testTexts( [ 'x _  _', 'y' ], 'x    y', 'x _ _y' );

			testTexts( [ 'x', ' y' ], 'x y' );
			testTexts( [ 'x_', ' y' ], 'x  y' );
			testTexts( [ 'x _', ' y' ], 'x   y' );
			testTexts( [ 'x __', ' y' ], 'x    y' );
			testTexts( [ 'x _ _', ' y' ], 'x     y' );

			testTexts( [ 'x', ' _y' ], 'x  y' );
			testTexts( [ 'x_', ' _y' ], 'x   y' );
			testTexts( [ 'x _', ' _y' ], 'x    y' );
			testTexts( [ 'x __', ' _y' ], 'x     y' );
			testTexts( [ 'x _ _', ' _y' ], 'x      y' );

			// Some tests with hard &nbsp;
			testTexts( [ 'x', '_y' ], 'x_y' );
			testTexts( [ 'x_', 'y' ], 'x_y' );
			testTexts( [ 'x__', ' y' ], 'x_  y' );
			testTexts( [ 'x_ _', ' y' ], 'x_   y' );
		} );
	} );

	// https://github.com/ckeditor/ckeditor5/issues/1024
	describe( 'whitespaces around <br>s', () => {
		beforeEach( () => {
			return VirtualTestEditor
				.create( { plugins: [ Paragraph, ShiftEnter ] } )
				.then( newEditor => {
					editor = newEditor;
				} );
		} );

		afterEach( () => {
			return editor.destroy();
		} );

		it( 'single spaces around <br> #1', () => {
			editor.setData( '<p>foo&nbsp;<br>&nbsp;bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo\u00A0<softBreak></softBreak> bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo&nbsp;<br>&nbsp;bar</p>' );
		} );

		it( 'single spaces around <br> #2', () => {
			editor.setData( '<p>foo&nbsp;<br> bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo\u00A0<softBreak></softBreak>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo&nbsp;<br>bar</p>' );
		} );

		it( 'two spaces before a <br>', () => {
			editor.setData( '<p>foo &nbsp;<br>bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo  <softBreak></softBreak>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo &nbsp;<br>bar</p>' );
		} );

		it( 'two nbsps before a <br>', () => {
			editor.setData( '<p>foo&nbsp;&nbsp;<br>bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo\u00a0 <softBreak></softBreak>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo&nbsp;&nbsp;<br>bar</p>' );
		} );

		it( 'single space after a <br>', () => {
			editor.setData( '<p>foo<br>&nbsp;bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo<softBreak></softBreak> bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo<br>&nbsp;bar</p>' );
		} );

		it( 'single space after a <br> (normalization)', () => {
			editor.setData( '<p>foo<br> bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo<softBreak></softBreak>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo<br>bar</p>' );
		} );

		it( 'two spaces after a <br>', () => {
			editor.setData( '<p>foo<br>&nbsp; bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo<softBreak></softBreak>  bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo<br>&nbsp; bar</p>' );
		} );

		it( 'two spaces after a <br> (normalization)', () => {
			editor.setData( '<p>foo<br> &nbsp;bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo<softBreak></softBreak> bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo<br>&nbsp;bar</p>' );
		} );

		it( 'two spaces after a <br> (normalization to a model nbsp)', () => {
			editor.setData( '<p>foo<br>&nbsp;&nbsp;bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo<softBreak></softBreak> \u00a0bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo<br>&nbsp;&nbsp;bar</p>' );
		} );

		// https://github.com/ckeditor/ckeditor5-engine/issues/1429
		// it( 'space between <br>s', () => {
		// 	editor.setData( '<p>foo<br>&nbsp;<br>bar</p>' );

		// 	expect( _getModelData( editor.model, { withoutSelection: true } ) )
		// 		.to.equal( '<paragraph>foo<softBreak></softBreak> <softBreak></softBreak>bar</paragraph>' );

		// 	expect( editor.getData() ).to.equal( '<p>foo<br>&nbsp;<br>bar</p>' );
		// } );

		it( 'space between <br>s (normalization)', () => {
			editor.setData( '<p>foo<br> <br>bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo<softBreak></softBreak><softBreak></softBreak>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo<br><br>bar</p>' );
		} );

		it( 'two spaces between <br>s', () => {
			editor.setData( '<p>foo<br>&nbsp;&nbsp;<br>bar</p>' );

			expect( _getModelData( editor.model, { withoutSelection: true } ) )
				.to.equal( '<paragraph>foo<softBreak></softBreak>  <softBreak></softBreak>bar</paragraph>' );

			expect( editor.getData() ).to.equal( '<p>foo<br>&nbsp;&nbsp;<br>bar</p>' );
		} );
	} );
} );
