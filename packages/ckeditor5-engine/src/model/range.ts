/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module engine/model/range
 */

import { ModelTypeCheckable } from './typecheckable.js';
import { ModelPosition } from './position.js';
import { ModelTreeWalker, type ModelTreeWalkerOptions, type ModelTreeWalkerValue } from './treewalker.js';

import { type ModelDocument } from './document.js';
import { type ModelDocumentFragment } from './documentfragment.js';
import { type ModelElement } from './element.js';
import { type InsertOperation } from './operation/insertoperation.js';
import { type ModelItem } from './item.js';
import { type MergeOperation } from './operation/mergeoperation.js';
import { type MoveOperation } from './operation/moveoperation.js';
import { type Operation } from './operation/operation.js';
import { type SplitOperation } from './operation/splitoperation.js';

import { CKEditorError, compareArrays } from '@ckeditor/ckeditor5-utils';

/**
 * Represents a range in the model tree.
 *
 * A range is defined by its {@link module:engine/model/range~ModelRange#start} and {@link module:engine/model/range~ModelRange#end}
 * positions.
 *
 * You can create range instances via its constructor or the `createRange*()` factory methods of
 * {@link module:engine/model/model~Model} and {@link module:engine/model/writer~ModelWriter}.
 */
export class ModelRange extends ModelTypeCheckable implements Iterable<ModelTreeWalkerValue> {
	/**
	 * Start position.
	 */
	public readonly start: ModelPosition;

	/**
	 * End position.
	 */
	public readonly end: ModelPosition;

	/**
	 * Creates a range spanning from `start` position to `end` position.
	 *
	 * @param start The start position.
	 * @param end The end position. If not set, the range will be collapsed at the `start` position.
	 */
	constructor( start: ModelPosition, end?: ModelPosition | null ) {
		super();

		this.start = ModelPosition._createAt( start );
		this.end = end ? ModelPosition._createAt( end ) : ModelPosition._createAt( start );

		// If the range is collapsed, treat in a similar way as a position and set its boundaries stickiness to 'toNone'.
		// In other case, make the boundaries stick to the "inside" of the range.
		this.start.stickiness = this.isCollapsed ? 'toNone' : 'toNext';
		this.end.stickiness = this.isCollapsed ? 'toNone' : 'toPrevious';
	}

	/**
	 * Iterable interface.
	 *
	 * Iterates over all {@link module:engine/model/item~ModelItem items} that are in this range and returns
	 * them together with additional information like length or {@link module:engine/model/position~ModelPosition positions},
	 * grouped as {@link module:engine/model/treewalker~ModelTreeWalkerValue}.
	 * It iterates over all {@link module:engine/model/textproxy~ModelTextProxy text contents} that are inside the range
	 * and all the {@link module:engine/model/element~ModelElement}s that are entered into when iterating over this range.
	 *
	 * This iterator uses {@link module:engine/model/treewalker~ModelTreeWalker} with `boundaries` set to this range
	 * and `ignoreElementEnd` option set to `true`.
	 */
	public* [ Symbol.iterator ](): IterableIterator<ModelTreeWalkerValue> {
		yield* new ModelTreeWalker( { boundaries: this, ignoreElementEnd: true } );
	}

	/**
	 * Describes whether the range is collapsed, that is if {@link #start} and
	 * {@link #end} positions are equal.
	 */
	public get isCollapsed(): boolean {
		return this.start.isEqual( this.end );
	}

	/**
	 * Describes whether this range is flat, that is if {@link #start} position and
	 * {@link #end} position are in the same {@link module:engine/model/position~ModelPosition#parent}.
	 */
	public get isFlat(): boolean {
		const startParentPath = this.start.getParentPath();
		const endParentPath = this.end.getParentPath();

		return compareArrays( startParentPath, endParentPath ) == 'same';
	}

	/**
	 * Range root element.
	 */
	public get root(): ModelElement | ModelDocumentFragment {
		return this.start.root;
	}

	/**
	 * Checks whether this range contains given {@link module:engine/model/position~ModelPosition position}.
	 *
	 * @param position Position to check.
	 * @returns `true` if given {@link module:engine/model/position~ModelPosition position} is contained
	 * in this range,`false` otherwise.
	 */
	public containsPosition( position: ModelPosition ): boolean {
		return position.isAfter( this.start ) && position.isBefore( this.end );
	}

	/**
	 * Checks whether this range contains given {@link ~ModelRange range}.
	 *
	 * @param otherRange Range to check.
	 * @param loose Whether the check is loose or strict. If the check is strict (`false`), compared range cannot
	 * start or end at the same position as this range boundaries. If the check is loose (`true`), compared range can start, end or
	 * even be equal to this range. Note that collapsed ranges are always compared in strict mode.
	 * @returns {Boolean} `true` if given {@link ~ModelRange range} boundaries are contained by this range, `false` otherwise.
	 */
	public containsRange( otherRange: ModelRange, loose: boolean = false ): boolean {
		if ( otherRange.isCollapsed ) {
			loose = false;
		}

		const containsStart = this.containsPosition( otherRange.start ) || ( loose && this.start.isEqual( otherRange.start ) );
		const containsEnd = this.containsPosition( otherRange.end ) || ( loose && this.end.isEqual( otherRange.end ) );

		return containsStart && containsEnd;
	}

