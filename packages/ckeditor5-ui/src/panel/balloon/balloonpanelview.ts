/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module ui/panel/balloon/balloonpanelview
 */

import { View } from '../../view.js';
import { type ViewCollection } from '../../viewcollection.js';

import {
	getOptimalPosition,
	global,
	isRange,
	toUnit,
	isVisible,
	isText,
	ResizeObserver,
	type Locale,
	type ObservableChangeEvent,
	type DomPoint,
	type DomOptimalPositionOptions,
	Rect,
	type PositioningFunction
} from '@ckeditor/ckeditor5-utils';

import { isElement } from 'es-toolkit/compat';
import '../../../theme/components/panel/balloonpanel.css';

const toPx = /* #__PURE__ */ toUnit( 'px' );

// A static balloon panel positioning function that moves the balloon far off the viewport.
// It is used as a fallback when there is no way to position the balloon using provided
// positioning functions (see: `getOptimalPosition()`), for instance, when the target the
// balloon should be attached to gets obscured by scrollable containers or the viewport.
//
// It prevents the balloon from being attached to the void and possible degradation of the UX.
// At the same time, it keeps the balloon physically visible in the DOM so the focus remains
// uninterrupted.
const POSITION_OFF_SCREEN: DomPoint = {
	top: -99999,
	left: -99999,
	name: 'arrowless',
	config: {
		withArrow: false
	}
};

/**
 * The balloon panel view class.
 *
 * A floating container which can
 * {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView#pin pin} to any
 * {@link module:utils/dom/position~DomOptimalPositionOptions#target target} in the DOM and remain in that position
 * e.g. when the web page is scrolled.
 *
 * The balloon panel can be used to display contextual, non-blocking UI like forms, toolbars and
 * the like in its {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView#content} view
 * collection.
 *
 * There is a number of {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView.defaultPositions}
 * that the balloon can use, automatically switching from one to another when the viewport space becomes
 * scarce to keep the balloon visible to the user as long as it is possible. The balloon will also
 * accept any custom position set provided by the user compatible with the
 * {@link module:utils/dom/position~DomOptimalPositionOptions options}.
 *
 * ```ts
 * const panel = new BalloonPanelView( locale );
 * const childView = new ChildView();
 * const positions = BalloonPanelView.defaultPositions;
 *
 * panel.render();
 *
 * // Add a child view to the panel's content collection.
 * panel.content.add( childView );
 *
 * // Start pinning the panel to an element with the "target" id DOM.
 * // The balloon will remain pinned until unpin() is called.
 * panel.pin( {
 * 	target: document.querySelector( '#target' ),
 * 	positions: [
 * 		positions.northArrowSouth,
 * 		positions.southArrowNorth
 * 	]
 * } );
 * ```
 */
export class BalloonPanelView extends View {
	/**
	 * A collection of the child views that creates the balloon panel contents.
	 */
	public readonly content: ViewCollection;

	/**
	 * The absolute top position of the balloon panel in pixels.
	 *
	 * @observable
	 * @default 0
	 */
	declare public top: number;

	/**
	 * The absolute left position of the balloon panel in pixels.
	 *
	 * @observable
	 * @default 0
	 */
	declare public left: number;

	/**
	 * The balloon panel's current position. The position name is reflected in the CSS class set
	 * to the balloon, i.e. `.ck-balloon-panel_arrow_nw` for the "arrow_nw" position. The class
	 * controls the minor aspects of the balloon's visual appearance like the placement
	 * of an {@link #withArrow arrow}. To support a new position, an additional CSS must be created.
	 *
	 * Default position names correspond with
	 * {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView.defaultPositions}.
	 *
	 * See the {@link #attachTo} and {@link #pin} methods to learn about custom balloon positions.
	 *
	 * @observable
	 * @default 'arrow_nw'
	 */
	declare public position: 'arrow_nw' | 'arrow_ne' | 'arrow_sw' | 'arrow_se';

	/**
	 * Controls whether the balloon panel is visible or not.
	 *
	 * @observable
	 * @default false
	 */
	declare public isVisible: boolean;

	/**
	 * Controls whether the balloon panel has an arrow. The presence of the arrow
	 * is reflected in the `ck-balloon-panel_with-arrow` CSS class.
	 *
	 * @observable
	 * @default true
	 */
	declare public withArrow: boolean;

