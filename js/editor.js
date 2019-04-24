OCA.Files_Markdown = {
	markdownItPromise: null,
	highlightLoadPromise: null,
	katexLoadPromise: null,
	texmathLoaded: false
};

OCA.Files_Markdown.Preview = function () {
	this.renderer = null;
	this.head = document.head;
	this.preview = _.throttle(this.previewText, 500);
};

OCA.Files_Markdown.Preview.prototype = {
	init: function () {
		var getUrl = this.getUrl.bind(this);

		$.when(
			this.loadMarkdownIt(),
			this.loadHighlight(),
			this.loadKatex()
		).then(function () {
			this.renderer = window.markdownit();
			this.renderer.image = function (href, title, text) {
				var out = '<img src="' + getUrl(href) + '" alt="' + text + '"';
				if (title) {
					out += ' title="' + title + '"';
				}
				out += this.options.xhtml ? '/>' : '>';
				return out;
			};

		}.bind(this));
		this.loadTexmath();
	},

	getUrl:  function (path) {
		if (!path) {
			return path;
		}
		if (path.substr(0, 7) === 'http://' || path.substr(0, 8) === 'https://' || path.substr(0, 3) === '://') {
			return path;
		} else {
			if (path.substr(0, 1) !== '/') {
				path = OCA.Files_Texteditor.file.dir + '/' + path;
			}
			return OC.generateUrl('apps/files/ajax/download.php?dir={dir}&files={file}', {
				dir: OC.dirname(path),
				file: OC.basename(path)
			});
		}
	},

	previewText: function (text, element) {
		OCA.Files_Markdown.Preview.addActions();
		var md = OCA.Files_Markdown.MarkdownIt();
		var html = md.render(OCA.Files_Markdown.Preview.prepareText(text));
		element.html(html);
	},

	loadMarkdownIt: function () {
		if (!OCA.Files_Markdown.markdownItLoadPromise) {
			OCA.Files_Markdown.markdownItLoadPromise = OC.addScript('files_markdown', 'markdown-it');
		}
		return OCA.Files_Markdown.markdownItLoadPromise;
	},

	loadHighlight: function () {
		if (!OCA.Files_Markdown.highlightLoadPromise) {
			OCA.Files_Markdown.highlightLoadPromise = OC.addScript('files_markdown', 'highlight.pack');
		}
		return OCA.Files_Markdown.highlightLoadPromise;
	},

	loadTexmath: function () {
		if (!OCA.Files_Markdown.texmathLoaded) {
                var path = OC.filePath('files_markdown', 'js', 'texmath.js');
	                //insert using native dom to prevent jquery from removing the script tag
	                script = document.createElement("script");
        	        script.src = path;
	                this.head.appendChild(script);
			OCA.Files_Markdown.texmathLoaded = 'true'
		}
	},

	loadKatex: function () {
		if (!OCA.Files_Markdown.katexLoadPromise) {
			OCA.Files_Markdown.katexLoadPromise = OC.addScript('files_markdown', 'katex');
		}
		return OCA.Files_Markdown.katexLoadPromise;
	}
};

OCA.Files_Markdown.MarkdownIt = function () {
	OCA.Files_Markdown.Preview.prototype.loadTexmath();
	var tm = texmath.use(katex);
	var md = window.markdownit({
		highlight: function (str, lang) {
			if (lang && hljs.getLanguage(lang)) {
				try {
					return '<pre class="hljs"><code>' +
					hljs.highlight(lang, str, true).value +
					'</code></pre>';
				} catch (__) {}
			}
			return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
		}
	});
	md.use(tm, {delimiters:'dollars',macros:{"\\RR": "\\mathbb{R}"}});
	return md;
}

OCA.Files_Markdown.Preview.prepareText = function (text) {
	text = text.trim();
	if (text.substr(0, 3) === '+++') {
		text = text.substr(3);
		text = text.substr(text.indexOf('+++') + 3);
	}

	return text;
};

OCA.Files_Markdown.Preview.addActions = function () {
	editor_controls = $('#editor_controls');
	if (editor_controls.data('md_toggles') !== 'true') {	
		// Add a border to the bottom of the editor controls panel
		editor_controls.addClass('md-header');
		// Unbind text editor close on click outside of editor
		$(document).unbind('mouseup', OCA.Files_Texteditor._onClickDocument);

		// Add view controls
		$('<button id="md-view-preview">').text('Preview').addClass("editor_control").appendTo('#editor_controls');
		$("#md-view-preview" ).bind( "click", function() { OCA.Files_Markdown.Preview.toggleView('preview', this); });
		$('<button id="md-view-sidebyside">').text('Side By Side').addClass("editor_control").appendTo('#editor_controls');
		$("#md-view-sidebyside" ).bind( "click", function() { OCA.Files_Markdown.Preview.toggleView('sidebyside', this); });
		$('<button id="md-view-editor">').text('Editor').addClass("editor_control").appendTo('#editor_controls');
		$("#md-view-editor" ).bind( "click", function() { OCA.Files_Markdown.Preview.toggleView('editor', this); });
		$('#md-view-sidebyside').addClass('active');

		editor_controls.data('md_toggles', 'true');
	}
};


OCA.Files_Markdown.Preview.toggleView = function (view, button) {
	var preview = $('#preview_wrap');
	var editor = $('#editor');
	var controls = $('#editor_controls button.editor_control');
	
	controls.removeClass('active');
	preview.removeClass('md-hidden').removeClass('md-full');
	editor.removeClass('md-hidden').removeClass('md-full');

	switch(view) {
		case 'preview':
			$(button).addClass('active');
			preview.addClass('md-full');
			editor.addClass('md-hidden');
			break;
		case 'editor':
			$(button).addClass('active');
			editor.addClass('md-full');
			preview.addClass('md-hidden');
			break;
		default:
			$('#md-view-sidebyside').addClass('active');
		        preview.removeClass('md-hidden').removeClass('md-full');
		        editor.removeClass('md-hidden').removeClass('md-full');
	}
}

$(document).ready(function () {
	if (OCA.Files_Texteditor && OCA.Files_Texteditor.registerPreviewPlugin) {
		OCA.Files_Texteditor.registerPreviewPlugin('text/markdown', new OCA.Files_Markdown.Preview());
	}
});