	/**
	 * Checks whether given {@link module:engine/model/item~ModelItem} is inside this range.
	 */
	public containsItem( item: ModelItem ): boolean {
		const pos = ModelPosition._createBefore( item );

		return this.containsPosition( pos ) || this.start.isEqual( pos );
	}

	/**
	 * Two ranges are equal if their {@link #start} and {@link #end} positions are equal.
	 *
	 * @param otherRange Range to compare with.
	 * @returns `true` if ranges are equal, `false` otherwise.
	 */
	public isEqual( otherRange: ModelRange ): boolean {
		return this.start.isEqual( otherRange.start ) && this.end.isEqual( otherRange.end );
	}

	/**
	 * Checks and returns whether this range intersects with given range.
	 *
	 * @param otherRange Range to compare with.
	 * @returns `true` if ranges intersect, `false` otherwise.
	 */
	public isIntersecting( otherRange: ModelRange ): boolean {
		return this.start.isBefore( otherRange.end ) && this.end.isAfter( otherRange.start );
	}

	/**
	 * Computes which part(s) of this {@link ~ModelRange range} is not a part of given {@link ~ModelRange range}.
	 * Returned array contains zero, one or two {@link ~ModelRange ranges}.
	 *
	 * Examples:
	 *
	 * ```ts
	 * let range = model.createRange(
	 * 	model.createPositionFromPath( root, [ 2, 7 ] ),
	 * 	model.createPositionFromPath( root, [ 4, 0, 1 ] )
	 * );
	 * let otherRange = model.createRange( model.createPositionFromPath( root, [ 1 ] ), model.createPositionFromPath( root, [ 5 ] ) );
	 * let transformed = range.getDifference( otherRange );
	 * // transformed array has no ranges because `otherRange` contains `range`
	 *
	 * otherRange = model.createRange( model.createPositionFromPath( root, [ 1 ] ), model.createPositionFromPath( root, [ 3 ] ) );
	 * transformed = range.getDifference( otherRange );
	 * // transformed array has one range: from [ 3 ] to [ 4, 0, 1 ]
	 *
	 * otherRange = model.createRange( model.createPositionFromPath( root, [ 3 ] ), model.createPositionFromPath( root, [ 4 ] ) );
	 * transformed = range.getDifference( otherRange );
	 * // transformed array has two ranges: from [ 2, 7 ] to [ 3 ] and from [ 4 ] to [ 4, 0, 1 ]
	 * ```
	 *
	 * @param otherRange Range to differentiate against.
	 * @returns The difference between ranges.
	 */
	public getDifference( otherRange: ModelRange ): Array<ModelRange> {
		const ranges = [];

		if ( this.isIntersecting( otherRange ) ) {
			// Ranges intersect.

			if ( this.containsPosition( otherRange.start ) ) {
				// Given range start is inside this range. This means that we have to
				// add shrunken range - from the start to the middle of this range.
				ranges.push( new ModelRange( this.start, otherRange.start ) );
			}

			if ( this.containsPosition( otherRange.end ) ) {
				// Given range end is inside this range. This means that we have to
				// add shrunken range - from the middle of this range to the end.
				ranges.push( new ModelRange( otherRange.end, this.end ) );
			}
		} else {
			// Ranges do not intersect, return the original range.
			ranges.push( new ModelRange( this.start, this.end ) );
		}

		return ranges;
	}

	/**
	 * Returns an intersection of this {@link ~ModelRange range} and given {@link ~ModelRange range}.
	 * Intersection is a common part of both of those ranges. If ranges has no common part, returns `null`.
	 *
	 * Examples:
	 *
	 * ```ts
	 * let range = model.createRange(
	 * 	model.createPositionFromPath( root, [ 2, 7 ] ),
	 * 	model.createPositionFromPath( root, [ 4, 0, 1 ] )
	 * );
	 * let otherRange = model.createRange( model.createPositionFromPath( root, [ 1 ] ), model.createPositionFromPath( root, [ 2 ] ) );
	 * let transformed = range.getIntersection( otherRange ); // null - ranges have no common part
	 *
	 * otherRange = model.createRange( model.createPositionFromPath( root, [ 3 ] ), model.createPositionFromPath( root, [ 5 ] ) );
	 * transformed = range.getIntersection( otherRange ); // range from [ 3 ] to [ 4, 0, 1 ]
	 * ```
	 *
	 * @param otherRange Range to check for intersection.
	 * @returns A common part of given ranges or `null` if ranges have no common part.
	 */
	public getIntersection( otherRange: ModelRange ): ModelRange | null {
		if ( this.isIntersecting( otherRange ) ) {
			// Ranges intersect, so a common range will be returned.
			// At most, it will be same as this range.
			let commonRangeStart = this.start;
			let commonRangeEnd = this.end;

			if ( this.containsPosition( otherRange.start ) ) {
				// Given range start is inside this range. This means thaNt we have to
				// shrink common range to the given range start.
				commonRangeStart = otherRange.start;
			}

			if ( this.containsPosition( otherRange.end ) ) {
				// Given range end is inside this range. This means that we have to
				// shrink common range to the given range end.
				commonRangeEnd = otherRange.end;
			}

			return new ModelRange( commonRangeStart, commonRangeEnd );
		}

		// Ranges do not intersect, so they do not have common part.
		return null;
	}

