.PHONY: check build test
check: build test
	python3 -m unittest discover -s tests -p 'test_*.py' -v
	git diff --check
build:
	npm run build
test:
	node --test tests/model.test.js
