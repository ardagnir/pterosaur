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
 */
Components.utils.import("resource://gre/modules/Services.jsm");

var scopes = {};
function require(module)
{
  if (!(module in scopes))
  {
    let url = "chrome://pterosaur/content/" + module + ".js";
    scopes[module] = {
      require: require,
      exports: {}
    };
    Services.scriptloader.loadSubScript(url, scopes[module]);
  }
  return scopes[module].exports;
}

var pterosaur;

function startup(data, reason) {
    /// <summary>
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    /// &#10;  string id
    /// &#10;  string version
    /// &#10;  nsIFile installPath
    /// &#10;  nsIURI resourceURI
    /// &#10;
    /// Reason types:
    /// &#10;  APP_STARTUP
    /// &#10;  ADDON_ENABLE
    /// &#10;  ADDON_INSTALL
    /// &#10;  ADDON_UPGRADE
    /// &#10;  ADDON_DOWNGRADE
    /// </summary>
    pterosaur = require("pterosaur");
    forEachOpenWindow(pterosaur.setup);
    Services.wm.addListener(WindowListener);
}

var WindowListener =
{
  onOpenWindow: function(xulWindow)
  {
    var window = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                              .getInterface(Components.interfaces.nsIDOMWindow);
        function onWindowLoad()
        {
            window.removeEventListener("load", onWindowLoad);
            if (window.document.documentElement.getAttribute("windowtype") == "navigator:browser")
                pterosaur.setup(window);
        }
        window.addEventListener("load", onWindowLoad);
  },
  onCloseWindow: function(xulWindow) {
    var window = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                              .getInterface(Components.interfaces.nsIDOMWindow);
        function onWindowUnload()
        {
            window.removeEventListener("unload", onWindowUnload);
            if (window.document.documentElement.getAttribute("windowtype") == "navigator:browser")
            {
              pterosaur.shutdown(window);
            }
        }
        window.addEventListener("unload", onWindowUnload);
  },
  onWindowTitleChange: function(xulWindow, newTitle) { }
}

function shutdown(data, reason) {
    /// <summary>
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    /// &#10;  string id
    /// &#10;  string version
    /// &#10;  nsIFile installPath
    /// &#10;  nsIURI resourceURI
    /// &#10;
    /// Reason types:
    /// &#10;  APP_SHUTDOWN
    /// &#10;  ADDON_DISABLE
    /// &#10;  ADDON_UNINSTALL
    /// &#10;  ADDON_UPGRADE
    /// &#10;  ADDON_DOWNGRADE
    /// </summary>
    forEachOpenWindow(pterosaur.shutdown);
    Services.wm.removeListener(WindowListener);
}
function install(data, reason) {
    /// <summary>
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    /// &#10;  string id
    /// &#10;  string version
    /// &#10;  nsIFile installPath
    /// &#10;  nsIURI resourceURI
    /// &#10;
    /// Reason types:
    /// &#10;  ADDON_INSTALL
    /// &#10;  ADDON_UPGRADE
    /// &#10;  ADDON_DOWNGRADE
    /// </summary>
}
function uninstall(data, reason) {
    /// <summary>
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    /// &#10;  string id
    /// &#10;  string version
    /// &#10;  nsIFile installPath
    /// &#10;  nsIURI resourceURI
    /// &#10;
    /// Reason types:
    /// &#10;  ADDON_UNINSTALL
    /// &#10;  ADDON_UPGRADE
    /// &#10;  ADDON_DOWNGRADE
    /// </summary>
}

function forEachOpenWindow(todo) {
  var windows = Services.wm.getEnumerator("navigator:browser")
  while (windows.hasMoreElements()) {
    todo(windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow));
  }
}
