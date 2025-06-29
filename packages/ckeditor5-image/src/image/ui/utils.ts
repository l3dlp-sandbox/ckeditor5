/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module image/image/ui/utils
 */

import type { DomOptimalPositionOptions } from 'ckeditor5/src/utils.js';
import type { Editor } from 'ckeditor5/src/core.js';
import { BalloonPanelView, type ContextualBalloon } from 'ckeditor5/src/ui.js';

import { type ImageUtils } from '../../imageutils.js';

/**
 * A helper utility that positions the
 * {@link module:ui/panel/balloon/contextualballoon~ContextualBalloon contextual balloon} instance
 * with respect to the image in the editor content, if one is selected.
 *
 * @param editor The editor instance.
 * @internal
 */
export function repositionContextualBalloon( editor: Editor ): void {
	const balloon: ContextualBalloon = editor.plugins.get( 'ContextualBalloon' );
	const imageUtils: ImageUtils = editor.plugins.get( 'ImageUtils' );

	if ( imageUtils.getClosestSelectedImageWidget( editor.editing.view.document.selection ) ) {
		const position = getBalloonPositionData( editor );

		balloon.updatePosition( position );
	}
}

/**
 * Returns the positioning options that control the geometry of the
 * {@link module:ui/panel/balloon/contextualballoon~ContextualBalloon contextual balloon} with respect
 * to the selected element in the editor content.
 *
 * @param editor The editor instance.
 * @internal
 */
export function getBalloonPositionData( editor: Editor ): Partial<DomOptimalPositionOptions> {
	const editingView = editor.editing.view;
	const defaultPositions = BalloonPanelView.defaultPositions;
	const imageUtils: ImageUtils = editor.plugins.get( 'ImageUtils' );

	return {
		target: editingView.domConverter.mapViewToDom(
			imageUtils.getClosestSelectedImageWidget( editingView.document.selection )!
		) as HTMLElement,
		positions: [
			defaultPositions.northArrowSouth,
			defaultPositions.northArrowSouthWest,
			defaultPositions.northArrowSouthEast,
			defaultPositions.southArrowNorth,
			defaultPositions.southArrowNorthWest,
			defaultPositions.southArrowNorthEast,
			defaultPositions.viewportStickyNorth
		]
	};
}
