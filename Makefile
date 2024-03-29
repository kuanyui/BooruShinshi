.PHONY: dev build xpi xpi-server clear zip-repo icon deploy test

NAME="BooruShinshi"
BIN:="node_modules/.bin"
XPI_DIR=../xpi

icon:
	convert -background transparent -geometry 256x256 img/icon.svg img/icon.png

watch: clear
	${BIN}/webpack --mode=development --watch


build: clear
	${BIN}/webpack --mode=production

test:
	clear
	${BIN}/mocha --require ts-node/register test/*.ts --exit


xpi-for-development: clear
	${BIN}/webpack --mode=development
	mkdir -p ${XPI_DIR}
	zip -r -FS "${XPI_DIR}/${NAME}_DEVELOPMENT.xpi" dist/ img/ manifest.json README.org

xpi: clear build
	mkdir -p ${XPI_DIR}
	zip -r -FS "${XPI_DIR}/${NAME}.xpi" dist/ img/ manifest.json README.org

xpi-server: clear xpi
	ifconfig | grep "inet " | grep --invert-match '127.0.0.1'
	cd ${XPI_DIR}; python3 -m http.server 8888

clear:
	rm -rf dist/*

zip-repo: clear
	zip -r "../${NAME}-upload.zip" .    -x * node_modules/\*

deploy: zip-repo xpi
	@echo "Done!"

update-readme-screenshot:
	${BIN}/ts-node -P ./tsconfig.json ./script/update-readme-screenshot.ts