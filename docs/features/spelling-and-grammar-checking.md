---
category: features
menu-title: Spell and grammar checker
meta-title: Spelling, grammar, and punctuation checking | CKEditor 5 Documentation
meta-description: Enable spelling and grammar checking in CKEditor 5 with WProofreader. Learn how to configure, customize, and enhance writing quality.
modified_at: 2022-10-05
badges: [ premium ]
---

# Spelling, grammar, and punctuation checking

[WProofreader SDK](https://webspellchecker.com/wsc-proofreader) is an AI-driven, multi-language text correction tool. Spelling, grammar, and punctuation suggestions appear on hover as you type or in a separate dialog aggregating all mistakes and replacement suggestions in one place.

<info-box>
	This is a premium add-on that is a part of CKEditor Custom Plan, and delivered by our partner, [WebSpellChecker](https://webspellchecker.com/). [Choose the Custom Plan](https://ckeditor.com/pricing/) to enable it.
</info-box>

## Demo

Use the toolbar button {@icon @webspellchecker/wproofreader-ckeditor5/theme/icons/wproofreader.svg Spell and grammar check} to test the spell and grammar check feature in the editor below.

{@snippet features/wproofreader}

<snippet-footer>
	This demo presents a limited set of features. Visit the {@link examples/builds/full-featured-editor feature-rich editor example} to see more in action.
</snippet-footer>

The WProofreader badge in the bottom-right corner shows you the total number of mistakes detected. Hover an underlined word to display the WProofreader suggestions for any of the spelling and grammar mistakes found. The suggestion card allows the user to use the feature on the go. If you want to see an overview of all mistakes found, click the "Proofread in dialog" option in the toolbar dropdown. It will invoke a detached floating dialog, which is easy to navigate and perfect for dedicated proofreading sessions.

You can access the WProofreader settings from the toolbar, too. Set the primary language, create a spelling dictionary, and tweak some additional proofreading settings.

## Additional feature information

You can fine-tune WProofreader via the dedicated settings menu. Choose a primary language from a set of available ones. Create and manage additional custom dictionaries. You can add words to the user dictionary directly from the suggestion card, too. If needed, you can turn off the spell checker and enable it again with a single click.

## Multi-language support

The {@link features/language text part language} feature lets the user set different languages to different portions of the content. The spell and grammar check feature offers full support for multilingual content. If you set the WProofreader language to Auto Detect (or set the `auto` language in the configuration), the feature will automatically recognize the language for a given sentence. It will then suggest spelling and grammar corrections specifically for that language, as shown in the demo above.

{@img assets/img/spell-check-dictionary.png 770 Setting the spell checker dictionary to auto.}

## Check types

WProofreader checks texts for spelling, grammar, and punctuation mistakes. The autodetect feature facilitates the correction of multilingual texts. Users do not have to manually switch languages to proofread documents with mixed language. Handy spelling autocorrect validates user texts on the fly. Autocomplete suggestions for English make the proofreading process fast and smooth. You can accept the predictive text with a right <kbd>→</kbd> arrow key.

## Supported languages and dictionaries

### Language support

The most popular languages used with WProofreader include: American English, Australian English, Arabic, Brazilian Portuguese, British English, Canadian English, Canadian French, Danish, Dutch, Finnish, French, German, Greek, Hebrew, Italian, Indonesian, Norwegian Bokmål, Norwegian Nynorsk, Portuguese, Spanish, Swedish, Turkish, and Ukrainian.

There are more languages available from the WebSpellChecker site. Grammar checking is available for over 20 languages.

The AI-driven tools approach for English, German, and Spanish is a recent addition to the software. It offers a far better checking quality and generates proofreading suggestions based on the context of a sentence. It provides more suitable suggestions that address mistakes with 3 times the accuracy compared to a traditional mechanism.

Here you can check the [full list of supported languages](https://webspellchecker.com/supported-languages/).

### Specialized dictionaries

Apart from the language dictionaries, WebSpellChecker offers two specialized dictionaries: medical and legal.

### Custom dictionaries

You can use custom dictionaries in two ways.

One is the **user-level dictionary** that you can expand during regular use by adding new words. This is a perfect solution for users working on specific content that may contain slang or professional jargon.

The other is the so-called **company-level dictionary**. These pre-made dictionaries can be uploaded by system administrators or CKEditor&nbsp;5 integrators and made available across the company, accessible for all users. This way you can share all the benefits of a user-generated dictionary among the team, making the proofreading process more structured and controlled.

## Accessibility

The WProofreader UI is designed and oriented toward comfort and ease of use. The proofreading floating dialog can be moved around, addressing the needs of left-handed editors and right-to-left language users. The clear, simple design is more readable for users with vision impairments. You can also navigate and operate the dialog with a keyboard, eliminating the need to use a mouse or another pointing device.

The spell and grammar check is compliant with Web Content Accessibility Guidelines (WCAG) 2.1 and Section 508 accessibility standards.

## Installation

WProofreader is delivered as a CKEditor&nbsp;5 plugin, so you can combine it into an editor preset just like other features. To add this feature to your rich-text editor, install the [`@webspellchecker/wproofreader-ckeditor5`](https://www.npmjs.com/package/@webspellchecker/wproofreader-ckeditor5) package:

```
npm install --save @webspellchecker/wproofreader-ckeditor5
```

Then, add it to your plugin list and the toolbar configuration. Please note, that unlike native CKEditor&nbsp;5 plugins, this one is imported from its own package. Also, that this import is different than the standard CKEditor&nbsp;5 plugins import:

```js
import { ClassicEditor } from 'ckeditor5';
import { WProofreader } from '@webspellchecker/wproofreader-ckeditor5';

import '@webspellchecker/wproofreader-ckeditor5/index.css';

ClassicEditor
	.create( editorElement, {
		licenseKey: '<YOUR_LICENSE_KEY>', // Or 'GPL'.
		plugins: [ WProofreader, /* ...], */ ]
		toolbar: [ 'wproofreader', /* ... */ ]
		wproofreader: {
			// Configuration.
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

At this step, you need to provide a proper configuration. You can use WProofreader either as a [cloud solution](#wproofreader-cloud) or [hosted on your server](#wproofreader-on-premises) (on-premises or in a private cloud).

### WProofreader Cloud

After signing up for a [trial or paid version](https://ckeditor.com/contact/), you will receive your service ID on your email. You can use it to activate the service.

Add the following configuration to your editor:

```js
ClassicEditor
	.create( editorElement, {
		// ... Other configuration options ...
		wproofreader: {
			serviceId: 'your-service-ID',
			srcUrl: 'https://svc.webspellchecker.net/spellcheck31/wscbundle/wscbundle.js'
		}
	} )
```

Refer to the [official documentation](https://github.com/WebSpellChecker/wproofreader-ckeditor5#install-instructions) for more details about the cloud setup and available configuration options.

### WProofreader on-premises

After signing up for a [trial or paid version](https://ckeditor.com/contact/), you will receive access to the WebSpellChecker on-premises package to install it on your server.

You will need to add the following configuration to your editor:

```js
ClassicEditor
	.create( editorElement, {
		// ... Other configuration options ...
		wproofreader: {
			serviceProtocol: 'https',
			serviceHost: 'localhost',
			servicePort: '443',
			servicePath: 'virtual_directory/api/',
			srcUrl: 'https://host_name/virtual_directory/wscbundle/wscbundle.js'
		}
	} )
```

Refer to the [official documentation](https://github.com/WebSpellChecker/wproofreader-ckeditor5#install-instructions) for more details about the server setup and available configuration options.

## Configuration

WProofreader configuration is set inside the CKEditor&nbsp;5 configuration in the `wproofreader` object. Refer to the [WProofreader API](https://webspellchecker.com/docs/api/wscbundle/Options.html) for further information.

## Contribute

You can report issues and request features in the [official WProofreader for CKEditor&nbsp;5 repository](https://github.com/WebSpellChecker/wproofreader-ckeditor5/issues).
