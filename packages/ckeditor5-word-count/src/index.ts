/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module word-count
 */

export { WordCount, type WordCountUpdateEvent } from './wordcount.js';
export type { WordCountConfig } from './wordcountconfig.js';

export { modelElementToPlainText as _modelElementToPlainText } from './utils.js';

import './augmentation.js';
