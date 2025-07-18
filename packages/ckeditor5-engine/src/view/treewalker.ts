/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module engine/view/treewalker
 */

import { type ViewElement } from './element.js';
import { type ViewText } from './text.js';
import { ViewTextProxy } from './textproxy.js';
import { ViewPosition } from './position.js';
import { type ViewItem } from './item.js';
import { type ViewDocumentFragment } from './documentfragment.js';
import { type ViewRange } from './range.js';
import { type ViewNode } from './node.js';

import { CKEditorError } from '@ckeditor/ckeditor5-utils';

/**
 * Position iterator class. It allows to iterate forward and backward over the document.
 */
export class ViewTreeWalker implements IterableIterator<ViewTreeWalkerValue> {
	/**
	 * Walking direction. Defaults `'forward'`.
	 */
	public readonly direction: ViewTreeWalkerDirection;

	/**
	 * Iterator boundaries.
	 *
	 * When the iterator is walking `'forward'` on the end of boundary or is walking `'backward'`
	 * on the start of boundary, then `{ done: true }` is returned.
	 *
	 * If boundaries are not defined they are set before first and after last child of the root node.
	 */
	public readonly boundaries: ViewRange | null;

	/**
	 * Flag indicating whether all characters from {@link module:engine/view/text~ViewText} should be returned as one
	 * {@link module:engine/view/text~ViewText} or one by one as {@link module:engine/view/textproxy~ViewTextProxy}.
	 */
	public readonly singleCharacters: boolean;

	/**
	 * Flag indicating whether iterator should enter elements or not. If the iterator is shallow child nodes of any
	 * iterated node will not be returned along with `elementEnd` tag.
	 */
	public readonly shallow: boolean;

	/**
	 * Flag indicating whether iterator should ignore `elementEnd` tags. If set to `true`, walker will not
	 * return a parent node of the start position. Each {@link module:engine/view/element~ViewElement} will be returned once.
	 * When set to `false` each element might be returned twice: for `'elementStart'` and `'elementEnd'`.
	 */
	public readonly ignoreElementEnd: boolean;

	/**
	 * Iterator position. If start position is not defined then position depends on {@link #direction}. If direction is
	 * `'forward'` position starts form the beginning, when direction is `'backward'` position starts from the end.
	 */
	private _position: ViewPosition;

	/**
	 * Start boundary parent.
	 */
	private readonly _boundaryStartParent: ViewNode | ViewDocumentFragment | null;

	/**
	 * End boundary parent.
	 */
	private readonly _boundaryEndParent: ViewNode | ViewDocumentFragment | null;

	/**
	 * Creates a range iterator. All parameters are optional, but you have to specify either `boundaries` or `startPosition`.
	 *
	 * @param options Object with configuration.
	 */
	constructor( options: ViewTreeWalkerOptions = {} ) {
		if ( !options.boundaries && !options.startPosition ) {
			/**
			 * Neither boundaries nor starting position have been defined.
			 *
			 * @error view-tree-walker-no-start-position
			 */
			throw new CKEditorError(
				'view-tree-walker-no-start-position',
				null
			);
		}

		if ( options.direction && options.direction != 'forward' && options.direction != 'backward' ) {
			/**
			 * Only `backward` and `forward` direction allowed.
			 *
			 * @error view-tree-walker-unknown-direction
			 */
			throw new CKEditorError( 'view-tree-walker-unknown-direction', options.startPosition, { direction: options.direction } );
		}

		this.boundaries = options.boundaries || null;

		if ( options.startPosition ) {
			this._position = ViewPosition._createAt( options.startPosition );
		} else {
			this._position = ViewPosition._createAt( options.boundaries![ options.direction == 'backward' ? 'end' : 'start' ] );
		}

		this.direction = options.direction || 'forward';
		this.singleCharacters = !!options.singleCharacters;
		this.shallow = !!options.shallow;
		this.ignoreElementEnd = !!options.ignoreElementEnd;

		this._boundaryStartParent = this.boundaries ? this.boundaries.start.parent : null;
		this._boundaryEndParent = this.boundaries ? this.boundaries.end.parent : null;
	}

	/**
	 * Iterable interface.
	 */
	public [ Symbol.iterator ](): IterableIterator<ViewTreeWalkerValue> {
		return this;
	}

	/**
	 * Iterator position. If start position is not defined then position depends on {@link #direction}. If direction is
	 * `'forward'` position starts form the beginning, when direction is `'backward'` position starts from the end.
	 */
	public get position(): ViewPosition {
		return this._position;
	}

