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

function useFullVim(){
  return options["fullvim"] && !(dactyl.focusedElement && dactyl.focusedElement.type === "password")
}

function updateVim(skipKeyHandle){
  if(sendToVim!== "")
  {
    let tempSendToVim = sendToVim
    sendToVim = ""
    io.system("printf '" + tempSendToVim  + "' > /tmp/vimbed/pterosaur_"+uid+"/fifo");
    unsent=0;
    cyclesSinceLastSend=0;
    if (!skipKeyHandle && ['\\e', '\\r', '\\t'].indexOf(lastKey) == -1) {
      let savedLastKey = lastKey;
      setTimeout( function(){if (lastKey === savedLastKey) {handleKeySending(lastKey);}}, CYCLE_TIME*5 );
    }
  }
}

function update(){
    if (pterosaurCleanupCheck !== useFullVim())
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

    if(dactyl.focusedElement === pterFocused && textBoxType)
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

      if (savedText != null && textBoxGetValue() != savedText)
      {
        updateTextbox(1);
        return;
      }
    }

    //This has to be up here for vimdo to work. This should probably be changed eventually.
    if (writeInsteadOfRead)
    {
      updateVim();

      if(cyclesSinceLastSend < 2)
      {
        io.system('vim --servername pterosaur_'+uid+' --remote-expr "Vimbed_Poll()" &');
        cyclesSinceLastSend+=1;
      }

      writeInsteadOfRead = 0;
      return;
    }


    if (!useFullVim() || pterosaurModes.indexOf(modes.main) === -1)  {
        if(textBoxType) {
          cleanupForTextbox();
          textBoxType = ""
        }
        return;
    }

    if (dactyl.focusedElement !== pterFocused || !textBoxType)
    {
      if(textBoxType)
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

    if (textBoxType) {
        if(metadata.length>2 && vimMode !== "c" && vimMode!== "e" && !unsent)
        {
          textBoxSetSelection(metadata[1], metadata[2])
        }

        cursorPos = textBoxGetSelection()

        savedCursorStart = cursorPos.start;
        savedCursorEnd = cursorPos.end;
    }
}

function createSandbox(){
  var doc = textBox.ownerDocument || content;
  var protocol = doc.location.protocol;
  var host = doc.location.host;
  //I don't think these can be non-strings, but there's no harm in being paranoid.
  if (typeof protocol === "string" && typeof host === "string")
  {
    return new Components.utils.Sandbox(protocol + "//" + host);
  }
}

function textBoxGetSelection(){
  switch (textBoxType) {
    case "ace":
      return textBoxGetSelection_ace()
    case "codeMirror":
      return textBoxGetSelection_codeMirror()
    case "normal":
      var text = textBox.value;
      if (text){
        var preStart = text.substr(0, textBox.selectionStart);
        var preEnd = text.substr(0, textBox.selectionEnd);
        var rowStart = 1 + preStart.replace(/[^\n]/g, "").length;
        var columnStart = 1 + preStart.replace(/[^]*\n/, "").length;
        var charStart = 1 + preStart.length;
        var rowEnd = 1 + preEnd.replace(/[^\n]/g, "").length;
        var columnEnd = 1 + preEnd.replace(/[^]*\n/, "").length;
        var charEnd = 1 + preEnd.length;
        return {"start": {"row": rowStart, "column": columnStart, "char": charStart}, "end": {"row":rowEnd, "column": columnEnd, "char":charEnd}};
      }
      return {"start": {"row": 1, "column": 1}, "end": {"row":1, "column": 1}};
    case "contentEditable":
    case "designMode":
      let fromBeginning = RangeFind.nodeContents(textBox.rootElement);
      let oldRange = textBox.selection.getRangeAt(0);

      fromBeginning.setEnd(oldRange.startContainer, oldRange.startOffset);
      var preStart = htmlToText(DOM.stringify(fromBeginning, true));
      fromBeginning.setEnd(oldRange.endContainer, oldRange.endOffset);
      var preEnd = htmlToText(DOM.stringify(fromBeginning, true));

      var rowStart = 1 + preStart.replace(/[^\n]/g, "").length;
      var columnStart = 1 + preStart.replace(/[^]*\n/, "").length;
      var rowEnd = 1 + preEnd.replace(/[^\n]/g, "").length;
      var columnEnd = 1 + preEnd.replace(/[^]*\n/, "").length;
      return {"start": {"row": rowStart, "column": columnStart}, "end": {"row":rowEnd, "column": columnEnd}};
  }
}

