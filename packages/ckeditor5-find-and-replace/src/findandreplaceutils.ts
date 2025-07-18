/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module find-and-replace/findandreplaceutils
 */

import type { ModelElement, ModelItem, Marker, Model, ModelRange } from 'ckeditor5/src/engine.js';
import { Plugin } from 'ckeditor5/src/core.js';
import { Collection, uid } from 'ckeditor5/src/utils.js';
import { escapeRegExp } from 'es-toolkit/compat';
import type { FindResultType } from './findandreplace.js';

/**
 * A set of helpers related to find and replace.
 */
export class FindAndReplaceUtils extends Plugin {
	/**
	 * @inheritDoc
	 */
	public static get pluginName() {
		return 'FindAndReplaceUtils' as const;
	}

	/**
	 * @inheritDoc
	 */
	public static override get isOfficialPlugin(): true {
		return true;
	}

	/**
	 * Executes findCallback and updates search results list.
	 *
	 * @param range The model range to scan for matches.
	 * @param model The model.
	 * @param findCallback The callback that should return `true` if provided text matches the search term.
	 * @param startResults An optional collection of find matches that the function should
	 * start with. This would be a collection returned by a previous `updateFindResultFromRange()` call.
	 * @returns A collection of objects describing find match.
	 *
	 * An example structure:
	 *
	 * ```js
	 * {
	 *	id: resultId,
	 *	label: foundItem.label,
	 *	marker
	 *	}
	 * ```
	 */
	public updateFindResultFromRange(
		range: ModelRange,
		model: Model,
		findCallback: ( { item, text }: { item: ModelItem; text: string } ) => Array<FindResultType> | { results: Array<FindResultType> },
		startResults: Collection<FindResultType> | null
	): Collection<FindResultType> {
		const results = startResults || new Collection();

		const checkIfResultAlreadyOnList = ( marker: Marker ) => results.find(
			markerItem => {
				const { marker: resultsMarker } = markerItem;

				const resultRange = resultsMarker!.getRange();
				const markerRange = marker.getRange();

				return resultRange.isEqual( markerRange );
			}
		);

		model.change( writer => {
			[ ...range ].forEach( ( { type, item } ) => {
				if ( type === 'elementStart' ) {
					if ( model.schema.checkChild( item, '$text' ) ) {
						let foundItems = findCallback( {
							item,
							text: this.rangeToText( model.createRangeIn( item as ModelElement ) )
						} );

						if ( !foundItems ) {
							return;
						}

						if ( 'results' in foundItems ) {
							foundItems = foundItems.results;
						}

						foundItems.forEach( foundItem => {
							const resultId = `findResult:${ uid() }`;
							const marker = writer.addMarker( resultId, {
								usingOperation: false,
								affectsData: false,
								range: writer.createRange(
									writer.createPositionAt( item, foundItem.start ),
									writer.createPositionAt( item, foundItem.end )
								)
							} );

							const index = findInsertIndex( results, marker );

							if ( !checkIfResultAlreadyOnList( marker ) ) {
								results.add(
									{
										id: resultId,
										label: foundItem.label,
										marker
									},
									index
								);
							}
						} );
					}
				}
			} );
		} );

		return results;
	}

	/**
	 * Returns text representation of a range. The returned text length should be the same as range length.
	 * In order to achieve this, this function will replace inline elements (text-line) as new line character ("\n").
	 *
	 * @param range The model range.
	 * @returns The text content of the provided range.
	 */
	public rangeToText( range: ModelRange ): string {
		return Array.from( range.getItems( { shallow: true } ) ).reduce( ( rangeText, node ) => {
			// Trim text to a last occurrence of an inline element and update range start.
			if ( !( node.is( '$text' ) || node.is( '$textProxy' ) ) ) {
				// Editor has only one inline element defined in schema: `<softBreak>` which is treated as new line character in blocks.
				// Special handling might be needed for other inline elements (inline widgets).
				return `${ rangeText }\n`;
			}

			return rangeText + node.data;
		}, '' );
	}

	/**
	 * Creates a text matching callback for a specified search term and matching options.
	 *
	 * @param searchTerm The search term.
	 * @param options Matching options.
	 * 	- options.matchCase=false If set to `true` letter casing will be ignored.
	 * 	- options.wholeWords=false If set to `true` only whole words that match `callbackOrText` will be matched.
	 */
	public findByTextCallback(
		searchTerm: string,
		options: { matchCase?: boolean; wholeWords?: boolean }
	): ( { item, text }: { item: ModelItem; text: string } ) => Array<FindResultType> {
		let flags = 'gu';

		if ( !options.matchCase ) {
			flags += 'i';
		}

		let regExpQuery = `(${ escapeRegExp( searchTerm ) })`;

		if ( options.wholeWords ) {
			const nonLetterGroup = '[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]';

			if ( !new RegExp( '^' + nonLetterGroup ).test( searchTerm ) ) {
				regExpQuery = `(^|${ nonLetterGroup }|_)${ regExpQuery }`;
			}

			if ( !new RegExp( nonLetterGroup + '$' ).test( searchTerm ) ) {
				regExpQuery = `${ regExpQuery }(?=_|${ nonLetterGroup }|$)`;
			}
		}

		const regExp = new RegExp( regExpQuery, flags );

		function findCallback( { text }: { text: string } ) {
			const matches = [ ...text.matchAll( regExp ) ];

			return matches.map( regexpMatchToFindResult );
		}

		return findCallback;
	}
}

// Finds the appropriate index in the resultsList Collection.
function findInsertIndex( resultsList: Collection<any>, markerToInsert: Marker ) {
	const result = resultsList.find( ( { marker } ) => {
		return markerToInsert.getStart().isBefore( marker.getStart() );
	} );

	return result ? resultsList.getIndex( result ) : resultsList.length;
}

/**
 *  Maps RegExp match result to find result.
 */
function regexpMatchToFindResult( matchResult: RegExpMatchArray ): FindResultType {
	const lastGroupIndex = matchResult.length - 1;

	let startOffset = matchResult.index!;

	// Searches with match all flag have an extra matching group with empty string or white space matched before the word.
	// If the search term starts with the space already, there is no extra group even with match all flag on.
	if ( matchResult.length === 3 ) {
		startOffset += matchResult[ 1 ].length;
	}

	return {
		label: matchResult[ lastGroupIndex ],
		start: startOffset,
		end: startOffset + matchResult[ lastGroupIndex ].length
	};
}
