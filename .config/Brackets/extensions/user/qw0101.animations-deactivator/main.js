define(function () {
    "use strict";
    
    var css = "*{transition: none !important;-webkit-animation: none !important;animation: none !important;box-shadow: none !important;text-shadow: none !important;}";
    
    var document = window.document;    
    var style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
});