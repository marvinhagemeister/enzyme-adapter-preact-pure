import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
import { addHook } from 'pirates';
import minimist from 'minimist';

// Setup DOM globals required by Preact rendering.
function setupJSDOM() {
  const dom = new JSDOM();
  const g = global as any;
  g.Event = dom.window.Event;
  g.Node = dom.window.Node;
  g.window = dom.window;
  g.document = dom.window.document;
}
setupJSDOM();

// Support specifying a custom Preact library on the command line using
// `--preact-lib <path to compiled Preact bundle>`.
//
// nb. This must be invoked _before_ any modules are loaded which require Preact.
const opts = minimist(process.argv.slice(2));
if (opts['preact-lib']) {
  const originalPath = require.resolve('preact');
  const preactLibSource = readFileSync(opts['preact-lib']).toString();

  // Return JS from file specified by `--preact-lib` when `require('preact')`
  // is called.
  addHook(() => preactLibSource, {
    exts: ['.js'],
    matcher: filename => filename === originalPath,
    ignoreNodeModules: false,
  });
}

// Log details of which Preact library is being used.
import { isPreact10 } from '../src/util';
console.log(`Using Preact ${isPreact10() ? '10+' : '<= 9'}`);

// For Preact <= 9, modify VNode class for compatibility with Preact 10.
import { addTypeAndPropsToVNode } from '../src/compat';
addTypeAndPropsToVNode();
