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

**Step 4:** Your default vim setup will need a mapping to get out of vim's insert mode, since \<ESC\> is handled by pentadactyl (and currently broken).
If you haven't set up something like `inoremap kj <ESC>`, you might want to consider it. This mappping alone will change your life.

##How it works
Pterosaur runs an actual vim instance in the background and routes keystrokes through vim.

##Bugs
- No mouse support
- Escape leaves textboxes while in insert mode, but does nothing in normal mode.
- Pterosaur sometimes eats the first key you enter into a textbox
- Password text-fields are still sent to Vim.
- Some editors (like github outside of zen-mode) do weird things with text that break pterasaur. Pterosaur needs to be changed so that it falls through to normal editing in these cases.
- If you map another key to /, :, or ? in vim's normal mode, pterosaur won't show you the ex command you are typing until you hit enter.

##License
AGPL v3
(I'm considering changing this)
