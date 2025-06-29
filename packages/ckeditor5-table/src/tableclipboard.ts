/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module table/tableclipboard
 */

import type { EventInfo } from 'ckeditor5/src/utils.js';

import {
	ClipboardPipeline,
	ClipboardMarkersUtils,
	type ClipboardEventData,
	type ViewDocumentCopyEvent,
	type ViewDocumentCutEvent,
	type ViewDocumentClipboardOutputEvent,
	type ClipboardContentInsertionEvent
} from 'ckeditor5/src/clipboard.js';

import { Plugin } from 'ckeditor5/src/core.js';

import type {
	ModelDocumentFragment,
	ModelDocumentSelection,
	ViewDocumentDomEventData,
	ModelElement,
	ModelItem,
	Model,
	ModelInsertContentEvent,
	ModelPosition,
	ModelSelection,
	ModelWriter
} from 'ckeditor5/src/engine.js';

import { TableSelection } from './tableselection.js';
import { TableWalker, type TableSlot } from './tablewalker.js';
import { TableUtils } from './tableutils.js';
import {
	cropTableToDimensions,
	getHorizontallyOverlappingCells,
	getVerticallyOverlappingCells,
	removeEmptyRowsColumns,
	splitHorizontally,
	splitVertically,
	trimTableCellIfNeeded,
	adjustLastRowIndex,
	adjustLastColumnIndex
} from './utils/structure.js';

/**
 * This plugin adds support for copying/cutting/pasting fragments of tables.
 * It is loaded automatically by the {@link module:table/table~Table} plugin.
 */
export class TableClipboard extends Plugin {
	/**
	 * @inheritDoc
	 */
	public static get pluginName() {
		return 'TableClipboard' as const;
	}

