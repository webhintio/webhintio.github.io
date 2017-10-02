# sonar website

<!-- markdownlint-disable -->
[![Build Status](https://travis-ci.org/sonarwhal/sonarwhal.com.svg?branch=master)](https://travis-ci.org/sonarwhal/sonarwhal.com) [![Greenkeeper badge](https://badges.greenkeeper.io/sonarwhal/sonarwhal.com.svg?ts=1493332136115)](https://greenkeeper.io/)
<!-- markdownlint-enable -->

This is the code for [sonar's website](https://sonarwhal.com).
Most of the documentation though is in the main
[sonar repo](https://github.com/sonarwhal/sonar/tree/master/docs).

## Getting started

_**Note:**_ Our builder uses async arrow functions as well as other ES2017
features so please ensure you are using Node.js v8.x or higher.

Clone the project:

``` bash
git clone https://github.com/sonarwhal/sonarwhal.com.git
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
