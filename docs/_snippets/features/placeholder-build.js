/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/* globals window */

import { CKBox, CKBoxImageEdit } from '@ckeditor/ckeditor5-ckbox';
import { PictureEditing, ImageInsert, ImageResize, AutoImage } from '@ckeditor/ckeditor5-image';
import ClassicEditor from '../build-classic.js';

ClassicEditor.builtinPlugins.push( CKBox, CKBoxImageEdit );
ClassicEditor.builtinPlugins.push( PictureEditing, ImageInsert, ImageResize, AutoImage );

window.ClassicEditor = ClassicEditor;
