/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module engine/model/writer
 */

import { AttributeOperation } from './operation/attributeoperation.js';
import { DetachOperation } from './operation/detachoperation.js';
import { InsertOperation } from './operation/insertoperation.js';
import { MarkerOperation } from './operation/markeroperation.js';
import { MergeOperation } from './operation/mergeoperation.js';
import { MoveOperation } from './operation/moveoperation.js';
import { RenameOperation } from './operation/renameoperation.js';
import { RootAttributeOperation } from './operation/rootattributeoperation.js';
import { RootOperation } from './operation/rootoperation.js';
import { SplitOperation } from './operation/splitoperation.js';

import { ModelDocumentFragment } from './documentfragment.js';
import { ModelDocumentSelection } from './documentselection.js';
import { ModelElement } from './element.js';
import { ModelPosition, type ModelPositionOffset, type ModelPositionStickiness } from './position.js';
import { ModelRange } from './range.js';
import { ModelRootElement } from './rootelement.js';
import { ModelText } from './text.js';

import type { Marker } from './markercollection.js';
import type { ModelSelection, ModelPlaceOrOffset, ModelSelectable } from './selection.js';
import { type Batch } from './batch.js';
import { type ModelItem } from './item.js';
import { type Model } from './model.js';
import type { ModelNode, ModelNodeAttributes } from './node.js';

import { CKEditorError, logWarning, toMap } from '@ckeditor/ckeditor5-utils';

/**
 * The model can only be modified by using the writer. It should be used whenever you want to create a node, modify
 * child nodes, attributes or text, set the selection's position and its attributes.
 *
 * The instance of the writer is only available in the {@link module:engine/model/model~Model#change `change()`} or
 * {@link module:engine/model/model~Model#enqueueChange `enqueueChange()`}.
 *
 * ```ts
 * model.change( writer => {
 * 	writer.insertText( 'foo', paragraph, 'end' );
 * } );
 * ```
 *
 * Note that the writer should never be stored and used outside of the `change()` and
 * `enqueueChange()` blocks.
 *
 * Note that writer's methods do not check the {@link module:engine/model/schema~ModelSchema}. It is possible
 * to create incorrect model structures by using the writer. Read more about in
 * {@glink framework/deep-dive/schema#who-checks-the-schema "Who checks the schema?"}.
 *
 * @see module:engine/model/model~Model#change
 * @see module:engine/model/model~Model#enqueueChange
 */
export class ModelWriter {
	/**
	 * Instance of the model on which this writer operates.
	 */
	public readonly model: Model;

	/**
	 * The batch to which this writer will add changes.
	 */
	public readonly batch: Batch;

	/**
	 * Creates a writer instance.
	 *
	 * **Note:** It is not recommended to use it directly. Use {@link module:engine/model/model~Model#change `Model#change()`} or
	 * {@link module:engine/model/model~Model#enqueueChange `Model#enqueueChange()`} instead.
	 *
	 * @internal
	 */
	constructor( model: Model, batch: Batch ) {
		this.model = model;
		this.batch = batch;
	}

	/**
	 * Creates a new {@link module:engine/model/text~ModelText text node}.
	 *
	 * ```ts
	 * writer.createText( 'foo' );
	 * writer.createText( 'foo', { bold: true } );
	 * ```
	 *
	 * @param data Text data.
	 * @param attributes Text attributes.
	 * @returns {module:engine/model/text~ModelText} Created text node.
	 */
	public createText(
		data: string,
		attributes?: ModelNodeAttributes
	): ModelText {
		return new ModelText( data, attributes );
	}

	/**
	 * Creates a new {@link module:engine/model/element~ModelElement element}.
	 *
	 * ```ts
	 * writer.createElement( 'paragraph' );
	 * writer.createElement( 'paragraph', { alignment: 'center' } );
	 * ```
	 *
	 * @param name Name of the element.
	 * @param attributes Elements attributes.
	 * @returns Created element.
	 */
	public createElement(
		name: string,
		attributes?: ModelNodeAttributes
	): ModelElement {
		return new ModelElement( name, attributes );
	}

	/**
	 * Creates a new {@link module:engine/model/documentfragment~ModelDocumentFragment document fragment}.
	 *
	 * @returns Created document fragment.
	 */
	public createDocumentFragment(): ModelDocumentFragment {
		return new ModelDocumentFragment();
	}

	/**
	 * Creates a copy of the element and returns it. Created element has the same name and attributes as the original element.
	 * If clone is deep, the original element's children are also cloned. If not, then empty element is returned.
	 *
	 * @param element The element to clone.
	 * @param deep If set to `true` clones element and all its children recursively. When set to `false`,
	 * element will be cloned without any child.
	 */
	public cloneElement( element: ModelElement, deep: boolean = true ): ModelElement {
		return element._clone( deep );
	}

	/**
	 * Inserts item on given position.
	 *
	 * ```ts
	 * const paragraph = writer.createElement( 'paragraph' );
	 * writer.insert( paragraph, position );
	 * ```
	 *
	 * Instead of using position you can use parent and offset:
	 *
	 * ```ts
	 * const text = writer.createText( 'foo' );
	 * writer.insert( text, paragraph, 5 );
	 * ```
	 *
	 * You can also use `end` instead of the offset to insert at the end:
	 *
	 * ```ts
	 * const text = writer.createText( 'foo' );
	 * writer.insert( text, paragraph, 'end' );
	 * ```
	 *
	 * Or insert before or after another element:
	 *
	 * ```ts
	 * const paragraph = writer.createElement( 'paragraph' );
	 * writer.insert( paragraph, anotherParagraph, 'after' );
	 * ```
	 *
	 * These parameters works the same way as {@link #createPositionAt `writer.createPositionAt()`}.
	 *
	 * Note that if the item already has parent it will be removed from the previous parent.
	 *
	 * Note that you cannot re-insert a node from a document to a different document or a document fragment. In this case,
	 * `model-writer-insert-forbidden-move` is thrown.
	 *
	 * If you want to move {@link module:engine/model/range~ModelRange range} instead of an
	 * {@link module:engine/model/item~ModelItem item} use {@link module:engine/model/writer~ModelWriter#move `Writer#move()`}.
	 *
	 * **Note:** For a paste-like content insertion mechanism see
	 * {@link module:engine/model/model~Model#insertContent `model.insertContent()`}.
	 *
	 * @param item Item or document fragment to insert.
	 * @param offset Offset or one of the flags. Used only when second parameter is a {@link module:engine/model/item~ModelItem model item}.
	 */
	public insert(
		item: ModelItem | ModelDocumentFragment,
		itemOrPosition: ModelItem | ModelDocumentFragment | ModelPosition,
		offset: ModelPositionOffset = 0
	): void {
		this._assertWriterUsedCorrectly();

		if ( item instanceof ModelText && item.data == '' ) {
			return;
		}

		const position = ModelPosition._createAt( itemOrPosition, offset );

		// If item has a parent already.
		if ( item.parent ) {
			// We need to check if item is going to be inserted within the same document.
			if ( isSameTree( item.root, position.root ) ) {
				// If it's we just need to move it.
				this.move( ModelRange._createOn( item ), position );

				return;
			}
			// If it isn't the same root.
			else {
				if ( item.root.document ) {
					/**
					 * Cannot move a node from a document to a different tree.
					 * It is forbidden to move a node that was already in a document outside of it.
					 *
					 * @error model-writer-insert-forbidden-move
					 */
					throw new CKEditorError(
						'model-writer-insert-forbidden-move',
						this
					);
				} else {
					// Move between two different document fragments or from document fragment to a document is possible.
					// In that case, remove the item from it's original parent.
					this.remove( item );
				}
			}
		}

		const version = position.root.document ? position.root.document.version : null;

		const children = item instanceof ModelDocumentFragment ?
			item._removeChildren( 0, item.childCount ) :
			item;

		const insert = new InsertOperation( position, children, version );

		if ( item instanceof ModelText ) {
			insert.shouldReceiveAttributes = true;
		}

		this.batch.addOperation( insert );
		this.model.applyOperation( insert );

		// When element is a ModelDocumentFragment we need to move its markers to Document#markers.
		if ( item instanceof ModelDocumentFragment ) {
			for ( const [ markerName, markerRange ] of item.markers ) {
				// We need to migrate marker range from ModelDocumentFragment to Document.
				const rangeRootPosition = ModelPosition._createAt( markerRange.root, 0 );
				const range = new ModelRange(
					markerRange.start._getCombined( rangeRootPosition, position ),
					markerRange.end._getCombined( rangeRootPosition, position )
				);

				const options = { range, usingOperation: true, affectsData: true };

				if ( this.model.markers.has( markerName ) ) {
					this.updateMarker( markerName, options );
				} else {
					this.addMarker( markerName, options );
				}
			}
		}
	}

