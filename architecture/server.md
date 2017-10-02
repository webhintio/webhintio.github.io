# server

## Project architecture

The website users [`Hexo`][hexo] to generate the static content and a
`Node.js` backend to handle the dynamic parts. The template system is
[`Handlebars`][handlebars] so sharing code between static and dynamic
is easier. The template is under `/src/hexo/themes/documentation/layout/`.

If you are running the `node` backend locally (`/src/server/index.js`)
all the requests will be handled by it, even the static ones. This is
not the case in production.

Dynamic routes are defined under `/src/server/routes/`. Currently only
the search results and scanner are dynamic. Basically, each file is a
`node` module that exports a function that receives an `express` object
does all the required configuration:

```js
const configure = (app) => {
    app.get('/custompath', (req, res) => {
        res.render('customtemplate');
    });
};

module.exports = configure;
```

To add a new route, create a new module in that folder and then
`require` it in `index.js#configureRoutes`:

```js
const configureRoutes = (app) => {
    require('./routes/scanner.js')(app);
    require('./routes/search.js')(app);
};
```

## Site content and search

Most of the site's content comes from the [`sonar`][sonar] project and
its documentation. The markdown of that project is copied directly into
the `/docs` folder. When the site is built, the markdown is transformed
into `html` using a custom `hexo` template into the `/dist` folder,
among other static resources.

The content of the live site is updated each time a change is made in the:

* `sonarwhal.com` repository
* `/docs` directory and/or to the `CHANGELOG.md` file from the `sonar`
  repository

To achieve the latter, `sonar` has the [`trigger-site-update.sh`]
[trigger-update] script that triggers a build on `sonarwhal.com` if the
previous conditions are met.

The search on the website uses [Algolia][algolia]. The search index is
updated each time there is a deployment.

## Site deployment

The deployment process is fully automated:

1. `master` branch build is triggered in [Travis][travis] (e.g. by code
   or documentation change).
1. build passes and executes [`.travis/update-site.sh`][site-update].
   This script will copy the required files for the deployment to the
   `website` branch.
1. Azure App Service is configured for [continuous deployment][cd] from
   a GitHub source. Once it receives the notification the content is
   automatically downloaded and published.

## Production configuration

Currently the website is deployed into an Azure App Service using IIS,
IISNode, and `node`.

The way IIS handles the requests is as follows:

* static resources are handled directly by IIS
* dynamic routes (such as `/search` and `/scanner`) are routed to `node`

This is configured in the `web.config` file in the rules section:

```xml
<rule name="static">
    <match url="(?!scanner|search).*$" ignoreCase="true"/>
    <action type="Rewrite" url="dist{REQUEST_URI}"/>
</rule>
<rule name="ScannerAndSearch" stopProcessing="true">
    <match url="(?:scanner|search)(.*)$" ignoreCase="true"/>
    <conditions>
        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
    </conditions>
    <action type="Rewrite" url="src/server/index.js"/>
</rule>
```

### SSL Certificate

[`sonarwhal.com`][sonarwhal] uses a [Let's Encrypt][letsencrypt]
certificate installed using [Let's Encrypt site extension][siteextension].
It gets renewed automatically before it's expiration date. The [official
installation guide][letsencrypt install] was used to configure everything.

During the renovation of the certificate, the extension needs to write
a specific value into the `.well-known` folder. To make this folder
accessible we use the following rule in `web.config`:

```xml
<rule name="wellknown" stopProcessing="true">
    <match url="^\.well-known.*" />
    <action type="Rewrite" url="{REQUEST_URI}"/>
</rule>
```

A valid certificate needs to be in place for the renewal to work.
Otherwise you will have to disable the `https` redirect.

### HTTPS only

[`sonarwhal.com`][sonarwhal] is an `https` only website. The redirects
happens in the following `web.config` rule:

```xml
<rule name="Redirect to https" stopProcessing="true">
    <match url="(.*)"/>
    <conditions>
        <add input="{HTTPS}" pattern="off" ignoreCase="true"/>
        <add input="{WARMUP_REQUEST}" pattern="1" negate="true" />
        <add input="{REQUEST_URI}" pattern="/api/version/" negate="true" />
    </conditions>
    <action type="Redirect" url="https://{HTTP_HOST}{REQUEST_URI}" redirectType="Permanent" appendQueryString="true"/>
</rule>
```

**Note:** If for whatever reason the certificate expires this rule will
have to be commented out until a new one is in place.

### Custom error page

IIS manages the custom error page via the following entries in `web.config`:

```xml
<system.webServer>
    <httpErrors errorMode="Custom" defaultResponseMode="ExecuteURL">
        <remove statusCode="404" subStatusCode="-1"/>
        <error statusCode="404" path="/dist/404.html" responseMode="ExecuteURL"/>
    </httpErrors>
</system.webServer>
<system.web>
    <customErrors mode="RemoteOnly" defaultRedirect="/dist/404.html" redirectMode="ResponseRewrite"/>
</system.web>
```

[algolia]: https://www.algolia.com
[cd]: https://docs.microsoft.com/en-us/azure/app-service/app-service-continuous-deployment
[handlebars]: https://handlebarsjs.com
[hexo]: https://hexo.io
[letsencrypt install]: https://github.com/sjkp/letsencrypt-siteextension/wiki/How-to-install
[letsencrypt]: https://letsencrypt.org
[site-update]: https://github.com/sonarwhal/sonarwhal.com/blob/272a59c150a6462d4047bdc63019c339fcfaead0/.travis/update-site.sh
[siteextenstion]: https://github.com/sjkp/letsencrypt-siteextension
[sonar]: https://github.com/sonarwhal/sonar
[sonarwhal]: https://sonarwhal.com
[travis]: https://travis-ci.org/sonarwhal/sonarwhal.com
[trigger-update]: https://github.com/sonarwhal/sonar/blob/0cfb1bb49c847eb4d5ed54691dbb88cb796694bf/.travis/trigger-site-update.sh
