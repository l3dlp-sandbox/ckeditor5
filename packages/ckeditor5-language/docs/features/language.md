---
category: features
menu-title: Text part language
meta-title: Text part language | CKEditor 5 Documentation
meta-description: Set the language of content in CKEditor 5 to improve accessibility, support screen readers, and optimize language-specific features.
---

# Text part language

The text part language feature lets you mark the language of text fragments. This way browsers and screen readers can correctly interpret parts written in different languages.

## Demo

In the demo below, select a text fragment. Next, use the language toolbar dropdown to choose from predefined languages.

{@snippet features/textpartlanguage}

<snippet-footer>
	This demo presents a limited set of features. Visit the {@link examples/builds/full-featured-editor feature-rich editor example} to see more in action.
</snippet-footer>

## Additional feature information

The text part language feature is especially useful when your content includes text sections written in different text directions, for example, when the whole content is in English but includes some citations in Arabic.

The text part language feature implements the [WCAG 3.1.2 Language of Parts](https://www.w3.org/TR/UNDERSTANDING-WCAG20/meaning-other-lang-id.html) specification.

## Installation

After {@link getting-started/integrations-cdn/quick-start installing the editor}, add the feature to your plugin list and toolbar configuration:

<code-switcher>
```js
import { ClassicEditor, TextPartLanguage } from 'ckeditor5';

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		licenseKey: '<YOUR_LICENSE_KEY>', // Or 'GPL'.
		plugins: [ TextPartLanguage, /* ... */ ],
		toolbar: [ 'textPartLanguage', /* ... */ ]
		language: {
			// Configuration.
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```
</code-switcher>

## Configuring available languages

To modify the list of available languages displayed in the language dropdown use the {@link module:core/editor/editorconfig~LanguageConfig#textPartLanguage `config.language.textPartLanguage`} configuration option.

The example below shows the configuration used for the [demo](#demo) above:

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		language: {
			textPartLanguage: [
				{ title: 'Arabic', languageCode: 'ar' },
				{ title: 'French', languageCode: 'fr' },
				{ title: 'Hebrew', languageCode: 'he' },
				{ title: 'Spanish', languageCode: 'es' }
			]
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

## Related features

There are other language-related CKEditor&nbsp;5 features you may want to check:

* {@link getting-started/setup/ui-language UI Language}  &ndash; Set the UI language.
* {@link features/spelling-and-grammar-checking Spelling and grammar checking} &ndash; Employ multi-language spell check for flawless content.

## Common API

The {@link module:language/textpartlanguage~TextPartLanguage} plugin registers:

* The `'textPartLanguage'` UI dropdown component implemented by the {@link module:language/textpartlanguageui~TextPartLanguageUI text part language UI feature}.
* The `'textPartLanguage'` command implemented by the {@link module:language/textpartlanguageediting~TextPartLanguageEditing text part language editing feature}.

You can execute the command using the {@link module:core/editor/editor~Editor#execute `editor.execute()`} method:

```js
// Applies the language to the selected text part with the given language code.
editor.execute( 'textPartLanguage', { languageCode: 'es' } );
```

<info-box>
	We recommend using the official {@link framework/development-tools/inspector CKEditor&nbsp;5 inspector} for development and debugging. It will give you tons of useful information about the state of the editor such as internal data structures, selection, commands, and many more.
</info-box>

## Contribute

The source code of the feature is available on GitHub at [https://github.com/ckeditor/ckeditor5/tree/master/packages/ckeditor5-language](https://github.com/ckeditor/ckeditor5/tree/master/packages/ckeditor5-language).