	/**
	 * Creates and inserts text on given position.
	 *
	 * ```ts
	 * writer.insertText( 'foo', position );
	 * ```
	 *
	 * Instead of using position you can use parent and offset or define that text should be inserted at the end
	 * or before or after other node:
	 *
	 * ```ts
	 * // Inserts 'foo' in paragraph, at offset 5:
	 * writer.insertText( 'foo', paragraph, 5 );
	 * // Inserts 'foo' at the end of a paragraph:
	 * writer.insertText( 'foo', paragraph, 'end' );
	 * // Inserts 'foo' after an image:
	 * writer.insertText( 'foo', image, 'after' );
	 * ```
	 *
	 * These parameters work in the same way as {@link #createPositionAt `writer.createPositionAt()`}.
	 *
	 * @label WITHOUT_ATTRIBUTES
	 * @param text Text data.
	 * @param offset Offset or one of the flags. Used only when second parameter is a {@link module:engine/model/item~ModelItem model item}.
	 */
	public insertText(
		text: string,
		itemOrPosition?: ModelItem | ModelPosition,
		offset?: ModelPositionOffset
	): void;

	/**
	 * Creates and inserts text with specified attributes on given position.
	 *
	 * ```ts
	 * writer.insertText( 'foo', { bold: true }, position );
	 * ```
	 *
	 * Instead of using position you can use parent and offset or define that text should be inserted at the end
	 * or before or after other node:
	 *
	 * ```ts
	 * // Inserts 'foo' in paragraph, at offset 5:
	 * writer.insertText( 'foo', { bold: true }, paragraph, 5 );
	 * // Inserts 'foo' at the end of a paragraph:
	 * writer.insertText( 'foo', { bold: true }, paragraph, 'end' );
	 * // Inserts 'foo' after an image:
	 * writer.insertText( 'foo', { bold: true }, image, 'after' );
	 * ```
	 *
	 * These parameters work in the same way as {@link #createPositionAt `writer.createPositionAt()`}.
	 *
	 * @label WITH_ATTRIBUTES
	 * @param text Text data.
	 * @param attributes Text attributes.
	 * @param offset Offset or one of the flags. Used only when third parameter is a {@link module:engine/model/item~ModelItem model item}.
	 */
	public insertText(
		text: string,
		attributes?: ModelNodeAttributes,
		itemOrPosition?: ModelItem | ModelPosition,
		offset?: ModelPositionOffset
	): void;

	public insertText(
		text: string,
		attributes?: any, // Too complicated when not using `any`.
		itemOrPosition?: any, // Too complicated when not using `any`.
		offset?: any // Too complicated when not using `any`.
	): void {
		if ( attributes instanceof ModelDocumentFragment || attributes instanceof ModelElement || attributes instanceof ModelPosition ) {
			this.insert( this.createText( text ), attributes, itemOrPosition );
		} else {
			this.insert( this.createText( text, attributes ), itemOrPosition, offset );
		}
	}

	/**
	 * Creates and inserts element on given position. You can optionally set attributes:
	 *
	 * ```ts
	 * writer.insertElement( 'paragraph', position );
	 * ```
	 *
	 * Instead of using position you can use parent and offset or define that text should be inserted at the end
	 * or before or after other node:
	 *
	 * ```ts
	 * // Inserts paragraph in the root at offset 5:
	 * writer.insertElement( 'paragraph', root, 5 );
	 * // Inserts paragraph at the end of a blockquote:
	 * writer.insertElement( 'paragraph', blockquote, 'end' );
	 * // Inserts after an image:
	 * writer.insertElement( 'paragraph', image, 'after' );
	 * ```
	 *
	 * These parameters works the same way as {@link #createPositionAt `writer.createPositionAt()`}.
	 *
	 * @label WITHOUT_ATTRIBUTES
	 * @param name Name of the element.
	 * @param offset Offset or one of the flags. Used only when second parameter is a {@link module:engine/model/item~ModelItem model item}.
	 */
	public insertElement(
		name: string,
		itemOrPosition: ModelItem | ModelDocumentFragment | ModelPosition,
		offset?: ModelPositionOffset
	): void;

	/**
	 * Creates and inserts element with specified attributes on given position.
	 *
	 * ```ts
	 * writer.insertElement( 'paragraph', { alignment: 'center' }, position );
	 * ```
	 *
	 * Instead of using position you can use parent and offset or define that text should be inserted at the end
	 * or before or after other node:
	 *
	 * ```ts
	 * // Inserts paragraph in the root at offset 5:
	 * writer.insertElement( 'paragraph', { alignment: 'center' }, root, 5 );
	 * // Inserts paragraph at the end of a blockquote:
	 * writer.insertElement( 'paragraph', { alignment: 'center' }, blockquote, 'end' );
	 * // Inserts after an image:
	 * writer.insertElement( 'paragraph', { alignment: 'center' }, image, 'after' );
	 * ```
	 *
	 * These parameters works the same way as {@link #createPositionAt `writer.createPositionAt()`}.
	 *
	 * @label WITH_ATTRIBUTES
	 * @param name Name of the element.
	 * @param attributes Elements attributes.
	 * @param offset Offset or one of the flags. Used only when third parameter is a {@link module:engine/model/item~ModelItem model item}.
	 */
	public insertElement(
		name: string,
		attributes: ModelNodeAttributes,
		itemOrPosition: ModelItem | ModelDocumentFragment | ModelPosition,
		offset?: ModelPositionOffset
	): void;

	public insertElement(
		name: string,
		attributes: any, // Too complicated when not using `any`.
		itemOrPositionOrOffset?: any, // Too complicated when not using `any`.
		offset?: any // Too complicated when not using `any`.
	): void {
		if ( attributes instanceof ModelDocumentFragment || attributes instanceof ModelElement || attributes instanceof ModelPosition ) {
			this.insert( this.createElement( name ), attributes, itemOrPositionOrOffset );
		} else {
			this.insert( this.createElement( name, attributes ), itemOrPositionOrOffset, offset );
		}
	}

	/**
	 * Inserts item at the end of the given parent.
	 *
	 * ```ts
	 * const paragraph = writer.createElement( 'paragraph' );
	 * writer.append( paragraph, root );
	 * ```
	 *
	 * Note that if the item already has parent it will be removed from the previous parent.
	 *
	 * If you want to move {@link module:engine/model/range~ModelRange range} instead of an
	 * {@link module:engine/model/item~ModelItem item} use {@link module:engine/model/writer~ModelWriter#move `Writer#move()`}.
	 *
	 * @param item Item or document fragment to insert.
	 */
	public append( item: ModelItem | ModelDocumentFragment, parent: ModelElement | ModelDocumentFragment ): void {
		this.insert( item, parent, 'end' );
	}

	/**
	 * Creates text node and inserts it at the end of the parent.
	 *
	 * ```ts
	 * writer.appendText( 'foo', paragraph );
	 * ```
	 *
	 * @label WITHOUT_ATTRIBUTES
	 * @param text Text data.
	 */
	public appendText(
		text: string,
		parent: ModelElement | ModelDocumentFragment
	): void;

	/**
	 * Creates text node with specified attributes and inserts it at the end of the parent.
	 *
	 * ```ts
	 * writer.appendText( 'foo', { bold: true }, paragraph );
	 * ```
	 *
	 * @label WITH_ATTRIBUTES
	 * @param text Text data.
	 * @param attributes Text attributes.
	 */
	public appendText(
		text: string,
		attributes: ModelNodeAttributes,
		parent: ModelElement | ModelDocumentFragment
	): void;

	public appendText(
		text: string,
		attributes: ModelNodeAttributes | ModelElement | ModelDocumentFragment,
		parent?: ModelElement | ModelDocumentFragment
	): void {
		if ( attributes instanceof ModelDocumentFragment || attributes instanceof ModelElement ) {
			this.insert( this.createText( text ), attributes, 'end' );
		} else {
			this.insert( this.createText( text, attributes ), parent!, 'end' );
		}
	}

