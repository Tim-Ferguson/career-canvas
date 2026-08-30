.PHONY: check build test
check:
	npm run check
	git diff --check
build:
	npm run build
test:
	npm run test
