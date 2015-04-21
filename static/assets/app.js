var App = function() {
    
    var codeMirror = null;

    function handleViewportSizeChange() {
        var w = $(window).width();
        var h = $(window).height();
        console.log('viewport size changed, width: ' + w + ', height: ' + h);
        var headerBarHeight = 35;
        var sourceInfoHeight = 22;
        var contentHeight = h-headerBarHeight;
        if (contentHeight >= 0) {
            $("#content").css('height',contentHeight);
            contentHeight -= sourceInfoHeight;
            var codingHeight = contentHeight / 2;
            var consoleHeight = contentHeight - contentHeight / 2;
            $("#content #coding").css('height',codingHeight);
            $("#content #console").css('height',consoleHeight);
            if (codeMirror) {
                codeMirror.setSize(null, codingHeight);
            }
        }
    }
    function setupCodemirror() {
        var myTextArea = document.getElementById("source");
        CodeMirror.modeURL = "/assets/codemirror/mode/%N/%N.js";
        codeMirror = CodeMirror.fromTextArea(myTextArea,{
            lineNumbers: true,
            matchBrackets: true,
            indentUnit: 4,
            autoCloseBrackets: true,
            theme: "lesser-dark"
        });
        $('#space-info').text('Space: ' + 4); 
        codeMirror.on('cursorActivity', function() {
            var cur = codeMirror.getCursor();
            $('#line-info').text((cur.line+1)+':'+(cur.ch+1));
        });
    }
    function loadSource(sourceCode, mime, language) {
        codeMirror.setValue(sourceCode);
        var mode,spec;
        var info = CodeMirror.findModeByMIME(mime);
        if (info) {
            mode = info.mode;
            spec = mime;
        }
        if (mode) {
            codeMirror.setOption('mode', spec);
            CodeMirror.autoLoadMode(codeMirror, mode);
            $('#language-info').text(language);
            codeMirror.focus();
        }
    }
    return {
        init: function() {
            setupCodemirror();
            handleViewportSizeChange();
            $(window).resize(function() {
                handleViewportSizeChange();
            });
        },
        loadSample: function(filename, mime, language) {
            $.ajax('/samples/'+filename).done(function(res) {
                loadSource(res, mime, language);
            });
        }
    };
}();
