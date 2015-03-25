**Note: THIS PROJECT IS NO LONGER MAINTAINED**

**Due to the rules of my new employer, I likely won't be able to continue contributing to or maintaining Pterosaur as a Firefox addon for the foreseeable future. Pterosaur works through Firefox 38, which should be in ESR until mid-2016. Hopefully, I will have made a Chromium version well before then. I apologize to everybody whose workflow will be disrupted. Pterosaur is free software. There is nothing stopping you from forking it.**

Pterosaur
=========

Pterosaur gives you the full power of Vim and your vimrc in each Firefox text field.

![Demo](http://i.imgur.com/po3fTlW.gif)

*Pterosaur supports most vim plugins. This demo uses Pterosaur v1.0 with the [vim-surround](http://github.com/tpope/vim-surround) plugin and a mod of the [invader-vim](http://github.com/mattn/invader-vim) script.*

##Requirements
- Pterosaur requires [Vim](http://www.vim.org).
- Your vim version needs to have [+clientserver](#vim-info) support compiled in. Run `vim --version | grep clientserver` to check. (You want a plus sign)
- Pterosaur works best in GNU/Linux.
- Pterosaur also works in OSX [(but read the OSX section first)](#mac-osx-notes)

##Installing
###The Easy Way:
Click [here](http://ardagnir.github.io/pterosaur.xpi)

###The Normal Way:
**Step 1:** Clone pterosaur. (If you're updating from a pre-1.0 version, just move pterosuar *out* of the Pentadactyl plugins directory and `git pull`)

    git clone --recursive http://github.com/ardagnir/pterosaur

**Step 2:** Make and install pterosaur.

    cd pterosaur
    make
    make install

*`make install` won't work for Mac users. Manually install the xpi after the `make` or use "The Easy Way" above.*

##How it works
Pterosaur uses [vimbed](http://github.com/ardagnir/vimbed) to run an actual vim instance in the background and routes keystrokes through vim.

Pterosaur attempts to be unobtrusive, so even though it edits every non-password textbox with vim, it starts out in vim's insert mode and enters vim's select mode when you select text with the mouse. This allows you to use traditional firefox mouse behavior, while still being able to leave insert mode and use anything you want from vim.

##Pentadactyl/Vimperator Integration
Pterosaur integrates well with both Pentadactyl and Vimperator.

While Pterosaur allows you to edit text with vim, Pentadactyl and Vimperator will give you vim like control over the rest of your browser. If you haven't already, you should consider installing one of them. (IMO Pentadactyl is better, but you have to [build it yourself](http://5digits.org/coding) for newer versions of Firefox.)

##Configuration
Pterosaur can be configured by editing various configuration options. These can be edited in Firefox through the **about:config** or in Pentadactyl/Vimperator using the **:set!** command. All the following extensions begin with **extensions.pterosaur.**

**enabled**: set to false to disable Pterosaur

**contentonly**: When set to false, Pterosaur uses vim in the chrome areas of the browser window (like the awesomebar and firebug). When set to true, only web content uses vim. Defaults to true.

**allowprivate**: By default, Pterosaur will *not* send keys typed in private browsing mode to vim. If you set this to true, it will not treat private browsing any differently than normal browsing.

**autorestart**: Defaults to true. If you quit vim with autorestart enabled, vim will start back up automatically. Otherwise, typing :q in normal mode will make Pterosaur unusable.

**verbose**: Causes pterosaur to display extra information to the browser console.

**restartnow**: Set this to true to restart Pterosaur's vim instance. Especially useful if you don't have autorestart enabled or if you switched vimbinaries and don't want to restart Firefox. This automatically sets back to false after half a second so that it can be used again.

Pentadactyl and Vimperator users can also restart vim using the :pterosaurrestart command.

**vimbinary**: Set this to the path of the vim binary you want Pterosaur to use. Pick a [terminal vim binary with +clientserver enabled](#vim-info).

**debugtty**: Set this to a tty to display Pterosaur's running vim process on that tty. Type `tty` in any terminal window to get the string you'll need to type. It should look something like `/dev/pts/0`

**rcfile**: Set this to a file (default: ~/.pterosaurrc) to have Pterosaur's vim load that file on startup. This is useful for Pterosaur-specific vim settings.

**exitkey**: Pressing this key will cause the textbox to lose focus if pressed in normal mode or immediately following an Escape press. The default value is `<Esc>`. Control values can be used in the form `<C-a>` or `<C-S-A>` (case sensitive).

**envoverrides**: A space seperated list of environment variables with values used to to override the defaults when calling vim. For example, you might set this value to something like "DISPLAY=:0 XAUTHORITY=/home/me/.Xauthority" if you are using firefox with X11 forwarding. Most environment variables not specified here will inherit their values from Firefox.

##FAQ
**Q:** Why isn't Pterosaur working in firebug?<br/>
**A:** By default, pterosaur is only enbled for web content. You can enable it for browser chrome and extensions by setting [extensions.pterosaur.contentonly](#configuration) to false.

**Q:** Can I use gvim with Pterosaur?<br/>
**A:** Usually, yes. Pterosaur automatically tells vim to run in the console using the "-v" flag. If typing "gvim -v" on your computer brings up a console vim, you can probably use it for pterosaur. Make sure to set the [vimbinary](#configuration) to gvim.

**Q:** Why am I having issues deleting text?<br/>
**A:** Pterosaur uses your vim settings, which may prevent you from deleting text depending on your `set backspace` value. You can change this for all of vim in your ~/.vimrc, or just pterosaur in the ~/.pterosaurrc.

##Vim Info
Pterosaur requires that you use a terminal version of vim with +clientserver support compiled in. You can test your vim's clientserver support by running:

    vim --version | grep clientserver

+clientserver is usually good enough, but if you want to use plugins that call vim's "input()" function in Pterosaur you also need to have vim compiled without gui support. (Often terminal vim can be run in gui mode with a -g flag. Even if you never use the -g flag, support for this breaks the "input()" function in headless vim.)

The easiest way to make sure you have +clientserver is to install your distro's "biggest" vim package. If you want to build an appropriate vim yourself, here's an example:

    hg clone https://vim.googlecode.com/hg/ vim
    cd vim
    ./configure --with-features=huge --disable-gui
    make
    sudo make install

If you don't want to overwrite your normal vim, you can change the last line to something like:

    sudo cp src/vim /usr/bin/pterosaurvim

In this case, make sure to edit firefox's **about:config** and set [extensions.pterosaur.vimbinary](#configuration) to `/usr/bin/pterosaurvim`

Note that if you install a new vim binary, some distro-based vim settings you might take for granted, such as `set backspace += start` might need to be defined in your vimrc.

##Mac OSX notes
- Pterosaur requires XQuartz to function on OSX. *(This is a requirement of vim's +clientserver functionality.)*
- Pterosaur will **not** work with MacVim. You need to install a standard vim program with +clientserver using MacPorts or Homebrew.
- If you have Homebrew, you can install vim with +clientserver using:

`brew install vim --with-client-server`

- If you have MacPorts, use:

`sudo port install vim +huge +x11`

- MacPorts will install vim to something like /opt/local/bin/vim. Make sure to set that as your [vimbinary](#configuration).
- Note that if you install a new vim binary, some vim settings you might take for granted, such as `set backspace += start` might need to be defined in your vimrc

##Privacy
Be aware that since Pterosaur sends all your keystrokes through vim, it can temporarily store sensitive data on your computer. For this reason, Pterosaur is automatically disabled for password fields. There is no such protection for other data, such as credit card numbers. You can wipe this data by quiting vim and destroying the `/tmp/vimbed/pterosaur*` directory. It should also automatically be destroyed when you quit Firefox.

By default Pterosaur is disabled in private browsing mode. You can enable Pterosaur in prvate browsing by setting [extensions.pterosaur.allowprivate](#configuration) to true.

##Bugs
- If you find a bug, please create a github issue.

- Pterosaur does not yet support vim mode for google docs and will fail over to normal editing.

##Troubleshooting
Pterosaur should "just work", but if it doesn't:

1. Make sure you are running master. It is the stable version.

2. Make sure the [vimbinary](#configuration) points to a version of vim with [+clientserver](#vim-info) enabled.

3. Set the [debugtty](#configuration) to a terminal and see if vim is running correctly.

4. Run `vim --serverlist`. See if there's a server starting with "PTEROSAUR"

6. If there's still a problem, create an issue and let me know the results of steps 3 and 4, as well as your operating system, firefox version, the webpage you're having problems with, and if you're running Pentadactyl/Vimperator.

##Hacking/Contributing
- One of the best ways to contribute is to report bugs in the issues section.

- You can also submit patches to fix issues. Find an issue that isn't assigned and let me know you're working on it.

##License
AGPL v3
