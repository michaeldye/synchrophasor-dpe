SHELL := /bin/bash
# N.B. this is for compat only, we want to use uname -m instead
ARCH = $(shell tools/arch-tag)

VERSION = $(shell cat VERSION)

EXECUTABLE = $(shell basename $$PWD)
PKGS=$(shell go list ./... | gawk '$$1 !~ /vendor\// {print $$1}')

DOCKER_IMAGE = "summit.hovitos.engineering/$(ARCH)/$(EXECUTABLE)"
DOCKER_TAG = "$(VERSION)"

COMPILE_ARGS := CGO_ENABLED=0
# TODO: handle other ARM architectures on build boxes too
ifeq ($(ARCH),armv7l)
	COMPILE_ARGS +=  GOARCH=arm GOARM=7
endif

all: $(EXECUTABLE)

# will always run b/c deps target is PHONY
$(EXECUTABLE): $(shell find . -name '*.go' -not -path './vendor/*') proto
	$(COMPILE_ARGS) go build -o $(EXECUTABLE)

clean:
	find ./vendor -maxdepth 1 -not -path ./vendor -and -not -iname "vendor.json" -print0 | xargs -0 rm -Rf
	-cd $(GOPATH)/src/github.com/michaeldye/synchrophasor-proto && \
		make clean
	rm -f $(EXECUTABLE)
	rm -f Dockerfile-exec
	-docker rmi $(DOCKER_IMAGE):{$(DOCKER_TAG),latest}

deps: $(GOPATH)/bin/govendor
	govendor sync

# bail if there are uncommitted changes (note: this doesn't know about or check untracked, uncommitted files)
dirty:
	@echo "Checking if your local repository or index have uncommitted changes..."
	git diff-index --quiet HEAD

$(GOPATH)/bin/govendor:
	go get -u github.com/kardianos/govendor

Dockerfile-exec:
	tools/Dockerfile-render $(ARCH) "Dockerfile-exec.tmpl"

# this just naively builds an execution container
docker: $(EXECUTABLE) Dockerfile-exec
	docker build --rm --no-cache -f Dockerfile-exec -t $(DOCKER_IMAGE):$(DOCKER_TAG) .
	docker tag $(DOCKER_IMAGE):$(DOCKER_TAG) $(DOCKER_IMAGE):latest

docker-push: docker
	docker push $(DOCKER_IMAGE):$(DOCKER_TAG)
	docker push $(DOCKER_IMAGE):latest

install: $(EXECUTABLE)

lint:
	-golint ./... | grep -v "vendor/"
	-go vet ./... 2>&1 | grep -vP "exit\ status|vendor/"

# only unit tests
test: all
	go test -v -cover $(PKGS)

test-integration: all
	go test -v -cover -tags=integration $(PKGS)

publish: dirty clean test test-integration docker-push
	git tag $(VERSION) -f
	git push -f --tags canonical master

proto: deps
	# we do this here b/c govendor doesn't fetch non-go files without special handling
	cd $(GOPATH)/src/github.com/michaeldye/synchrophasor-proto && \
		make

.PHONY: clean deps docker install lint publish proto test test-integration
