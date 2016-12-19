/* jshint browser: true */
/* global console */

import ClassicEditor from 'ckeditor5-editor-classic/src/classic';
import Enter from 'ckeditor5-enter/src/enter.js';
import Typing from 'ckeditor5-typing/src/typing.js';
import Paragraph from 'ckeditor5-paragraph/src/paragraph.js';
import Undo from 'ckeditor5-undo/src/undo.js';
import Bold from 'ckeditor5-basic-styles/src/bold.js';
import Italic from 'ckeditor5-basic-styles/src/italic.js';

ClassicEditor.create( document.querySelector( '#editor' ), {
	plugins: [ Enter, Typing, Paragraph, Undo, Bold, Italic ],
	toolbar: [ 'bold', 'italic', 'undo', 'redo' ]
} ).then( editor => {
	window.editor = editor;
} ).catch( err => {
	console.error( err.stack );
} );
