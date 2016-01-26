/*
 * Copyright (c) july-2015 Tindo Ngoufo Arsel.
 * 
 * Licence: The MIT License (MIT).
 * Web    : https://github.com/tnga/extra.brackets-wordwrap
 * Email  : devtnga@gmail.com
 * 
 */


/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

/** Simple extension that can set enable/disable word-wrap in brackets editor */
define(function (require, exports, module) {
    
    "use strict";
    
    var CommandManager     = brackets.getModule("command/CommandManager"),
        PreferencesManager = brackets.getModule('preferences/PreferencesManager'),
        Menus              = brackets.getModule("command/Menus"),
        
        WORDWRAP_PREFERENCE = "wordWrap",
        MI_CHECK_EDITOR_WORDWRAP_ID = "editor.checkWordWrap",
        
        wordWrapCommand = null,
        editMenu = Menus.getMenu(Menus.AppMenuBar.EDIT_MENU),
        isWordWrapOn = PreferencesManager.get(WORDWRAP_PREFERENCE); // get the current status
    
    // Function to run when the editor word-wrap preference is change
    function changeWordWrapStatus() {
        // Editor word-wrap value can be manually change, so be sure to have the current status
        isWordWrapOn = PreferencesManager.get(WORDWRAP_PREFERENCE);
        
        wordWrapCommand = CommandManager.get(MI_CHECK_EDITOR_WORDWRAP_ID);
        wordWrapCommand.setChecked(isWordWrapOn);
    }
    
    // Function to run when the menu item is clicked
    // If editor word-wrap is enable when the function is call, it's desable and vis-versa
    function checkWordWrap() {
        // Editor word-wrap value can be manually change, so be sure to have the current status
        isWordWrapOn = PreferencesManager.get(WORDWRAP_PREFERENCE);
        
        var newStatus = (isWordWrapOn) ? false : true;
        
        PreferencesManager.set(WORDWRAP_PREFERENCE, newStatus);
        
        isWordWrapOn = newStatus;
    }

    
    // Register a command - a UI-less object associating an id to a handler
    CommandManager.register("Editor word-wrap", MI_CHECK_EDITOR_WORDWRAP_ID, checkWordWrap);
    //set checked status of editor word-wrap command 
    changeWordWrapStatus();
    // Create a menu item bound to the command
    // The label of the menu item is the name we gave the command (see above)
    editMenu.addMenuDivider();
    editMenu.addMenuItem(MI_CHECK_EDITOR_WORDWRAP_ID);
    // We could also add a key binding at the same time:
    //editMenu.addMenuItem(MI_CHECK_EDITOR_WORDWRAP_ID, "Ctrl-Alt-;");
    // (Note: "Ctrl" is automatically mapped to "Cmd" on Mac)
    
    //set checked status of editor word-wrap command when preference change. 
    PreferencesManager.on("change", WORDWRAP_PREFERENCE, changeWordWrapStatus);
    
    //window.alert("mi word wrap");
});