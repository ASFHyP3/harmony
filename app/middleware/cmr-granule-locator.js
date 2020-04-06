const cmr = require('../util/cmr');
const env = require('../util/env');
const { CmrError, RequestValidationError, ServerError } = require('../util/errors');

/**
 * Express.js middleware which extracts parameters from the Harmony operation
 * and performs a granule query on them, determining which files are applicable
 * to the given operation.
 *
 * @param {http.IncomingMessage} req The client request, containing an operation
 * @param {http.ServerResponse} res The client response
 * @param {function} next The next function in the middleware chain
 * @returns {void}
 */
async function cmrGranuleLocator(req, res, next) {
  const { operation } = req;

  if (!operation) return next();

  let cmrResponse;

  const cmrQuery = {};

  if (operation.temporal) {
    const { start, end } = operation.temporal;
    cmrQuery.temporal = `${start || ''},${end || ''}`;
  }
  if (operation.boundingRectangle) {
    cmrQuery.bounding_box = operation.boundingRectangle.join(',');
  }

  cmrQuery.concept_id = operation.granuleIds;

  operation.cmrHits = 0;
  try {
    const { sources } = operation;
    const queries = sources.map(async (source) => {
      req.context.logger.info(`Querying granules ${source.collection}, ${JSON.stringify(cmrQuery)}`);
      const startTime = new Date().getTime();

      if (operation.geojson) {
        cmrQuery.geojson = operation.geojson;
        cmrResponse = await cmr.queryGranulesForCollectionWithMultipartForm(
          source.collection,
          cmrQuery,
          req.accessToken,
          env.maxAsynchronousGranules,
        );
      } else {
        cmrResponse = await cmr.queryGranulesForCollection(
          source.collection,
          cmrQuery,
          req.accessToken,
          env.maxAsynchronousGranules,
        );
      }

      const { hits, granules: atomGranules } = cmrResponse;

      operation.cmrHits += hits;
      const msTaken = new Date().getTime() - startTime;
      req.context.logger.info('Completed granule query', { durationMs: msTaken });
      req.context.logger.info(`Found ${hits} granules`);
      const granules = [];
      for (const granule of atomGranules) {
        const link = granule.links.find((g) => g.rel.endsWith('/data#') && !g.inherited);
        if (link) {
          granules.push({ id: granule.id, name: granule.title, url: link.href });
        }
      }
      if (granules.length === 0) {
        throw new RequestValidationError('No matching granules found.');
      }
      return Object.assign(source, { granules });
    });

    await Promise.all(queries);
  } catch (e) {
    if (e instanceof RequestValidationError || e instanceof CmrError) {
      // Avoid giving confusing errors about GeoJSON due to upstream converted files
      if (e.message.indexOf('GeoJSON') !== -1 && req.context.shapefile) {
        e.message = e.message.replace('GeoJSON', req.context.shapefile.typeName);
      }
      return next(e);
    }
    req.context.logger.error(e);
    next(new ServerError('Failed to query the CMR'));
  }
  return next();
}

module.exports = cmrGranuleLocator;