	/**
	 * An additional CSS class added to the {@link #element}.
	 *
	 * @observable
	 */
	declare public class: string | undefined;

	/**
	 * A callback that starts pinning the panel when {@link #isVisible} gets
	 * `true`. Used by {@link #pin}.
	 *
	 * @private
	 */
	private _pinWhenIsVisibleCallback: ( () => void ) | null;

	/**
	 * An instance of resize observer used to detect if target element is still visible.
	 */
	private _resizeObserver: ResizeObserver | null;

	/**
	 * @inheritDoc
	 */
	constructor( locale?: Locale ) {
		super( locale );

		const bind = this.bindTemplate;

		this.set( 'top', 0 );
		this.set( 'left', 0 );
		this.set( 'position', 'arrow_nw' );
		this.set( 'isVisible', false );
		this.set( 'withArrow', true );
		this.set( 'class', undefined );

		this._pinWhenIsVisibleCallback = null;
		this._resizeObserver = null;

		this.content = this.createCollection();

		this.setTemplate( {
			tag: 'div',
			attributes: {
				class: [
					'ck',
					'ck-balloon-panel',
					bind.to( 'position', value => `ck-balloon-panel_${ value }` ),
					bind.if( 'isVisible', 'ck-balloon-panel_visible' ),
					bind.if( 'withArrow', 'ck-balloon-panel_with-arrow' ),
					bind.to( 'class' )
				],

				style: {
					top: bind.to( 'top', toPx ),
					left: bind.to( 'left', toPx )
				}
			},

			children: this.content
		} );
	}

	/**
	 * @inheritDoc
	 */
	public override destroy(): void {
		this.hide();
		super.destroy();
	}

	/**
	 * Shows the panel.
	 *
	 * See {@link #isVisible}.
	 */
	public show(): void {
		this.isVisible = true;
	}

	/**
	 * Hides the panel.
	 *
	 * See {@link #isVisible}.
	 */
	public hide(): void {
		this.isVisible = false;
	}

	/**
	 * Attaches the panel to a specified {@link module:utils/dom/position~DomOptimalPositionOptions#target} with a
	 * smart positioning heuristics that chooses from available positions to make sure the panel
	 * is visible to the user i.e. within the limits of the viewport.
	 *
	 * This method accepts configuration {@link module:utils/dom/position~DomOptimalPositionOptions options}
	 * to set the `target`, optional `limiter` and `positions` the balloon should choose from.
	 *
	 * ```ts
	 * const panel = new BalloonPanelView( locale );
	 * const positions = BalloonPanelView.defaultPositions;
	 *
	 * panel.render();
	 *
	 * // Attach the panel to an element with the "target" id DOM.
	 * panel.attachTo( {
	 * 	target: document.querySelector( '#target' ),
	 * 	positions: [
	 * 		positions.northArrowSouth,
	 * 		positions.southArrowNorth
	 * 	]
	 * } );
	 * ```
	 *
	 * **Note**: Attaching the panel will also automatically {@link #show} it.
	 *
	 * **Note**: An attached panel will not follow its target when the window is scrolled or resized.
	 * See the {@link #pin} method for a more permanent positioning strategy.
	 *
	 * @param options Positioning options compatible with {@link module:utils/dom/position~getOptimalPosition}.
	 * Default `positions` array is {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView.defaultPositions}.
	 * @returns Whether the balloon was shown and successfully attached or not. Attaching can fail if the target
	 * provided in the options is invisible (e.g. element detached from DOM).
	 */
	public attachTo( options: Partial<DomOptimalPositionOptions> ): boolean {
		const target = getDomElement( options.target );

		if ( target && !isVisible( target ) ) {
			return false;
		}

		this.show();

		const defaultPositions = BalloonPanelView.defaultPositions;
		const positionOptions = Object.assign( {}, {
			element: this.element,
			positions: [
				defaultPositions.southArrowNorth,
				defaultPositions.southArrowNorthMiddleWest,
				defaultPositions.southArrowNorthMiddleEast,
				defaultPositions.southArrowNorthWest,
				defaultPositions.southArrowNorthEast,
				defaultPositions.northArrowSouth,
				defaultPositions.northArrowSouthMiddleWest,
				defaultPositions.northArrowSouthMiddleEast,
				defaultPositions.northArrowSouthWest,
				defaultPositions.northArrowSouthEast,
				defaultPositions.viewportStickyNorth
			],
			limiter: global.document.body,
			fitInViewport: true
		}, options ) as DomOptimalPositionOptions;

		const optimalPosition = BalloonPanelView._getOptimalPosition( positionOptions ) || POSITION_OFF_SCREEN;

		// Usually browsers make some problems with super accurate values like 104.345px
		// so it is better to use int values.
		const left = parseInt( optimalPosition.left as any );
		const top = parseInt( optimalPosition.top as any );

		const position = optimalPosition.name as this[ 'position' ];
		const config: { withArrow?: boolean } = optimalPosition.config || {};
		const { withArrow = true } = config;

		this.top = top;
		this.left = left;
		this.position = position;
		this.withArrow = withArrow;

		return true;
	}

