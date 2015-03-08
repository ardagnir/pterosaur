/* This is part of Pterosaur.
 *
 * Copyright (c) 2015 James Kolb <jck1089@gmail.com>
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

var exports = {};

function pterosaurWindow(thisWindow){
var pterosaur = this;

var pluginType = "placeholder";

Components.utils.import("chrome://pterosaur/content/subprocess.jsm");
Components.utils.import("chrome://pterosaur/content/minidactyl.jsm");
Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");

var focusManager = Components.classes["@mozilla.org/focus-manager;1"] .getService(Components.interfaces.nsIFocusManager);
var Environment = Components.classes["@mozilla.org/process/environment;1"].getService(Components.interfaces.nsIEnvironment);
var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.pterosaur.");
var defaultPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getDefaultBranch("extensions.pterosaur.");

pterosaur.minidactyl = new minidactyl(console, thisWindow, function(){return textBoxType !== ""}, focusManager, "");

var vimNsIProc = null;
var vimPath = "";
try{
  vimPath = pterosaur.minidactyl.pathSearch("vim").path;
}
catch (e){
}

defaultPrefs.setBoolPref("contentonly", true);
defaultPrefs.setBoolPref("enabled", true);
defaultPrefs.setBoolPref("autorestart", true);
defaultPrefs.setBoolPref("restartnow", false);
defaultPrefs.setBoolPref("allowPrivate", false);
defaultPrefs.setBoolPref("verbose", false);
defaultPrefs.setCharPref("vimbinary", vimPath);
defaultPrefs.setCharPref("debugtty", "");
defaultPrefs.setCharPref("rcfile", "~/.pterosaurrc");
defaultPrefs.setCharPref("exitkey", "<Esc>");
defaultPrefs.setCharPref("envoverrides", "");

var borrowed;
var modeLine;
var modeText;
//Is pterosaur being used?
var usingFullVim = false;
var strictVimCheck = false;
var leanVimCheck = false;

var debugMode =false;

var waitForVim = 0;

var vimGame = false; //If vim is changing on it's own without user input (like in a game), we need to poll more aggressively

var pterosaurModes;

var PASS_THROUGH = {};

function setupPluginConnections(){
  var head;
  var newPluginType;
  if (typeof thisWindow.dactyl != "undefined"){
    head = thisWindow.dactyl;
    newPluginType = "dactyl";
  } else if (typeof thisWindow.liberator != "undefined"){
    head = thisWindow.liberator;
    newPluginType = "vimperator";
  } else {
    head = null;
    newPluginType = "";
  }

  thisWindow.setTimeout(setupPluginConnections, 5000);
  if(pluginType == newPluginType){
    return;
  }

  var oldPluginType = pluginType;
  pluginType = newPluginType;


  if(!pluginType) {
    modeLine = thisWindow.document.createElement('div');
    modeText = thisWindow.document.createTextNode('');
    modeLine.appendChild(modeText);
    thisWindow.document.getElementById("main-window").appendChild(modeLine)
  } else if (!oldPluginType) {
    modeLine.parentNode.removeChild(modeLine);
  }

  if (pluginType == "dactyl") {
    borrowed = {
      modes: head.plugins.modes,
      commands: head.plugins.commands,
      options: head.plugins.options,
      focusedElement: function() {return head.focusedElement;},
      echo: function(msg){head.echo(msg, head.plugins.commandline.FORCE_SINGLELINE);},
      echoerr: head.echoerr,
      feedkey: head.plugins.events.feedkeys,
      focus: function(element){borrowed.focus(element)},
      editor: head.plugins.editor,
      mappings: {
        add: function(mode, keylist, desc, callback){
          keylist.forEach( function(key){ pterosaur.minidactyl.keyHandler.addKeyDown(key, callback);});
        }, remove: function(mode, key){
          return pterosaur.minidactyl.keyHandler.removeKeyDown(key);
        }
      },
    }

    if(usingFullVim){
      head.plugins.mappings.builtin.remove(borrowed.modes.INSERT, "<Space>");
    }

    borrowed.commands.add(["pterosaurrestart"],
        "Restarts vim process",
        function () {
          killVimbed();
          startVimbed();
        }, {
          argCount: "0",
        });
  }
  else if (pluginType == "vimperator") {
    borrowed = {
      modes: head.plugins.modes,
      commands: head.plugins.commands,
      options: head.plugins.options,
      focusedElement: function() {return head.focus;},
      echo: function(msg){head.echo(msg, head.plugins.commandline.FORCE_SINGLELINE);},
      echoerr: head.echoerr,
      //feedkey: head.plugins.events.feedkeys,
      feedkey: pterosaur.minidactyl.feedkey,
      focus: function(element){if (element) {element.focus()}},
      editor: null,
      mappings: {
        add: function(mode, keylist, desc, callback){
          keylist.forEach( function(key){ pterosaur.minidactyl.keyHandler.addKeyDown(key, callback);});
        }, remove: function(mode, key){
          return pterosaur.minidactyl.keyHandler.removeKeyDown(key);
        }
      },
    }
    borrowed.modes.push = borrowed.modes.set;
    borrowed.modes.pop = function(){
      if(borrowed.modes.main == borrowed.modes.VIM_COMMAND) {
        borrowed.modes.set(borrowed.modes.VIM_NORMAL);
      }
    };

    borrowed.commands.addUserCommand(["pterosaurrestart"],
        "Restarts vim process",
        function () {
          killVimbed();
          startVimbed();
        }, {
          argCount: "0",
        });

  } else {
    borrowed = {
      modes: {"INSERT": {char:'I', name: ""},
              addMode: function(name, object) { borrowed.modes[name] = object; borrowed.modes[name].name = name;},
              main: null,
              pop: function(){borrowed.modes.main = borrowed.modes.INSERT; borrowed.modes.updateModeline();},
              push: function(mode){borrowed.modes.main = mode; borrowed.modes.updateModeline()},
              reset: function(){focusManager.clearFocus(thisWindow);},
              updateModeline: function(){modeText.textContent = borrowed.modes.main.name.replace("VIM_","");}
      },
      commands: null,
      options: null,
      focusedElement: function(){return focusManager.getFocusedElementForWindow(thisWindow, true, {});},
      echo: function(out) {
        if(out === ""){
          borrowed.modes.updateModeline();
        }
        else {
          thisWindow.setTimeout(function(){modeText.textContent = out},1);
        }
      },
      echoerr: function(out) {thisWindow.alert(out)},
      feedkey: pterosaur.minidactyl.feedkey,
      focus: function(element){if (element) {element.focus()}},
      editor: null,
      mappings: {
        add: function(mode, keylist, desc, callback){
          keylist.forEach( function(key){ pterosaur.minidactyl.keyHandler.addKeyDown(key, callback);});
        }, remove: function(mode, key){
          return pterosaur.minidactyl.keyHandler.removeKeyDown(key);
        }
      },
    }
    borrowed.modes.main = borrowed.modes.INSERT;
    borrowed.modes.updateModeline();
  }

  borrowed.modes.addMode("VIM_INSERT", {
    char: "I",
    desription: "Vim normal mode",
    bases: [borrowed.modes.INSERT]
  });

  borrowed.modes.addMode("VIM_NORMAL", {
    char: "N",
    desription: "Vim normal mode",
    bases: [borrowed.modes.VIM_INSERT]
  });

  borrowed.modes.addMode("VIM_COMMAND", {
    char: "e",
    desription: "Vim normal mode",
    bases: [borrowed.modes.VIM_NORMAL]
  });

  borrowed.modes.addMode("VIM_SELECT", {
    char: "s",
    desription: "Vim selection mode",
    bases: [borrowed.modes.VIM_NORMAL]
  });

  borrowed.modes.addMode("VIM_VISUAL", {
    char: "V",
    desription: "Vim visual mode",
    bases: [borrowed.modes.VIM_NORMAL]
  });

  borrowed.modes.addMode("VIM_REPLACE", {
    char: "R",
    desription: "Vim replace mode",
    bases: [borrowed.modes.VIM_NORMAL]
  });

  pterosaurModes = [borrowed.modes.INSERT, borrowed.modes.AUTOCOMPLETE, borrowed.modes.VIM_INSERT, borrowed.modes.VIM_NORMAL, borrowed.modes.VIM_COMMAND, borrowed.modes.VIM_SELECT, borrowed.modes.VIM_VISUAL, borrowed.modes.VIM_REPLACE];

  pterosaur.borrowed = borrowed;
}
this.getTextBox = function(){return textBox;}
this.getTextBoxType = function(){return textBoxType;}
this.getGameTest = function(){return gameTest;}
this.strictVim = strictVim;
this.leanVim = leanVim;
this.useFullVim = useFullVim;

setupPluginConnections();

thisWindow.setTimeout(startVimbed, 1);

function useFullVim(){
  var focusedElement = borrowed.focusedElement();
  if(prefs.getBoolPref("contentonly") && focusedElement && focusedElement.ownerDocument.URL.substring(0,7) === "chrome:")
    return false;
  if (focusedElement && focusedElement.type === "password")
    return false;
  if (PrivateBrowsingUtils.isWindowPrivate(thisWindow) && !prefs.getBoolPref("allowPrivate"))
    return false;
  return vimStdin && vimFile && prefs.getBoolPref("enabled");
}

//In strict/lean vim we avoid handling keys by browser and handle them more strictly within vim.

function leanVim(){
  return textBoxType === "ace" ||  [borrowed.modes.VIM_INSERT, borrowed.modes.VIM_SELECT].indexOf(borrowed.modes.main) == -1;
}
//Strict vim is like leanvim but also forces tabs and carriage returns to vim
function strictVim(){
  return textBoxType === "ace" ||  borrowed.modes.main === borrowed.modes.VIM_COMMAND;
}

var webKeyTimeout = null;

function updateVim(){
  if(sendToVim !== "" && allowedToSend) {
    if (webKeyTimeout){
      thisWindow.clearTimeout(webKeyTimeout);
      webKeyTimeout = null;
    }
    if(vimNsIProc.isRunning){
      thisWindow.setTimeout(updateVim, 10);
      return;
    }
    if (!stateCheck() || vimNsIProc.isRunning) //Yes, we just checked isrunning, but it has a good chance of changing due to statecheck
    {
      if(!useFullVim() || textBoxType === "")
      {
        sendToVim = "";
      } else {
        thisWindow.setTimeout(updateVim, 10);
      }
      return;
    }

    var tempSendToVim = sendToVim;
    sendToVim = "";
    vimStdin.write(unescape(encodeURIComponent(tempSendToVim))); //Converts to UTF8
    unsent=0;
    webKeyTimeout = thisWindow.setTimeout(webKeyTimeoutFunc, 250);
  }
}

function webKeyTimeoutFunc() {
  if (!leanVim() && [ESC, GS, '\r', '\t', ''].indexOf(lastKey) == -1){
    if(stateCheck() && !vimNsIProc.isRunning) {
      handleKeySending(lastKey);
    } else if (useFullVim() && textBoxType !== "") {
      webKeyTimeout = thisWindow.setTimeout(webKeyTimeoutFunc, 50);
    }
  }
}

var stateCheckTimeout = null;
var pollsSkipped = 0;

function stateCheckTimeoutFunc(){
  if (vimNsIProc && vimNsIProc.isRunning)
  {
    stateCheckTimeout = thisWindow.setTimeout(stateCheckTimeoutFunc, 50);
    return;
  }
  stateCheckTimeout = null
  if(stateCheck()) {
    if (pollsSkipped < 3 && borrowed.modes.main !== borrowed.modes.VIM_COMMAND){
      pollsSkipped++;
    } else {
      callPoll();
      pollsSkipped = 0;
    }
  }
}

var restarting = false;
function stateCheck(){
    if (stateCheckTimeout) {
      thisWindow.clearTimeout(stateCheckTimeout);
      pollsSkipped = 0;
    }

    stateCheckTimeout = thisWindow.setTimeout(stateCheckTimeoutFunc, borrowed.modes.main === borrowed.modes.VIM_COMMAND ? 250 : 500);

    if (usingFullVim !== useFullVim())
      cleanupPterosaur();

    if (strictVimCheck !== (strictVim() && usingFullVim))
      handleStrictVim();

    if (leanVimCheck !== (leanVim() && usingFullVim))
      handleLeanVim();

    if(prefs.getBoolPref("restartnow") && !restarting)
    {
      killVimbed();
      restarting = true;
      //The delay here is mostly so you can see the about:config value change.
      thisWindow.setTimeout(function(){
        restarting = false;
        prefs.setBoolPref("restartnow", false);
        startVimbed();
      },500);
      return false;
    }

    //We're not using pterosaur. Exit out.
    if (!usingFullVim || pterosaurModes.indexOf(borrowed.modes.main) === -1)  {
        if(textBoxType) {
          cleanupForTextbox();
          textBoxType = ""
        }
        return false;
    }

    //We switched focus
    if (borrowed.focusedElement() !== pterFocused || !textBoxType)
    {
      if(textBoxType)
        cleanupForTextbox();
      setupForTextbox();
      return false;
    }

    var cursorPos = textBoxGetSelection()

    //The cursor was moved outside of vim.
    if (savedCursorStart!=null &&
         (cursorPos.start.row != savedCursorStart.row || cursorPos.start.column != savedCursorStart.column) ||
        savedCursorEnd!=null &&
         (cursorPos.end.row != savedCursorEnd.row || cursorPos.end.column != savedCursorEnd.column))
    {
      updateTextbox(0);
      return false;
    }

    //The text was changd outside of vim
    if (savedText != null && textBoxGetValue() != savedText)
    {
      updateTextbox(1);
      return false;
    }

    return true;
}

var lastVal = null;
var lastMeta = null;
function updateFromVim(){
    var val = tmpfile.read();
    var metadata = metaTmpfile.read();
    var messages = messageTmpfile.read();

    //Exit immediately if nothing happens. (This is just for performance. It's not needed for correct behavior.)
    if(metadata === lastMeta && val === lastVal && (!messages || messages === "\n")) {
      callPoll();
      return;
    }

    if(vimNsIProc.isRunning){
      thisWindow.setTimeout(updateFromVim, 10);
      return;
    }

    if (!stateCheck() || vimNsIProc.isRunning)
    {
      if(useFullVim() && textBoxType) {
        thisWindow.setTimeout(updateFromVim, 10);
      }
      return;
    }

    lastVal = val;
    lastMeta = metadata;

    //Vim textfiles are new-line terminated, but browser text vals aren't neccesarily
    if (val !== '')
      val = val.slice(0,-1)
    else
    {
      //If we don't have any text at all, we caught the file right as it was emptied and we don't know anything.
      thisWindow.setTimeout(updateFromVim, 20);
      return;
    }


    metadata = metadata.split('\n');
    vimMode = metadata[0];

    if (vimMode === "c") {
      if (borrowed.modes.main !== borrowed.modes.VIM_COMMAND)
      {
        borrowed.modes.push(borrowed.modes.VIM_COMMAND);
      }
      if (metadata[1] !=="" && metadata[1] !== lastVimCommand)
      {
        lastVimCommand = metadata[1];
        var modestring = "";
        if (metadata[1][0] == "@")
          borrowed.echo("INPUT: " + metadata[1].slice(1));
        else
        {
          //If we aren't showing the mode, we need to add it here to distinguish vim commands from pentadactyl commands
          if(pluginType == "dactyl" && borrowed.options && borrowed.options["guioptions"].indexOf("s") == -1)
            modestring = "VIM COMMAND "
          else if(!pluginType)
            modestring = "COMMAND "
          borrowed.echo(modestring + metadata[1]);
        }
      }
    }
    else{
        if (borrowed.modes.main === borrowed.modes.VIM_COMMAND)
        {
          borrowed.modes.pop();
        }
        if (lastVimCommand)
        {
          borrowed.echo("")
          lastVimCommand=""
        }
    }

    if (messages && messages!=="\n" && vimMode!="c")
    {
      //TODO: If another message is written right now, we could lose it.
      messageTmpfile.write("");

      if(!unsent)
      {
        //TODO: We don't neccesarily want singleline, but without it we lose focus.
        borrowed.echo(messages.split("\n").slice(-1)[0]);
      }

      //We've clearing the entered command. Don't need/want to clear it later and lose our message.
      lastVimCommand=""
    }

    if (val !== savedText){
      if(!unsent){
        textBoxSetValue(val)
      }
      savedText = val;
    }

    if (textBoxType) {
        if(metadata.length > 2 && vimMode !== "c" && vimMode!== "e" && !unsent)
        {
          textBoxSetSelection(metadata[1], metadata[2])
        }
        else if(metadata.length > 3 && vimMode == "c")
        {
          textBoxSetSelection(metadata[2], metadata[3])
        }


        var cursorPos = textBoxGetSelection()

        if (savedCursorStart.row != cursorPos.start.row || savedCursorStart.column != cursorPos.start.column
            || savedCursorEnd.row != cursorPos.end.row || savedCursorEnd.column != cursorPos.end.column) {
          savedCursorStart = cursorPos.start;
          savedCursorEnd = cursorPos.end;
        }
    }

    if (vimMode === "e")
    {
      borrowed.echo("ERROR: "+metadata[1])
    }
    else if (vimMode === "n" && borrowed.modes.main !== borrowed.modes.VIM_NORMAL)
    {
      //If unsent, this has to be outdated info. Don't bother
      if(!unsent) {
        borrowed.echo("");
        if (borrowed.modes.main !== borrowed.modes.INSERT)
        {
          borrowed.modes.pop();
        }
        borrowed.modes.push(borrowed.modes.VIM_NORMAL);
      }
    }
    else if ((vimMode === "v" || vimMode ==="V") && borrowed.modes.main !==borrowed.modes.VIM_VISUAL)
    {
      //If unsent, this has to be outdated info. Don't bother.
      if(!unsent) {
        borrowed.echo("");
        if (borrowed.modes.main !== borrowed.modes.INSERT)
        {
          borrowed.modes.pop();
        }
        borrowed.modes.push(borrowed.modes.VIM_VISUAL);
      }
    }
    else if ((vimMode === "s" || vimMode ==="S") && borrowed.modes.main !==borrowed.modes.VIM_SELECT)
    {
      borrowed.echo("");
      if (borrowed.modes.main !== borrowed.modes.INSERT)
      {
        borrowed.modes.pop();
      }
      borrowed.modes.push(borrowed.modes.VIM_SELECT);
    }
    //R is replace and Rv is virtual replace
    else if ((vimMode[0]==="R") && borrowed.modes.main !==borrowed.modes.VIM_REPLACE)
    {
      borrowed.echo("");
      if (borrowed.modes.main !== borrowed.modes.INSERT)
      {
        borrowed.modes.pop();
      }
      borrowed.modes.push(borrowed.modes.VIM_REPLACE);
    }
    else if (vimMode === "i" && borrowed.modes.main !== borrowed.modes.VIM_INSERT)
    {
      borrowed.echo("");
      if (borrowed.modes.main !== borrowed.modes.INSERT)
      {
        borrowed.modes.pop();
      }
      borrowed.modes.push(borrowed.modes.VIM_INSERT);
    }

    if (pollTimeout){
      thisWindow.clearTimeout(pollTimeout);
      pollTimeout = null;
    }
    if (vimMode !== "c" && gameTest <= 40) {
      pollTimeout = thisWindow.setTimeout(function(){ pollTimeout = null }, 100);
    }
}

//Determines if vim is being used for a game or similar scenario where vim handles user input in a nonstandard way.
//In these cases, we should spam poll for responsiveness since vim won't trigger the normal autocommands.
var gameTest = 0;

function pollTimeoutFunc(){
    if(!vimNsIProc.isRunning){
      pollTimeout = null;
      remoteExpr("Vimbed_Poll()");
    }else{
      pollTimeout = thisWindow.setTimeout(pollTimeoutFunc, 50);
    }
}

function callPoll(){
  if (!pollTimeout){
    var pollTimer = (vimMode == "c" || gameTest > 40 ? 1 : 250)
    //if vimMode == "c"(vimMode == "c" 1 : );
    pollTimeout = thisWindow.setTimeout(pollTimeoutFunc, pollTimer);
  }
}

function remoteExpr(expr){
  //The standard way to do this is:
  //  vimNsIProc.run(false,["--servername", "pterosaur_" + uid, '--remote-expr',  expr], 4);
  //but the below way is 5 times faster because remote-expr from the command line is so slow.
  //We could speed this up farther by just keeping a vim instance open just for sending remote_exprs, but this is good enough for now.
  try{
    vimNsIProc.run(false,["+call remote_expr('pterosaur_" + uid + "', '" + expr + "')", "+q!", "-u", "NONE", "-v", "-s", "/dev/null"], 7);
  }
  catch (e){
    console.trace();
  }
}

function createChromeSandbox(){
  return new Components.utils.Sandbox(thisWindow.document.nodePrincipal);
}

function createSandbox(){
  var doc = textBox.ownerDocument || thisWindow.content;
  var protocol = doc.location.protocol;
  var host = doc.location.host;
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
      var fromBeginning = pterosaur.minidactyl.nodeContents(textBox.rootElement);
      var oldRange = textBox.selection.getRangeAt(0);

      fromBeginning.setEnd(oldRange.startContainer, oldRange.startOffset);
      var preStart = htmlToText(pterosaur.minidactyl.stringify(fromBeginning, true));
      fromBeginning.setEnd(oldRange.endContainer, oldRange.endOffset);
      var preEnd = htmlToText(pterosaur.minidactyl.stringify(fromBeginning, true));

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
  sandbox.content = thisWindow.content;
  sandbox.editor = textBox.parentNode;
  sandbox.stringify = JSON.stringify;
  var sandboxScript="\
    var aceEditor = content.wrappedJSObject.ace.edit(editor);\
    range =  stringify(aceEditor.getSession().getSelection().getRange());\
  ";
  Components.utils.evalInSandbox(sandboxScript, sandbox);
  return parseSandboxRangeForVim(sandbox);
}

function textBoxGetSelection_codeMirror(){
  var sandboxScript="\
    editor = editor.wrappedJSObject || editor;\
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

  if (!textBox.wrappedJSObject && textBox.CodeMirror) {
    //This is codemirror at the chrome level alreay (probably from dev tools). We can trust it.
    var sandbox = createChromeSandbox();
    if (!sandbox)
      return;
    sandbox.editor = textBox;
    sandbox.stringify = JSON.stringify;
    Components.utils.evalInSandbox(sandboxScript, sandbox);
  } else {
    var sandbox = createSandbox();
    if (!sandbox)
      return;
    sandbox.editor = textBox;
    sandbox.stringify = JSON.stringify;
    Components.utils.evalInSandbox(sandboxScript, sandbox);
  }
  return parseSandboxRangeForVim(sandbox);
}

function parseSandboxRangeForVim(sandbox) {
  if (typeof sandbox.range === "string") {
    var range = JSON.parse(sandbox.range);
    range.start.row = parseInt(range.start.row) + 1;
    range.start.column = parseInt(range.start.column) + 1;
    range.end.row = parseInt(range.end.row) + 1;
    range.end.column = parseInt(range.end.column) + 1;
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

function convertRowColumnToIndex(text, row, column){
  var column = parseInt(column);
  var lines = text.split("\n");
  if(row >= lines.length)
    row = lines.length - 1;
  var rowlength = lines[row].length;
  value = lines.slice(0, row).join("").length + parseInt(row);
  if(column > rowlength)
    return value + rowlength
  else
    return value + column
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
      start = start.split(',');
      end = end.split(',');
      var value = textBox.value;
      textBox.setSelectionRange(convertRowColumnToIndex(value, start[2], start[1]), convertRowColumnToIndex(value, end[2], end[1]));
      break;
    case "contentEditable":
    case "designMode":
      start = start.split(",")
      end = end.split(",")

      var range = pterosaur.minidactyl.nodeContents(textBox.rootElement);
      var nodes = textBox.rootElement.childNodes;
      var nodeIndex = 0;
      var row = 0;
      var length = nodes.length;
      while(row<start[2] && nodeIndex < length-1)
      {
        if (nodes[nodeIndex]) {
          if (nodes[nodeIndex].tagName == "BR") {
            row += 1;
          }
        }
        nodeIndex += 1
      }
      if(nodes[nodeIndex].tagName == "BR"){
        //Cursor is between two <br> tags. Only way to represent this is with parent node.
        range.setStart(textBox.rootElement, nodeIndex)
      }
      else{
        range.setStart(nodes[nodeIndex], Math.min(nodes[nodeIndex].length, start[1]))
      }

      while(row<end[2] && nodeIndex < length-1)
      {
        if (nodes[nodeIndex]) {
          if (nodes[nodeIndex].tagName == "BR") {
            row += 1;
          }
        }
        nodeIndex += 1
      }
      if(nodes[nodeIndex].tagName == "BR"){
        //Cursor is between two <br> tags. Only way to represent this is with parent node.
        range.setEnd(textBox.rootElement, nodeIndex)
      }
      else{
        range.setEnd(nodes[nodeIndex], Math.min(nodes[nodeIndex].length, end[1]))
      }

      textBox.selection.removeAllRanges()
      textBox.selection.addRange(range)
      break;
  }
}

function textBoxSetSelection_ace(start, end){
  var sandbox = createSandbox();
  if (!sandbox)
    return;
  sandbox.start = start
  sandbox.end = end
  sandbox.content = thisWindow.content;
  sandbox.editor = textBox.parentNode;
  var sandboxScript="\
    var aceEditor = content.wrappedJSObject.ace.edit(editor);\
    start = start.split(',');\
    end = end.split(',');\
    aceEditor.getSession().getSelection().setSelectionRange(\
                                          {'start': {'row':start[2], 'column':start[1]},\
                                           'end':   {'row':end[2],   'column':end[1]}});\
  "
  Components.utils.evalInSandbox(sandboxScript, sandbox);
}

function textBoxSetSelection_codeMirror(start, end){
  var sandboxScript="\
    start = start.split(',');\
    end = end.split(',');\
    editor = editor.wrappedJSObject || editor;\
    editor.CodeMirror.setSelection({'line':parseInt(start[2]), 'ch':parseInt(start[1])}, {'line':parseInt(end[2]), 'ch':parseInt(end[1])});\
  "

  if (!textBox.wrappedJSObject && textBox.CodeMirror) {
    //This is codemirror at the chrome level alreay (probably from dev tools). We can trust it.
    var sandbox = createChromeSandbox();
    if (!sandbox)
      return;
    sandbox.start = start;
    sandbox.end = end;
    sandbox.editor = textBox;
    Components.utils.evalInSandbox(sandboxScript, sandbox);
  } else {
    var sandbox = createSandbox();
    if (!sandbox)
      return;
    sandbox.start = start;
    sandbox.end = end;
    sandbox.editor = textBox;

    Components.utils.evalInSandbox(sandboxScript, sandbox);
  }
}

function htmlToText(inText) {
  //Note that this function does not convert all html correctly. It just needs to convert html in contenteditables.
  //The results are treated as text so incorrect conversion is not a security issue.
  return inText.replace(/<br[^>]*>/g, '\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

function setText(node, text){
  var nbsp = '\u00a0'
  text = text.replace(/^ /mg, nbsp).replace(/  /g, ' '+nbsp).replace(/ $/mg, nbsp)

  var lines = text.split('\n')
  var last = lines.length - 1;
  var failure = false;

  if (node.childNodes.length == last*2) {
    for (var i = 0; i < last; i++) {
      var currentNode = node.childNodes[i*2];
      if (currentNode.nodeType === 3) {
        if (currentNode.textContent !== lines[i]) {
          currentNode.textContent = lines[i];
        }
      } else {
        failure = true;
        break;
      }
      if(node.childNodes[i*2+1].nodeName !== "BR") {
        failure = true;
        break;
      }
    }
  } else {
    failure = true;
  }

  if (failure) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }

    var lines = text.split('\n')
    lines.forEach(function(line, index) {
      if (index != last) {
        node.appendChild(thisWindow.content.document.createTextNode(line));
        node.appendChild(thisWindow.content.document.createElement('br'));
      }
    })
  }
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
      var newText = newVal + "\n";
      if (htmlToText(textBox.rootElement.innerHTML) != newText)
      {
        setText(textBox.rootElement, newText);
      }
      break;
  }
}

function textBoxSetValue_ace(newVal){
  var sandbox = createSandbox();
  if (!sandbox)
    return;
  sandbox.newVal = newVal;
  sandbox.content = thisWindow.content;
  sandbox.editor = textBox.parentNode;
  var sandboxScript="\
    var aceEditor = content.wrappedJSObject.ace.edit(editor);\
    if (aceEditor.getSession().getValue()!=newVal){\
      aceEditor.getSession().setValue(newVal);\
    }\
  "
  Components.utils.evalInSandbox(sandboxScript, sandbox);
}

function textBoxSetValue_codeMirror(newVal){
  var sandboxScript="\
    editor = editor.wrappedJSObject || editor;\
    if (editor.CodeMirror.getValue()!=newVal){\
      editor.CodeMirror.setValue(newVal);\
    }\
  "

  if (!textBox.wrappedJSObject && textBox.CodeMirror) {
    //This is codemirror at the chrome level alreay (probably from dev tools). We can trust it.
    var sandbox = createChromeSandbox();
    if (!sandbox)
      return;
    sandbox.newVal = newVal
    sandbox.editor = textBox;
    Components.utils.evalInSandbox(sandboxScript, sandbox);
  } else {
    var sandbox = createSandbox();
    if (!sandbox)
      return;
    sandbox.newVal = newVal
    sandbox.editor = textBox;
    Components.utils.evalInSandbox(sandboxScript, sandbox);
  }
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
  sandbox.content = thisWindow.content;
  sandbox.editor = textBox.parentNode;
  var sandboxScript="\
    var aceEditor = content.wrappedJSObject.ace.edit(editor);\
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
  var sandboxScript="\
    editor = editor.wrappedJSObject || editor;\
    value = editor.CodeMirror.getValue();\
  "

  if (!textBox.wrappedJSObject && textBox.CodeMirror) {
    //This is codemirror at the chrome level alreay (probably from dev tools). We can trust it.
    var sandbox = createChromeSandbox();
    if (!sandbox)
      return;
    sandbox.editor = textBox;
    Components.utils.evalInSandbox(sandboxScript, sandbox);
  } else {
    var sandbox = createSandbox();
    if (!sandbox)
      return;
    sandbox.editor = textBox;
    Components.utils.evalInSandbox(sandboxScript, sandbox);
  }
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
    if(pterFocused){
      try{
        pterFocused.ownerDocument.removeEventListener("click", pterClicked, false);
      }
      catch(e){
        if (prefs.getBoolPref("verbose")) {
          //This is probably a dead object error. We don't need to remove the event in that case.
          console.log("Caught error (dead object errors are ok): " + e);
        }
      }
      pterFocused = null;
    }
    if(!pluginType) {
      modeLine.style.display="none";
    }
    if (prefs.getBoolPref("verbose")) {
      console.log("cleanup");
    }
    unsent=1;
}

function setupForTextbox() {
    //Clear lingering command text
    if (vimMode === "c")
      vimStdin.write(ESC+"i");

    pterFocused = borrowed.focusedElement();

    if(pterFocused){
      pterFocused.ownerDocument.addEventListener("click", pterClicked, false);
    }

    updateTextbox(0);
}

function pterClicked(){
  thisWindow.setTimeout(stateCheck, 1);
}

function updateTextbox(preserveMode) {
    if (vimNsIProc.isRunning){
      thisWindow.setTimeout(function(){updateTextbox(preserveMode);}, 25);
      return;
    }

    if(lastKey === ESC) {
      lastKey = "";
    }

    unsent=1
    vimGame = false;

    //Saved values are processed. "last" values are unprocessed values of vimbed files
    savedText = null;
    savedCursorStart = null;
    savedCursorEnd = null;
    lastVal = null;
    lastMeta = null;

    textBox = borrowed.focusedElement();

    if (textBox == null)
    {
      if (borrowed.editor && borrowed.editor.getEditor){
        textBox = borrowed.editor.getEditor(thisWindow.document.commandDispatcher.focusedWindow);
      }
      if(textBox) {
        textBoxType = "designMode";
      } else {
        textBoxType = "";
      }
    } else {
      if(borrowed.focusedElement().isContentEditable) {
        if(borrowed.focusedElement().offsetHeight == 0){
          textBoxType = ""; //This is probably google doc type stuff that we can't handle.
        } else {
          var doc = textBox.ownerDocument || thisWindow.content;

          textBoxType = "contentEditable";
          textBox = {};
          textBox.rootElement = borrowed.focusedElement();
          //Prserve any tags that wrap the WHOLE contenteditable
          while (textBox.rootElement.childNodes.length == 1 && textBox.rootElement.childNodes[0].tagName && textBox.rootElement.childNodes[0].tagName != "BR") {
            textBox.rootElement = textBox.rootElement.childNodes[0]
          }

          textBox.selection = doc.getSelection();
        }
      } else if(/ace_text-input/.test(textBox.className)) {
        textBoxType = "ace";
      }
      else if (textBox.parentNode && textBox.parentNode.parentNode && /CodeMirror/.test(textBox.parentNode.parentNode.className)) {
        textBoxType = "codeMirror"
        textBox = textBox.parentNode.parentNode;
      }
      else if (["INPUT", "TEXTAREA", "HTML:INPUT", "HTML:TEXTAREA"].indexOf(textBox.nodeName.toUpperCase()) >= 0) {
        try{
          //This will throw if I'm an input type that isn't textish
          textBox.selectionStart;

          textBoxType = "normal";
        }
        catch(e){
          textBoxType = "";
        }
      }
      else {
        if(borrowed.editor){
          textBox = borrowed.editor.getEditor(thisWindow.document.commandDispatcher.focusedWindow); //Tabbing into designmode sets focusedEelement to html instead of null
        } else {
          textBox = null;
        }
        if(textBox) {
          borrowed.focus(null);
          textBoxType = "designMode";
        } else {
          textBoxType = "";
        }
      }
    }

    if (textBoxType) {
      if(!pluginType){
        modeLine.style.display="block";
      }

      var text = textBoxGetValue()
      var cursorPos = textBoxGetSelection()
      savedCursorStart = cursorPos.start;
      savedCursorEnd = cursorPos.end;

      if(borrowed.modes.main == borrowed.modes.INSERT) {
        borrowed.modes.push(borrowed.modes.VIM_INSERT);
      }

      textBoxSetSelectionFromSaved(cursorPos);

      if (!tmpfile.write(text+"\n"))
        throw Error("io.cantEncode");

      var vimCommand;

      vimCommand = "Vimbed_UpdateText(<rowStart>, <columnStart>, <rowEnd>, <columnEnd>, <preserveMode>)";

      vimCommand = vimCommand.replace(/<rowStart>/, cursorPos.start.row);
      vimCommand = vimCommand.replace(/<columnStart>/, cursorPos.start.column);
      vimCommand = vimCommand.replace(/<rowEnd>/, cursorPos.end.row);
      vimCommand = vimCommand.replace(/<columnEnd>/, cursorPos.end.column);
      vimCommand = vimCommand.replace(/<preserveMode>/, preserveMode);

      if (prefs.getBoolPref("verbose")) {
        console.log(vimCommand);
      }

      remoteExpr(vimCommand);
    } else if(pluginType === "vimperator") {
      if (borrowed.modes.main !== borrowed.modes.INSERT) {
        borrowed.modes.main = borrowed.modes.NORMAL;
      }
    }
}

//Some sites need to receive key events in addition to sending them to vim. We don't do this for javascript editors because they handle js stuff themselves.
function handleKeySending(key) {
  if (textBoxType == "normal") {
    skipKeyPress = true;
    try{
      var value = textBoxGetValue()
      var cursorPos = textBoxGetSelection()
      var oldFocus = borrowed.focusedElement();
      var valarray = value.split("\n")
      var newCursor = false;
      if (key === "\b") {
        valarray[cursorPos.end.row - 1] = valarray[cursorPos.end.row -1].slice(0, cursorPos.end.column - 1) + ' ' + valarray[cursorPos.end.row - 1].slice(cursorPos.end.column - 1);
        //newCursor = cursorPos;
        newCursor = {};
        newCursor.start = {};
        newCursor.start.row = cursorPos.end.row;
        newCursor.start.column = cursorPos.end.column + 1;
        newCursor.end = newCursor.start;
        key = "<BS>";
      } else if (cursorPos.end.column > 1) {
        valarray[cursorPos.end.row - 1] = valarray[cursorPos.end.row - 1].slice(0, cursorPos.end.column - 2) + valarray[cursorPos.end.row - 1].slice(cursorPos.end.column - 1)
        newCursor = {};
        newCursor.start = {};
        newCursor.start.row = cursorPos.end.row;
        newCursor.start.column = cursorPos.end.column - 1;
        newCursor.end = newCursor.start;
      }


      if (newCursor) {
        textBoxSetValue(valarray.join("\n"))
        textBoxSetSelectionFromSaved(newCursor);

        borrowed.feedkey(key);

        if (oldFocus == borrowed.focusedElement()) {
          textBoxSetValue(value);
          textBoxSetSelectionFromSaved(cursorPos);
        }
      }
    }
    finally{
      skipKeyPress = false;
    }
  } else if (["contentEditable", "designMode"].indexOf(textBoxType) != -1){
    skipKeyPress = true;
    try{
      var value = htmlToText(textBox.rootElement.innerHTML);
      var cursorPos = textBoxGetSelection()
      var oldFocus = borrowed.focusedElement();

      borrowed.feedkey(key);
      if (oldFocus == borrowed.focusedElement()) {
        setText(textBox.rootElement, value);
        textBoxSetSelectionFromSaved(cursorPos);
      }
    } finally{
      skipKeyPress = false;
    }
  }
}

var skipKeyPress = false;

function onKeyPress(eventList) {
    const KILL = false, PASS = true;
    if (skipKeyPress) {
      return PASS;
    }

    if (!useFullVim()) {
      return PASS;
    }

    if (textBoxType === "") {
      stateCheck();
      if(textBoxType === "") {
        return PASS;
      }
    }

    var inputChar = pterosaur.minidactyl.stringifyEvent(eventList[0]);

    if((borrowed.modes.main == borrowed.modes.VIM_NORMAL || lastKey === ESC) && inputChar === prefs.getCharPref("exitkey")){
      borrowed.modes.reset();
      return KILL;
    }

    if (inputChar[0] === "<"){
      switch(inputChar) {
        case "<Space>":
        case "<S-Space>":
          queueForVim(' ');
          break;
        case "<Tab>":
          return specialKeyHandler("<Tab>") === PASS_THROUGH; //At this point, websites already might have done their thing with tab. But if we grab it any earlier, we always move to the next field.
        //These are already handled by lean VIM. If we're not leaning vim, let's let the browser handle them.
        case "<Up>":
          return PASS;
        case "<Down>":
          return PASS;
        case "<Right>":
          return PASS;
        case "<Left>":
          return PASS;
        case "<lt>":
          queueForVim('<');
          break;
        case "<Return>": //We already handled vim's return if we got here.
          return PASS;
        default:
          if (inputChar.slice(0,3)==="<C-" && inputChar.length == 5) {
            queueForVim(String.fromCharCode(inputChar[3].charCodeAt(0)-96));
          } else {
            thisWindow.setTimeout(stateCheck,1);
            return PASS;
          }
      }
    } else {
      queueForVim(inputChar);
    }
    return KILL;
}

pterosaur.minidactyl.keyHandler.onKeyPress = function(e){
  var eventList = [e];
  return onKeyPress(eventList);
}

function queueForVim(key) {
  lastKey = key;
  sendToVim += key;
  if (key === ESC){
    sendToVim += '\x00'; //If we actually pressed an escape key, send a null byte afterwards so vim doesn't wait for the rest of the sequence.
  }
  if (gameTest > 0){
    gameTest -= 6;
  }
  updateVim();
}

var handlingSpecialKey = false;


function getKeyBehavior(textBoxType, key) {
  if (strictVim()) {
    return "vim";
  }
  if(key === "<Return>"){
    if(textBoxType === "codeMirror" && pluginType) //Carriage returns are broken in pentadactyl for codemirror, so we have to handle them in vim
      return "vim";
    else
      return "linecheck";
  }
  if(key === "<Tab>"){
    return "web";
  }
}

//We want to manually handle carriage returns and tabs because otherwise forms can be submitted or fields can be tabbed out of before the textfield can finish updating.
function specialKeyHandler(key) {
    if (handlingSpecialKey || textBoxType == "") {
      return PASS_THROUGH;
    }
    var behavior = getKeyBehavior(textBoxType, key)
    if (behavior !== "vim") {
        //Make sure any autocomplete is calculated before we send the enter key
        if(webKeyTimeout){
          webKeyTimeout = null;
          if (!leanVim() && stateCheck() && [ESC, '\r', '\t', ''].indexOf(lastKey) == -1){
            handleKeySending(lastKey);
          }
        }

        if(borrowed.modes.main === borrowed.modes.VIM_INSERT) {
          queueForVim(GS);
        }

        allowedToSend = false;
        if (behavior !== "web") {
          if (key === "<Return>") {
            queueForVim("\r");
          } else if (key === "<Tab>"){
            queueForVim("\t");
          }
        }

        thisWindow.setTimeout( function() {
          handlingSpecialKey=true;
          try {
            var value = textBoxGetValue() //Preserve the old value so the Return doesn't change it.
            var cursorPos = textBoxGetSelection()
            var oldFocus = borrowed.focusedElement();
            borrowed.feedkey(key);
            if(behavior !== "web"){
              if (oldFocus == borrowed.focusedElement() && (behavior != "linecheck" || newLineCheck(value) && (behavior != "spaceCheck" || spaceCheck(value)))) {
                textBoxSetValue(value);
                textBoxSetSelectionFromSaved(cursorPos);
              }
              else {
                sendToVim=""
              }
            }
          } catch(e) {
            console.trace();
          } finally {
            handlingSpecialKey=false;
            allowedToSend = true;
            updateVim();
          }
        }, 100) //Delay is to make sure forms are updated from vim before being submitted.
    }
    else {
        if (key === "<Return>") {
          queueForVim("\r");
        } else if (key === "<Tab>"){
          queueForVim("\t");
        }
    }
    return !PASS_THROUGH;
}

//Returns true if the non-newline text is the same but the text is longer. Useful in figuring out if carriage return added a line(which we should ignore) or did something special
function newLineCheck(value){
  var newVal = textBoxGetValue();
  return newVal.replace(/[^\n]/g,"") > value.replace(/[^\n]/g,"");
}

function spaceCheck(value){
  return textBoxGetValue().replace(/\s/g,"") === value.replace(/\s/g,"")
}

//Even passing through these functions changes web behavior. We need to completely add or remove them depending on vim strictness.
function handleLeanVim() {
    leanVimCheck = leanVim() && useFullVim();
    if (leanVimCheck) {
      borrowed.mappings.add(
          [borrowed.modes.VIM_INSERT],
          ["<Up>"],
          ["Override websites' up behavior"],
          function(){queueForVim(ESC + '[A');});
      borrowed.mappings.add(
          [borrowed.modes.VIM_INSERT],
          ["<Down>"],
          ["Override websites' down behavior"],
          function(){queueForVim(ESC + '[B');});
      borrowed.mappings.add(
          [borrowed.modes.VIM_INSERT],
          ["<Right>"],
          ["Override websites' right behavior"],
          function(){queueForVim(ESC + '[C');});
      borrowed.mappings.add(
          [borrowed.modes.VIM_INSERT],
          ["<Left>"],
          ["Override websites' left behavior"],
          function(){queueForVim(ESC + '[D');});
    } else {
      borrowed.mappings.remove(borrowed.modes.VIM_INSERT, "<Up>");
      borrowed.mappings.remove(borrowed.modes.VIM_INSERT, "<Down>");
      borrowed.mappings.remove(borrowed.modes.VIM_INSERT, "<Right>");
      borrowed.mappings.remove(borrowed.modes.VIM_INSERT, "<Left>");
    }
}

function handleStrictVim() {
    strictVimCheck = strictVim() && useFullVim();
    if (strictVimCheck) {
      borrowed.mappings.add(
          [borrowed.modes.VIM_INSERT],
          ["<Tab>"],
          ["Override websites' tab behavior"],
          function(){specialKeyHandler("<Tab>");});

    } else {
      borrowed.mappings.remove(borrowed.modes.VIM_INSERT, "<Tab>");
    }
}

function cleanupPterosaur() {
    usingFullVim = useFullVim();
    if (usingFullVim) {
        if(pluginType == "dactyl"){
          thisWindow.dactyl.plugins.mappings.builtin.remove(borrowed.modes.INSERT, "<Space>");
        }
        borrowed.mappings.add(
            [borrowed.modes.VIM_INSERT],
            ["<Esc>", "<C-[>"],
            ["Handle escape key"],
            function(){
              if (prefs.getCharPref("exitkey") === "<Esc>" && (vimMode === "n" || lastKey === ESC))
              {
                borrowed.modes.reset();
              }
              else {
                queueForVim(ESC);
                return false;
              }
            });

        borrowed.mappings.add(
            [borrowed.modes.VIM_INSERT],
            ["<BS>"],
            ["Handle backspace key"],
            function(){
              if(skipKeyPress){
                return PASS_THROUGH;
              }
              queueForVim("\b");
            });

        borrowed.mappings.add(
            [borrowed.modes.VIM_INSERT],
            ["<C-r>"],
            "Override refresh and send <C-r> to vim.",
            function(){
              queueForVim("\x12");
            },
            {noTransaction: true});

        borrowed.mappings.add(
            [borrowed.modes.VIM_INSERT],
            ["<S-Return>"],
            ["Override websites' carriage return behavior"],
            function(){
              queueForVim("\r");
            },
            {noTransaction: true});

        borrowed.mappings.add(
            [borrowed.modes.VIM_INSERT],
            ["<Return>"],
            ["Override websites' carriage return behavior"],
            function(){return specialKeyHandler("<Return>");});
    }
    else {
        borrowed.mappings.remove( borrowed.modes.VIM_INSERT, "<Esc>");
        borrowed.mappings.remove( borrowed.modes.VIM_INSERT, "<C-[>");
        borrowed.mappings.remove( borrowed.modes.VIM_INSERT, "<BS>");
        borrowed.mappings.remove( borrowed.modes.VIM_INSERT, "<C-r>");
        borrowed.mappings.remove( borrowed.modes.VIM_INSERT, "<Return>");
        borrowed.mappings.remove( borrowed.modes.VIM_INSERT, "<S-Return>");

        if(pluginType == "dactyl") {
          thisWindow.dactyl.plugins.mappings.builtin.add([borrowed.modes.INSERT],
              ["<Space>"], "Expand Insert mode abbreviation",
              function () {
                  thisWindow.dactyl.plugins.editor.expandAbbreviation(borrowed.modes.INSERT);
                  return PASS_THROUGH;
          });
        }
    }
}

function startVimbed() {
  vimFile = null;
  try{
    vimFile = thisWindow.FileUtils.File(prefs.getCharPref("vimbinary"));
  }
  catch (e) {
    vimFile = pterosaur.minidactyl.pathSearch(prefs.getCharPref("vimbinary") || "vim");
    if (vimFile) {
      prefs.setCharPref("vimbinary", vimFile.path);
    }
  }

  if (vimFile && vimFile.exists()){
    vimNsIProc = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
    vimNsIProc.init(vimFile)
  } else {
    vimNsIProc = null;
    borrowed.echoerr("No vim instance found. Please set one using the 'extensions.pterosaur.vimbinary' preference in about:config.");
    stateCheck();
    return false;
  }

  uid = Math.floor(Math.random()*0x100000000).toString(16)
  dir = thisWindow.FileUtils.File("/tmp/vimbed/pterosaur_"+uid);
  tmpfile = thisWindow.FileUtils.File("/tmp/vimbed/pterosaur_"+uid+"/contents.txt");
  metaTmpfile = thisWindow.FileUtils.File("/tmp/vimbed/pterosaur_"+uid+"/meta.txt");
  messageTmpfile = thisWindow.FileUtils.File("/tmp/vimbed/pterosaur_"+uid+"/messages.txt");
  vimbedFile = thisWindow.FileUtils.File("/tmp/vimbed/pterosaur_"+uid+"/vimbed.vim");


  dir.create(thisWindow.Ci.nsIFile.DIRECTORY_TYPE, 0o700);
  tmpfile.create(thisWindow.Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);
  metaTmpfile.create(thisWindow.Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);
  messageTmpfile.create(thisWindow.Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);
  vimbedFile.create(thisWindow.Ci.nsIFile.NORMAL_FILE_TYPE, 0o600);

  tmpfile = new pterosaur.minidactyl.wrappedFile(tmpfile);
  metaTmpfile = new pterosaur.minidactyl.wrappedFile(metaTmpfile);
  messageTmpfile = new pterosaur.minidactyl.wrappedFile(messageTmpfile);
  vimbedFile = new pterosaur.minidactyl.wrappedFile(vimbedFile);

  copyVimbedFile(vimbedFile);

  if (!tmpfile)
      throw Error("io.cantCreateTempFile");

  if (!metaTmpfile)
      throw Error("io.cantCreateTempFile");

  if (!messageTmpfile)
      throw Error("io.cantCreateTempFile");

  var env_overrides = prefs.getCharPref("envoverrides").split(" ");
  var override_dict = {};

  for (var index in env_overrides)
  {
    var override = env_overrides[index];
    var colonIndex = override.indexOf("=");
    if (colonIndex !== -1) {
      override_dict[override.substring(0, colonIndex)] = override;
    }
  }

  var TERM = Environment.get("TERM");

  if (!TERM || TERM === "linux")
    TERM = "xterm";

  var env_variables = ["DISPLAY", "USER", "XDG_VTNR", "XDG_SESSION_ID", "SHELL", "PATH", "LANG", "SHLVL", "XDG_SEAT", "HOME", "LOGNAME", "WINDOWPATH", "XDG_RUNTIME_DIR", "XAUTHORITY"];
  for (var index = 0, len = env_variables.length; index < len; index++) {
    if(override_dict[env_variables[index]]){
      var tmp = override_dict[env_variables[index]];
      delete override_dict[env_variables[index]];
      env_variables[index] = tmp;
    }
    else
      env_variables[index] = env_variables[index] + "=" + Environment.get(env_variables[index]);
  }
  if(override_dict["TERM"]) {
    env_variables.push(override_dict["TERM"])
    delete override_dict["TERM"]
  }
  else
    env_variables.push("TERM=" + TERM);

  for (key in override_dict)
    env_variables.push(override_dict[key])

  var pterosaurRcExists = false;

  try{
    var rcFile = thisWindow.FileUtils.File(prefs.getCharPref("rcfile"));
    if (rcFile.exists()) {
      pterosaurRcExists = true;
    }
  } catch(e){ }

  var startVimProcess = function(){
    var thisUid = uid;
    vimProcess = subprocess.call({ url: thisWindow.URL,
      command: vimFile.path,
      arguments: function(){
        var toCall = ["--servername", "pterosaur_" + uid,
                      "-s", "/dev/null",
                      "-S", vimbedFile.path];



        if(pterosaurRcExists){
          toCall.push("-S");
          toCall.push(prefs.getCharPref("rcfile"));
        }
        toCall.push("-vf");
        toCall.push('+call Vimbed_SetupVimbed("","")');
        return toCall;
      }(),
      environment:  env_variables,
      charet: 'UTF-8',
      stdin: function(stdin){
        vimStdin = stdin;
        stdin.write(ESC)
      },
      //TODO: Rather than waiting to update, maybe update right away and leave a standing allowance of 25 ms to update without changes if we receive one?
      //This only makes sense if we make upate without changes faster by checking directly against saved.
      stdout: function(data){
        var debugtty = prefs.getCharPref("debugtty");
        if(debugtty){
          if (debugtty != oldDebug){
            try{
              debugTerminal = new pterosaur.minidactyl.wrappedFile(thisWindow.FileUtils.File(debugtty));
            }
            catch(e){
              debugTerminal = null;
            }
            oldDebug = debugtty;
          }
          if (debugTerminal) {
            try{
              debugTerminal.write(data);
            }
            catch(e){
              console.log("Failed to write to tty.");
            }

          }
        }

        if (thisUid == uid){
          if(gameTest < 60){
            gameTest++;
          }

          updateFromVim();
        }
      },
      stderr: function(data){
        if (prefs.getBoolPref("verbose")) {
          console.log("Stderr: " + data);
        }
        if (data.indexOf("--servername") != -1) {
          thisWindow.setTimeout(function(){
            borrowed.echoerr("Pterosaur requires vim with +clientserver enabled. \nThe vim binary '" + vimFile.path + "' does not have +clientserver enabled.");
          }, 500);
          killVimbed();
          stateCheck();
        }
      },
      done: function(result){
        if (prefs.getBoolPref("verbose")) {
          console.log("Vim shutdown");
        }
        //If vim closes early, restart it.
        if(thisUid == uid && prefs.getBoolPref("autorestart")) {
          vimRestartTimeout = thisWindow.setTimeout(function(){
            if (prefs.getBoolPref("verbose")) {
              console.log("Restarting vim");
            }
            startVimProcess();
          }, 200);
        }
      }
    });
  };
  startVimProcess();
}

function copyVimbedFile(destination){
  var request = new thisWindow.XMLHttpRequest();
  request.open("GET", "chrome://pterosaur/content/vimbed/plugin/vimbed.vim", true);  // async=true
  request.responseType = "text";
  request.onerror = function(event) {
    console.log("Failed to load vimbed from pterosaur.");
  };
  request.onload = function(event) {
    if (request.response) {
      destination.write(request.response);
    }
    else
      request.onerror(event);
  };
  request.send();
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
var allowedToSend = true;
var pollTimeout;
var vimRestartTimeout;

var uid;
var dir;
var tmpfile;
var metaTmpfile;
var messageTmpfile;
var vimbedFile;

var debugTerminal = null;
var oldDebug = "";

var vimProcess;

var vimFile = null;

var vimStdin = null;
var ESC = '\x1b';
var GS  = '\x1d';

var unsent = 1;

function killVimbed() {
  uid = 0;
  thisWindow.clearTimeout(vimRestartTimeout);
  if (vimStdin) {
    vimStdin.close();
    vimStdin = null;
  }
  if (dir) {
    dir.remove(true);
    dir = null;
  }
}

this.onUnload = function(){
  if(!pluginType){
    try{
      thisWindow.document.getElementById("main-window").removeChild(modeLine)
    } catch(e){}
  } else if (pluginType == "dactyl"){
    borrowed.commands.user.remove("pterosaurrestart");
  } else if (pluginType == "vimperator"){
    borrowed.commands.removeUserCommand("pterosaurrestart");
  }
  pterosaur.minidactyl.shutdown();
  killVimbed();
}
}

exports.setup = function(thisWindow, startupAttempts){
  var head;
  if (typeof thisWindow.dactyl != "undefined"){
    if (thisWindow.dactyl.fullyInitialized){
      head = thisWindow.dactyl;
    }
  } else if (typeof thisWindow.liberator != "undefined"){
    head = thisWindow.liberator;
  }
  if(head || startupAttempts > 0){
    thisWindow.pterosaurWindow = (new pterosaurWindow(thisWindow));
  } else {
    thisWindow.setTimeout(function(){exports.setup(thisWindow, (startupAttempts || 0) + 1);}, 300);
  }
}

exports.shutdown = function(thisWindow){
  if(thisWindow.pterosaurWindow)
    thisWindow.pterosaurWindow.onUnload()
}
