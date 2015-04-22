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
        $('#header').click(function() {
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
        var treeData = [];
        data.forEach(function(elem, index, arr) {
            treeData.push({
                text: elem.name,
                icon: (elem.type == 'folder' ? 'fa fa-folder-open-o' : 'fa fa-file-code-o tree-file'),
                data: elem,
                id: elem.id,
                parent: elem.parent,
                state: {
                    opened: (elem.type == 'folder' ? true : false),
                    disabled: false,
                    selected: (elem.id == 'tree-root' ? true : false),
                }
            });
        });
        files = data;
        saveFiles();
        var treeConfig = {
            'core': {
                'data': treeData,
                "themes" : { "name" : "default-dark" },
                "multiple": false,
            },
            'plugins' : ['wholerow', 'sort', 'unique', 'contextmenu'],
            'contextmenu': {
                'select_node': false,
                'show_at_node': false,
                'items': function(o, cb) {
                    return {
                        'create-folder': {
                            'separator_before': false,
                            'separator_after': false,
                            '_disabled': false,
                            'label': '새 폴더',
                            'action': function(data) {
                                createFolder(data);
                            },
                            'icon': 'fa fa-folder-o'
                        },
                        'create-file': {
                            'separator_before': false,
                            'separator_after': true,
                            '_disabled': false,
                            'label': '새 파일',
                            'action': function(data) {
                                createFile(data);
                            },
                            'icon': 'fa fa-file-text-o'
                        },
                        'rename-node': {
                            'separator_before': false,
                            'separator_after': true,
                            '_disabled': false,
                            'label': '이름 바꾸기',
                            'action': function(data) {
                                renameNode(data);
                            },
                            'icon': ''
                        },
                        'cut-node': {
                            'separator_before': false,
                            'separator_after': false,
                            '_disabled': function (data) {
                                return isRootNode(data);
                            },
                            'label': '잘라내기',
                            'action': function(data) {
                                cutNode(data);
                            },
                            'icon': 'fa fa-cut',
                        },
                        'copy-node': {
                            'separator_before': false,
                            'separator_after': false,
                            '_disabled': function (data) {
                                return isRootNode(data);
                            },
                            'label': '복사',
                            'action': function(data) {
                                copyNode(data);
                            },
                            'icon': 'fa fa-copy',
                        },
                        'paste-node': {
                            'separator_before': false,
                            'separator_after': true,
                            '_disabled': function (data) {
                                return isRootNode(data) || !$.jstree.reference(data.reference).can_paste();
                            },
                            'label': '붙여넣기',
                            'action': function(data) {
                                pasteNode(data);
                            },
                            'icon': 'fa fa-paste',
                        },
                        'delete-node': {
                            'separator_before': false,
                            'separator_after': false,
                            '_disabled': function(data) {
                                return isRootNode(data);
                            },
                            'label': '삭제',
                            'action': function(data) {
                                deleteNode(data);
                            },
                            'icon': 'fa fa-trash-o'
                        },
                    };
                },
            },
        };
        var tree = $('#sidebar-tree');
        tree.jstree(treeConfig);
        tree.on('changed.jstree', function(e, d) {
            if (d.node && d.node.data.type == 'file') {
                loadFile(d.node.data.name, d.node.data.mime, d.node.data.language);
            }
        });
    }
    function isRootNode(data) {
        var inst = $.jstree.reference(data.reference),
            obj = inst.get_node(data.reference);
        return (obj.parent == '#');
    }

    function createFolder(data) {
    }
    function createFile(data) {
    }
    function deleteNode(data) {
    }
    function cutNode(data) {
    }
    function copyNode(data) {
    }
    function pasteNode(data) {
    }
    function loadSource(sourceCode, mime, language) {
        var doc = CodeMirror.Doc(sourceCode, mime, 0);
        codeMirror.swapDoc(doc);
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

    function loadFile(filename, mime, language) {
        $.ajax('/samples/'+filename).done(function(res) {
            loadSource(res, mime, language);
        });
    }
    function openFileWithId(fileId) {
        var elementId = fileId + "_anchor";
        var tree = $('#sidebar-tree').jstree(true);
        var selected = tree.get_selected(true);
        tree.deselect_node(selected);
        tree.select_node(fileId);
    }
    function loadTree() {
        var ans = null;
        if (Modernizr.localstorage) {
            var l = localStorage.getItem('files');
            if (l) {
                ans = JSON.parse(l);
            }
        }
        if (ans) {
        } else {
            ans = [
                {'name': '~/', 'type': 'folder', 'id': 'tree-root', 'parent': '#'},
                {'name': 'sample2.cpp', 'language': 'C++', 'mime': 'text/x-c++src', 'id': 'sample2', 'type': 'file', 'parent': 'tree-root'},
                {'name': 'sample.cpp', 'language': 'C++', 'mime': 'text/x-c++src', 'id': 'sample', 'type': 'file', 'parent': 'tree-root'},
                {'name': 'helloworld.cpp', 'language': 'C++', 'mime': 'text/x-c++src', 'id': 'helloworld', 'type': 'file', 'parent': 'tree-root'}
            ];
        }
        makeTree(ans);
    }
    function saveFiles() {
        if (Modernizr.localstorage) {
            localStorage.setItem('files',JSON.stringify(files));
        }
    }
    return {
        init: function() {
            setupCodemirror();
            handleViewportSizeChange(true);
            registerEventHandler();
            makeDraggable();
            loadTree();
        },
    };
}();