	/**
	 * Moves {@link #position} in the {@link #direction} skipping values as long as the callback function returns `true`.
	 *
	 * For example:
	 *
	 * ```ts
	 * walker.skip( value => value.type == 'text' ); // <p>{}foo</p> -> <p>foo[]</p>
	 * walker.skip( value => true ); // Move the position to the end: <p>{}foo</p> -> <p>foo</p>[]
	 * walker.skip( value => false ); // Do not move the position.
	 * ```
	 *
	 * @param skip Callback function. Gets {@link module:engine/view/treewalker~ViewTreeWalkerValue} and should
	 * return `true` if the value should be skipped or `false` if not.
	 */
	public skip( skip: ( value: ViewTreeWalkerValue ) => boolean ): void {
		let nextResult: IteratorResult<ViewTreeWalkerValue>;
		let prevPosition: ViewPosition;

		do {
			prevPosition = this.position;
			nextResult = this.next();
		} while ( !nextResult.done && skip( nextResult.value ) );

		if ( !nextResult.done ) {
			this._position = prevPosition;
		}
	}

	/**
	 * Moves tree walker {@link #position} to provided `position`. Tree walker will
	 * continue traversing from that position.
	 *
	 * Note: in contrary to {@link ~ViewTreeWalker#skip}, this method does not iterate over the nodes along the way.
	 * It simply sets the current tree walker position to a new one.
	 * From the performance standpoint, it is better to use {@link ~ViewTreeWalker#jumpTo} rather than {@link ~ViewTreeWalker#skip}.
	 *
	 * If the provided position is before the start boundary, the position will be
	 * set to the start boundary. If the provided position is after the end boundary,
	 * the position will be set to the end boundary.
	 * This is done to prevent the treewalker from traversing outside the boundaries.
	 *
	 * @param position Position to jump to.
	 */
	public jumpTo( position: ViewPosition ): void {
		if ( this._boundaryStartParent && position.isBefore( this.boundaries!.start ) ) {
			position = this.boundaries!.start;
		} else if ( this._boundaryEndParent && position.isAfter( this.boundaries!.end ) ) {
			position = this.boundaries!.end;
		}

		this._position = position.clone();
	}

	/**
	 * Gets the next tree walker's value.
	 *
	 * @returns Object implementing iterator interface, returning
	 * information about taken step.
	 */
	public next(): IteratorResult<ViewTreeWalkerValue, undefined> {
		if ( this.direction == 'forward' ) {
			return this._next();
		} else {
			return this._previous();
		}
	}

	/**
	 * Makes a step forward in view. Moves the {@link #position} to the next position and returns the encountered value.
	 */
	private _next(): IteratorResult<ViewTreeWalkerValue, undefined> {
		let position = this.position.clone();
		const previousPosition = this.position;
		const parent = position.parent;

		// We are at the end of the root.
		if ( parent.parent === null && position.offset === ( parent as any ).childCount ) {
			return { done: true, value: undefined };
		}

		// We reached the walker boundary.
		if ( parent === this._boundaryEndParent && position.offset == this.boundaries!.end.offset ) {
			return { done: true, value: undefined };
		}

		// Get node just after current position.
		let node;

		// Text is a specific parent because it contains string instead of child nodes.
		if ( parent && parent.is( 'view:$text' ) ) {
			if ( position.isAtEnd ) {
				// Prevent returning "elementEnd" for Text node. Skip that value and return the next walker step.
				this._position = ViewPosition._createAfter( parent );

				return this._next();
			}

			node = parent.data[ position.offset ];
		} else {
			node = ( parent as ViewElement | ViewDocumentFragment ).getChild( position.offset );
		}

		if ( typeof node == 'string' ) {
			let textLength;

			if ( this.singleCharacters ) {
				textLength = 1;
			} else {
				// Check if text stick out of walker range.
				const endOffset = parent === this._boundaryEndParent ? this.boundaries!.end.offset : ( parent as ViewText ).data.length;

				textLength = endOffset - position.offset;
			}

			const textProxy = new ViewTextProxy( parent as ViewText, position.offset, textLength );

			position.offset += textLength;
			this._position = position;

			return this._formatReturnValue( 'text', textProxy, previousPosition, position, textLength );
		}

		if ( node && node.is( 'view:element' ) ) {
			if ( !this.shallow ) {
				position = new ViewPosition( node, 0 );
			} else {
				// We are past the walker boundaries.
				if ( this.boundaries && this.boundaries.end.isBefore( position ) ) {
					return { done: true, value: undefined };
				}

				position.offset++;
			}

			this._position = position;

			return this._formatReturnValue( 'elementStart', node, previousPosition, position, 1 );
		}

		if ( node && node.is( 'view:$text' ) ) {
			if ( this.singleCharacters ) {
				position = new ViewPosition( node, 0 );
				this._position = position;

				return this._next();
			}

			let charactersCount = node.data.length;
			let item;

			// If text stick out of walker range, we need to cut it and wrap in ViewTextProxy.
			if ( node == this._boundaryEndParent ) {
				charactersCount = this.boundaries!.end.offset;
				item = new ViewTextProxy( node, 0, charactersCount );
				position = ViewPosition._createAfter( item );
			} else {
				item = new ViewTextProxy( node, 0, node.data.length );
				// If not just keep moving forward.
				position.offset++;
			}

			this._position = position;

			return this._formatReturnValue( 'text', item, previousPosition, position, charactersCount );
		}

		// `node` is not set, we reached the end of current `parent`.
		position = ViewPosition._createAfter( parent as any );
		this._position = position;

		if ( this.ignoreElementEnd ) {
			return this._next();
		}

		return this._formatReturnValue( 'elementEnd', parent as any, previousPosition, position );
	}

