import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {renderProductFile} from './render-workspace.mjs';
export {renderProduct,renderProductFile,loadModuleCatalog} from './render-workspace.mjs';
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('用法 node scripts/render-product.mjs report.json product.html');console.log(await renderProductFile(input,output));}catch(e){console.error(e.message);process.exitCode=1;}}
