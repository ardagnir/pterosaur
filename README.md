Pterosaur
=========

Pterosaur gives you the full power of Vim in each Firefox text field.

![Demo](/pterosaur_demo.gif?raw=true)


##Requirements
- Pterosaur requires [Pentadactyl](http://5digits.org/pentadactyl/) and [Vim](http://www.vim.org)(your version needs to have +clientserver).
- Pterosaur works best in GNU/Linux.
- Pterosaur also works in OSX, but doing so requires XQuartz. *(This is a requirement of vim's +clientserver functionality.)*

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

- The stable version of Pterosaur supports standard textareas and inputs (most of the web uses these), but not other editable fields like contenteditable, designmode, or various js editors. Progress on this is being tracked in the issues section.

##Notes
- Pterosaur attempts to be unobtrusive, so even though it edits every non-password textbox with vim, it starts out in vim's insert mode and enters vim's select mode when you select text with the mouse. This allows you to use traditional firefox mouse behavior, while still being able to leave insert mode and use anything you want from vim.

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