	/**
	 * Creates element and inserts it at the end of the parent.
	 *
	 * ```ts
	 * writer.appendElement( 'paragraph', root );
	 * ```
	 *
	 * @label WITHOUT_ATTRIBUTES
	 * @param name Name of the element.
	 */
	public appendElement(
		name: string,
		parent: ModelElement | ModelDocumentFragment
	): void;

	/**
	 * Creates element with specified attributes and inserts it at the end of the parent.
	 *
	 * ```ts
	 * writer.appendElement( 'paragraph', { alignment: 'center' }, root );
	 * ```
	 *
	 * @label WITH_ATTRIBUTES
	 * @param name Name of the element.
	 * @param attributes Elements attributes.
	 */
	public appendElement(
		name: string,
		attributes: ModelNodeAttributes,
		parent: ModelElement | ModelDocumentFragment
	): void;

	public appendElement(
		name: string,
		attributes: ModelNodeAttributes | ModelElement | ModelDocumentFragment,
		parent?: ModelElement | ModelDocumentFragment
	): void {
		if ( attributes instanceof ModelDocumentFragment || attributes instanceof ModelElement ) {
			this.insert( this.createElement( name ), attributes, 'end' );
		} else {
			this.insert( this.createElement( name, attributes ), parent!, 'end' );
		}
	}

	/**
	 * Sets value of the attribute with given key on a {@link module:engine/model/item~ModelItem model item}
	 * or on a {@link module:engine/model/range~ModelRange range}.
	 *
	 * @param key Attribute key.
	 * @param value Attribute new value.
	 * @param itemOrRange Model item or range on which the attribute will be set.
	 */
	public setAttribute( key: string, value: unknown, itemOrRange: ModelItem | ModelRange ): void {
		this._assertWriterUsedCorrectly();

		if ( itemOrRange instanceof ModelRange ) {
			const ranges = itemOrRange.getMinimalFlatRanges();

			for ( const range of ranges ) {
				setAttributeOnRange( this, key, value, range );
			}
		} else {
			setAttributeOnItem( this, key, value, itemOrRange );
		}
	}

	/**
	 * Sets values of attributes on a {@link module:engine/model/item~ModelItem model item}
	 * or on a {@link module:engine/model/range~ModelRange range}.
	 *
	 * ```ts
	 * writer.setAttributes( {
	 * 	bold: true,
	 * 	italic: true
	 * }, range );
	 * ```
	 *
	 * @param attributes Attributes keys and values.
	 * @param itemOrRange Model item or range on which the attributes will be set.
	 */
	public setAttributes(
		attributes: ModelNodeAttributes,
		itemOrRange: ModelItem | ModelRange
	): void {
		for ( const [ key, val ] of toMap( attributes ) ) {
			this.setAttribute( key, val, itemOrRange );
		}
	}

	/**
	 * Removes an attribute with given key from a {@link module:engine/model/item~ModelItem model item}
	 * or from a {@link module:engine/model/range~ModelRange range}.
	 *
	 * @param key Attribute key.
	 * @param itemOrRange Model item or range from which the attribute will be removed.
	 */
	public removeAttribute( key: string, itemOrRange: ModelItem | ModelRange ): void {
		this._assertWriterUsedCorrectly();

		if ( itemOrRange instanceof ModelRange ) {
			const ranges = itemOrRange.getMinimalFlatRanges();

			for ( const range of ranges ) {
				setAttributeOnRange( this, key, null, range );
			}
		} else {
			setAttributeOnItem( this, key, null, itemOrRange );
		}
	}

	/**
	 * Removes all attributes from all elements in the range or from the given item.
	 *
	 * @param itemOrRange Model item or range from which all attributes will be removed.
	 */
	public clearAttributes( itemOrRange: ModelItem | ModelRange ): void {
		this._assertWriterUsedCorrectly();

		const removeAttributesFromItem = ( item: ModelItem ) => {
			for ( const attribute of item.getAttributeKeys() ) {
				this.removeAttribute( attribute, item );
			}
		};

		if ( !( itemOrRange instanceof ModelRange ) ) {
			removeAttributesFromItem( itemOrRange );
		} else {
			for ( const item of itemOrRange.getItems() ) {
				removeAttributesFromItem( item );
			}
		}
	}

	/**
	 * Moves all items in the source range to the target position.
	 *
	 * ```ts
	 * writer.move( sourceRange, targetPosition );
	 * ```
	 *
	 * Instead of the target position you can use parent and offset or define that range should be moved to the end
	 * or before or after chosen item:
	 *
	 * ```ts
	 * // Moves all items in the range to the paragraph at offset 5:
	 * writer.move( sourceRange, paragraph, 5 );
	 * // Moves all items in the range to the end of a blockquote:
	 * writer.move( sourceRange, blockquote, 'end' );
	 * // Moves all items in the range to a position after an image:
	 * writer.move( sourceRange, image, 'after' );
	 * ```
	 *
	 * These parameters work the same way as {@link #createPositionAt `writer.createPositionAt()`}.
	 *
	 * Note that items can be moved only within the same tree. It means that you can move items within the same root
	 * (element or document fragment) or between {@link module:engine/model/document~ModelDocument#roots documents roots},
	 * but you cannot move items from document fragment to the document or from one detached element to another. Use
	 * {@link module:engine/model/writer~ModelWriter#insert} in such cases.
	 *
	 * @param range Source range.
	 * @param offset Offset or one of the flags. Used only when second parameter is a {@link module:engine/model/item~ModelItem model item}.
	 */
	public move(
		range: ModelRange,
		itemOrPosition: ModelItem | ModelPosition,
		offset?: ModelPositionOffset
	): void {
		this._assertWriterUsedCorrectly();

		if ( !( range instanceof ModelRange ) ) {
			/**
			 * Invalid range to move.
			 *
			 * @error writer-move-invalid-range
			 */
			throw new CKEditorError( 'writer-move-invalid-range', this );
		}

		if ( !range.isFlat ) {
			/**
			 * Range to move is not flat.
			 *
			 * @error writer-move-range-not-flat
			 */
			throw new CKEditorError( 'writer-move-range-not-flat', this );
		}

		const position = ModelPosition._createAt( itemOrPosition, offset );

		// Do not move anything if the move target is same as moved range start.
		if ( position.isEqual( range.start ) ) {
			return;
		}

		// If part of the marker is removed, create additional marker operation for undo purposes.
		this._addOperationForAffectedMarkers( 'move', range );

		if ( !isSameTree( range.root, position.root ) ) {
			/**
			 * Range is going to be moved within not the same document. Please use
			 * {@link module:engine/model/writer~ModelWriter#insert insert} instead.
			 *
			 * @error writer-move-different-document
			 */
			throw new CKEditorError( 'writer-move-different-document', this );
		}

		const version = range.root.document ? range.root.document.version : null;
		const operation = new MoveOperation( range.start, range.end.offset - range.start.offset, position, version );

		this.batch.addOperation( operation );
		this.model.applyOperation( operation );
	}

	/**
	 * Removes given model {@link module:engine/model/item~ModelItem item} or {@link module:engine/model/range~ModelRange range}.
	 *
	 * @param itemOrRange Model item or range to remove.
	 */
	public remove( itemOrRange: ModelItem | ModelRange ): void {
		this._assertWriterUsedCorrectly();

		const rangeToRemove = itemOrRange instanceof ModelRange ? itemOrRange : ModelRange._createOn( itemOrRange );
		const ranges = rangeToRemove.getMinimalFlatRanges().reverse();

		for ( const flat of ranges ) {
			// If part of the marker is removed, create additional marker operation for undo purposes.
			this._addOperationForAffectedMarkers( 'move', flat );

			applyRemoveOperation( flat.start, flat.end.offset - flat.start.offset, this.batch, this.model );
		}
	}

