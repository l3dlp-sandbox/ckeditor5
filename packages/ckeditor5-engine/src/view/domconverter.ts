/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module engine/view/domconverter
 */

import { ViewText } from './text.js';
import { ViewElement } from './element.js';
import { ViewUIElement } from './uielement.js';
import { ViewPosition } from './position.js';
import { ViewRange } from './range.js';
import { ViewSelection } from './selection.js';
import { ViewDocumentFragment } from './documentfragment.js';
import { ViewTreeWalker } from './treewalker.js';
import { Matcher, type MatcherPattern } from './matcher.js';
import {
	BR_FILLER, INLINE_FILLER_LENGTH, NBSP_FILLER, MARKED_NBSP_FILLER,
	getDataWithoutFiller, isInlineFiller, startsWithFiller
} from './filler.js';

import {
	global,
	logWarning,
	indexOf,
	getAncestors,
	isText,
	isComment,
	isValidAttributeName,
	first,
	env
} from '@ckeditor/ckeditor5-utils';

import { type ViewNode } from './node.js';
import { type ViewDocument } from './document.js';
import { type ViewDocumentSelection } from './documentselection.js';
import { type ViewEditableElement } from './editableelement.js';
import { type ViewTextProxy } from './textproxy.js';
import { type ViewRawElement } from './rawelement.js';

// @if CK_DEBUG_TYPING // const { _buildLogMessage } = require( '../dev-utils/utils.js' );

type DomNode = globalThis.Node;
type DomElement = globalThis.HTMLElement;
type DomDocument = globalThis.Document;
type DomDocumentFragment = globalThis.DocumentFragment;
type DomComment = globalThis.Comment;
type DomRange = globalThis.Range;
type DomText = globalThis.Text;
type DomSelection = globalThis.Selection;

const BR_FILLER_REF = BR_FILLER( global.document ); // eslint-disable-line new-cap
const NBSP_FILLER_REF = NBSP_FILLER( global.document ); // eslint-disable-line new-cap
const MARKED_NBSP_FILLER_REF = MARKED_NBSP_FILLER( global.document ); // eslint-disable-line new-cap
const UNSAFE_ATTRIBUTE_NAME_PREFIX = 'data-ck-unsafe-attribute-';
const UNSAFE_ELEMENT_REPLACEMENT_ATTRIBUTE = 'data-ck-unsafe-element';

/**
 * `ViewDomConverter` is a set of tools to do transformations between DOM nodes and view nodes. It also handles
 * {@link module:engine/view/domconverter~ViewDomConverter#bindElements bindings} between these nodes.
 *
 * An instance of the DOM converter is available under
 * {@link module:engine/view/view~EditingView#domConverter `editor.editing.view.domConverter`}.
 *
 * The DOM converter does not check which nodes should be rendered (use {@link module:engine/view/renderer~ViewRenderer}), does not keep the
 * state of a tree nor keeps the synchronization between the tree view and
 * the DOM tree (use {@link module:engine/view/document~ViewDocument}).
 *
 * The DOM converter keeps DOM elements to view element bindings, so when the converter gets destroyed, the bindings are lost.
 * Two converters will keep separate binding maps, so one tree view can be bound with two DOM trees.
 */
export class ViewDomConverter {
	public readonly document: ViewDocument;

	/**
	 * Whether to leave the View-to-DOM conversion result unchanged or improve editing experience by filtering out interactive data.
	 */
	public readonly renderingMode: 'data' | 'editing';

	/**
	 * The mode of a block filler used by the DOM converter.
	 */
	public blockFillerMode: ViewBlockFillerMode;

	/**
	 * Elements which are considered pre-formatted elements.
	 */
	public readonly preElements: Array<string>;

	/**
	 * Elements which are considered block elements (and hence should be filled with a
	 * {@link #isBlockFiller block filler}).
	 *
	 * Whether an element is considered a block element also affects handling of trailing whitespaces.
	 *
	 * You can extend this array if you introduce support for block elements which are not yet recognized here.
	 */
	public readonly blockElements: Array<string>;

	/**
	 * A list of elements that exist inline (in text) but their inner structure cannot be edited because
	 * of the way they are rendered by the browser. They are mostly HTML form elements but there are other
	 * elements such as `<img>` or `<iframe>` that also have non-editable children or no children whatsoever.
	 *
	 * Whether an element is considered an inline object has an impact on white space rendering (trimming)
	 * around (and inside of it). In short, white spaces in text nodes next to inline objects are not trimmed.
	 *
	 * You can extend this array if you introduce support for inline object elements which are not yet recognized here.
	 */
	public readonly inlineObjectElements: Array<string>;

	/**
	 * A list of elements which may affect the editing experience. To avoid this, those elements are replaced with
	 * `<span data-ck-unsafe-element="[element name]"></span>` while rendering in the editing mode.
	 */
	public readonly unsafeElements: Array<string>;

	/**
	 * The DOM Document used by `ViewDomConverter` to create DOM nodes.
	 */
	private readonly _domDocument: DomDocument;

	/**
	 * The DOM-to-view mapping.
	 */
	private readonly _domToViewMapping = new WeakMap<DomElement | DomDocumentFragment, ViewElement | ViewDocumentFragment>();

	/**
	 * The view-to-DOM mapping.
	 */
	private readonly _viewToDomMapping = new WeakMap<ViewElement | ViewDocumentFragment, DomElement | DomDocumentFragment>();

	/**
	 * Holds the mapping between fake selection containers and corresponding view selections.
	 */
	private readonly _fakeSelectionMapping = new WeakMap<DomElement, ViewSelection>();

	/**
	 * Matcher for view elements whose content should be treated as raw data
	 * and not processed during the conversion from DOM nodes to view elements.
	 */
	private readonly _rawContentElementMatcher = new Matcher();

	/**
	 * Matcher for inline object view elements. This is an extension of a simple {@link #inlineObjectElements} array of element names.
	 */
	private readonly _inlineObjectElementMatcher = new Matcher();

	/**
	 * Set of elements with temporary custom properties that require clearing after render.
	 */
	private readonly _elementsWithTemporaryCustomProperties = new Set<ViewElement | ViewDocumentFragment>();

	/**
	 * Creates a DOM converter.
	 *
	 * @param document The view document instance.
	 * @param options An object with configuration options.
	 * @param options.blockFillerMode The type of the block filler to use.
	 * Default value depends on the options.renderingMode:
	 *  'nbsp' when options.renderingMode == 'data',
	 *  'br' when options.renderingMode == 'editing'.
	 * @param options.renderingMode Whether to leave the View-to-DOM conversion result unchanged
	 * or improve editing experience by filtering out interactive data.
	 */
	constructor(
		document: ViewDocument,
		{ blockFillerMode, renderingMode = 'editing' }: {
			blockFillerMode?: ViewBlockFillerMode;
			renderingMode?: 'data' | 'editing';
		} = {}
	) {
		this.document = document;
		this.renderingMode = renderingMode;
		this.blockFillerMode = blockFillerMode || ( renderingMode === 'editing' ? 'br' : 'nbsp' );
		this.preElements = [ 'pre', 'textarea' ];
		this.blockElements = [
			'address', 'article', 'aside', 'blockquote', 'caption', 'center', 'dd', 'details', 'dir', 'div',
			'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
			'hgroup', 'legend', 'li', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'summary', 'table', 'tbody',
			'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
		];
		this.inlineObjectElements = [
			'object', 'iframe', 'input', 'button', 'textarea', 'select', 'option', 'video', 'embed', 'audio', 'img', 'canvas'
		];
		this.unsafeElements = [ 'script', 'style' ];

		this._domDocument = this.renderingMode === 'editing' ? global.document : global.document.implementation.createHTMLDocument( '' );
	}

	/**
	 * The DOM Document used by `ViewDomConverter` to create DOM nodes.
	 */
	public get domDocument(): DomDocument {
		return this._domDocument;
	}

	/**
	 * Binds a given DOM element that represents fake selection to a **position** of a
	 * {@link module:engine/view/documentselection~ViewDocumentSelection document selection}.
	 * Document selection copy is stored and can be retrieved by the
	 * {@link module:engine/view/domconverter~ViewDomConverter#fakeSelectionToView} method.
	 */
	public bindFakeSelection( domElement: DomElement, viewDocumentSelection: ViewDocumentSelection ): void {
		this._fakeSelectionMapping.set( domElement, new ViewSelection( viewDocumentSelection ) );
	}

	/**
	 * Returns a {@link module:engine/view/selection~ViewSelection view selection} instance corresponding to a given
	 * DOM element that represents fake selection. Returns `undefined` if binding to the given DOM element does not exist.
	 */
	public fakeSelectionToView( domElement: DomElement ): ViewSelection | undefined {
		return this._fakeSelectionMapping.get( domElement );
	}

	/**
	 * Binds DOM and view elements, so it will be possible to get corresponding elements using
	 * {@link module:engine/view/domconverter~ViewDomConverter#mapDomToView} and
	 * {@link module:engine/view/domconverter~ViewDomConverter#mapViewToDom}.
	 *
	 * @param domElement The DOM element to bind.
	 * @param viewElement The view element to bind.
	 */
	public bindElements( domElement: DomElement, viewElement: ViewElement ): void {
		this._domToViewMapping.set( domElement, viewElement );
		this._viewToDomMapping.set( viewElement, domElement );
	}

	/**
	 * Unbinds a given DOM element from the view element it was bound to. Unbinding is deep, meaning that all children of
	 * the DOM element will be unbound too.
	 *
	 * @param domElement The DOM element to unbind.
	 */
	public unbindDomElement( domElement: DomElement ): void {
		const viewElement = this._domToViewMapping.get( domElement );

		if ( viewElement ) {
			this._domToViewMapping.delete( domElement );
			this._viewToDomMapping.delete( viewElement );

			for ( const child of domElement.children ) {
				this.unbindDomElement( child as DomElement );
			}
		}
	}