	/**
	 * Returns a range created by joining this {@link ~ModelRange range} with the given {@link ~ModelRange range}.
	 * If ranges have no common part, returns `null`.
	 *
	 * Examples:
	 *
	 * ```ts
	 * let range = model.createRange(
	 * 	model.createPositionFromPath( root, [ 2, 7 ] ),
	 * 	model.createPositionFromPath( root, [ 4, 0, 1 ] )
	 * );
	 * let otherRange = model.createRange(
	 * 	model.createPositionFromPath( root, [ 1 ] ),
	 * 	model.createPositionFromPath( root, [ 2 ] )
 	 * );
	 * let transformed = range.getJoined( otherRange ); // null - ranges have no common part
	 *
	 * otherRange = model.createRange(
	 * 	model.createPositionFromPath( root, [ 3 ] ),
	 * 	model.createPositionFromPath( root, [ 5 ] )
	 * );
	 * transformed = range.getJoined( otherRange ); // range from [ 2, 7 ] to [ 5 ]
	 * ```
	 *
	 * @param otherRange Range to be joined.
	 * @param loose Whether the intersection check is loose or strict. If the check is strict (`false`),
	 * ranges are tested for intersection or whether start/end positions are equal. If the check is loose (`true`),
	 * compared range is also checked if it's {@link module:engine/model/position~ModelPosition#isTouching touching} current range.
	 * @returns A sum of given ranges or `null` if ranges have no common part.
	 */
	public getJoined( otherRange: ModelRange, loose: boolean = false ): ModelRange | null {
		let shouldJoin = this.isIntersecting( otherRange );

		if ( !shouldJoin ) {
			if ( this.start.isBefore( otherRange.start ) ) {
				shouldJoin = loose ? this.end.isTouching( otherRange.start ) : this.end.isEqual( otherRange.start );
			} else {
				shouldJoin = loose ? otherRange.end.isTouching( this.start ) : otherRange.end.isEqual( this.start );
			}
		}

		if ( !shouldJoin ) {
			return null;
		}

		let startPosition = this.start;
		let endPosition = this.end;

		if ( otherRange.start.isBefore( startPosition ) ) {
			startPosition = otherRange.start;
		}

		if ( otherRange.end.isAfter( endPosition ) ) {
			endPosition = otherRange.end;
		}

		return new ModelRange( startPosition, endPosition );
	}

	/**
	 * Computes and returns the smallest set of {@link #isFlat flat} ranges, that covers this range in whole.
	 *
	 * See an example of a model structure (`[` and `]` are range boundaries):
	 *
	 * ```
	 * root                                                            root
	 *  |- element DIV                         DIV             P2              P3             DIV
	 *  |   |- element H                   H        P1        f o o           b a r       H         P4
	 *  |   |   |- "fir[st"             fir[st     lorem                               se]cond     ipsum
	 *  |   |- element P1
	 *  |   |   |- "lorem"                                              ||
	 *  |- element P2                                                   ||
	 *  |   |- "foo"                                                    VV
	 *  |- element P3
	 *  |   |- "bar"                                                   root
	 *  |- element DIV                         DIV             [P2             P3]             DIV
	 *  |   |- element H                   H       [P1]       f o o           b a r        H         P4
	 *  |   |   |- "se]cond"            fir[st]    lorem                               [se]cond     ipsum
	 *  |   |- element P4
	 *  |   |   |- "ipsum"
	 * ```
	 *
	 * As it can be seen, letters contained in the range are: `stloremfoobarse`, spread across different parents.
	 * We are looking for minimal set of flat ranges that contains the same nodes.
	 *
	 * Minimal flat ranges for above range `( [ 0, 0, 3 ], [ 3, 0, 2 ] )` will be:
	 *
	 * ```
	 * ( [ 0, 0, 3 ], [ 0, 0, 5 ] ) = "st"
	 * ( [ 0, 1 ], [ 0, 2 ] ) = element P1 ("lorem")
	 * ( [ 1 ], [ 3 ] ) = element P2, element P3 ("foobar")
	 * ( [ 3, 0, 0 ], [ 3, 0, 2 ] ) = "se"
	 * ```
	 *
	 * **Note:** if an {@link module:engine/model/element~ModelElement element} is not wholly contained in this range, it won't be returned
	 * in any of the returned flat ranges. See in the example how `H` elements at the beginning and at the end of the range
	 * were omitted. Only their parts that were wholly in the range were returned.
	 *
	 * **Note:** this method is not returning flat ranges that contain no nodes.
	 *
	 * @returns Array of flat ranges covering this range.
	 */
	public getMinimalFlatRanges(): Array<ModelRange> {
		const ranges = [];
		const diffAt = this.start.getCommonPath( this.end ).length;

		const pos = ModelPosition._createAt( this.start );
		let posParent = pos.parent;

		// Go up.
		while ( pos.path.length > diffAt + 1 ) {
			const howMany = posParent.maxOffset - pos.offset;

			if ( howMany !== 0 ) {
				ranges.push( new ModelRange( pos, pos.getShiftedBy( howMany ) ) );
			}

			( pos as any ).path = pos.path.slice( 0, -1 );
			pos.offset++;
			posParent = posParent.parent!;
		}

		// Go down.
		while ( pos.path.length <= this.end.path.length ) {
			const offset = this.end.path[ pos.path.length - 1 ];
			const howMany = offset - pos.offset;

			if ( howMany !== 0 ) {
				ranges.push( new ModelRange( pos, pos.getShiftedBy( howMany ) ) );
			}

			pos.offset = offset;
			( pos.path as Array<number> ).push( 0 );
		}

		return ranges;
	}

