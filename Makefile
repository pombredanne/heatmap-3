install:
	npm install

xpi: install
	jpm xpi

lint:
	node_modules/.bin/eslint 'lib/**' 'data/**'

run:
	jpm -b /Applications/FirefoxDeveloperEdition.app/Contents/MacOS/firefox run

.PHONY = install
