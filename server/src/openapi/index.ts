import { Application } from 'express';

import { loggerService } from '../utilities';
import handleOpenApiDefinition from './definition-route';
import handleMetadata from './metadata-route';

export default (app: Application) => {
  app.get('/:provider/definition', handleOpenApiDefinition);
  app.post('/:provider/definition', handleOpenApiDefinition);
  app.get('/:provider/metadata', handleMetadata);
  loggerService.info('Definition module initialized.');
};
