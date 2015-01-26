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

var Environment = Components.classes["@mozilla.org/process/environment;1"].getService(Components.interfaces.nsIEnvironment);

Components.utils.import("resource://gre/modules/FileUtils.jsm");

var minidactyl = {
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
    stringify: function stringify(node, html) {
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
    },
  /**
   * Converts the specified event to a string in dactyl key-code
   * notation. Returns null for an unknown event.
   *
   * @param {Event} event
   * @returns {string}
   */
  stringifyEvent: function stringify(event) {
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

                    if (!/^[^<\s]$/i.test(key) /*&& key in this.key_code*/) {
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
                    key = this.key_key[event.dactylKeyname] || event.dactylKeyname;
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
        },
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
    pathSearch: function pathSearch(bin) {
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
    }
}
