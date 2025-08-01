---
category: features
meta-title: Code blocks | CKEditor 5 Documentation
---

# Code blocks

The code block feature lets you insert and edit blocks of pre-formatted code. It is perfect for presenting programming-related content in an attractive, easy-to-read form.

## Demo

Use the code block toolbar button {@icon @ckeditor/ckeditor5-icons/theme/icons/code-block.svg Insert code block} and the type dropdown to insert a desired code block. Alternatively, start a line with a backtick, and the {@link features/autoformat autoformatting feature} will format it as a code block. To add a paragraph under a code block, simply press <kbd>Enter</kbd> three times.

{@snippet features/code-block}

<snippet-footer>
	This demo presents a limited set of features. Visit the {@link examples/builds/full-featured-editor feature-rich editor example} to see more in action.
</snippet-footer>

Each code block has a [specific programming language assigned](#configuring-code-block-languages) (like "Java" or "CSS"; this is configurable) and supports basic editing tools, for instance, [changing the line indentation](#changing-line-indentation) using the keyboard.

## Installation

After {@link getting-started/integrations-cdn/quick-start installing the editor}, add the feature to your plugin list and toolbar configuration:

<code-switcher>
```js
import { ClassicEditor, CodeBlock } from 'ckeditor5';

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		licenseKey: '<YOUR_LICENSE_KEY>', // Or 'GPL'.
		plugins: [ CodeBlock, /* ... */ ],
		toolbar: [ 'codeBlock', /* ... */ ]
		codeBlock: {
			// Configuration.
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```
</code-switcher>

## Configuring code block languages

Each code block can be assigned a programming language. The language of the code block is represented as a CSS class of the `<code>` element, both when editing and in the editor data:

```html
<pre><code class="language-javascript">window.alert( 'Hello world!' )</code></pre>
```

It is possible to configure which languages are available to the users. You can use the {@link module:code-block/codeblockconfig~CodeBlockConfig#languages `codeBlock.languages`} configuration and define your own languages. For example, the following editor supports only two languages (CSS and HTML):

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		codeBlock: {
			languages: [
				{ language: 'css', label: 'CSS' },
				{ language: 'html', label: 'HTML' }
			]
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

{@snippet features/code-block-custom-languages}

By default, the CSS class of the `<code>` element in the data and editing is generated using the `language` property (prefixed with "language-"). You can customize it by specifying an optional `class` property. You can set **multiple classes** but **only the first one** will be used as defining language class:

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		codeBlock: {
			languages: [
				// Do not render the CSS class for the plain text code blocks.
				{ language: 'plaintext', label: 'Plain text', class: '' },

				// Use the "php-code" class for PHP code blocks.
				{ language: 'php', label: 'PHP', class: 'php-code' },

				// Use the "js" class for JavaScript code blocks.
				// Note that only the first ("js") class will determine the language of the block when loading data.
				{ language: 'javascript', label: 'JavaScript', class: 'js javascript js-code' },

				// Python code blocks will have the default "language-python" CSS class.
				{ language: 'python', label: 'Python' }
			]
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

<info-box>
	The first language defined in the configuration is considered the default one. This means it will be applied to code blocks loaded from the data that have no CSS `class` specified (or no `class` matching the {@link module:code-block/codeblockconfig~CodeBlockConfig#languages configuration}). It will also be used when creating new code blocks using the toolbar button. By default, it is "Plain text" (the `language-plaintext` CSS class).
</info-box>

### Integration with code highlighters

Although live code block highlighting ***is impossible when editing*** in CKEditor&nbsp;5 ([learn more](https://github.com/ckeditor/ckeditor5/issues/436#issuecomment-548399675)), the content can be highlighted when displayed in the frontend (for example, in blog posts or website content).

The code language {@link module:code-block/codeblockconfig~CodeBlockConfig#languages configuration} helps to integrate with external code highlighters (for example, [highlight.js](https://highlightjs.org/) or [Prism](https://prismjs.com/)). Refer to the documentation of the highlighter of your choice and make sure the CSS classes configured in `codeBlock.languages` correspond with the code syntax autodetection feature of the highlighter.

## Tips and tweaks

### Editing text around code blocks

There could be situations when there is no obvious way to set the caret before or after a block of code and type. This can happen when the code block is preceded or followed by a widget (like a table) or when the code block is the first or the last child of the document (or both).

* To type **before the code block**: Put the selection at the beginning of the first line of the code block and press <kbd>Enter</kbd>. Move the selection to the empty line that has been created and press <kbd>Enter</kbd> again. A new paragraph that you can type in will be created before the code block.

	{@img assets/img/code-blocks-typing-before.gif 770 The animation shows typing before the code blocks in CKEditor&nbsp;5 rich text editor.}

* To type **after the code block**: Put the selection at the end of the last line of the code block and press <kbd>Enter</kbd> three times. A new paragraph that you can type in will be created after the code block.

	{@img assets/img/code-blocks-typing-after.gif 770 The animation shows typing after the code blocks in CKEditor&nbsp;5 rich text editor.}

### Changing line indentation

You can change the indentation of the code using keyboard shortcuts and toolbar buttons:

* To **increase** indentation: Select the line (or lines) you want to indent. Hit the <kbd>Tab</kbd> key or press the "Increase indent" button in the toolbar.
* To **decrease** indentation: Select the line (or lines) the indent should decrease. Hit the <kbd>Shift</kbd>+<kbd>Tab</kbd> keys or press the "Decrease indent" button in the toolbar.

{@img assets/img/code-blocks-outdent-indent.gif 770 The animation shows changing indentation inside code blocks in CKEditor&nbsp;5 rich text editor.}

<info-box>
	The indentation created this way can be changed. Use the {@link module:code-block/codeblockconfig~CodeBlockConfig#indentSequence `codeBlock.indentSequence`} configuration to choose some other character (or characters) of your preference (for example, four spaces). By default, the indentation changes by a single tab (`\t`) character.
</info-box>

<info-box>
	You can turn off the indentation tools and their associated keystrokes altogether by setting the {@link module:code-block/codeblockconfig~CodeBlockConfig#indentSequence `codeBlock.indentSequence`}  configuration to `false`.
</info-box>

### Preserving line indentation

To speed up the editing, when typing in a code block, the indentation of the current line is preserved when you hit <kbd>Enter</kbd> and create a new line. If you want to change the indentation of the new line, take a look at [some easy ways to do that](#changing-line-indentation).

{@img assets/img/code-blocks-preserve-indentation.gif 770 The animation shows preserving indentation inside code blocks in CKEditor&nbsp;5 rich text editor.}

## Related features

Here are some similar CKEditor&nbsp;5 features that you may find helpful:
* {@link features/basic-styles Basic text styles} &ndash; Use the `code` formatting for short inline code chunks.
* {@link features/block-quote Block quote} &ndash; Include block quotations or pull quotes in your rich-text content.
* {@link features/indent Block indentation} &ndash; Set indentation for text blocks such as paragraphs or lists.
* {@link features/autoformat Autoformatting} &ndash; Format the content on the go with Markdown code.

<info-box>
	If you would like to use inline code formatting in your WYSIWYG editor, check out the {@link features/basic-styles basic text styles feature} with its support for inline `<code>` element.
</info-box>

## Common API

The {@link module:code-block/codeblock~CodeBlock} plugin registers:

* The `'codeBlock'` split button with a dropdown allowing to choose the language of the block.
* The {@link module:code-block/codeblockcommand~CodeBlockCommand `'codeBlock'`} command.

	The command converts selected WYSIWYG editor content into a code block. If no content is selected, it creates a new code block at the place of the selection.

	You can choose which language the code block is written in when executing the command. The language will be set in the editor model and reflected as a CSS class visible in the editing view and the editor (data) output:

	```js
	editor.execute( 'codeBlock', { language: 'css' } );
	```

	When executing the command, you can use languages defined by the {@link module:code-block/codeblockconfig~CodeBlockConfig#languages `codeBlock.languages`} configuration. The default list of languages is as follows:

	```js
	codeBlock.languages: [
		{ language: 'plaintext', label: 'Plain text' }, // The default language.
		{ language: 'c', label: 'C' },
		{ language: 'cs', label: 'C#' },
		{ language: 'cpp', label: 'C++' },
		{ language: 'css', label: 'CSS' },
		{ language: 'diff', label: 'Diff' },
		{ language: 'go', label: 'Go' },
		{ language: 'html', label: 'HTML' },
		{ language: 'java', label: 'Java' },
		{ language: 'javascript', label: 'JavaScript' },
		{ language: 'php', label: 'PHP' },
		{ language: 'python', label: 'Python' },
		{ language: 'ruby', label: 'Ruby' },
		{ language: 'typescript', label: 'TypeScript' },
		{ language: 'xml', label: 'XML' }
	]
	```

	**Note**: If you execute the command with a specific `language` when the selection is anchored in a code block, and use the additional `forceValue: true` parameter, it will update the language of this particular block.

	```js
	editor.execute( 'codeBlock', { language: 'java', forceValue: true } );
	```

	**Note**: If the selection is already in a code block, executing the command will convert the block back into plain paragraphs.
* The {@link module:code-block/indentcodeblockcommand~IndentCodeBlockCommand `'indentCodeBlock'`} and {@link module:code-block/outdentcodeblockcommand~OutdentCodeBlockCommand `'outdentCodeBlock'`} commands.

	Both commands are used by the <kbd>Tab</kbd> and <kbd>Shift</kbd>+<kbd>Tab</kbd> keystrokes as described in the [section about indentation](#changing-line-indentation):

	* The `'indentCodeBlock'` command is enabled when the selection is anchored anywhere in the code block and it allows increasing the indentation of the lines of code. The indentation character (sequence) is configurable using the {@link module:code-block/codeblockconfig~CodeBlockConfig#indentSequence `codeBlock.indentSequence`} configuration.
	* The `'outdentCodeBlock'` command is enabled when the indentation of any code lines within the selection can be decreased. Executing it will remove the indentation character (sequence) from these lines, as configured by {@link module:code-block/codeblockconfig~CodeBlockConfig#indentSequence `codeBlock.indentSequence`}.

<info-box>
	We recommend using the official {@link framework/development-tools/inspector CKEditor&nbsp;5 inspector} for development and debugging. It will give you tons of useful information about the state of the editor such as internal data structures, selection, commands, and many more.
</info-box>

## Contribute

The source code of the feature is available on GitHub at [https://github.com/ckeditor/ckeditor5/tree/master/packages/ckeditor5-code-block](https://github.com/ckeditor/ckeditor5/tree/master/packages/ckeditor5-code-block).