function textBoxGetSelection_ace(){
  var sandbox = createSandbox();
  if (!sandbox)
    return;
  sandbox.ace = content.wrappedJSObject.ace;
  sandbox.editor = textBox.parentNode.wrappedJSObject;
  sandbox.stringify = JSON.stringify;
  var sandboxScript="\
    var aceEditor = ace.edit(editor);\
    range =  stringify(aceEditor.getSession().getSelection().getRange());\
  ";
  Components.utils.evalInSandbox(sandboxScript, sandbox);
  return parseSandboxRangeForVim(sandbox);
}

function textBoxGetSelection_codeMirror(){
  var sandbox = createSandbox();
  if (!sandbox)
    return;
  sandbox.editor = textBox.wrappedJSObject;
  sandbox.stringify = JSON.stringify;
  var sandboxScript="\
    var anchor = editor.CodeMirror.getCursor('anchor');\
    var head = editor.CodeMirror.getCursor('head');\
    var rangeObj = {};\
    if (head.line < anchor.line || head.line == anchor.line && head.ch < anchor.ch) {\
      rangeObj.start = {'row': head.line, 'column': head.ch};\
      rangeObj.end = {'row': anchor.line, 'column': anchor.ch};\
    } else {\
      rangeObj.start = {'row': anchor.line, 'column': anchor.ch};\
      rangeObj.end = {'row': head.line, 'column': head.ch};\
    }\
    range = stringify(rangeObj);\
  ";
  Components.utils.evalInSandbox(sandboxScript, sandbox);
  return parseSandboxRangeForVim(sandbox);
}

function parseSandboxRangeForVim(sandbox) {
  if (typeof sandbox.range === "string") {
    var range = JSON.parse(sandbox.range);
    range.start.row+=1;
    range.start.column+=1;
    range.end.row+=1;
    range.end.column+=1;
    return range;
  } else {
    console.log("Sandbox Error!");
    return {"start": {"column": 1, "row": 1}, "end": {"column": 1, "row": 1}}
  }
}

function textBoxSetSelectionFromSaved(saved){
  var start = (saved.start.char-1) + "," + (saved.start.column-1) + "," + (saved.start.row-1)
  var end = (saved.end.char-1) + "," + (saved.end.column-1) + "," + (saved.end.row-1)
  textBoxSetSelection(start, end);
}

