/*
 * Copyright (c) 2014 TheVirtual.eu Jadran Josimovic. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint nomen: true, unparam:true */
/*global define, $, brackets, window, setInterval, clearInterval, Mustache, console */

define(function (require, exports, module) {
    "use strict";

    var AppInit              = brackets.getModule('utils/AppInit'),
        CommandManager       = brackets.getModule('command/CommandManager'),
        Menus                = brackets.getModule('command/Menus'),
        Dialogs              = brackets.getModule('widgets/Dialogs'),
        ExtensionUtils       = brackets.getModule('utils/ExtensionUtils'),
        EditorManager        = brackets.getModule('editor/EditorManager'),
        CodeMirror           = brackets.getModule('thirdparty/CodeMirror2/lib/codemirror'),
        ScrollTrackMarkers   = brackets.getModule('search/ScrollTrackMarkers'),
        PreferencesManager   = brackets.getModule('preferences/PreferencesManager'),
        LanguageManager      = brackets.getModule('language/LanguageManager'),

        STYLES               = require('text!styles/styles.css'),
        PREFERENCES          = 'thevirtualeuoccur.preferences',
        PREFERENCES_TEMPLATE = require('text!htmlContent/preferences.html'),
        STRINGS              = require('strings'),

        cursor_events        = 0,
        ticker_interval      = 0,
        tick_events          = 0,
        occurrences          = [],
        occurrences_for      = '',
        prefs                = PreferencesManager.getExtensionPrefs(PREFERENCES),
        prefsBackgroundColor,
        prefsEnabled         = true,
        prefsAnim            = true,
        prefsLanguageEnabled = true;

    function clearOccurrences(editor) {
        occurrences_for = '';
        if (occurrences.length === 0) { return; }
        var cm = editor._codeMirror;
        cm.operation(function () {
            occurrences.forEach(function (markedRange) {
                markedRange.clear();
            });
            occurrences = [];
            ScrollTrackMarkers.clear();
        });
    }

    function cmSearch(cm, regex, line, start, end, sp, em) {
        var cur,
            from,
            to,
            poss = [];
        cm.operation(function () {
            cur = cm.getSearchCursor(regex, null, false);
            while (cur.find(false)) {
                from = cur.from();
                from.ch = from.ch + sp;
                to = cur.to();
                to.ch = to.ch - em;
                poss.push(cur.from());
                if ((start !== end) || (line !== from.line) || (start < from.ch) || (start > to.ch)) {
                    occurrences.push(
                        cm.markText(
                            from,
                            to,
                            {className : 'thevirtualeuoccur marking'}
                        )
                    );
                }
            }
        });
        return poss;
    }

    function findOccurrences() {
        var editor      = EditorManager.getCurrentFullEditor(),
            cm          = editor._codeMirror,
            pos         = cm.getCursor(),
            start       = pos.ch,
            end         = start,
            line        = cm.getLine(pos.line),
            word        = $.trim(cm.getSelection()),
            poss        = [];

        if (word.length === 0) {
            if (prefs.get('selected_only')) { return; }
            while (start && CodeMirror.isWordChar(line.charAt(start - 1))) { start = start - 1; }
            while (end < line.length && CodeMirror.isWordChar(line.charAt(end))) { end = end + 1; }
            if (start === end) { return; }
            word = $.trim(line.slice(start, end));
        }

        if (word.indexOf("\n") >= 0) { return; }
        if (word.length === 0) { return; }
        word = word.replace(/[\-\[\]{}()*+?.,\\$\^|#\s]/g, "\\$&");
        if (word === occurrences_for) { return; }

        clearOccurrences(editor);
        if (start !== end) { occurrences_for = word; }

        ScrollTrackMarkers.setVisible(editor, true);
        poss = cmSearch(cm, new RegExp("\\W" + word + "\\W", ''), pos.line, start, end, 1, 1);
        ScrollTrackMarkers.addTickmarks(editor, poss);
        poss = cmSearch(cm, new RegExp("^" + word + "\\W", ''), pos.line, start, end, 0, 1);
        ScrollTrackMarkers.addTickmarks(editor, poss);
        poss = cmSearch(cm, new RegExp("\\W" + word + "$", ''), pos.line, start, end, 1, 0);
        ScrollTrackMarkers.addTickmarks(editor, poss);
    }

    function ticker() {
        var $marks;

        if (cursor_events === 0) {
            cursor_events = -1;
            findOccurrences();
        } else if (cursor_events > 0) {
            cursor_events = 0;
        }

        if (!prefsAnim) { return; }
        if (occurrences.length === 0) { return; }
        tick_events = tick_events + 1;
        if ((tick_events % 3) === 0) {
            tick_events = 0;
            $marks = $('.thevirtualeuoccur-highlighting .thevirtualeuoccur');
            $marks.animate({opacity : 0.5}, 400, function () {
                $marks.animate({opacity : 1}, 400);
            });
        }
    }

    function applyNewSettings() {
        clearInterval(ticker_interval);

        var editor = EditorManager.getCurrentFullEditor(),
            language = editor.document.getLanguage();

        clearOccurrences(editor);

        prefsEnabled         = prefs.get('enabled');
        prefsLanguageEnabled = !(language._isBinary || prefs.get('exclude_' + language._id));
        prefsAnim            = prefs.get('anim');

        $('head style').each(function () {
            if ($(this).text().indexOf('.thevirtualeuoccur-prefapply') >= 0) {
                $(this).remove();
            }
        });

        if (prefs.get('background_color') !== prefsBackgroundColor) {
            ExtensionUtils.addEmbeddedStyleSheet(
                '.thevirtualeuoccur-prefapply, .thevirtualeuoccur-highlighting .marking {background-color: ' + prefs.get('background_color') + ';}'
            );
        }

        if (!prefsEnabled) { return; }
        if (!prefsLanguageEnabled) { return; }

        ticker_interval = setInterval(ticker, 1000);
    }

    function handleNewCursorPosition($event, editor, event) {
        if (!prefsEnabled) { return; }
        if (!prefsLanguageEnabled) { return; }

        cursor_events = cursor_events + 2;
        if (editor.hasSelection()) {
            ticker();
        }
    }

    function handleLanguageChange() {
        applyNewSettings();
    }

    function handleActiveEditorChange($event, current, previous) {
        if (previous !== null) {
            $(previous.getRootElement()).removeClass('thevirtualeuoccur-highlighting');
            previous.document.off('.thevirtualeuoccur');
            previous.off('.thevirtualeuoccur');
            clearOccurrences(previous);
            ScrollTrackMarkers.setVisible(previous, false);
        }

        if (current !== null) {
            current.on('cursorActivity.thevirtualeuoccur', handleNewCursorPosition);
            current.document.on('languageChanged.thevirtualeuoccur', handleLanguageChange);
            $(current.getRootElement()).addClass('thevirtualeuoccur-highlighting');
            applyNewSettings();
        }
    }

    function onPreferencesOpen() {
        var context = {
                Strings: STRINGS,
                enabled: prefs.get('enabled'),
                selected_only: prefs.get('selected_only'),
                background_color: prefs.get('background_color'),
                anim: prefs.get('anim')
            },
            dialog = Dialogs.showModalDialogUsingTemplate(Mustache.render(PREFERENCES_TEMPLATE, context)),
            $dlg = dialog.getElement(),
            langs,
            lang;

        langs = LanguageManager.getLanguages();
        for (lang in langs) {
            if (langs.hasOwnProperty(lang)) {
                $dlg.find('#thevirtualeuoccurExcludeChecklist')
                    .append('<input id="thevirtualeuoccurExclude_' +
                                lang +
                            '" type="checkbox"' +
                            (prefs.get('exclude_' + lang) ? 'checked="checked"' : ' ') +
                            '/> ' +
                                langs[lang]._name +
                            '<br/>');
            }
        }

        dialog.done(function (buttonId) {
            if (buttonId === Dialogs.DIALOG_BTN_OK) {
                var lan,
                    bgc = $.trim($dlg.find('#thevirtualeuoccurBackgroundColor').val()).toLocaleLowerCase();
                if (bgc.length === 0) { bgc = 'transparent'; }
                prefs.set('enabled', $dlg.find('#thevirtualeuoccurEnabled').prop('checked'));
                prefs.set('selected_only', $dlg.find('#thevirtualeuoccurSelectedOnly').prop('checked'));
                prefs.set('background_color', bgc);
                prefs.set('anim', $dlg.find('#thevirtualeuoccurAnim').prop('checked'));
                for (lan in langs) {
                    if (langs.hasOwnProperty(lan)) {
                        prefs.set('exclude_' + lan, $dlg.find('#thevirtualeuoccurExclude_' + lan).prop('checked'));
                    }
                }
                applyNewSettings();
            }
        });
    }

    AppInit.appReady(function () {
        prefsBackgroundColor = STYLES.split('marking_back_color')[1];

        prefs.definePreference('enabled', 'boolean', true);
        prefs.definePreference('selected_only', 'boolean', false);
        prefs.definePreference('background_color', 'string', prefsBackgroundColor);
        prefs.definePreference('anim', 'boolean', false);
        var langs = LanguageManager.getLanguages(), lang;
        for (lang in langs) {
            if (langs.hasOwnProperty(lang)) {
                prefs.definePreference('exclude_' + lang, 'boolean', false);
            }
        }

        ExtensionUtils.addEmbeddedStyleSheet(STYLES);

        CommandManager.register(STRINGS.TITLE, PREFERENCES, onPreferencesOpen);
        Menus.getMenu(Menus.AppMenuBar.EDIT_MENU).addMenuItem(PREFERENCES);

        EditorManager.on('activeEditorChange', handleActiveEditorChange);
        handleActiveEditorChange(null, EditorManager.getCurrentFullEditor(), null);
    });
});