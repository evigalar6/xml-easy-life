const test = require('node:test');
const assert = require('node:assert/strict');
const {
  extractParserIssues,
  inferElementPathFromCursor,
  xpathLiteral,
  buildBasicXsdRules,
  validateXmlAgainstBasicXsdRules,
  extractNamespacesFromRoot
} = require('../workbench/shared.js');

function makeElement(localName, attrs = {}, children = []) {
  return {
    localName,
    tagName: attrs.tagName || attrs.name || localName,
    children,
    attributes: Object.entries(attrs)
      .filter(([key]) => key !== 'tagName')
      .map(([name, value]) => ({ name, value })),
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? String(attrs[name]) : null;
    }
  };
}

test('extractParserIssues parses line/column markers', () => {
  const issues = extractParserIssues('error on line 4 at column 20: mismatch');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].line, 4);
  assert.equal(issues[0].column, 20);
});

test('inferElementPathFromCursor tracks open tag stack', () => {
  const xml = '<root><book><title>Hi</title></book></root>';
  const cursor = xml.indexOf('Hi') + 1;
  const path = inferElementPathFromCursor(xml, cursor);
  assert.deepEqual(path, ['root', 'book', 'title']);
});

test('xpathLiteral escapes mixed quotes', () => {
  const literal = xpathLiteral(`A "quote" and 'apostrophe'`);
  assert.match(literal, /^concat\(/);
});

test('buildBasicXsdRules extracts root and required child elements', () => {
  const xsdDoc = {
    documentElement: makeElement('schema', {}, [
      makeElement('element', { name: 'catalog' }, [
        makeElement('complexType', {}, [
          makeElement('sequence', {}, [
            makeElement('element', { name: 'book', minOccurs: '1' }),
            makeElement('element', { name: 'note', minOccurs: '0' })
          ])
        ])
      ])
    ])
  };

  const rules = buildBasicXsdRules(xsdDoc);
  assert.equal(rules.supported, true);
  assert.deepEqual(rules.rootNames, ['catalog']);
  assert.deepEqual(rules.requiredChildrenByRoot.catalog, ['book']);
});

test('validateXmlAgainstBasicXsdRules detects missing required child', () => {
  const rules = {
    supported: true,
    rootNames: ['catalog'],
    requiredChildrenByRoot: { catalog: ['book'] }
  };

  const xmlDoc = {
    documentElement: {
      tagName: 'catalog',
      children: [{ tagName: 'item' }]
    }
  };

  const outcome = validateXmlAgainstBasicXsdRules(xmlDoc, rules);
  assert.equal(outcome.ok, false);
  assert.match(outcome.summary, /issues/i);
});

test('extractNamespacesFromRoot maps xmlns declarations', () => {
  const xmlDoc = {
    documentElement: {
      attributes: [
        { name: 'xmlns', value: 'urn:default' },
        { name: 'xmlns:bk', value: 'urn:books' }
      ]
    }
  };
  const map = extractNamespacesFromRoot(xmlDoc);
  assert.equal(map[''], 'urn:default');
  assert.equal(map.bk, 'urn:books');
});
