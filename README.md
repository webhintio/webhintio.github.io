# webhint's website

<!-- markdownlint-disable -->
[![Build Status](https://dev.azure.com/webhint/webhint/_apis/build/status/webhintio.webhint.io?branchName=master)](https://dev.azure.com/webhint/webhint/_build/latest?definitionId=2?branchName=master) [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fwebhintio%2Fwebhint.io.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fwebhintio%2Fwebhint.io?ref=badge_shield)
<!-- markdownlint-enable -->

This is the code for [webhint's website](https://webhint.io).
Most of the documentation though is in the main [webhint
repo](https://github.com/webhintio/hint).

## Getting started

Clone the project:

``` bash
git clone https://github.com/webhintio/webhint.io.git
```

Install dependencies:

```bash
npm install
```

Build the site:

```bash
npm run build
```

The command above will pull all the documentation and generate all the required
assets. It might take a bit so please be patient.

Run the site:

```bash
npm start
```

This will start a local web server in port 4000.

To know more about the internals of the site please read the
[server](architecture/server.md) documentation.

## Code of Conduct

This project adheres to the [JS Foundation's code of
conduct](https://js.foundation/community/code-of-conduct).

By participating in this project you agree to abide by its terms.

## License

The code is available under the [Apache 2.0 license](LICENSE.txt).

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fwebhintio%2Fwebhint.io.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fwebhintio%2Fwebhint.io?ref=badge_large)