	/**
	 * Merges two siblings at the given position.
	 *
	 * Node before and after the position have to be an element. Otherwise `writer-merge-no-element-before` or
	 * `writer-merge-no-element-after` error will be thrown.
	 *
	 * @param position Position between merged elements.
	 */
	public merge( position: ModelPosition ): void {
		this._assertWriterUsedCorrectly();

		const nodeBefore = position.nodeBefore;
		const nodeAfter = position.nodeAfter;

		// If part of the marker is removed, create additional marker operation for undo purposes.
		this._addOperationForAffectedMarkers( 'merge', position );

		if ( !( nodeBefore instanceof ModelElement ) ) {
			/**
			 * Node before merge position must be an element.
			 *
			 * @error writer-merge-no-element-before
			 */
			throw new CKEditorError( 'writer-merge-no-element-before', this );
		}

		if ( !( nodeAfter instanceof ModelElement ) ) {
			/**
			 * Node after merge position must be an element.
			 *
			 * @error writer-merge-no-element-after
			 */
			throw new CKEditorError( 'writer-merge-no-element-after', this );
		}

		if ( !position.root.document ) {
			this._mergeDetached( position );
		} else {
			this._merge( position );
		}
	}

	/**
	 * Shortcut for {@link module:engine/model/model~Model#createPositionFromPath `Model#createPositionFromPath()`}.
	 *
	 * @param root Root of the position.
	 * @param path Position path. See {@link module:engine/model/position~ModelPosition#path}.
	 * @param stickiness Position stickiness. See {@link module:engine/model/position~ModelPositionStickiness}.
	 */
	public createPositionFromPath(
		root: ModelElement | ModelDocumentFragment,
		path: ReadonlyArray<number>,
		stickiness?: ModelPositionStickiness
	): ModelPosition {
		return this.model.createPositionFromPath( root, path, stickiness );
	}

	/**
	 * Shortcut for {@link module:engine/model/model~Model#createPositionAt `Model#createPositionAt()`}.
	 *
	 * @param offset Offset or one of the flags. Used only when first parameter is a {@link module:engine/model/item~ModelItem model item}.
	 */
	public createPositionAt(
		itemOrPosition: ModelItem | ModelPosition | ModelDocumentFragment,
		offset?: ModelPositionOffset
	): ModelPosition {
		return this.model.createPositionAt( itemOrPosition, offset );
	}

	/**
	 * Shortcut for {@link module:engine/model/model~Model#createPositionAfter `Model#createPositionAfter()`}.
	 *
	 * @param item Item after which the position should be placed.
	 */
	public createPositionAfter( item: ModelItem ): ModelPosition {
		return this.model.createPositionAfter( item );
	}

	/**
	 * Shortcut for {@link module:engine/model/model~Model#createPositionBefore `Model#createPositionBefore()`}.
	 *
	 * @param item Item after which the position should be placed.
	 */
	public createPositionBefore( item: ModelItem ): ModelPosition {
		return this.model.createPositionBefore( item );
	}

	/**
	 * Shortcut for {@link module:engine/model/model~Model#createRange `Model#createRange()`}.
	 *
	 * @param start Start position.
	 * @param end End position. If not set, range will be collapsed at `start` position.
	 */
	public createRange( start: ModelPosition, end?: ModelPosition ): ModelRange {
		return this.model.createRange( start, end );
	}

	/**
	 * Shortcut for {@link module:engine/model/model~Model#createRangeIn `Model#createRangeIn()`}.
	 *
	 * @param element Element which is a parent for the range.
	 */
	public createRangeIn( element: ModelElement | ModelDocumentFragment ): ModelRange {
		return this.model.createRangeIn( element );
	}

	/**
	 * Shortcut for {@link module:engine/model/model~Model#createRangeOn `Model#createRangeOn()`}.
	 *
	 * @param element Element which is a parent for the range.
	 */
	public createRangeOn( element: ModelItem ): ModelRange {
		return this.model.createRangeOn( element );
	}

	/**
	 * Shortcut for {@link module:engine/model/model~Model#createSelection:NODE_OFFSET `Model#createSelection()`}.
	 *
	 * @label NODE_OFFSET
	 */
	public createSelection( selectable: ModelNode, placeOrOffset: ModelPlaceOrOffset, options?: { backward?: boolean } ): ModelSelection;

	/**
	 * Shortcut for {@link module:engine/model/model~Model#createSelection:SELECTABLE `Model#createSelection()`}.
	 *
	 * @label SELECTABLE
	 */
	public createSelection( selectable?: Exclude<ModelSelectable, ModelNode>, options?: { backward?: boolean } ): ModelSelection;

	public createSelection( ...args: [ any?, any?, any? ] ): ModelSelection {
		return this.model.createSelection( ...args );
	}

	/**
	 * Performs merge action in a detached tree.
	 *
	 * @param position Position between merged elements.
	 */
	private _mergeDetached( position: ModelPosition ): void {
		const nodeBefore = position.nodeBefore;
		const nodeAfter = position.nodeAfter;

		this.move( ModelRange._createIn( nodeAfter as any ), ModelPosition._createAt( nodeBefore!, 'end' ) );
		this.remove( nodeAfter! );
	}

	/**
	 * Performs merge action in a non-detached tree.
	 *
	 * @param position Position between merged elements.
	 */
	private _merge( position: ModelPosition ): void {
		const targetPosition = ModelPosition._createAt( position.nodeBefore!, 'end' );
		const sourcePosition = ModelPosition._createAt( position.nodeAfter!, 0 );

		const graveyard = position.root.document!.graveyard;
		const graveyardPosition = new ModelPosition( graveyard, [ 0 ] );

		const version = position.root.document!.version;

		const merge = new MergeOperation(
			sourcePosition,
			( position.nodeAfter as any ).maxOffset,
			targetPosition,
			graveyardPosition,
			version
		);

		this.batch.addOperation( merge );
		this.model.applyOperation( merge );
	}

	/**
	 * Renames the given element.
	 *
	 * @param element The element to rename.
	 * @param newName New element name.
	 */
	public rename( element: ModelElement | ModelDocumentFragment, newName: string ): void {
		this._assertWriterUsedCorrectly();

		if ( !( element instanceof ModelElement ) ) {
			/**
			 * Trying to rename an object which is not an instance of Element.
			 *
			 * @error writer-rename-not-element-instance
			 */
			throw new CKEditorError(
				'writer-rename-not-element-instance',
				this
			);
		}

		const version = element.root.document ? element.root.document.version : null;
		const renameOperation = new RenameOperation( ModelPosition._createBefore( element ), element.name, newName, version );

		this.batch.addOperation( renameOperation );
		this.model.applyOperation( renameOperation );
	}

	/**
	 * Splits elements starting from the given position and going to the top of the model tree as long as given
	 * `limitElement` is reached. When `limitElement` is not defined then only the parent of the given position will be split.
	 *
	 * The element needs to have a parent. It cannot be a root element nor a document fragment.
	 * The `writer-split-element-no-parent` error will be thrown if you try to split an element with no parent.
	 *
	 * @param position Position of split.
	 * @param limitElement Stop splitting when this element will be reached.
	 * @returns Split result with properties:
	 * * `position` - Position between split elements.
	 * * `range` - Range that stars from the end of the first split element and ends at the beginning of the first copy element.
	 */
	public split(
		position: ModelPosition,
		limitElement?: ModelNode | ModelDocumentFragment
	): { position: ModelPosition; range: ModelRange } {
		this._assertWriterUsedCorrectly();

		let splitElement = position.parent;

		if ( !splitElement.parent ) {
			/**
			 * Element with no parent cannot be split.
			 *
			 * @error writer-split-element-no-parent
			 */
			throw new CKEditorError( 'writer-split-element-no-parent', this );
		}

		// When limit element is not defined lets set splitElement parent as limit.
		if ( !limitElement ) {
			limitElement = splitElement.parent;
		}

		if ( !position.parent.getAncestors( { includeSelf: true } ).includes( limitElement! ) ) {
			/**
			 * Limit element is not a position ancestor.
			 *
			 * @error writer-split-invalid-limit-element
			 */
			throw new CKEditorError( 'writer-split-invalid-limit-element', this );
		}

		// We need to cache elements that will be created as a result of the first split because
		// we need to create a range from the end of the first split element to the beginning of the
		// first copy element. This should be handled by ModelLiveRange but it doesn't work on detached nodes.
		let firstSplitElement: ModelElement | ModelDocumentFragment | undefined;
		let firstCopyElement: ModelNode | null | undefined;

		do {
			const version = splitElement.root.document ? splitElement.root.document.version : null;
			const howMany = splitElement.maxOffset - position.offset;

			const insertionPosition = SplitOperation.getInsertionPosition( position );
			const split = new SplitOperation( position, howMany, insertionPosition, null, version );

			this.batch.addOperation( split );
			this.model.applyOperation( split );

			// Cache result of the first split.
			if ( !firstSplitElement && !firstCopyElement ) {
				firstSplitElement = splitElement;
				firstCopyElement = position.parent.nextSibling;
			}

			position = this.createPositionAfter( position.parent as any );
			splitElement = position.parent;
		} while ( splitElement !== limitElement );

		return {
			position,
			range: new ModelRange( ModelPosition._createAt( firstSplitElement!, 'end' ), ModelPosition._createAt( firstCopyElement!, 0 ) )
		};
	}

