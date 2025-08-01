/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import {
	CS_CONFIG,
	TOKEN_URL,
	ClassicEditor,
	getViewportTopOffsetConfig
} from '@snippets/index.js';

ClassicEditor.create( document.querySelector( '#snippet-link-decorators' ), {
	cloudServices: CS_CONFIG,
	toolbar: {
		items: [
			'undo',
			'redo',
			'|',
			'heading',
			'|',
			'bold',
			'italic',
			'|',
			'link',
			'insertImage',
			'insertTable',
			'mediaEmbed',
			'|',
			'bulletedList',
			'numberedList',
			'outdent',
			'indent'
		]
	},
	image: {
		toolbar: [
			'imageStyle:inline',
			'imageStyle:block',
			'imageStyle:wrapText',
			'|',
			'toggleImageCaption',
			'imageTextAlternative',
			'ckboxImageEdit'
		]
	},
	ui: {
		viewportOffset: {
			top: getViewportTopOffsetConfig()
		}
	},
	ckbox: {
		tokenUrl: TOKEN_URL,
		allowExternalImagesEditing: [ /^data:/, 'origin', /ckbox/ ],
		forceDemoLabel: true
	},
	link: {
		addTargetToExternalLinks: true,
		decorators: [
			{
				mode: 'manual',
				label: 'Downloadable',
				attributes: {
					download: 'download'
				}
			}
		]
	}
} ).catch( err => {
	console.error( err.stack );
} );
