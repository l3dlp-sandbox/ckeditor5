/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module font/fontbackgroundcolor/fontbackgroundcolorediting
 */

import { Plugin, type Editor } from 'ckeditor5/src/core.js';
import { addBackgroundStylesRules } from 'ckeditor5/src/engine.js';

import { FontBackgroundColorCommand } from './fontbackgroundcolorcommand.js';
import { FONT_BACKGROUND_COLOR, renderDowncastElement, renderUpcastAttribute } from '../utils.js';

/**
 * The font background color editing feature.
 *
 * It introduces the {@link module:font/fontbackgroundcolor/fontbackgroundcolorcommand~FontBackgroundColorCommand command} and
 * the `fontBackgroundColor` attribute in the {@link module:engine/model/model~Model model} which renders
 * in the {@link module:engine/view/view view} as a `<span>` element (`<span style="background-color: ...">`),
 * depending on the {@link module:font/fontconfig~FontColorConfig configuration}.
 */
export class FontBackgroundColorEditing extends Plugin {
	/**
	 * @inheritDoc
	 */
	public static get pluginName() {
		return 'FontBackgroundColorEditing' as const;
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
	constructor( editor: Editor ) {
		super( editor );

		editor.config.define( FONT_BACKGROUND_COLOR, {
			colors: [
				{
					color: 'hsl(0, 0%, 0%)',
					label: 'Black'
				},
				{
					color: 'hsl(0, 0%, 30%)',
					label: 'Dim grey'
				},
				{
					color: 'hsl(0, 0%, 60%)',
					label: 'Grey'
				},
				{
					color: 'hsl(0, 0%, 90%)',
					label: 'Light grey'
				},
				{
					color: 'hsl(0, 0%, 100%)',
					label: 'White',
					hasBorder: true
				},
				{
					color: 'hsl(0, 75%, 60%)',
					label: 'Red'
				},
				{
					color: 'hsl(30, 75%, 60%)',
					label: 'Orange'
				},
				{
					color: 'hsl(60, 75%, 60%)',
					label: 'Yellow'
				},
				{
					color: 'hsl(90, 75%, 60%)',
					label: 'Light green'
				},
				{
					color: 'hsl(120, 75%, 60%)',
					label: 'Green'
				},
				{
					color: 'hsl(150, 75%, 60%)',
					label: 'Aquamarine'
				},
				{
					color: 'hsl(180, 75%, 60%)',
					label: 'Turquoise'
				},
				{
					color: 'hsl(210, 75%, 60%)',
					label: 'Light blue'
				},
				{
					color: 'hsl(240, 75%, 60%)',
					label: 'Blue'
				},
				{
					color: 'hsl(270, 75%, 60%)',
					label: 'Purple'
				}
			],
			columns: 5
		} );

		editor.data.addStyleProcessorRules( addBackgroundStylesRules );
		editor.conversion.for( 'upcast' ).elementToAttribute( {
			view: {
				name: 'span',
				styles: {
					'background-color': /[\s\S]+/
				}
			},
			model: {
				key: FONT_BACKGROUND_COLOR,
				value: renderUpcastAttribute( 'background-color' )
			}
		} );

		editor.conversion.for( 'downcast' ).attributeToElement( {
			model: FONT_BACKGROUND_COLOR,
			view: renderDowncastElement( 'background-color' )
		} );

		editor.commands.add( FONT_BACKGROUND_COLOR, new FontBackgroundColorCommand( editor ) );

		// Allow the font backgroundColor attribute on text nodes.
		editor.model.schema.extend( '$text', { allowAttributes: FONT_BACKGROUND_COLOR } );

		editor.model.schema.setAttributeProperties( FONT_BACKGROUND_COLOR, {
			isFormatting: true,
			copyOnEnter: true
		} );
	}
}
