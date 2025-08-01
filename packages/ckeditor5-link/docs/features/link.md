---
title: Link
meta-title: Links | CKEditor 5 Documentation
meta-description: Add, edit, and customize links in CKEditor 5 to easily connect your content to external URLs, email addresses, or internal resources.
category: features
modified_at: 2025-04-07
---

The link feature lets you insert hyperlinks into your content and provides a UI to create and edit them. Thanks to the [autolink](#autolink-feature) plugin, typed or pasted URLs and email addresses automatically become working links.

## Demo

Use the link toolbar button {@icon @ckeditor/ckeditor5-icons/theme/icons/link.svg Link} or press <kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>K</kbd> to create a new link. Clicking a link opens a contextual toolbar. The toolbar lets you edit existing links {@icon @ckeditor/ckeditor5-icons/theme/icons/pencil.svg Edit link} or unlink them {@icon @ckeditor/ckeditor5-icons/theme/icons/unlink.svg Unlink} with a click.

{@snippet features/link}

<snippet-footer>
	This demo presents a limited set of features. Visit the {@link examples/builds/full-featured-editor feature-rich editor example} to see more in action.
</snippet-footer>

## Typing around links

CKEditor&nbsp;5 allows typing at the inner and outer link boundaries to make editing simpler for the users.

**To type inside a link**, move the caret to its (start or end) boundary. As long as the link remains highlighted (by default: blue), typing and applying formatting happens within its boundaries:

{@img assets/img/typing-inside.gif 770 The animation shows typing inside the link in CKEditor&nbsp;5 rich text editor.}

**To type before or after a link**, move the caret to its boundary, then press the Arrow key (<kbd>←</kbd> or <kbd>→</kbd>) away from the link once. The link stops from being highlighted, and whatever text you type or formatting apply will not be inside the link:

{@img assets/img/typing-before.gif 770 The animation shows typing before the link in CKEditor&nbsp;5 rich text editor.}

## Installation

After {@link getting-started/integrations-cdn/quick-start installing the editor}, add the feature to your plugin list and toolbar configuration:

<code-switcher>
```js
import { ClassicEditor, AutoLink, Link } from 'ckeditor5';

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		licenseKey: '<YOUR_LICENSE_KEY>', // Or 'GPL'.
		plugins: [ Link, AutoLink, /* ... */ ],
		toolbar: [ 'link', /* ... */ ],
		link: {
			// Configuration.
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```
</code-switcher>

## Link toolbar configuration

The link UI contains a contextual toolbar that appears when a link is selected. You can configure what items appear in this toolbar using the {@link module:link/linkconfig~LinkConfig#toolbar `config.link.toolbar`} option.

The following toolbar items are available:

* `'linkPreview'` &ndash; Shows a preview of the link URL that you can click to open the link in a new tab.
* `'editLink'` &ndash; Opens a form to edit the link URL and options.
* `'linkProperties'` &ndash; Opens a panel to configure link properties (manual decorators). Only available when at least one manual decorator is defined.
* `'unlink'` &ndash; Removes the link.

By default, the link toolbar is configured as follows:

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		link: {
			toolbar: [ 'linkPreview', '|', 'editLink', 'linkProperties', 'unlink' ]
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

### Custom toolbar items

You can extend the link toolbar with custom items by registering them in the {@link module:ui/componentfactory~ComponentFactory component factory} and adding them to the toolbar configuration.

Here is an example of registering a custom component:

```js
class MyCustomPlugin extends Plugin {
	init() {
		const editor = this.editor;

		editor.ui.componentFactory.add( 'myCustomLinkInfo', locale => {
			const button = new ButtonView( locale );
			const linkCommand = editor.commands.get( 'link' );

			button.bind( 'isEnabled' ).to( linkCommand, 'value', href => !!href );
			button.bind( 'label' ).to( linkCommand, 'value' );

			button.on( 'execute', () => {
				// Add your custom component logic here
			} );

			return button;
		} );
	}
}
```

Once registered, the component can be used in the toolbar configuration:

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		plugins: [ MyCustomPlugin, /* ... */ ],
		link: {
			toolbar: [ 'myCustomLinkInfo', '|', 'editLink', 'unlink' ]
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

<info-box>
	The `linkProperties` item is only shown when manual decorators are configured through {@link module:link/linkconfig~LinkConfig#decorators `config.link.decorators`}. See the [custom link attributes](#custom-link-attributes-decorators) section for more details.
</info-box>

## Custom link attributes (decorators)

By default, all links created in the editor have the `href="..."` attribute in the {@link getting-started/setup/getting-and-setting-data#getting-the-editor-data-with-getdata editor data}. If you want your links to have additional link attributes, {@link module:link/linkconfig~LinkConfig#decorators link decorators} provide an easy way to configure and manage them.

There are two types of link decorators you can use:

* [**Automatic**](#adding-attributes-to-links-based-on-predefined-rules-automatic-decorators) &ndash; They match links against predefined rules and manage their attributes based on the results.
* [**Manual**](#adding-attributes-to-links-using-the-ui-manual-decorators) &ndash; They allow users to control link attributes individually using the editor UI.

<info-box>
	Link decorators are turned off by default and it takes a proper [configuration](#configuration) to enable them in your rich-text editor.
</info-box>

### Demo

In the editor below, all **external** links get the `target="_blank"` and `rel="noopener noreferrer"` attributes ([automatic decorator](#adding-attributes-to-links-based-on-predefined-rules-automatic-decorators)). Click a link and edit it {@icon @ckeditor/ckeditor5-icons/theme/icons/settings.svg Edit link} to see that you can control the `download` attribute of specific links using the switch button in the editing balloon ([manual decorator](#adding-attributes-to-links-using-the-ui-manual-decorators)).

{@snippet features/linkdecorators}

The following code runs this editor. Learn more about the [configuration](#configuration) of the feature.

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		link: {
			// Automatically add target="_blank" and rel="noopener noreferrer" to all external links.
			addTargetToExternalLinks: true,

			// Let the users control the "download" attribute of each link.
			decorators: [
				{
					mode: 'manual',
					label: 'Downloadable',
					attributes: {
						download: 'download'
					}
				}
			]
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

### Configuration

You can configure decorators through definitions provided in the {@link module:link/linkconfig~LinkConfig#decorators `config.link.decorators`} configuration option.

Each decorator definition must have a unique name. For [manual decorators](#adding-attributes-to-links-using-the-ui-manual-decorators), the name also represents the decorator in the {@link framework/architecture/editing-engine#text-attributes document model}.

<info-box warning>
	Link decorators work independently of one another and no conflict resolution mechanism exists. For example, configuring the `target` attribute using both an automatic and a manual decorator at the same time could end up with quirky results. The same applies if you define more manual or automatic decorators for the same attribute.
</info-box>

#### Adding `target` and `rel` attributes to external links

A common use case for (automatic) link decorators is adding the `target="_blank"` and `rel="noopener noreferrer"` attributes to all external links in the document. A dedicated {@link module:link/linkconfig~LinkConfig#addTargetToExternalLinks `config.link.addTargetToExternalLinks`} configuration exists for that purpose. When you set this option to `true`, all links starting with `http://`, `https://`, or `//` are "decorated" with `target` and `rel` attributes.

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		link: {
			addTargetToExternalLinks: true
		}
		// More of the editor's configuration.
			// ...
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

Internally, this configuration corresponds to an [automatic decorator](#adding-attributes-to-links-based-on-predefined-rules-automatic-decorators) with the following {@link module:link/linkconfig~LinkDecoratorAutomaticDefinition definition}:

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		link: {
			decorators: {
				addTargetToExternalLinks: {
					mode: 'automatic',
					callback: url => /^(https?:)?\/\//.test( url ),
					attributes: {
						target: '_blank',
						rel: 'noopener noreferrer'
					}
				}
			}
		}
		// More of the editor's configuration.
			// ...
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

If you want to leave the decision whether a link should open in a new tab to the users, do not use the `config.link.addTargetToExternalLinks` configuration. Define a new [manual decorator](#adding-attributes-to-links-using-the-ui-manual-decorators) with the following definition instead:

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		link: {
			decorators: {
				openInNewTab: {
					mode: 'manual',
					label: 'Open in a new tab',
					attributes: {
						target: '_blank',
						rel: 'noopener noreferrer'
					}
				}
			}
		}
		// More of the editor's configuration.
			// ...
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

#### Adding default link protocol to external links

A default link protocol can be useful when the user forgets to type the full URL address to an external source or website. Sometimes copying the text, like for example `ckeditor.com`, and converting it to a link may cause some issues. As a result, the created link will direct you to `yourdomain.com/ckeditor.com` because of the missing protocol. This makes the link relative to the site where it appears.

After you enable the {@link module:link/linkconfig~LinkConfig#defaultProtocol `config.link.defaultProtocol`} configuration option, the link feature will be able to handle this issue for you. By default, it does not fix the passed link value, but when you set {@link module:link/linkconfig~LinkConfig#defaultProtocol `config.link.defaultProtocol`} to, for example, `http://`, the plugin will add the given protocol to every link that may need it (like `ckeditor.com`, `example.com`, etc. where `[protocol://]example.com` is missing).

See a basic configuration example:

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		link: {
			defaultProtocol: 'http://'
		}
		// More of the editor's configuration.
			// ...
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

<info-box>
	With the {@link module:link/linkconfig~LinkConfig#defaultProtocol `config.link.defaultProtocol`} option enabled, you are still able to link things locally using `#` or `/`. The protocol will not be added to these links.

	When enabled, this feature also provides the **email address autodetection** feature. When you submit `hello@example.com` in your content, the plugin will automatically change it to `mailto:hello@example.com`.
</info-box>

#### Adding custom protocols in links

By default, a minimal set of protocols is allowed to be used in the links. Any URL with an unrecognized protocol will be changed to '#'. You can overwrite the list of protocols by using {@link module:link/linkconfig~LinkConfig#allowedProtocols `config.link.allowedProtocols`}.

See a configuration example:

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		link: {
			// You can use `s?` suffix like below to allow both `http` and `https` protocols at the same time.
			allowedProtocols: [ 'https?', 'tel', 'sms', 'sftp', 'smb', 'slack' ]
		}
		// More of the editor's configuration.
		// ...
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

<info-box warning>
	Please remember that you customize this list at your own risk &ndash; adding unsafe protocols like `javascript` can lead to serious security vulnerabilities!
</info-box>

#### Adding attributes to links based on predefined rules (automatic decorators)

Automatic link decorators match all links in the editor content against a {@link module:link/linkconfig~LinkDecoratorAutomaticDefinition function} which decides whether the link should receive some set of attributes, considering the URL (`href`) of the link. These decorators work silently and the editor applies them during the {@link framework/architecture/editing-engine#conversion data downcast}.

For instance, to create an automatic decorator that adds the `download="file.pdf"` attribute to all links ending with the `".pdf"` extension, you should add the following {@link module:link/linkconfig~LinkDecoratorAutomaticDefinition definition} to {@link module:link/linkconfig~LinkConfig#decorators `config.link.decorators`}:

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		link: {
			decorators: {
				detectDownloadable: {
					mode: 'automatic',
					callback: url => url.endsWith( '.pdf' ),
					attributes: {
						download: 'file.pdf'
					}
				}
			}
		}
		// More of the editor's configuration.
		// ...
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

<info-box>
	If you want add the `target` and `rel` attributes to all external links in your content, we prepared a [dedicated configuration](#adding-target-and-rel-attributes-to-external-links) for that purpose. Thanks to this, you do not have to define the automatic decorator by yourself.
</info-box>

#### Adding attributes to links using the UI (manual decorators)

Manual link decorators are represented in the link editing balloon as switch buttons. The users can use them to control the presence of attributes of a particular link (check out the [demo](#demo) to learn more). Each manual decorator {@link module:link/linkconfig~LinkDecoratorManualDefinition definition} has a human-readable label displayed next to the switch button in the link editing balloon. Make sure it is compact and precise for the convenience of the users.

To configure a "Downloadable" switch button in the link editing balloon that adds the `download="file"` attribute to the link when turned on, add the following definition to {@link module:link/linkconfig~LinkConfig#decorators `config.link.decorators`}:

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		link: {
			decorators: {
				toggleDownloadable: {
					mode: 'manual',
					label: 'Downloadable',
					attributes: {
						download: 'file'
					}
				},
				openInNewTab: {
					mode: 'manual',
					label: 'Open in a new tab',
					defaultValue: true,			// This option will be selected by default.
					attributes: {
						target: '_blank',
						rel: 'noopener noreferrer'
					}
				}
			}
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

## Autolink feature

The {@link module:link/autolink~AutoLink `AutoLink`} feature will automatically turn URLs or email addresses into working links.

To use the autolink function, press <kbd>Space</kbd>, <kbd>Enter</kbd>, or <kbd>Shift</kbd>+<kbd>Enter</kbd> after a link.

<info-box>
	You can always revert autolinking by the undo feature (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd>+<kbd>Z</kbd>) or the backspace (<kbd>⌫</kbd>) button.
</info-box>

{@snippet features/autolink}

## Link providers

### Demo

The link feature integrates with {@link features/bookmarks bookmarks}, providing a smooth linking experience. Link providers allow adding predefined lists of links (similar to bookmarks). You can register any links you would like to use frequently in your content in the Link plugin using a custom method. These links will be available in the link UI form for easy access.

{@snippet features/link-providers}

### Configuration

To define a list of links available in the link UI, you can use the `getListItems()` function in the link provider. Opening the group in the link UI calls the function every time. The function should return an array of objects, each representing a link.

The `getItem()` function can resolve the link. Opening the link preview or navigating to the link from the editing view calls the function. It should return an object with the `href`, `icon`, `label`, and `tooltip` parameters. The properties are assigned to the link preview. It is useful when only part of the list items are shown in the list view (for example, in pagination), and the user interacts with a link that is not visible in the list view but is available in the editing.

```js
class SocialLinksPlugin extends Plugin {
	static get requires() {
		return [ Link ];
	}

	async init() {
		const linkUI = this.editor.plugins.get( LinkUI );

		linkUI.registerLinksListProvider( {
			label: 'Social links',
			getListItems: () => [
				{
					id: 'facebook',
					href: 'https://facebook.com',
					label: 'Facebook',
					icon: linkIcon
				},
				{
					id: 'twitter',
					href: 'https://twitter.com',
					label: 'Twitter',
					icon: linkIcon
				}
			],

			// Optionally: You can customize your link preview by custom implementation of link getter.
			getItem: href => {
				return {
					href,
					icon: linkIcon,
					label: 'My custom label in link preview',
					tooltip: 'My custom tooltip in link preview'
				};
			}
		} );
	}
}
```

## Common API

The {@link module:link/link~Link} plugin registers the UI button component (`'link'`) and the following commands:

* The `'link'` command implemented by {@link module:link/linkcommand~LinkCommand}.
* The `'unlink'` command implemented by {@link module:link/unlinkcommand~UnlinkCommand}.

You can execute the commands using the {@link module:core/editor/editor~Editor#execute `editor.execute()`} method:

```js
// Applies the link to the selected content.
// When the selection is collapsed, it creates new text wrapped in a link.
editor.execute( 'link', 'http://example.com' );

// If there are decorators configured, the command can set their state.
editor.execute( 'link', 'http://example.com', { linkIsExternal: true } );

// Removes the link from the selection (and all decorators if present).
editor.execute( 'unlink' );
```

The package provides a plugin for {@link module:link/linkimage~LinkImage linking images}. See the {@link features/images-linking Linking images} guide in the {@link features/images-overview Images section}.

Links are represented in the {@link module:engine/model/model~Model model} using the `linkHref` attribute. [Manual link decorators](#adding-attributes-to-links-using-the-ui-manual-decorators) are represented in the model using text attributes corresponding to their names, as configured in {@link module:link/linkconfig~LinkConfig#decorators `config.link.decorators`}.

<info-box>
	We recommend using the official {@link framework/development-tools/inspector CKEditor&nbsp;5 inspector} for development and debugging. It will give you tons of useful information about the state of the editor such as internal data structures, selection, commands, and many more.
</info-box>

## Contribute

The source code of the feature is available on GitHub at [https://github.com/ckeditor/ckeditor5/tree/master/packages/ckeditor5-link](https://github.com/ckeditor/ckeditor5/tree/master/packages/ckeditor5-link).
