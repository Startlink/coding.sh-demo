var App = function() {
    var codeMirror = null;
    var files = null;
    var lastMouseY = null;
    var diffTop = null;
    var headerBarHeight = 35;
    var sourceInfoHeight = 22;
    var currentFileId = null;
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
            readOnly: 'nocursor',
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
        codeMirror.on('changes', function() {
            saveSource();
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
        $('#header-create-file-link').click(function(e) {
            e.preventDefault();
            createNode(null, false);
        });
    }
    function convertToTreeData(elem) {
        return {
            text: elem.name,
            data: elem,
            id: elem.id,
            parent: elem.parent,
            type: (elem.type == 'folder' ? 'folder' : 'file'),
            state: {
                opened: (elem.type == 'folder' ? true : false),
                disabled: false,
                selected: (elem.id == 'tree-root' ? true : false),
            }
        };
    }
    function makeTree(data) {
        var treeData = [];
        data.forEach(function(elem, index, arr) {
            treeData.push(convertToTreeData(elem));
        });
        files = data;
        saveFiles();
        var treeConfig = {
            core: {
                data: treeData,
                themes : { name : "default-dark" },
                multiple: false,
                check_callback: function(operation, node, node_parent, node_position, more) {
                    //console.log('rename node');
                    //console.log(node);
                    if (operation == 'rename_node') {
                        return (node.data.parent != '#');
                    }
                }
            },
            plugins : ['wholerow', 'sort', 'unique', 'contextmenu', 'types'],
            types: {
                folder: {
                    icon: 'fa fa-folder-open-o',
                    valid_children: ['folder', 'file'],
                },
                file: {
                    icon: 'fa fa-file-code-o',
                    valid_children: [],
                },
                '#': {
                    max_depth: 4
                }
            },
            contextmenu: {
                select_node: false,
                show_at_node: false,
                items: function(o, cb) {
                    return {
                        create_folder: {
                            separator_before: false,
                            separator_after: false,
                            _disabled: false,
                            label: '새 폴더',
                            action: function(data) {
                                createNode(data, true);
                            },
                            icon: 'fa fa-folder-o'
                        },
                        create_file: {
                            separator_before: false,
                            separator_after: true,
                            _disabled: false,
                            label: '새 파일',
                            action: function(data) {
                                createNode(data, false);    
                            },
                            icon: 'fa fa-file-text-o'
                        },
                        rename_node: {
                            separator_before: false,
                            separator_after: true,
                            _disabled: false,
                            label: '이름 바꾸기',
                            action: function(data) {
                                if (isRootNode(data)) return;
                                var inst = $.jstree.reference(data.reference),
                                    obj = inst.get_node(data.reference);
                                inst.edit(obj);
                            },
                            icon: '',
                            shortcut: 113,
                            shortcut_label: 'F2'
                        },
                        cut_node: {
                            separator_before: false,
                            separator_after: false,
                            _disabled: function (data) {
                                return isRootNode(data);
                            },
                            label: '잘라내기',
                            action: function(data) {
                                cutNode(data);
                            },
                            icon: 'fa fa-cut',
                        },
                        copy_node: {
                            separator_before: false,
                            separator_after: false,
                            _disabled: function (data) {
                                return isRootNode(data);
                            },
                            label: '복사',
                            action: function(data) {
                                copyNode(data);
                            },
                            icon: 'fa fa-copy',
                        },
                        paste_node: {
                            separator_before: false,
                            separator_after: true,
                            _disabled: function (data) {
                                return isRootNode(data) || !$.jstree.reference(data.reference).can_paste();
                            },
                            label: '붙여넣기',
                            action: function(data) {
                                pasteNode(data);
                            },
                            icon: 'fa fa-paste',
                        },
                        delete_node: {
                            separator_before: false,
                            separator_after: false,
                            _disabled: function(data) {
                                return isRootNode(data);
                            },
                            label: '삭제',
                            action: function(data) {
                                deleteNode(data);
                            },
                            icon: 'fa fa-trash-o'
                        },
                    };
                },
            },
            sort: function(a, b) {
                var u = this.get_node(a);
                var v = this.get_node(b);
                if (u.type != v.type) {
                    return u.type < v.type ? 1 : -1;
                } else {
                    return this.get_text(a).toLowerCase() < this.get_text(b).toLowerCase() ? -1 : 1;
                }
            }
        };
        var tree = $('#sidebar-tree');
        tree.jstree(treeConfig);
        tree.on('changed.jstree', function(e, d) {
            if (d.node && d.node.data.type == 'file') {
                loadFile(d.node.data.id);
            }
        });
        tree.on('rename_node.jstree', function(e, d) {
            if (d.node && d.text.length) {
                renameNode(d.node.data.id, d.text); 
            }
        });
    }
    function getInfoByExtension(ext) {
        var temp = {'language': 'Text', 'mime': 'text/plain'};
        if (ext) {
            var info = CodeMirror.findModeByExtension(ext);
            if (info) {
                temp.language = info.name;
                temp.mime = info.mime;
            }
        }
        return temp;
    }
    function renameNode(nodeId, name) {
        files.forEach(function (elem, index, arr) {
            if (elem.id == nodeId) {
                //var oldName = files[index].name;
                files[index].name = name;
                if (elem.type == 'file') {
                    /*var m = /.+\.([^.]+)$/.exec(oldName);
                    var oldExt = null;
                    if (m) {
                        oldExt = m[1];
                    }*/
                    var m = /.+\.([^.]+)$/.exec(name);
                    var ext = null;
                    var temp = getInfoByExtension();
                    if (m) {
                        ext = m[1];
                        temp = getInfoByExtension(ext);
                    }
                    files[index].language = temp.language;
                    files[index].mime = temp.mime;
                    if (nodeId == currentFileId) {
                        codeMirrorChangeMode(temp.mime, temp.language);
                    }
                }
            }
        });
        saveFiles();
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
    function codeMirrorChangeMode(mime, language) {
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
        }
    }
    function loadSource(fileId, sourceCode, mime, language) {
        currentFileId = null;
        var doc = CodeMirror.Doc(sourceCode, mime, 0);
        codeMirror.swapDoc(doc);

        codeMirror.setOption('readOnly', false);
        codeMirrorChangeMode(mime, language);
        codeMirror.focus();
        currentFileId = fileId;
    }
    function getFileById(fileId) {
        for (var i=0; i<files.length; i++) {
            if (files[i].id == fileId) {
                return files[i];
            }
        }
        return null;
    }
    function loadFile(fileId) {
        var file = getFileById(fileId);
        if (file === null) return;
        if (Modernizr.localstorage && localStorage.getItem(fileId) !== null) {
            loadSource(fileId, localStorage.getItem(fileId), file.mime, file.language);
        } else {
            $.ajax('/samples/'+file.name).done(function(res) {
                if (Modernizr.localstorage) {
                    localStorage.setItem(fileId, res);
                }
                loadSource(fileId, res, mime, language);
            }).fail(function() {
                if (Modernizr.localstorage) {
                    localStorage.setItem(fileId, "");
                    loadSource(fileId, "", file.mime, file.language);
                }
            });
        }
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
                {'file': 'sample2.cpp', 'name': 'sample2.cpp', 'language': 'C++', 'mime': 'text/x-c++src', 'id': 'sample2', 'type': 'file', 'parent': 'tree-root'},
                {'file': 'sample.cpp', 'name': 'sample.cpp', 'language': 'C++', 'mime': 'text/x-c++src', 'id': 'sample', 'type': 'file', 'parent': 'tree-root'},
                {'file': 'helloworld.cpp', 'name': 'helloworld.cpp', 'language': 'C++', 'mime': 'text/x-c++src', 'id': 'helloworld', 'type': 'file', 'parent': 'tree-root'}
            ];
        }
        makeTree(ans);
    }
    function saveFiles() {
        if (Modernizr.localstorage) {
            //console.log(files);
            localStorage.setItem('files',JSON.stringify(files));
        }
    }
    function saveSource() {
        if (currentFileId) {
            if (Modernizr.localstorage) {
                localStorage.setItem(currentFileId, codeMirror.getValue());
            }
        }
    }
    function makeNewNodeData(isFolder, parentId) {
        var newNodeName = isFolder ? "New Folder" : "New File";
        var alreadyExists = {};
        files.forEach(function(elem, inex, arr) {
            if (elem.parent == parentId) {
                if (elem.name.startsWith(newNodeName)) {
                    alreadyExists[elem.name] = true;
                }
            }
        });
        if (alreadyExists[newNodeName]) {
            for (var i=1;; i++) {
                var nameCandidate = newNodeName + ' (' + i + ')';
                if (alreadyExists[nameCandidate]) {
                } else {
                    newNodeName = nameCandidate;
                    break;
                }
            }
        }
        var temp = {file: newNodeName, name: newNodeName, id: uuid(), type: (isFolder ? 'folder' : 'file'), parent: parentId};
        if (!isFolder) {
            temp.language = 'Text';
            temp.mime = 'text/plain';
        }
        files.push(temp);
        saveFiles();
        return convertToTreeData(temp);
    }
    function createNode(data, isFolder) {
        var ref = null;
        if (data) {
            ref = data.reference;
        } else {
            ref = $('#sidebar-tree').jstree(true).get_selected();
        }
        var inst = $.jstree.reference(ref),
            obj = inst.get_node(ref);
        while(obj.data.type == 'file') {
            obj = inst.get_node(inst.get_parent(obj));
        }
        var nodeData = makeNewNodeData(isFolder, obj.id);
        inst.create_node(obj, nodeData, "last", function (new_node) {
            setTimeout(function () { inst.edit(new_node); },0);
        });

    }
    function randomString(length, chars) {
        var result = '';
        for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
        return result;
    }
    function uuid() {
        return randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
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