	/**
	 * Makes a step backward in view. Moves the {@link #position} to the previous position and returns the encountered value.
	 */
	private _previous(): IteratorResult<ViewTreeWalkerValue, undefined> {
		let position = this.position.clone();
		const previousPosition = this.position;
		const parent = position.parent;

		// We are at the beginning of the root.
		if ( parent.parent === null && position.offset === 0 ) {
			return { done: true, value: undefined };
		}

		// We reached the walker boundary.
		if ( parent == this._boundaryStartParent && position.offset == this.boundaries!.start.offset ) {
			return { done: true, value: undefined };
		}

		// Get node just before current position.
		let node;

		// Text {@link module:engine/view/text~ViewText} element is a specific parent because contains string instead of child nodes.
		if ( parent.is( 'view:$text' ) ) {
			if ( position.isAtStart ) {
				// Prevent returning "elementStart" for Text node. Skip that value and return the next walker step.
				this._position = ViewPosition._createBefore( parent );

				return this._previous();
			}

			node = parent.data[ position.offset - 1 ];
		} else {
			node = ( parent as ViewElement | ViewDocumentFragment ).getChild( position.offset - 1 );
		}

		if ( typeof node == 'string' ) {
			let textLength;

			if ( !this.singleCharacters ) {
				// Check if text stick out of walker range.
				const startOffset = parent === this._boundaryStartParent ? this.boundaries!.start.offset : 0;

				textLength = position.offset - startOffset;
			} else {
				textLength = 1;
			}

			position.offset -= textLength;

			const textProxy = new ViewTextProxy( parent as ViewText, position.offset, textLength );

			this._position = position;

			return this._formatReturnValue( 'text', textProxy, previousPosition, position, textLength );
		}

		if ( node && node.is( 'view:element' ) ) {
			if ( this.shallow ) {
				position.offset--;
				this._position = position;

				return this._formatReturnValue( 'elementStart', node, previousPosition, position, 1 );
			}

			position = new ViewPosition( node, node.childCount );
			this._position = position;

			if ( this.ignoreElementEnd ) {
				return this._previous();
			}

			return this._formatReturnValue( 'elementEnd', node, previousPosition, position );
		}

		if ( node && node.is( 'view:$text' ) ) {
			if ( this.singleCharacters ) {
				position = new ViewPosition( node, node.data.length );
				this._position = position;

				return this._previous();
			}

			let charactersCount = node.data.length;
			let item;

			// If text stick out of walker range, we need to cut it and wrap in ViewTextProxy.
			if ( node == this._boundaryStartParent ) {
				const offset = this.boundaries!.start.offset;

				item = new ViewTextProxy( node, offset, node.data.length - offset );
				charactersCount = item.data.length;
				position = ViewPosition._createBefore( item );
			} else {
				item = new ViewTextProxy( node, 0, node.data.length );
				// If not just keep moving backward.
				position.offset--;
			}

			this._position = position;

			return this._formatReturnValue( 'text', item, previousPosition, position, charactersCount );
		}

		// `node` is not set, we reached the beginning of current `parent`.
		position = ViewPosition._createBefore( parent as any );
		this._position = position;

		return this._formatReturnValue( 'elementStart', parent as ViewElement, previousPosition, position, 1 );
	}