	/**
	 * Creates a {@link module:engine/model/treewalker~ModelTreeWalker TreeWalker} instance with this range as a boundary.
	 *
	 * For example, to iterate over all items in the entire document root:
	 *
	 * ```ts
	 * // Create a range spanning over the entire root content:
	 * const range = editor.model.createRangeIn( editor.model.document.getRoot() );
	 *
	 * // Iterate over all items in this range:
	 * for ( const value of range.getWalker() ) {
	 * 	console.log( value.item );
	 * }
	 * ```
	 *
	 * @param options Object with configuration options. See {@link module:engine/model/treewalker~ModelTreeWalker}.
	 */
	public getWalker( options: ModelTreeWalkerOptions = {} ): ModelTreeWalker {
		options.boundaries = this;

		return new ModelTreeWalker( options );
	}

	/**
	 * Returns an iterator that iterates over all {@link module:engine/model/item~ModelItem items} that are in this range and returns
	 * them.
	 *
	 * This method uses {@link module:engine/model/treewalker~ModelTreeWalker} with `boundaries` set to this range and
	 * `ignoreElementEnd` option set to `true`. However it returns only {@link module:engine/model/item~ModelItem model items},
	 * not {@link module:engine/model/treewalker~ModelTreeWalkerValue}.
	 *
	 * You may specify additional options for the tree walker. See {@link module:engine/model/treewalker~ModelTreeWalker} for
	 * a full list of available options.
	 *
	 * @param options Object with configuration options. See {@link module:engine/model/treewalker~ModelTreeWalker}.
	 */
	public* getItems( options: ModelTreeWalkerOptions = {} ): IterableIterator<ModelItem> {
		options.boundaries = this;
		options.ignoreElementEnd = true;

		const treeWalker = new ModelTreeWalker( options );

		for ( const value of treeWalker ) {
			yield value.item;
		}
	}

	/**
	 * Returns an iterator that iterates over all {@link module:engine/model/position~ModelPosition positions} that are boundaries or
	 * contained in this range.
	 *
	 * This method uses {@link module:engine/model/treewalker~ModelTreeWalker} with `boundaries` set to this range. However it returns only
	 * {@link module:engine/model/position~ModelPosition positions}, not {@link module:engine/model/treewalker~ModelTreeWalkerValue}.
	 *
	 * You may specify additional options for the tree walker. See {@link module:engine/model/treewalker~ModelTreeWalker} for
	 * a full list of available options.
	 *
	 * @param options Object with configuration options. See {@link module:engine/model/treewalker~ModelTreeWalker}.
	 */
	public* getPositions( options: ModelTreeWalkerOptions = {} ): IterableIterator<ModelPosition> {
		options.boundaries = this;

		const treeWalker = new ModelTreeWalker( options );

		yield treeWalker.position;

		for ( const value of treeWalker ) {
			yield value.nextPosition;
		}
	}

	/**
	 * Returns a range that is a result of transforming this range by given `operation`.
	 *
	 * **Note:** transformation may break one range into multiple ranges (for example, when a part of the range is
	 * moved to a different part of document tree). For this reason, an array is returned by this method and it
	 * may contain one or more `Range` instances.
	 *
	 * @param operation Operation to transform range by.
	 * @returns Range which is the result of transformation.
	 */
	public getTransformedByOperation( operation: Operation ): Array<ModelRange> {
		switch ( operation.type ) {
			case 'insert':
				return this._getTransformedByInsertOperation( operation as InsertOperation );
			case 'move':
			case 'remove':
			case 'reinsert':
				return this._getTransformedByMoveOperation( operation as MoveOperation );
			case 'split':
				return [ this._getTransformedBySplitOperation( operation as SplitOperation ) ];
			case 'merge':
				return [ this._getTransformedByMergeOperation( operation as MergeOperation ) ];
		}

		return [ new ModelRange( this.start, this.end ) ];
	}