	/**
	 * @inheritDoc
	 */
	public static override get isOfficialPlugin(): true {
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public static get requires() {
		return [ ClipboardMarkersUtils, ClipboardPipeline, TableSelection, TableUtils ] as const;
	}

	/**
	 * @inheritDoc
	 */
	public init(): void {
		const editor = this.editor;
		const viewDocument = editor.editing.view.document;

		this.listenTo<ViewDocumentCopyEvent>( viewDocument, 'copy', ( evt, data ) => this._onCopyCut( evt, data ) );
		this.listenTo<ViewDocumentCutEvent>( viewDocument, 'cut', ( evt, data ) => this._onCopyCut( evt, data ) );
		this._listenToContentInsertion();

		this.decorate( '_replaceTableSlotCell' );
	}

	/**
	 * Sets up listening for events from the clipboard pipeline to properly handle
	 * table content merging during paste/drop operations.
	 *
	 * When a user is dragging and dropping a table, we want to insert the entire table into
	 * a table cell instead of merging table contents. For paste and other events,
	 * the normal table merge behavior is applied.
	 */
	private _listenToContentInsertion() {
		const { editor } = this;
		const clipboardPipeline = editor.plugins.get( ClipboardPipeline );
		const tableSelection = editor.plugins.get( TableSelection );

		let isPaste = false;

		clipboardPipeline.on<ClipboardContentInsertionEvent>( 'contentInsertion', ( evt, data ) => {
			isPaste = data.method === 'paste';
		} );

		this.listenTo<ModelInsertContentEvent>(
			editor.model,
			'insertContent',
			( evt, [ content, selectable ] ) => {
				// Handles drag-and-drop of tables, where tables are inserted into selected cells rather than merged.
				// The `isPaste` flag handles scenarios where other features (e.g., Templates) insert tables into specific cells.
				if ( isPaste || tableSelection.getSelectedTableCells() !== null ) {
					this._onInsertContent( evt, content, selectable );
				}
			},
			{ priority: 'high' }
		);

		clipboardPipeline.on<ClipboardContentInsertionEvent>( 'contentInsertion', () => {
			isPaste = false;
		}, { priority: 'lowest' } );
	}

	/**
	 * Copies table content to a clipboard on "copy" & "cut" events.
	 *
	 * @param evt An object containing information about the handled event.
	 * @param data Clipboard event data.
	 */
	private _onCopyCut( evt: EventInfo<'copy' | 'cut'>, data: ViewDocumentDomEventData<ClipboardEvent> & ClipboardEventData ) {
		const view = this.editor.editing.view;
		const tableSelection = this.editor.plugins.get( TableSelection );
		const clipboardMarkersUtils = this.editor.plugins.get( ClipboardMarkersUtils );

		if ( !tableSelection.getSelectedTableCells() ) {
			return;
		}

		if ( evt.name == 'cut' && !this.editor.model.canEditAt( this.editor.model.document.selection ) ) {
			return;
		}

		data.preventDefault();
		evt.stop();

		this.editor.model.enqueueChange( { isUndoable: evt.name === 'cut' }, () => {
			const documentFragment = clipboardMarkersUtils._copySelectedFragmentWithMarkers(
				evt.name,
				this.editor.model.document.selection,
				() => tableSelection.getSelectionAsFragment()!
			);

			view.document.fire<ViewDocumentClipboardOutputEvent>( 'clipboardOutput', {
				dataTransfer: data.dataTransfer,
				content: this.editor.data.toView( documentFragment ),
				method: evt.name
			} );
		} );
	}

	/**
	 * Overrides default {@link module:engine/model/model~Model#insertContent `model.insertContent()`} method to handle pasting table inside
	 * selected table fragment.
	 *
	 * Depending on selected table fragment:
	 * - If a selected table fragment is smaller than paste table it will crop pasted table to match dimensions.
	 * - If dimensions are equal it will replace selected table fragment with a pasted table contents.
	 *
	 * @param content The content to insert.
	 * @param selectable The selection into which the content should be inserted.
	 * If not provided the current model document selection will be used.
	 */
	private _onInsertContent(
		evt: EventInfo,
		content: ModelDocumentFragment | ModelItem,
		selectable: ModelSelection | ModelDocumentSelection | undefined
	) {
		if ( selectable && !selectable.is( 'documentSelection' ) ) {
			return;
		}

		const model = this.editor.model;
		const tableUtils = this.editor.plugins.get( TableUtils );
		const clipboardMarkersUtils = this.editor.plugins.get( ClipboardMarkersUtils );

		// We might need to crop table before inserting so reference might change.
		const pastedTable = this.getTableIfOnlyTableInContent( content, model )!;

		if ( !pastedTable ) {
			return;
		}

		const selectedTableCells = tableUtils.getSelectionAffectedTableCells( model.document.selection );

		if ( !selectedTableCells.length ) {
			removeEmptyRowsColumns( pastedTable, tableUtils );

			return;
		}

		// Override default model.insertContent() handling at this point.
		evt.stop();

		if ( content.is( 'documentFragment' ) ) {
			clipboardMarkersUtils._pasteMarkersIntoTransformedElement(
				content.markers,
				writer => this._replaceSelectedCells( pastedTable, selectedTableCells, writer )
			);
		} else {
			this.editor.model.change( writer => {
				this._replaceSelectedCells( pastedTable, selectedTableCells, writer );
			} );
		}
	}

	/**
	 * Inserts provided `selectedTableCells` into `pastedTable`.
	 */
	private _replaceSelectedCells( pastedTable: ModelElement, selectedTableCells: Array<ModelElement>, writer: ModelWriter ) {
		const tableUtils = this.editor.plugins.get( TableUtils );

		const pastedDimensions = {
			width: tableUtils.getColumns( pastedTable ),
			height: tableUtils.getRows( pastedTable )
		};

		// Prepare the table for pasting.
		const selection = prepareTableForPasting( selectedTableCells, pastedDimensions, writer, tableUtils );

		// Beyond this point we operate on a fixed content table with rectangular selection and proper last row/column values.

		const selectionHeight = selection.lastRow - selection.firstRow + 1;
		const selectionWidth = selection.lastColumn - selection.firstColumn + 1;

		// Crop pasted table if:
		// - Pasted table dimensions exceeds selection area.
		// - Pasted table has broken layout (ie some cells sticks out by the table dimensions established by the first and last row).
		//
		// Note: The table dimensions are established by the width of the first row and the total number of rows.
		// It is possible to programmatically create a table that has rows which would have cells anchored beyond first row width but
		// such table will not be created by other editing solutions.
		const cropDimensions = {
			startRow: 0,
			startColumn: 0,
			endRow: Math.min( selectionHeight, pastedDimensions.height ) - 1,
			endColumn: Math.min( selectionWidth, pastedDimensions.width ) - 1
		};

		pastedTable = cropTableToDimensions( pastedTable, cropDimensions, writer );

		// Content table to which we insert a pasted table.
		const selectedTable = selectedTableCells[ 0 ].findAncestor( 'table' )!;

		const cellsToSelect = this._replaceSelectedCellsWithPasted( pastedTable, pastedDimensions, selectedTable, selection, writer );

		if ( this.editor.plugins.get( 'TableSelection' ).isEnabled ) {
			// Selection ranges must be sorted because the first and last selection ranges are considered
			// as anchor/focus cell ranges for multi-cell selection.
			const selectionRanges = tableUtils.sortRanges( cellsToSelect.map( cell => writer.createRangeOn( cell ) ) );

			writer.setSelection( selectionRanges );
		} else {
			// Set selection inside first cell if multi-cell selection is disabled.
			writer.setSelection( cellsToSelect[ 0 ], 0 );
		}

		return selectedTable;
	}

	/**
	 * Replaces the part of selectedTable with pastedTable.
	 */
	private _replaceSelectedCellsWithPasted(
		pastedTable: ModelElement,
		pastedDimensions: Record<string, number>,
		selectedTable: ModelElement,
		selection: Record<string, number>,
		writer: ModelWriter
	) {
		const { width: pastedWidth, height: pastedHeight } = pastedDimensions;

		// Holds two-dimensional array that is addressed by [ row ][ column ] that stores cells anchored at given location.
		const pastedTableLocationMap = createLocationMap( pastedTable, pastedWidth, pastedHeight );

		const selectedTableMap = [ ...new TableWalker( selectedTable, {
			startRow: selection.firstRow,
			endRow: selection.lastRow,
			startColumn: selection.firstColumn,
			endColumn: selection.lastColumn,
			includeAllSlots: true
		} ) ];

		// Selection must be set to pasted cells (some might be removed or new created).
		const cellsToSelect: Array<ModelElement> = [];

		// Store next cell insert position.
		let insertPosition: ModelPosition;

		// Content table replace cells algorithm iterates over a selected table fragment and:
		//
		// - Removes existing table cells at current slot (location).
		// - Inserts cell from a pasted table for a matched slots.
		//
		// This ensures proper table geometry after the paste
		for ( const tableSlot of selectedTableMap ) {
			const { row, column } = tableSlot;

			// Save the insert position for current row start.
			if ( column === selection.firstColumn ) {
				insertPosition = tableSlot.getPositionBefore();
			}

			// Map current table slot location to an pasted table slot location.
			const pastedRow = row - selection.firstRow;
			const pastedColumn = column - selection.firstColumn;
			const pastedCell = pastedTableLocationMap[ pastedRow % pastedHeight ][ pastedColumn % pastedWidth ];

			// Clone cell to insert (to duplicate its attributes and children).
			// Cloning is required to support repeating pasted table content when inserting to a bigger selection.
			const cellToInsert = pastedCell ? writer.cloneElement( pastedCell ) : null;

			// Replace the cell from the current slot with new table cell.
			const newTableCell = this._replaceTableSlotCell( tableSlot, cellToInsert, insertPosition!, writer );

			// The cell was only removed.
			if ( !newTableCell ) {
				continue;
			}

			// Trim the cell if it's row/col-spans would exceed selection area.
			trimTableCellIfNeeded( newTableCell, row, column, selection.lastRow, selection.lastColumn, writer );

			cellsToSelect.push( newTableCell );

			insertPosition = writer.createPositionAfter( newTableCell );
		}

		// If there are any headings, all the cells that overlap from heading must be splitted.
		const headingRows = parseInt( selectedTable.getAttribute( 'headingRows' ) as string || '0' );
		const headingColumns = parseInt( selectedTable.getAttribute( 'headingColumns' ) as string || '0' );

		const areHeadingRowsIntersectingSelection = selection.firstRow < headingRows && headingRows <= selection.lastRow;
		const areHeadingColumnsIntersectingSelection = selection.firstColumn < headingColumns && headingColumns <= selection.lastColumn;

		if ( areHeadingRowsIntersectingSelection ) {
			const columnsLimit = { first: selection.firstColumn, last: selection.lastColumn };
			const newCells = doHorizontalSplit(
				selectedTable, headingRows, columnsLimit, writer, selection.firstRow
			) as Array<ModelElement>;

			cellsToSelect.push( ...newCells );
		}

		if ( areHeadingColumnsIntersectingSelection ) {
			const rowsLimit = { first: selection.firstRow, last: selection.lastRow };
			const newCells = doVerticalSplit( selectedTable, headingColumns, rowsLimit, writer ) as Array<ModelElement>;

			cellsToSelect.push( ...newCells );
		}

		return cellsToSelect;
	}

	/**
	 * Replaces a single table slot.
	 *
	 * @returns Inserted table cell or null if slot should remain empty.
	 * @private
	 */
	public _replaceTableSlotCell(
		tableSlot: TableSlot,
		cellToInsert: ModelElement | null,
		insertPosition: ModelPosition,
		writer: ModelWriter
	): ModelElement | null {
		const { cell, isAnchor } = tableSlot;

		// If the slot is occupied by a cell in a selected table - remove it.
		// The slot of this cell will be either:
		// - Replaced by a pasted table cell.
		// - Spanned by a previously pasted table cell.
		if ( isAnchor ) {
			writer.remove( cell );
		}

		// There is no cell to insert (might be spanned by other cell in a pasted table) - advance to the next content table slot.
		if ( !cellToInsert ) {
			return null;
		}

		writer.insert( cellToInsert, insertPosition );

		return cellToInsert;
	}

	/**
	 * Extracts the table for pasting into a table.
	 *
	 * @param content The content to insert.
	 * @param model The editor model.
	 */
	public getTableIfOnlyTableInContent( content: ModelDocumentFragment | ModelItem, model: Model ): ModelElement | null {
		if ( !content.is( 'documentFragment' ) && !content.is( 'element' ) ) {
			return null;
		}

		// Table passed directly.
		if ( content.is( 'element', 'table' ) ) {
			return content;
		}

		// We do not support mixed content when pasting table into table.
		// See: https://github.com/ckeditor/ckeditor5/issues/6817.
		if ( content.childCount == 1 && content.getChild( 0 )!.is( 'element', 'table' ) ) {
			return content.getChild( 0 ) as ModelElement;
		}

		// If there are only whitespaces around a table then use that table for pasting.

		const contentRange = model.createRangeIn( content );

		for ( const element of contentRange.getItems() ) {
			if ( element.is( 'element', 'table' ) ) {
				// Stop checking if there is some content before table.
				const rangeBefore = model.createRange( contentRange.start, model.createPositionBefore( element ) );

				if ( model.hasContent( rangeBefore, { ignoreWhitespaces: true } ) ) {
					return null;
				}

				// Stop checking if there is some content after table.
				const rangeAfter = model.createRange( model.createPositionAfter( element ), contentRange.end );

				if ( model.hasContent( rangeAfter, { ignoreWhitespaces: true } ) ) {
					return null;
				}

				// There wasn't any content neither before nor after.
				return element;
			}
		}

		return null;
	}
}

/**
 * Prepares a table for pasting and returns adjusted selection dimensions.
 */
function prepareTableForPasting(
	selectedTableCells: Array<ModelElement>,
	pastedDimensions: {
		height: number;
		width: number;
	},
	writer: ModelWriter,
	tableUtils: TableUtils
) {
	const selectedTable = selectedTableCells[ 0 ].findAncestor( 'table' )!;

	const columnIndexes = tableUtils.getColumnIndexes( selectedTableCells );
	const rowIndexes = tableUtils.getRowIndexes( selectedTableCells );

	const selection = {
		firstColumn: columnIndexes.first,
		lastColumn: columnIndexes.last,
		firstRow: rowIndexes.first,
		lastRow: rowIndexes.last
	};

	// Single cell selected - expand selection to pasted table dimensions.
	const shouldExpandSelection = selectedTableCells.length === 1;

	if ( shouldExpandSelection ) {
		selection.lastRow += pastedDimensions.height - 1;
		selection.lastColumn += pastedDimensions.width - 1;

		expandTableSize( selectedTable, selection.lastRow + 1, selection.lastColumn + 1, tableUtils );
	}

	// In case of expanding selection we do not reset the selection so in this case we will always try to fix selection
	// like in the case of a non-rectangular area. This might be fixed by re-setting selected cells array but this shortcut is safe.
	if ( shouldExpandSelection || !tableUtils.isSelectionRectangular( selectedTableCells ) ) {
		// For a non-rectangular selection (ie in which some cells sticks out from a virtual selection rectangle) we need to create
		// a table layout that has a rectangular selection. This will split cells so the selection become rectangular.
		// Beyond this point we will operate on fixed content table.
		splitCellsToRectangularSelection( selectedTable, selection, writer );
	}
	// However a selected table fragment might be invalid if examined alone. Ie such table fragment:
	//
	//    +---+---+---+---+
	//  0 | a | b | c | d |
	//    +   +   +---+---+
	//  1 |   | e | f | g |
	//    +   +---+   +---+
	//  2 |   | h |   | i | <- last row, each cell has rowspan = 2,
	//    +   +   +   +   +    so we need to return 3, not 2
	//  3 |   |   |   |   |
	//    +---+---+---+---+
	//
	// is invalid as the cells "h" and "i" have rowspans.
	// This case needs only adjusting the selection dimension as the rest of the algorithm operates on empty slots also.
	else {
		selection.lastRow = adjustLastRowIndex( selectedTable, selection );
		selection.lastColumn = adjustLastColumnIndex( selectedTable, selection );
	}

	return selection;
}

/**
 * Expand table (in place) to expected size.
 */
function expandTableSize( table: ModelElement, expectedHeight: number, expectedWidth: number, tableUtils: TableUtils ) {
	const tableWidth = tableUtils.getColumns( table );
	const tableHeight = tableUtils.getRows( table );

	if ( expectedWidth > tableWidth ) {
		tableUtils.insertColumns( table, {
			at: tableWidth,
			columns: expectedWidth - tableWidth
		} );
	}

	if ( expectedHeight > tableHeight ) {
		tableUtils.insertRows( table, {
			at: tableHeight,
			rows: expectedHeight - tableHeight
		} );
	}
}

/**
 * Returns two-dimensional array that is addressed by [ row ][ column ] that stores cells anchored at given location.
 *
 * At given row & column location it might be one of:
 *
 * * cell - cell from pasted table anchored at this location.
 * * null - if no cell is anchored at this location.
 *
 * For instance, from a table below:
 *
 *   +----+----+----+----+
 *   | 00 | 01 | 02 | 03 |
 *   +    +----+----+----+
 *   |    | 11      | 13 |
 *   +----+         +----+
 *   | 20 |         | 23 |
 *   +----+----+----+----+
 *
 * The method will return an array (numbers represents cell element):
 *
 * ```ts
 * const map = [
 *   [ '00', '01', '02', '03' ],
 *   [ null, '11', null, '13' ],
 *   [ '20', null, null, '23' ]
 * ]
 * ```
 *
 * This allows for a quick access to table at give row & column. For instance to access table cell "13" from pasted table call:
 *
 * ```ts
 * const cell = map[ 1 ][ 3 ]
 * ```
 */
function createLocationMap( table: ModelElement, width: number, height: number ) {
	// Create height x width (row x column) two-dimensional table to store cells.
	const map = new Array( height ).fill( null )
		.map( () => new Array( width ).fill( null ) );

	for ( const { column, row, cell } of new TableWalker( table ) ) {
		map[ row ][ column ] = cell;
	}

	return map;
}

/**
 * Make selected cells rectangular by splitting the cells that stand out from a rectangular selection.
 *
 * In the table below a selection is shown with "::" and slots with anchor cells are named.
 *
 * +----+----+----+----+----+                    +----+----+----+----+----+
 * | 00 | 01 | 02 | 03      |                    | 00 | 01 | 02 | 03      |
 * +    +----+    +----+----+                    |    ::::::::::::::::----+
 * |    | 11 |    | 13 | 14 |                    |    ::11 |    | 13:: 14 |    <- first row
 * +----+----+    +    +----+                    +----::---|    |   ::----+
 * | 20 | 21 |    |    | 24 |   select cells:    | 20 ::21 |    |   :: 24 |
 * +----+----+    +----+----+     11 -> 33       +----::---|    |---::----+
 * | 30      |    | 33 | 34 |                    | 30 ::   |    | 33:: 34 |    <- last row
 * +         +    +----+    +                    |    ::::::::::::::::    +
 * |         |    | 43 |    |                    |         |    | 43 |    |
 * +----+----+----+----+----+                    +----+----+----+----+----+
 *                                                      ^          ^
 *                                                     first & last columns
 *
 * Will update table to:
 *
 *                       +----+----+----+----+----+
 *                       | 00 | 01 | 02 | 03      |
 *                       +    +----+----+----+----+
 *                       |    | 11 |    | 13 | 14 |
 *                       +----+----+    +    +----+
 *                       | 20 | 21 |    |    | 24 |
 *                       +----+----+    +----+----+
 *                       | 30 |    |    | 33 | 34 |
 *                       +    +----+----+----+    +
 *                       |    |    |    | 43 |    |
 *                       +----+----+----+----+----+
 *
 * In th example above:
 * - Cell "02" which have `rowspan = 4` must be trimmed at first and at after last row.
 * - Cell "03" which have `rowspan = 2` and `colspan = 2` must be trimmed at first column and after last row.
 * - Cells "00", "03" & "30" which cannot be cut by this algorithm as they are outside the trimmed area.
 * - Cell "13" cannot be cut as it is inside the trimmed area.
 */
function splitCellsToRectangularSelection( table: ModelElement, dimensions: Record<string, number>, writer: ModelWriter ) {
	const { firstRow, lastRow, firstColumn, lastColumn } = dimensions;

	const rowIndexes = { first: firstRow, last: lastRow };
	const columnIndexes = { first: firstColumn, last: lastColumn };

	// 1. Split cells vertically in two steps as first step might create cells that needs to split again.
	doVerticalSplit( table, firstColumn, rowIndexes, writer );
	doVerticalSplit( table, lastColumn + 1, rowIndexes, writer );

	// 2. Split cells horizontally in two steps as first step might create cells that needs to split again.
	doHorizontalSplit( table, firstRow, columnIndexes, writer );
	doHorizontalSplit( table, lastRow + 1, columnIndexes, writer, firstRow );
}

function doHorizontalSplit(
	table: ModelElement,
	splitRow: number,
	limitColumns: Record<string, number>,
	writer: ModelWriter,
	startRow: number = 0
) {
	// If selection starts at first row then no split is needed.
	if ( splitRow < 1 ) {
		return;
	}

	const overlappingCells = getVerticallyOverlappingCells( table, splitRow, startRow );

	// Filter out cells that are not touching insides of the rectangular selection.
	const cellsToSplit = overlappingCells.filter( ( { column, cellWidth } ) => isAffectedBySelection( column, cellWidth, limitColumns ) );

	return cellsToSplit.map( ( { cell } ) => splitHorizontally( cell, splitRow, writer ) );
}

function doVerticalSplit( table: ModelElement, splitColumn: number, limitRows: Record<string, number>, writer: ModelWriter ) {
	// If selection starts at first column then no split is needed.
	if ( splitColumn < 1 ) {
		return;
	}

	const overlappingCells = getHorizontallyOverlappingCells( table, splitColumn );

	// Filter out cells that are not touching insides of the rectangular selection.
	const cellsToSplit = overlappingCells.filter( ( { row, cellHeight } ) => isAffectedBySelection( row, cellHeight, limitRows ) );

	return cellsToSplit.map( ( { cell, column } ) => splitVertically( cell, column, splitColumn, writer ) );
}

/**
 * Checks if cell at given row (column) is affected by a rectangular selection defined by first/last column (row).
 *
 * The same check is used for row as for column.
 */
function isAffectedBySelection( index: number, span: number, limit: Record<string, number> ) {
	const endIndex = index + span - 1;
	const { first, last } = limit;

	const isInsideSelection = index >= first && index <= last;
	const overlapsSelectionFromOutside = index < first && endIndex >= first;

	return isInsideSelection || overlapsSelectionFromOutside;
}