	/**
	 * Format returned data and adjust `previousPosition` and `nextPosition` if
	 * reach the bound of the {@link module:engine/view/text~ViewText}.
	 *
	 * @param type Type of step.
	 * @param item Item between old and new position.
	 * @param previousPosition Previous position of iterator.
	 * @param nextPosition Next position of iterator.
	 * @param length Length of the item.
	 */
	private _formatReturnValue(
		type: ViewTreeWalkerValueType,
		item: ViewItem,
		previousPosition: ViewPosition,
		nextPosition: ViewPosition,
		length?: number
	): IteratorYieldResult<ViewTreeWalkerValue> {
		// Text is a specific parent, because contains string instead of children.
		// Walker doesn't enter to the Text except situations when walker is iterating over every single character,
		// or the bound starts/ends inside the Text. So when the position is at the beginning or at the end of the Text
		// we move it just before or just after Text.
		if ( item.is( 'view:$textProxy' ) ) {
			// Position is at the end of Text.
			if ( item.offsetInText + item.data.length == item.textNode.data.length ) {
				if ( this.direction == 'forward' && !( this.boundaries && this.boundaries.end.isEqual( this.position ) ) ) {
					nextPosition = ViewPosition._createAfter( item.textNode );
					// When we change nextPosition of returned value we need also update walker current position.
					this._position = nextPosition;
				} else {
					previousPosition = ViewPosition._createAfter( item.textNode );
				}
			}

			// Position is at the begining ot the text.
			if ( item.offsetInText === 0 ) {
				if ( this.direction == 'backward' && !( this.boundaries && this.boundaries.start.isEqual( this.position ) ) ) {
					nextPosition = ViewPosition._createBefore( item.textNode );
					// When we change nextPosition of returned value we need also update walker current position.
					this._position = nextPosition;
				} else {
					previousPosition = ViewPosition._createBefore( item.textNode );
				}
			}
		}

		return {
			done: false,
			value: {
				type,
				item,
				previousPosition,
				nextPosition,
				length
			}
		};
	}
}

/**
 * Type of the step made by {@link module:engine/view/treewalker~ViewTreeWalker}.
 * Possible values: `'elementStart'` if walker is at the beginning of a node, `'elementEnd'` if walker is at the end
 * of node, or `'text'` if walker traversed over single and multiple characters.
 * For {@link module:engine/view/text~ViewText} `elementStart` and `elementEnd` is not returned.
 */
export type ViewTreeWalkerValueType = 'elementStart' | 'elementEnd' | 'text';

/**
 * Object returned by {@link module:engine/view/treewalker~ViewTreeWalker} when traversing tree view.
 */
export interface ViewTreeWalkerValue {

	/**
	 * Type of the step made by {@link module:engine/view/treewalker~ViewTreeWalker}.
	 */
	type: ViewTreeWalkerValueType;

	/**
	 * Item between the old and the new positions of the tree walker.
	 */
	item: ViewItem;

	/**
	 * Previous position of the iterator.
	 * * Forward iteration: For `'elementEnd'` it is the last position inside the element. For all other types it is the
	 * position before the item.
	 * * Backward iteration: For `'elementStart'` it is the first position inside the element. For all other types it is
	 * the position after item.
	 * * If the position is at the beginning or at the end of the {@link module:engine/view/text~ViewText} it is always moved from the
	 * inside of the text to its parent just before or just after that text.
	 */
	previousPosition: ViewPosition;

	/**
	 * Next position of the iterator.
	 * * Forward iteration: For `'elementStart'` it is the first position inside the element. For all other types it is
	 * the position after the item.
	 * * Backward iteration: For `'elementEnd'` it is last position inside element. For all other types it is the position
	 * before the item.
	 * * If the position is at the beginning or at the end of the {@link module:engine/view/text~ViewText} it is always moved from the
	 * inside of the text to its parent just before or just after that text.
	 */
	nextPosition: ViewPosition;

	/**
	 * Length of the item. For `'elementStart'` it is `1`. For `'text'` it is
	 * the length of that text. For `'elementEnd'` it is `undefined`.
	 */
	length?: number;
}

/**
 * Tree walking direction.
 */
export type ViewTreeWalkerDirection = 'forward' | 'backward';

/**
 * The configuration of {@link ~ViewTreeWalker}.
 */
export interface ViewTreeWalkerOptions {

	/**
	 * Walking direction.
	 *
	 * @default 'forward'
	 */
	direction?: ViewTreeWalkerDirection;

	/**
	 * Range to define boundaries of the iterator.
	 */
	boundaries?: ViewRange | null;

	/**
	 * Starting position.
	 */
	startPosition?: ViewPosition;

	/**
	 * Flag indicating whether all characters from
	 * {@link module:engine/view/text~ViewText} should be returned as one
	 * {@link module:engine/view/text~ViewText} (`false`) or one by one as
	 * {@link module:engine/view/textproxy~ViewTextProxy} (`true`).
	 */
	singleCharacters?: boolean;

	/**
	 * Flag indicating whether iterator should enter elements or not. If the
	 * iterator is shallow child nodes of any iterated node will not be returned along with `elementEnd` tag.
	 */
	shallow?: boolean;

	/**
	 * Flag indicating whether iterator should ignore `elementEnd`
	 * tags. If the option is true walker will not return a parent node of start position. If this option is `true`
	 * each {@link module:engine/view/element~ViewElement} will be returned once, while if the option is `false` they might be returned
	 * twice: for `'elementStart'` and `'elementEnd'`.
	 */
	ignoreElementEnd?: boolean;
}
