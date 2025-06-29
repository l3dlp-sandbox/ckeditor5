/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { type ModelNode } from '../node.js';
import { type ModelPosition } from '../position.js';
import { type ModelSchema } from '../schema.js';
import { type ModelWriter } from '../writer.js';

/**
 * @module engine/model/utils/autoparagraphing
 */

/**
 * Fixes all empty roots.
 *
 * @internal
 * @param writer The model writer.
 * @returns `true` if any change has been applied, `false` otherwise.
 */
export function autoParagraphEmptyRoots( writer: ModelWriter ): boolean {
	const { schema, document } = writer.model;

	for ( const root of document.getRoots() ) {
		if ( root.isEmpty && !schema.checkChild( root, '$text' ) ) {
			// If paragraph element is allowed in the root, create paragraph element.
			if ( schema.checkChild( root, 'paragraph' ) ) {
				writer.insertElement( 'paragraph', root );

				// Other roots will get fixed in the next post-fixer round. Those will be triggered
				// in the same batch no matter if this method was triggered by the post-fixing or not
				// (the above insertElement call will trigger the post-fixers).
				return true;
			}
		}
	}

	return false;
}

/**
 * Checks if the given node wrapped with a paragraph would be accepted by the schema in the given position.
 *
 * @internal
 * @param position The position at which to check.
 * @param nodeOrType The child node or child type to check.
 * @param schema A schema instance used for element validation.
 */
export function isParagraphable(
	position: ModelPosition,
	nodeOrType: ModelNode | string,
	schema: ModelSchema
): boolean {
	const context = schema.createContext( position );

	// When paragraph is allowed in this context...
	if ( !schema.checkChild( context, 'paragraph' ) ) {
		return false;
	}

	// And a node would be allowed in this paragraph...
	if ( !schema.checkChild( context.push( 'paragraph' ), nodeOrType ) ) {
		return false;
	}

	return true;
}

/**
 * Inserts a new paragraph at the given position and returns a position inside that paragraph.
 *
 * @internal
 * @param position The position where a paragraph should be inserted.
 * @param writer The model writer.
 * @returns  Position inside the created paragraph.
 */
export function wrapInParagraph( position: ModelPosition, writer: ModelWriter ): ModelPosition {
	const paragraph = writer.createElement( 'paragraph' );

	writer.insert( paragraph, position );

	return writer.createPositionAt( paragraph, 0 );
}
