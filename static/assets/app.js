var App = function() {
    var codeMirror = null;
    var files = null;
    var lastMouseY = null;
    var diffTop = null;
    var headerBarHeight = 35;
    var consoleTabHeight = 26;
    var sideBarWidth = 240;
    var currentFileId = null;
    var undoHistory = {};

    var demoOutput = {};
    var currentEditor = null;
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
            contentHeight -= consoleTabHeight;
            var codingHeight = parseFloat($("#content #coding").css('height'));
            var consoleHeight = parseFloat($("#content #console").css('height'));
            var ratio = 0.5;
            if (first || codingHeight <= 0 || consoleHeight <= 0) {
                ratio = 0.5;
            } else {
                var total = codingHeight + consoleHeight;
                if (total > 0) {
                    ratio = codingHeight / (codingHeight + consoleHeight);
                }
            }
            if (first && Modernizr.localstorage) {
                var l = localStorage.getItem('ratio');
                if (l !== null) {
                    ratio = parseFloat(l);
                }
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
            var consoleHeight = contentHeight - codingHeight - consoleTabHeight;
            changeContentHeight(codingHeight, consoleHeight);
        }
    }
    function changeContentHeight(codingHeight, consoleHeight) {
        $("#content #coding").css('height',codingHeight);
        $("#content #console").css('height',consoleHeight);
        $('#run-loading,  #run-loading>.ui.segment').css('top',headerBarHeight + codingHeight + consoleTabHeight).css('left',sideBarWidth);
        if (codeMirror) {
            codeMirror.setSize(null, codingHeight);
        }
        if (Modernizr.localstorage) {
            var total = codingHeight + consoleHeight;
            if (total > 0) {
                ratio = codingHeight / (codingHeight + consoleHeight);
                localStorage.setItem('ratio',ratio);
            }
        }
    }
    function updateIndentLevel(indent) {
        var x = parseInt(indent);
        if (codeMirror) {
            if (x == 2 || x == 4 || x == 3 || x == 8) {
                codeMirror.setOption('indentUnit', x);
                updateIndentInfo();
            }
        }
    }
    function saveEditor() {
        if (Modernizr.localstorage && currentEditor) {
            localStorage.setItem('codemirror-keymap',currentEditor);
        }
    }
    function updateEditor(val) {
        if (val && codeMirror) {
            if (val == 'default' || val == 'vim') {
                currentEditor = val;
                codeMirror.setOption('keyMap',currentEditor);
                updateEditorInfo();
                saveEditor();
            }
        }
    }
    function updateEditorInfo() {
        if (currentEditor) {
            if (currentEditor == 'default') {
                $('#editor-info').text('기본');
            } else if (currentEditor == 'vim') {
                $('#editor-info').text('Vim');
            }
        }
    }
    function setupCodemirror() {
        if (Modernizr.localstorage) {
            currentEditor = localStorage.getItem('codemirror-keymap');
        }
        if (currentEditor) {
            if (currentEditor != 'default' && currentEditor != 'vim') {
                currentEditor = 'default';
            }
        } else {
            currentEditor = 'default';
        }
        saveEditor();
        updateEditorInfo();
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
            keyMap: currentEditor,
            extraKeys: {
                'Tab': function(cm) {
                    var spaces = new Array(cm.getOption("indentUnit") + 1).join(" ");
                    cm.replaceSelection(spaces);
                },
                'F11': function(cm) {
                    toggleFullScreen(false);
                }
            },
            styleActiveLine: true,
        });
        updateIndentInfo();
        codeMirror.on('cursorActivity', function() {
            var cur = codeMirror.getCursor();
            $('#line-info').text((cur.line+1)+':'+(cur.ch+1));
        });
        codeMirror.on('changes', function() {
            saveSource();
        });
    }
    function updateIndentInfo() {
        if (codeMirror) {
            $('#indent-info').text(codeMirror.getOption('indentUnit')); 
        } else {
            $('#indent-info').text(''); 
        }
    }
    function setupDropdown() {
        var indentDropdown = $('#header .ui.main.menu .dropdown.indent-dropdown');
        indentDropdown.dropdown({
            transition: 'drop',
            action: function (text, value) {
                updateIndentLevel(text);
                indentDropdown.dropdown('hide');
            }
        });
        var languageDropdown = $('#header .ui.main.menu .dropdown.language-dropdown');
        languageDropdown.dropdown({
            transition: 'drop',
            action: function (text, value) {
                updateLanguage(text);
                languageDropdown.dropdown('hide');
            }
        });
        var editorDropdown = $('#header .ui.main.menu .dropdown.editor-dropdown');
        editorDropdown.dropdown({
            transition: 'drop',
            action: function (text, value) {
                updateEditor(value);
                editorDropdown.dropdown('hide');
            }
        });
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
        $("#console-tab").mousedown(function(e) {
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
        $('#run-button').click(function(e) {
            if (currentFileId !== null) {
                /*$('#console').dimmer({
                    closable: false
                }).dimmer('show');*/

                $('#console .ui.dimmer .text-message').text('준비중');
                setTimeout(function() {
                    $('#console .ui.dimmer .text-message').text('컴파일 하는 중');
                    for (var i=0; i<10; i++) {
                    updateConsole('g++ -O2 -o sample -std=c++0x sample.cpp');
                    }
                    setTimeout(function() {
                        $('#console .ui.dimmer .text-message').text('sample.cpp < data.in 실행중');
                    for (var i=0; i<10; i++) {
                        updateConsole('./sample < data.in');
                    }
                        setTimeout(function() {
                            $('#console .ui.dimmer .text-message').text('sample.cpp < data2.in 실행중');
                            updateConsole('./sample < data2.in');
                            setTimeout(function() {
                                //$('#console').dimmer('hide');
                            }, 3000);
                        }, 3000);
                    }, 3000);
                }, 500);
            }
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
                    //console.log(operation);
                    //console.log('rename node');
                    //console.log(node);
                    if (operation == 'rename_node') {
                        return (node.data.parent != '#');
                    } else if (operation == 'delete_node') {
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
                    max_depth: 4,
                    max_children: 20
                }
            },
            contextmenu: {
                select_node: true,
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
                        delete_node: {
                            separator_before: false,
                            separator_after: false,
                            _disabled: function(data) {
                                return isRootNode(data);
                            },
                            label: '삭제',
                            action: function(data) {
                                if (isRootNode(data)) return;
                                var inst = $.jstree.reference(data.reference),
                                    obj = inst.get_node(data.reference);
                                showDeleteAlert(inst, obj);
                                /*
                                if (inst.is_selected(obj)) {
                                    inst.delete_node(inst.get_selected());
                                } else {
                                    inst.delete_node(obj);
                                }
                                */
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
        tree.on('delete_node.jstree', function(e, d) {
            if (d.node && d.node.data.id) {
                deleteNode(d.node.data.id); 
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
    function deleteNode(nodeId) {
        if (undoHistory[nodeId]) {
            delete undoHistory[nodeId];
        }
        currentFileId = null;
        codeMirror.setOption('readOnly', true);
        for (var i=0; i<files.length; i++) {
            if (files[i].id == nodeId) {
                files.splice(i, 1);
                break;
            }
        }
        if (Modernizr.localstorage) {
            localStorage.removeItem(nodeId);
        }
        saveFiles();
    }
    function getFileIndexById(nodeId) {
        if (files) {
            for (var i=0; i<files.length; i++) {
                if (files[i].id == nodeId) {
                    return i;
                }
            }
        }
        return -1;
    }
    function renameNode(nodeId, name) {
        var file = getFileById(nodeId);
        var index = getFileIndexById(nodeId);
        if (index != -1) {
            files[index].name = name;
            if (file.type == 'file') {
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
        saveFiles();
    }
    function isRootNode(data) {
        var inst = $.jstree.reference(data.reference),
            obj = inst.get_node(data.reference);
        return (obj.parent == '#');
    }
    function updateLanguage(lang) {
        if (lang && codeMirror && currentFileId) {
            var f = getFileById(currentFileId);
            var index = getFileIndexById(currentFileId);
            var mime = null;
            if (f === null) return;
            if (lang == 'C++') {
                mime = 'text/x-c++src'; 
            } else if (lang == 'Plain Text') {
                mime = 'text/plain';
            }
            if (mime) {
                files[index].language = lang;
                files[index].mime = mime;
                codeMirrorChangeMode(mime, lang);
                saveFiles();
            }
        }
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
        if (currentFileId) {
            var history = codeMirror.getHistory();
            undoHistory[currentFileId] = JSON.stringify(history);
        }
        currentFileId = null;
        var doc = CodeMirror.Doc(sourceCode, mime, 0);
        codeMirror.swapDoc(doc);
        $('#line-info').text('1:1');

        if (undoHistory[fileId]) {
            codeMirror.setHistory(JSON.parse(undoHistory[fileId]));
        }

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
                loadSource(fileId, res, file.mime, file.language);
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
            temp.language = 'Plain Text';
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
    function showDeleteAlert(inst, obj) {
        var v = null;
        if (inst.is_selected(obj)) {
            v = inst.get_selected();
        } else {
            v = obj;
        }
        if ($.isArray(v) && v.length > 0) {
            v = v[0];
        }
        var file = getFileById(v);
        $('#delete-alert .file-type').text((file.type == 'foler') ? '폴더' : '파일');
        $('#delete-alert .file-name').text(file.name);
        $('#delete-alert').modal({
            closable: false,
            onDeny: function() {
                //console.log('deny');
            },
            onApprove: function() {
                if (inst.is_selected(obj)) {
                    inst.delete_node(inst.get_selected());
                } else {
                    inst.delete_node(obj);
                }
            },
        }).modal('show');
    }
    function randomString(length, chars) {
        var result = '';
        for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
        return result;
    }
    function uuid() {
        return randomString(32, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
    }
    function updateConsole(message, clear) {
        var c = $('#console-content');
        var pwd = 'baekjoon@coding.sh:~# ';
        if (clear) {
            c.empty();
        }
        var p = $('<p></p>').text(pwd); //.hide();
        var s = $('<span class="typed"></span>'); 
        p.append(s);
        c.append(p);
        //p.transition('fade right');
        s.typed({
            strings: [message],
            contentType: 'text',
            showCursor: false,
            callback: function() {
            }
        });
        $('#console-content').scrollTo(p);
    }
    return {
        init: function() {
            setupCodemirror();
            handleViewportSizeChange(true);
            registerEventHandler();
            setupDropdown();
            loadTree();
            $('#loading').remove();
        },
    };
}();
