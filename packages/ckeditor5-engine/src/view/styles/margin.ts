/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module engine/view/styles/margin
 */

import type { StylesProcessor } from '../stylesmap.js';
import { getPositionStyleShorthandNormalizer, getBoxSidesStyleValueReducer } from './utils.js';

/**
 * Adds a margin CSS styles processing rules.
 *
 * ```ts
 * editor.data.addStyleProcessorRules( addMarginStylesRules );
 * ```
 *
 * The normalized value is stored as:
 *
 * ```ts
 * const styles = {
 * 	margin: {
 * 		top,
 * 		right,
 * 		bottom,
 * 		left
 * 	}
 * };
 * ```
 */
export function addMarginStylesRules( stylesProcessor: StylesProcessor ): void {
	stylesProcessor.setNormalizer( 'margin', getPositionStyleShorthandNormalizer( 'margin' ) );

	stylesProcessor.setNormalizer( 'margin-top', value => ( { path: 'margin.top', value } ) );
	stylesProcessor.setNormalizer( 'margin-right', value => ( { path: 'margin.right', value } ) );
	stylesProcessor.setNormalizer( 'margin-bottom', value => ( { path: 'margin.bottom', value } ) );
	stylesProcessor.setNormalizer( 'margin-left', value => ( { path: 'margin.left', value } ) );

	stylesProcessor.setReducer( 'margin', getBoxSidesStyleValueReducer( 'margin' ) );

	stylesProcessor.setStyleRelation( 'margin', [ 'margin-top', 'margin-right', 'margin-bottom', 'margin-left' ] );
}
