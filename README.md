# Loopback ORM plus Swagger

Use this module to get a minimal Loopback -style server up that includes the OpenAPI 2.0 endpoints
and optionally the explorer interface.

## Usage

```sh
npm install express cors loopback@3 loopback-orm-swagger
# optional, depending on needs
npm install loopback-component-explorer loopback-ds-timestamp-mixin loopback-connector-mongodb
```

```js
const express = require('express');
const cors = require('cors');
const loopback = require('loopback');
const explorer = require('loopback-component-explorer');
const orm = require('loopback-orm-swagger');
const path = require('path');

let app = loopback();

app.use(cors());
app.use(express.json({
  limit: "50mb"
}));
app.use(express.urlencoded({
  limit: "1mb",
  extended: true,
  parameterLimit: 50000
}));

app.use('/api', loopback.rest());

orm(app, {
  modelsPath: path.resolve("./common/models"),
  modelConfig: {
    ServerMessage: {
      dataSource:: "db",
      public: true
    },
    Organization: {
      dataSource: "db",
      public: true
    },
  },
  dataSources: {
    db: {
      name: "db",
      connector: "mongodb",
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 45000,
      connectTimeoutMS: 45000,
      allowExtendedOperators: true,
      disableDefaultSort: true, // this is supposed to help performance on indexed column searches
    }
  },
  mixins: {
    TimeStamp: require(path.resolve('./node_modules/loopback-ds-timestamp-mixin/time-stamp')), // TimeStamp mixin if you're using it
    GlobalBeforeRemote: () => {}, // stub out ones you might not need, but are refering to in models
  }
});

// you could leave this out, if you do not want to serve up a UX from this server
app.use('/explorer', explorer.routes(app, { basePath: '/api' }));

// BONUS! How to get the swagger spec, convert to OpenAPI3.0 and serve it up...
app.get('/spec', async(req, res, cb) => {
  try {
    const createSwaggerObject = require('loopback-swagger').generateSwaggerSpec;
    const SwaggerParser = require("swagger-parser");
    const converter = require('swagger2openapi');

    let swaggerObject = createSwaggerObject(app);
    let api = await SwaggerParser.dereference(swaggerObject);
    // api is 2.0
    api = JSON.parse(JSON.stringify(api)); // fix up some strange stuff that converter doesn't like!
    // might monkey with auth stuff here...
    let api3 = await converter.convertObj(api, {
      /* options: see https://www.npmjs.com/package/swagger2openapi */
      patch: true,
      warnOnly: true
    });
    res.json(api3.openapi);
  } catch(err) {
    cb(err);
  }
});

app.listen(process.env.PORT || 3000);
```
