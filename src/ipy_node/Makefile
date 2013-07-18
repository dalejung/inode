GENERATED_FILES = \
	ipy_node.js 

all: $(GENERATED_FILES)

copy_ipycli:
	@cat $(IPYTHON_DIR)/namespace.js > lib/ipython-browser.js
	@cat $(IPYTHON_DIR)/utils.js >> lib/ipython-browser.js
	@cat $(IPYTHON_DIR)/kernel.js >> lib/ipython-browser.js

browserify:
	@browserify --ig -t brfs index-browserify.js > ipy_node.js
