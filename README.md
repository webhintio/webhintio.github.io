# webhint's website

<!-- markdownlint-disable -->
[![Build Status](https://travis-ci.org/webhintio/webhint.io.svg?branch=master)](https://travis-ci.org/webhintio/webhint.io) [![Greenkeeper badge](https://badges.greenkeeper.io/webhintio/webhint.io.svg)](https://greenkeeper.io/)
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
