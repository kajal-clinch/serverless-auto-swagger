'use strict';
import { ApiType, CustomHttpApiEvent, CustomServerless, ServerlessFunction } from '../types/serverless-plugin.types';

type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>;

export default (
  serverless: CustomServerless
): PartialRecord<'swaggerUI' | 'swaggerJSON' | 'swaggerRedirectURI', ServerlessFunction> => {
  const handlerPath = 'swagger/';
  const configInput = serverless?.configurationInput || serverless.service;
  const path = serverless.service.custom?.autoswagger?.swaggerPath ?? 'swagger';
  const name = typeof configInput?.service == 'object' ? configInput.service.name : configInput.service;
  const stage = configInput?.provider?.stage;

  const useStage = serverless.service.custom?.autoswagger?.useStage;
  const apiType: ApiType = serverless.service.custom?.autoswagger?.apiType ?? 'httpApi';
  const authorizer = serverless.service.custom?.autoswagger?.lambdaAuthorizer as CustomHttpApiEvent['authorizer'];

  if (!['http', 'httpApi'].includes(apiType)) {
    throw new Error(`custom.autoswagger.apiType must be "http" or "httpApi". Received: "${apiType}"`);
  }

  const swaggerUI: ServerlessFunction = {
    name: stage ? `${stage}-swagger-ui` : undefined,
    handler: handlerPath + 'swagger-html.handler',
    disableLogs: true,
    events: [
      {
        [apiType as 'httpApi']: {
          method: 'get' as const,
          path: useStage ? `/${stage}/${path}` : `/${path}`,
          ...(authorizer && { authorizer }),
        },
      },
    ],
  };

  const swaggerJSON: ServerlessFunction = {
    name: stage ? `${stage}-swagger-json` : undefined,
    handler: handlerPath + 'swagger-json.handler',
    disableLogs: true,
    events: [
      {
        [apiType as 'httpApi']: {
          method: 'get' as const,
          path: useStage ? `/${stage}/${path}.json` : `/${path}.json`,
          ...(authorizer && { authorizer }),
        },
      },
    ],
  };

  const swaggerRedirectURI: ServerlessFunction | undefined = serverless.service.custom?.autoswagger?.useRedirectUI
    ? {
      name: name && stage ? `${name}-${stage}-swagger-redirect-uri` : undefined,
      handler: handlerPath + 'oauth2-redirect-html.handler',
      events: [
        {
          [apiType as 'httpApi']: {
            method: 'get' as const,
            path: useStage ? `/${stage}/oauth2-redirect.html` : `/oauth2-redirect.html`,
          },
        },
      ],
    }
    : undefined;

  return {
    swaggerUI,
    swaggerJSON,
    ...(swaggerRedirectURI && { swaggerRedirectURI }),
  };
};
