/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module engine/view/observer/arrowkeysobserver
 */

import { Observer } from './observer.js';
import { BubblingEventInfo } from './bubblingeventinfo.js';
import { type EditingView } from '../view.js';
import type { ViewDocumentKeyEventData, ViewDocumentKeyDownEvent } from './keyobserver.js';
import type { BubblingEvent } from './bubblingemittermixin.js';

import { isArrowKeyCode } from '@ckeditor/ckeditor5-utils';

/**
 * Arrow keys observer introduces the {@link module:engine/view/document~ViewDocument#event:arrowKey `Document#arrowKey`} event.
 *
 * Note that this observer is attached by the {@link module:engine/view/view~EditingView} and is available by default.
 */
export class ArrowKeysObserver extends Observer {
	/**
	 * @inheritDoc
	 */
	constructor( view: EditingView ) {
		super( view );

		this.document.on<ViewDocumentKeyDownEvent>( 'keydown', ( event, data ) => {
			if ( this.isEnabled && isArrowKeyCode( data.keyCode ) ) {
				const eventInfo = new BubblingEventInfo( this.document, 'arrowKey', this.document.selection.getFirstRange()! );

				this.document.fire<ViewDocumentArrowKeyEvent>( eventInfo, data );

				if ( eventInfo.stop.called ) {
					event.stop();
				}
			}
		} );
	}

	/**
	 * @inheritDoc
	 */
	public override observe(): void {}

	/**
	 * @inheritDoc
	 */
	public override stopObserving(): void {}
}

/**
 * Event fired when the user presses an arrow keys.
 *
 * Introduced by {@link module:engine/view/observer/arrowkeysobserver~ArrowKeysObserver}.
 *
 * Note that because {@link module:engine/view/observer/arrowkeysobserver~ArrowKeysObserver} is attached by the
 * {@link module:engine/view/view~EditingView} this event is available by default.
 *
 * @eventName module:engine/view/document~ViewDocument#arrowKey
 * @param data
 */

export type ViewDocumentArrowKeyEvent = BubblingEvent<{
	name: 'arrowKey';
	args: [ data: ViewDocumentKeyEventData ];
}>;
