---
category: features-image-upload
menu-title: Simple upload adapter
meta-title: Simple upload adapter | CKEditor 5 Documentation
meta-description: Upload images to your server in CKEditor 5 using the Simple Upload Adapter for easy, direct image handling with minimal configuration.
order: 60
---

# Simple upload adapter

The simple upload adapter lets you upload images to your server using the [`XMLHttpRequest`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) API with a minimal [editor configuration](#configuration). See the [Server-side configuration](#server-side-configuration) section to learn about the requirements for your server-side application.

## Installation

After {@link getting-started/integrations-cdn/quick-start installing the editor}, add the feature to your plugin list and toolbar configuration:

<code-switcher>
```js
import { ClassicEditor, SimpleUploadAdapter } from 'ckeditor5';

ClassicEditor
	.create( document.querySelector( '#editor' ), {
		licenseKey: '<YOUR_LICENSE_KEY>', // Or 'GPL'.
		plugins: [ SimpleUploadAdapter, /* ... */ ],
		toolbar: [ /* ... */ ],
		simpleUpload: {
			// Configuration.
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```
</code-switcher>

## Configuration

The client side of this feature is configurable using the {@link module:upload/uploadconfig~SimpleUploadConfig `config.simpleUpload`} object.

```js
ClassicEditor
	.create( document.querySelector( '#editor' ), {
		// ... Other configuration options ...
		simpleUpload: {
			// The URL that the images are uploaded to.
			uploadUrl: 'http://example.com',

			// Enable the XMLHttpRequest.withCredentials property.
			withCredentials: true,

			// Headers sent along with the XMLHttpRequest to the upload server.
			headers: {
				'X-CSRF-TOKEN': 'CSRF-Token',
				Authorization: 'Bearer <JSON Web Token>'
			}
		}
	} )
	.then( /* ... */ )
	.catch( /* ... */ );
```

### Configuring allowed file types

The allowed file types that can be uploaded should be configured in two places:

* On the client side, in CKEditor&nbsp;5, restricting image upload through the CKEditor&nbsp;5 UI and commands.
* On the server side, in your server-side application configuration.

#### Client-side configuration

Use the {@link module:image/imageconfig~ImageUploadConfig#types `image.upload.types`} configuration option to define the allowed image MIME types that can be uploaded to CKEditor&nbsp;5.

By default, users are allowed to upload `jpeg`, `png`, `gif`, `bmp`, `webp`, and `tiff` files, but you can customize this behavior to accept, for example, SVG files.

#### Server-side configuration

It is up to you to implement any filtering mechanisms on your server to restrict the types of images that are allowed to be uploaded.

## Server-side configuration

To use this upload adapter, you must provide a server-side application that will handle the uploads and communicate with the editor, as described in the following sections.

### Communication protocol

When the image upload process is initiated, the adapter sends a [`POST`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/POST) request under {@link module:upload/uploadconfig~SimpleUploadConfig#uploadUrl `config.simpleUpload.uploadUrl`}.

You can send additional [headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers) along with the `XMLHttpRequest` to the upload server, for example, to authenticate the user, using the {@link module:upload/uploadconfig~SimpleUploadConfig#uploadUrl `config.simpleUpload.headers`} object.

If you use the {@link module:upload/uploadconfig~SimpleUploadConfig#withCredentials `config.simpleUpload.withCredentials`} configuration, you may need some [extra HTTP headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) for the cross-site request to work.

The [`responseType`](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType) of the request is always `json`. See the [Successful upload](#successful-upload) and [Error handling](#error-handling) sections to learn more.

### Successful upload

If the upload is successful, the server should return:

* An object containing the `url` property which points to the uploaded image on the server:

	```json
	{
		"url": "https://example.com/images/foo.jpg"
	}
	```

* Or an object with the `urls` property, if you want to use [responsive images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images) and the server supports it:

	```json
	{
		"urls": {
			"default": "https://example.com/images/foo.jpg",
			"800": "https://example.com/images/foo-800.jpg",
			"1024": "https://example.com/images/foo-1024.jpg",
			"1920": "https://example.com/images/foo-1920.jpg"
		}
	}
	```

	The `"default"` URL will be used in the `src` attribute of the image in the rich-text editor content. Other URLs will be used in the `srcset` attribute, allowing the web browser to select the best one for the geometry of the viewport.

The URL(s) in the server response are used:

* To display the image during the editing (as seen by the user in the editor).
* In the editor content {@link getting-started/setup/getting-and-setting-data saved to the database}.

### Error handling

If something went wrong, the server must return an object that contains the `error` property. This will cancel the upload in the editor, for example, allowing the user to select another image if the previous one was too big or did not meet some other validation criteria.

If the `error` object contains a `message`, it will be passed to the {@link module:ui/notification/notification~Notification#showWarning editor notification system} and displayed to the user. For the convenience of the users, use clear and possibly specific error messages.

```json
{
	"error": {
		"message": "The image upload failed because the image was too big (max 1.5MB)."
	}
}
```

If the `message` property is missing in the `error` object, the {@link module:ui/notification/notification~Notification#showWarning editor notification system} will display the default "Could not upload file: `[filename]`." message.

### Upload progress

This upload adapter will notify users about the [file upload progress](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/progress_event) out–of–the–box.

## What's next

Check out the comprehensive {@link features/image-upload Image upload overview} to learn more about different ways of uploading images in CKEditor&nbsp;5.

See the {@link features/images-overview Image feature guide} to find out more about handling images in CKEditor&nbsp;5 WYSIWYG editor.

## Contribute

The source code of the feature is available on GitHub at [https://github.com/ckeditor/ckeditor5/tree/master/packages/ckeditor5-upload](https://github.com/ckeditor/ckeditor5/tree/master/packages/ckeditor5-upload).
