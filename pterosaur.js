/*
 * Copyright (c) 2014 James Kolb <jck1089@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * This file incorporates work covered under the following copyright and permission notice:
 *   Copyright © 2006-2009 by Martin Stubenschrott <stubenschrott@vimperator.org>
 *   Copyright © 2007-2011 by Doug Kearns <dougkearns@gmail.com>
 *   Copyright © 2008-2011 by Kris Maglione <maglione.k at Gmail>
 *
 *   For a full list of authors, refer the AUTHORS file.
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a
 *   copy of this software and associated documentation files (the "Software"),
 *   to deal in the Software without restriction, including without limitation
 *   the rights to use, copy, modify, merge, publish, distribute, sublicense,
 *   and/or sell copies of the Software, and to permit persons to whom the
 *   Software is furnished to do so, subject to the following conditions:
 *
 *   The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 *
 *   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
 *   THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 *   FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 *   DEALINGS IN THE SOFTWARE.
 */

"use strict";
var INFO =
["plugin", { name: "fullVim",
             version: "0.1",
             href: "http://github.com/ardagnir/pterosaur",
             summary: "All text is vim",
             xmlns: "dactyl" },
    ["author", { email: "jck1089@gmail.com" },
        "James Kolb"],
    ["license", { href: "http://www.gnu.org/licenses/agpl-3.0.html" },
        "Gnu AGPL v3"],
    ["project", { name: "Pentadactyl", "min-version": "1.0" }],
    ["p", {},
        "This plugin provides full vim functionality to all input text-boxes by running a vim process in the background."]];


function update(){
    if (pterosaurCleanupCheck !== options["fullVim"])
      cleanupPterosaur();

    if (!options["fullVim"] || modes.main !== modes.INSERT && modes.main !== modes.AUTOCOMPLETE) {
      if(pterFocused !== null)
      {
        cleanupForTextbox();
        pterFocused = null
      }
      return;
    }

    if (dactyl.focusedElement !== pterFocused)
    {
      if(pterFocused !== null)
        cleanupForTextbox();
      setupForTextbox();
    }
    //TODO: these need to be faster, maybe vim can write them to a file when they change
    vimMode = io.system('vim --servername pterosaur --remote-expr "mode()"');
    //TODO Handle multibyte characters?
    cursorPos = io.system('vim --servername pterosaur --remote-expr "col(\'.\')+line2byte(line(\'.\'))-1"');
    let val = tmpfile.read();
    if (textBox) {
        textBox.value = val;
        if (vimMode === 'n') {
          textBox.setSelectionRange(cursorPos-1, cursorPos);
        }
        else {
          textBox.setSelectionRange(cursorPos-1, cursorPos-1);
        }

        if (true) {
            let elem = DOM(textBox);
            elem.attrNS(NS, "modifiable", true)
                .style.MozUserInput;
            elem.input().attrNS(NS, "modifiable", null);
        }
    }
    else {
        while (editor_.rootElement.firstChild)
            editor_.rootElement.removeChild(editor_.rootElement.firstChild);
        editor_.rootElement.innerHTML = val;
    }
}

function cleanupForTextbox() { 
    if (tmpfile && tmpfile.exists())
        tmpfile.remove(false);
    tmpfile = null
}

