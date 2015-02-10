pterosaur.xpi: chrome.manifest install.rdf content/minidactyl.jsm content/subprocess_worker_unix.js content/subprocess.jsm content/pterosaur.js bootstrap.js content/vimbed/plugin/vimbed.vim
	git submodule update
	zip pterosaur.xpi chrome.manifest install.rdf content/minidactyl.jsm content/subprocess_worker_unix.js content/subprocess.jsm content/pterosaur.js content/pterosaur.png bootstrap.js content/vimbed/plugin/vimbed.vim

content/vimbed/plugin/vimbed.vim:
	git submodule update --init

install:
	firefox pterosaur.xpi

clean:
	rm pterosaur.xpi
