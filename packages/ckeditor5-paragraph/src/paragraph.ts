/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module paragraph/paragraph
 */

import { ParagraphCommand } from './paragraphcommand.js';
import { InsertParagraphCommand } from './insertparagraphcommand.js';

import { Plugin } from '@ckeditor/ckeditor5-core';

/**
 * The paragraph feature for the editor.
 *
 * It introduces the `<paragraph>` element in the model which renders as a `<p>` element in the DOM and data.
 *
 * It also brings two editors commands:
 *
 * * The {@link module:paragraph/paragraphcommand~ParagraphCommand `'paragraph'`} command that converts all
 * blocks in the model selection into paragraphs.
 * * The {@link module:paragraph/insertparagraphcommand~InsertParagraphCommand `'insertParagraph'`} command
 * that inserts a new paragraph at a specified location in the model.
 */
export class Paragraph extends Plugin {
	/**
	 * @inheritDoc
	 */
	public static get pluginName() {
		return 'Paragraph' as const;
	}

	/**
	 * @inheritDoc
	 */
	public static override get isOfficialPlugin(): true {
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public init(): void {
		const editor = this.editor;
		const model = editor.model;

		editor.commands.add( 'paragraph', new ParagraphCommand( editor ) );
		editor.commands.add( 'insertParagraph', new InsertParagraphCommand( editor ) );

		// Schema.
		model.schema.register( 'paragraph', { inheritAllFrom: '$block' } );

		editor.conversion.elementToElement( { model: 'paragraph', view: 'p' } );

		// Conversion for paragraph-like elements which has not been converted by any plugin.
		editor.conversion.for( 'upcast' ).elementToElement( {
			model: ( viewElement, { writer } ) => {
				if ( !Paragraph.paragraphLikeElements.has( viewElement.name ) ) {
					return null;
				}

				// Do not auto-paragraph empty elements.
				if ( viewElement.isEmpty ) {
					return null;
				}

				return writer.createElement( 'paragraph' );
			},
			view: /.+/,
			converterPriority: 'low'
		} );
	}

	/**
	 * A list of element names which should be treated by the autoparagraphing algorithms as
	 * paragraph-like. This means that e.g. the following content:
	 *
	 * ```html
	 * <h1>Foo</h1>
	 * <table>
	 *   <tr>
	 *     <td>X</td>
	 *     <td>
	 *       <ul>
	 *         <li>Y</li>
	 *         <li>Z</li>
	 *       </ul>
	 *     </td>
	 *   </tr>
	 * </table>
	 * ```
	 *
	 * contains five paragraph-like elements: `<h1>`, two `<td>`s and two `<li>`s.
	 * Hence, if none of the features is going to convert those elements the above content will be automatically handled
	 * by the paragraph feature and converted to:
	 *
	 * ```html
	 * <p>Foo</p>
	 * <p>X</p>
	 * <p>Y</p>
	 * <p>Z</p>
	 * ```
	 *
	 * Note: The `<td>` containing two `<li>` elements was ignored as the innermost paragraph-like elements
	 * have a priority upon conversion.
	 */
	public static paragraphLikeElements = new Set( [
		'blockquote',
		'dd',
		'div',
		'dt',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'li',
		'p',
		'td',
		'th'
	] );
}
