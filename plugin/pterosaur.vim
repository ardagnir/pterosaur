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
endfunction

"Replacement for 'edit! s:file' that is undo joined (and doesn't leave the
"scratch buffer)
function! UndoJoinedEdit()
  undojoin | normal! gg"_dG
  undojoin | exec "read ".s:file
  undojoin | normal! k"_dd
endfunction

function! UpdateTextbox(lineStart, columnStart, lineEnd, columnEnd)
  call s:VerySilent("call UndoJoinedEdit()")
  call cursor(a:lineStart, a:columnStart)
  call system("echo '' > ".s:metaFile)
  let s:vim_mode=''
endfunction

function! FocusTextbox(lineStart, columnStart, lineEnd, columnEnd)
  call s:VerySilent("call UndoJoinedEdit()")

  if a:lineStart==a:lineEnd && a:columnStart==a:columnEnd
    call cursor(a:lineStart, a:columnStart)

    if mode()=="n" || mode()=="v" || mode()=="V" || mode()=="s" || mode()=="S"
      if a:columnStart<len(line('.'))+1
        call feedkeys("\<ESC>i\<C-G>u",'n')
      else
        call feedkeys("\<ESC>a\<C-G>u",'n')
      endif
    else
        call feedkeys("\<C-G>u",'n')
    endif
  else
    call cursor(a:lineStart, a:columnStart+1)
    "normal! v
    call feedkeys ("\<ESC>0",'n')
    if a:columnStart>1
      call feedkeys ((a:columnStart-1)."l",'n')
    endif
    call feedkeys("\<ESC>v",'n')
    if a:columnEnd-a:columnStart > 1
      call feedkeys((a:columnEnd-a:columnStart-1)."l",'n')
    elseif a:columnStart-a:columnEnd > -1
      call feedkeys((a:columnStart-a:columnEnd+1)."k",'n')
    endif
    if a:lineEnd-a:lineStart > 0
      call feedkeys((a:LineEnd-a:LineStart)."j",'n')
    "call cursor(a:lineEnd, a:columnEnd)
    endif
    call feedkeys("\<C-G>",'n')
  endif

  call system("echo '' > ".s:metaFile)
  let s:vim_mode=''

  ElGroup pterosaur
    ElSetting timer 2
    ElCmd call CheckConsole()
    ElCmd call OutputMessages()
  ElGroup END
endfunction

function! SetupPterosaur()
  set buftype=nofile
  set bufhidden=hide
  set noswapfile
  set shortmess+=A
  set noshowmode
  snoremap <bs> <C-G>c

  let s:file = "/tmp/shadowvim/".tolower(v:servername)."/contents.txt"
  let s:metaFile = "/tmp/shadowvim/".tolower(v:servername)."/meta.txt"
  let s:messageFile = "/tmp/shadowvim/".tolower(v:servername)."/messages.txt"

  augroup Pterosaur
    sil autocmd!
    sil autocmd FileChangedShell * echon ''

    "I'm piping through cat, because write! can still trigger vim's
    "clippy-style 'are you sure?' messages.
    sil exec "sil autocmd TextChanged * call <SID>VerySilent('write !cat >".s:file."')"

    "Adding text in insert mode calls this, but not TextChangedI
    sil exec "sil autocmd CursorMovedI * call <SID>VerySilent('write !cat >".s:file."')"

    sil exec "autocmd CursorMoved * call <SID>WriteMetaFile('".s:metaFile."', 0)"
    sil exec "autocmd CursorMovedI * call <SID>WriteMetaFile('".s:metaFile."', 0)"

    sil exec "autocmd InsertEnter * call <SID>WriteMetaFile('".s:metaFile."', 1)"
    sil exec "autocmd InsertLeave * call <SID>WriteMetaFile('".s:metaFile."', 0)"
    sil exec "autocmd InsertChange * call <SID>WriteMetaFile('".s:metaFile."', 1)"
  augroup END

  try
    ElGroup! pterosaur

    ElGroup pterosaur
      ElSetting timer 2
      ElCmd call CheckConsole()
      ElCmd call OutputMessages()
    ElGroup END
  catch
    call system('echo -e "e\nPterosaur requires eventloop.vim to read the VIM commandline. > '.s:metaFile)
  endtry

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

  let line1 = s:vim_mode."\\n"

  let pos = s:GetByteNum('.')
  if s:vim_mode ==# 'v' || s:vim_mode ==# 's'
    let line2 = (min([pos,s:lastPos])-1).",".col('.').",".line('.')."\\n"
    let line3 = max([pos,s:lastPos]).",".col('.').",".line('.')."\\n"
    call system('echo -e "'.line1.line2.line3.'" > '.a:fileName)
  elseif s:vim_mode ==# 'V' || s:vim_mode ==# 'S'
    let line2 = (line2byte(byte2line(min([pos,s:lastPos])))-1).",".col('.').",".line('.')."\\n"
    let line3 = (line2byte(byte2line(max([pos,s:lastPos]))+1)-1).",".col('.').",".line('.')."\\n"
    call system('echo -e "'.line1.line2.line3.'" > '.a:fileName)
  elseif (s:vim_mode == 'n' || s:vim_mode == 'r') && getline('.')!=''
    let line2 = (pos-1).",".col('.').",".line('.')."\\n"
    let line3 = pos.",".(col('.')+1).",".line('.')."\\n"
    call system('echo -e "'.line1.line2.line3.'" > '.a:fileName)
    let s:lastPos = pos
  else
    let line2 = (pos-1).",".col('.').",".line('.')."\\n"
    let line3 = line2
    call system('echo -e "'.line1.line2.line3.'" > '.a:fileName)
    let s:lastPos = pos
  endif
endfunction

function s:BetterShellEscape(text)
  let returnVal = shellescape(a:text, 1)
  let returnVal = substitute(returnVal, '\\%', '%', 'g')
  let returnVal = substitute(returnVal, '\\#', '#', 'g')
  let returnVal = substitute(returnVal, '\\!', '!', 'g')
  return returnVal
endfunction

function! CheckConsole()
    let tempMode = mode()
    if tempMode == "c"
      call system('echo c > '.s:metaFile)
      call system('echo '.s:BetterShellEscape(getcmdtype().getcmdline()).' >> '.s:metaFile)
      let s:vim_mode="c"
      if s:fromCommand == 0
        ElGroup pterosaur
          "Same as 2 right now. This is for once eventloop can handle shorter time periods.
          ElSetting timer 1
        ElGroup END
      endif
      let s:fromCommand = 1
    else
      if s:fromCommand
        let s:fromCommand = 0
        ElGroup pterosaur
          ElSetting timer 2
        ElGroup END
      endif
      if tempMode != s:vim_mode
        call s:WriteMetaFile(s:metaFile, 0)
      endif
    endif
endfunction

"Don't even redirect the output
function! s:VerySilent(args)
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