	/**
	 * Returns a range that is a result of transforming this range by multiple `operations`.
	 *
	 * @see ~ModelRange#getTransformedByOperation
	 * @param operations Operations to transform the range by.
	 * @returns Range which is the result of transformation.
	 */
	public getTransformedByOperations( operations: Iterable<Operation> ): Array<ModelRange> {
		const ranges = [ new ModelRange( this.start, this.end ) ];

		for ( const operation of operations ) {
			for ( let i = 0; i < ranges.length; i++ ) {
				const result = ranges[ i ].getTransformedByOperation( operation );

				ranges.splice( i, 1, ...result );
				i += result.length - 1;
			}
		}

		// It may happen that a range is split into two, and then the part of second "piece" is moved into first
		// "piece". In this case we will have incorrect third range, which should not be included in the result --
		// because it is already included in the first "piece". In this loop we are looking for all such ranges that
		// are inside other ranges and we simply remove them.
		for ( let i = 0; i < ranges.length; i++ ) {
			const range = ranges[ i ];

			for ( let j = i + 1; j < ranges.length; j++ ) {
				const next = ranges[ j ];

				if ( range.containsRange( next ) || next.containsRange( range ) || range.isEqual( next ) ) {
					ranges.splice( j, 1 );
				}
			}
		}

		return ranges;
	}

	/**
	 * Returns an {@link module:engine/model/element~ModelElement} or {@link module:engine/model/documentfragment~ModelDocumentFragment}
	 * which is a common ancestor of the range's both ends (in which the entire range is contained).
	 */
	public getCommonAncestor(): ModelElement | ModelDocumentFragment | null {
		return this.start.getCommonAncestor( this.end );
	}

	/**
	 * Returns an {@link module:engine/model/element~ModelElement Element} contained by the range.
	 * The element will be returned when it is the **only** node within the range and **fully–contained**
	 * at the same time.
	 */
	public getContainedElement(): ModelElement | null {
		if ( this.isCollapsed ) {
			return null;
		}

		const nodeAfterStart = this.start.nodeAfter;
		const nodeBeforeEnd = this.end.nodeBefore;

		if ( nodeAfterStart && nodeAfterStart.is( 'element' ) && nodeAfterStart === nodeBeforeEnd ) {
			return nodeAfterStart;
		}

		return null;
	}

	/**
	 * Converts `Range` to plain object and returns it.
	 *
	 * @returns `Node` converted to plain object.
	 */
	public toJSON(): unknown {
		return {
			start: this.start.toJSON(),
			end: this.end.toJSON()
		};
	}

	/**
	 * Returns a new range that is equal to current range.
	 */
	public clone(): this {
		return new ( this.constructor as any )( this.start, this.end );
	}

	/**
	 * Returns a result of transforming a copy of this range by insert operation.
	 *
	 * One or more ranges may be returned as a result of this transformation.
	 *
	 * @internal
	 */
	public _getTransformedByInsertOperation( operation: InsertOperation, spread: boolean = false ): Array<ModelRange> {
		return this._getTransformedByInsertion( operation.position, operation.howMany, spread );
	}

	/**
	 * Returns a result of transforming a copy of this range by move operation.
	 *
	 * One or more ranges may be returned as a result of this transformation.
	 *
	 * @internal
	 */
	public _getTransformedByMoveOperation( operation: MoveOperation, spread: boolean = false ): Array<ModelRange> {
		const sourcePosition = operation.sourcePosition;
		const howMany = operation.howMany;
		const targetPosition = operation.targetPosition;

		return this._getTransformedByMove( sourcePosition, targetPosition, howMany, spread );
	}

	/**
	 * Returns a result of transforming a copy of this range by split operation.
	 *
	 * Always one range is returned. The transformation is done in a way to not break the range.
	 *
	 * @internal
	 */
	public _getTransformedBySplitOperation( operation: SplitOperation ): ModelRange {
		const start = this.start._getTransformedBySplitOperation( operation );
		let end = this.end._getTransformedBySplitOperation( operation );

		if ( this.end.isEqual( operation.insertionPosition ) ) {
			end = this.end.getShiftedBy( 1 );
		}

		// Below may happen when range contains graveyard element used by split operation.
		if ( start.root != end.root ) {
			// End position was next to the moved graveyard element and was moved with it.
			// Fix it by using old `end` which has proper `root`.
			end = this.end.getShiftedBy( -1 );
		}

		return new ModelRange( start, end );
	}