	/**
	 * Wraps the given range with the given element or with a new element (if a string was passed).
	 *
	 * **Note:** range to wrap should be a "flat range" (see {@link module:engine/model/range~ModelRange#isFlat `Range#isFlat`}).
	 * If not, an error will be thrown.
	 *
	 * @param range Range to wrap.
	 * @param elementOrString Element or name of element to wrap the range with.
	 */
	public wrap( range: ModelRange, elementOrString: ModelElement | string ): void {
		this._assertWriterUsedCorrectly();

		if ( !range.isFlat ) {
			/**
			 * Range to wrap is not flat.
			 *
			 * @error writer-wrap-range-not-flat
			 */
			throw new CKEditorError( 'writer-wrap-range-not-flat', this );
		}

		const element = elementOrString instanceof ModelElement ? elementOrString : new ModelElement( elementOrString );

		if ( element.childCount > 0 ) {
			/**
			 * Element to wrap with is not empty.
			 *
			 * @error writer-wrap-element-not-empty
			 */
			throw new CKEditorError( 'writer-wrap-element-not-empty', this );
		}

		if ( element.parent !== null ) {
			/**
			 * Element to wrap with is already attached to a tree model.
			 *
			 * @error writer-wrap-element-attached
			 */
			throw new CKEditorError( 'writer-wrap-element-attached', this );
		}

		this.insert( element, range.start );

		// Shift the range-to-wrap because we just inserted an element before that range.
		const shiftedRange = new ModelRange( range.start.getShiftedBy( 1 ), range.end.getShiftedBy( 1 ) );

		this.move( shiftedRange, ModelPosition._createAt( element, 0 ) );
	}

	/**
	 * Unwraps children of the given element – all its children are moved before it and then the element is removed.
	 * Throws error if you try to unwrap an element which does not have a parent.
	 *
	 * @param element Element to unwrap.
	 */
	public unwrap( element: ModelElement ): void {
		this._assertWriterUsedCorrectly();

		if ( element.parent === null ) {
			/**
			 * Trying to unwrap an element which has no parent.
			 *
			 * @error writer-unwrap-element-no-parent
			 */
			throw new CKEditorError( 'writer-unwrap-element-no-parent', this );
		}

		this.move( ModelRange._createIn( element ), this.createPositionAfter( element ) );
		this.remove( element );
	}

	/**
	 * Adds a {@link module:engine/model/markercollection~Marker marker}. Marker is a named range, which tracks
	 * changes in the document and updates its range automatically, when model tree changes.
	 *
	 * As the first parameter you can set marker name.
	 *
	 * The required `options.usingOperation` parameter lets you decide if the marker should be managed by operations or not. See
	 * {@link module:engine/model/markercollection~Marker marker class description} to learn about the difference between
	 * markers managed by operations and not-managed by operations.
	 *
	 * The `options.affectsData` parameter, which defaults to `false`, allows you to define if a marker affects the data. It should be
	 * `true` when the marker change changes the data returned by the
	 * {@link module:core/editor/editor~Editor#getData `editor.getData()`} method.
	 * When set to `true` it fires the {@link module:engine/model/document~ModelDocument#event:change:data `change:data`} event.
	 * When set to `false` it fires the {@link module:engine/model/document~ModelDocument#event:change `change`} event.
	 *
	 * Create marker directly base on marker's name:
	 *
	 * ```ts
	 * addMarker( markerName, { range, usingOperation: false } );
	 * ```
	 *
	 * Create marker using operation:
	 *
	 * ```ts
	 * addMarker( markerName, { range, usingOperation: true } );
	 * ```
	 *
	 * Create marker that affects the editor data:
	 *
	 * ```ts
	 * addMarker( markerName, { range, usingOperation: false, affectsData: true } );
	 * ```
	 *
	 * Note: For efficiency reasons, it's best to create and keep as little markers as possible.
	 *
	 * @see module:engine/model/markercollection~Marker
	 * @param name Name of a marker to create - must be unique.
	 * @param options.usingOperation Flag indicating that the marker should be added by MarkerOperation.
	 * See {@link module:engine/model/markercollection~Marker#managedUsingOperations}.
	 * @param options.range Marker range.
	 * @param options.affectsData Flag indicating that the marker changes the editor data.
	 * @returns Marker that was set.
	 */
	public addMarker(
		name: string,
		options: {
			usingOperation: boolean;
			affectsData?: boolean;
			range: ModelRange;
		}
	): Marker {
		this._assertWriterUsedCorrectly();

		if ( !options || typeof options.usingOperation != 'boolean' ) {
			/**
			 * The `options.usingOperation` parameter is required when adding a new marker.
			 *
			 * @error writer-addmarker-no-usingoperation
			 */
			throw new CKEditorError( 'writer-addmarker-no-usingoperation', this );
		}

		const usingOperation = options.usingOperation;
		const range = options.range;
		const affectsData = options.affectsData === undefined ? false : options.affectsData;

		if ( this.model.markers.has( name ) ) {
			/**
			 * Marker with provided name already exists.
			 *
			 * @error writer-addmarker-marker-exists
			 */
			throw new CKEditorError( 'writer-addmarker-marker-exists', this );
		}

		if ( !range ) {
			/**
			 * Range parameter is required when adding a new marker.
			 *
			 * @error writer-addmarker-no-range
			 */
			throw new CKEditorError( 'writer-addmarker-no-range', this );
		}

		if ( !usingOperation ) {
			return this.model.markers._set( name, range, usingOperation, affectsData );
		}

		applyMarkerOperation( this, name, null, range, affectsData );

		return this.model.markers.get( name )!;
	}

