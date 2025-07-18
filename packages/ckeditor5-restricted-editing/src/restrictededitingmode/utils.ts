/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import type { Editor } from 'ckeditor5/src/core.js';
import type { ModelDocumentSelection, Marker, ModelPosition, ModelRange } from 'ckeditor5/src/engine.js';

/**
 * @module restricted-editing/restrictededitingmode/utils
 */

/**
 * Returns a single "restricted-editing-exception" marker at a given position. Contrary to
 * {@link module:engine/model/markercollection~MarkerCollection#getMarkersAtPosition}, it returnd a marker also when the postion is
 * equal to one of the marker's start or end positions.
 *
 * @internal
 */
export function getMarkerAtPosition( editor: Editor, position: ModelPosition ): Marker | undefined {
	for ( const marker of editor.model.markers ) {
		const markerRange = marker.getRange();

		if ( isPositionInRangeBoundaries( markerRange, position ) ) {
			if ( marker.name.startsWith( 'restrictedEditingException:' ) ) {
				return marker;
			}
		}
	}
}

/**
 * Checks if the position is fully contained in the range. Positions equal to range start or end are considered "in".
 *
 * @internal
 */
export function isPositionInRangeBoundaries( range: ModelRange, position: ModelPosition ): boolean {
	return (
		range.containsPosition( position ) ||
		range.end.isEqual( position ) ||
		range.start.isEqual( position )
	);
}

/**
 * Checks if the selection is fully contained in the marker. Positions on marker boundaries are considered "in".
 *
 * ```xml
 * <marker>[]foo</marker> -> true
 * <marker>f[oo]</marker> -> true
 * <marker>f[oo</marker> ba]r -> false
 * <marker>foo</marker> []bar -> false
 * ```
 *
 * @internal
 */
export function isSelectionInMarker( selection: ModelDocumentSelection, marker?: Marker ): boolean {
	if ( !marker ) {
		return false;
	}

	const markerRange = marker.getRange();

	if ( selection.isCollapsed ) {
		return isPositionInRangeBoundaries( markerRange, selection.focus! );
	}

	return markerRange.containsRange( selection.getFirstRange()!, true );
}
