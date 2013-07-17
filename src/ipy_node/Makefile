GENERATED_FILES = \
	ipy_node.js 

all: $(GENERATED_FILES)

copy_ipycli:
	@cp $(IPYTHON_DIR)/namespace.js src/ipycli/
	@cp $(IPYTHON_DIR)/utils.js src/ipycli/
	@cp $(IPYTHON_DIR)/kernel.js src/ipycli/

ipy_node.js: $(shell smash --list src/ipy_node.js)
	@rm -f $@
	smash src/ipy_node.js  > $@
	@node ./startup.js >> $@
