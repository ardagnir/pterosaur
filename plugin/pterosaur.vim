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

function! SwitchPterosaurFile(line, column, file, metaFile)
  augroup Pterosaur
    sil autocmd!
    sil autocmd FileChangedShell * echon ''
    sil autocmd TextChanged * write!

    "Adding text in insert mode calls this, but not TextChangedI
    sil autocmd CursorMovedI * write!
    sil exec "autocmd CursorMoved * call <SID>WriteMetaFile('".a:metaFile."', 0)"
    sil exec "autocmd CursorMovedI * call <SID>WriteMetaFile('".a:metaFile."', 0)"

    sil exec "autocmd InsertEnter * call <SID>WriteMetaFile('".a:metaFile."', 1)"
    sil exec "autocmd InsertLeave * call <SID>WriteMetaFile('".a:metaFile."', 0)"
    sil exec "autocmd InsertChange * call <SID>WriteMetaFile('".a:metaFile."', 1)"
  augroup END
  bd!

  sil exec "edit! "a:file
  call cursor(a:line, a:column)

  if mode()=="n" || mode()=="v" || mode()=="V"
    call feedkeys("\<ESC>i",'n')
  endif

endfunction

function! s:GetByteNum(pos)
    return col(a:pos)+line2byte(line(a:pos))-1 
endfunction

let s:lastPos = 0

function! s:WriteMetaFile(fileName, checkInsert)
  if a:checkInsert
    let vim_mode = v:insertmode
  else
    let vim_mode = mode()
  endif

  sil exec '!echo '.vim_mode.' > '.a:fileName

  let pos = s:GetByteNum('.')
  if  vim_mode ==# 'v'
    sil exec '!echo -e "'.(min([pos,s:lastPos])-1)."\\n".max([pos,s:lastPos]).'" >> '.a:fileName
  elseif vim_mode ==# 'V'
    let start = line2byte(byte2line(min([pos,s:lastPos])))
    let end = line2byte(byte2line(max([pos,s:lastPos]))+1)
    sil exec '!echo -e "'.start."\\n".end.'" >> '.a:fileName
  elseif (vim_mode == 'n' || vim_mode == 'R') && getline('.')!=''
    sil exec '!echo -e "'.(pos-1)."\\n".pos.'" >> '.a:fileName
    let s:lastPos = pos
  else
    sil exec '!echo -e "'.(pos-1)."\\n".(pos-1).'" >> '.a:fileName
    let s:lastPos = pos
  endif
endfunction

let &cpo = g:save_cpo
unlet g:save_cpo
