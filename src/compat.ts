/**
 * Helper functions to enable this library to work with different versions of
 * Preact.
 */

import { VNode, h, render as preactRender } from 'preact';

import {
  PreactComponent,
  PreactNode,
  PreactVNode,
  getDOMNode,
  getComponent,
  getChildren,
  getRenderedVNode,
} from './preact-internals';
import { toArray, isPreact10 } from './util';

/**
 * Add `type` and  `props` properties to Preact elements as aliases of
 * `nodeName` and `attributes`.
 *
 * This only applies to older versions of Preact. Preact 9 and 10 use the
 * names `type` and `props` already.
 *
 * This normalizes VNodes across different versions of Preact and also Enzyme
 * internally depends on the node type and properties object being exposed
 * under these names.
 */
export function addTypeAndPropsToVNode() {
  // nb. VNodes are class instances in Preact <= 8 but object literals in
  // Preact 10.
  if ('type' in h('div', {})) {
    // Extra properties have already been added.
    return;
  }

  // We could add these properties using a VNode hook, but since older versions
  // of Preact use a class for VNodes, we can also add accessors on the
  // prototype.
  const VNode = h('div', {}).constructor;
  Object.defineProperty(VNode.prototype, 'type', {
    get() {
      return this.nodeName;
    },

    set(val) {
      this.nodeName = val;
    },
  });
  Object.defineProperty(VNode.prototype, 'props', {
    get() {
      return this.attributes || {};
    },
  });
}

/**
 * Search a tree of Preact v10 VNodes for the one that produced a given DOM element.
 */
function findVNodeForDOM(
  vnode: PreactVNode,
  el: PreactNode
): PreactVNode | null {
  // Test the current vnode itself.
  if (getDOMNode(vnode) === el) {
    return vnode;
  }

  // Test children of this vnode.
  const children = getChildren(vnode);
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        continue;
      }
      const match = findVNodeForDOM(child, el);
      if (match) {
        return match;
      }
    }
  }

  // Test the rendered output of this vnode.
  const component = getComponent(vnode);
  if (component) {
    return findVNodeForDOM(getRenderedVNode(component), el);
  }

  return null;
}

/**
 * Find the `Component` instance associated with a rendered DOM element.
 */
export function componentForDOMNode(
  el: Node | PreactNode
): PreactComponent | null {
  // In Preact <= 9 this is easy, as rendered nodes have `_component` expando
  // property.
  if ('_component' in el) {
    return el._component;
  }

  // In Preact 10 we have to search up the tree until we find the root element
  // which has a `_prevVNode` expando property, and then traverse the tree of
  // VNodes until we find one with a matching `_dom` property.
  const targetEl = el;
  while (el) {
    el = (el.parentNode as unknown) as PreactNode;
    if (el && getRenderedVNode(el as PreactNode)) {
      const vnode = findVNodeForDOM(
        getRenderedVNode(el as PreactNode),
        targetEl as PreactNode
      );
      if (vnode) {
        return getComponent(vnode);
      }
    }
  }
  return null;
}

export function render(el: VNode, container: HTMLElement) {
  if (isPreact10()) {
    preactRender(el, container);
  } else {
    const preact9Render = preactRender as any;
    preact9Render(el, container, container.firstChild);
  }
}

/**
 * Return the children of a VNode.
 */
export function childElements(el: VNode): (VNode | string | null)[] {
  if (typeof el.children !== 'undefined') {
    // Preact 8. Children is always an array.
    return el.children;
  }
  if (typeof el.props.children !== 'undefined') {
    // Preact 10. Children may be a single object.
    return toArray(el.props.children);
  }
  return [];
}
