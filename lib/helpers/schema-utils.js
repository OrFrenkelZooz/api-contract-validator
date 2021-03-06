const fs = require('fs');
const { chain } = require('lodash');
const yaml = require('js-yaml');
const deref = require('json-schema-deref-sync');
const { buildValidations } = require('api-schema-builder');

const base64 = require('./base64');

module.exports.getSchema = (() => {
  const schemas = {};

  return (filePath) => {
    const encodedFilePath = base64.encode(filePath);

    if (!schemas[encodedFilePath]) {
      const referenced = yaml.load(fs.readFileSync(filePath), 'utf8');
      const dereferenced = deref(referenced);

      schemas[encodedFilePath] = buildValidations(referenced, dereferenced, buildSchemaOpts);
    }
    return schemas[encodedFilePath];
  };
})();

module.exports.getValidatorByPathMethodAndCode = (schema, request, response) => {
  const route = pathMatcher(schema, request.path);

  return chain(schema)
    .get(`${route}.${request.method}.responses.${response.status}`)
    .value();
};

module.exports.pathMatcher = pathMatcher;
function pathMatcher(routes, path) {
  return Object
    .keys(routes)
    .filter((route) => {
      const routeArr = route.split('/');
      const pathArr = path.split('/');

      if (routeArr.length !== pathArr.length) return false;

      return routeArr.every((seg, idx) => {
        if (seg === pathArr[idx]) return true;

        // if current path segment is param
        if (seg.startsWith(':') && pathArr[idx]) return true;

        return false;
      });
    })[0];
}

/* istanbul ignore next */
const buildSchemaOpts = {
  buildRequest: false,
  formats: [
    {
      name: 'int64',
      pattern: {
        validate: /^\d{1,19}$/,
        type: 'number',
      },
    },
    {
      name: 'int32',
      pattern: {
        validate: value => Number.isSafeInteger(value),
        type: 'number',
      },
    },
    {
      name: 'integer',
      pattern: {
        validate: value => Number.isSafeInteger(value),
        type: 'number',
      },
    },
    {
      name: 'timestamp',
      pattern: {
        validate: value => Date.parse(value),
        type: 'string',
      },
    },
    {
      name: 'float',
      pattern: {
        validate: value => Number.parseFloat(value) === value,
        type: 'number',
      },
    },
    {
      name: 'double',
      pattern: {
        validate: /^-?\d+(\.\d{1,})?/,
        type: 'number',
      },
    },
  ],
};