	/**
	 * Returns a result of transforming a copy of this range by merge operation.
	 *
	 * Always one range is returned. The transformation is done in a way to not break the range.
	 *
	 * @internal
	 */
	public _getTransformedByMergeOperation( operation: MergeOperation ): ModelRange {
		// Special case when the marker is set on "the closing tag" of an element. Marker can be set like that during
		// transformations, especially when a content of a few block elements were removed. For example:
		//
		// {} is the transformed range, [] is the removed range.
		// <p>F[o{o</p><p>B}ar</p><p>Xy]z</p>
		//
		// <p>Fo{o</p><p>B}ar</p><p>z</p>
		// <p>F{</p><p>B}ar</p><p>z</p>
		// <p>F{</p>}<p>z</p>
		// <p>F{}z</p>
		//
		if ( this.start.isEqual( operation.targetPosition ) && this.end.isEqual( operation.deletionPosition ) ) {
			return new ModelRange( this.start );
		}

		let start = this.start._getTransformedByMergeOperation( operation );
		let end = this.end._getTransformedByMergeOperation( operation );

		if ( start.root != end.root ) {
			// This happens when the end position was next to the merged (deleted) element.
			// Then, the end position was moved to the graveyard root. In this case we need to fix
			// the range cause its boundaries would be in different roots.
			end = this.end.getShiftedBy( -1 );
		}

		if ( start.isAfter( end ) ) {
			// This happens in three following cases:
			//
			// Case 1: Merge operation source position is before the target position (due to some transformations, OT, etc.)
			//         This means that start can be moved before the end of the range.
			//
			// Before: <p>a{a</p><p>b}b</p><p>cc</p>
			// Merge:  <p>b}b</p><p>cca{a</p>
			// Fix:    <p>{b}b</p><p>ccaa</p>
			//
			// Case 2: Range start is before merged node but not directly.
			//         Result should include all nodes that were in the original range.
			//
			// Before: <p>aa</p>{<p>cc</p><p>b}b</p>
			// Merge:  <p>aab}b</p>{<p>cc</p>
			// Fix:    <p>aa{bb</p><p>cc</p>}
			//
			//         The range is expanded by an additional `b` letter but it is better than dropping the whole `cc` paragraph.
			//
			// Case 3: Range start is directly before merged node.
			//         Resulting range should include only nodes from the merged element:
			//
			// Before: <p>aa</p>{<p>b}b</p><p>cc</p>
			// Merge:  <p>aab}b</p>{<p>cc</p>
			// Fix:    <p>aa{b}b</p><p>cc</p>
			//

			if ( operation.sourcePosition.isBefore( operation.targetPosition ) ) {
				// Case 1.
				start = ModelPosition._createAt( end );
				start.offset = 0;
			} else {
				if ( !operation.deletionPosition.isEqual( start ) ) {
					// Case 2.
					end = operation.deletionPosition;
				}

				// In both case 2 and 3 start is at the end of the merge-to element.
				start = operation.targetPosition;
			}

			return new ModelRange( start, end );
		}

		return new ModelRange( start, end );
	}

	/**
	 * Returns an array containing one or two {@link ~ModelRange ranges} that are a result of transforming this
	 * {@link ~ModelRange range} by inserting `howMany` nodes at `insertPosition`. Two {@link ~ModelRange ranges} are
	 * returned if the insertion was inside this {@link ~ModelRange range} and `spread` is set to `true`.
	 *
	 * Examples:
	 *
	 * ```ts
	 * let range = model.createRange(
	 * 	model.createPositionFromPath( root, [ 2, 7 ] ),
	 * 	model.createPositionFromPath( root, [ 4, 0, 1 ] )
	 * );
	 * let transformed = range._getTransformedByInsertion( model.createPositionFromPath( root, [ 1 ] ), 2 );
	 * // transformed array has one range from [ 4, 7 ] to [ 6, 0, 1 ]
	 *
	 * transformed = range._getTransformedByInsertion( model.createPositionFromPath( root, [ 4, 0, 0 ] ), 4 );
	 * // transformed array has one range from [ 2, 7 ] to [ 4, 0, 5 ]
	 *
	 * transformed = range._getTransformedByInsertion( model.createPositionFromPath( root, [ 3, 2 ] ), 4 );
	 * // transformed array has one range, which is equal to original range
	 *
	 * transformed = range._getTransformedByInsertion( model.createPositionFromPath( root, [ 3, 2 ] ), 4, true );
	 * // transformed array has two ranges: from [ 2, 7 ] to [ 3, 2 ] and from [ 3, 6 ] to [ 4, 0, 1 ]
	 * ```
	 *
	 * @internal
	 * @param insertPosition Position where nodes are inserted.
	 * @param howMany How many nodes are inserted.
	 * @param spread Flag indicating whether this range should be spread if insertion
	 * was inside the range. Defaults to `false`.
	 * @returns Result of the transformation.
	 */
	public _getTransformedByInsertion( insertPosition: ModelPosition, howMany: number, spread: boolean = false ): Array<ModelRange> {
		if ( spread && this.containsPosition( insertPosition ) ) {
			// Range has to be spread. The first part is from original start to the spread point.
			// The other part is from spread point to the original end, but transformed by
			// insertion to reflect insertion changes.

			return [
				new ModelRange( this.start, insertPosition ),
				new ModelRange(
					insertPosition.getShiftedBy( howMany ),
					this.end._getTransformedByInsertion( insertPosition, howMany )
				)
			];
		} else {
			const range = new ModelRange( this.start, this.end );

			( range as any ).start = range.start._getTransformedByInsertion( insertPosition, howMany );
			( range as any ).end = range.end._getTransformedByInsertion( insertPosition, howMany );

			return [ range ];
		}
	}