	/**
	 * Binds DOM and view document fragments, so it will be possible to get corresponding document fragments using
	 * {@link module:engine/view/domconverter~ViewDomConverter#mapDomToView} and
	 * {@link module:engine/view/domconverter~ViewDomConverter#mapViewToDom}.
	 *
	 * @param domFragment The DOM document fragment to bind.
	 * @param viewFragment The view document fragment to bind.
	 */
	public bindDocumentFragments( domFragment: DomDocumentFragment, viewFragment: ViewDocumentFragment ): void {
		this._domToViewMapping.set( domFragment, viewFragment );
		this._viewToDomMapping.set( viewFragment, domFragment );
	}

	/**
	 * Decides whether a given pair of attribute key and value should be passed further down the pipeline.
	 *
	 * @param elementName Element name in lower case.
	 */
	public shouldRenderAttribute( attributeKey: string, attributeValue: string, elementName: string ): boolean {
		if ( this.renderingMode === 'data' ) {
			return true;
		}

		attributeKey = attributeKey.toLowerCase();

		if ( attributeKey.startsWith( 'on' ) ) {
			return false;
		}

		if (
			attributeKey === 'srcdoc' &&
			attributeValue.match( /\bon\S+\s*=|javascript:|<\s*\/*script/i )
		) {
			return false;
		}

		if (
			elementName === 'img' &&
			( attributeKey === 'src' || attributeKey === 'srcset' )
		) {
			return true;
		}

		if ( elementName === 'source' && attributeKey === 'srcset' ) {
			return true;
		}

		if ( attributeValue.match( /^\s*(javascript:|data:(image\/svg|text\/x?html))/i ) ) {
			return false;
		}

		return true;
	}

	/**
	 * Set `domElement`'s content using provided `html` argument. Apply necessary filtering for the editing pipeline.
	 *
	 * @param domElement DOM element that should have `html` set as its content.
	 * @param html Textual representation of the HTML that will be set on `domElement`.
	 */
	public setContentOf( domElement: DomElement, html: string ): void {
		// For data pipeline we pass the HTML as-is.
		if ( this.renderingMode === 'data' ) {
			domElement.innerHTML = html;

			return;
		}

		const document = new DOMParser().parseFromString( html, 'text/html' );
		const fragment = document.createDocumentFragment();
		const bodyChildNodes = document.body.childNodes;

		while ( bodyChildNodes.length > 0 ) {
			fragment.appendChild( bodyChildNodes[ 0 ] );
		}

		const treeWalker = document.createTreeWalker( fragment, NodeFilter.SHOW_ELEMENT );
		const nodes: Array<DomElement> = [];

		let currentNode;

		// eslint-disable-next-line no-cond-assign
		while ( currentNode = treeWalker.nextNode() ) {
			nodes.push( currentNode as DomElement );
		}

		for ( const currentNode of nodes ) {
			// Go through nodes to remove those that are prohibited in editing pipeline.
			for ( const attributeName of currentNode.getAttributeNames() ) {
				this.setDomElementAttribute( currentNode, attributeName, currentNode.getAttribute( attributeName )! );
			}

			const elementName = currentNode.tagName.toLowerCase();

			// There are certain nodes, that should be renamed to <span> in editing pipeline.
			if ( this._shouldRenameElement( elementName ) ) {
				_logUnsafeElement( elementName );

				currentNode.replaceWith( this._createReplacementDomElement( elementName, currentNode ) );
			}
		}

		// Empty the target element.
		while ( domElement.firstChild ) {
			domElement.firstChild.remove();
		}

		domElement.append( fragment );
	}

	public viewToDom(
		viewNode: ViewText,
		options?: { bind?: boolean; withChildren?: boolean }
	): DomText;

	public viewToDom(
		viewNode: ViewElement,
		options?: { bind?: boolean; withChildren?: boolean }
	): DomElement;

	public viewToDom(
		viewNode: ViewNode,
		options?: { bind?: boolean; withChildren?: boolean }
	): DomNode;

	public viewToDom(
		viewNode: ViewDocumentFragment,
		options?: { bind?: boolean; withChildren?: boolean }
	): DomDocumentFragment;

	/**
	 * Converts the view to the DOM. For all text nodes, not bound elements and document fragments new items will
	 * be created. For bound elements and document fragments the method will return corresponding items.
	 *
	 * @param viewNode View node or document fragment to transform.
	 * @param options Conversion options.
	 * @param options.bind Determines whether new elements will be bound.
	 * @param options.withChildren If `false`, node's and document fragment's children will not be converted.
	 * @returns Converted node or DocumentFragment.
	 */
	public viewToDom(
		viewNode: ViewNode | ViewDocumentFragment,
		options: { bind?: boolean; withChildren?: boolean } = {}
	): DomNode | DomDocumentFragment {
		if ( viewNode.is( '$text' ) ) {
			const textData = this._processDataFromViewText( viewNode );

			return this._domDocument.createTextNode( textData );
		} else {
			const viewElementOrFragment = viewNode as ViewElement | ViewDocumentFragment;

			if ( this.mapViewToDom( viewElementOrFragment ) ) {
				// Do not reuse element that is marked to not reuse (for example an IMG element
				// so it can immediately display a placeholder background instead of waiting for the new src to load).
				if ( viewElementOrFragment.getCustomProperty( 'editingPipeline:doNotReuseOnce' ) ) {
					this._elementsWithTemporaryCustomProperties.add( viewElementOrFragment );
				} else {
					return this.mapViewToDom( viewElementOrFragment )!;
				}
			}

			let domElement: DomElement | DomDocumentFragment | DomComment;

			if ( viewElementOrFragment.is( 'documentFragment' ) ) {
				// Create DOM document fragment.
				domElement = this._domDocument.createDocumentFragment();

				if ( options.bind ) {
					this.bindDocumentFragments( domElement, viewElementOrFragment );
				}
			} else if ( viewElementOrFragment.is( 'uiElement' ) ) {
				if ( viewElementOrFragment.name === '$comment' ) {
					domElement = this._domDocument.createComment( viewElementOrFragment.getCustomProperty( '$rawContent' ) as string );
				} else {
					// UIElement has its own render() method (see #799).
					domElement = viewElementOrFragment.render( this._domDocument, this );
				}

				if ( options.bind ) {
					this.bindElements( domElement as DomElement, viewElementOrFragment );
				}

				return domElement;
			} else {
				// Create DOM element.
				if ( this._shouldRenameElement( viewElementOrFragment.name ) ) {
					_logUnsafeElement( viewElementOrFragment.name );

					domElement = this._createReplacementDomElement( viewElementOrFragment.name );
				} else if ( viewElementOrFragment.hasAttribute( 'xmlns' ) ) {
					domElement = this._domDocument.createElementNS(
						viewElementOrFragment.getAttribute( 'xmlns' )!,
						viewElementOrFragment.name
					) as HTMLElement;
				} else {
					domElement = this._domDocument.createElement( viewElementOrFragment.name );
				}

				// RawElement take care of their children in RawElement#render() method which can be customized
				// (see https://github.com/ckeditor/ckeditor5/issues/4469).
				if ( viewElementOrFragment.is( 'rawElement' ) ) {
					viewElementOrFragment.render( domElement, this );
				}

				if ( options.bind ) {
					this.bindElements( domElement, viewElementOrFragment );
				}

				// Copy element's attributes.
				for ( const key of viewElementOrFragment.getAttributeKeys() ) {
					this.setDomElementAttribute(
						domElement,
						key,
						viewElementOrFragment.getAttribute( key )!,
						viewElementOrFragment
					);
				}
			}

			if ( options.withChildren !== false ) {
				for ( const child of this.viewChildrenToDom( viewElementOrFragment, options ) ) {
					if ( domElement instanceof HTMLTemplateElement ) {
						domElement.content.appendChild( child );
					} else {
						domElement.appendChild( child );
					}
				}
			}

			return domElement;
		}
	}

	/**
	 * Sets the attribute on a DOM element.
	 *
	 * **Note**: To remove the attribute, use {@link #removeDomElementAttribute}.
	 *
	 * @param domElement The DOM element the attribute should be set on.
	 * @param key The name of the attribute.
	 * @param value The value of the attribute.
	 * @param relatedViewElement The view element related to the `domElement` (if there is any).
	 * It helps decide whether the attribute set is unsafe. For instance, view elements created via the
	 * {@link module:engine/view/downcastwriter~ViewDowncastWriter} methods can allow certain attributes
	 * that would normally be filtered out.
	 */
	public setDomElementAttribute( domElement: DomElement, key: string, value: string, relatedViewElement?: ViewElement ): void {
		const shouldRenderAttribute = this.shouldRenderAttribute( key, value, domElement.tagName.toLowerCase() ) ||
			relatedViewElement && relatedViewElement.shouldRenderUnsafeAttribute( key );

		if ( !shouldRenderAttribute ) {
			logWarning( 'domconverter-unsafe-attribute-detected', { domElement, key, value } );
		}

		if ( !isValidAttributeName( key ) ) {
			/**
			 * Invalid attribute name was ignored during rendering.
			 *
			 * @error domconverter-invalid-attribute-detected
			 */
			logWarning( 'domconverter-invalid-attribute-detected', { domElement, key, value } );

			return;
		}

		// The old value was safe but the new value is unsafe.
		if ( domElement.hasAttribute( key ) && !shouldRenderAttribute ) {
			domElement.removeAttribute( key );
		}
		// The old value was unsafe (but prefixed) but the new value will be safe (will be unprefixed).
		else if ( domElement.hasAttribute( UNSAFE_ATTRIBUTE_NAME_PREFIX + key ) && shouldRenderAttribute ) {
			domElement.removeAttribute( UNSAFE_ATTRIBUTE_NAME_PREFIX + key );
		}

		// If the attribute should not be rendered, rename it (instead of removing) to give developers some idea of what
		// is going on (https://github.com/ckeditor/ckeditor5/issues/10801).
		domElement.setAttribute( shouldRenderAttribute ? key : UNSAFE_ATTRIBUTE_NAME_PREFIX + key, value );
	}

	/**
	 * Removes an attribute from a DOM element.
	 *
	 * **Note**: To set the attribute, use {@link #setDomElementAttribute}.
	 *
	 * @param domElement The DOM element the attribute should be removed from.
	 * @param key The name of the attribute.
	 */
	public removeDomElementAttribute( domElement: DomElement, key: string ): void {
		// See #_createReplacementDomElement() to learn what this is.
		if ( key == UNSAFE_ELEMENT_REPLACEMENT_ATTRIBUTE ) {
			return;
		}

		domElement.removeAttribute( key );

		// See setDomElementAttribute() to learn what this is.
		domElement.removeAttribute( UNSAFE_ATTRIBUTE_NAME_PREFIX + key );
	}

	/**
	 * Converts children of the view element to DOM using the
	 * {@link module:engine/view/domconverter~ViewDomConverter#viewToDom} method.
	 * Additionally, this method adds block {@link module:engine/view/filler filler} to the list of children, if needed.
	 *
	 * @param viewElement Parent view element.
	 * @param options See {@link module:engine/view/domconverter~ViewDomConverter#viewToDom} options parameter.
	 * @returns DOM nodes.
	 */
	public* viewChildrenToDom(
		viewElement: ViewElement | ViewDocumentFragment,
		options: { bind?: boolean; withChildren?: boolean } = {}
	): IterableIterator<Node> {
		const fillerPositionOffset = viewElement.getFillerOffset && viewElement.getFillerOffset();
		let offset = 0;

		for ( const childView of viewElement.getChildren() ) {
			if ( fillerPositionOffset === offset ) {
				yield this._getBlockFiller();
			}

			const transparentRendering = childView.is( 'element' ) &&
				!!childView.getCustomProperty( 'dataPipeline:transparentRendering' ) &&
				!first( childView.getAttributes() );

			if ( transparentRendering && this.renderingMode == 'data' ) {
				// `RawElement` doesn't have #children defined, so they need to be temporarily rendered
				// and extracted directly.
				if ( childView.is( 'rawElement' ) ) {
					const tempElement = this._domDocument.createElement( childView.name );

					childView.render( tempElement, this );

					yield* [ ...tempElement.childNodes ];
				} else {
					yield* this.viewChildrenToDom( childView, options );
				}
			} else {
				if ( transparentRendering ) {
					/**
					 * The `dataPipeline:transparentRendering` flag is supported only in the data pipeline.
					 *
					 * @error domconverter-transparent-rendering-unsupported-in-editing-pipeline
					 */
					logWarning( 'domconverter-transparent-rendering-unsupported-in-editing-pipeline', { viewElement: childView } );
				}

				yield this.viewToDom( childView, options );
			}

			offset++;
		}

		if ( fillerPositionOffset === offset ) {
			yield this._getBlockFiller();
		}
	}

	/**
	 * Converts view {@link module:engine/view/range~ViewRange} to DOM range.
	 * Inline and block {@link module:engine/view/filler fillers} are handled during the conversion.
	 *
	 * @param viewRange View range.
	 * @returns DOM range.
	 */
	public viewRangeToDom( viewRange: ViewRange ): DomRange {
		const domStart = this.viewPositionToDom( viewRange.start )!;
		const domEnd = this.viewPositionToDom( viewRange.end )!;

		const domRange = this._domDocument.createRange();
		domRange.setStart( domStart.parent, domStart.offset );
		domRange.setEnd( domEnd.parent, domEnd.offset );

		return domRange;
	}

	/**
	 * Converts view {@link module:engine/view/position~ViewPosition} to DOM parent and offset.
	 *
	 * Inline and block {@link module:engine/view/filler fillers} are handled during the conversion.
	 * If the converted position is directly before inline filler it is moved inside the filler.
	 *
	 * @param viewPosition View position.
	 * @returns DOM position or `null` if view position could not be converted to DOM.
	 * DOM position has two properties:
	 * * `parent` - DOM position parent.
	 * * `offset` - DOM position offset.
	 */
	public viewPositionToDom( viewPosition: ViewPosition ): { parent: DomNode; offset: number } | null {
		const viewParent = viewPosition.parent;

		if ( viewParent.is( '$text' ) ) {
			const domParent = this.findCorrespondingDomText( viewParent );

			if ( !domParent ) {
				// Position is in a view text node that has not been rendered to DOM yet.
				return null;
			}

			let offset = viewPosition.offset;

			if ( startsWithFiller( domParent ) ) {
				offset += INLINE_FILLER_LENGTH;
			}

			// In case someone uses outdated view position, but DOM text node was already changed while typing.
			// See: https://github.com/ckeditor/ckeditor5/issues/18648.
			// Note that when checking Renderer#_isSelectionInInlineFiller() this might be other element
			// than a text node as it is triggered before applying view changes to the DOM.
			if ( domParent.data && offset > domParent.data.length ) {
				offset = domParent.data.length;
			}

			return { parent: domParent, offset };
		} else {
			// viewParent is instance of ViewElement.
			let domParent, domBefore, domAfter;

			if ( viewPosition.offset === 0 ) {
				domParent = this.mapViewToDom( viewParent as ViewElement );

				if ( !domParent ) {
					// Position is in a view element that has not been rendered to DOM yet.
					return null;
				}

				domAfter = domParent.childNodes[ 0 ];
			} else {
				const nodeBefore = viewPosition.nodeBefore!;

				domBefore = nodeBefore.is( '$text' ) ?
					this.findCorrespondingDomText( nodeBefore ) :
					this.mapViewToDom( nodeBefore as ViewElement );

				if ( !domBefore ) {
					// Position is after a view element that has not been rendered to DOM yet.
					return null;
				}

				domParent = domBefore.parentNode;
				domAfter = domBefore.nextSibling;
			}

			// If there is an inline filler at position return position inside the filler. We should never return
			// the position before the inline filler.
			if ( isText( domAfter ) && startsWithFiller( domAfter ) ) {
				return { parent: domAfter, offset: INLINE_FILLER_LENGTH };
			}

			const offset = domBefore ? indexOf( domBefore ) + 1 : 0;

			return { parent: domParent!, offset };
		}
	}

	/**
	 * Converts DOM to view. For all text nodes, not bound elements and document fragments new items will
	 * be created. For bound elements and document fragments function will return corresponding items. For
	 * {@link module:engine/view/filler fillers} `null` will be returned.
	 * For all DOM elements rendered by {@link module:engine/view/uielement~ViewUIElement} that UIElement will be returned.
	 *
	 * @param domNode DOM node or document fragment to transform.
	 * @param options Conversion options.
	 * @param options.bind Determines whether new elements will be bound. False by default.
	 * @param options.withChildren If `true`, node's and document fragment's children will be converted too. True by default.
	 * @param options.keepOriginalCase If `false`, node's tag name will be converted to lower case. False by default.
	 * @param options.skipComments If `false`, comment nodes will be converted to `$comment`
	 * {@link module:engine/view/uielement~ViewUIElement view UI elements}. False by default.
	 * @returns Converted node or document fragment or `null` if DOM node is a {@link module:engine/view/filler filler}
	 * or the given node is an empty text node.
	 */
	public domToView(
		domNode: DomNode,
		options: {
			bind?: boolean;
			withChildren?: boolean;
			keepOriginalCase?: boolean;
			skipComments?: boolean;
		} = {}
	): ViewNode | ViewDocumentFragment | null {
		const inlineNodes: Array<ViewNode> = [];
		const generator = this._domToView( domNode, options, inlineNodes );

		// Get the first yielded value or a returned value.
		const node = generator.next().value;

		if ( !node ) {
			return null;
		}

		// Trigger children handling.
		generator.next();

		// Whitespace cleaning.
		this._processDomInlineNodes( null, inlineNodes, options );

		// This was a single block filler so just remove it.
		if ( this.blockFillerMode == 'br' && isViewBrFiller( node ) ) {
			return null;
		}

		// Text not got trimmed to an empty string so there is no result node.
		if ( node.is( '$text' ) && node.data.length == 0 ) {
			return null;
		}

		return node;
	}

	/**
	 * Converts children of the DOM element to view nodes using
	 * the {@link module:engine/view/domconverter~ViewDomConverter#domToView} method.
	 * Additionally this method omits block {@link module:engine/view/filler filler}, if it exists in the DOM parent.
	 *
	 * @param domElement Parent DOM element.
	 * @param options See {@link module:engine/view/domconverter~ViewDomConverter#domToView} options parameter.
	 * @param inlineNodes An array that will be populated with inline nodes. It's used internally for whitespace processing.
	 * @returns View nodes.
	 */
	public* domChildrenToView(
		domElement: DomElement,
		options: Parameters<ViewDomConverter[ 'domToView' ]>[ 1 ] = {},
		inlineNodes: Array<ViewNode> = []
	): IterableIterator<ViewNode> {
		// Get child nodes from content document fragment if element is template
		let childNodes: Array<ChildNode> = [];

		if ( domElement instanceof HTMLTemplateElement ) {
			childNodes = [ ...domElement.content.childNodes ];
		} else {
			childNodes = [ ...domElement.childNodes ];
		}

		for ( let i = 0; i < childNodes.length; i++ ) {
			const domChild = childNodes[ i ];
			const generator = this._domToView( domChild, options, inlineNodes );

			// Get the first yielded value or a returned value.
			const viewChild = generator.next().value as ViewNode | null;

			if ( viewChild !== null ) {
				// Whitespace cleaning before entering a block element (between block elements).
				if ( this._isBlockViewElement( viewChild ) ) {
					this._processDomInlineNodes( domElement, inlineNodes, options );
				}

				// Yield only if this is not a block filler.
				if ( !( this.blockFillerMode == 'br' && isViewBrFiller( viewChild ) ) ) {
					yield viewChild;
				}

				// Trigger children handling.
				generator.next();
			}
		}

		// Whitespace cleaning before leaving a block element (content of block element).
		this._processDomInlineNodes( domElement, inlineNodes, options );
	}

	/**
	 * Converts DOM selection to view {@link module:engine/view/selection~ViewSelection}.
	 * Ranges which cannot be converted will be omitted.
	 *
	 * @param domSelection DOM selection.
	 * @returns View selection.
	 */
	public domSelectionToView( domSelection: DomSelection ): ViewSelection {
		// See: https://github.com/ckeditor/ckeditor5/issues/9635.
		if ( isGeckoRestrictedDomSelection( domSelection ) ) {
			return new ViewSelection( [] );
		}

		// DOM selection might be placed in fake selection container.
		// If container contains fake selection - return corresponding view selection.
		if ( domSelection.rangeCount === 1 ) {
			let container: Node | null = domSelection.getRangeAt( 0 ).startContainer;

			// The DOM selection might be moved to the text node inside the fake selection container.
			if ( isText( container ) ) {
				container = container.parentNode;
			}

			const viewSelection = this.fakeSelectionToView( container as DomElement );

			if ( viewSelection ) {
				return viewSelection;
			}
		}

		const isBackward = this.isDomSelectionBackward( domSelection );

		const viewRanges: Array<ViewRange> = [];

		for ( let i = 0; i < domSelection.rangeCount; i++ ) {
			// DOM Range have correct start and end, no matter what is the DOM Selection direction. So we don't have to fix anything.
			const domRange = domSelection.getRangeAt( i );
			const viewRange = this.domRangeToView( domRange );

			if ( viewRange ) {
				viewRanges.push( viewRange );
			}
		}

		return new ViewSelection( viewRanges, { backward: isBackward } );
	}

	/**
	 * Converts DOM Range to view {@link module:engine/view/range~ViewRange}.
	 * If the start or end position cannot be converted `null` is returned.
	 *
	 * @param domRange DOM range.
	 * @returns View range.
	 */
	public domRangeToView( domRange: DomRange | StaticRange ): ViewRange | null {
		const viewStart = this.domPositionToView( domRange.startContainer, domRange.startOffset );
		const viewEnd = this.domPositionToView( domRange.endContainer, domRange.endOffset );

		if ( viewStart && viewEnd ) {
			return new ViewRange( viewStart, viewEnd );
		}

		return null;
	}

	/**
	 * Converts DOM parent and offset to view {@link module:engine/view/position~ViewPosition}.
	 *
	 * If the position is inside a {@link module:engine/view/filler filler} which has no corresponding view node,
	 * position of the filler will be converted and returned.
	 *
	 * If the position is inside DOM element rendered by {@link module:engine/view/uielement~ViewUIElement}
	 * that position will be converted to view position before that UIElement.
	 *
	 * If structures are too different and it is not possible to find corresponding position then `null` will be returned.
	 *
	 * @param domParent DOM position parent.
	 * @param domOffset DOM position offset. You can skip it when converting the inline filler node.
	 * @returns View position.
	 */
	public domPositionToView( domParent: DomNode, domOffset: number = 0 ): ViewPosition | null {
		if ( this.isBlockFiller( domParent ) ) {
			return this.domPositionToView( domParent.parentNode!, indexOf( domParent ) );
		}

		// If position is somewhere inside UIElement or a RawElement - return position before that element.
		const viewElement = this.mapDomToView( domParent as DomElement );

		if ( viewElement && ( viewElement.is( 'uiElement' ) || viewElement.is( 'rawElement' ) ) ) {
			return ViewPosition._createBefore( viewElement );
		}

		if ( isText( domParent ) ) {
			if ( isInlineFiller( domParent ) ) {
				return this.domPositionToView( domParent.parentNode!, indexOf( domParent ) );
			}

			const viewParent = this.findCorrespondingViewText( domParent );
			let offset = domOffset;

			if ( !viewParent ) {
				return null;
			}

			if ( startsWithFiller( domParent ) ) {
				offset -= INLINE_FILLER_LENGTH;
				offset = offset < 0 ? 0 : offset;
			}

			return new ViewPosition( viewParent, offset );
		}
		// domParent instanceof HTMLElement.
		else {
			if ( domOffset === 0 ) {
				const viewParent = this.mapDomToView( domParent as DomElement );

				if ( viewParent ) {
					return new ViewPosition( viewParent, 0 );
				}
			} else {
				const domBefore = domParent.childNodes[ domOffset - 1 ];

				// Jump over an inline filler (and also on Firefox jump over a block filler while pressing backspace in an empty paragraph).
				if ( isText( domBefore ) && isInlineFiller( domBefore ) || domBefore && this.isBlockFiller( domBefore ) ) {
					return this.domPositionToView( domBefore.parentNode!, indexOf( domBefore ) );
				}

				const viewBefore = isText( domBefore ) ?
					this.findCorrespondingViewText( domBefore ) :
					this.mapDomToView( domBefore as DomElement );

				// TODO #663
				if ( viewBefore && viewBefore.parent ) {
					return new ViewPosition( viewBefore.parent, viewBefore.index! + 1 );
				}
			}

			return null;
		}
	}

	/**
	 * Returns corresponding view {@link module:engine/view/element~ViewElement Element} or
	 * {@link module:engine/view/documentfragment~ViewDocumentFragment} for provided DOM element or
	 * document fragment. If there is no view item {@link module:engine/view/domconverter~ViewDomConverter#bindElements bound}
	 * to the given DOM - `undefined` is returned.
	 *
	 * For all DOM elements rendered by a {@link module:engine/view/uielement~ViewUIElement} or
	 * a {@link module:engine/view/rawelement~ViewRawElement}, the parent `UIElement` or `RawElement` will be returned.
	 *
	 * @param domElementOrDocumentFragment DOM element or document fragment.
	 * @returns Corresponding view element, document fragment or `undefined` if no element was bound.
	 */
	public mapDomToView( domElementOrDocumentFragment: DomElement | DomDocumentFragment ): ViewElement | ViewDocumentFragment | undefined {
		const hostElement = this.getHostViewElement( domElementOrDocumentFragment );

		return hostElement || this._domToViewMapping.get( domElementOrDocumentFragment );
	}

	/**
	 * Finds corresponding text node. Text nodes are not {@link module:engine/view/domconverter~ViewDomConverter#bindElements bound},
	 * corresponding text node is returned based on the sibling or parent.
	 *
	 * If the directly previous sibling is a {@link module:engine/view/domconverter~ViewDomConverter#bindElements bound} element, it is used
	 * to find the corresponding text node.
	 *
	 * If this is a first child in the parent and the parent is a
	 * {@link module:engine/view/domconverter~ViewDomConverter#bindElements bound}
	 * element, it is used to find the corresponding text node.
	 *
	 * For all text nodes rendered by a {@link module:engine/view/uielement~ViewUIElement} or
	 * a {@link module:engine/view/rawelement~ViewRawElement}, the parent `UIElement` or `RawElement` will be returned.
	 *
	 * Otherwise `null` is returned.
	 *
	 * Note that for the block or inline {@link module:engine/view/filler filler} this method returns `null`.
	 *
	 * @param domText DOM text node.
	 * @returns Corresponding view text node or `null`, if it was not possible to find a corresponding node.
	 */
	public findCorrespondingViewText( domText: DomText ): ViewText | ViewUIElement | ViewRawElement | null {
		if ( isInlineFiller( domText ) ) {
			return null;
		}

		// If DOM text was rendered by a UIElement or a RawElement - return this parent element.
		const hostElement = this.getHostViewElement( domText );

		if ( hostElement ) {
			return hostElement;
		}

		const previousSibling = domText.previousSibling;

		// Try to use previous sibling to find the corresponding text node.
		if ( previousSibling ) {
			if ( !( this.isElement( previousSibling ) ) ) {
				// The previous is text or comment.
				return null;
			}

			const viewElement = this.mapDomToView( previousSibling );

			if ( viewElement ) {
				const nextSibling = ( viewElement as ViewElement ).nextSibling;

				// It might be filler which has no corresponding view node.
				if ( nextSibling instanceof ViewText ) {
					return nextSibling;
				} else {
					return null;
				}
			}
		}
		// Try to use parent to find the corresponding text node.
		else {
			const viewElement = this.mapDomToView( domText.parentNode as ( DomElement | DomDocumentFragment ) );

			if ( viewElement ) {
				const firstChild = ( viewElement as ViewElement ).getChild( 0 );

				// It might be filler which has no corresponding view node.
				if ( firstChild instanceof ViewText ) {
					return firstChild;
				} else {
					return null;
				}
			}
		}

		return null;
	}

	/**
	 * Returns corresponding DOM item for provided {@link module:engine/view/element~ViewElement Element} or
	 * {@link module:engine/view/documentfragment~ViewDocumentFragment DocumentFragment}.
	 * To find a corresponding text for {@link module:engine/view/text~ViewText view Text instance}
	 * use {@link #findCorrespondingDomText}.
	 *
	 * @label ELEMENT
	 * @param element View element or document fragment.
	 * @returns Corresponding DOM node or document fragment.
	 */
	public mapViewToDom( element: ViewElement ): DomElement | undefined;

	/**
	 * Returns corresponding DOM item for provided {@link module:engine/view/element~ViewElement Element} or
	 * {@link module:engine/view/documentfragment~ViewDocumentFragment DocumentFragment}.
	 * To find a corresponding text for {@link module:engine/view/text~ViewText view Text instance}
	 * use {@link #findCorrespondingDomText}.
	 *
	 * @label DOCUMENT_FRAGMENT
	 * @param documentFragment View element or document fragment.
	 * @returns Corresponding DOM node or document fragment.
	 */
	public mapViewToDom( documentFragment: ViewDocumentFragment ): DomDocumentFragment | undefined;

	/**
	 * Returns corresponding DOM item for provided {@link module:engine/view/element~ViewElement Element} or
	 * {@link module:engine/view/documentfragment~ViewDocumentFragment DocumentFragment}.
	 * To find a corresponding text for {@link module:engine/view/text~ViewText view Text instance}
	 * use {@link #findCorrespondingDomText}.
	 *
	 * @label DOCUMENT_FRAGMENT_OR_ELEMENT
	 * @param documentFragmentOrElement View element or document fragment.
	 * @returns Corresponding DOM node or document fragment.
	 */
	public mapViewToDom( documentFragmentOrElement: ViewElement | ViewDocumentFragment ): DomElement | DomDocumentFragment | undefined;

	public mapViewToDom( documentFragmentOrElement: ViewElement | ViewDocumentFragment ): DomElement | DomDocumentFragment | undefined {
		return this._viewToDomMapping.get( documentFragmentOrElement );
	}

	/**
	 * Finds corresponding text node. Text nodes are not {@link module:engine/view/domconverter~ViewDomConverter#bindElements bound},
	 * corresponding text node is returned based on the sibling or parent.
	 *
	 * If the directly previous sibling is a {@link module:engine/view/domconverter~ViewDomConverter#bindElements bound} element, it is used
	 * to find the corresponding text node.
	 *
	 * If this is a first child in the parent and the parent is a
	 * {@link module:engine/view/domconverter~ViewDomConverter#bindElements bound}
	 * element, it is used to find the corresponding text node.
	 *
	 * Otherwise `null` is returned.
	 *
	 * @param viewText View text node.
	 * @returns Corresponding DOM text node or `null`, if it was not possible to find a corresponding node.
	 */
	public findCorrespondingDomText( viewText: ViewText ): DomText | null {
		const previousSibling = viewText.previousSibling;

		// Try to use previous sibling to find the corresponding text node.
		if ( previousSibling && this.mapViewToDom( previousSibling as ViewElement ) ) {
			return this.mapViewToDom( previousSibling as ViewElement )!.nextSibling as DomText;
		}

		// If this is a first node, try to use parent to find the corresponding text node.
		if ( !previousSibling && viewText.parent && this.mapViewToDom( viewText.parent ) ) {
			return this.mapViewToDom( viewText.parent )!.childNodes[ 0 ] as DomText;
		}

		return null;
	}

	/**
	 * Focuses DOM editable that is corresponding to provided {@link module:engine/view/editableelement~ViewEditableElement}.
	 */
	public focus( viewEditable: ViewEditableElement ): void {
		const domEditable = this.mapViewToDom( viewEditable );

		if ( !domEditable || domEditable.ownerDocument.activeElement === domEditable ) {
			// @if CK_DEBUG_TYPING // if ( ( window as any ).logCKETyping ) {
			// @if CK_DEBUG_TYPING // 	console.info( ..._buildLogMessage( this, 'ViewDomConverter',
			// @if CK_DEBUG_TYPING // 		'%cDOM editable is already active or does not exist',
			// @if CK_DEBUG_TYPING // 		'font-style: italic'
			// @if CK_DEBUG_TYPING // 	) );
			// @if CK_DEBUG_TYPING // }

			return;
		}

		// @if CK_DEBUG_TYPING // if ( ( window as any ).logCKETyping ) {
		// @if CK_DEBUG_TYPING // 	console.info( ..._buildLogMessage( this, 'ViewDomConverter',
		// @if CK_DEBUG_TYPING // 		'Focus DOM editable:',
		// @if CK_DEBUG_TYPING // 		{ domEditable }
		// @if CK_DEBUG_TYPING // 	) );
		// @if CK_DEBUG_TYPING // }

		// Save the scrollX and scrollY positions before the focus.
		const { scrollX, scrollY } = global.window;
		const scrollPositions: Array<[ number, number ]> = [];

		// Save all scrollLeft and scrollTop values starting from domEditable up to
		// document#documentElement.
		forEachDomElementAncestor( domEditable, node => {
			const { scrollLeft, scrollTop } = ( node as DomElement );

			scrollPositions.push( [ scrollLeft, scrollTop ] );
		} );

		domEditable.focus();

		// Restore scrollLeft and scrollTop values starting from domEditable up to
		// document#documentElement.
		// https://github.com/ckeditor/ckeditor5-engine/issues/951
		// https://github.com/ckeditor/ckeditor5-engine/issues/957
		forEachDomElementAncestor( domEditable, node => {
			const [ scrollLeft, scrollTop ] = scrollPositions.shift() as [ number, number ];

			node.scrollLeft = scrollLeft;
			node.scrollTop = scrollTop;
		} );

		// Restore the scrollX and scrollY positions after the focus.
		// https://github.com/ckeditor/ckeditor5-engine/issues/951
		global.window.scrollTo( scrollX, scrollY );
	}

	/**
	 * Remove DOM selection from blurred editable, so it won't interfere with clicking on dropdowns (especially on iOS).
	 *
	 * @internal
	 */
	public _clearDomSelection(): void {
		const domEditable = this.mapViewToDom( this.document.selection.editableElement! );

		if ( !domEditable ) {
			return;
		}

		// Check if DOM selection is inside editor editable element.
		const domSelection = domEditable.ownerDocument.defaultView!.getSelection()!;
		const newViewSelection = this.domSelectionToView( domSelection );
		const selectionInEditable = newViewSelection && newViewSelection.rangeCount > 0;

		if ( selectionInEditable ) {
			domSelection.removeAllRanges();
		}
	}

	/**
	 * Returns `true` when `node.nodeType` equals `Node.ELEMENT_NODE`.
	 *
	 * @param node Node to check.
	 */
	public isElement( node: DomNode ): node is DomElement {
		return node && node.nodeType == Node.ELEMENT_NODE;
	}

	/**
	 * Returns `true` when `node.nodeType` equals `Node.DOCUMENT_FRAGMENT_NODE`.
	 *
	 * @param node Node to check.
	 */
	public isDocumentFragment( node: DomNode ): node is DomDocumentFragment {
		return node && node.nodeType == Node.DOCUMENT_FRAGMENT_NODE;
	}

	/**
	 * Checks if the node is an instance of the block filler for this DOM converter.
	 *
	 * ```ts
	 * const converter = new ViewDomConverter( viewDocument, { blockFillerMode: 'br' } );
	 *
	 * converter.isBlockFiller( BR_FILLER( document ) ); // true
	 * converter.isBlockFiller( NBSP_FILLER( document ) ); // false
	 * ```
	 *
	 * **Note:**: For the `'nbsp'` mode the method also checks context of a node so it cannot be a detached node.
	 *
	 * **Note:** A special case in the `'nbsp'` mode exists where the `<br>` in `<p><br></p>` is treated as a block filler.
	 *
	 * @param domNode DOM node to check.
	 * @returns True if a node is considered a block filler for given mode.
	 */
	public isBlockFiller( domNode: DomNode ): boolean {
		if ( this.blockFillerMode == 'br' ) {
			return domNode.isEqualNode( BR_FILLER_REF );
		}

		// Special case for <p><br></p> in which <br> should be treated as filler even when we are not in the 'br' mode.
		// See https://github.com/ckeditor/ckeditor5/issues/5564.
		if ( isOnlyBrInBlock( domNode as DomElement, this.blockElements ) ) {
			return true;
		}

		// If not in 'br' mode, try recognizing both marked and regular nbsp block fillers.
		return domNode.isEqualNode( MARKED_NBSP_FILLER_REF ) || isNbspBlockFiller( domNode, this.blockElements );
	}

	/**
	 * Returns `true` if given selection is a backward selection, that is, if it's `focus` is before `anchor`.
	 *
	 * @param selection Selection instance to check.
	 */
	public isDomSelectionBackward( selection: DomSelection ): boolean {
		if ( selection.isCollapsed ) {
			return false;
		}

		// Since it takes multiple lines of code to check whether a "DOM Position" is before/after another "DOM Position",
		// we will use the fact that range will collapse if it's end is before it's start.
		const range = this._domDocument.createRange();

		try {
			range.setStart( selection.anchorNode!, selection.anchorOffset );
			range.setEnd( selection.focusNode!, selection.focusOffset );
		} catch {
			// Safari sometimes gives us a selection that makes Range.set{Start,End} throw.
			// See https://github.com/ckeditor/ckeditor5/issues/12375.
			return false;
		}

		const backward = range.collapsed;

		range.detach();

		return backward;
	}

	/**
	 * Returns a parent {@link module:engine/view/uielement~ViewUIElement} or {@link module:engine/view/rawelement~ViewRawElement}
	 * that hosts the provided DOM node. Returns `null` if there is no such parent.
	 */
	public getHostViewElement( domNode: DomNode ): ViewUIElement | ViewRawElement | null {
		const ancestors = getAncestors( domNode );

		// Remove domNode from the list.
		ancestors.pop();

		while ( ancestors.length ) {
			const domNode = ancestors.pop();
			const viewNode = this._domToViewMapping.get( domNode as DomElement );

			if ( viewNode && ( viewNode.is( 'uiElement' ) || viewNode.is( 'rawElement' ) ) ) {
				return viewNode;
			}
		}

		return null;
	}

	/**
	 * Checks if the given selection's boundaries are at correct places.
	 *
	 * The following places are considered as incorrect for selection boundaries:
	 *
	 * * before or in the middle of an inline filler sequence,
	 * * inside a DOM element which represents {@link module:engine/view/uielement~ViewUIElement a view UI element},
	 * * inside a DOM element which represents {@link module:engine/view/rawelement~ViewRawElement a view raw element}.
	 *
	 * @param domSelection The DOM selection object to be checked.
	 * @returns `true` if the given selection is at a correct place, `false` otherwise.
	 */
	public isDomSelectionCorrect( domSelection: DomSelection ): boolean {
		return this._isDomSelectionPositionCorrect( domSelection.anchorNode!, domSelection.anchorOffset ) &&
			this._isDomSelectionPositionCorrect( domSelection.focusNode!, domSelection.focusOffset );
	}

	/**
	 * Registers a {@link module:engine/view/matcher~MatcherPattern} for view elements whose content should be treated as raw data
	 * and not processed during the conversion from DOM nodes to view elements.
	 *
	 * This is affecting how {@link module:engine/view/domconverter~ViewDomConverter#domToView} and
	 * {@link module:engine/view/domconverter~ViewDomConverter#domChildrenToView} process DOM nodes.
	 *
	 * The raw data can be later accessed by a
	 * {@link module:engine/view/element~ViewElement#getCustomProperty custom property of a view element} called `"$rawContent"`.
	 *
	 * @param pattern Pattern matching a view element whose content should
	 * be treated as raw data.
	 */
	public registerRawContentMatcher( pattern: MatcherPattern ): void {
		this._rawContentElementMatcher.add( pattern );
	}

	/**
	 * Registers a {@link module:engine/view/matcher~MatcherPattern} for inline object view elements.
	 *
	 * This is affecting how {@link module:engine/view/domconverter~ViewDomConverter#domToView} and
	 * {@link module:engine/view/domconverter~ViewDomConverter#domChildrenToView} process DOM nodes.
	 *
	 * This is an extension of a simple {@link #inlineObjectElements} array of element names.
	 *
	 * @param pattern Pattern matching a view element which should be treated as an inline object.
	 */
	public registerInlineObjectMatcher( pattern: MatcherPattern ): void {
		this._inlineObjectElementMatcher.add( pattern );
	}

	/**
	 * Clear temporary custom properties.
	 *
	 * @internal
	 */
	public _clearTemporaryCustomProperties(): void {
		for ( const element of this._elementsWithTemporaryCustomProperties ) {
			element._removeCustomProperty( 'editingPipeline:doNotReuseOnce' );
		}

		this._elementsWithTemporaryCustomProperties.clear();
	}

	/**
	 * Returns the block {@link module:engine/view/filler filler} node based on the current {@link #blockFillerMode} setting.
	 */
	private _getBlockFiller(): DomNode {
		switch ( this.blockFillerMode ) {
			case 'nbsp':
				return NBSP_FILLER( this._domDocument ); // eslint-disable-line new-cap
			case 'markedNbsp':
				return MARKED_NBSP_FILLER( this._domDocument ); // eslint-disable-line new-cap
			case 'br':
				return BR_FILLER( this._domDocument ); // eslint-disable-line new-cap
		}
	}

	/**
	 * Checks if the given DOM position is a correct place for selection boundary. See {@link #isDomSelectionCorrect}.
	 *
	 * @param domParent Position parent.
	 * @param offset Position offset.
	 * @returns `true` if given position is at a correct place for selection boundary, `false` otherwise.
	 */
	private _isDomSelectionPositionCorrect( domParent: DomNode, offset: number ): boolean {
		// If selection is before or in the middle of inline filler string, it is incorrect.
		if ( isText( domParent ) && startsWithFiller( domParent ) && offset < INLINE_FILLER_LENGTH ) {
			// Selection in a text node, at wrong position (before or in the middle of filler).
			return false;
		}

		if ( this.isElement( domParent ) && startsWithFiller( domParent.childNodes[ offset ] ) ) {
			// Selection in an element node, before filler text node.
			return false;
		}

		const viewParent = this.mapDomToView( domParent as DomElement );

		// The position is incorrect when anchored inside a UIElement or a RawElement.
		// Note: In case of UIElement and RawElement, mapDomToView() returns a parent element for any DOM child
		// so there's no need to perform any additional checks.
		if ( viewParent && ( viewParent.is( 'uiElement' ) || viewParent.is( 'rawElement' ) ) ) {
			return false;
		}

		return true;
	}

	/**
	 * Internal generator for {@link #domToView}. Also used by {@link #domChildrenToView}.
	 * Separates DOM nodes conversion from whitespaces processing.
	 *
	 * @param domNode DOM node or document fragment to transform.
	 * @param inlineNodes An array of recently encountered inline nodes truncated to the block element boundaries.
	 * Used later to process whitespaces.
	 */
	private* _domToView(
		domNode: DomNode,
		options: {
			bind?: boolean;
			withChildren?: boolean;
			keepOriginalCase?: boolean;
			skipComments?: boolean;
		},
		inlineNodes: Array<ViewNode>
	): IterableIterator<ViewNode | ViewDocumentFragment | null> {
		// Special case for <p><br></p> in which <br> should be treated as filler even when we are not in the 'br' mode.
		// See https://github.com/ckeditor/ckeditor5/issues/5564.
		if ( this.blockFillerMode != 'br' && isOnlyBrInBlock( domNode as DomElement, this.blockElements ) ) {
			return null;
		}

		// When node is inside a UIElement or a RawElement return that parent as it's view representation.
		const hostElement = this.getHostViewElement( domNode );

		if ( hostElement ) {
			return hostElement;
		}

		if ( isComment( domNode ) && options.skipComments ) {
			return null;
		}

		if ( isText( domNode ) ) {
			if ( isInlineFiller( domNode ) ) {
				return null;
			} else {
				const textData = domNode.data;

				if ( textData === '' ) {
					return null;
				}

				const textNode = new ViewText( this.document, textData );

				inlineNodes.push( textNode );

				return textNode;
			}
		} else {
			let viewElement = this.mapDomToView( domNode as ( DomElement | DomDocumentFragment ) );

			if ( viewElement ) {
				if ( this._isInlineObjectElement( viewElement ) ) {
					inlineNodes.push( viewElement );
				}

				return viewElement;
			}

			if ( this.isDocumentFragment( domNode ) ) {
				// Create view document fragment.
				viewElement = new ViewDocumentFragment( this.document );

				if ( options.bind ) {
					this.bindDocumentFragments( domNode, viewElement );
				}
			} else {
				// Create view element.
				viewElement = this._createViewElement( domNode, options );

				if ( options.bind ) {
					this.bindElements( domNode as DomElement, viewElement );
				}

				// Copy element's attributes.
				const attrs = ( domNode as DomElement ).attributes;

				if ( attrs ) {
					for ( let l = attrs.length, i = 0; i < l; i++ ) {
						viewElement._setAttribute( attrs[ i ].name, attrs[ i ].value );
					}
				}

				// Treat this element's content as a raw data if it was registered as such.
				if ( this._isViewElementWithRawContent( viewElement, options ) ) {
					viewElement._setCustomProperty( '$rawContent', ( domNode as DomElement ).innerHTML );

					if ( !this._isBlockViewElement( viewElement ) ) {
						inlineNodes.push( viewElement );
					}

					return viewElement;
				}

				// Comment node is also treated as an element with raw data.
				if ( isComment( domNode ) ) {
					viewElement._setCustomProperty( '$rawContent', domNode.data );

					return viewElement;
				}
			}

			// Yield the element first so the flow of nested inline nodes is not reversed inside elements.
			yield viewElement;

			const nestedInlineNodes: Array<ViewNode> = [];

			if ( options.withChildren !== false ) {
				for ( const child of this.domChildrenToView( domNode as DomElement, options, nestedInlineNodes ) ) {
					viewElement._appendChild( child );
				}
			}

			// Check if this is an inline object after processing child nodes so matcher
			// for inline objects can verify if the element is empty.
			if ( this._isInlineObjectElement( viewElement ) ) {
				inlineNodes.push( viewElement );

				// Inline object content should be handled as a flow-root.
				this._processDomInlineNodes( null, nestedInlineNodes, options );
			} else {
				// It's an inline element that is not an object (like <b>, <i>) or a block element.
				for ( const inlineNode of nestedInlineNodes ) {
					inlineNodes.push( inlineNode );
				}
			}
		}
	}

	/**
	 * Internal helper that walks the list of inline view nodes already generated from DOM nodes
	 * and handles whitespaces and NBSPs.
	 *
	 * @param domParent The DOM parent of the given inline nodes. This should be a document fragment or
	 * a block element to whitespace processing start cleaning.
	 * @param inlineNodes An array of recently encountered inline nodes truncated to the block element boundaries.
	 */
	private _processDomInlineNodes(
		domParent: DomElement | null,
		inlineNodes: Array<ViewNode>,
		options: { withChildren?: boolean }
	): void {
		if ( !inlineNodes.length ) {
			return;
		}

		// Process text nodes only after reaching a block or document fragment,
		// do not alter whitespaces while processing an inline element like <b> or <i>.
		if ( domParent && !this.isDocumentFragment( domParent ) && !this._isBlockDomElement( domParent ) ) {
			return;
		}

		let prevNodeEndsWithSpace = false;

		for ( let i = 0; i < inlineNodes.length; i++ ) {
			const node = inlineNodes[ i ];

			if ( !node.is( '$text' ) ) {
				prevNodeEndsWithSpace = false;
				continue;
			}

			let data: string;
			let nodeEndsWithSpace: boolean = false;

			if ( this._isPreFormatted( node ) ) {
				data = getDataWithoutFiller( node.data );
			} else {
				// Change all consecutive whitespace characters (from the [ \n\t\r] set –
				// see https://github.com/ckeditor/ckeditor5-engine/issues/822#issuecomment-311670249) to a single space character.
				// That's how multiple whitespaces are treated when rendered, so we normalize those whitespaces.
				// We're replacing 1+ (and not 2+) to also normalize singular \n\t\r characters (#822).
				data = node.data.replace( /[ \n\t\r]{1,}/g, ' ' );
				nodeEndsWithSpace = /[^\S\u00A0]/.test( data.charAt( data.length - 1 ) );

				const prevNode = i > 0 ? inlineNodes[ i - 1 ] : null;
				const nextNode = i + 1 < inlineNodes.length ? inlineNodes[ i + 1 ] : null;

				const shouldLeftTrim = !prevNode || prevNode.is( 'element' ) && prevNode.name == 'br' || prevNodeEndsWithSpace;
				const shouldRightTrim = nextNode ? false : !startsWithFiller( node.data );

				// Do not try to clear whitespaces if this is flat mapping for the purpose of mutation observer and differ in rendering.
				if ( options.withChildren !== false ) {
					// If the previous dom text node does not exist or it ends by whitespace character, remove space character from the
					// beginning of this text node. Such space character is treated as a whitespace.
					if ( shouldLeftTrim ) {
						data = data.replace( /^ /, '' );
					}

					// If the next text node does not exist remove space character from the end of this text node.
					if ( shouldRightTrim ) {
						data = data.replace( / $/, '' );
					}
				}

				// At the beginning and end of a block element, Firefox inserts normal space + <br> instead of non-breaking space.
				// This means that the text node starts/end with normal space instead of non-breaking space.
				// This causes a problem because the normal space would be removed in `.replace` calls above. To prevent that,
				// the inline filler is removed only after the data is initially processed (by the `.replace` above). See ckeditor5#692.
				data = getDataWithoutFiller( data );

				// Block filler handling.
				if ( this.blockFillerMode != 'br' && node.parent ) {
					if ( isViewMarkedNbspFiller( node.parent, data ) ) {
						data = '';

						// Mark block element as it has a block filler and remove the `<span data-cke-filler="true">` element.
						if ( node.parent.parent ) {
							node.parent.parent._setCustomProperty( '$hasBlockFiller', true );
							node.parent._remove();
						}
					}
					else if ( isViewNbspFiller( node.parent, data, this.blockElements ) ) {
						data = '';
						node.parent._setCustomProperty( '$hasBlockFiller', true );
					}
				}

				// At this point we should have removed all whitespaces from DOM text data.
				//
				// Now, We will reverse the process that happens in `_processDataFromViewText`.
				//
				// We have to change &nbsp; chars, that were in DOM text data because of rendering reasons, to spaces.
				// First, change all ` \u00A0` pairs (space + &nbsp;) to two spaces. DOM converter changes two spaces from model/view to
				// ` \u00A0` to ensure proper rendering. Since here we convert back, we recognize those pairs and change them back to `  `.
				data = data.replace( / \u00A0/g, '  ' );

				const isNextNodeInlineObjectElement = nextNode && nextNode.is( 'element' ) && nextNode.name != 'br';
				const isNextNodeStartingWithSpace = nextNode && nextNode.is( '$text' ) && nextNode.data.charAt( 0 ) == ' ';

				// Then, let's change the last nbsp to a space.
				if ( /[ \u00A0]\u00A0$/.test( data ) || !nextNode || isNextNodeInlineObjectElement || isNextNodeStartingWithSpace ) {
					data = data.replace( /\u00A0$/, ' ' );
				}

				// Then, change &nbsp; character that is at the beginning of the text node to space character.
				// We do that replacement only if this is the first node or the previous node ends on whitespace character.
				if ( shouldLeftTrim || prevNode && prevNode.is( 'element' ) && prevNode.name != 'br' ) {
					data = data.replace( /^\u00A0/, ' ' );
				}
			}

			// At this point, all whitespaces should be removed and all &nbsp; created for rendering reasons should be
			// changed to normal space. All left &nbsp; are &nbsp; inserted intentionally.

			if ( data.length == 0 && node.parent ) {
				node._remove();
				inlineNodes.splice( i, 1 );
				i--;
			} else {
				node._data = data;
				prevNodeEndsWithSpace = nodeEndsWithSpace;
			}
		}

		inlineNodes.length = 0;
	}

	/**
	 * Takes text data from a given {@link module:engine/view/text~ViewText#data} and processes it so
	 * it is correctly displayed in the DOM.
	 *
	 * Following changes are done:
	 *
	 * * a space at the beginning is changed to `&nbsp;` if this is the first text node in its container
	 * element or if a previous text node ends with a space character,
	 * * space at the end of the text node is changed to `&nbsp;` if there are two spaces at the end of a node or if next node
	 * starts with a space or if it is the last text node in its container,
	 * * remaining spaces are replaced to a chain of spaces and `&nbsp;` (e.g. `'x   x'` becomes `'x &nbsp; x'`).
	 *
	 * Content of {@link #preElements} is not processed.
	 *
	 * @param node View text node to process.
	 * @returns Processed text data.
	 */
	private _processDataFromViewText( node: ViewText | ViewTextProxy ): string {
		let data = node.data;

		// If the currently processed view text node is preformatted, we should not change whitespaces.
		if ( this._isPreFormatted( node ) ) {
			return data;
		}

		// 1. Replace the first space with a nbsp if the previous node ends with a space or there is no previous node
		// (container element boundary).
		if ( data.charAt( 0 ) == ' ' ) {
			const prevNode = this._getTouchingInlineViewNode( node as ViewText, false );
			const prevEndsWithSpace = prevNode && prevNode.is( '$textProxy' ) && this._nodeEndsWithSpace( prevNode as ViewTextProxy );

			if ( prevEndsWithSpace || !prevNode ) {
				data = '\u00A0' + data.substr( 1 );
			}
		}

		// 2. Replace the last space with nbsp if there are two spaces at the end or if the next node starts with space or there is no
		// next node (container element boundary).
		//
		// Keep in mind that Firefox prefers $nbsp; before tag, not inside it:
		//
		// Foo <span>&nbsp;bar</span>  <-- bad.
		// Foo&nbsp;<span> bar</span>  <-- good.
		//
		// More here: https://github.com/ckeditor/ckeditor5-engine/issues/1747.
		if ( data.charAt( data.length - 1 ) == ' ' ) {
			const nextNode = this._getTouchingInlineViewNode( node as ViewText, true );
			const nextStartsWithSpace = nextNode && nextNode.is( '$textProxy' ) && nextNode.data.charAt( 0 ) == ' ';

			if ( data.charAt( data.length - 2 ) == ' ' || !nextNode || nextStartsWithSpace ) {
				data = data.substr( 0, data.length - 1 ) + '\u00A0';
			}
		}

		// 3. Create space+nbsp pairs.
		return data.replace( / {2}/g, ' \u00A0' );
	}

	/**
	 * Checks whether given node ends with a space character after changing appropriate space characters to `&nbsp;`s.
	 *
	 * @param  node Node to check.
	 * @returns `true` if given `node` ends with space, `false` otherwise.
	 */
	private _nodeEndsWithSpace( node: ViewTextProxy ): boolean {
		if ( this._isPreFormatted( node ) ) {
			return false;
		}

		const data = this._processDataFromViewText( node );

		return data.charAt( data.length - 1 ) == ' ';
	}

	/**
	 * Checks whether given text contains preformatted white space. This is the case if
	 * * any of node ancestors has a name which is in `preElements` array, or
	 * * the closest ancestor that has the `white-space` CSS property sets it to a value that preserves spaces
	 *
	 * @param node Node to check
	 * @returns `true` if given node contains preformatted white space, `false` otherwise.
	 */
	private _isPreFormatted( node: ViewText | ViewTextProxy ): boolean {
		if ( _hasViewParentOfType( node, this.preElements ) ) {
			return true;
		}

		for ( const ancestor of node.getAncestors( { parentFirst: true } ) ) {
			if ( !ancestor.is( 'element' ) || !ancestor.hasStyle( 'white-space' ) || ancestor.getStyle( 'white-space' ) === 'inherit' ) {
				continue;
			}

			// If the node contains the `white-space` property with a value that does not preserve spaces, it will take
			// precedence over any white-space settings its ancestors contain, so no further parent checking needs to
			// be done.
			return [ 'pre', 'pre-wrap', 'break-spaces' ].includes( ancestor.getStyle( 'white-space' )! );
		}

		return false;
	}

	/**
	 * Helper function. For given {@link module:engine/view/text~ViewText view text node}, it finds previous or next sibling
	 * that is contained in the same container element. If there is no such sibling, `null` is returned.
	 *
	 * @param node Reference node.
	 * @returns Touching text node, an inline object
	 * or `null` if there is no next or previous touching text node.
	 */
	private _getTouchingInlineViewNode( node: ViewText, getNext: boolean ): ViewElement | ViewTextProxy | null {
		const treeWalker = new ViewTreeWalker( {
			startPosition: getNext ? ViewPosition._createAfter( node ) : ViewPosition._createBefore( node ),
			direction: getNext ? 'forward' : 'backward'
		} );

		for ( const { item } of treeWalker ) {
			// Found a text node in the same container element.
			if ( item.is( '$textProxy' ) ) {
				return item;
			}
			// Found a transparent element, skip it and continue inside it.
			else if ( item.is( 'element' ) && item.getCustomProperty( 'dataPipeline:transparentRendering' ) ) {
				continue;
			}
			// <br> found – it works like a block boundary, so do not scan further.
			else if ( item.is( 'element', 'br' ) ) {
				return null;
			}
			// Found an inline object (for example an image).
			else if ( this._isInlineObjectElement( item ) ) {
				return item;
			}
			// ViewContainerElement is found on a way to next ViewText node, so given `node` was first/last
			// text node in its container element.
			else if ( item.is( 'containerElement' ) ) {
				return null;
			}
		}

		return null;
	}

	/**
	 * Returns `true` if a DOM node belongs to {@link #blockElements}. `false` otherwise.
	 */
	private _isBlockDomElement( node: DomNode ): boolean {
		return this.isElement( node ) && this.blockElements.includes( node.tagName.toLowerCase() );
	}

	/**
	 * Returns `true` if a view node belongs to {@link #blockElements}. `false` otherwise.
	 */
	private _isBlockViewElement( node: ViewNode ): boolean {
		return node.is( 'element' ) && this.blockElements.includes( node.name );
	}

	/**
	 * Returns `true` if a DOM node belongs to {@link #inlineObjectElements}. `false` otherwise.
	 */
	private _isInlineObjectElement( node: ViewNode | ViewTextProxy | ViewDocumentFragment ): node is ViewElement {
		if ( !node.is( 'element' ) ) {
			return false;
		}

		return node.name == 'br' ||
			this.inlineObjectElements.includes( node.name ) ||
			!!this._inlineObjectElementMatcher.match( node );
	}

	/**
	 * Creates view element basing on the node type.
	 *
	 * @param node DOM node to check.
	 * @param options Conversion options. See {@link module:engine/view/domconverter~ViewDomConverter#domToView} options parameter.
	 */
	private _createViewElement( node: DomNode, options: { keepOriginalCase?: boolean } ): ViewElement {
		if ( isComment( node ) ) {
			return new ViewUIElement( this.document, '$comment' );
		}

		const viewName = options.keepOriginalCase ? ( node as DomElement ).tagName : ( node as DomElement ).tagName.toLowerCase();

		return new ViewElement( this.document, viewName );
	}

	/**
	 * Checks if view element's content should be treated as a raw data.
	 *
	 * @param viewElement View element to check.
	 * @param options Conversion options. See {@link module:engine/view/domconverter~ViewDomConverter#domToView} options parameter.
	 */
	private _isViewElementWithRawContent( viewElement: ViewElement | ViewDocumentFragment, options: { withChildren?: boolean } ): boolean {
		return options.withChildren !== false && viewElement.is( 'element' ) && !!this._rawContentElementMatcher.match( viewElement );
	}

	/**
	 * Checks whether a given element name should be renamed in a current rendering mode.
	 *
	 * @param elementName The name of view element.
	 */
	private _shouldRenameElement( elementName: string ): boolean {
		const name = elementName.toLowerCase();

		return this.renderingMode === 'editing' && this.unsafeElements.includes( name );
	}

	/**
	 * Return a <span> element with a special attribute holding the name of the original element.
	 * Optionally, copy all the attributes of the original element if that element is provided.
	 *
	 * @param elementName The name of view element.
	 * @param originalDomElement The original DOM element to copy attributes and content from.
	 */
	private _createReplacementDomElement( elementName: string, originalDomElement?: DomElement ): DomElement {
		const newDomElement = this._domDocument.createElement( 'span' );

		// Mark the span replacing a script as hidden.
		newDomElement.setAttribute( UNSAFE_ELEMENT_REPLACEMENT_ATTRIBUTE, elementName );

		if ( originalDomElement ) {
			while ( originalDomElement.firstChild ) {
				newDomElement.appendChild( originalDomElement.firstChild );
			}

			for ( const attributeName of originalDomElement.getAttributeNames() ) {
				newDomElement.setAttribute( attributeName, originalDomElement.getAttribute( attributeName )! );
			}
		}

		return newDomElement;
	}
}

/**
 * Helper function.
 * Used to check if given native `Element` or `Text` node has parent with tag name from `types` array.
 *
 * @returns`true` if such parent exists or `false` if it does not.
 */
function _hasViewParentOfType( node: ViewNode | ViewTextProxy, types: ReadonlyArray<string> ) {
	return node.getAncestors().some( parent => parent.is( 'element' ) && types.includes( parent.name ) );
}

/**
 * A helper that executes given callback for each DOM node's ancestor, starting from the given node
 * and ending in document#documentElement.
 *
 * @param callback A callback to be executed for each ancestor.
 */
function forEachDomElementAncestor( element: DomElement, callback: ( node: DomElement ) => void ) {
	let node: DomElement | null = element;

	while ( node ) {
		callback( node );
		node = node.parentElement;
	}
}

/**
 * Checks if given DOM node is a nbsp block filler.
 *
 * A &nbsp; is a block filler only if it is a single child of a block element.
 *
 * @param domNode DOM node.
 */
function isNbspBlockFiller( domNode: DomNode, blockElements: ReadonlyArray<string> ): boolean {
	const isNBSP = domNode.isEqualNode( NBSP_FILLER_REF );

	return isNBSP && hasBlockParent( domNode, blockElements ) && ( domNode as DomElement ).parentNode!.childNodes.length === 1;
}

/**
 * Checks if domNode has block parent.
 *
 * @param domNode DOM node.
 */
function hasBlockParent( domNode: DomNode, blockElements: ReadonlyArray<string> ): boolean {
	const parent = domNode.parentNode;

	return !!parent && !!( parent as DomElement ).tagName && blockElements.includes( ( parent as DomElement ).tagName.toLowerCase() );
}

/**
 * Checks if given view node is a nbsp block filler.
 *
 * A &nbsp; is a block filler only if it is a single child of a block element.
 */
function isViewNbspFiller( parent: ViewNode | ViewDocumentFragment, data: string, blockElements: Array<string> ): boolean {
	return (
		data == '\u00A0' &&
		parent &&
		parent.is( 'element' ) &&
		parent.childCount == 1 &&
		blockElements.includes( parent.name )
	);
}

/**
 * Checks if given view node is a marked-nbsp block filler.
 *
 * A &nbsp; is a block filler only if it is wrapped in `<span data-cke-filler="true">` element.
 */
function isViewMarkedNbspFiller( parent: ViewNode | ViewDocumentFragment, data: string ): boolean {
	return (
		data == '\u00A0' &&
		parent &&
		parent.is( 'element', 'span' ) &&
		parent.childCount == 1 &&
		parent.hasAttribute( 'data-cke-filler' )
	);
}

/**
 * Checks if given view node is a br block filler.
 *
 * A <br> is a block filler only if it has data-cke-filler attribute set.
 */
function isViewBrFiller( node: ViewNode ): boolean {
	return (
		node.is( 'element', 'br' ) &&
		node.hasAttribute( 'data-cke-filler' )
	);
}

/**
 * Special case for `<p><br></p>` in which `<br>` should be treated as filler even when we are not in the 'br' mode.
 */
function isOnlyBrInBlock( domNode: DomElement, blockElements: Array<string> ): boolean {
	// See https://github.com/ckeditor/ckeditor5/issues/5564.
	return (
		domNode.tagName === 'BR' &&
		hasBlockParent( domNode, blockElements ) &&
		domNode.parentNode!.childNodes.length === 1
	);
}

/**
 * Log to console the information about element that was replaced.
 * Check UNSAFE_ELEMENTS for all recognized unsafe elements.
 *
 * @param elementName The name of the view element.
 */
function _logUnsafeElement( elementName: string ): void {
	if ( elementName === 'script' ) {
		logWarning( 'domconverter-unsafe-script-element-detected' );
	}

	if ( elementName === 'style' ) {
		logWarning( 'domconverter-unsafe-style-element-detected' );
	}
}

/**
 * In certain cases, Firefox mysteriously assigns so called "restricted objects" to native DOM Range properties.
 * Any attempt at accessing restricted object's properties causes errors.
 * See: https://github.com/ckeditor/ckeditor5/issues/9635.
 */
function isGeckoRestrictedDomSelection( domSelection: DomSelection ): boolean {
	if ( !env.isGecko ) {
		return false;
	}

	if ( !domSelection.rangeCount ) {
		return false;
	}

	const container = domSelection.getRangeAt( 0 ).startContainer;

	try {
		Object.prototype.toString.call( container );
	} catch {
		return true;
	}

	return false;
}

/**
 * Enum representing the type of the block filler.
 *
 * Possible values:
 *
 * * `br` &ndash; For the `<br data-cke-filler="true">` block filler used in the editing view.
 * * `nbsp` &ndash; For the `&nbsp;` block fillers used in the data.
 * * `markedNbsp` &ndash; For the `&nbsp;` block fillers wrapped in `<span>` elements: `<span data-cke-filler="true">&nbsp;</span>`
 * used in the data.
 */
export type ViewBlockFillerMode = 'br' | 'nbsp' | 'markedNbsp';

/**
 * While rendering the editor content, the {@link module:engine/view/domconverter~ViewDomConverter} detected a `<script>` element that may
 * disrupt the editing experience. To avoid this, the `<script>` element was replaced with `<span data-ck-unsafe-element="script"></span>`.
 *
 * @error domconverter-unsafe-script-element-detected
 */

/**
 * While rendering the editor content, the
 * {@link module:engine/view/domconverter~ViewDomConverter} detected a `<style>` element that may affect
 * the editing experience. To avoid this, the `<style>` element was replaced with `<span data-ck-unsafe-element="style"></span>`.
 *
 * @error domconverter-unsafe-style-element-detected
 */

/**
 * The {@link module:engine/view/domconverter~ViewDomConverter} detected an interactive attribute in the
 * {@glink framework/architecture/editing-engine#editing-pipeline editing pipeline}. For the best
 * editing experience, the attribute was renamed to `data-ck-unsafe-attribute-[original attribute name]`.
 *
 * If you are the author of the plugin that generated this attribute and you want it to be preserved
 * in the editing pipeline, you can configure this when creating the element
 * using {@link module:engine/view/downcastwriter~ViewDowncastWriter} during the
 * {@glink framework/architecture/editing-engine#conversion model–view conversion}. Methods such as
 * {@link module:engine/view/downcastwriter~ViewDowncastWriter#createContainerElement},
 * {@link module:engine/view/downcastwriter~ViewDowncastWriter#createAttributeElement}, or
 * {@link module:engine/view/downcastwriter~ViewDowncastWriter#createEmptyElement}
 * accept an option that will disable filtering of specific attributes:
 *
 * ```ts
 * const paragraph = writer.createContainerElement( 'p',
 * 	{
 * 		class: 'clickable-paragraph',
 * 		onclick: 'alert( "Paragraph clicked!" )'
 * 	},
 * 	{
 * 		// Make sure the "onclick" attribute will pass through.
 * 		renderUnsafeAttributes: [ 'onclick' ]
 * 	}
 * );
 * ```
 *
 * @error domconverter-unsafe-attribute-detected
 * @param {HTMLElement} domElement The DOM element the attribute was set on.
 * @param {string} key The original name of the attribute
 * @param {string} value The value of the original attribute
 */
