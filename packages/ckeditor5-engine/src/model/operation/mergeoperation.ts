/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module engine/model/operation/mergeoperation
 */

import { Operation } from './operation.js';
import { SplitOperation } from './splitoperation.js';
import { ModelPosition } from '../position.js';
import { ModelRange } from '../range.js';
import { _move } from './utils.js';

import { type ModelDocument } from '../document.js';
import { type ModelElement } from '../element.js';
import type { ModelSelectable } from '../selection.js';

import { CKEditorError } from '@ckeditor/ckeditor5-utils';

/**
 * Operation to merge two {@link module:engine/model/element~ModelElement elements}.
 *
 * The merged element is the parent of {@link ~MergeOperation#sourcePosition} and it is merged into the parent of
 * {@link ~MergeOperation#targetPosition}. All nodes from the merged element are moved to {@link ~MergeOperation#targetPosition}.
 *
 * The merged element is moved to the graveyard at {@link ~MergeOperation#graveyardPosition}.
 */
export class MergeOperation extends Operation {
	/**
	 * Position inside the merged element. All nodes from that element after that position will be moved to {@link #targetPosition}.
	 */
	public sourcePosition: ModelPosition;

	/**
	 * Summary offset size of nodes which will be moved from the merged element to the new parent.
	 */
	public howMany: number;

	/**
	 * Position which the nodes from the merged elements will be moved to.
	 */
	public targetPosition: ModelPosition;

	/**
	 * Position in graveyard to which the merged element will be moved.
	 */
	public graveyardPosition: ModelPosition;

	/**
	 * Creates a merge operation.
	 *
	 * @param sourcePosition Position inside the merged element. All nodes from that
	 * element after that position will be moved to {@link #targetPosition}.
	 * @param howMany Summary offset size of nodes which will be moved from the merged element to the new parent.
	 * @param targetPosition Position which the nodes from the merged elements will be moved to.
	 * @param graveyardPosition Position in graveyard to which the merged element will be moved.
	 * @param baseVersion Document {@link module:engine/model/document~ModelDocument#version} on which operation
	 * can be applied or `null` if the operation operates on detached (non-document) tree.
	 */
	constructor(
		sourcePosition: ModelPosition,
		howMany: number,
		targetPosition: ModelPosition,
		graveyardPosition: ModelPosition,
		baseVersion: number | null
	) {
		super( baseVersion );

		this.sourcePosition = sourcePosition.clone();
		// This is, and should always remain, the first position in its parent.
		this.sourcePosition.stickiness = 'toPrevious';

		this.howMany = howMany;
		this.targetPosition = targetPosition.clone();

		// Except of a rare scenario in `MergeOperation` x `MergeOperation` transformation,
		// this is, and should always remain, the last position in its parent.
		this.targetPosition.stickiness = 'toNext';
		this.graveyardPosition = graveyardPosition.clone();
	}

	/**
	 * @inheritDoc
	 */
	public get type(): 'merge' {
		return 'merge';
	}

	/**
	 * Position before the merged element (which will be deleted).
	 */
	public get deletionPosition(): ModelPosition {
		return new ModelPosition( this.sourcePosition.root, this.sourcePosition.path.slice( 0, -1 ) );
	}

	/**
	 * Artificial range that contains all the nodes from the merged element that will be moved to {@link ~MergeOperation#sourcePosition}.
	 * The range starts at {@link ~MergeOperation#sourcePosition} and ends in the same parent, at `POSITIVE_INFINITY` offset.
	 */
	public get movedRange(): ModelRange {
		const end = this.sourcePosition.getShiftedBy( Number.POSITIVE_INFINITY );

		return new ModelRange( this.sourcePosition, end );
	}

	/**
	 * @inheritDoc
	 */
	public get affectedSelectable(): ModelSelectable {
		const mergedElement = this.sourcePosition.parent as ModelElement;

		return [
			ModelRange._createOn( mergedElement ),

			// These could be positions but `Selectable` type only supports `Iterable<Range>`.
			ModelRange._createFromPositionAndShift( this.targetPosition, 0 ),
			ModelRange._createFromPositionAndShift( this.graveyardPosition, 0 )
		];
	}

