/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { testUtils } from '@ckeditor/ckeditor5-core/tests/_utils/utils.js';
import { createEditabilityChecker } from '../../src/ckboximageedit/utils.js';
import { ModelElement } from '@ckeditor/ckeditor5-engine';

describe( 'image edit utils', () => {
	testUtils.createSinonSandbox();

	describe( 'createEditabilityChecker()', () => {
		it( 'should return false for non-image elements', () => {
			const checker = createEditabilityChecker( undefined );

			expect( checker( new ModelElement( 'paragraph' ) ) ).to.be.false;
			expect( checker( new ModelElement( 'codeBlock' ) ) ).to.be.false;
		} );

		it( 'should return true for images in ckbox', () => {
			const checker = createEditabilityChecker( undefined );

			expect( checker( new ModelElement( 'imageInline', { ckboxImageId: 'abc' } ) ) ).to.be.true;
			expect( checker( new ModelElement( 'imageBlock', { ckboxImageId: 'xyz' } ) ) ).to.be.true;
		} );

		it( 'should return false for external images by default', () => {
			const checker = createEditabilityChecker( undefined );

			expect( checker( new ModelElement( 'imageInline', { src: 'https://ckeditor.com/abc' } ) ) ).to.be.false;
			expect( checker( new ModelElement( 'imageBlock', { src: 'https://ckeditor.com/xyz' } ) ) ).to.be.false;
		} );

		it( 'should check if external images match RegExp', () => {
			const checker = createEditabilityChecker( /^ckeditor/ );

			expect( checker( new ModelElement( 'imageInline', { src: 'https://ckeditor.com/abc' } ) ) ).to.be.true;
			expect( checker( new ModelElement( 'imageBlock', { src: 'https://ckeditor.com/xyz' } ) ) ).to.be.true;
			expect( checker( new ModelElement( 'imageInline', { src: 'https://example.com/abc' } ) ) ).to.be.false;
			expect( checker( new ModelElement( 'imageBlock', { src: 'https://cksource.com/xyz' } ) ) ).to.be.false;
		} );

		it( 'should check if external images match one of RegExps', () => {
			const checker = createEditabilityChecker( [ /ckeditor/, /^cksource/ ] );

			expect( checker( new ModelElement( 'imageInline', { src: 'https://ckeditor.com/abc' } ) ) ).to.be.true;
			expect( checker( new ModelElement( 'imageBlock', { src: 'https://ckeditor.com/xyz' } ) ) ).to.be.true;
			expect( checker( new ModelElement( 'imageInline', { src: 'https://example.com/abc' } ) ) ).to.be.false;
			expect( checker( new ModelElement( 'imageBlock', { src: 'https://cksource.com/xyz' } ) ) ).to.be.true;
		} );

		it( 'should check if external images match current origin', () => {
			const origin = window.location.origin;

			const checker = createEditabilityChecker( 'origin' );

			expect( checker( new ModelElement( 'imageInline', { src: `${ origin }/abc` } ) ) ).to.be.true;
			expect( checker( new ModelElement( 'imageBlock', { src: `${ origin }/xyz` } ) ) ).to.be.true;
			expect( checker( new ModelElement( 'imageBlock', { src: '/path/xyz' } ) ) ).to.be.true;
			expect( checker( new ModelElement( 'imageBlock', { src: 'abc' } ) ) ).to.be.true;
			expect( checker( new ModelElement( 'imageBlock', { src: '../path/abc' } ) ) ).to.be.true;
			expect( checker( new ModelElement( 'imageInline', { src: 'https://example.com/abc' } ) ) ).to.be.false;
			expect( checker( new ModelElement( 'imageBlock', { src: 'https://another-example.com/xyz' } ) ) ).to.be.false;
		} );

		it( 'should use the function to check external images', () => {
			const callback = sinon.stub();

			callback.withArgs( 'https://ckeditor.com/abc' ).returns( true );
			callback.returns( false );

			const checker = createEditabilityChecker( callback );

			expect( checker( new ModelElement( 'imageInline', { src: 'https://ckeditor.com/abc' } ) ) ).to.be.true;
			expect( checker( new ModelElement( 'imageInline', { src: 'https://cksource.com/abc' } ) ) ).to.be.false;
		} );

		it( 'should return false if image has no `src` attribute', () => {
			const checker = createEditabilityChecker( () => true );

			expect( checker( new ModelElement( 'imageInline' ) ) ).to.be.false;
			expect( checker( new ModelElement( 'imageBlock' ) ) ).to.be.false;
		} );
	} );
} );