	/**
	 * Returns an array containing {@link ~ModelRange ranges} that are a result of transforming this
	 * {@link ~ModelRange range} by moving `howMany` nodes from `sourcePosition` to `targetPosition`.
	 *
	 * @internal
	 * @param sourcePosition Position from which nodes are moved.
	 * @param targetPosition Position to where nodes are moved.
	 * @param howMany How many nodes are moved.
	 * @param spread Whether the range should be spread if the move points inside the range.
	 * @returns  Result of the transformation.
	 */
	public _getTransformedByMove(
		sourcePosition: ModelPosition,
		targetPosition: ModelPosition,
		howMany: number,
		spread: boolean = false
	): Array<ModelRange> {
		// Special case for transforming a collapsed range. Just transform it like a position.
		if ( this.isCollapsed ) {
			const newPos = this.start._getTransformedByMove( sourcePosition, targetPosition, howMany );

			return [ new ModelRange( newPos ) ];
		}

		// Special case for transformation when a part of the range is moved towards the range.
		//
		// Examples:
		//
		// <div><p>ab</p><p>c[d</p></div><p>e]f</p> --> <div><p>ab</p></div><p>c[d</p><p>e]f</p>
		// <p>e[f</p><div><p>a]b</p><p>cd</p></div> --> <p>e[f</p><p>a]b</p><div><p>cd</p></div>
		//
		// Without this special condition, the default algorithm leaves an "artifact" range from one of `differenceSet` parts:
		//
		// <div><p>ab</p><p>c[d</p></div><p>e]f</p> --> <div><p>ab</p>{</div>}<p>c[d</p><p>e]f</p>
		//
		// This special case is applied only if the range is to be kept together (not spread).
		const moveRange = ModelRange._createFromPositionAndShift( sourcePosition, howMany );
		const insertPosition = targetPosition._getTransformedByDeletion( sourcePosition, howMany );

		if ( this.containsPosition( targetPosition ) && !spread ) {
			if ( moveRange.containsPosition( this.start ) || moveRange.containsPosition( this.end ) ) {
				const start = this.start._getTransformedByMove( sourcePosition, targetPosition, howMany );
				const end = this.end._getTransformedByMove( sourcePosition, targetPosition, howMany );

				return [ new ModelRange( start, end ) ];
			}
		}

		// Default algorithm.
		let result: Array<ModelRange>;

		const differenceSet = this.getDifference( moveRange );
		let difference = null;

		const common = this.getIntersection( moveRange );

		if ( differenceSet.length == 1 ) {
			// `moveRange` and this range may intersect but may be separate.
			difference = new ModelRange(
				differenceSet[ 0 ].start._getTransformedByDeletion( sourcePosition, howMany )!,
				differenceSet[ 0 ].end._getTransformedByDeletion( sourcePosition, howMany )!
			);
		} else if ( differenceSet.length == 2 ) {
			// `moveRange` is inside this range.
			difference = new ModelRange(
				this.start,
				this.end._getTransformedByDeletion( sourcePosition, howMany )
			);
		} // else, `moveRange` contains this range.

		if ( difference ) {
			result = difference._getTransformedByInsertion( insertPosition!, howMany, common !== null || spread );
		} else {
			result = [];
		}

		if ( common ) {
			const transformedCommon = new ModelRange(
				common.start._getCombined( moveRange.start, insertPosition! ),
				common.end._getCombined( moveRange.start, insertPosition! )
			);

			if ( result.length == 2 ) {
				result.splice( 1, 0, transformedCommon );
			} else {
				result.push( transformedCommon );
			}
		}

		return result;
	}

	/**
	 * Returns a copy of this range that is transformed by deletion of `howMany` nodes from `deletePosition`.
	 *
	 * If the deleted range is intersecting with the transformed range, the transformed range will be shrank.
	 *
	 * If the deleted range contains transformed range, `null` will be returned.
	 *
	 * @internal
	 * @param deletePosition Position from which nodes are removed.
	 * @param howMany How many nodes are removed.
	 * @returns Result of the transformation.
	 */
	public _getTransformedByDeletion( deletePosition: ModelPosition, howMany: number ): ModelRange | null {
		let newStart = this.start._getTransformedByDeletion( deletePosition, howMany );
		let newEnd = this.end._getTransformedByDeletion( deletePosition, howMany );

		if ( newStart == null && newEnd == null ) {
			return null;
		}

		if ( newStart == null ) {
			newStart = deletePosition;
		}

		if ( newEnd == null ) {
			newEnd = deletePosition;
		}

		return new ModelRange( newStart, newEnd );
	}

	/**
	 * Creates a new range, spreading from specified {@link module:engine/model/position~ModelPosition position} to a position moved by
	 * given `shift`. If `shift` is a negative value, shifted position is treated as the beginning of the range.
	 *
	 * @internal
	 * @param position Beginning of the range.
	 * @param shift How long the range should be.
	 */
	public static _createFromPositionAndShift( position: ModelPosition, shift: number ): ModelRange {
		const start = position;
		const end = position.getShiftedBy( shift );

		return shift > 0 ? new this( start, end ) : new this( end, start );
	}

