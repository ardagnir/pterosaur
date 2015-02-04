Pterosaur
=========

Pterosaur gives you the full power of Vim and your vimrc in each Firefox text field.

![Demo](http://i.imgur.com/MuUj2hZ.gif)


##Requirements
- Pterosaur requires [Vim](http://www.vim.org).
- Your vim version needs to have [+clientserver](#vim-info) support compiled in. Run `vim --version | grep clientserver` to check. (You want a plus sign)
- Pterosaur works best in GNU/Linux.
- Pterosaur also works in OSX [(but read the OSX section first)](#mac-osx-notes)

##Installing
**Step 1:** Clone pterosaur. (If you're updating from a pre-1.0 version, just move pterosuar *out* of the Pentadactyl plugins directory and `git pull`.)

    git clone --recursvie http://github.com/ardagnir/pterosaur

**Step 2:** Make and install pterosaur.
    cd pterosaur
    make
    make install

##How it works
Pterosaur uses [vimbed](http://github.com/ardagnir/vimbed) to run an actual vim instance in the background and routes keystrokes through vim.

Pterosaur attempts to be unobtrusive, so even though it edits every non-password textbox with vim, it starts out in vim's insert mode and enters vim's select mode when you select text with the mouse. This allows you to use traditional firefox mouse behavior, while still being able to leave insert mode and use anything you want from vim.

##Pentadactyl/Vimperator Integration
Pterosaur integrates well with both Pentadactyl and Vimperator.

While pterosaur allows you to edit text with vim, Pentadactyl and Vimperator will give you vim like control over the rest of your browser. If you haven't already, you should consider installing one of them. (IMO Pentadactyl is better, but you have to [build it yourself](http://5digits.org/coding) for newer versions of Firefox.)

##Configuration
Pterosaur can be configured by editing various configuration options. These can be edited in Firefox through the **about:config** or in Pentadactyl/Vimperator using the **:set!** command.

**enabled**: set to false to disable pterosaur

**contentonly**: When set to false, pterosaur uses vim in the chrome areas of the browser window (like the awesomebar and firebug). When set to true, only web content uses vim. Defaults to false.

**autorestart**: Defaults to true. If you quit vim with autorestart enabled, vim will start back up automatically. Otherwise, typing :q in normal mode will make pterosaur unusable.

**vimbinary**: Set this to the path of the vim binary you want pterosaur to use. Pick a [terminal vim binary with +clientserver enabled](#vim-info).

**debugtty**: Set this to a tty to display pterosaurs running vim process on that tty. Type `tty` in any terminal window to get the string you'll need to type. It should look something like `/dev/pts/0`

**rcfile**: Set this to a file (default: ~/.pterosaurrc) to have pterosaur's vim load that file on startup. This is useful for pterosaur-specific vim settings.

##Vim Info
Pterosaur requires that you use a terminal version of vim with +clientserver support compiled in. You can test your vim's clientserver support by running:

    vim --version | grep clientserver

+clientserver is usually good enough, but if you want to use plugins that call vim's "input()" function in pterosaur you also need to have vim compiled without gui support. (Often terminal vim can be run in gui mode with a -g flag. Even if you never use the -g flag, support for this breaks the "input()" function in headless vim.)

The easiest way to make sure you have +clientserver is to install your distro's "biggest" vim package. If you want to build an appropriate vim yourself, here's an example:

    hg clone https://vim.googlecode.com/hg/ vim
    cd vim
    ./configure --with-features=huge --disable-gui
    make
    sudo make install

If you don't want to overwrite your normal vim, you can change
    sudo cp src/vim /usr/bin/pterosaurvim

In this case, make sure to edit firefox's about:config and set extensions.pterosaur.vimbinary to /usr/bin/pterosaurvim

##Mac OSX notes
- Pterosaur requires XQuartz to function on OSX. *(This is a requirement of vim's +clientserver functionality.)*
- Pterosaur will **not** work with MacVim. You need to install a standard vim program with +clientserver using MacPorts or Homebrew.

##Bugs
- If you find a bug, please create a github issue.

- Pterosaur does not yet support google docs.

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