	/**
	 * Creates and returns an operation that has the same parameters as this operation.
	 */
	public clone(): MergeOperation {
		return new MergeOperation( this.sourcePosition, this.howMany, this.targetPosition, this.graveyardPosition, this.baseVersion );
	}

	/**
	 * See {@link module:engine/model/operation/operation~Operation#getReversed `Operation#getReversed()`}.
	 */
	public getReversed(): Operation {
		// Positions in this method are transformed by this merge operation because the split operation bases on
		// the context after this merge operation happened (because split operation reverses it).
		// So we need to acknowledge that the merge operation happened and those positions changed a little.
		const targetPosition = this.targetPosition._getTransformedByMergeOperation( this );

		const path = this.sourcePosition.path.slice( 0, -1 );
		const insertionPosition = new ModelPosition( this.sourcePosition.root, path )._getTransformedByMergeOperation( this );

		return new SplitOperation( targetPosition, this.howMany, insertionPosition, this.graveyardPosition, this.baseVersion! + 1 );
	}

	/**
	 * @inheritDoc
	 * @internal
	 */
	public override _validate(): void {
		const sourceElement = this.sourcePosition.parent;
		const targetElement = this.targetPosition.parent;

		// Validate whether merge operation has correct parameters.
		if ( !sourceElement.parent ) {
			/**
			 * Merge source position is invalid. The element to be merged must have a parent node.
			 *
			 * @error merge-operation-source-position-invalid
			 */
			throw new CKEditorError( 'merge-operation-source-position-invalid', this );
		} else if ( !targetElement.parent ) {
			/**
			 * Merge target position is invalid. The element to be merged must have a parent node.
			 *
			 * @error merge-operation-target-position-invalid
			 */
			throw new CKEditorError( 'merge-operation-target-position-invalid', this );
		} else if ( this.howMany != sourceElement.maxOffset ) {
			/**
			 * Merge operation specifies wrong number of nodes to move.
			 *
			 * @error merge-operation-how-many-invalid
			 */
			throw new CKEditorError( 'merge-operation-how-many-invalid', this );
		}
	}

	/**
	 * @inheritDoc
	 * @internal
	 */
	public _execute(): void {
		const mergedElement = this.sourcePosition.parent as ModelElement;
		const sourceRange = ModelRange._createIn( mergedElement );

		_move( sourceRange, this.targetPosition );
		_move( ModelRange._createOn( mergedElement ), this.graveyardPosition );
	}

	/**
	 * @inheritDoc
	 */
	public override toJSON(): unknown {
		const json: any = super.toJSON();

		json.sourcePosition = json.sourcePosition.toJSON();
		json.targetPosition = json.targetPosition.toJSON();
		json.graveyardPosition = json.graveyardPosition.toJSON();

		return json;
	}

	/**
	 * @inheritDoc
	 */
	public static override get className(): string {
		return 'MergeOperation';
	}

	/**
	 * Creates `MergeOperation` object from deserialized object, i.e. from parsed JSON string.
	 *
	 * @param json Deserialized JSON object.
	 * @param document Document on which this operation will be applied.
	 */
	public static override fromJSON( json: any, document: ModelDocument ): MergeOperation {
		const sourcePosition = ModelPosition.fromJSON( json.sourcePosition, document );
		const targetPosition = ModelPosition.fromJSON( json.targetPosition, document );
		const graveyardPosition = ModelPosition.fromJSON( json.graveyardPosition, document );

		return new this( sourcePosition, json.howMany, targetPosition, graveyardPosition, json.baseVersion );
	}

	// @if CK_DEBUG_ENGINE // public override toString(): string {
	// @if CK_DEBUG_ENGINE // 	return `MergeOperation( ${ this.baseVersion } ): ` +
	// @if CK_DEBUG_ENGINE // 		`${ this.sourcePosition } -> ${ this.targetPosition }` +
	// @if CK_DEBUG_ENGINE // 		` ( ${ this.howMany } ), ${ this.graveyardPosition }`;
	// @if CK_DEBUG_ENGINE // }
}
