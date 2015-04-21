var App = function() {
    var codeMirror = null;
    var files = null;
    var lastMouseY = null;
    var diffTop = null;
    var headerBarHeight = 35;
    var sourceInfoHeight = 22;
    function handleViewportSizeChange(first) {
        var w = $(window).width();
        var h = $(window).height();
        //console.log('viewport size changed, width: ' + w + ', height: ' + h);
        if (codeMirror && codeMirror.getOption("fullScreen")) {
            return;
        }
        var contentHeight = h-headerBarHeight;
        if (contentHeight >= 0) {
            $("#content").css('height',contentHeight);
            contentHeight -= sourceInfoHeight;
            var codingHeight = parseFloat($("#content #coding").css('height'));
            var consoleHeight = parseFloat($("#content #console").css('height'));
            var ratio = 0.5;
            if (first || codingHeight <= 0 || consoleHeight <= 0) {
                ratio = 0.5;
            } else {
                var total = codingHeight + consoleHeight;
                ratio = codingHeight / (codingHeight + consoleHeight);
            }
            codingHeight = contentHeight * ratio;
            consoleHeight = contentHeight - codingHeight;
            changeContentHeight(codingHeight, consoleHeight);
        }
    }
    function adjustView(sourceInfoTop) {
        var h = $(window).height();
        sourceInfoTop -= headerBarHeight;
        var contentHeight = h-headerBarHeight;
        if (contentHeight >= 0) {
            var codingHeight = sourceInfoTop;
            var consoleHeight = contentHeight - codingHeight - sourceInfoHeight;
            changeContentHeight(codingHeight, consoleHeight);
        }
    }
    function changeContentHeight(codingHeight, consoleHeight) {
        $("#content #coding").css('height',codingHeight);
        $("#content #console").css('height',consoleHeight);
        if (codeMirror) {
            codeMirror.setSize(null, codingHeight);
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
            theme: "lesser-dark",
            mode: "text/x-c++src",
            extraKeys: {
                'Tab': function(cm) {
                    var spaces = new Array(cm.getOption("indentUnit") + 1).join(" ");
                    cm.replaceSelection(spaces);
                },
                'Esc': function(cm) {
                    toggleFullScreen(true);
                },
                'F11': function(cm) {
                    toggleFullScreen(false);
                }
            },
            styleActiveLine: true,
        });
        $('#space-info').text('Space: ' + 4); 
        codeMirror.on('cursorActivity', function() {
            var cur = codeMirror.getCursor();
            $('#line-info').text((cur.line+1)+':'+(cur.ch+1));
        });
    }
    function makeDraggable() {
    }
    function setupDropdown() {
    }
    function toggleFullScreen(close) {
        var fullScreen = codeMirror.getOption('fullScreen');
        codeMirror.setOption("fullScreen", close ? false : !fullScreen);
        fullScreen = codeMirror.getOption('fullScreen');
        if (fullScreen) {
            $('#full-screen-close-text').show();
        } else {
            handleViewportSizeChange();
            $('#full-screen-close-text').hide();
        }
    }
    function registerEventHandler() {
        $(window).resize(function() {
            handleViewportSizeChange();
        });
        $('.editor-fullscreen').click(function() {
            toggleFullScreen();
        });
        $("#source-info").mousedown(function(e) {
            e.preventDefault();
            var viewTop = $(this).position().top;
            var mouseY = e.pageY;
            //console.log('viewTop: ' + viewTop + ', mouseY: ' + mouseY);
            diffTop = mouseY - viewTop - headerBarHeight;
            //console.log('diffTop: ' + diffTop);
        });
        $('#container').mousemove(function(e) {
            if (diffTop) {
                e.preventDefault();
                //console.log('view: ' + $(this).position().top);
                //console.log('coding height: ' + $("#content #coding").css('height'));
                //console.log('diffTop: ' + diffTop + ' y: ' + e.pageY);
                adjustView(e.pageY-diffTop);
            }
        }).mouseup(function(e) {
            if (diffTop) {
                e.preventDefault();
                diffTop = null;
            }
        });
    }
    function makeTree(data) {
        var treeChildren = [];
        data.forEach(function(elem, index, arr) {
            treeChildren.push({
                'text': elem.file,
                'icon': 'fa fa-file-code-o tree-file',
                'data': elem,
                'id': elem.id
            });
        });
        files = data;
        var treeConfig = {
            'core': {
                'data': [
                    {
                        'text': '~/',
                        'state': {'opened': true},
                        'icon': 'fa fa-folder-open-o',
                        'children': treeChildren,
                        'id': 'tree-root'
                    }
                ],
                "themes" : { "name" : "default-dark" }
            }
        };
        $('#sidebar-tree').jstree(treeConfig);
        $('#sidebar-tree').on('changed.jstree', function(e, d) {
            if (d.node.icon && d.node.icon.includes('tree-file')) {
                loadFile(d.node.data.file, d.node.data.mime, d.node.data.language);
            }
        });
        $('#sidebar-tree').contextMenu({
            selector: 'a.jstree-anchor:has(.tree-file)',
            callback: function(key, options) {
                var elementId = $(this).attr('id');
                console.log('element id: ' + elementId);
                console.log('key: ' + key);
                console.log('options: ' + options);
                var fileId = elementId.replace('_anchor','');
                if (key == 'open') {
                    openFileWithId(fileId);
                } else if (key == 'rename') {
                    renameFileWithId(fileId);
                }
            },
            items: {
                'open': {name: '열기'},
                'rename': {name: '이름 바꾸기'}
            }
        });
    }
    function loadSource(sourceCode, mime, language) {
        var doc = CodeMirror.Doc(sourceCode, mime, 0);
        codeMirror.swapDoc(doc);
        //codeMirror.setValue(sourceCode);
        /*
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
        }*/
        $('#language-info').text(language);
        codeMirror.focus();
    }

    function loadFile(filename, mime, language) {
        $.ajax('/samples/'+filename).done(function(res) {
            loadSource(res, mime, language);
        });
    }
    function openFileWithId(fileId) {
        $("#sidebar-tree .jstree-clicked").removeClass('jstree-clicked');
        files.forEach(function(elem, index, arr) {
            if (elem.id == fileId) {
                $("#sidebar-tree a#"+elem.id+"_anchor").addClass('jstree-clicked');
                loadFile(elem.file, elem.mime, elem.language);
            }
        });
    }
    function renameFile(a, temp) {
        if (temp.val() !== '') {
            a.contents().last()[0].textContent = temp.val();
        }
        temp.remove();
        a.show();
    }
    function renameFileWithId(fileId) {
        var a = $("#sidebar-tree a#"+fileId+"_anchor");
        var temp = $('<input name="rename" type="text">');
        a.hide();
        a.after(temp);
        temp.focus();
        temp.val(a.text());
        var lastDot = a.text().lastIndexOf('.');
        if (lastDot != -1) {
            temp.selectRange(lastDot);
        }
        temp.blur(function() {
            renameFile(a,$(this));
        }).keyup(function(e) {
            if (e.keyCode == 13) {
                renameFile(a,$(this));
            }
        });
    }

    return {
        init: function() {
            setupCodemirror();
            handleViewportSizeChange(true);
            registerEventHandler();
            makeDraggable();
        },
        makeTree: function(data) {
            makeTree(data);
        }
    };
}();
