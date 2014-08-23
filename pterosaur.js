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
             version: "0.8",
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

    var cursorPos;

    if(pterFocused && textBox)
    {
      cursorPos = textBoxGetSelection()
      if (savedCursorStart!=null &&
           (cursorPos.start.row != savedCursorStart.row || cursorPos.start.column != savedCursorStart.column) ||
          savedCursorEnd!=null &&
           (cursorPos.end.row != savedCursorEnd.row || cursorPos.end.column != savedCursorEnd.column))
      {
        updateTextbox(0);
        return;
      }
      if (savedText!=null && textBoxGetValue() != savedText)
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

    textBoxSetValue(val)

    savedText = val;

    if (textBox) {
        if(metadata.length>2 && vimMode !== "c" && vimMode!== "e" && !unsent)
        {
          textBoxSetSelection(metadata[1], metadata[2])
        }

        cursorPos = textBoxGetSelection()

        savedCursorStart = cursorPos.start;
        savedCursorEnd = cursorPos.end;
    }
}

function textBoxGetSelection(){
  switch (textBoxType) {
    case "ace":
      return textBoxGetSelection_ace()
    case "normal":
      var text = textBox.value;
      if (text){
        var preStart = text.substr(0, textBox.selectionStart);
        var preEnd = text.substr(0, textBox.selectionEnd);
        var rowStart = 1 + preStart.replace(/[^\n]/g, "").length;
        var columnStart = 1 + preStart.replace(/[^]*\n/, "").length;
        var rowEnd = 1 + preEnd.replace(/[^\n]/g, "").length;
        var columnEnd = 1 + preEnd.replace(/[^]*\n/, "").length;
        return {"start": {"row": rowStart, "column": columnStart}, "end": {"row":rowEnd, "column": columnEnd}};
      }
      return {"start": {"row": 1, "column": 1}, "end": {"row":1, "column": 1}};
    case "designMode":
      let fromBeginning = RangeFind.nodeContents(textBox.rootElement);
      let oldRange = textBox.selection.getRangeAt(0);
      fromBeginning.setEnd(oldRange.startContainer, oldRange.startOffset);
      var preStart = DOM.stringify(fromBeginning, true);
      if (fromBeginning.startContainer instanceof Text)
          preStart = preStart.replace(/^(?:<[^>"]+>)+/, "");
      if (fromBeginning.endContainer instanceof Text)
          preStart = preStart.replace(/(?:<\/[^>"]+>)+$/, "");
      fromBeginning.setEnd(oldRange.endContainer, oldRange.endOffset);
      var preEnd = DOM.stringify(fromBeginning, true);
      if (fromBeginning.startContainer instanceof Text)
          preEnd = preEnd.replace(/^(?:<[^>"]+>)+/, "");
      if (fromBeginning.endContainer instanceof Text)
          preEnd = preEnd.replace(/(?:<\/[^>"]+>)+$/, "");
      console.log("pres")
      console.log(preStart)
      console.log(preEnd)
      var rowStart = 1 + preStart.replace(/[^\n]/g, "").length;
      var columnStart = 1 + preStart.replace(/[^]*\n/, "").length;
      var rowEnd = 1 + preEnd.replace(/[^\n]/g, "").length;
      var columnEnd = 1 + preEnd.replace(/[^]*\n/, "").length;
      return {"start": {"row": rowStart, "column": columnStart}, "end": {"row":rowEnd, "column": columnEnd}};
  }
}

function createSandbox(){
  var protocol = content.location.protocol;
  var host = content.location.host;
  //I don't think these can be non-strings, but there's no harm in being paranoid.
  if (typeof protocol === "string" && typeof host === "string")
  {
    return new Components.utils.Sandbox(protocol + "//" + host);
  }
}

function textBoxGetSelection_ace(){
  var sandbox = createSandbox();
  if (!sandbox)
    return;
  sandbox.ace = content.wrappedJSObject.ace;
  sandbox.id = textBox.parentNode.id;
  sandbox.stringify = JSON.stringify;
  var sandboxScript="\
    var aceEditor = ace.edit(id);\
    range =  stringify(aceEditor.getSession().getSelection().getRange());\
  "
  Components.utils.evalInSandbox(sandboxScript, sandbox);

  if (typeof sandbox.range === "string")
  {
    var range = JSON.parse(sandbox.range);
    range.start.row+=1;
    range.start.column+=1;
    range.end.row+=1;
    range.end.column+=1;
    return range;
  }
  else
  {
    console.log("Sandbox Error!");
    return {"start": {"column": 1, "row": 1}, "end": {"column": 1, "row": 1}}
  }
}

function textBoxSetSelection(start, end){
  switch (textBoxType) {
    case "ace":
      textBoxSetSelection_ace(start, end)
      break;
    case "normal":
      textBox.setSelectionRange(parseInt(start), parseInt(end));
      break;
    case "designMode":
      let range = RangeFind.nodeContents(textBox.rootElement);
      range.setStart(textBox.rootElement.firstChild, parseInt(start))
      range.setEnd(textBox.rootElement.firstChild, parseInt(end))
      textBox.selection.removeAllRanges()
      textBox.selection.addRange(range)
      break;
  }
}

function textBoxSetSelection_ace(start, end){
  var sandbox = createSandbox();
  if (!sandbox)
    return;
  sandbox.start = start.split(",");
  sandbox.end = end.split(",");
  sandbox.ace = content.wrappedJSObject.ace;
  sandbox.id = textBox.parentNode.id;
  var sandboxScript="\
    var aceEditor = ace.edit(id);\
    aceEditor.getSession().getSelection().setSelectionRange(\
                                          {'start':{ 'row':start[2], 'column':start[1]},\
                                           'end':  { 'row':end[2],   'column':end[1]}});\
  "
  Components.utils.evalInSandbox(sandboxScript, sandbox);
}


function htmlToText(inText) {
  var tmp = document.createElement('div');
  tmp.innerHTML = inText.replace(/\\/g, '\\\\').replace(/<br\/>/g, 'n\\n')
  return tmp.textContent.replace(/n\\n/g, '\n').replace(/\\\\/g, '\\');
}

function textToHtml(inText) {
  return inText.replace(/&/g, '&amp').replace(/</g, '&lt').replace(/>/g, '&gt').replace(/\n/g, '<br/>')
}

function textBoxSetValue(newVal) {
  switch (textBoxType) {
    case "ace":
      textBoxSetValue_ace(newVal);
      break;
    case "normal":
      textBox.value = newVal;
      break;
    case "designMode":
      textBox.rootElement.innerHTML = textToHtml(newVal);
      break;
  }
}

function textBoxSetValue_ace(newVal){
  var sandbox = createSandbox();
  if (!sandbox)
    return;
  sandbox.newVal = newVal;
  sandbox.ace = content.wrappedJSObject.ace;
  sandbox.id = textBox.parentNode.id;
  var sandboxScript="\
    var aceEditor = ace.edit(id);\
    if (aceEditor.getSession().getValue()!=newVal){\
      aceEditor.getSession().setValue(newVal);\
    }\
  "
  Components.utils.evalInSandbox(sandboxScript, sandbox);
}

function textBoxGetValue() {
  switch (textBoxType) {
    case "ace":
      return textBoxGetValue_ace();
    case "normal":
      return textBox.value;
    case "designMode":
      return htmlToText(textBox.rootElement.innerHTML);
  }
}

function textBoxGetValue_ace(){
  var sandbox = createSandbox();
  if (!sandbox)
    return;
  sandbox.ace = content.wrappedJSObject.ace;
  sandbox.id = textBox.parentNode.id;
  var sandboxScript="\
    var aceEditor = ace.edit(id);\
    value = aceEditor.getSession().getValue();\
  "
  Components.utils.evalInSandbox(sandboxScript, sandbox);
  //Make sure it's a string to avoid letting malicious code escape.
  var returnVal = sandbox.value
  if (typeof returnVal === "string")
    return returnVal;
  else
    console.log("Sandbox Error!");
    return "Sandbox Error!"
}

//TODO: Need consistent capitalization for textbox
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

    textBox = dactyl.focusedElement;

    if (textBox == null)
    {
      textBox = Editor.getEditor(document.commandDispatcher.focusedWindow);
      console.log(textBox);
      textBoxType = "designMode";
    }
    else {
      if(/ace_text-input/.test(textBox.className))
        textBoxType = "ace";
      else
        textBoxType = "normal"
    }

    if (textBox) {
        var text = textBoxGetValue()
        var cursorPos = textBoxGetSelection()
        savedCursorStart = cursorPos.start;
        savedCursorEnd = cursorPos.end;
    }

    if (!tmpfile.write(text+"\n"))
      throw Error(_("io.cantEncode"));

    var ioCommand;

    ioCommand = 'vim --servername pterosaur_'+uid+' --remote-expr "Vimbed_UpdateText(<rowStart>,<columnStart>,<rowEnd>,<columnEnd>, <preserveMode>)"';

    ioCommand = ioCommand.replace(/<rowStart>/, cursorPos.start.row);
    ioCommand = ioCommand.replace(/<columnStart>/, cursorPos.start.column);
    ioCommand = ioCommand.replace(/<rowEnd>/, cursorPos.end.row);
    ioCommand = ioCommand.replace(/<columnEnd>/, cursorPos.end.column);
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
              if (vimMode==="n")
              {
                modes.reset()
              }
              else {
                sendToVim+="\\e"
              }
            });

        mappings.builtin.add(
            [modes.INSERT],
            ["<BS>"],
            ["Handle escape key"],
            function(){
                sendToVim+="\\b"
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
        mappings.builtin.remove( modes.INSERT, "<BS>");
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
var textBoxType;
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
