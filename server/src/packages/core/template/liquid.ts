// @ts-ignore
import { Engine, BlankFileSystem, Template } from 'liquid';

interface TemplateHash {
  [key: string]: {
    html: string;
  };
}

interface RenderContext {
  [key: string]: any;
  content: string;
}
class MemoryFileSystem extends BlankFileSystem {
  template: TemplateHash;

  constructor(template: TemplateHash) {
    super();
    if (!template) {
      throw new Error('Liquid template hash not provided');
    }
    this.template = template;
  }

  async readTemplateFile(path: string): Promise<string> {
    if (this.template[path]) {
      return this.template[path].html;
    }
    throw new Error(`path not found ${path}`);
  }
}

export {
  Engine, MemoryFileSystem, Template, RenderContext,
};
