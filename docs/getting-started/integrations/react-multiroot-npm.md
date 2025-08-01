---
menu-title: Multi-root integration
meta-title: Using CKEditor 5 with React rich text editor multi-root hook from npm | CKEditor 5 Documentation
meta-description: Install, integrate, and configure CKEditor 5 using the React multi-root hook with npm.
category: react-npm
order: 20
modified_at: 2024-04-25
---

# Integrating CKEditor&nbsp;5 with React rich text multi-root editor hook from npm

This page focuses on describing the usage of the multi-root editor in React applications. If you would like to use a different type of editor, you can find more information {@link getting-started/integrations/react-default-npm in this guide}.

<info-box hint>
	The multi-root editors in React are supported since version 6.2.0 of this package.

	Unlike the {@link getting-started/integrations/react-default-npm default integration}, we prepared the multi-root editor integration based on the hooks and new React mechanisms.
</info-box>

## Quick start

This guide assumes you already have a React project. If you want to create a new one, you can use the [Vite](https://vitejs.dev/guide/) CLI. It allows you to create and customize your project with templates. For example, you can set up your project with TypeScript support.

Install the [CKEditor&nbsp;5 WYSIWYG editor package for React](https://www.npmjs.com/package/@ckeditor/ckeditor5-react) and the {@link getting-started/setup/editor-types#multi-root-editor multi-root editor type}.

```bash
npm install ckeditor5 @ckeditor/ckeditor5-react
```

<info-box>
	Starting from version 44.0.0, the `licenseKey` property is required to use the editor. If you use a self-hosted editor from npm:

	* You must either comply with the GPL or
	* Obtain a license for {@link getting-started/licensing/license-key-and-activation self-hosting distribution}.

	You can set up [a free trial](https://portal.ckeditor.com/checkout?plan=free) to test the editor and evaluate the self-hosting.
</info-box>

Use the `useMultiRootEditor` hook inside your project:

```tsx
// App.jsx / App.tsx

import { MultiRootEditor, Bold, Essentials, Italic, Paragraph } from 'ckeditor5';
import { useMultiRootEditor } from '@ckeditor/ckeditor5-react';

import 'ckeditor5/ckeditor5.css';

const App = () => {
	const editorProps = {
		editor: MultiRootEditor,
		data: {
			intro: '<h1>React multi-root editor</h1>',
			content: '<p>Hello from CKEditor&nbsp;5 multi-root!</p>'
		},
		config: {
			licenseKey: '<YOUR_LICENSE_KEY>', // Or 'GPL'.
			plugins: [ Essentials, Bold, Italic, Paragraph ],
			toolbar: [ 'undo', 'redo', '|', 'bold', 'italic' ]
		}
	};

	const {
		editor,
		toolbarElement,
		editableElements,
		data,
		setData,
		attributes,
		setAttributes
	} = useMultiRootEditor( editorProps );

	return (
		<div className="App">
			<h2>Using CKEditor&nbsp;5 multi-root editor in React</h2>

			{ toolbarElement }

			{ editableElements }
		</div>
	);
}

export default App;
```

## Hook properties

The `useMultiRootEditor` hook supports the following properties:

* `editor: MultiRootEditor` (required) &ndash; The {@link module:editor-multi-root/multirooteditor~MultiRootEditor `MultiRootEditor`} constructor to use.
* `data: Object` &ndash; The initial data for the created editor. See the {@link getting-started/setup/getting-and-setting-data Getting and setting data} guide.
* `rootsAttributes: Object` &ndash; The initial roots attributes for the created editor.
* `config: Object` &ndash; The editor configuration. See the {@link getting-started/setup/configuration Configuration} guide.
* `disabled: Boolean` &ndash; The {@link module:editor-multi-root/multirooteditor~MultiRootEditor `MultiRootEditor`} is being switched to read-only mode if the property is set to `true`.
* `disableWatchdog: Boolean` &ndash; If set to `true`, {@link features/watchdog the watchdog feature} will be disabled. It is set to `false` by default.
* `watchdogConfig: WatchdogConfig` &ndash; {@link module:watchdog/watchdog~WatchdogConfig Configuration object} for the [watchdog feature](https://ckeditor.com/docs/ckeditor5/latest/features/watchdog.html).
* `isLayoutReady: Boolean` &ndash; A property that delays the editor creation when set to `false`. It starts the initialization of the multi-root editor when sets to `true`. Useful when the CKEditor&nbsp;5 annotations or a presence list are used.
* `disableTwoWayDataBinding: Boolean` &ndash; Allows disabling the two-way data binding mechanism between the editor state and `data` object to improve editor efficiency. The default value is `false`.
* `onReady: Function` &ndash; It is called when the editor is ready with a {@link module:editor-multi-root/multirooteditor~MultiRootEditor `MultiRootEditor`} instance. This callback is also called after the reinitialization of the component if an error occurred.
* `onChange: Function` &ndash; It is called when the editor data has changed. See the {@link module:engine/model/document~ModelDocument#event:change:data `editor.model.document#change:data`} event.
* `onBlur: Function` &ndash; It is called when the editor was blurred. See the {@link module:engine/view/document~ViewDocument#event:blur `editor.editing.view.document#blur`} event.
* `onFocus: Function` &ndash; It is called when the editor was focused. See the {@link module:engine/view/document~ViewDocument#event:focus `editor.editing.view.document#focus`} event.
* `onError: Function` &ndash; It is called when the editor has crashed during the initialization or during the runtime. It receives two arguments: the error instance and the error details.
  Error details is an object that contains two properties:
  * `phase: 'initialization'|'runtime'` &ndash; Informs when an error has occurred (during the editor or context initialization, or after the initialization).
  * `willEditorRestart: Boolean` &ndash; If set to `true`, the editor component will restart itself.

The editor event callbacks (`onChange`, `onBlur`, `onFocus`) receive two arguments:

1. An {@link module:utils/eventinfo~EventInfo `EventInfo`} object.
2. An {@link module:editor-multi-root/multirooteditor~MultiRootEditor `MultiRootEditor`} instance.

## Hook values

The `useMultiRootEditor` hook returns the following values:

* `editor` &ndash; The instance of created editor.
* `toolbarElement` &ndash; `ReactElement` that contains the toolbar. It could be rendered anywhere in the application.
* `editableElements` &ndash; An array of `ReactElements` that describes the editor's roots. This array is updated after detaching an existing root or adding a new root.
* `data` &ndash; The current state of the editor's data. It is updated after each editor update. Note that you should not use it if you disabled two-way binding by passing the `disableTwoWayDataBinding` property.
* `setData` &ndash; The function used for updating the editor's data.
* `attributes` &ndash; The current state of the editor's attributes. It is updated after each editor attributes update. Note that you should not use it if you disabled two-way binding by passing the `disableTwoWayDataBinding` property.
* `setAttributes` &ndash; The function used for updating the editor's attributes.

## Context feature

The `useMultiRootEditor` hook also supports the {@link features/context-and-collaboration-features context feature}, as described in the main {@link getting-started/integrations/react-default-npm#context-feature React integration} guide.

However, as the multi-root editor addresses most use cases of the context feature, consider if you need to employ it.

## Two-way data binding

By default, the two-way data binding is enabled. It means that every change done in the editor is automatically applied in the `data` object returned from the `useMultiRootEditor` hook. Additionally, if you want to change or set data in the editor, you can simply use `setData` method provided by the hook. It works the same way in case of attributes &ndash; the hook provides the `attributes` object and the `setAttributes` method to update them. It ensures that if you want to use or save the state of the editor, these objects are always up-to-date.

<info-box>
	Two-way data binding may lead to performance issues with large editor content. In such cases, it is recommended to disable it by setting the `disableTwoWayDataBinding` property to `true` when using the `useMultiRootEditor` hook. When this is disabled, you will need to handle data synchronization manually if it is needed.

	The recommended approach for achieving this is based on utilizing the {@link features/autosave autosave plugin}. The second approach involves providing the `onChange` callback, which is called on each editor update.
</info-box>

## How to?

### Using the editor with collaboration plugins

We provide several **ready-to-use integration** featuring collaborative editing with multi-root in React applications:

* [CKEditor&nbsp;5 multi-root with real-time collaboration features and revision history features](https://github.com/ckeditor/ckeditor5-collaboration-samples/tree/master/real-time-collaboration-editor-multi-root-for-react)

It is not necessary to build applications on top of the above samples, however, they should help you get started.

## Contributing and reporting issues

The source code of rich text editor component for React is available on GitHub in [https://github.com/ckeditor/ckeditor5-react](https://github.com/ckeditor/ckeditor5-react).

## Next steps

* See how to manipulate the editor's data in the {@link getting-started/setup/getting-and-setting-data Getting and setting data} guide.
* Refer to further guides in the {@link getting-started/setup/configuration setup section} to see how to customize your editor further.
* Check the {@link features/index features category} to learn more about individual features.