function textBoxSetSelection(start, end){
  switch (textBoxType) {
    case "ace":
      textBoxSetSelection_ace(start, end)
      break;
    case "codeMirror":
      textBoxSetSelection_codeMirror(start, end)
      break;
    case "normal":
      textBox.setSelectionRange(parseInt(start), parseInt(end));
      break;
    case "contentEditable":
    case "designMode":
      start = start.split(",")
      end = end.split(",")

      let range = RangeFind.nodeContents(textBox.rootElement);
      let nodes = textBox.rootElement.childNodes;
      let nodeIndex = 0;
      let row = 0;
      let length = nodes.length;
      while(row<start[2] && nodeIndex < length)
      {
        if (nodes[nodeIndex]) {
          if (nodes[nodeIndex].tagName == "BR") {
            row += 1;
          }
        }
        nodeIndex += 1
      }
      range.setStart(nodes[nodeIndex], start[1])

      while(row<end[2] && nodeIndex < length)
      {
        if (nodes[nodeIndex]) {
          if (nodes[nodeIndex].tagName == "BR") {
            row += 1;
          }
        }
        nodeIndex += 1
      }
      range.setEnd(nodes[nodeIndex], end[1])

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
  sandbox.editor = textBox.parentNode.wrappedJSObject;
  var sandboxScript="\
    var aceEditor = ace.edit(editor);\
    aceEditor.getSession().getSelection().setSelectionRange(\
                                          {'start': {'row':start[2], 'column':start[1]},\
                                           'end':   {'row':end[2],   'column':end[1]}});\
  "
  Components.utils.evalInSandbox(sandboxScript, sandbox);
}

function textBoxSetSelection_codeMirror(start, end){
  var sandbox = createSandbox();
  if (!sandbox)
    return;
  sandbox.start = start.split(",");
  sandbox.end = end.split(",");
  sandbox.editor = textBox.wrappedJSObject;
  sandbox.CodeMirror = content.wrappedJSObject.CodeMirror;

  var sandboxScript="\
    if (CodeMirror){\
        editor.CodeMirror.setSelection({'line':parseInt(start[2]), 'ch':parseInt(start[1])}, {'line':parseInt(end[2]), 'ch':parseInt(end[1])});\
    }\
  "
  Components.utils.evalInSandbox(sandboxScript, sandbox);
}

function moveLeft(number, shift){
  var key = "Left";
  if (number < 0) {
    number = -number;
    key = "Right";
  }
  if (shift) {
    key = "<S-"+key+">";
  } else {
    key = "<"+key+">";
  }
  for (var i=0; i<number; i++) {
    events.feedkeys(key);
  }
}

function moveUp(number, shift){
  var key = "Up";
  if (number < 0) {
    number = -number;
    key = "Down";
  }
  if (shift) {
    key = "<S-"+key+">";
  } else {
    key = "<"+key+">";
  }
  for (var i=0; i<number; i++) {
    events.feedkeys(key);
  }
}


function htmlToText(inText) {
  var tmp = document.createElement('div');
  inText = inText.replace(/\\/g, '\\\\'); //Double backslashes so we can use them as escapes.
  tmp.innerHTML = inText.replace(/<br[^>]*>/g, 'n\\n').replace(/&nbsp;/g, 's\\s'); //Preserve whitespace
  return tmp.textContent.replace(/n\\n/g, '\n').replace(/s\\s/g, ' ').replace(/\\\\/g, '\\');
}

function textToHtml(inText) {
  return inText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/ /g, '&nbsp;').replace(/\n/g, '<br>')
}

function textBoxSetValue(newVal) {
  switch (textBoxType) {
    case "ace":
      textBoxSetValue_ace(newVal);
      break;
    case "codeMirror":
      textBoxSetValue_codeMirror(newVal);
      break;
    case "normal":
      textBox.value = newVal;
      break;
    case "contentEditable":
    case "designMode":
      var newHtml = textToHtml(newVal)+"<br>";//Design mode needs the trailing newline
      if (textBox.rootElement.innerHTML != newHtml)
      {
        textBox.rootElement.innerHTML = newHtml
      }
      break;
  }
}

function textBoxSetValue_ace(newVal){
  var sandbox = createSandbox();
  if (!sandbox)
    return;
  sandbox.newVal = newVal;
  sandbox.ace = content.wrappedJSObject.ace;
  sandbox.editor = textBox.parentNode.wrappedJSObject;
  var sandboxScript="\
    var aceEditor = ace.edit(editor);\
    if (aceEditor.getSession().getValue()!=newVal){\
      aceEditor.getSession().setValue(newVal);\
    }\
  "
  Components.utils.evalInSandbox(sandboxScript, sandbox);
}

