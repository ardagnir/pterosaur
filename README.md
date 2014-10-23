Pterosaur
=========

Pterosaur gives you the full power of Vim and your vimrc in each Firefox text field.

![Demo](http://i.imgur.com/MuUj2hZ.gif)


##Requirements
- Pterosaur requires [Pentadactyl](http://5digits.org/pentadactyl/) and [Vim](http://www.vim.org) (your version needs to have +clientserver).
- Pterosaur works best in GNU/Linux.
- Pterosaur also works in OSX [(but read the OSX section first)](#mac-osx-notes)

##Setup
**Step 1:** If you don't have the [vimbed](https://github.com/ardagnir/vimbed) plugin, install it first using your plugin-manager. If you use pathogen:

    cd ~/.vim/bundle
    git clone http://github.com/ardagnir/vimbed
    
**Step 2:** Clone pterosaur to your pentadactyl plugin directory

    mkdir -p ~/.pentadactyl/plugins
    cd ~/.pentadactyl/plugins
    git clone http://github.com/ardagnir/pterosaur

**Step 3:** Pterosaur's full-vim editing is disabled by default. Type `:set fullvim` in firefox to enable it.

##How it works
Pterosaur uses vimbed to run an actual vim instance in the background and routes keystrokes through vim.

##Bugs
- If you find a bug, please create a github issue.

- Pterosaur does not yet support google docs (Pentadactyl itself has problems with google docs. Pterosaur can use gmail and google search just fine.)

##Notes
- Pterosaur attempts to be unobtrusive, so even though it edits every non-password textbox with vim, it starts out in vim's insert mode and enters vim's select mode when you select text with the mouse. This allows you to use traditional firefox mouse behavior, while still being able to leave insert mode and use anything you want from vim.

##Mac OSX notes
- Pterosaur requires XQuartz to function on OSX. *(This is a requirement of vim's +clientserver functionality.)*
- Pterosaur will **not** work with MacVim. You need to install a standard vim program with +clientserver using MacPorts or Homebrew.

##Troubleshooting
Pterosaur should "just work", but if it doesn't:

1. Make sure you are running master. It is the stable version.

2. Make sure you have `:set fullvim` in pentadactyl and have vimbed installed.

3. Run `:!vim --version | grep server` from INSIDE pentadactyl. Make sure it shows +clientserver.

4. Run firefox from a terminal and type `:set pterosaurdebug` into pentadactyl. This will display the background vim process in the terminal window.

5. Run `vim --serverlist`. If you have vim running but you don't see a server starting with `PTEROSAUR_`, your vim's +clientserver probably isn't working. If you're on a mac, you probably need XQuartz.

6. If there's still a problem, create an issue.

##Hacking/Contributing
- One of the best ways to contribute is to report bugs in the issues section.

- You can also submit patches to fix issues. Find an issue that isn't assigned and let me know you're working on it.

##License
AGPL v3
