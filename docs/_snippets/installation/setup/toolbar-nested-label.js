/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/* globals ClassicEditor, console, window, document */

import { CS_CONFIG } from '@ckeditor/ckeditor5-cloud-services/tests/_utils/cloud-services-config.js';
import { TOKEN_URL } from '@ckeditor/ckeditor5-ckbox/tests/_utils/ckbox-config.js';

ClassicEditor
	.create( document.querySelector( '#toolbar-nested-label' ), {
		toolbar: [
			'undo', 'redo', '|',
			{
				label: 'Fonts',
				icon: 'text',
				withText: true,
				items: [ 'fontSize', 'fontFamily', 'fontColor', 'fontBackgroundColor' ]
			},
			'|',
			{
				label: 'Basic styles',
				withText: true,
				items: [ 'bold', 'italic', 'strikethrough', 'superscript', 'subscript' ]
			},
			'|',
			{
				label: 'Inserting',
				withText: true,
				items: [ 'insertImage', 'insertTable' ]
			}
		],
		image: {
			toolbar: [ 'imageStyle:inline', 'imageStyle:block', 'imageStyle:wrapText',
				'|', 'toggleImageCaption', 'imageTextAlternative', '|', 'ckboxImageEdit' ]
		},
		cloudServices: CS_CONFIG,
		ui: {
			viewportOffset: {
				top: window.getViewportTopOffsetConfig()
			}
		},
		ckbox: {
			tokenUrl: TOKEN_URL,
			forceDemoLabel: true,
			allowExternalImagesEditing: [ /^data:/, 'origin', /ckbox/ ]
		},
		licenseKey: 'GPL'
	} )
	.then( editor => {
		window.editor = editor;
	} )
	.catch( err => {
		console.error( err.stack );
	} );