function textBoxSetValue_codeMirror(newVal){
  var sandbox = createSandbox();
  if (!sandbox)
    return;
  sandbox.newVal = newVal
  sandbox.editor = textBox.wrappedJSObject;
  var sandboxScript="\
    if (editor.CodeMirror.getValue()!=newVal){\
      editor.CodeMirror.setValue(newVal);\
    }\
  "
  Components.utils.evalInSandbox(sandboxScript, sandbox);
}

function textBoxGetValue() {
  switch (textBoxType) {
    case "ace":
      return textBoxGetValue_ace();
    case "codeMirror":
      return textBoxGetValue_codeMirror();
    case "normal":
      return textBox.value;
    case "contentEditable":
    case "designMode":
      var retVal = htmlToText(textBox.rootElement.innerHTML);
      if (retVal.slice(-1) == "\n")
      {
        return retVal.slice(0,-1);
      } else {
        return retVal;
      }
  }
}

function textBoxGetValue_ace(){
  var sandbox = createSandbox();
  if (!sandbox)
    return;
  sandbox.ace = content.wrappedJSObject.ace;
  sandbox.editor = textBox.parentNode.wrappedJSObject;
  var sandboxScript="\
    var aceEditor = ace.edit(editor);\
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

function textBoxGetValue_codeMirror(){
  var sandbox = createSandbox();
  if (!sandbox)
    return;
  sandbox.editor = textBox.wrappedJSObject;
  var sandboxScript="\
    value = editor.CodeMirror.getValue();\
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
    lastKey = "";
    unsent=1
    cyclesSinceLastSend=0;

    savedText = null;
    savedCursorStart = null;
    savedCursorEnd = null;

    textBox = dactyl.focusedElement;

    if (textBox == null)
    {
      textBox = Editor.getEditor(document.commandDispatcher.focusedWindow);
      if(textBox) {
        textBoxType = "designMode";
      } else {
        textBoxType = "";
      }
    } else {
      if(dactyl.focusedElement.isContentEditable) {
        var doc = textBox.ownerDocument || content;

        textBoxType = "contentEditable";
        textBox = {};
        textBox.rootElement = dactyl.focusedElement;
        //Prserve any tags that wrap the WHOLE contenteditable
        while (textBox.rootElement.childNodes.length == 1 && textBox.rootElement.childNodes[0].tagName) {
          textBox.rootElement = textBox.rootElement.childNodes[0]
        }

        textBox.selection = doc.getSelection();
      } else if(/ace_text-input/.test(textBox.className)) {
        textBoxType = "ace";
      }
      else if (textBox.parentNode && textBox.parentNode.parentNode && /CodeMirror/.test(textBox.parentNode.parentNode.className)) {
        textBoxType = "codeMirror"
        textBox = textBox.parentNode.parentNode;
      }
      else if (["INPUT", "TEXTAREA", "HTML:INPUT"].indexOf(textBox.nodeName.toUpperCase()) >= 0) {
        textBoxType = "normal";
      }
      else {
        textBoxType = "";
      }
    }

    if (textBoxType) {
      if (textBox) {
          var text = textBoxGetValue()
          var cursorPos = textBoxGetSelection()
          savedCursorStart = cursorPos.start;
          savedCursorEnd = cursorPos.end;
      }

      if (!tmpfile.write(text+"\n"))
        throw Error(_("io.cantEncode"));

      var ioCommand;

      ioCommand = 'vim --servername pterosaur_'+uid+' --remote-expr "Vimbed_UpdateText(<rowStart>, <columnStart>, <rowEnd>, <columnEnd>, <preserveMode>)"';

      ioCommand = ioCommand.replace(/<rowStart>/, cursorPos.start.row);
      ioCommand = ioCommand.replace(/<columnStart>/, cursorPos.start.column);
      ioCommand = ioCommand.replace(/<rowEnd>/, cursorPos.end.row);
      ioCommand = ioCommand.replace(/<columnEnd>/, cursorPos.end.column);
      ioCommand = ioCommand.replace(/<preserveMode>/, preserveMode);

      console.log(ioCommand);

      io.system(ioCommand);
    }

    writeInsteadOfRead = 0
}

//Some sites need to receive key events in addition to sending them to vim. We don't do this for javascript editors because they handle js stuff themselves.
function handleKeySending(key) {
  if (textBoxType == "normal") {
    skipKeyPress = true;
    try{
      var value = textBoxGetValue()
      var cursorPos = textBoxGetSelection()
      var oldFocus = dactyl.focusedElement;
      events.feedkeys(key);
      if (oldFocus == dactyl.focusedElement) {
        textBoxSetValue(value);
        textBoxSetSelectionFromSaved(cursorPos);
      }
    }
    finally{
      skipKeyPress = false;
    }
  } else if (["contentEditable", "designMode"].indexOf(textBoxType) != -1){
    skipKeyPress = true;
    try{
      var value = textBox.rootElement.innerHTML; //We don't need to translate this, since it's going right back in. Doing the same thing with the cursor isn't quite as easy.
      var cursorPos = textBoxGetSelection()
      var oldFocus = dactyl.focusedElement;
      events.feedkeys(key);
      if (oldFocus == dactyl.focusedElement) {
        textBox.rootElement.innerHTML = value;
        textBoxSetSelectionFromSaved(cursorPos);
      }
    } finally{
      skipKeyPress = false;
    }
  }
}

var skipKeyPress = false;
modes.INSERT.params.onKeyPress = function(eventList) {
    if (skipKeyPress) {
      return true;
    }
    const KILL = false, PASS = true;

    if (!useFullVim())
      return PASS;

    let inputChar = DOM.Event.stringify(eventList[0]);

    if (inputChar[0] === "<"){
      switch(inputChar) {
        case "<Space>":
        case "<S-Space>":
          queueForVim(' ');
          break;
        case "<Tab>": //We already handled vim's return if we got here.
          return PASS;
        case "<Up>":
          if(textBoxType != "codeMirror")
            queueForVim('\\e[A');
          break;
        case "<Down>":
          if(textBoxType != "codeMirror")
            queueForVim('\\e[B');
          break;
        case "<Right>":
          if(textBoxType != "codeMirror")
            queueForVim('\\e[C');
          break;
        case "<Left>":
          if(textBoxType != "codeMirror")
            queueForVim('\\e[D');
          break;
        case "<lt>":
          queueForVim('<');
          break;
        case "<Return>": //We already handled vim's return if we got here.
          return PASS;
        default:
          if (inputChar.slice(0,3)==="<C-" && inputChar.length == 5) {
            queueForVim(String.fromCharCode(inputChar[3].charCodeAt(0)-96));
          } else {
            return PASS;
          }
      }
    } else {
      switch(inputChar) {
        case '%':
          queueForVim('%%');
          break;
        case '\\':
          queueForVim('\\\\');
          break;
        case '"':
          queueForVim('\"');
          break;
        case "'":
          queueForVim("\'\\'\'");
          break;
        default:
          queueForVim(inputChar);
      }
    }
    return KILL;
}

function queueForVim(key) {
  lastKey = key;
  sendToVim += key;
  if (key === '\\e'){
    sendToVim += '\\000'; //If we actually pressed an escape key, send a null byte afterwards so vim doesn't wait for the rest of the sequence.
  }
}

var handleReturnDirectly = false;

//We want to manually handle carriage returns and tabs because otherwise forms can be submitted or fields can be tabbed out of before the textfield can finish updating.
function specialKeyHandler(key) {
    if (handleReturnDirectly) {
      return Events.PASS_THROUGH;
    }
    if (modes.main != modes.VIM_COMMAND) {
        updateVim(true);
        if (key === "<Return>") {
          queueForVim("\\r");
        } else if (key === "<Tab>"){
          queueForVim("\\t");
        }
        setTimeout( function() {
          handleReturnDirectly=true;
          try {
            var value = textBoxGetValue() //Preserve the old value so the Return doesn't change it.
            var cursorPos = textBoxGetSelection()
            var oldFocus = dactyl.focusedElement;
            events.feedkeys(key);
            if (oldFocus == dactyl.focusedElement && (key !== "<Return>" || newLineCheck(value))) {
              textBoxSetValue(value);
              textBoxSetSelectionFromSaved(cursorPos);
            }
          } finally {
            handleReturnDirectly=false;
          }
        }, CYCLE_TIME*5) //Delay is to make sure forms are updated from vim before being submitted.
    }
    else {
        if (key === "<Return>") {
          queueForVim("\\r");
        } else if (key === "<Tab>"){
          queueForVim("\\t");
        }
    }
}

//Returns true if there is one additional newline. Useful in figuring out if carriage return added a line(which we should ignore) or did something special
function newLineCheck(value){
  return textBoxGetValue().split("\n").length - value.split("\n").length === 1
}

function cleanupPterosaur() {
    pterosaurCleanupCheck = useFullVim();
    if (pterosaurCleanupCheck) {
        mappings.builtin.remove(modes.INSERT, "<Space>");
        mappings.builtin.remove(modes.INSERT, "<Return>");
        mappings.builtin.add(
            [modes.INSERT],
            ["<Esc>"],
            ["Handle escape key"],
            function(){
              if (vimMode==="n" || lastKey === '\\e')
              {
                modes.reset();
              }
              else {
                queueForVim("\\e");
              }
            });

        mappings.builtin.add(
            [modes.INSERT],
            ["<BS>"],
            ["Handle escape key"],
            function(){
                queueForVim("\\b");
            });

        mappings.builtin.add(
            [modes.INSERT],
            ["<C-r>"],
            "Override refresh and send <C-r> to vim.",
            function(){
              queueForVim("\x12");
            },
            {noTransaction: true});

        mappings.builtin.add(
            [modes.INSERT],
            ["<S-Return>"],
            ["Override websites' carriage return behavior"],
            function(){
              queueForVim("\\r");
            },
            {noTransaction: true});

        mappings.builtin.add(
            [modes.INSERT],
            ["<Return>"],
            ["Override websites' carriage return behavior"],
            function(){return specialKeyHandler("<Return>");});

        mappings.builtin.add(
            [modes.INSERT],
            ["<Tab>"],
            ["Override websites' carriage return behavior"],
            function(){return specialKeyHandler("<Tab>");});
    }
    else {
        mappings.builtin.remove( modes.INSERT, "<Esc>");
        mappings.builtin.remove( modes.INSERT, "<BS>");
        mappings.builtin.remove( modes.INSERT, "<C-r>");
        mappings.builtin.remove( modes.INSERT, "<Return>");
        mappings.builtin.remove( modes.INSERT, "<S-Return>");
        mappings.builtin.remove( modes.INSERT, "<Tab>");

        mappings.builtin.add([modes.INSERT],
            ["<Space>", "<Return>"], "Expand Insert mode abbreviation",
            function () {
                editor.expandAbbreviation(modes.INSERT);
                return Events.PASS_THROUGH;
        });
    }
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
var lastKey = "";

var uid;
var dir;
var tmpfile;
var metaTmpfile;
var messageTmpfile;
var sleepProcess;
var vimProcess;


var unsent = 1;

var cyclesSinceLastSend = 0; //Cycles since we sent something to vim that might change the state (keypress/mouse click). This is to pick up stuff that has a delayed reaction without polling vim constantly when we aren't doing aything.


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
        queueForVim(command +"\\r");
        lastKey = "";
    }, {
      argCount: "+",
      literal: 0
    });


var CYCLE_TIME = 30
let timer =  window.setInterval(update, CYCLE_TIME);