	/**
	 * Works the same way as the {@link #attachTo} method except that the position of the panel is
	 * continuously updated when:
	 *
	 * * any ancestor of the {@link module:utils/dom/position~DomOptimalPositionOptions#target}
	 * or {@link module:utils/dom/position~DomOptimalPositionOptions#limiter} is scrolled,
	 * * the browser window gets resized or scrolled.
	 *
	 * Thanks to that, the panel always sticks to the {@link module:utils/dom/position~DomOptimalPositionOptions#target}
	 * and is immune to the changing environment.
	 *
	 * ```ts
	 * const panel = new BalloonPanelView( locale );
	 * const positions = BalloonPanelView.defaultPositions;
	 *
	 * panel.render();
	 *
	 * // Pin the panel to an element with the "target" id DOM.
	 * panel.pin( {
	 * 	target: document.querySelector( '#target' ),
	 * 	positions: [
	 * 		positions.northArrowSouth,
	 * 		positions.southArrowNorth
	 * 	]
	 * } );
	 * ```
	 *
	 * To leave the pinned state, use the {@link #unpin} method.
	 *
	 * **Note**: Pinning the panel will also automatically {@link #show} it.
	 *
	 * @param options Positioning options compatible with {@link module:utils/dom/position~getOptimalPosition}.
	 * Default `positions` array is {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView.defaultPositions}.
	 */
	public pin( options: Partial<DomOptimalPositionOptions> ): void {
		this.unpin();

		if ( !this._startPinning( options ) ) {
			return;
		}

		this._pinWhenIsVisibleCallback = () => {
			if ( this.isVisible ) {
				this._startPinning( options );
			} else {
				this._stopPinning();
			}
		};

		// Control the state of the listeners depending on whether the panel is visible
		// or not.
		// TODO: Use on() (https://github.com/ckeditor/ckeditor5-utils/issues/144).
		this.listenTo<ObservableChangeEvent>( this, 'change:isVisible', this._pinWhenIsVisibleCallback );
	}

	/**
	 * Stops pinning the panel, as set up by {@link #pin}.
	 */
	public unpin(): void {
		if ( this._pinWhenIsVisibleCallback ) {
			// Deactivate listeners attached by pin().
			this._stopPinning();

			// Deactivate the panel pin() control logic.
			// TODO: Use off() (https://github.com/ckeditor/ckeditor5-utils/issues/144).
			this.stopListening( this, 'change:isVisible', this._pinWhenIsVisibleCallback );

			this._pinWhenIsVisibleCallback = null;

			this.hide();
		}
	}

