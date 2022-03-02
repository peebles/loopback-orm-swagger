// This can be used by aux scripts or services that need the database ORM but not the entire
// loopback framework.
//
const path = require('path');
const fs = require('fs');

module.exports = function orm(app, {modelsPath, modelConfig, dataSources, mixins}) {
  let mConfig = {}; // keep track of model config and possible .js files based on real model name (in the schema)

  // load schema files and keep track of config and any .js files
  function loadSchemas() {
    let schemas = [];
    Object.keys(modelConfig).forEach(modelName => {
      let s = require(path.join(modelsPath, `${modelName}.json`));
      schemas.push( s );
      mConfig[s.name] = {config: modelConfig[modelName]};
      let js = path.join(modelsPath, `${modelName}.js`);
      if (fs.existsSync(js)) {
        mConfig[s.name].js = js;
      }
    });
    return schemas;
  }

  // load mixins if any
  if (mixins) {
    Object.keys(mixins).forEach(name => {
      app.loopback.modelBuilder.mixins.define(name, mixins[name]);
    });
  }

  // load data sources if any
  if (dataSources) {
    Object.keys(dataSources).forEach(name => {
      app.dataSource(name, dataSources[name]);
    });
  }

  // get the schemas
  let schemas = loadSchemas();

  schemas.forEach(s => {
    // create the model
    let model = app.loopback.createModel(s);
    // if there is a .js file, require it
    if (mConfig[model.modelName].js) require(mConfig[model.modelName].js)(model);
    // bind the model to a datasource and add it to app.models hash
    app.model(model, mConfig[model.modelName].config);
  });
}
