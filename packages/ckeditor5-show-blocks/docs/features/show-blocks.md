---
title: Show blocks
menu-title: Show blocks
meta-title: Show blocks | CKEditor 5 Documentation
meta-description: Display block-level elements in CKEditor 5 using the Show Blocks feature to visualize document structure during editing.
category: features
modified_at: 2023-06-20
---

The show blocks feature allows the content creators to visualize all block-level elements (except for widgets). It surrounds them with an outline and displays their element name in the top-left corner of the box.

## Demo

Toggle the block elements visibility with the show block {@icon @ckeditor/ckeditor5-icons/theme/icons/show-blocks.svg Show blocks} toolbar button to see the feature in action. The content remains editable, so you can see how the blocks adjust to the content structure on the go. These outlines are not visible in the {@link features/export-pdf export to PDF} and {@link features/export-word export to Word} features, so there is no need to remove them before exporting.

{@snippet features/show-blocks}

<snippet-footer>
	This demo presents a limited set of features. Visit the {@link examples/builds/full-featured-editor feature-rich editor example} to see more in action.
</snippet-footer>

## Installation

After {@link getting-started/integrations-cdn/quick-start installing the editor}, add the feature to your plugin list and toolbar configuration:

<code-switcher>
```js
import { ClassicEditor, ShowBlocks } from 'ckeditor5';

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		licenseKey: '<YOUR_LICENSE_KEY>', // Or 'GPL'.
		plugins: [ ShowBlocks, /* ... */ ],
		toolbar: [ 'showBlocks', /* ... */ ],
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```
</code-switcher>

<info-box info>
	Read more about {@link getting-started/setup/configuration installing plugins} and {@link getting-started/setup/toolbar toolbar configuration}.
</info-box>

## Known issues

* The show blocks feature does not support widgets, yet. It means it will currently not show block outlines for example for images or tables. Feel free to upvote 👍&nbsp; [this issue on GitHub](https://github.com/ckeditor/ckeditor5/issues/14869) if it is important for you.
* At present, the show blocks feature is not yet fully compatible with the {@link features/pagination pagination} feature. Using these two together may result in errors.

## Related features

Other CKEditor&nbsp;5 features related to HTML editing that you may want to check:

* {@link features/general-html-support General HTML Support} &ndash; Allows you to enable HTML features (elements, attributes, classes, styles) that are not supported by other dedicated CKEditor&nbsp;5 plugins.
* {@link features/source-editing-enhanced Enhanced source code editing} &ndash; Allows for viewing and editing the source code of the document in a handy modal window (compatible with all editor types) with syntax highlighting, autocompletion and more.
* {@link features/full-page-html Full page HTML} &ndash; Allows using CKEditor&nbsp;5 to edit entire HTML pages, from `<html>` to `</html>`, including the page metadata.

## Common API

The {@link module:show-blocks/showblocks~ShowBlocks} plugin registers the `'showBlocks'` UI button component and the `'showBlocks'` command implemented by {@link module:show-blocks/showblockscommand~ShowBlocksCommand}.

You can execute the command using the {@link module:core/editor/editor~Editor#execute `editor.execute()`} method:

```js
// Toggle the visibility of block-level elements outline.
editor.execute( 'showBlocks' );
```

<info-box>
	We recommend using the official {@link framework/development-tools/inspector CKEditor&nbsp;5 inspector} for development and debugging. It will give you tons of useful information about the state of the editor such as internal data structures, selection, commands, and many more.
</info-box>

## Contribute

The source code of the feature is available on GitHub at [https://github.com/ckeditor/ckeditor5/tree/master/packages/ckeditor5-show-blocks](https://github.com/ckeditor/ckeditor5/tree/master/packages/ckeditor5-show-blocks).