	/**
	 * Adds, updates or refreshes a {@link module:engine/model/markercollection~Marker marker}. Marker is a named range, which tracks
	 * changes in the document and updates its range automatically, when model tree changes. Still, it is possible to change the
	 * marker's range directly using this method.
	 *
	 * As the first parameter you can set marker name or instance. If none of them is provided, new marker, with a unique
	 * name is created and returned.
	 *
	 * **Note**: If you want to change the {@link module:engine/view/element~ViewElement view element}
	 * of the marker while its data in the model
	 * remains the same, use the dedicated {@link module:engine/controller/editingcontroller~EditingController#reconvertMarker} method.
	 *
	 * The `options.usingOperation` parameter lets you change if the marker should be managed by operations or not. See
	 * {@link module:engine/model/markercollection~Marker marker class description} to learn about the difference between
	 * markers managed by operations and not-managed by operations. It is possible to change this option for an existing marker.
	 *
	 * The `options.affectsData` parameter, which defaults to `false`, allows you to define if a marker affects the data. It should be
	 * `true` when the marker change changes the data returned by
	 * the {@link module:core/editor/editor~Editor#getData `editor.getData()`} method.
	 * When set to `true` it fires the {@link module:engine/model/document~ModelDocument#event:change:data `change:data`} event.
	 * When set to `false` it fires the {@link module:engine/model/document~ModelDocument#event:change `change`} event.
	 *
	 * Update marker directly base on marker's name:
	 *
	 * ```ts
	 * updateMarker( markerName, { range } );
	 * ```
	 *
	 * Update marker using operation:
	 *
	 * ```ts
	 * updateMarker( marker, { range, usingOperation: true } );
	 * updateMarker( markerName, { range, usingOperation: true } );
	 * ```
	 *
	 * Change marker's option (start using operations to manage it):
	 *
	 * ```ts
	 * updateMarker( marker, { usingOperation: true } );
	 * ```
	 *
	 * Change marker's option (inform the engine, that the marker does not affect the data anymore):
	 *
	 * ```ts
	 * updateMarker( markerName, { affectsData: false } );
	 * ```
	 *
	 * @see module:engine/model/markercollection~Marker
	 * @param markerOrName Name of a marker to update, or a marker instance.
	 * @param options If options object is not defined then marker will be refreshed by triggering
	 * downcast conversion for this marker with the same data.
	 * @param options.range Marker range to update.
	 * @param options.usingOperation Flag indicated whether the marker should be added by MarkerOperation.
	 * See {@link module:engine/model/markercollection~Marker#managedUsingOperations}.
	 * @param options.affectsData Flag indicating that the marker changes the editor data.
	 */
	public updateMarker(
		markerOrName: string | Marker,
		options?: {
			range?: ModelRange;
			usingOperation?: boolean;
			affectsData?: boolean;
		}
	): void {
		this._assertWriterUsedCorrectly();

		const markerName = typeof markerOrName == 'string' ? markerOrName : markerOrName.name;
		const currentMarker = this.model.markers.get( markerName );

		if ( !currentMarker ) {
			/**
			 * Marker with provided name does not exist and will not be updated.
			 *
			 * @error writer-updatemarker-marker-not-exists
			 */
			throw new CKEditorError( 'writer-updatemarker-marker-not-exists', this );
		}

		if ( !options ) {
			/**
			 * The usage of `writer.updateMarker()` only to reconvert (refresh) a
			 * {@link module:engine/model/markercollection~Marker model marker} was deprecated and may not work in the future.
			 * Please update your code to use
			 * {@link module:engine/controller/editingcontroller~EditingController#reconvertMarker `editor.editing.reconvertMarker()`}
			 * instead.
			 *
			 * @error writer-updatemarker-reconvert-using-editingcontroller
			 * @param markerName The name of the updated marker.
			 */
			logWarning( 'writer-updatemarker-reconvert-using-editingcontroller', { markerName } );

			this.model.markers._refresh( currentMarker );

			return;
		}

		const hasUsingOperationDefined = typeof options.usingOperation == 'boolean';
		const affectsDataDefined = typeof options.affectsData == 'boolean';

		// Use previously defined marker's affectsData if the property is not provided.
		const affectsData = affectsDataDefined ? options.affectsData : currentMarker.affectsData;

		if ( !hasUsingOperationDefined && !options.range && !affectsDataDefined ) {
			/**
			 * One of the options is required - provide range, usingOperations or affectsData.
			 *
			 * @error writer-updatemarker-wrong-options
			 */
			throw new CKEditorError( 'writer-updatemarker-wrong-options', this );
		}

		const currentRange = currentMarker.getRange();
		const updatedRange = options.range ? options.range : currentRange;

		if ( hasUsingOperationDefined && options.usingOperation !== currentMarker.managedUsingOperations ) {
			// The marker type is changed so it's necessary to create proper operations.
			if ( options.usingOperation ) {
				// If marker changes to a managed one treat this as synchronizing existing marker.
				// Create `MarkerOperation` with `oldRange` set to `null`, so reverse operation will remove the marker.
				applyMarkerOperation( this, markerName, null, updatedRange, affectsData );
			} else {
				// If marker changes to a marker that do not use operations then we need to create additional operation
				// that removes that marker first.
				applyMarkerOperation( this, markerName, currentRange, null, affectsData );

				// Although not managed the marker itself should stay in model and its range should be preserver or changed to passed range.
				this.model.markers._set( markerName, updatedRange, undefined, affectsData );
			}

			return;
		}

		// Marker's type doesn't change so update it accordingly.
		if ( currentMarker.managedUsingOperations ) {
			applyMarkerOperation( this, markerName, currentRange, updatedRange, affectsData );
		} else {
			this.model.markers._set( markerName, updatedRange, undefined, affectsData );
		}
	}

	/**
	 * Removes given {@link module:engine/model/markercollection~Marker marker} or marker with given name.
	 * The marker is removed accordingly to how it has been created, so if the marker was created using operation,
	 * it will be destroyed using operation.
	 *
	 * @param markerOrName Marker or marker name to remove.
	 */
	public removeMarker( markerOrName: string | Marker ): void {
		this._assertWriterUsedCorrectly();

		const name = typeof markerOrName == 'string' ? markerOrName : markerOrName.name;

		if ( !this.model.markers.has( name ) ) {
			/**
			 * Trying to remove marker which does not exist.
			 *
			 * @error writer-removemarker-no-marker
			 */
			throw new CKEditorError( 'writer-removemarker-no-marker', this );
		}

		const marker = this.model.markers.get( name )!;

		if ( !marker.managedUsingOperations ) {
			this.model.markers._remove( name );

			return;
		}

		const oldRange = marker.getRange();

		applyMarkerOperation( this, name, oldRange, null, marker.affectsData );
	}

	/**
	 * Adds a new root to the document (or re-attaches a {@link #detachRoot detached root}).
	 *
	 * Throws an error, if trying to add a root that is already added and attached.
	 *
	 * @param rootName Name of the added root.
	 * @param elementName The element name. Defaults to `'$root'` which also has some basic schema defined
	 * (e.g. `$block` elements are allowed inside the `$root`). Make sure to define a proper schema if you use a different name.
	 * @returns The added root element.
	 */
	public addRoot( rootName: string, elementName = '$root' ): ModelRootElement {
		this._assertWriterUsedCorrectly();

		const root = this.model.document.getRoot( rootName );

		if ( root && root.isAttached() ) {
			/**
			 * Root with provided name already exists and is attached.
			 *
			 * @error writer-addroot-root-exists
			 */
			throw new CKEditorError( 'writer-addroot-root-exists', this );
		}

		const document = this.model.document;
		const operation = new RootOperation( rootName, elementName, true, document, document.version );

		this.batch.addOperation( operation );
		this.model.applyOperation( operation );

		return this.model.document.getRoot( rootName )!;
	}

	/**
	 * Detaches the root from the document.
	 *
	 * All content and markers are removed from the root upon detaching. New content and new markers cannot be added to the root, as long
	 * as it is detached.
	 *
	 * A root cannot be fully removed from the document, it can be only detached. A root is permanently removed only after you
	 * re-initialize the editor and do not specify the root in the initial data.
	 *
	 * A detached root can be re-attached using {@link #addRoot}.
	 *
	 * Throws an error if the root does not exist or the root is already detached.
	 *
	 * @param rootOrName Name of the detached root.
	 */
	public detachRoot( rootOrName: string | ModelRootElement ): void {
		this._assertWriterUsedCorrectly();

		const root = typeof rootOrName == 'string' ? this.model.document.getRoot( rootOrName ) : rootOrName;

		if ( !root || !root.isAttached() ) {
			/**
			 * Root with provided name does not exist or is already detached.
			 *
			 * @error writer-detachroot-no-root
			 */
			throw new CKEditorError( 'writer-detachroot-no-root', this );
		}

		// First, remove all markers from the root. It is better to do it before removing stuff for undo purposes.
		// However, looking through all the markers may not be the best performance wise. But there's no better solution for now.
		for ( const marker of this.model.markers ) {
			if ( marker.getRange().root === root ) {
				this.removeMarker( marker );
			}
		}

		// Remove all attributes from the root.
		for ( const key of root.getAttributeKeys() ) {
			this.removeAttribute( key, root );
		}

		// Remove all contents of the root.
		this.remove( this.createRangeIn( root ) );

		// Finally, detach the root.
		const document = this.model.document;
		const operation = new RootOperation( root.rootName, root.name, false, document, document.version );

		this.batch.addOperation( operation );
		this.model.applyOperation( operation );
	}

	/**
	 * Sets the document's selection (ranges and direction) to the specified location based on the given
	 * {@link module:engine/model/selection~ModelSelectable selectable} or creates an empty selection if no arguments were passed.
	 *
	 * ```ts
	 * // Sets collapsed selection at the position of the given node and an offset.
	 * writer.setSelection( paragraph, offset );
	 * ```
	 *
	 * Creates a range inside an {@link module:engine/model/element~ModelElement element} which starts before the first child of
	 * that element and ends after the last child of that element.
	 *
	 * ```ts
	 * writer.setSelection( paragraph, 'in' );
	 * ```
	 *
	 * Creates a range on an {@link module:engine/model/item~ModelItem item} which starts before the item and ends just after the item.
	 *
	 * ```ts
	 * writer.setSelection( paragraph, 'on' );
	 * ```
	 *
	 * `Writer#setSelection()` allow passing additional options (`backward`) as the last argument.
	 *
	 * ```ts
	 * // Sets selection as backward.
	 * writer.setSelection( element, 'in', { backward: true } );
	 * ```
	 *
	 * Throws `writer-incorrect-use` error when the writer is used outside the `change()` block.
	 *
	 * See also: {@link #setSelection:SELECTABLE `setSelection( selectable, options )`}.
	 *
	 * @label NODE_OFFSET
	 */
	public setSelection( selectable: ModelNode, placeOrOffset: ModelPlaceOrOffset, options?: { backward?: boolean } ): void;

