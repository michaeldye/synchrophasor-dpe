# synchrophasor-dpe

A Data Processing Engine (DPE) for ingesting

### Example native invocation

    synchrophasor-dpe -logtostderr -v 5

### Example Docker container invocation

    docker run --rm --name synchrophasor-dpe -p 127.0.0.1:8080:8080/tcp -p 127.0.0.1:9009:9009/tcp -t summit.hovitos.engineering/$(./tools/arch-tag)/synchrophasor-dpe:latest

## Related projects

 * `synchrophasor-proto` (https://github.com/michaeldye/synchrophasor-proto): The protocol specifications for all synchrophasor data projects
 * `synchrophasor-publisher` (https://github.com/michaeldye/synchrophasor-publisher): A client that connects to the `pmu-emu`s gRPC server, processes data it gathers, and then publishes it to a gRPC ingest Data Processing Engine (DPE), an instances of `synchrophasor-dpe`
 * `pmu-emu` (https://github.com/michaeldye/pmu-emu): A Power Management Unit (PMU) Emulator

## Development

### Environment setup

 * Install `make`
 * Install Golang v.1.7.x or newer, set up an appropriate `$GOPATH`, etc. (cf. https://golang.org/doc/install)
 * Install `protoc`, the Google protobuf compiler (cf. instructions at https://github.com/michaeldye/synchrophasor-proto)
 * Install Docker Community Edition version 17.04.0-ce or newer (cf. https://www.docker.com/community-edition#/download or use https://get.docker.com/)

## Building

### Considerations

This project requires that you build it from the proper place in your `$GOPATH`. Also note that it will automatically install `govendor` in your `$GOPATH` when executing `make deps`.

### Compiling the executable

    make

### Creating a Docker execution container

    make docker

## Publishing

This project include the make target `publish` that is intended to be executed after a PR has been merged. (Note: this scheme does not have a notion of producing staged development or integration builds, only publishing production stuff. There might be some utility in later producing a `publish-integration` target that is stamped appropriately).

  - Check for an uncommitted files, failing if any exist
  - Clean the project (`make clean`)
  - Build the project (`make all`)
  - Execute all tests (`make test test-integration`)
  - Build a docker container and push it to the repository (`make docker-push`)
  - If the above are successful, tag the `canonical` git repository with the current value in `VERSION`