	/**
	 * Creates a range inside an {@link module:engine/model/element~ModelElement element} which starts before the first child of
	 * that element and ends after the last child of that element.
	 *
	 * @internal
	 * @param element Element which is a parent for the range.
	 */
	public static _createIn( element: ModelElement | ModelDocumentFragment ): ModelRange {
		return new this( ModelPosition._createAt( element, 0 ), ModelPosition._createAt( element, element.maxOffset ) );
	}

	/**
	 * Creates a range that starts before given {@link module:engine/model/item~ModelItem model item} and ends after it.
	 *
	 * @internal
	 */
	public static _createOn( item: ModelItem ): ModelRange {
		return this._createFromPositionAndShift( ModelPosition._createBefore( item ), item.offsetSize );
	}

	/**
	 * Combines all ranges from the passed array into a one range. At least one range has to be passed.
	 * Passed ranges must not have common parts.
	 *
	 * The first range from the array is a reference range. If other ranges start or end on the exactly same position where
	 * the reference range, they get combined into one range.
	 *
	 * ```
	 * [  ][]  [    ][ ][             ][ ][]  [  ]  // Passed ranges, shown sorted
	 * [    ]                                       // The result of the function if the first range was a reference range.
	 *         [                           ]        // The result of the function if the third-to-seventh range was a reference range.
	 *                                        [  ]  // The result of the function if the last range was a reference range.
	 * ```
	 *
	 * @internal
	 * @param ranges Ranges to combine.
	 * @returns Combined range.
	 */
	public static _createFromRanges( ranges: Array<ModelRange> ): ModelRange {
		if ( ranges.length === 0 ) {
			/**
			 * At least one range has to be passed to
			 * {@link module:engine/model/range~ModelRange._createFromRanges `Range._createFromRanges()`}.
			 *
			 * @error range-create-from-ranges-empty-array
			 */
			throw new CKEditorError(
				'range-create-from-ranges-empty-array',
				null
			);
		} else if ( ranges.length == 1 ) {
			return ranges[ 0 ].clone();
		}

		// 1. Set the first range in `ranges` array as a reference range.
		// If we are going to return just a one range, one of the ranges need to be the reference one.
		// Other ranges will be stuck to that range, if possible.
		const ref = ranges[ 0 ];

		// 2. Sort all the ranges, so it's easier to process them.
		ranges.sort( ( a, b ) => {
			return a.start.isAfter( b.start ) ? 1 : -1;
		} );

		// 3. Check at which index the reference range is now.
		const refIndex = ranges.indexOf( ref );

		// 4. At this moment we don't need the original range.
		// We are going to modify the result, and we need to return a new instance of Range.
		// We have to create a copy of the reference range.
		const result = new this( ref.start, ref.end );

		// 5. Ranges should be checked and glued starting from the range that is closest to the reference range.
		// Since ranges are sorted, start with the range with index that is closest to reference range index.
		for ( let i = refIndex - 1; i >= 0; i-- ) {
			if ( ranges[ i ].end.isEqual( result.start ) ) {
				( result as any ).start = ModelPosition._createAt( ranges[ i ].start );
			} else {
				// If ranges are not starting/ending at the same position there is no point in looking further.
				break;
			}
		}

		// 6. Ranges should be checked and glued starting from the range that is closest to the reference range.
		// Since ranges are sorted, start with the range with index that is closest to reference range index.
		for ( let i = refIndex + 1; i < ranges.length; i++ ) {
			if ( ranges[ i ].start.isEqual( result.end ) ) {
				( result as any ).end = ModelPosition._createAt( ranges[ i ].end );
			} else {
				// If ranges are not starting/ending at the same position there is no point in looking further.
				break;
			}
		}

		return result;
	}

	/**
	 * Creates a `Range` instance from given plain object (i.e. parsed JSON string).
	 *
	 * @param json Plain object to be converted to `Range`.
	 * @param doc Document object that will be range owner.
	 * @returns `Range` instance created using given plain object.
	 */
	public static fromJSON( json: any, doc: ModelDocument ): ModelRange {
		return new this( ModelPosition.fromJSON( json.start, doc ), ModelPosition.fromJSON( json.end, doc ) );
	}

	// @if CK_DEBUG_ENGINE // public override toString(): string {
	// @if CK_DEBUG_ENGINE // 	return `${ this.root } [ ${ this.start.path.join( ', ' ) } ] - [ ${ this.end.path.join( ', ' ) } ]`;
	// @if CK_DEBUG_ENGINE // }

	// @if CK_DEBUG_ENGINE // public log(): void {
	// @if CK_DEBUG_ENGINE // 	console.log( 'ModelPosition: ' + this );
	// @if CK_DEBUG_ENGINE // }
}

// The magic of type inference using `is` method is centralized in `TypeCheckable` class.
// Proper overload would interfere with that.
ModelRange.prototype.is = function( type: string ): boolean {
	return type === 'range' || type === 'model:range';
};
