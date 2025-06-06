/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module core/editor/utils/securesourceelement
 */

import { CKEditorError } from '@ckeditor/ckeditor5-utils';

import type { Editor, EditorDestroyEvent } from '../editor.js';

/**
 * Marks the source element on which the editor was initialized. This prevents other editor instances from using this element.
 *
 * Running multiple editor instances on the same source element causes various issues and it is
 * crucial this helper is called as soon as the source element is known to prevent collisions.
 *
 * @param editor Editor instance.
 * @param sourceElement Element to bind with the editor instance.
 */
export function secureSourceElement( editor: Editor, sourceElement: HTMLElement & { ckeditorInstance?: Editor } ): void {
	if ( sourceElement.ckeditorInstance ) {
		/**
		 * A DOM element used to create the editor (e.g.
		 * {@link module:editor-inline/inlineeditor~InlineEditor.create `InlineEditor.create()`})
		 * has already been used to create another editor instance. Make sure each editor is
		 * created with a unique DOM element.
		 *
		 * @error editor-source-element-already-used
		 * @param {HTMLElement} element DOM element that caused the collision.
		 */
		throw new CKEditorError(
			'editor-source-element-already-used',
			editor
		);
	}

	sourceElement.ckeditorInstance = editor;

	editor.once<EditorDestroyEvent>( 'destroy', () => {
		delete sourceElement.ckeditorInstance;
	} );
}