	/**
	 * Starts managing the pinned state of the panel. See {@link #pin}.
	 *
	 * @param options Positioning options compatible with {@link module:utils/dom/position~getOptimalPosition}.
	 * @returns Whether the balloon was shown and successfully attached or not. Attaching can fail if the target
	 * provided in the options is invisible (e.g. element detached from DOM).
	 */
	private _startPinning( options: Partial<DomOptimalPositionOptions> ): boolean {
		if ( !this.attachTo( options ) ) {
			return false;
		}

		let targetElement = getDomElement( options.target );
		const limiterElement = options.limiter ? getDomElement( options.limiter ) : global.document.body;

		// Then we need to listen on scroll event of eny element in the document.
		this.listenTo( global.document, 'scroll', ( evt, domEvt ) => {
			const scrollTarget = domEvt.target as Element;

			// The position needs to be updated if the positioning target is within the scrolled element.
			const isWithinScrollTarget = targetElement && scrollTarget.contains( targetElement );

			// The position needs to be updated if the positioning limiter is within the scrolled element.
			const isLimiterWithinScrollTarget = limiterElement && scrollTarget.contains( limiterElement );

			// The positioning target and/or limiter can be a Rect, object etc..
			// There's no way to optimize the listener then.
			if ( isWithinScrollTarget || isLimiterWithinScrollTarget || !targetElement || !limiterElement ) {
				this.attachTo( options );
			}
		}, { useCapture: true } );

		// We need to listen on window resize event and update position.
		this.listenTo( global.window, 'resize', () => {
			this.attachTo( options );
		} );

		// Hide the panel if the target element is no longer visible.
		if ( !this._resizeObserver ) {
			// If the target element is a text node, we need to check the parent element.
			// It's because `ResizeObserver` accept only elements, not text nodes.
			if ( targetElement && isText( targetElement ) ) {
				targetElement = targetElement.parentElement;
			}

			if ( targetElement ) {
				const checkVisibility = () => {
					// If the target element is no longer visible, hide the panel.
					if ( !isVisible( targetElement ) ) {
						this.unpin();
					}
				};

				// Element is being resized to 0x0 after it's parent became hidden,
				// so we need to check size in order to determine if it's visible or not.
				this._resizeObserver = new ResizeObserver( targetElement, checkVisibility );
			}
		}

		return true;
	}

	/**
	 * Stops managing the pinned state of the panel. See {@link #pin}.
	 */
	private _stopPinning(): void {
		this.stopListening( global.document, 'scroll' );
		this.stopListening( global.window, 'resize' );

		if ( this._resizeObserver ) {
			this._resizeObserver.destroy();
			this._resizeObserver = null;
		}
	}

	/**
	 * Returns available {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView}
	 * {@link module:utils/dom/position~PositioningFunction positioning functions} adjusted by the specific offsets.
	 *
	 * @internal
	 * @param options Options to generate positions. If not specified, this helper will simply return
	 * {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView.defaultPositions}.
	 * @param options.sideOffset A custom side offset (in pixels) of each position. If
	 * not specified, {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView.arrowSideOffset the default value}
	 * will be used.
	 * @param options.heightOffset A custom height offset (in pixels) of each position. If
	 * not specified, {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView.arrowHeightOffset the default value}
	 * will be used.
	 * @param options.stickyVerticalOffset A custom offset (in pixels) of the `viewportStickyNorth` positioning function.
	 * If not specified, {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView.stickyVerticalOffset the default value}
	 * will be used.
	 * @param options.config Additional configuration of the balloon balloon panel view.
	 * Currently only {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView#withArrow} is supported. Learn more
	 * about {@link module:utils/dom/position~PositioningFunction positioning functions}.
	 */
	public static generatePositions( options: {
		sideOffset?: number;
		heightOffset?: number;
		stickyVerticalOffset?: number;
		config?: object;
	} = {} ): Record<string, PositioningFunction> {
		const {
			sideOffset = BalloonPanelView.arrowSideOffset,
			heightOffset = BalloonPanelView.arrowHeightOffset,
			stickyVerticalOffset = BalloonPanelView.stickyVerticalOffset,
			config
		} = options;

		return {
			// ------- North west

			northWestArrowSouthWest: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.left - sideOffset,
				name: 'arrow_sw',
				...( config && { config } )
			} ),