	/**
	 * Sets the document's selection (ranges and direction) to the specified location based on the given
	 * {@link module:engine/model/selection~ModelSelectable selectable} or creates an empty selection if no arguments were passed.
	 *
	 * ```ts
	 * // Sets selection to the given range.
	 * const range = writer.createRange( start, end );
	 * writer.setSelection( range );
	 *
	 * // Sets selection to given ranges.
	 * const ranges = [ writer.createRange( start1, end2 ), writer.createRange( star2, end2 ) ];
	 * writer.setSelection( ranges );
	 *
	 * // Sets selection to other selection.
	 * const otherSelection = writer.createSelection();
	 * writer.setSelection( otherSelection );
	 *
	 * // Sets selection to the given document selection.
	 * const documentSelection = model.document.selection;
	 * writer.setSelection( documentSelection );
	 *
	 * // Sets collapsed selection at the given position.
	 * const position = writer.createPosition( root, path );
	 * writer.setSelection( position );
	 *
	 * // Removes all selection's ranges.
	 * writer.setSelection( null );
	 * ```
	 *
	 * `Writer#setSelection()` allow passing additional options (`backward`) as the last argument.
	 *
	 * ```ts
	 * // Sets selection as backward.
	 * writer.setSelection( range, { backward: true } );
	 * ```
	 *
	 * Throws `writer-incorrect-use` error when the writer is used outside the `change()` block.
	 *
	 * See also: {@link #setSelection:NODE_OFFSET `setSelection( node, placeOrOffset, options )`}.
	 *
	 * @label SELECTABLE
	 */
	public setSelection( selectable: Exclude<ModelSelectable, ModelNode>, options?: { backward?: boolean } ): void;

	public setSelection( ...args: Parameters<ModelSelection[ 'setTo' ]> ): void {
		this._assertWriterUsedCorrectly();

		this.model.document.selection._setTo( ...args );
	}

	/**
	 * Moves {@link module:engine/model/documentselection~ModelDocumentSelection#focus} to the specified location.
	 *
	 * The location can be specified in the same form as
	 * {@link #createPositionAt `writer.createPositionAt()`} parameters.
	 *
	 * @param itemOrPosition
	 * @param offset Offset or one of the flags. Used only when first parameter is a {@link module:engine/model/item~ModelItem model item}.
	 */
	public setSelectionFocus(
		itemOrPosition: ModelItem | ModelPosition,
		offset?: ModelPositionOffset
	): void {
		this._assertWriterUsedCorrectly();

		this.model.document.selection._setFocus( itemOrPosition, offset );
	}

	/**
	 * Sets attribute on the selection. If attribute with the same key already is set, it's value is overwritten.
	 *
	 * ```ts
	 * writer.setSelectionAttribute( 'italic', true );
	 * ```
	 *
	 * @label KEY_VALUE
	 * @param key Key of the attribute to set.
	 * @param value Attribute value.
	 */
	public setSelectionAttribute( key: string, value: unknown ): void;

	/**
	 * Sets attributes on the selection. If any attribute with the same key already is set, it's value is overwritten.
	 *
	 * Using key-value object:
	 *
	 * ```ts
	 * writer.setSelectionAttribute( { italic: true, bold: false } );
	 * ```
	 *
	 * Using iterable object:
	 *
	 * ```ts
	 * writer.setSelectionAttribute( new Map( [ [ 'italic', true ] ] ) );
	 * ```
	 *
	 * @label OBJECT
	 * @param objectOrIterable Object / iterable of key => value attribute pairs.
	 */
	public setSelectionAttribute( objectOrIterable: ModelNodeAttributes ): void;

	public setSelectionAttribute(
		keyOrObjectOrIterable: string | ModelNodeAttributes,
		value?: unknown
	): void {
		this._assertWriterUsedCorrectly();

		if ( typeof keyOrObjectOrIterable === 'string' ) {
			this._setSelectionAttribute( keyOrObjectOrIterable, value );
		} else {
			for ( const [ key, value ] of toMap( keyOrObjectOrIterable ) ) {
				this._setSelectionAttribute( key, value );
			}
		}
	}

	/**
	 * Removes attribute(s) with given key(s) from the selection.
	 *
	 * Remove one attribute:
	 *
	 * ```ts
	 * writer.removeSelectionAttribute( 'italic' );
	 * ```
	 *
	 * Remove multiple attributes:
	 *
	 * ```ts
	 * writer.removeSelectionAttribute( [ 'italic', 'bold' ] );
	 * ```
	 *
	 * @param keyOrIterableOfKeys Key of the attribute to remove or an iterable of attribute keys to remove.
	 */
	public removeSelectionAttribute( keyOrIterableOfKeys: string | Iterable<string> ): void {
		this._assertWriterUsedCorrectly();

		if ( typeof keyOrIterableOfKeys === 'string' ) {
			this._removeSelectionAttribute( keyOrIterableOfKeys );
		} else {
			for ( const key of keyOrIterableOfKeys ) {
				this._removeSelectionAttribute( key );
			}
		}
	}

	/**
	 * Temporarily changes the {@link module:engine/model/documentselection~ModelDocumentSelection#isGravityOverridden gravity}
	 * of the selection from left to right.
	 *
	 * The gravity defines from which direction the selection inherits its attributes. If it's the default left gravity,
	 * then the selection (after being moved by the user) inherits attributes from its left-hand side.
	 * This method allows to temporarily override this behavior by forcing the gravity to the right.
	 *
	 * For the following model fragment:
	 *
	 * ```xml
	 * <$text bold="true" linkHref="url">bar[]</$text><$text bold="true">biz</$text>
	 * ```
	 *
	 * * Default gravity: selection will have the `bold` and `linkHref` attributes.
	 * * Overridden gravity: selection will have `bold` attribute.
	 *
	 * **Note**: It returns an unique identifier which is required to restore the gravity. It guarantees the symmetry
	 * of the process.
	 *
	 * @returns The unique id which allows restoring the gravity.
	 */
	public overrideSelectionGravity(): string {
		return this.model.document.selection._overrideGravity();
	}

	/**
	 * Restores {@link ~ModelWriter#overrideSelectionGravity} gravity to default.
	 *
	 * Restoring the gravity is only possible using the unique identifier returned by
	 * {@link ~ModelWriter#overrideSelectionGravity}. Note that the gravity remains overridden as long as won't be restored
	 * the same number of times it was overridden.
	 *
	 * @param uid The unique id returned by {@link ~ModelWriter#overrideSelectionGravity}.
	 */
	public restoreSelectionGravity( uid: string ): void {
		this.model.document.selection._restoreGravity( uid );
	}

	/**
	 * @param key Key of the attribute to remove.
	 * @param value Attribute value.
	 */
	private _setSelectionAttribute( key: string, value: unknown ): void {
		const selection = this.model.document.selection;

		// Store attribute in parent element if the selection is collapsed in an empty node.
		if ( selection.isCollapsed && selection.anchor!.parent.isEmpty ) {
			const storeKey = ModelDocumentSelection._getStoreAttributeKey( key );

			this.setAttribute( storeKey, value, selection.anchor!.parent as any );
		}

		selection._setAttribute( key, value );
	}

	/**
	 * @param key Key of the attribute to remove.
	 */
	private _removeSelectionAttribute( key: string ): void {
		const selection = this.model.document.selection;

		// Remove stored attribute from parent element if the selection is collapsed in an empty node.
		if ( selection.isCollapsed && selection.anchor!.parent.isEmpty ) {
			const storeKey = ModelDocumentSelection._getStoreAttributeKey( key );

			this.removeAttribute( storeKey, selection.anchor!.parent as any );
		}

		selection._removeAttribute( key );
	}

