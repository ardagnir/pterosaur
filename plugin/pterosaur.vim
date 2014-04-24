" This is part of Pterosaur
"
" Copyright (C) 2014, James Kolb <jck1089@gmail.com>
"
" This program is free software: you can redistribute it and/or modify
" it under the terms of the GNU Affero General Public License as published by
" the Free Software Foundation, either version 3 of the License, or
" (at your option) any later version.
" 
" This program is distributed in the hope that it will be useful,
" but WITHOUT ANY WARRANTY; without even the implied warranty of
" MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
" GNU Affero General Public License for more details.
" 
" You should have received a copy of the GNU Affero General Public License
" along with this program.  If not, see <http://www.gnu.org/licenses/>.

let g:save_cpo = &cpo
set cpo&vim
if exists("g:loaded_pterosaur")
  finish
endif

let s:fromCommand = 0
let s:vim_mode = "n"

function! LoseTextbox()
  ElGroup pterosaur!
  bd
endfunction

function! FocusTextbox(line, column)
  exec "edit! ".s:file

  call cursor(a:line, a:column)

  if mode()=="n" || mode()=="v" || mode()=="V"
    call feedkeys("\<ESC>i",'n')
  endif

  call system("echo '' > ".s:metaFile)

  ElGroup pterosaur
    ElSetting timer 4
    ElCmd call CheckConsole()
    ElCmd call OutputMessages()
  ElGroup END
endfunction

function! SetupPterosaur(file, metaFile, messageFile)
  set autoread
  set noswapfile
  set shortmess+=A

  augroup Pterosaur
    sil autocmd!
    sil autocmd FileChangedShell * echon ''
    sil autocmd TextChanged * call VerySilent("write!")

    "Adding text in insert mode calls this, but not TextChangedI
    sil autocmd CursorMovedI * call VerySilent("write!")
    sil exec "autocmd CursorMoved * call <SID>WriteMetaFile('".a:metaFile."', 0)"
    sil exec "autocmd CursorMovedI * call <SID>WriteMetaFile('".a:metaFile."', 0)"

    sil exec "autocmd InsertEnter * call <SID>WriteMetaFile('".a:metaFile."', 1)"
    sil exec "autocmd InsertLeave * call <SID>WriteMetaFile('".a:metaFile."', 0)"
    sil exec "autocmd InsertChange * call <SID>WriteMetaFile('".a:metaFile."', 1)"
  augroup END

  try
    ElGroup! pterosaur

    ElGroup pterosaur
      ElSetting timer 4
      ElCmd call CheckConsole()
      ElCmd call OutputMessages()
    ElGroup END
  catch
    call system('echo e > '.a:metaFile)
    call system('echo Pterosaur requires eventloop.vim to read the VIM commandline. >> '.a:metaFile)
  endtry

  let s:file = a:file
  let s:metaFile = a:metaFile
  let s:messageFile = a:messageFile
endfunction

function! s:GetByteNum(pos)
    return col(a:pos)+line2byte(line(a:pos))-1 
endfunction

let s:lastPos = 0

function! s:WriteMetaFile(fileName, checkInsert)
  if a:checkInsert
    let s:vim_mode = v:insertmode
  else
    let s:vim_mode = mode()
  endif

  call system('echo '.s:vim_mode.' > '.a:fileName)

  let pos = s:GetByteNum('.')
  if s:vim_mode ==# 'v'
    call system('echo -e "'.(min([pos,s:lastPos])-1)."\\n".max([pos,s:lastPos]).'" >> '.a:fileName)
  elseif s:vim_mode ==# 'V'
    let start = line2byte(byte2line(min([pos,s:lastPos])))
    let end = line2byte(byte2line(max([pos,s:lastPos]))+1)
    call system('echo -e "'.start."\\n".end.'" >> '.a:fileName)
  elseif (s:vim_mode == 'n' || s:vim_mode == 'R') && getline('.')!=''
    call system('echo -e "'.(pos-1)."\\n".pos.'" >> '.a:fileName)
    let s:lastPos = pos
  else
    call system('echo -e "'.(pos-1)."\\n".(pos-1).'" >> '.a:fileName)
    let s:lastPos = pos
  endif
endfunction

function s:BetterShellEscape(text)
  let returnVal = shellescape(a:text, 1)
  let returnVal = substitute(returnVal, '\\%', '%', 'g')
  let returnVal = substitute(returnVal, '\\#', '#', 'g')
  return returnVal
endfunction

function! CheckConsole()
    let tempMode = mode()
    if tempMode == "c"
      call system('echo c > '.s:metaFile)
      call system('echo '.s:BetterShellEscape(getcmdtype().getcmdline()).' >> '.s:metaFile)
      if s:fromCommand == 0
        ElGroup pterosaur
          ElSetting timer 2
        ElGroup END
      endif
      let s:fromCommand = 1
    else
      if s:fromCommand
        let s:fromCommand = 0
        ElGroup pterosaur
          ElSetting timer 4
        ElGroup END
      endif
      if tempMode != s:vim_mode
        call s:WriteMetaFile(s:metaFile, 0)
      endif
    endif
endfunction

"Don't even redirect the output
function! VerySilent(args)
  redir END
  silent exec a:args
  exec "redir! >> ".s:messageFile
endfunction

"This repeatedly flushes because messages aren't written until the redir ends.
function! OutputMessages()
  redir END
  exec "redir! >> ".s:messageFile
endfunction

let g:loaded_pterosaur = 1

let &cpo = g:save_cpo
unlet g:save_cpo
