/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module table/commands/setheaderrowcommand
 */

import { Command } from 'ckeditor5/src/core.js';
import type { ModelElement } from 'ckeditor5/src/engine.js';
import { type TableUtils } from '../tableutils.js';

import { updateNumericAttribute } from '../utils/common.js';
import { getVerticallyOverlappingCells, splitHorizontally } from '../utils/structure.js';

/**
 * The header row command.
 *
 * The command is registered by {@link module:table/tableediting~TableEditing} as the `'setTableColumnHeader'` editor command.
 *
 * You can make the row containing the selected cell a [header](https://www.w3.org/TR/html50/tabular-data.html#the-th-element) by executing:
 *
 * ```ts
 * editor.execute( 'setTableRowHeader' );
 * ```
 *
 * **Note:** All preceding rows will also become headers. If the current row is already a header, executing this command
 * will make it a regular row back again (including the following rows).
 */
export class SetHeaderRowCommand extends Command {
	/**
	 * Flag indicating whether the command is active. The command is active when the
	 * {@link module:engine/model/selection~ModelSelection} is in a header row.
	 *
	 * @observable
	 */
	public declare value: boolean;

	/**
	 * @inheritDoc
	 */
	public override refresh(): void {
		const tableUtils: TableUtils = this.editor.plugins.get( 'TableUtils' );
		const model = this.editor.model;

		const selectedCells = tableUtils.getSelectionAffectedTableCells( model.document.selection );

		if ( selectedCells.length === 0 ) {
			this.isEnabled = false;
			this.value = false;

			return;
		}

		const table = selectedCells[ 0 ].findAncestor( 'table' )!;

		this.isEnabled = model.schema.checkAttribute( table, 'headingRows' );
		this.value = selectedCells.every( cell => this._isInHeading( cell, cell.parent!.parent as ModelElement ) );
	}

	/**
	 * Executes the command.
	 *
	 * When the selection is in a non-header row, the command will set the `headingRows` table attribute to cover that row.
	 *
	 * When the selection is already in a header row, it will set `headingRows` so the heading section will end before that row.
	 *
	 * @fires execute
	 * @param options.forceValue If set, the command will set (`true`) or unset (`false`) the header rows according to
	 * the `forceValue` parameter instead of the current model state.
	 */
	public override execute( options: { forceValue?: boolean } = {} ): void {
		if ( options.forceValue === this.value ) {
			return;
		}

		const tableUtils: TableUtils = this.editor.plugins.get( 'TableUtils' );
		const model = this.editor.model;

		const selectedCells = tableUtils.getSelectionAffectedTableCells( model.document.selection );
		const table = selectedCells[ 0 ].findAncestor( 'table' )!;

		const { first, last } = tableUtils.getRowIndexes( selectedCells );
		const headingRowsToSet = this.value ? first : last + 1;
		const currentHeadingRows = table.getAttribute( 'headingRows' ) as number || 0;

		model.change( writer => {
			if ( headingRowsToSet ) {
				// Changing heading rows requires to check if any of a heading cell is overlapping vertically the table head.
				// Any table cell that has a rowspan attribute > 1 will not exceed the table head so we need to fix it in rows below.
				const startRow = headingRowsToSet > currentHeadingRows ? currentHeadingRows : 0;
				const overlappingCells = getVerticallyOverlappingCells( table, headingRowsToSet, startRow );

				for ( const { cell } of overlappingCells ) {
					splitHorizontally( cell, headingRowsToSet, writer );
				}
			}

			updateNumericAttribute( 'headingRows', headingRowsToSet, table, writer, 0 );
		} );
	}

	/**
	 * Checks if a table cell is in the heading section.
	 */
	private _isInHeading( tableCell: ModelElement, table: ModelElement ): boolean {
		const headingRows = parseInt( table.getAttribute( 'headingRows' ) as string || '0' );

		return !!headingRows && ( tableCell.parent as ModelElement ).index! < headingRows;
	}
}
