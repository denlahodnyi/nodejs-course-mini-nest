import { BINDINGS } from '../tokens.js';

type BindingsMap = {
  [key: string | symbol]: Object;
}

export type Bindings = Map<keyof BindingsMap, BindingsMap[keyof BindingsMap]>;

export default function Bind(bindings: BindingsMap): ClassDecorator {
  return (target: Function) => {
    const entries = Reflect.ownKeys(bindings).reduce<
      [string | symbol, Object][]
    >((prev, key) => {
      prev.push([key, bindings[key]]);
      return prev;
    }, []);
    const map: Bindings = new Map(entries);
    Reflect.defineMetadata(BINDINGS, map, target);
  };
}
