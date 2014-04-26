Pterosaur
=========

Pterosaur is a Pentadactyl/Vim extension that gives you the full power of Vim in each Firefox text field.

![Demo](/pterosaur_demo.gif?raw=true)

Pterosaur is at an alpha stage right now. It is already useful if you do a lot of typing on your browser, but it isn't completely stable yet.


##Requirements
- Pterosaur requires Pentadactyl and Vim(your version needs to have +clientserver).
- Pterosaur requires [eventloop.vim](https://github.com/ardagnir/eventloop.vim)
- Pterosaur assumes you are using Linux. It might work on OS X.

##Setup
**Step 1:** Install pterosaur and eventloop.vim using your Vim plugin-manager. For pathogen-compatible managers:

    cd ~/.vim/bundle
    git clone http://github.com/ardagnir/eventloop.vim
    git clone http://github.com/ardagnir/pterosaur
    
**Step 2:** Add pterosaur.js to ~/.pentadactyl/plugins/

    mkdir ~/.pentadactyl/plugins
    cd ~/.pentadactyl/plugins
    ln -s ~/.vim/bundle/pterosaur/pterosaur.js pterosaur.js

**Step 3:** Pterosaur's full-vim editing is disabled by default. Type `:set fullvim` in firefox to enable it.

##How it works
Pterosaur runs an actual vim instance in the background and routes keystrokes through vim.

##Bugs
( If you find a bug that isn't listed here, please create a github issue. )

- Some editors (like github outside of zen-mode) do weird things with text that make text manipulation difficult and mess up pterosaur. I still need to find a good solution for this. 
- Pterosaur's modeline isn't accurate in visual or selection mode.
- If you click on the end of a textbox while in normal mode, the cursor will look like it is placed correctly, but will actually be placed one character too early.

##Troubleshooting
- If you can't enter text in fullvim mode, type `vim --serverlist` in your commandline. You should see a `PTEROSAUR` server. If you don't, you probably don't have support for vim servers (check `vim --version | grep server`) or pterosaur doesn't think firefox is running. If you do see it, either pterosaur isn't able to communicate with vim, or you're using a text-field that can't handle pterosaur (most search engines, including duckduckgo, start-page, and google search CAN handle pterosaur, so they make good tests).
- If `:set usevim` doesn't even work in pentadactyl, there's a problem on the pentadactyl side. Type `:messages` in pentadactyl and it should tell you the error.

##License
AGPL v3
