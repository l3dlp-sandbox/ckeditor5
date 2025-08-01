---
title: Block indentation
category: features
meta-title: Block indentation | CKEditor 5 Documentation
---

The block indentation feature lets you set indentation for text blocks such as paragraphs, headings, or lists. This way you can visually distinguish parts of your content.

## Demo

Use the indent {@icon @ckeditor/ckeditor5-icons/theme/icons/indent.svg Indent} or outdent {@icon @ckeditor/ckeditor5-icons/theme/icons/outdent.svg Outdent} toolbar buttons in the editor below to change the indentation level. Try this on different elements: paragraphs, headings, and list items.

{@snippet features/indent}

<snippet-footer>
	This demo presents a limited set of features. Visit the {@link examples/builds/full-featured-editor feature-rich editor example} to see more in action.
</snippet-footer>

## Installation

After {@link getting-started/integrations-cdn/quick-start installing the editor}, add the feature to your plugin list and toolbar configuration:

<code-switcher>
```js
import { ClassicEditor, Indent, IndentBlock } from 'ckeditor5';

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		licenseKey: '<YOUR_LICENSE_KEY>', // Or 'GPL'.
		plugins: [ Indent, IndentBlock, /* ... */ ],
		toolbar: [ 'outdent', 'indent', /* ... */ ]
		indentBlock: {
			// Configuration.
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```
</code-switcher>

## Configuring the block indentation feature

This feature offers a few configuration options that can be used to adjust the text block indentation behavior. It is implemented by three plugins: {@link module:indent/indent~Indent}, {@link module:indent/indentblock~IndentBlock} and {@link module:list/list~List}.

### Using offset and unit

By default, the block indentation feature increases or decreases the current indentation by the given offset, using the given unit.

The rich-text editor from the {@link features/indent#demo demo} section above uses the default configuration, which defines a `40px` indentation step.

You can change that value to, for example, `1em`:

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		indentBlock: {
			offset: 1,
			unit: 'em'
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

### Using CSS classes

If you want more semantics in your content, use CSS classes instead of fixed indentation units. You can then adjust the levels in the style sheets of your application whenever you want.

Here is how you can configure the block indentation feature to set indentation by applying one of the defined CSS classes:

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		indentBlock: {
			classes: [
				'custom-block-indent-a', // First step - smallest indentation.
				'custom-block-indent-b',
				'custom-block-indent-c'  // Last step - biggest indentation.
			]
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

Using classes instead of fixed units (`px` or `em`) has another advantage &ndash; you retain control over what indentation levels are used in the documents. For instance, you can limit indentation to 2 or 3 different levels and there is no way the users can go beyond that. In the example above, the `.custom-block-indent-c` class level is the maximum allowed indentation value. This should help keep your content clean and predictable.

In this configuration, the WYSIWYG editor will restrict indentation levels to the set of provided classes. The class with the last index in the array has the biggest indentation.

In the demo below the CSS classes are defined as follows:

```css
.custom-block-indent-a {
	margin-left: 10%;
}

.custom-block-indent-b {
	margin-left: 20%;
}

.custom-block-indent-c {
	margin-left: 30%;
}
```

<info-box>
	Note that for <abbr title="right-to-left">RTL</abbr> content, `'margin-right'` should be used instead. Learn more about {@link getting-started/setup/ui-language#setting-the-language-of-the-content configuring language of the editor content}.
</info-box>

{@snippet features/custom-indent-block-classes}

## Indenting lists

Besides controlling text block indentation, the same set of buttons (`outdent`, `indent`) allows for indenting list items (nesting them).

This mechanism is completely transparent to the user. From the code perspective, the buttons are implemented by the {@link module:indent/indent~Indent} plugin, but neither these buttons nor the respective commands implement any functionality by default.

The target behavior comes from two other plugins:

* {@link module:indent/indentblock~IndentBlock} &ndash; The indent block feature controls the indentation of elements such as paragraphs and headings.
* {@link module:list/list~List} &ndash; The list feature implements the indentation (nesting) of lists.

This means that if you want to allow indenting lists only, you can do that by loading only the `Indent` and `List` plugins. If you want the full behavior, you need to load all 3 plugins (`Indent`, `IndentBlock`, and `List`).

## Related features

Here are some CKEditor&nbsp;5 features that may help structure your content better:
* {@link features/block-quote Block quote} &ndash; Include block quotations or pull quotes in your rich-text content.
* {@link features/headings Headings} &ndash; Divide your content into sections.
* {@link features/code-blocks Code block} &ndash; Insert longer, multiline code listings.
* {@link features/text-alignment Text alignment} &ndash; Because it does matter whether the content is left, right, centered, or justified.

<info-box info>
	Block indentation can be removed with the {@link features/remove-format remove format} feature.
</info-box>

## Common API

The {@link module:indent/indent~Indent} plugin registers the following components:

* The `'indent'` command.

	This command does not implement any indentation behavior by itself. It executes either `indentBlock` (described below) or `indentList`, depending on which of these commands is enabled.

	Read more in the [Indenting lists](#indenting-lists) section above.

* The `'outdent'` command.

	This command does not implement any indentation behavior by itself. It executes either `outdentBlock` (described below) or `outdentList`, depending on which of these commands is enabled.

	Read more in the [Indenting lists](#indenting-lists) section above.

The {@link module:indent/indentblock~IndentBlock} plugin registers the following components:

* The {@link module:indent/indentblockcommand~IndentBlockCommand `'indentBlock'`} command.

	You can increase the indentation of the text block that contains the selection by:

	```js
	editor.execute( 'indentBlock' );
	```

* The {@link module:indent/indentblockcommand~IndentBlockCommand `'outdentBlock'`} command.

	You can decrease the indentation of the text block that contains the selection by:

	```js
	editor.execute( 'outdentBlock' );
	```

<info-box>
	We recommend using the official {@link framework/development-tools/inspector CKEditor&nbsp;5 inspector} for development and debugging. It will give you tons of useful information about the state of the editor such as internal data structures, selection, commands, and many more.
</info-box>

## Contribute

The source code of the feature is available on GitHub at [https://github.com/ckeditor/ckeditor5/tree/master/packages/ckeditor5-font](https://github.com/ckeditor/ckeditor5/tree/master/packages/ckeditor5-font).
