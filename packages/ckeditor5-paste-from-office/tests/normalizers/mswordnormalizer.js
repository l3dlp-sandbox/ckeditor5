/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { PasteFromOfficeMSWordNormalizer } from '../../src/normalizers/mswordnormalizer.js';

// `execute()` of the msword normalizer is tested with autogenerated normalization tests.
describe( 'PasteFromOfficeMSWordNormalizer', () => {
	const normalizer = new PasteFromOfficeMSWordNormalizer();

	describe( 'isActive()', () => {
		it( 'should return true for microsoft word content', () => {
			expect( normalizer.isActive( '<meta name=Generator content="Microsoft Word 15"><p>Foo bar</p>' ) ).to.be.true;
		} );

		it( 'should return true for microsoft word content - safari', () => {
			expect( normalizer.isActive( '<html xmlns:o="urn:schemas-microsoft-com:office:office"' +
				'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
				'xmlns:m="http://schemas.microsoft.com/office/2004/12/omml" ' +
				'xmlns="http://www.w3.org/TR/REC-html40">' ) ).to.be.true;
		} );

		it( 'should return false for google docs content', () => {
			expect( normalizer.isActive( '<p id="docs-internal-guid-12345678-1234-1234-1234-1234567890ab"></p>' ) ).to.be.false;
		} );

		it( 'should return false for content fromother sources', () => {
			expect( normalizer.isActive( '<p>foo</p>' ) ).to.be.false;
		} );
	} );
} );
