Pterosaur
=========

Pterosaur is a Pentadactyl/Vim extension that gives you the full power of Vim in each Firefox text field.

Pterosaur is at more of an alpha/proof-of-concept stage right now, but it's already somewhat useful.


##Requirements
- Pterosaur requires pentadactyl.
- Pterosaur assumes you are using Linux. It might work on OS X.

##Setup
**Step 1:** Install pterosaur using your vim plugin-manager. For pathogen-compatible managers:

    cd ~/.vim/bundle
    git clone http://github.com/ardagnir/pterosaur
    
**Step 2:** Add pterosaur.js to ~/.pentadactyl/plugins/

    mkdir ~/.pentadactyl/plugins
    cd ~/.pentadactyl/plugins
    ln -s ~/.vim/bundle/pterosaur.js pterosaur.js

**Step 3:** Pterosaur's full-vim editing is disabled by default. Type `:set fullVim` in firefox to enable it.

**Step 4:** Your default vim setup will need a mapping to get out of vim's insert mode, since \<ESC\> is handled by pentadactyl.
If you haven't set up something like `inoremap kj <ESC>`, you might want to consider it. This mappping alone will change your life.

##How it works
Pterosaur runs an actual vim instance in the background and routes keystrokes through vim.

##Bugs
- No mouse support
- Pterosaur sometimes eats the first key you enter into a textbox
- Password text-fields are still sent to Vim.
- Pterosaur always says --INSERT-- and only let's you know your vim mode through the cursor shape(block for normal, line for insert).
- Arrow keys don't work
- Typing /, :, or ? immediately after entering insert mode will confuse pterosaur.
- If you map another key to /, :, or ? in normal mode, pterosaur won't show you the ex command you are typing until you hit enter.

##License
AGPL v3
