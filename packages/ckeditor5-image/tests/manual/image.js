/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { ClassicEditor } from '@ckeditor/ckeditor5-editor-classic/src/classiceditor.js';
import { Enter } from '@ckeditor/ckeditor5-enter/src/enter.js';
import { Typing } from '@ckeditor/ckeditor5-typing/src/typing.js';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph/src/paragraph.js';
import { Heading } from '@ckeditor/ckeditor5-heading/src/heading.js';
import { Image } from '../../src/image.js';
import { Undo } from '@ckeditor/ckeditor5-undo/src/undo.js';
import { Clipboard } from '@ckeditor/ckeditor5-clipboard/src/clipboard.js';

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ Enter, Typing, Paragraph, Heading, Image, Undo, Clipboard ],
		toolbar: [ 'heading', '|', 'undo', 'redo' ]
	} )
	.then( editor => {
		window.editor = editor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );
