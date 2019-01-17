# webhint's website

<!-- markdownlint-disable -->
[![Build Status](https://dev.azure.com/webhint/webhint/_apis/build/status/webhintio.webhint.io?branchName=master)](https://dev.azure.com/webhint/webhint/_build/latest?definitionId=2?branchName=master) [![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fwebhintio%2Fwebhint.io.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fwebhintio%2Fwebhint.io?ref=badge_shield)
<!-- markdownlint-enable -->

This is the code for [webhint's website](https://webhint.io).
Most of the documentation though is in the main [webhint
repo](https://github.com/webhintio/hint).

## Getting started

_**Note:**_ Our builder uses async arrow functions as well as other ES2017
features so please ensure you are using Node.js v8.x or higher.

Clone the project:

``` bash
git clone https://github.com/webhintio/hint.git
```

Install dependencies:

```bash
npm install
```

Fetch remote content (e.g. documentation)

```bash
npm run update-content
```

Build the site:

```bash
npm run build
```

Run server:

```bash
npm start
```

To know more about the internals of the site please read the
[server](architecture/server.md) documentation.

## Code of Conduct

This project adheres to the [JS Foundation's code of
conduct](https://js.foundation/community/code-of-conduct).

By participating in this project you agree to abide by its terms.

## License

The code is available under the [Apache 2.0 license](LICENSE.txt).

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fwebhintio%2Fwebhint.io.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fwebhintio%2Fwebhint.io?ref=badge_large)
