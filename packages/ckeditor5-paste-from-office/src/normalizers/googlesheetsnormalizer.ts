/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module paste-from-office/normalizers/googlesheetsnormalizer
 */

import { ViewUpcastWriter, type ViewDocument } from 'ckeditor5/src/engine.js';

import { removeXmlns } from '../filters/removexmlns.js';
import { removeGoogleSheetsTag } from '../filters/removegooglesheetstag.js';
import { removeInvalidTableWidth } from '../filters/removeinvalidtablewidth.js';
import { removeStyleBlock } from '../filters/removestyleblock.js';
import type { PasteFromOfficeNormalizer, PasteFromOfficeNormalizerData } from '../normalizer.js';

const googleSheetsMatch = /<google-sheets-html-origin/i;

/**
 * Normalizer for the content pasted from Google Sheets.
 *
 * @internal
 */
export class GoogleSheetsNormalizer implements PasteFromOfficeNormalizer {
	public readonly document: ViewDocument;

	/**
	 * Creates a new `GoogleSheetsNormalizer` instance.
	 *
	 * @param document View document.
	 */
	constructor( document: ViewDocument ) {
		this.document = document;
	}

	/**
	 * @inheritDoc
	 */
	public isActive( htmlString: string ): boolean {
		return googleSheetsMatch.test( htmlString );
	}

	/**
	 * @inheritDoc
	 */
	public execute( data: PasteFromOfficeNormalizerData ): void {
		const writer = new ViewUpcastWriter( this.document );
		const { body: documentFragment } = data._parsedData;

		removeGoogleSheetsTag( documentFragment, writer );
		removeXmlns( documentFragment, writer );
		removeInvalidTableWidth( documentFragment, writer );
		removeStyleBlock( documentFragment, writer );

		data.content = documentFragment;
	}
}
