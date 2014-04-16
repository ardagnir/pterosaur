/* This is part of Pterosaur.
 *
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
["plugin", { name: "fullvim",
             version: "0.3",
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
    if (pterosaurCleanupCheck !== options["fullvim"])
      cleanupPterosaur();

    if (!options["fullvim"] || (dactyl.focusedElement && dactyl.focusedElement.type === "password") || modes.main !== modes.INSERT && modes.main !== modes.AUTOCOMPLETE && modes.main !== modes.VIM_NORMAL) {
      if(pterFocused && modes.main !== modes.EX) {
        cleanupForTextbox();
        pterFocused = null
      }
      return;
    }

    if (dactyl.focusedElement !== pterFocused)
    {
      if(pterFocused)
        cleanupForTextbox();
      setupForTextbox();
    }

    let val = tmpfile.read();

    let messages = messageTmpfile.read();
    if (messages && messages!=="\n")
    {
      //window.alert(messages)
      //TODO: If another message is written right now, we could lose it.
      messageTmpfile.write("");
      //TODO: We don't neccesarily want singleline, but without it we lose focus.
      dactyl.echo(messages,commandline.FORCE_SINGLELINE);

      //We've clearing the entered command. Don't need/want to clear it later and lose our message.
      lastVimCommand=""
    }
    let metadata = metaTmpfile.read().split('\n');
    vimMode = metadata[0];
    if (vimMode === "e")
      dactyl.echo("ERROR: "+metadata[1])
    else if (vimMode === "n" && modes.main === modes.INSERT)
    {
      //Clear --INSERT-- echoed from vim messages
      dactyl.echo("")
      modes.push(modes.VIM_NORMAL);
    }
    else if (vimMode === "i" && modes.main === modes.VIM_NORMAL)
      modes.pop();

    if (vimMode === "c") {
      if(metadata[1] !=="" && metadata[1] != lastVimCommand)
      {
        lastVimCommand = metadata[1]
        dactyl.echo("VIM COMMAND " + metadata[1], commandline.FORCE_SINGLELINE);
      }
    }
    else if(lastVimCommand) {
        dactyl.echo("")
        lastVimCommand=""
    }

    if (textBox) {
        if (savedCursorStart!=null && textBox.selectionStart != savedCursorStart || savedCursorEnd!=null && textBox.selectionEnd != savedCursorEnd ) {
          pterFocused = null;
          return;
        }

        if (savedText!=null && textBox.value != savedText) {
          pterFocused = null;
          return;
        }

        textBox.value = val;
        savedText = textBox.value;

        if(metadata.length>2)
          textBox.setSelectionRange(metadata[1], metadata[2]);

        savedCursorStart = textBox.selectionStart;
        savedCursorEnd = textBox.selectionEnd;

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
    if (metaTmpfile && metaTmpfile.exists())
        metaTmpfile.remove(false);
    if (messageTmpfile && messageTmpfile.exists())
        messageTmpfile.remove(false);
    tmpfile = null
}

function setupForTextbox() {
    //Clear lingering command text
    if (vimMode === "c")
      io.system("printf '\\x1bi' > /tmp/pterosaur_fifo"); //<ESC>i

    pterFocused = dactyl.focusedElement;
    savedText = null;
    savedCursorStart = null;
    savedCursorEnd = null;

    textBox = config.isComposeWindow ? null : dactyl.focusedElement;

    if (!DOM(textBox).isInput)
        textBox = null;
    let line, column;

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
    tmpfile = io.createTempFile("txt", "-pterosaur"+buffer.uri.host);
    metaTmpfile = io.createTempFile("txt", "-pterosaur"+buffer.uri.host+"-meta");
    messageTmpfile = io.createTempFile("txt", "-pterosaur"+buffer.uri.host+"-messages");
    if (!tmpfile)
        throw Error(_("io.cantCreateTempFile"));

    if (!metaTmpfile)
        throw Error(_("io.cantCreateTempFile"));

    if (!messageTmpfile)
        throw Error(_("io.cantCreateTempFile"));

    if (!tmpfile.write(text))
        throw Error(_("io.cantEncode"));

    var vimCommand;

    vimCommand = 'vim --servername pterosaur --remote-expr "SwitchPterosaurFile(<line>,<column>,\'<file>\',\'<metaFile>\',\'<messageFile>\')"';

    vimCommand = vimCommand.replace(/<metaFile>/, metaTmpfile.path);
    vimCommand = vimCommand.replace(/<messageFile>/, messageTmpfile.path);
    vimCommand = vimCommand.replace(/<file>/, tmpfile.path);
    vimCommand = vimCommand.replace(/<column>/, column);
    vimCommand = vimCommand.replace(/<line>/, line);

    io.system(vimCommand);
}

modes.INSERT.params.onKeyPress = function(eventList) {
    const KILL = false, PASS = true;

    if (!options["fullvim"] || dactyl.focusedElement.type === "password")
      return PASS;

    let inputChar = DOM.Event.stringify(eventList[0])

    /*if (commandLock > COMMAND_MODE_SYNC)
    {
      commandBuffer += inputChar;
      return;
    }
    */

    if (/^<(?:.-)*(?:BS|Esc|lt|Up|Down|Left|Right|Space|Return|Del|Tab|C-h|C-w|C-u|C-k|C-r)>$/.test(inputChar)) {
      //Currently, this also refreshes. I need to disable that.
      if (inputChar==="<Space>")
        io.system("printf ' ' > /tmp/pterosaur_fifo");
      else if (inputChar==="<BS>")
        io.system("printf '\\b' > /tmp/pterosaur_fifo");
      else if (inputChar==="<Return>") {
        io.system("printf '\\r' > /tmp/pterosaur_fifo");
        if (vimMode !== "c")
          return PASS;
      }
      else if (inputChar==="<Tab>")
        return PASS;
      else if (inputChar==="<Up>")
        io.system("printf '\\e[A' > /tmp/pterosaur_fifo");
      else if (inputChar==="<Down>")
        io.system("printf '\\e[B' > /tmp/pterosaur_fifo");
      else if (inputChar==="<Right>")
        io.system("printf '\\e[C' > /tmp/pterosaur_fifo");
      else if (inputChar==="<Left>")
        io.system("printf '\\e[D' > /tmp/pterosaur_fifo");
      else if (inputChar==="<lt>")
        io.system("printf '<' > /tmp/pterosaur_fifo");
    }
    /*else if (/\:|\?|\//.test(inputChar) && vimMode!='i' && vimMode!='R')
    {
      CommandExMode().open("vimdo " + inputChar);
    }
    */
    else {
      if (inputChar == '%')
        io.system('printf "%%" > /tmp/pterosaur_fifo');
      else if (inputChar == '\\')
        io.system("printf '\\\\' > /tmp/pterosaur_fifo");
      else if (inputChar == '"')
        io.system("printf '\"' > /tmp/pterosaur_fifo");
      else
        io.system('printf "' + inputChar + '" > /tmp/pterosaur_fifo');
    }
      
    return KILL;
}

