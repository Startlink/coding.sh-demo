var App = function() {
    var codeMirror = null;
    var files = null;
    var lastMouseY = null;
    var diffTop = null;
    var headerBarHeight = 35;
    var tabHeight = 35;
    var sideBarWidth = 240;
    var currentFileId = null;
    var undoHistory = {};

    var demoOutput = {};
    var currentEditor = null;

    var saveConsole = {};

    var isRunning = false;

    var codeMirrorOptions = null;
    function handleViewportSizeChange(first) {
        //var w = $(window).width();
        var h = $(window).height();
        headerBarHeight = $('#header-menu').height();
        $('#header').css('height',headerBarHeight);
        //console.log('viewport size changed, width: ' + w + ', height: ' + h);
        if (codeMirror && codeMirror.getOption("fullScreen")) {
            return;
        }
        var contentHeight = h-headerBarHeight;
        if (contentHeight >= 0) {
            $("#content").css('height',contentHeight);
            contentHeight -= tabHeight;
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
    function adjustView(consoleTabTop) {
        var h = $(window).height();
        consoleTabTop -= headerBarHeight;
        var contentHeight = h-headerBarHeight;
        if (contentHeight >= 0) {
            var codingHeight = consoleTabTop;
            var consoleHeight = contentHeight - codingHeight - tabHeight;
            changeContentHeight(codingHeight, consoleHeight);
        }
    }
    function changeContentHeight(codingHeight, consoleHeight) {
        $("#content #coding").css('height',codingHeight);
        $("#content #console").css('height',consoleHeight);
        $('#run-loading,  #run-loading>.ui.segment').css('top',headerBarHeight + codingHeight + tabHeight).css('left',sideBarWidth);
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
    function removeCodeMirrorSearchClass() {
        //$('#coding div.CodeMirror-scroll div.CodeMirror-code span.cm-cm-overlay.cm-searching').removeClass('cm-cm-overlay cm-searching');

    }
    function saveEditor() {
        if (Modernizr.localstorage && currentEditor) {
            localStorage.setItem('codemirror-keymap',currentEditor);
        }
    }
    function updateEditor(val) {
        if (val && codeMirror) {
            if (val == 'default' || val == 'vim' || val == 'emacs' || val == 'sublime') {
                currentEditor = val;
                codeMirror.setOption('keyMap',currentEditor);
                updateEditorInfo();
                setupExtraKeys();
                removeCodeMirrorSearchClass();
                saveEditor();
            }
        }
    }
    function updateEditorInfo() {
        if (currentEditor) {
            var t = '기본';
            if (currentEditor == 'default') {
            } else if (currentEditor == 'vim') {
                t = 'Vim';
            } else if (currentEditor == 'emacs') {
                t = 'Emacs';
            } else if (currentEditor == 'sublime') {
                t = 'Sublime';
            }
            $('#editor-info').text(t);
        }
    }
    function getCodeMirrorOptions() {
        var defaults = {
            /*'soft-tab': true,*/
            'line-highlight': true,
            'line-numbers': true,
            'match-brackets': true,
            'auto-close-brackets': true,
            'fold-gutter': false,
            /* 'auto-complete': true */
        };
        codeMirrorOptions = defaults;
        if (Modernizr.localstorage) {
            var l = localStorage.getItem('codemirror-options');
            if (l !== null) {
                var temp = JSON.parse(l);
                if (temp) {
                    for (var key in codeMirrorOptions) {
                        if (key in temp) {
                            codeMirrorOptions[key] = temp[key];
                        }
                    }
                }
            }
        }
    }
    function saveCodeMirrorOptions() {
        if (Modernizr.localstorage && codeMirrorOptions !== null) {
            localStorage.setItem('codemirror-options', JSON.stringify(codeMirrorOptions));
        }
    }
    function getCodeMirrorCheckbox(key) {
        return $("#header .ui.main.menu .dropdown.settings-dropdown .ui.checkbox:has(input[name='"+key+"'])");
    }
    function updateCodeMirrorOptionsCheckbox() {
        if (codeMirrorOptions === null) {
            getCodeMirrorOptions();
        }
        for (var key in codeMirrorOptions) {
            var checkbox = getCodeMirrorCheckbox(key);
            checkbox.checkbox(codeMirrorOptions[key] ? 'check' : 'uncheck');
        }
    }
    function changeCodeMirrorOption(key, val) {
        if (codeMirrorOptions === null) {
            getCodeMirrorOptions();
        }
        if (key in codeMirrorOptions) {
            codeMirrorOptions[key] = val;
            if (codeMirror) {
                if (key == 'line-numbers') {
                    codeMirror.setOption('lineNumbers', val);
                } else if (key == 'line-highlight') {
                    codeMirror.setOption('styleActiveLine', val);
                } else if (key == 'match-brackets') {
                    codeMirror.setOption('matchBrackets', val);
                } else if (key == 'auto-close-brackets') {
                    codeMirror.setOption('autoCloseBrackets', val);
                } else if (key == 'fold-gutter') {
                    codeMirror.setOption('foldGutter', val);
                    if (val) {
                        codeMirror.setOption('gutters', ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']);
                    } else {
                        codeMirror.setOption('gutters', []);
                    }
                }
            }
        }
        saveCodeMirrorOptions();
    }
    function setupExtraKeys() {
        var ans = {
            'Tab': function(cm) {
                var spaces = new Array(cm.getOption("indentUnit") + 1).join(" ");
                cm.replaceSelection(spaces);
            },
            'F11': function(cm) {
                toggleFullScreen(false);
            },
            'ESC': function(cm) {
                toggleFullScreen(true);
            },
            'Ctrl-R': function(cm) {
                demoRun();
            },
            'Ctrl-B': function(cm) {
                demoCompile();
            }
        };
        if (currentEditor == 'vim') {
            delete ans['ESC'];
        }
        codeMirror.setOption('extraKeys', ans);
    }
    function setupCodemirror() {
        if (Modernizr.localstorage) {
            currentEditor = localStorage.getItem('codemirror-keymap');
        }
        if (currentEditor) {
            if (currentEditor != 'default' && currentEditor != 'vim' && currentEditor != 'emacs' && currentEditor != 'sublime') {
                currentEditor = 'default';
            }
        } else {
            currentEditor = 'default';
        }
        saveEditor();
        updateEditorInfo();
        if (codeMirrorOptions === null) {
            getCodeMirrorOptions();
            updateCodeMirrorOptionsCheckbox();
        }
        var myTextArea = document.getElementById("source");
        CodeMirror.modeURL = "/assets/codemirror/mode/%N/%N.js";
        /*CodeMirror.commands.autocomplete = function(cm) {
            cm.showHint({hint: CodeMirror.hint.anyword});
        }*/
        codeMirror = CodeMirror.fromTextArea(myTextArea,{
            lineNumbers: codeMirrorOptions['line-numbers'],
            matchBrackets: codeMirrorOptions['match-brackets'],
            indentUnit: 4,
            autoCloseBrackets: codeMirrorOptions['auto-close-brackets'],
            theme: "lesser-dark",
            mode: "text/x-c++src",
            readOnly: 'nocursor',
            keyMap: currentEditor,
            styleActiveLine: codeMirrorOptions['line-highlight'],
            foldGutter: codeMirrorOptions['fold-gutter'],
            gutters: (codeMirrorOptions['fold-gutter'] ? ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'] : []),
            selectionPointer: true
        });
        setupExtraKeys();
        updateIndentInfo();
        codeMirror.on('cursorActivity', function() {
            var cur = codeMirror.getCursor();
            $('#line-info').text((cur.line+1)+':'+(cur.ch+1));
        });
        codeMirror.on('changes', function() {
            // saveSource();
        });
    }
    function moveCursor(line, ch) {
        line = parseInt(line);
        ch = parseInt(ch);
        if (codeMirror) {
            codeMirror.setCursor({ch:ch, line:line});
            codeMirror.focus();
        }
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
        var settingsDropdown = $('#header .ui.main.menu .dropdown.settings-dropdown');
        settingsDropdown.dropdown({
            transition: 'drop',
            action: function (text, value) {
            }
        });
        $('#header .ui.main.menu .dropdown.settings-dropdown .ui.checkbox').checkbox({
            onChange: function() {
                var key = $(this).attr('name');
                var val = $(this).parent('div.ui.checkbox').hasClass('checked');
                //console.log(key,val);
                changeCodeMirrorOption(key, val);
            }
        });
    }
    function toggleFullScreen(close) {
        var fullScreen = codeMirror.getOption('fullScreen');
        codeMirror.setOption("fullScreen", close ? false : !fullScreen);
        fullScreen = codeMirror.getOption('fullScreen');
        if (fullScreen) {
            $('#fullscreen-button .fa').removeClass('fa-expand').addClass('fa-compress');
        } else {
            handleViewportSizeChange();
            $('#fullscreen-button .fa').removeClass('fa-compress').addClass('fa-expand');
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
        }).mouseleave(function(e) {
            if (diffTop) {
                e.preventDefault();
                diffTop = null;
            }
        });
        $('#header-create-file-link').click(function(e) {
            e.preventDefault();
            createNode(null, false);
        });
        $('#save-button').click(function(e) {
            saveCurrentFile();
        });
        $('#run-button').click(function(e) {
            saveCurrentFile();
            demoRun();
        });
        $('#compile-button').click(function(e) {
            saveCurrentFile();
            demoCompile();
        });
        $('#console-content').on('click', 'p span.output a.line-link', function() {
            moveCursor($(this).attr('data-line'),$(this).attr('data-char'));
        });
        $('#save-button').click(function(e) {
            saveCurrentFile();
        });
        /*
        var client = new ZeroClipboard($('#copy-button'));
        client.on('copy', function(e) {
            var clipboard = e.clipboardData;
            if (codeMirror) {
                clipboard.setData('text/plain',codeMirror.getValue());
            }
        });*/
        $('#update-button').click(function(e) {
            e.preventDefault();
            $('#update-modal').modal('show');
        });
        $('#console-tab div.ui.menu').on('click', 'a.item', function() {
            changeTab($(this));
        });
    } 
    function demoServerStatus(start) {
        isRunning = start;
        if (start) {
            $('#header #server-status .status').removeClass('red yellow green').addClass('yellow').transition('set looping').transition('pulse', '500ms');
        } else {
            $('#header #server-status .status').transition('remove looping').removeClass('red yellow green').addClass('green');
        }
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
                if (currentFileId != d.node.data.id) {
                    loadFile(d.node.data.id);
                }
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
            saveCurrentFile();
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
        $('#coding').dimmer({
            closable: false
        }).dimmer('show');
        demoServerStatus(true);
        if (codeMirror) {
            codeMirror.getInputField().blur();
        }
        setTimeout(function() {
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

            $('#coding').dimmer('hide');
            demoServerStatus(false);
        }, 500);
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
    function saveCurrentFile() {
        saveSource();
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
    function updateConsole(message, clear, withTyped, withPwd, withScroll) {
        var c = $('#console-content');
        var pwd = 'baekjoon@coding.sh:~# ';
        if (clear) {
            c.empty();
            return;
        }
        var p = $('<p></p>');
        if (withPwd) {
            p.append($('<span class="pwd"></span>').text(pwd));
        }
        c.append(p);
        if (message.length > 0) {
            var s = $('<span></span>'); 
            p.append(s);
            if (withTyped) {
                s.addClass('typed');
                s.typed({
                    strings: [message],
                    contentType: 'text',
                    showCursor: false,
                    callback: function() {
                    }
                });
            } else {
                s.addClass('output');
                s.text(message);
            }
        }
        if (withScroll) {
            $('#console-content').scrollTo(p);
        }
    }
    var demoLines = [
        "sample2.cpp: In function ‘int main()’:",
        "sample2.cpp:20:5: error: expected primary-expression before ‘?’ token",
        "     ?",
        "     ^",
        "sample2.cpp:21:5: error: expected primary-expression before ‘return’",
        "     return 0;",
        "     ^",
        "sample2.cpp:21:5: error: expected ‘:’ before ‘return’",
        "sample2.cpp:21:5: error: expected primary-expression before ‘return’",
        "sample2.cpp:21:5: error: expected ‘;’ before ‘return’",
        "sample2.cpp:6:19: warning: ignoring return value of ‘int scanf(const char*, ...)’, declared with attribute warn_unused_result [-Wunused-result]",
        "     scanf(\"%d\",&n);",
        "                   ^",
        "sample2.cpp:10:23: warning: ignoring return value of ‘int scanf(const char*, ...)’, declared with attribute warn_unused_result [-Wunused-result]",
        "         scanf(\"%d\",&x);",
        "                       ^",
        "sample2.cpp:13:19: warning: ignoring return value of ‘int scanf(const char*, ...)’, declared with attribute warn_unused_result [-Wunused-result]",
        "     scanf(\"%d\",&x);",
        "                   ^"
    ];
    var demoLineError = [
        {line:20,type:"error",msg:"error: expected primary-expression before \u2018?\u2019 token"},
        {line:21,type:"error",msg:"error: expected primary-expression before \u2018return\u2019"},
        {line:21,type:"error",msg:"error: expected \u2018:\u2019 before \u2018return\u2019"},
        {line:21,type:"error",msg:"error: expected primary-expression before \u2018return\u2019"},
        {line:21,type:"error",msg:"error: expected \u2018;\u2019 before \u2018return\u2019"},
        {line:6,type:"warning",msg:"warning: ignoring return value of \u2018int scanf(const char*, ...)\u2019, declared with attribute warn_unused_result [-Wunused-result]"},
        {line:10,type:"warning",msg:"warning: ignoring return value of \u2018int scanf(const char*, ...)\u2019, declared with attribute warn_unused_result [-Wunused-result]"},
        {line:13,type:"warning",msg:"warning: ignoring return value of \u2018int scanf(const char*, ...)\u2019, declared with attribute warn_unused_result [-Wunused-result]"}
    ];
    function demoLineWidget() {
        return;
        if (codeMirror === null) return; 
        demoLineError.forEach(function(line, index, arr) {
            if (line.type == 'note') {
                return;
            } 
            var msg = document.createElement("div");
            var icon = msg.appendChild(document.createElement("span"));
            icon.innerHTML = "!";
            icon.className = 'lint-'+line.type+'-icon';
            msg.appendChild(document.createTextNode(line.msg));
            msg.className = "lint-error";
            codeMirror.addLineWidget(line.line-1,msg);
        });
    }
    function demoCompile() {
        if (currentFileId === null) return;
        var f = getFileById(currentFileId);
        if (f.name != 'sample2.cpp') return;
        $('#console').dimmer({
            closable: false
        }).dimmer('show');
        clearConsole();
        demoServerStatus(true);
        $('#console .ui.dimmer .text-message').text('준비중');
        setTimeout(function() {
            $('#console .ui.dimmer .text-message').text('컴파일 하는 중');
            updateConsole('g++ -O2 -o sample2 -std=c++0x sample2.cpp', false, true, true, true);
            setTimeout(function() {
                demoLines.forEach(function(elem,index,arr) {
                    updateConsole(elem, false, false, false, (index == arr.length-1) ? true : false);
                });
                demoLineWidget();
                addLineLink();
                $('#console').dimmer('hide');
                demoServerStatus(false);
            }, 2000);
        }, 500);
    }
    function addLineLink() {
        $('#console-content p span.output').each(function(index) {
            var t = $(this).text();
            var i = t.indexOf(' ');
            if (i <= 0) return true;
            var line = t.substring(0,i);
            var msg = t.substring(i);
            t = line.split(':');
            if (t.length >= 3) {
                var t1 = parseInt(t[1]) - 1;
                var t2 = parseInt(t[2]) - 1;
                if (t1 >= 0 && t2 >= 0) {
                    $(this).html('');
                    $(this).append($('<a></a>').addClass('line-link').attr('data-line',t1).attr('data-char',t2).attr('href','javascript:void(0)').text(line));
                    $(this).append($('<span></span>').addClass('line-message').text(msg));
                }
            }
        });
    }
    function changeTab(cur) {
        if (isRunning) return;
        if (cur.hasClass('active')) return;
        var menu = cur.parent('div.ui.menu');
        var prev = menu.children('a.active');
        console.log(prev);
        var prevId = prev.attr('data-tab');
        saveConsole[prevId] = $('#console-content').html();
        prev.removeClass('active');
        cur.addClass('active');
        var curId = cur.attr('data-tab');
        if (curId in saveConsole) {
            $('#console-content').html(saveConsole[curId]);
        } else {
            $('#console-content').html('');
        }
    }
    function clearConsole() {
        updateConsole('',true, false, false, true);
        delete saveConsole;
        saveConsole = {};
        $("#console-tab .ui.menu .item.results").remove();
        changeTab($('#console-tab .ui.menu a.terminal'));
    }
    function addConsoleTab(title) {
        var curId = uuid();
        $('#console-tab .ui.menu').append($('<a class="item results"></a>').text(title).attr('data-tab',curId));
        saveConsole[curId] = "";
        for (var i=0; i<100; i++) {
            saveConsole[curId] += "<p>" + uuid() + "</p>";
        }
    }
    function demoRun() {
        if (currentFileId === null) return;
        var f = getFileById(currentFileId);
        if (f.name != 'sample.cpp') return;
        $('#console').dimmer({
            closable: false
        }).dimmer('show');
        clearConsole();
        demoServerStatus(true);
        $('#console .ui.dimmer .text-message').text('준비중');
        setTimeout(function() {
            $('#console .ui.dimmer .text-message').text('컴파일 하는 중');
            updateConsole('g++ -O2 -o sample -std=c++0x sample.cpp', false, true, true, true);
            setTimeout(function() {
                $('#console .ui.dimmer .text-message').text('sample.cpp < data.in 실행중');
                addConsoleTab('sample.cpp < data.in');
                updateConsole('./sample < data.in', false, true, true, true);
                setTimeout(function() {
                    $('#console .ui.dimmer .text-message').text('sample.cpp < data2.in 실행중');
                    addConsoleTab('sample.cpp < data2.in');
                    updateConsole('./sample < data2.in', false, true, true, true);
                    setTimeout(function() {
                        $('#console').dimmer('hide');
                        demoServerStatus(false);
                    }, 2000);
                }, 2000);
            }, 2000);
        }, 500);
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