function setupForTextbox() {
    pterFocused = dactyl.focusedElement;

    textBox = config.isComposeWindow ? null : dactyl.focusedElement;

    if (!DOM(textBox).isInput)
        textBox = null;
    let line, column;

    //TODO: Handle password stuff
    if (textBox) {
        var text = textBox.value;
        var pre = text.substr(0, textBox.selectionStart);
    }
    else {
        var editor_ = window.GetCurrentEditor ? GetCurrentEditor()
                                              : Editor.getEditor(document.commandDispatcher.focusedWindow);
        dactyl.assert(editor_);
        text = Array.map(editor_.rootElement.childNodes,
                         e => DOM.stringify(e, true))
                    .join("");

        if (!editor_.selection.rangeCount)
            var sel = "";
        else {
            let range = RangeFind.nodeContents(editor_.rootElement);
            let end = editor_.selection.getRangeAt(0);
            range.setEnd(end.startContainer, end.startOffset);
            pre = DOM.stringify(range, true);
            if (range.startContainer instanceof Text)
                pre = pre.replace(/^(?:<[^>"]+>)+/, "");
            if (range.endContainer instanceof Text)
                pre = pre.replace(/(?:<\/[^>"]+>)+$/, "");
        }
    }
    line = 1 + pre.replace(/[^\n]/g, "").length;
    column = 1 + pre.replace(/[^]*\n/, "").length;

    let origGroup = DOM(textBox).highlight.toString();
    tmpfile = io.createTempFile("txt", "-pterosaur"+buffer.uri.host)
    if (!tmpfile)
        throw Error(_("io.cantCreateTempFile"));

    if (!tmpfile.write(text))
        throw Error(_("io.cantEncode"));

    io.system("$(while [ -f "+tmpfile.path+" ]; do sleep 2; done) | cat > /tmp/pterosaur_fifo &");
    //window.alert("$(while [ -f "+tmpfile.path+" ]; do sleep 5; done) > /tmp/pterosaur_fifo &");
    let vimCommand = 'sh -c \'vim --servername pterosaur -f +<line> +"sil! call cursor(0, <column>)" +"set autoread" +"autocmd FileChangedShell * echon \'changed\'" +"set noswapfile" +"set shortmess+=A" +"autocmd TextChanged * write!" +"autocmd CursorMovedI * write!" +"startinsert" <file> </tmp/pterosaur_fifo > /dev/null\' &'
    needsCleaning = true;
    vimCommand = vimCommand.replace('<line>', line);
    vimCommand = vimCommand.replace('<column>', column);
    vimCommand = vimCommand.replace('<file>', tmpfile.path);
    io.system(vimCommand);
}


modes.INSERT.params.onKeyPress = function(eventList) {
    const KILL = false, PASS = true;

    if (!options["fullVim"])
      return PASS

    if (/^<(?:.-)*(?:BS|Return|Del|Tab|C-h|C-w|C-u|C-k)>$/.test(DOM.Event.stringify(eventList[0]))) {
      if (DOM.Event.stringify(eventList[0])==="<BS>")
        io.system('printf "\b" > /tmp/pterosaur_fifo')
      if (DOM.Event.stringify(eventList[0])==="<Return>")
        io.system('printf "\r" > /tmp/pterosaur_fifo')
        return PASS
      if (DOM.Event.stringify(eventList[0])==="<Tab>")
        return PASS
    }
    else {
      io.system('printf "'.concat(String.fromCharCode(eventList[0].charCode).concat('" > /tmp/pterosaur_fifo')));
    }
      
    return KILL;
}

function cleanupPterosaur()
{
    if (options["fullVim"]) {
        mappings.builtin.remove(modes.INSERT, "<Space>");
        mappings.builtin.remove(modes.INSERT, "<Return>");
    }
    else {
        mappings.builtin.add([modes.INSERT],
            ["<Space>", "<Return>"], "Expand Insert mode abbreviation",
            function () {
                editor.expandAbbreviation(modes.INSERT);
                return Events.PASS_THROUGH;
        });
    }
    pterosaurCleanupCheck = options["fullVim"];
}

io.system("mkfifo /tmp/pterosaur_fifo");

//If this doesn't match options["fullVim"] we need to perform cleanup
var pterosaurCleanupCheck = false;

options.add(["fullVim"], "Edit all text inputs using vim", "boolean", false);

var vimMode = 'i';
var cursorPos = '0';
var pterFocused = null; 
var tmpfile = null;
var textBox;
var needsCleaning = false;

let timer =  window.setInterval(update, 100);
