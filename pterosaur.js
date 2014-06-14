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
["plugin", { name: "pterosaur",
             version: "0.7",
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

    if (debugMode && !options["pterosaurdebug"])
    {
      killVimbed();
      startVimbed(0);
    }
    else if (!debugMode && options["pterosaurdebug"])
    {
      killVimbed();
      startVimbed(1);
    }

    if(pterFocused && textBox)
    {
      if (savedCursorStart!=null && textBox.selectionStart != savedCursorStart ||
          savedCursorEnd!=null && textBox.selectionEnd != savedCursorEnd)
      {
        updateTextbox(0);
        return;
      }
      if (savedText!=null && textBox.value != savedText)
      {
        updateTextbox(1);
        return;
      }
    }

    //This has to be up here for vimdo to work. This should probably be changed eventually.
    if (writeInsteadOfRead)
    {
      if(sendToVim !== "")
      {
        let tempSendToVim=sendToVim
        sendToVim = ""
        io.system("printf '" + tempSendToVim  + "' > /tmp/vimbed/pterosaur_"+uid+"/fifo");
        unsent=0;
        cyclesSinceLastSend=0;
      }

      if(cyclesSinceLastSend < 2)
      {
        io.system('vim --servername pterosaur_'+uid+' --remote-expr "Vimbed_Poll()" &');
        cyclesSinceLastSend+=1;
      }

      writeInsteadOfRead = 0;
      return;
    }


    if (!options["fullvim"] || (dactyl.focusedElement && dactyl.focusedElement.type === "password") || 
      pterosaurModes.indexOf(modes.main)=== -1)  {
        if(pterFocused) {
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
      //We already skipped some important steps (like selection checking), so wait till next update and do the whole thing.
      return
    }

    let val = tmpfile.read();
    //Vim textfiles are new-line terminated, but browser text vals aren't neccesarily
    if (val !== '')
      val = val.slice(0,-1)
    else
      //If we don't have any text at all, we caught the file right as it was emptied and we don't know anything.
      return

    writeInsteadOfRead = 1; //For next time around

    let metadata = metaTmpfile.read().split('\n');
    vimMode = metadata[0];
    for (var i=1, len=metadata.length; i<len; i++)
    {
      metadata[i]=metadata[i].replace(/,.*/, "")
    }

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
      //TODO: If another message is written right now, we could lose it.
      messageTmpfile.write("");

      if(!unsent)
      {
        //TODO: We don't neccesarily want singleline, but without it we lose focus.
        dactyl.echo(messages,commandline.FORCE_SINGLELINE);
      }

      //We've clearing the entered command. Don't need/want to clear it later and lose our message.
      lastVimCommand=""
    }

    if (vimMode === "e")
    {
      dactyl.echo("ERROR: "+metadata[1])
    }
    else if (vimMode === "n" && modes.main !== modes.VIM_NORMAL)
    {
      dactyl.echo("");
      if (modes.main !== modes.INSERT)
      {
        modes.pop();
      }
      modes.push(modes.VIM_NORMAL);
    }
    else if ((vimMode === "v" || vimMode ==="V") && modes.main !==modes.VIM_VISUAL)
    {
      dactyl.echo("");
      if (modes.main !== modes.INSERT)
      {
        modes.pop();
      }
      modes.push(modes.VIM_VISUAL);
    }
    else if ((vimMode === "s" || vimMode ==="S") && modes.main !==modes.VIM_SELECT)
    {
      dactyl.echo("");
      if (modes.main !== modes.INSERT)
      {
        modes.pop();
      }
      modes.push(modes.VIM_SELECT);
    }
    //R is replace and Rv is virtual replace
    else if ((vimMode[0]==="R") && modes.main !==modes.VIM_REPLACE)
    {
      dactyl.echo("");
      if (modes.main !== modes.INSERT)
      {
        modes.pop();
      }
      modes.push(modes.VIM_REPLACE);
    }
    else if (vimMode === "i" && modes.main !== modes.INSERT)
    {
      dactyl.echo("");
      modes.pop();
    }

    if (textBox) {

        textBox.value = val;
        savedText = val;

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
    unsent=1;
}

function setupForTextbox() {
    //Clear lingering command text
    if (vimMode === "c")
      io.system("printf '\\ei' > /tmp/vimbed/pterosaur_"+uid+"/fifo");

    pterFocused = dactyl.focusedElement;

    updateTextbox(0);
}

function updateTextbox(preserveMode) {
    unsent=1

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

    if (!tmpfile.write(text+"\n"))
      throw Error(_("io.cantEncode"));


    var ioCommand;

    ioCommand = 'vim --servername pterosaur_'+uid+' --remote-expr "Vimbed_UpdateText(<lineStart>,<columnStart>,<lineEnd>,<columnEnd>, <preserveMode>)"';

    ioCommand = ioCommand.replace(/<columnStart>/, columnStart);
    ioCommand = ioCommand.replace(/<lineStart>/, lineStart);
    ioCommand = ioCommand.replace(/<columnEnd>/, columnEnd);
    ioCommand = ioCommand.replace(/<lineEnd>/, lineEnd);
    ioCommand = ioCommand.replace(/<preserveMode>/, preserveMode);
    console.log(ioCommand);

    io.system(ioCommand);

    writeInsteadOfRead = 0
}

modes.INSERT.params.onKeyPress = function(eventList) {
    const KILL = false, PASS = true;

    if (!options["fullvim"] || dactyl.focusedElement && dactyl.focusedElement.type === "password")
      return PASS;

    let inputChar = DOM.Event.stringify(eventList[0])

    /*if (commandLock > COMMAND_MODE_SYNC)
    {
      commandBuffer += inputChar;
      return;
    }
    */

    if (/^<(?:.-)*(?:BS|lt|Up|Down|Left|Right|Space|S-Space|Return|Del|Tab|C-v|C-h|C-w|C-u|C-k|C-r)>$/.test(inputChar)) {
      //Currently, this also refreshes. I need to disable that.
      if (inputChar==="<Space>" || inputChar==="<S-Space>")
        sendToVim += ' '
      else if (inputChar==="<BS>")
        sendToVim += '\\b'
      else if (inputChar==="<Return>") {
        sendToVim += '\\r'
        //Inputs often trigger on return. But if we send it for textareas, we get an extra linebreak.
        if (textBox.tagName.toLowerCase()==="input")
            return PASS;
        else
            return KILL;
      }
      else if (inputChar==="<Tab>")
        if ( modes.main === modes.VIM_COMMAND)
            sendToVim += '\\t'
        else
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
      else if (inputChar==="<C-v>")
        sendToVim += '\x16'
    }
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

function startVimbed(debug) {
  debugMode = debug;

  uid = Math.floor(Math.random()*0x100000000).toString(16)
  dir = FileUtils.File("/tmp/vimbed/pterosaur_"+uid);
  tmpfile = FileUtils.File("/tmp/vimbed/pterosaur_"+uid+"/contents.txt");
  metaTmpfile = FileUtils.File("/tmp/vimbed/pterosaur_"+uid+"/meta.txt");
  messageTmpfile = FileUtils.File("/tmp/vimbed/pterosaur_"+uid+"/messages.txt");

  dir.create(Ci.nsIFile.DIRECTORY_TYPE, octal(700));
  tmpfile.create(Ci.nsIFile.NORMAL_FILE_TYPE, octal(600));
  metaTmpfile.create(Ci.nsIFile.NORMAL_FILE_TYPE, octal(600));
  messageTmpfile.create(Ci.nsIFile.NORMAL_FILE_TYPE, octal(600));

  tmpfile=File(tmpfile);
  metaTmpfile=File(metaTmpfile);
  messageTmpfile=File(messageTmpfile);

  if (!tmpfile)
      throw Error(_("io.cantCreateTempFile"));

  if (!metaTmpfile)
      throw Error(_("io.cantCreateTempFile"));

  if (!messageTmpfile)
      throw Error(_("io.cantCreateTempFile"));
  io.system("mkfifo /tmp/vimbed/pterosaur_"+uid+"/fifo");

  //sleepProcess holds the fifo open so vim doesn't close.
  sleepProcess = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
  vimProcess = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);

  sleepProcess.init(FileUtils.File('/bin/sh'));
  sleepProcess.runAsync(['-c',"(while [ -p /tmp/vimbed/pterosaur_"+uid+"/fifo ]; do sleep 10; done) > /tmp/vimbed/pterosaur_"+uid+"/fifo"], 2);

  vimProcess.init(FileUtils.File('/bin/sh'));
  //Note: +clientserver doesn't work for some values of TERM (like linux)
  if (debug)
    vimProcess.runAsync([ '-c',"TERM=xterm vim --servername pterosaur_"+uid+" +'call Vimbed_SetupVimbed(\"\",\"\")' </tmp/vimbed/pterosaur_"+uid+"/fifo"],2);
  else
    vimProcess.runAsync([ '-c',"TERM=xterm vim --servername pterosaur_"+uid+" +'call Vimbed_SetupVimbed(\"\",\"\")' </tmp/vimbed/pterosaur_"+uid+"/fifo >/dev/null"],2);

  //We have to send SOMETHING to the fifo or vim will stay open when we close.
  io.system("echo -n ' ' > /tmp/vimbed/pterosaur_"+uid+"/fifo")

}

var savedText = null;
var savedCursorStart = null;
var savedCursorEnd = null;
var vimMode = 'i';
var pterFocused = null;
var textBox;
var lastVimCommand = "";
var sendToVim = "";

var uid;
var dir;
var tmpfile;
var metaTmpfile;
var messageTmpfile;
var sleepProcess;
var vimProcess;


var unsent = 1;

var cyclesSinceLastSend = 0;


function killVimbed() {
  dir.remove(true);
}

let onUnload = killVimbed

//We alternate reads and writes on updates. On writes, we send keypresses to vim. On reads, we read the tmpfile vim is writing to.
var writeInsteadOfRead = 0;


//If this doesn't match options["fullvim"] we need to perform cleanup
var pterosaurCleanupCheck = false;

var debugMode =false;


group.options.add(["fullvim"], "Edit all text inputs using vim", "boolean", false);
group.options.add(["pterosaurdebug"], "Display vim in terminal", "boolean", false);

startVimbed(false);

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

modes.addMode("VIM_SELECT", {
  char: "s",
  desription: "Vim selection mode",
  bases: [modes.VIM_NORMAL]
});

modes.addMode("VIM_VISUAL", {
  char: "V",
  desription: "Vim visual mode",
  bases: [modes.VIM_NORMAL]
});

modes.addMode("VIM_REPLACE", {
  char: "R",
  desription: "Vim replace mode",
  bases: [modes.VIM_NORMAL]
});

var pterosaurModes = [modes.INSERT, modes.AUTOCOMPLETE, modes.VIM_NORMAL, modes.VIM_COMMAND, modes.VIM_SELECT, modes.VIM_VISUAL, modes.VIM_REPLACE]


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




let timer =  window.setInterval(update, 30);
