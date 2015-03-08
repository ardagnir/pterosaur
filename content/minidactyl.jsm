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
'use strict';

let EXPORTED_SYMBOLS = ["minidactyl"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

var Environment = Components.classes["@mozilla.org/process/environment;1"].getService(Components.interfaces.nsIEnvironment);

Components.utils.import("resource://gre/modules/FileUtils.jsm");

var minidactyl = function(console, window, editing, focusManager, pluginType){
    this.console = console;
    this.window = window;
    this.editing = editing;
    this.focusManager = focusManager;
    this.pluginType = pluginType;
    var thisInst = this;
    /**
     * Converts a given DOM Node, Range, or Selection to a string. If
     * *html* is true, the output is HTML, otherwise it is presentation
     * text.
     *
     * @param {nsIDOMNode | nsIDOMRange | nsISelection} node The node to
     *      stringify.
     * @param {boolean} html Whether the output should be HTML rather
     *      than presentation text.
     */
    this.stringify = function stringify(node, html) {
        if (node instanceof Ci.nsISelection && node.isCollapsed)
            return "";

        if (node instanceof Ci.nsIDOMNode) {
            let range = node.ownerDocument.createRange();
            range.selectNode(node);
            node = range;
        }
        let doc = (node.getRangeAt ? node.getRangeAt(0) : node).startContainer;
        doc = doc.ownerDocument || doc;

        let encoder = Cc["@mozilla.org/layout/htmlCopyEncoder;1"].createInstance(Ci.nsIDocumentEncoder)

        encoder.init(doc, "text/unicode", encoder.OutputRaw|encoder.OutputPreformatted);
        if (node instanceof Ci.nsISelection)
            encoder.setSelection(node);
        else if (node instanceof Ci.nsIDOMRange)
            encoder.setRange(node);

        let str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString)
        str.data = encoder.encodeToString();


        if (html)
            return str.data;

        let [result, length] = [{}, {}];
        
        let converter = Cc["@mozilla.org/widget/htmlformatconverter"].createInstance("nsIFromatConverter")
        converter.convert("text/html", str, str.data.length*2, "text/unicode", result, length);
        return result.value.QueryInterface(Ci.nsISupportsString).data;
    };
    this.code_key= JSON.parse('{"3":"Cancel","6":"Help","8":"BS","9":"Tab","12":"Clear","13":"Return","16":"Shift","17":"Control","18":"Alt","19":"Pause","20":"CapsLock","21":"Hangul","22":"Eisu","23":"Junja","24":"Final","25":"Kanji","27":"Esc","28":"Convert","29":"Nonconvert","30":"Accept","31":"Modechange","32":"Space","33":"PageUp","34":"PageDown","35":"End","36":"Home","37":"Left","38":"Up","39":"Right","40":"Down","41":"Select","42":"Print","43":"Execute","44":"Printscreen","45":"Insert","46":"Del","48":"0","49":"1","50":"2","51":"3","52":"4","53":"5","54":"6","55":"7","56":"8","57":"9","58":"Colon","59":";","60":"lt","61":"=","62":"GreaterThan","63":"QuestionMark","64":"At","65":"a","66":"b","67":"c","68":"d","69":"e","70":"f","71":"g","72":"h","73":"i","74":"j","75":"k","76":"l","77":"m","78":"n","79":"o","80":"p","81":"q","82":"r","83":"s","84":"t","85":"u","86":"v","87":"w","88":"x","89":"y","90":"z","91":"Win","93":"ContextMenu","95":"Sleep","96":"Numpad0","97":"Numpad1","98":"Numpad2","99":"Numpad3","100":"Numpad4","101":"Numpad5","102":"Numpad6","103":"Numpad7","104":"Numpad8","105":"Numpad9","106":"Multiply","107":"+","108":"Separator","109":"-","110":"Decimal","111":"Divide","112":"F1","113":"F2","114":"F3","115":"F4","116":"F5","117":"F6","118":"F7","119":"F8","120":"F9","121":"F10","122":"F11","123":"F12","124":"F13","125":"F14","126":"F15","127":"F16","128":"F17","129":"F18","130":"F19","131":"F20","132":"F21","133":"F22","134":"F23","135":"F24","144":"NumLock","145":"ScrollLock","146":"WinOemFjJisho","147":"WinOemFjMasshou","148":"WinOemFjTouroku","149":"WinOemFjLoya","150":"WinOemFjRoya","160":"Circumflex","161":"Exclamation","162":"DoubleQuote","163":"Hash","164":"Dollar","165":"Percent","166":"Ampersand","167":"Underscore","168":"OpenParen","169":"CloseParen","170":"Asterisk","171":"Plus","172":"Pipe","173":"HyphenMinus","174":"OpenCurlyBracket","175":"CloseCurlyBracket","176":"Tilde","181":"VolumeMute","182":"VolumeDown","183":"VolumeUp","188":",","190":".","191":"/","192":"`","219":"[","220":"\\\\","221":"]","222":"'+"'"+'","224":"Meta","225":"Altgr","227":"WinIcoHelp","228":"WinIco00","230":"WinIcoClear","233":"WinOemReset","234":"WinOemJump","235":"WinOemPa1","236":"WinOemPa2","237":"WinOemPa3","238":"WinOemWsctrl","239":"WinOemCusel","240":"WinOemAttn","241":"WinOemFinish","242":"WinOemCopy","243":"WinOemAuto","244":"WinOemEnlw","245":"WinOemBacktab","246":"Attn","247":"Crsel","248":"Exsel","249":"Ereof","250":"Play","251":"Zoom","253":"Pa1","254":"WinOemClear"}');
    this.key_code= JSON.parse('{"0":48,"1":49,"2":50,"3":51,"4":52,"5":53,"6":54,"7":55,"8":56,"9":57,"cancel":3,"help":6,"bs":8,"tab":9,"clear":12,"return":13,"cr":13,"enter":13,"shift":16,"control":17,"alt":18,"pause":19,"capslock":20,"kana":21,"hangul":21,"eisu":22,"junja":23,"final":24,"hanja":25,"kanji":25,"esc":27,"escape":27,"convert":28,"nonconvert":29,"accept":30,"modechange":31,"space":32," ":32,"pageup":33,"pagedown":34,"end":35,"home":36,"left":37,"up":38,"right":39,"down":40,"select":41,"print":42,"execute":43,"printscreen":44,"insert":45,"ins":45,"del":46,"colon":58,";":59,"lessthan":60,"=":61,"greaterthan":62,"questionmark":63,"at":64,"a":65,"b":66,"c":67,"d":68,"e":69,"f":70,"g":71,"h":72,"i":73,"j":74,"k":75,"l":76,"m":77,"n":78,"o":79,"p":80,"q":81,"r":82,"s":83,"t":84,"u":85,"v":86,"w":87,"x":88,"y":89,"z":90,"win":91,"contextmenu":93,"sleep":95,"numpad0":96,"numpad1":97,"numpad2":98,"numpad3":99,"numpad4":100,"numpad5":101,"numpad6":102,"numpad7":103,"numpad8":104,"numpad9":105,"multiply":106,"+":107,"plus":171,"add":107,"separator":108,"-":109,"minus":109,"subtract":109,"decimal":110,"divide":111,"f1":112,"f2":113,"f3":114,"f4":115,"f5":116,"f6":117,"f7":118,"f8":119,"f9":120,"f10":121,"f11":122,"f12":123,"f13":124,"f14":125,"f15":126,"f16":127,"f17":128,"f18":129,"f19":130,"f20":131,"f21":132,"f22":133,"f23":134,"f24":135,"numlock":144,"scrolllock":145,"winoemfjjisho":146,"winoemfjmasshou":147,"winoemfjtouroku":148,"winoemfjloya":149,"winoemfjroya":150,"circumflex":160,"exclamation":161,"doublequote":162,"hash":163,"dollar":164,"percent":165,"ampersand":166,"underscore":167,"openparen":168,"closeparen":169,"asterisk":170,"pipe":172,"hyphenminus":173,"opencurlybracket":174,"closecurlybracket":175,"tilde":176,"volumemute":181,"volumedown":182,"volumeup":183,",":188,".":190,"/":191,"`":192,"[":219,"\\\\":220,"]":221,"'+"'"+'":222,"meta":224,"altgr":225,"winicohelp":227,"winico00":228,"winicoclear":230,"winoemreset":233,"winoemjump":234,"winoempa1":235,"winoempa2":236,"winoempa3":237,"winoemwsctrl":238,"winoemcusel":239,"winoemattn":240,"winoemfinish":241,"winoemcopy":242,"winoemauto":243,"winoemenlw":244,"winoembacktab":245,"attn":246,"crsel":247,"exsel":248,"ereof":249,"play":250,"zoom":251,"pa1":253,"winoemclear":254,"<":60,"lt":60}');
    this.key_key = JSON.parse('{"0":"0","1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9","+":"+","plus":"Plus","add":"Add","`":"`","\\\\":"\\\\","bs":"BS",",":",","count":"count","]":"]","del":"Del","=":"=","esc":"Esc","escape":"Escape","insert":"Insert","ins":"Ins","leader":"Leader","lt":"LT","<":"<","nop":"Nop","[":"[","pass":"Pass",".":".","'+"'"+'":"'+"'"+'","return":"Return","cr":"CR","enter":"Enter",">":">",";":";","/":"/","space":"Space"," ":" ","-":"-","minus":"Minus","subtract":"Subtract","cancel":"Cancel","help":"Help","tab":"Tab","clear":"Clear","shift":"Shift","control":"Control","alt":"Alt","pause":"Pause","capslock":"CapsLock","kana":"Kana","hangul":"Hangul","eisu":"Eisu","junja":"Junja","final":"Final","hanja":"Hanja","kanji":"Kanji","convert":"Convert","nonconvert":"Nonconvert","accept":"Accept","modechange":"Modechange","pageup":"PageUp","pagedown":"PageDown","end":"End","home":"Home","left":"Left","up":"Up","right":"Right","down":"Down","select":"Select","print":"Print","execute":"Execute","printscreen":"Printscreen","colon":"Colon","lessthan":"LessThan","greaterthan":"GreaterThan","questionmark":"QuestionMark","at":"At","a":"a","b":"b","c":"c","d":"d","e":"e","f":"f","g":"g","h":"h","i":"i","j":"j","k":"k","l":"l","m":"m","n":"n","o":"o","p":"p","q":"q","r":"r","s":"s","t":"t","u":"u","v":"v","w":"w","x":"x","y":"y","z":"z","win":"Win","contextmenu":"ContextMenu","sleep":"Sleep","numpad0":"Numpad0","numpad1":"Numpad1","numpad2":"Numpad2","numpad3":"Numpad3","numpad4":"Numpad4","numpad5":"Numpad5","numpad6":"Numpad6","numpad7":"Numpad7","numpad8":"Numpad8","numpad9":"Numpad9","multiply":"Multiply","separator":"Separator","decimal":"Decimal","divide":"Divide","f1":"F1","f2":"F2","f3":"F3","f4":"F4","f5":"F5","f6":"F6","f7":"F7","f8":"F8","f9":"F9","f10":"F10","f11":"F11","f12":"F12","f13":"F13","f14":"F14","f15":"F15","f16":"F16","f17":"F17","f18":"F18","f19":"F19","f20":"F20","f21":"F21","f22":"F22","f23":"F23","f24":"F24","numlock":"NumLock","scrolllock":"ScrollLock","winoemfjjisho":"WinOemFjJisho","winoemfjmasshou":"WinOemFjMasshou","winoemfjtouroku":"WinOemFjTouroku","winoemfjloya":"WinOemFjLoya","winoemfjroya":"WinOemFjRoya","circumflex":"Circumflex","exclamation":"Exclamation","doublequote":"DoubleQuote","hash":"Hash","dollar":"Dollar","percent":"Percent","ampersand":"Ampersand","underscore":"Underscore","openparen":"OpenParen","closeparen":"CloseParen","asterisk":"Asterisk","pipe":"Pipe","hyphenminus":"HyphenMinus","opencurlybracket":"OpenCurlyBracket","closecurlybracket":"CloseCurlyBracket","tilde":"Tilde","volumemute":"VolumeMute","volumedown":"VolumeDown","volumeup":"VolumeUp","meta":"Meta","altgr":"Altgr","winicohelp":"WinIcoHelp","winico00":"WinIco00","winicoclear":"WinIcoClear","winoemreset":"WinOemReset","winoemjump":"WinOemJump","winoempa1":"WinOemPa1","winoempa2":"WinOemPa2","winoempa3":"WinOemPa3","winoemwsctrl":"WinOemWsctrl","winoemcusel":"WinOemCusel","winoemattn":"WinOemAttn","winoemfinish":"WinOemFinish","winoemcopy":"WinOemCopy","winoemauto":"WinOemAuto","winoemenlw":"WinOemEnlw","winoembacktab":"WinOemBacktab","attn":"Attn","crsel":"Crsel","exsel":"Exsel","ereof":"Ereof","play":"Play","zoom":"Zoom","pa1":"Pa1","winoemclear":"WinOemClear"}');
    /**
     * Converts the specified event to a string in dactyl key-code
     * notation. Returns null for an unknown event.
     *
     * @param {Event} event
     * @returns {string}
     */
    this.stringifyEvent= function stringify(event) {
        //if (isArray(event))
        //    return event.map(e => this.stringify(e)).join("");

        if (event.dactylString)
            return event.dactylString;

        let key = null;
        let modifier = "";

        if (event.globKey)
            modifier += "*-";
        if (event.ctrlKey)
            modifier += "C-";
        if (event.altKey)
            modifier += "A-";
        if (event.metaKey)
            modifier += "M-";

        if (/^key/.test(event.type)) {
            let charCode = event.type == "keyup" ? 0 : event.charCode; // Why? --Kris
            if (charCode == 0) {
                if (event.keyCode in this.code_key) {
                    key = this.code_key[event.keyCode];

                    if (event.shiftKey && (key.length > 1 || key.toUpperCase() == key.toLowerCase()
                                           || event.ctrlKey || event.altKey || event.metaKey)
                            || event.dactylShift)
                        modifier += "S-";
                    else if (!modifier && key.length === 1)
                        if (event.shiftKey)
                            key = key.toUpperCase();
                        else
                            key = key.toLowerCase();

                    if (!modifier && key.length == 1)
                        return key;
                }
            }
            // [Ctrl-Bug] special handling of mysterious <C-[>, <C-\\>, <C-]>, <C-^>, <C-_> bugs (OS/X)
            //            (i.e., cntrl codes 27--31)
            // ---
            // For more information, see:
            //     [*] Referenced mailing list msg: http://www.mozdev.org/pipermail/pentadactyl/2008-May/001548.html
            //     [*] Mozilla bug 416227: event.charCode in keypress handler has unexpected values on Mac for Ctrl with chars in "[ ] _ \"
            //         https://bugzilla.mozilla.org/show_bug.cgi?id=416227
            //     [*] Mozilla bug 432951: Ctrl+'foo' doesn't seem same charCode as Meta+'foo' on Cocoa
            //         https://bugzilla.mozilla.org/show_bug.cgi?id=432951
            // ---
            //
            // The following fixes are only activated if config.OS.isMacOSX.
            // Technically, they prevent mappings from <C-Esc> (and
            // <C-C-]> if your fancy keyboard permits such things<?>), but
            // these <C-control> mappings are probably pathological (<C-Esc>
            // certainly is on Windows), and so it is probably
            // harmless to remove the config.OS.isMacOSX if desired.
            //
            else if (/*config.OS.isMacOSX &&*/ event.ctrlKey && charCode >= 27 && charCode <= 31) {
                if (charCode == 27) { // [Ctrl-Bug 1/5] the <C-[> bug
                    key = "Esc";
                    modifier = modifier.replace("C-", "");
                }
                else // [Ctrl-Bug 2,3,4,5/5] the <C-\\>, <C-]>, <C-^>, <C-_> bugs
                    key = String.fromCharCode(charCode + 64);
            }
            // a normal key like a, b, c, 0, etc.
            else if (charCode) {
                key = String.fromCharCode(charCode);

                if (!/^[^<\s]$/i.test(key) && key in this.key_code) {
                    // a named charCode key (<Space> and <lt>) space can be shifted, <lt> must be forced
                    if ((key.match(/^\s$/) && event.shiftKey) || event.dactylShift)
                        modifier += "S-";

                    key = this.code_key[this.key_code[key]];
                }
                else {
                    // a shift modifier is only allowed if the key is alphabetical and used in a C-A-M- mapping in the uppercase,
                    // or if the shift has been forced for a non-alphabetical character by the user while :map-ping
                    if (key !== key.toLowerCase() && (event.ctrlKey || event.altKey || event.metaKey) || event.dactylShift)
                        modifier += "S-";
                    if (/^\s$/.test(key))
                        key = let (s = charCode.toString(16)) "U" + "0000".substr(4 - s.length) + s;
                    else if (modifier.length == 0)
                        return key;
                }
            }
            if (key == null) {
                if (event.shiftKey)
                    modifier += "S-";
                key = thisInst.key_key[event.key] || event.key;
            }
            if (key == null)
                return null;
        }
        else if (event.type == "click" || event.type == "dblclick") {
            if (event.shiftKey)
                modifier += "S-";
            if (event.type == "dblclick")
                modifier += "2-";
            // TODO: triple and quadruple click

            switch (event.button) {
            case 0:
                key = "LeftMouse";
                break;
            case 1:
                key = "MiddleMouse";
                break;
            case 2:
                key = "RightMouse";
                break;
            }
        }

        if (key == null)
            return null;

        return "<" + modifier + key + ">";
    };
    /**
     * Searches for the given executable file in the system executable
     * file paths as specified by the PATH environment variable.
     *
     * On Windows, if the unadorned filename cannot be found, the
     * extensions in the semicolon-separated list in the PATHSEP
     * environment variable are successively appended to the original
     * name and searched for in turn.
     *
     * @param {string} bin The name of the executable to find.
     * @returns {File|null}
     */
    this.pathSearch = function pathSearch(bin) {
        //if (bin instanceof File || File.isAbsolutePath(bin))
            //return this.File(bin);

        //TODO: WINDOWS_COMPAT
        let PATH_SEPERATOR=":";
        let dirs = Environment.get("PATH")
                           .split(PATH_SEPERATOR);

        //TODO: WINDOWS_COMPAT Windows tries the CWD first TODO: desirable?
        //if (config.OS.isWindows)
            //dirs = [io.cwd].concat(dirs);

        for (let [, dir] in Iterator(dirs))
            try {
                let file = FileUtils.File(dir);

                file.append(bin);

                if (file.exists() && file.isFile() && file.isExecutable())
                    return file;

                // TODO: couldn't we just palm this off to the start command?
                // automatically try to add the executable path extensions on windows
                /*
                if (config.OS.isWindows) {
                    let extensions = services.environment.get("PATHEXT").split(";");
                    for (let [, extension] in Iterator(extensions)) {
                        file = dir.child(bin + extension);
                        if (file.exists())
                            return file;
                    }
                }
                */
            }
            catch (e) {}
        return null;
    };

    /**
     * Original Pentadactyl comment (Has since been simplified and only takes one key):
     * Pushes keys onto the event queue from dactyl. It is similar to
     * Vim's feedkeys() method, but cannot cope with 2 partially-fed
     * strings, you have to feed one parseable string.
     *
     * @param {string} keys A string like "2<C-f>" to push onto the event
     *     queue. If you want "<" to be taken literally, prepend it with a
     *     "\\".
     * @param {boolean} noremap Whether recursive mappings should be
     *     disallowed.
     * @param {boolean} silent Whether the command should be echoed to the
     *     command line.
     * @returns {boolean}
     */
    //NOTE: Do not use with pentadactyl. Use pentadactyl's feedkeys instead.
    this.feedkey = function (key, focusedElement) {
      let evt_obj = thisInst.parse(key)[0];
      ["keydown", "keypress", "keyup"].forEach(function(type){
        let evt = {};
        for(var dictKey in evt_obj){
          evt[dictKey] = evt_obj[dictKey];
        }
        evt['type'] = type;
        evt['key'] = key;
        evt['bubbles'] = true;
        evt['cancelable'] = true;
        //let evt = update({}, evt_obj, { type: type });
        if (type !== "keypress" && !evt.keyCode)
          evt.keyCode = evt._keyCode || 0;

        evt.isMacro = true;
        //evt.dactylMode = mode;
        //evt.dactylSavedEvents = savedEvents;
        //DOM.Event.feedingEvent = evt;

        //let doc = document.commandDispatcher.focusedWindow.document;
//TODO_DESIGNMODE
        let doc = thisInst.window.content.document;

        
        //dactyl.focusedElement
        let target = thisInst.focusManager.getFocusedElementForWindow(thisInst.window, true, {})
          || ["complete", "interactive"].indexOf(doc.readyState) >= 0 && doc.documentElement
          || doc.defaultView;

        //if (target instanceof Element && !this.isInputElement(target) &&
            //["<Return>", "<Space>"].indexOf(key) == -1)
         // target = target.ownerDocument.documentElement;

        //let event = DOM.Event(doc, type, evt_obj);
        //let event = target.ownerDocument.createEvent('KeyEvents');
        let event = new thisInst.window.KeyboardEvent(type, evt);
        //if (!evt_obj.dactylString && !mode)
          thisInst.dispatchEvent(target, event, evt);
        //else if (type === "keypress")
         //events.events.keypress.call(events, event);
      });
    };
    this.isInputElement = function isInputElement(elem) {
        return elem instanceof Ci.nsIDOMElement && true/*TODO: DOM(elem).isEditable*/ ||
               isinstance(elem, [Ci.nsIDOMHTMLEmbedElement,
                                 Ci.nsIDOMHTMLObjectElement,
                                 Ci.nsIDOMHTMLSelectElement]);
    };

    /**
     * Dispatches an event to an element as if it were a native event.
     *
     * @param {Node} target The DOM node to which to dispatch the event.
     * @param {Event} event The event to dispatch.
     */
    this.dispatchEvent = function dispatch(target, event, extra) {
          try {
              //this.feedingEvent = extra;

              if (target instanceof Ci.nsIDOMElement) {
                  return (target.ownerDocument || target.document || target).defaultView
                         .QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils)
                         .dispatchDOMEventViaPresShell(target, event, true);
              }
              else {
                  target.dispatchEvent(event);
                  return !event.defaultPrevented;
              }
          }
          catch (e) {
              console.log(e)
              //util.reportError(e);
          }
          finally {
              //this.feedingEvent = null;
          }
    };
    this.wrappedFile = function( file ) {
      var MODE_WRONLY = 0x02;
      var MODE_CREATE = 0x08;
      var MODE_TRUNCATE = 0x20;

      this.write = function(text){
        function getStream(defaultChar) {
          var stream = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Ci.nsIConverterOutputStream);
          stream.init(ofstream, encoding, 0, defaultChar)
          return stream;
        }
        let mode = MODE_WRONLY | MODE_CREATE | MODE_TRUNCATE;
        let perms = 0o600;
        let ofstream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
        ofstream.init(file, mode, perms, 0);
        let encoding = 'UTF8';
        try{
          var ocstream = getStream(0);
          ocstream.writeString(text)
        }
        catch (e if e.result == Cr.NS_ERROR_LOSS_OF_SIGNIFICANT_DATA) {
            ocstream.close();
            ocstream = getStream("?".charCodeAt(0));
            ocstream.writeString(text);
            return false;
        }
        finally {
            try {
                ocstream.close();
            }
            catch (e) {}
            ofstream.close();
        }
        return true;
      };

      this.read = function(encoding) {
          var ifstream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
          ifstream.init(file, -1, 0, 0);
          return this.readStream(ifstream, encoding || 'UTF-8');

      }
      this.readStream = function(ifstream, encoding) {
        try {
            var icstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Ci.nsIConverterInputStream, Ci.nsIUnicharLineInputStream);
            icstream.init(ifstream, encoding || File.defaultEncoding, 4096, // buffer size
                    icstream.DEFAULT_REPLACEMENT_CHARACTER);

            let buffer = [];
            let str = {};
            while (icstream.readString(4096, str) != 0)
                buffer.push(str.value);
            return buffer.join("");
        }
        finally {
            icstream.close();
            ifstream.close();
        }
      }
      this.path = file.path;
    };
    this.nodeContents = function nodeContents(node) {
      let range = node.ownerDocument.createRange();
      try {
        range.selectNodeContents(node);
      }
      catch(e) {}
      return range;
    };
    this.keyHandler = {
      mappings: {},
      listener: null,
      addKeyDown: function(key, callback){
        thisInst.keyHandler.mappings[key]=callback;
      },
      removeKeyDown: function(key){
        delete thisInst.keyHandler.mappings[key];
      },
      keydown: function(e){
        if (thisInst.editing()){
          var callback = thisInst.keyHandler.mappings[thisInst.stringifyEvent(e)];
          if (callback) {
            let returnVal = callback();
            if(!returnVal) {
              e.stopPropagation();
              e.preventDefault();
            }
            return returnVal;
          }
        }
        else{
          return true;
        }
      },
      onKeyPress: function(){
        //override this
      },
      keypress: function(e){
        let returnVal = thisInst.keyHandler.onKeyPress(e);
        if(!returnVal) {
          e.stopPropagation();
          e.preventDefault();
        }
        return returnVal;
      }
    };

    thisInst.window.addEventListener("keydown", thisInst.keyHandler.keydown, true);
    thisInst.window.addEventListener("keypress", thisInst.keyHandler.keypress, true);

    this.shutdown = function(){
      thisInst.window.removeEventListener("keydown", thisInst.keyHandler.keydown, true);
      thisInst.window.removeEventListener("keypress", thisInst.keyHandler.keypress, true);
    }

    this.parse = function parse(input, unknownOk=true) {
        //if (isArray(input))
         //   return array.flatten(input.map(k => this.parse(k, unknownOk)));

        let out = [];
        for (let match in thisInst.iterateRegex(/<.*?>?>|[^<]|<(?!.*>)/g, input)) {
            let evt_str = match[0];

            let evt_obj = { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false,
                            keyCode: 0, charCode: 0, type: "keypress" };

            if (evt_str.length == 1) {
                evt_obj.charCode = evt_str.charCodeAt(0);
                evt_obj._keyCode = this.key_code[evt_str[0].toLowerCase()];
                evt_obj.shiftKey = evt_str !== evt_str.toLowerCase();
            }
            else {
                let [match, modifier, keyname] = evt_str.match(/^<((?:[*12CASM⌘]-)*)(.+?)>$/i) || [false, '', ''];
                modifier = new Set(modifier.toUpperCase());
                keyname = keyname.toLowerCase();
                evt_obj.dactylKeyname = keyname;
                if (/^u[0-9a-f]+$/.test(keyname))
                    keyname = String.fromCharCode(parseInt(keyname.substr(1), 16));

                if (keyname && (unknownOk || keyname.length == 1 || /mouse$/.test(keyname) ||
                                this.key_code[keyname] || this.pseudoKeys.has(keyname))) {
                    evt_obj.globKey  = modifier.has("*");
                    evt_obj.ctrlKey  = modifier.has("C");
                    evt_obj.altKey   = modifier.has("A");
                    evt_obj.shiftKey = modifier.has("S");
                    evt_obj.metaKey  = modifier.has("M") || modifier.has("⌘");
                    evt_obj.dactylShift = evt_obj.shiftKey;

                    if (keyname.length == 1) { // normal characters
                        if (evt_obj.shiftKey)
                            keyname = keyname.toUpperCase();

                        evt_obj.dactylShift = evt_obj.shiftKey && keyname.toUpperCase() == keyname.toLowerCase();
                        evt_obj.charCode = keyname.charCodeAt(0);
                        evt_obj.keyCode = this.key_code[keyname.toLowerCase()];
                    }
                    else if (this.pseudoKeys.has(keyname)) {
                        evt_obj.dactylString = "<" + this.key_key[keyname] + ">";
                    }
                    else if (/mouse$/.test(keyname)) { // mouse events
                        evt_obj.type = (modifier.has("2") ? "dblclick" : "click");
                        evt_obj.button = ["leftmouse", "middlemouse", "rightmouse"].indexOf(keyname);
                        delete evt_obj.keyCode;
                        delete evt_obj.charCode;
                    }
                    else { // spaces, control characters, and <
                        evt_obj.keyCode = this.key_code[keyname];
                        evt_obj.charCode = 0; }
                }
                else { // an invalid sequence starting with <, treat as a literal
                    out = out.concat(this.parse("<lt>" + evt_str.substr(1)));
                    continue;
                }
            }

            // TODO: make a list of characters that need keyCode and charCode somewhere
            if (evt_obj.keyCode == 32 || evt_obj.charCode == 32)
                evt_obj.charCode = evt_obj.keyCode = 32; // <Space>
            if (evt_obj.keyCode == 60 || evt_obj.charCode == 60)
                evt_obj.charCode = evt_obj.keyCode = 60; // <lt>

            evt_obj.modifiers = (evt_obj.ctrlKey  && Ci.nsIDOMNSEvent.CONTROL_MASK)
                              | (evt_obj.altKey   && Ci.nsIDOMNSEvent.ALT_MASK)
                              | (evt_obj.shiftKey && Ci.nsIDOMNSEvent.SHIFT_MASK)
                              | (evt_obj.metaKey  && Ci.nsIDOMNSEvent.META_MASK);

            out.push(evt_obj);
        }
        return out;
    };
    this.iterateRegex = function iterate(regexp, string, lastIndex) {
        regexp.lastIndex = lastIndex = lastIndex || 0;
        let match;
        while (match = regexp.exec(string)) {
            lastIndex = regexp.lastIndex;
            yield match;
            regexp.lastIndex = lastIndex;
            if (match[0].length == 0 || !regexp.global)
                break;
        }
    };
    this.pseudoKeys = Set(["count", "leader", "nop", "pass"]);
}
