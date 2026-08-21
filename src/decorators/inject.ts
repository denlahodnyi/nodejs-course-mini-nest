import { PARAM_TOKENS } from '../tokens.js';

export type ParamTokens = Map<number, string | symbol>;

export default function Inject(token: string | symbol): ParameterDecorator {
  return (target: Object, propKey: string | symbol | undefined, paramIndex: number) => {
    const savedTokens: ParamTokens =
      Reflect.getMetadata(PARAM_TOKENS, target) || new Map();
    savedTokens.set(paramIndex, token);
    Reflect.defineMetadata(PARAM_TOKENS, savedTokens, target);
  };
}
