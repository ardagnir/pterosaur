Pterosaur
=========

Pterosaur is a Pentadactyl extension that gives you the full power of Vim in each Firefox text field.

It's at more of an alpha/proof-of-concept stage right now, but it'll be really useful soon.

##Installation
Add pterosaur.js to ~/.pentadactyl/plugins/

##Requirements
- Pterosaur requires pentadactyl, obviously.
- Pterosaur assumes you are using Linux. It might work on OS X.

##Setup
Pterosaur's full-vim editing is disabled by default. Type `:set fullVim` in pentadactyl to enable it.

Your default vim setup will need a mapping to get out of vim's insert mode, since <ESC> is handled by pentadactyl.
If you haven't set up something like `inoremap kj <ESC>`, you might want to consider it. This mappping alone will change your life.

##How it works
Pterosaur runs an actual vim instance in the background and routes keystrokes through vim.

##Bugs
- Slow
- No mouse support
- Users can't see the selection from Vim's visual mode.
- Users can't see Vim's command mode.
- The cursor disapears if on an empty line in normal mode.
- Doesn't cleanup spawned processes
- Password text-fields are still sent to Vim.

##License
AGPL v3
