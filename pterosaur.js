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
             version: "0.5",
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

    //This has to be up here for vimdo to work. This should probably be changed eventually.
    if (writeInsteadOfRead)
    {
      if(sendToVim !== "")
      {
        let tempSendToVim=sendToVim
        sendToVim = ""
        io.system("printf '" + tempSendToVim  + "' > /tmp/pterosaur/fifo_"+uid);
        unsent=0;
      }
      writeInsteadOfRead = 0;
      return;
    }


    if (!options["fullvim"] || (dactyl.focusedElement && dactyl.focusedElement.type === "password") || modes.main !== modes.INSERT && modes.main !== modes.AUTOCOMPLETE && modes.main !== modes.VIM_NORMAL && modes.main !== modes.VIM_COMMAND) {
      if(pterFocused) {
        cleanupForTextbox();
        pterFocused = null
      }
      return;
    }

    writeInsteadOfRead = 1; //For next time around

    if (dactyl.focusedElement !== pterFocused)
    {
      if(pterFocused)
        cleanupForTextbox();
      setupForTextbox();
    }

    let val = tmpfile.read();

    let metadata = metaTmpfile.read().split('\n');
    vimMode = metadata[0];

    if (vimMode === "c") {
      if ( modes.main !== modes.VIM_COMMAND)
      {
        modes.push(modes.VIM_COMMAND);
      }
      if (metadata[1] !=="" && metadata[1] !== lastVimCommand)
      {
        lastVimCommand = metadata[1]
        dactyl.echo("VIM COMMAND " + metadata[1], commandline.FORCE_SINGLELINE);
      }
    }
    else{
        if (modes.main === modes.VIM_COMMAND)
        {
          modes.pop();
        }
        if (lastVimCommand)
        {
          dactyl.echo("")
          lastVimCommand=""
        }
    }

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

    if (textBox) {
        if (savedCursorStart!=null && textBox.selectionStart != savedCursorStart || savedCursorEnd!=null && textBox.selectionEnd != savedCursorEnd ) {
          pterFocused = null;
          cleanupForTextbox();
          return;
        }

        if (savedText!=null && textBox.value != savedText) {
          pterFocused = null;
          cleanupForTextbox();
          return;
        }
        //We only get one line for inputs
        if(textBox.tagName == "input")
        {
          val = val.replace(/\n/g," ")
        }

        textBox.value = val;
        savedText = textBox.value;

        if(metadata.length>2 && vimMode !== "c" && vimMode!== "e" && !unsent)
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
    io.system('vim --servername pterosaur_'+uid+' --remote-expr "LoseTextbox()"');
    unsent=1;
}

function setupForTextbox() {
    //Clear lingering command text
    if (vimMode === "c")
      io.system("printf '\\ei' > /tmp/pterosaur/fifo_"+uid);

    pterFocused = dactyl.focusedElement;
    savedText = null;
    savedCursorStart = null;
    savedCursorEnd = null;

    textBox = config.isComposeWindow ? null : dactyl.focusedElement;

    if (!DOM(textBox).isInput)
        textBox = null;
    let lineStart, columnStart, lineEnd, columnEnd;

    if (textBox) {
        var text = textBox.value;
        var preStart = text.substr(0, textBox.selectionStart);
        var preEnd = text.substr(0, textBox.selectionEnd);
        savedCursorStart = textBox.selectionStart;
        savedCursorEnd = textBox.selectionEnd;
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
            //TODO: support selection here 
            preStart = pre
            preEnd = pre
        }
    }
    lineStart = 1 + preStart.replace(/[^\n]/g, "").length;
    columnStart = 1 + preStart.replace(/[^]*\n/, "").length;
    lineEnd = 1 + preEnd.replace(/[^\n]/g, "").length;
    columnEnd = 1 + preEnd.replace(/[^]*\n/, "").length;

    let origGroup = DOM(textBox).highlight.toString();

    if (!tmpfile.write(text))
      throw Error(_("io.cantEncode"));


    var ioCommand;

    //vimCommand = 'vim --servername pterosaur_'+uid+' --remote-expr "SwitchPterosaurFile(<line>,<column>,\'<file>\',\'<metaFile>\',\'<messageFile>\')"';
    ioCommand = 'vim --servername pterosaur_'+uid+' --remote-expr "FocusTextbox(<lineStart>,<columnStart>,<lineEnd>,<columnEnd>)"';

    ioCommand = ioCommand.replace(/<columnStart>/, columnStart);
    ioCommand = ioCommand.replace(/<lineStart>/, lineStart);
    ioCommand = ioCommand.replace(/<columnEnd>/, columnEnd);
    ioCommand = ioCommand.replace(/<lineEnd>/, lineEnd);

    io.system(ioCommand);
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

    if (/^<(?:.-)*(?:BS|lt|Up|Down|Left|Right|Space|Return|Del|Tab|C-h|C-w|C-u|C-k|C-r)>$/.test(inputChar)) {
      //Currently, this also refreshes. I need to disable that.
      if (inputChar==="<Space>")
        sendToVim += ' '
      else if (inputChar==="<BS>")
        sendToVim += '\\b'
      else if (inputChar==="<Return>") {
        sendToVim += '\\r'
        return PASS;
      }
      else if (inputChar==="<Tab>")
        return PASS;
      else if (inputChar==="<Up>")
        sendToVim += '\\e[A'
      else if (inputChar==="<Down>")
        sendToVim += '\\e[B'
      else if (inputChar==="<Right>")
        sendToVim += '\\e[C'
      else if (inputChar==="<Left>")
        sendToVim += '\\e[D'
      else if (inputChar==="<lt>")
        sendToVim += '<'
    }
    /*else if (/\:|\?|\//.test(inputChar) && vimMode!='i' && vimMode!='R')
    {
      CommandExMode().open("vimdo " + inputChar);
    }
    */
    else {
      if (inputChar == '%')
        sendToVim += '%%'
      else if (inputChar == '\\')
        sendToVim += '\\\\'
      else if (inputChar == '"')
        sendToVim += '\"'
      else if (inputChar == "'")
        sendToVim += "\'\\'\'"
      else
        sendToVim += inputChar
    }
      
    return KILL;
}