			northWestArrowSouthMiddleWest: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.left - ( balloonRect.width * .25 ) - sideOffset,
				name: 'arrow_smw',
				...( config && { config } )
			} ),

			northWestArrowSouth: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.left - balloonRect.width / 2,
				name: 'arrow_s',
				...( config && { config } )
			} ),

			northWestArrowSouthMiddleEast: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.left - ( balloonRect.width * .75 ) + sideOffset,
				name: 'arrow_sme',
				...( config && { config } )
			} ),

			northWestArrowSouthEast: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.left - balloonRect.width + sideOffset,
				name: 'arrow_se',
				...( config && { config } )
			} ),

			// ------- North

			northArrowSouthWest: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.left + targetRect.width / 2 - sideOffset,
				name: 'arrow_sw',
				...( config && { config } )
			} ),

			northArrowSouthMiddleWest: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.left + targetRect.width / 2 - ( balloonRect.width * .25 ) - sideOffset,
				name: 'arrow_smw',
				...( config && { config } )
			} ),

			northArrowSouth: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.left + targetRect.width / 2 - balloonRect.width / 2,
				name: 'arrow_s',
				...( config && { config } )
			} ),

			northArrowSouthMiddleEast: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.left + targetRect.width / 2 - ( balloonRect.width * .75 ) + sideOffset,
				name: 'arrow_sme',
				...( config && { config } )
			} ),

			northArrowSouthEast: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.left + targetRect.width / 2 - balloonRect.width + sideOffset,
				name: 'arrow_se',
				...( config && { config } )
			} ),

			// ------- North east

			northEastArrowSouthWest: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.right - sideOffset,
				name: 'arrow_sw',
				...( config && { config } )
			} ),

			northEastArrowSouthMiddleWest: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.right - ( balloonRect.width * .25 ) - sideOffset,
				name: 'arrow_smw',
				...( config && { config } )
			} ),

			northEastArrowSouth: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.right - balloonRect.width / 2,
				name: 'arrow_s',
				...( config && { config } )
			} ),

			northEastArrowSouthMiddleEast: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.right - ( balloonRect.width * .75 ) + sideOffset,
				name: 'arrow_sme',
				...( config && { config } )
			} ),

			northEastArrowSouthEast: ( targetRect, balloonRect ) => ( {
				top: getNorthTop( targetRect, balloonRect ),
				left: targetRect.right - balloonRect.width + sideOffset,
				name: 'arrow_se',
				...( config && { config } )
			} ),

			// ------- South west

			southWestArrowNorthWest: targetRect => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.left - sideOffset,
				name: 'arrow_nw',
				...( config && { config } )
			} ),

			southWestArrowNorthMiddleWest: ( targetRect, balloonRect ) => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.left - ( balloonRect.width * .25 ) - sideOffset,
				name: 'arrow_nmw',
				...( config && { config } )
			} ),

			southWestArrowNorth: ( targetRect, balloonRect ) => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.left - balloonRect.width / 2,
				name: 'arrow_n',
				...( config && { config } )
			} ),

			southWestArrowNorthMiddleEast: ( targetRect, balloonRect ) => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.left - ( balloonRect.width * .75 ) + sideOffset,
				name: 'arrow_nme',
				...( config && { config } )
			} ),

			southWestArrowNorthEast: ( targetRect, balloonRect ) => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.left - balloonRect.width + sideOffset,
				name: 'arrow_ne',
				...( config && { config } )
			} ),

			// ------- South

			southArrowNorthWest: targetRect => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.left + targetRect.width / 2 - sideOffset,
				name: 'arrow_nw',
				...( config && { config } )
			} ),

			southArrowNorthMiddleWest: ( targetRect, balloonRect ) => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.left + targetRect.width / 2 - ( balloonRect.width * 0.25 ) - sideOffset,
				name: 'arrow_nmw',
				...( config && { config } )
			} ),

			southArrowNorth: ( targetRect, balloonRect ) => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.left + targetRect.width / 2 - balloonRect.width / 2,
				name: 'arrow_n',
				...( config && { config } )
			} ),

			southArrowNorthMiddleEast: ( targetRect, balloonRect ) => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.left + targetRect.width / 2 - ( balloonRect.width * 0.75 ) + sideOffset,
				name: 'arrow_nme',
				...( config && { config } )
			} ),

			southArrowNorthEast: ( targetRect, balloonRect ) => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.left + targetRect.width / 2 - balloonRect.width + sideOffset,
				name: 'arrow_ne',
				...( config && { config } )
			} ),

			// ------- South east

			southEastArrowNorthWest: targetRect => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.right - sideOffset,
				name: 'arrow_nw',
				...( config && { config } )
			} ),

			southEastArrowNorthMiddleWest: ( targetRect, balloonRect ) => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.right - ( balloonRect.width * .25 ) - sideOffset,
				name: 'arrow_nmw',
				...( config && { config } )
			} ),

			southEastArrowNorth: ( targetRect, balloonRect ) => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.right - balloonRect.width / 2,
				name: 'arrow_n',
				...( config && { config } )
			} ),

			southEastArrowNorthMiddleEast: ( targetRect, balloonRect ) => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.right - ( balloonRect.width * .75 ) + sideOffset,
				name: 'arrow_nme',
				...( config && { config } )
			} ),

			southEastArrowNorthEast: ( targetRect, balloonRect ) => ( {
				top: getSouthTop( targetRect ),
				left: targetRect.right - balloonRect.width + sideOffset,
				name: 'arrow_ne',
				...( config && { config } )
			} ),

			// ------- West

			westArrowEast: ( targetRect, balloonRect ) => ( {
				top: targetRect.top + targetRect.height / 2 - balloonRect.height / 2,
				left: targetRect.left - balloonRect.width - heightOffset,
				name: 'arrow_e',
				...( config && { config } )
			} ),

			// ------- East

			eastArrowWest: ( targetRect, balloonRect ) => ( {
				top: targetRect.top + targetRect.height / 2 - balloonRect.height / 2,
				left: targetRect.right + heightOffset,
				name: 'arrow_w',
				...( config && { config } )
			} ),

			// ------- Sticky

			viewportStickyNorth: ( targetRect, balloonRect, viewportRect ) => {
				// Get the intersection of the viewport and the document body.
				const boundaryRect = new Rect( global.document.body ).getIntersection( viewportRect.getVisible()! );

				if ( !boundaryRect ) {
					return null;
				}

				// Get the visible intersection of the boundary and the document body.
				const visibleBoundaryRect = boundaryRect.getVisible()!;

				// Check if the target is in the boundary.
				if ( !targetRect.getIntersection( visibleBoundaryRect ) ) {
					return null;
				}

				// Checks if there is enough space to put the balloon on the top or bottom of the target.
				// If not, makes the balloon sticky.
				if ( !(
					visibleBoundaryRect.top - targetRect.top - stickyVerticalOffset < balloonRect.height &&
					visibleBoundaryRect.bottom - targetRect.bottom < balloonRect.height
				) ) {
					return null;
				}

				return {
					top: visibleBoundaryRect.top + stickyVerticalOffset,
					left: targetRect.left + targetRect.width / 2 - balloonRect.width / 2,
					name: 'arrowless',
					config: {
						withArrow: false,
						...config
					}
				};
			}
		};

		/**
		 * Returns the top coordinate for positions starting with `north*`.
		 *
		 * @param targetRect A rect of the target.
		 * @param balloonRect A rect of the balloon.
		 */
		function getNorthTop( targetRect: Rect, balloonRect: Rect ) {
			return targetRect.top - balloonRect.height - heightOffset;
		}

		/**
		 * Returns the top coordinate for positions starting with `south*`.
		 *
		 * @param targetRect A rect of the target.
		 */
		function getSouthTop( targetRect: Rect ) {
			return targetRect.bottom + heightOffset;
		}
	}

	/**
	 * A side offset of the arrow tip from the edge of the balloon. Controlled by CSS.
	 *
	 * ```
	 *		 ┌───────────────────────┐
	 *		 │                       │
	 *		 │         Balloon       │
	 *		 │         Content       │
	 *		 │                       │
	 *		 └──+    +───────────────┘
	 *		 |   \  /
	 *		 |    \/
	 *		>┼─────┼< ─────────────────────── side offset
	 *
	 * ```
	 *
	 * @default 25
	 */
	public static arrowSideOffset = 25;

	/**
	 * A height offset of the arrow from the edge of the balloon. Controlled by CSS.
	 *
	 * ```
	 *		 ┌───────────────────────┐
	 *		 │                       │
	 *		 │         Balloon       │
	 *		 │         Content       │      ╱-- arrow height offset
	 *		 │                       │      V
	 *		 └──+    +───────────────┘ --- ─┼───────
	 *		     \  /                       │
	 *		      \/                        │
	 *		────────────────────────────────┼───────
	 *		                                ^
	 *
	 *
	 *		>┼────┼<  arrow height offset
	 *		 │    │
	 *		 │    ┌────────────────────────┐
	 *		 │    │                        │
	 *		 │   ╱                         │
	 *		 │ ╱            Balloon        │
	 *		 │ ╲            Content        │
	 *		 │   ╲                         │
	 *		 │    │                        │
	 *		 │    └────────────────────────┘
	 * ```
	 *
	 * @default 10
	*/
	public static arrowHeightOffset = 10;

	/**
	 * A vertical offset of the balloon panel from the edge of the viewport if sticky.
	 * It helps in accessing toolbar buttons underneath the balloon panel.
	 *
	 * ```
	 *		  ┌───────────────────────────────────────────────────┐
	 *		  │                      Target                       │
	 *		  │                                                   │
	 *		  │                            /── vertical offset    │
	 *		┌─────────────────────────────V─────────────────────────┐
	 *		│ Toolbar            ┌─────────────┐                    │
	 *		├────────────────────│   Balloon   │────────────────────┤
	 *		│ │                  └─────────────┘                  │ │
	 *		│ │                                                   │ │
	 *		│ │                                                   │ │
	 *		│ │                                                   │ │
	 *		│ └───────────────────────────────────────────────────┘ │
	 *		│                        Viewport                       │
	 *		└───────────────────────────────────────────────────────┘
	 * ```
	 *
	 * @default 20
	 */
	public static stickyVerticalOffset = 20;

	/**
	 * Function used to calculate the optimal position for the balloon.
	 */
	private static _getOptimalPosition = getOptimalPosition;

	/**
	 * A default set of positioning functions used by the balloon panel view
	 * when attaching using the {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView#attachTo} method.
	 *
	 * The available positioning functions are as follows:
	 *
	 * **North west**
	 *
	 * * `northWestArrowSouthWest`
	 *
	 * ```
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 *		 V
	 *		 [ Target ]
	 * ```
	 *
	 * * `northWestArrowSouthMiddleWest`
	 *
	 * ```
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 *		    V
	 *		    [ Target ]
	 * ```
	 *
	 * * `northWestArrowSouth`
	 *
	 * ```
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 *		         V
	 *		         [ Target ]
	 * ```
	 *
	 * * `northWestArrowSouthMiddleEast`
	 *
	 * ```
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 *		             V
	 *		             [ Target ]
	 * ```
	 *
	 * * `northWestArrowSouthEast`
	 *
	 * ```
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 *		                 V
	 *		                 [ Target ]
	 * ```
	 *
	 * **North**
	 *
	 * * `northArrowSouthWest`
	 *
	 * ```
	 *		    +-----------------+
	 *		    |     Balloon     |
	 *		    +-----------------+
	 *		     V
	 *		[ Target ]
	 * ```
	 *
	 * * `northArrowSouthMiddleWest`
	 *
	 * ```
	 *		 +-----------------+
	 *		 |     Balloon     |
	 *		 +-----------------+
	 *		     V
	 *		[ Target ]
	 * ```
	 * * `northArrowSouth`
	 *
	 * ```
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 *		         V
	 *		    [ Target ]
	 * ```
	 *
	 * * `northArrowSouthMiddleEast`
	 *
	 * ```
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 *		             V
	 *		        [ Target ]
	 * ```
	 *
	 * * `northArrowSouthEast`
	 *
	 * ```
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 *		                V
	 *		           [ Target ]
	 * ```
	 *
	 * **North east**
	 *
	 * * `northEastArrowSouthWest`
	 *
	 * ```
	 *		        +-----------------+
	 *		        |     Balloon     |
	 *		        +-----------------+
	 *		         V
	 *		[ Target ]
	 * ```
	 *
	 * * `northEastArrowSouthMiddleWest`
	 *
	 * ```
	 *		     +-----------------+
	 *		     |     Balloon     |
	 *		     +-----------------+
	 *		         V
	 *		[ Target ]
	 * ```
	 *
	 * * `northEastArrowSouth`
	 *
	 * ```
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 *		         V
	 *		[ Target ]
	 * ```
	 *
	 * * `northEastArrowSouthMiddleEast`
	 *
	 * ```
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 *		             V
	 *		    [ Target ]
	 * ```
	 *
	 * * `northEastArrowSouthEast`
	 *
	 * ```
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 *		                 V
	 *		        [ Target ]
	 * ```
	 *
	 * **South**
	 *
	 * * `southArrowNorthWest`
	 *
	 * ```
	 *		[ Target ]
	 *		     ^
	 *		    +-----------------+
	 *		    |     Balloon     |
	 *		    +-----------------+
	 * ```
	 *
	 * * `southArrowNorthMiddleWest`
	 *
	 * ```
	 *		   [ Target ]
	 *		        ^
	 *		    +-----------------+
	 *		    |     Balloon     |
	 *		    +-----------------+
	 * ```
	 *
	 * * `southArrowNorth`
	 *
	 * ```
	 *		    [ Target ]
	 *		         ^
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 * ```
	 *
	 * * `southArrowNorthMiddleEast`
	 *
	 * ```
	 *		            [ Target ]
	 *		                 ^
	 *		   +-----------------+
	 *		   |     Balloon     |
	 *		   +-----------------+
	 * ```
	 *
	 * * `southArrowNorthEast`
	 *
	 * ```
	 *		            [ Target ]
	 *		                 ^
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 * ```
	 *
	 * **South west**
	 *
	 * * `southWestArrowNorthWest`
	 *
	 *
	 * ```
	 *		 [ Target ]
	 *		 ^
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 * ```
	 *
	 * * `southWestArrowNorthMiddleWest`
	 *
	 * ```
	 *		     [ Target ]
	 *		     ^
	 *		 +-----------------+
	 *		 |     Balloon     |
	 *		 +-----------------+
	 * ```
	 *
	 * * `southWestArrowNorth`
	 *
	 * ```
	 *		         [ Target ]
	 *		         ^
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 * ```
	 *
	 * * `southWestArrowNorthMiddleEast`
	 *
	 * ```
	 *		              [ Target ]
	 *		              ^
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 * ```
	 *
	 * * `southWestArrowNorthEast`
	 *
	 * ```
	 *		                 [ Target ]
	 *		                 ^
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 * ```
	 *
	 * **South east**
	 *
	 * * `southEastArrowNorthWest`
	 *
	 * ```
	 *		[ Target ]
	 *		         ^
	 *		        +-----------------+
	 *		        |     Balloon     |
	 *		        +-----------------+
	 * ```
	 *
	 * * `southEastArrowNorthMiddleWest`
	 *
	 * ```
	 *		   [ Target ]
	 *		            ^
	 *		        +-----------------+
	 *		        |     Balloon     |
	 *		        +-----------------+
	 * ```
	 *
	 * * `southEastArrowNorth`
	 *
	 * ```
	 *		[ Target ]
	 *		         ^
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 * ```
	 *
	 * * `southEastArrowNorthMiddleEast`
	 *
	 * ```
	 *		     [ Target ]
	 *		              ^
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 * ```
	 *
	 * * `southEastArrowNorthEast`
	 *
	 * ```
	 *		        [ Target ]
	 *		                 ^
	 *		+-----------------+
	 *		|     Balloon     |
	 *		+-----------------+
	 * ```
	 *
	 * **West**
	 *
	 * * `westArrowEast`
	 *
	 * ```
	 *		+-----------------+
	 *		|     Balloon     |>[ Target ]
	 *		+-----------------+
	 * ```
	 *
	 * **East**
	 *
	 * * `eastArrowWest`
	 *
	 * ```
	 *		           +-----------------+
	 *		[ Target ]<|     Balloon     |
	 *		           +-----------------+
	 * ```
	 *
	 * **Sticky**
	 *
	 * * `viewportStickyNorth`
	 *
	 * ```
	 *		    +---------------------------+
	 *		    |        [ Target ]         |
	 *		    |                           |
	 *		+-----------------------------------+
	 *		|   |    +-----------------+    |   |
	 *		|   |    |     Balloon     |    |   |
	 *		|   |    +-----------------+    |   |
	 *		|   |                           |   |
	 *		|   |                           |   |
	 *		|   |                           |   |
	 *		|   |                           |   |
	 *		|   +---------------------------+   |
	 *		|             Viewport              |
	 *		+-----------------------------------+
	 * ```
	 *
	 * See {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView#attachTo}.
	 *
	 * Positioning functions must be compatible with {@link module:utils/dom/position~DomPoint}.
	 *
	 * Default positioning functions with customized offsets can be generated using
	 * {@link module:ui/panel/balloon/balloonpanelview~BalloonPanelView.generatePositions}.
	 *
	 * The name that the position function returns will be reflected in the balloon panel's class that
	 * controls the placement of the "arrow". See {@link #position} to learn more.
	 */
	public static defaultPositions = /* #__PURE__ */ BalloonPanelView.generatePositions();
}

/**
 * Returns the DOM element for given object or null, if there is none,
 * e.g. when the passed object is a Rect instance or so.
 */
function getDomElement( object: any ): HTMLElement | null {
	if ( isElement( object ) ) {
		return object;
	}

	if ( isRange( object ) ) {
		return object.commonAncestorContainer as any;
	}

	if ( typeof object == 'function' ) {
		return getDomElement( object() );
	}

	return null;
}
