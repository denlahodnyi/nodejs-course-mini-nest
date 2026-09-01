import { IS_CONTROLLER, PREFIX } from '../tokens.js';

export default function Controller(prefix?: string): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(IS_CONTROLLER, true, target);
    Reflect.defineMetadata(PREFIX, prefix ?? '', target);
  };
}
