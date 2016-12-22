/* jshint browser: true */
/* global console */

import ClassicEditor from 'ckeditor5-editor-classic/src/classic';
import Enter from 'ckeditor5-enter/src/enter';
import Typing from 'ckeditor5-typing/src/typing';
import Paragraph from 'ckeditor5-paragraph/src/paragraph';
import Undo from 'ckeditor5-undo/src/undo';
import Bold from 'ckeditor5-basic-styles/src/bold';
import Italic from 'ckeditor5-basic-styles/src/italic';

ClassicEditor.create( document.querySelector( '#editor' ), {
	plugins: [ Enter, Typing, Paragraph, Undo, Bold, Italic ],
	toolbar: [ 'bold', 'italic', 'undo', 'redo' ]
} ).then( editor => {
	window.editor = editor;
} ).catch( err => {
	console.error( err.stack );
} );

// import getCommonAncestor from 'ckeditor5-utils/src/dom/getcommonancestor';
// console.log( getCommonAncestor );

// import ClassicEditor from 'ckeditor5-editor-classic/src/classic';
// console.log( ClassicEditor );