	/**
	 * Throws `writer-detached-writer-tries-to-modify-model` error when the writer is used outside of the `change()` block.
	 */
	private _assertWriterUsedCorrectly(): void {
		/**
		 * Trying to use a writer outside a {@link module:engine/model/model~Model#change `change()`} or
		 * {@link module:engine/model/model~Model#enqueueChange `enqueueChange()`} blocks.
		 *
		 * The writer can only be used inside these blocks which ensures that the model
		 * can only be changed during such "sessions".
		 *
		 * @error writer-incorrect-use
		 */
		if ( ( this.model as any )._currentWriter !== this ) {
			throw new CKEditorError( 'writer-incorrect-use', this );
		}
	}

	/**
	 * For given action `type` and `positionOrRange` where the action happens, this function finds all affected markers
	 * and applies a marker operation with the new marker range equal to the current range. Thanks to this, the marker range
	 * can be later correctly processed during undo.
	 *
	 * @param type Writer action type.
	 * @param positionOrRange Position or range where the writer action happens.
	 */
	private _addOperationForAffectedMarkers(
		type: 'move' | 'merge',
		positionOrRange: ModelPosition | ModelRange
	): void {
		for ( const marker of this.model.markers ) {
			if ( !marker.managedUsingOperations ) {
				continue;
			}

			const markerRange = marker.getRange();
			let isAffected = false;

			if ( type === 'move' ) {
				const range = positionOrRange as ModelRange;
				isAffected =
					range.containsPosition( markerRange.start ) ||
					range.start.isEqual( markerRange.start ) ||
					range.containsPosition( markerRange.end ) ||
					range.end.isEqual( markerRange.end );
			} else {
				// if type === 'merge'.
				const position = positionOrRange as ModelPosition;
				const elementBefore = position.nodeBefore;
				const elementAfter = position.nodeAfter;

				//               Start:  <p>Foo[</p><p>Bar]</p>
				//         After merge:  <p>Foo[Bar]</p>
				// After undoing split:  <p>Foo</p><p>[Bar]</p>     <-- incorrect, needs remembering for undo.
				//
				const affectedInLeftElement = markerRange.start.parent == elementBefore && markerRange.start.isAtEnd;

				//               Start:  <p>[Foo</p><p>]Bar</p>
				//         After merge:  <p>[Foo]Bar</p>
				// After undoing split:  <p>[Foo]</p><p>Bar</p>     <-- incorrect, needs remembering for undo.
				//
				const affectedInRightElement = markerRange.end.parent == elementAfter && markerRange.end.offset == 0;

				//               Start:  <p>[Foo</p>]<p>Bar</p>
				//         After merge:  <p>[Foo]Bar</p>
				// After undoing split:  <p>[Foo]</p><p>Bar</p>     <-- incorrect, needs remembering for undo.
				//
				const affectedAfterLeftElement = markerRange.end.nodeAfter == elementAfter;

				//               Start:  <p>Foo</p>[<p>Bar]</p>
				//         After merge:  <p>Foo[Bar]</p>
				// After undoing split:  <p>Foo</p><p>[Bar]</p>     <-- incorrect, needs remembering for undo.
				//
				const affectedBeforeRightElement = markerRange.start.nodeAfter == elementAfter;

				isAffected = affectedInLeftElement || affectedInRightElement || affectedAfterLeftElement || affectedBeforeRightElement;
			}

			if ( isAffected ) {
				this.updateMarker( marker.name, { range: markerRange } );
			}
		}
	}
}

/**
 * Sets given attribute to each node in given range. When attribute value is null then attribute will be removed.
 *
 * Because attribute operation needs to have the same attribute value on the whole range, this function splits
 * the range into smaller parts.
 *
 * Given `range` must be flat.
 */
function setAttributeOnRange( writer: ModelWriter, key: string, value: unknown, range: ModelRange ) {
	const model = writer.model;
	const doc = model.document;

	// Position of the last split, the beginning of the new range.
	let lastSplitPosition = range.start;

	// Currently position in the scanning range. Because we need value after the position, it is not a current
	// position of the iterator but the previous one (we need to iterate one more time to get the value after).
	let position: ModelPosition | undefined;

	// Value before the currently position.
	let valueBefore: unknown;

	// Value after the currently position.
	let valueAfter;

	for ( const val of range.getWalker( { shallow: true } ) ) {
		valueAfter = val.item.getAttribute( key );

		// At the first run of the iterator the position in undefined. We also do not have a valueBefore, but
		// because valueAfter may be null, valueBefore may be equal valueAfter ( undefined == null ).
		if ( position && valueBefore != valueAfter ) {
			// if valueBefore == value there is nothing to change, so we add operation only if these values are different.
			if ( valueBefore != value ) {
				addOperation();
			}

			lastSplitPosition = position;
		}

		position = val.nextPosition;
		valueBefore = valueAfter;
	}

	// Because position in the loop is not the iterator position (see let position comment), the last position in
	// the while loop will be last but one position in the range. We need to check the last position manually.
	if ( position instanceof ModelPosition && position != lastSplitPosition && valueBefore != value ) {
		addOperation();
	}

	function addOperation() {
		const range = new ModelRange( lastSplitPosition, position );
		const version = range.root.document ? doc.version : null;
		const operation = new AttributeOperation( range, key, valueBefore, value, version );

		writer.batch.addOperation( operation );
		model.applyOperation( operation );
	}
}

/**
 * Sets given attribute to the given node. When attribute value is null then attribute will be removed.
 */
function setAttributeOnItem( writer: ModelWriter, key: string, value: unknown, item: ModelItem ) {
	const model = writer.model;
	const doc = model.document;
	const previousValue = item.getAttribute( key );
	let range, operation;

	if ( previousValue != value ) {
		const isRootChanged = item.root === item;

		if ( isRootChanged ) {
			// If we change attributes of root element, we have to use `RootAttributeOperation`.
			const version = item.document ? doc.version : null;

			operation = new RootAttributeOperation( item as any, key, previousValue, value, version );
		} else {
			range = new ModelRange( ModelPosition._createBefore( item ), writer.createPositionAfter( item ) );

			const version = range.root.document ? doc.version : null;

			operation = new AttributeOperation( range, key, previousValue, value, version );
		}

		writer.batch.addOperation( operation );
		model.applyOperation( operation );
	}
}

/**
 * Creates and applies marker operation to {@link module:engine/model/operation/operation~Operation operation}.
 */
function applyMarkerOperation(
	writer: ModelWriter,
	name: string,
	oldRange: ModelRange | null,
	newRange: ModelRange | null,
	affectsData: boolean | undefined
) {
	const model = writer.model;
	const doc = model.document;

	const operation = new MarkerOperation( name, oldRange, newRange, model.markers, !!affectsData, doc.version );

	writer.batch.addOperation( operation );
	model.applyOperation( operation );
}

/**
 * Creates `MoveOperation` or `DetachOperation` that removes `howMany` nodes starting from `position`.
 * The operation will be applied on given model instance and added to given operation instance.
 *
 * @param position Position from which nodes are removed.
 * @param howMany Number of nodes to remove.
 * @param batch Batch to which the operation will be added.
 * @param model Model instance on which operation will be applied.
 */
function applyRemoveOperation( position: ModelPosition, howMany: number, batch: Batch, model: Model ) {
	let operation;

	if ( position.root.document ) {
		const doc = model.document;
		const graveyardPosition = new ModelPosition( doc.graveyard, [ 0 ] );

		operation = new MoveOperation( position, howMany, graveyardPosition, doc.version );
	} else {
		operation = new DetachOperation( position, howMany );
	}

	batch.addOperation( operation );
	model.applyOperation( operation );
}

/**
 * Returns `true` if both root elements are the same element or both are documents root elements.
 *
 * Elements in the same tree can be moved (for instance you can move element form one documents root to another, or
 * within the same document fragment), but when element supposed to be moved from document fragment to the document, or
 * to another document it should be removed and inserted to avoid problems with OT. This is because features like undo or
 * collaboration may track changes on the document but ignore changes on detached fragments and should not get
 * unexpected `move` operation.
 */
function isSameTree( rootA: ModelNode | ModelDocumentFragment, rootB: ModelNode | ModelDocumentFragment ): boolean {
	// If it is the same root this is the same tree.
	if ( rootA === rootB ) {
		return true;
	}

	// If both roots are documents root it is operation within the document what we still treat as the same tree.
	if ( rootA instanceof ModelRootElement && rootB instanceof ModelRootElement ) {
		return true;
	}

	return false;
}