function cleanupPterosaur()
{
    if (options["fullvim"]) {
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
    pterosaurCleanupCheck = options["fullvim"];
}

io.system("mkfifo /tmp/pterosaur_fifo");

//TODO: This is an ugly hack.
io.system("(while killall -0 firefox; do sleep 1; done) > /tmp/pterosaur_fifo &");

//TODO: Also an ugly hack. Also the --remote is only there because on some computers vim won't create a server outside a terminal unless it has a --remote.
io.system('sh -c \'while [ "$(vim --servername pterosaur --remote-expr 1)" != 1 ] && killall -0 firefox; do vim --servername pterosaur +"set autoread" +"set noswapfile" +"set shortmess+=A" --remote /tmp/pentatdactyl-pterosuar </tmp/pterosaur_fifo > /dev/null; done\' &');

//If this doesn't match options["fullvim"] we need to perform cleanup
var pterosaurCleanupCheck = false;


group.options.add(["fullvim"], "Edit all text inputs using vim", "boolean", false);

modes.addMode("VIM_NORMAL", {
  char: "N",
  desription: "Vim normal mode",
  bases: [modes.INSERT]
})

mappings.builtin.add(
    [modes.INSERT, modes.VIM_NORMAL],
    ["<C-r>"],
    "Override refresh and send <C-r> to vim.",
    function(){
      io.system('printf "\x12" > /tmp/pterosaur_fifo');
    },
    {noTransaction: true});

commands.add(["vim[do]"],
    "Send command to vim",
    function (args) {
        dactyl.focus(pterFocused);
        let command = args.join(" ").replace(/%/g,"%%").replace(/\\/g,'\\\\');
        io.system("printf '" + command + "\r' > /tmp/pterosaur_fifo");
    }, {
      argCount: "+",
      literal: 0
    });


var savedText = null;
var savedCursorStart = null;
var savedCursorEnd = null;
var vimMode = 'i';
var pterFocused = null; 
var tmpfile = null;
var metaTmpfile = null;
var messageTmpfile = null;
var textBox;
var lastVimCommand = "";


let timer =  window.setInterval(update, 100);