function cleanupPterosaur()
{
    if (options["fullvim"]) {
        mappings.builtin.remove(modes.INSERT, "<Space>");
        mappings.builtin.remove(modes.INSERT, "<Return>");
        mappings.builtin.add(
            [modes.INSERT],
            ["<Esc>"],
            ["Handle escape key"],
            function(){
              if (vimMode==="n") //This is more specific than VIM_NORMAL which currently includes things like visual
              {
                modes.reset()
              }
              else {
                sendToVim+="\\e"
              }
            });

        mappings.builtin.add(
            [modes.INSERT],
            ["<C-r>"],
            "Override refresh and send <C-r> to vim.",
            function(){
              sendToVim+="\x12"
            },
            {noTransaction: true});

        mappings.builtin.add(
            [modes.VIM_COMMAND],
            ["<Return>"],
            ["Override websites' carriage return behavior when in command mode"],
            function(){
              sendToVim+="\\r"
            });
    }
    else {
        mappings.builtin.add([modes.INSERT],
            ["<Space>", "<Return>"], "Expand Insert mode abbreviation",
            function () {
                editor.expandAbbreviation(modes.INSERT);
                return Events.PASS_THROUGH;
        });

        mappings.builtin.remove( modes.INSERT, "<Esc>");
        mappings.builtin.remove( modes.INSERT, "<C-r>");
        mappings.builtin.remove( modes.VIM_COMMAND, "<Return>");
    }
    pterosaurCleanupCheck = options["fullvim"];
}

var savedText = null;
var savedCursorStart = null;
var savedCursorEnd = null;
var vimMode = 'i';
var pterFocused = null;
var textBox;
var lastVimCommand = "";
var sendToVim = "";
//To prevent collisions TODO: get sequentually, rather than randomly
var uid = Math.floor(Math.random()*0x100000000).toString(16)
var tmpfile = io.createTempFile("txt", "_pterosaur_"+uid);
var metaTmpfile = io.createTempFile("txt", "_pterosaur_"+uid+"_meta");
var messageTmpfile = io.createTempFile("txt", "_pterosaur_"+uid+"_messages");
var unsent = 0;

if (!tmpfile)
    throw Error(_("io.cantCreateTempFile"));

if (!metaTmpfile)
    throw Error(_("io.cantCreateTempFile"));

if (!messageTmpfile)
    throw Error(_("io.cantCreateTempFile"));



//We alternate reads and writes on updates. On writes, we send keypresses to vim. On reads, we read the tmpfile vim is writing to.
var writeInsteadOfRead = 0;

io.system("mkdir /tmp/pterosaur");
io.system("mkfifo /tmp/pterosaur/fifo_"+uid);

//TODO: This is an ugly hack.
io.system("(while killall -0 firefox; do sleep 1; done) > /tmp/pterosaur/fifo_"+uid+" &");

//TODO: Also an ugly hack. Also the --remote is only there because on some computers vim won't create a server outside a terminal unless it has a --remote.
//TODO: Try getting rid of loop now that thigns are stabler
io.system('sh -c \'while killall -0 firefox; do vim --servername pterosaur_'+uid+' +\'\\\'\'call SetupPterosaur("'+tmpfile.path+'","'+metaTmpfile.path+'","'+messageTmpfile.path+'")\'\\\'\'  --remote '+tmpfile.path+' </tmp/pterosaur/fifo_'+uid+' > /dev/null; done\' &');

//If this doesn't match options["fullvim"] we need to perform cleanup
var pterosaurCleanupCheck = false;


group.options.add(["fullvim"], "Edit all text inputs using vim", "boolean", false);

modes.addMode("VIM_NORMAL", {
  char: "N",
  desription: "Vim normal mode",
  bases: [modes.INSERT]
});


modes.addMode("VIM_COMMAND", {
  char: "e",
  desription: "Vim normal mode",
  bases: [modes.VIM_NORMAL]
});



commands.add(["vim[do]"],
    "Send command to vim",
    function (args) {
        dactyl.focus(pterFocused);
        let command = args.join(" ").replace(/%/g,"%%").replace(/\\/g,'\\\\');
        sendToVim += command +"\r"
    }, {
      argCount: "+",
      literal: 0
    });




let timer =  window.setInterval(update, 50);
