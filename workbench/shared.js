(function () {
  function extractParserIssues(errorText) {
    const issues = [];
    const regex = /error on line\s+(\d+)\s+at column\s+(\d+)/gi;
    let match = regex.exec(errorText || "");
    while (match) {
      issues.push({
        line: Number(match[1]),
        column: Number(match[2]),
        message: `Line ${match[1]}, column ${match[2]}`
      });
      match = regex.exec(errorText || "");
    }
    return issues;
  }

  function inferElementPathFromCursor(xmlText, cursorOffset) {
    const snippet = String(xmlText || "").slice(0, Math.max(0, cursorOffset || 0));
    const stack = [];
    const tagRegex = /<\/?([A-Za-z_][\w:.-]*)(\s[^<>]*)?>/g;
    let match = tagRegex.exec(snippet);
    while (match) {
      const fullTag = match[0];
      const tagName = match[1];
      const isClosing = fullTag.startsWith("</");
      const isSelfClosing = /\/>\s*$/.test(fullTag);
      if (isClosing) {
        if (stack.length > 0 && stack[stack.length - 1] === tagName) {
          stack.pop();
        }
      } else if (!isSelfClosing) {
        stack.push(tagName);
      }
      match = tagRegex.exec(snippet);
    }
    return stack;
  }

  function xpathLiteral(value) {
    const input = String(value ?? "");
    if (!input.includes("'")) {
      return `'${input}'`;
    }
    if (!input.includes('"')) {
      return `"${input}"`;
    }
    const parts = input.split("'");
    return `concat('${parts.join(`', "'", '`)}')`;
  }

  function getFirstChildByLocalName(parent, name) {
    if (!parent) return null;
    const wanted = String(name || "");
    const children = Array.from(parent.children || []);
    return children.find((el) => el.localName === wanted) || null;
  }

  function getChildrenByLocalName(parent, name) {
    if (!parent) return [];
    const wanted = String(name || "");
    return Array.from(parent.children || []).filter((el) => el.localName === wanted);
  }

  function buildBasicXsdRules(xsdDoc) {
    const schema = xsdDoc?.documentElement;
    if (!schema || schema.localName !== "schema") {
      return {
        supported: false,
        reason: "Document root is not an XSD schema.",
        rootNames: [],
        requiredChildrenByRoot: {}
      };
    }

    const topElements = getChildrenByLocalName(schema, "element");
    const rootNames = [];
    const requiredChildrenByRoot = {};

    for (const topElement of topElements) {
      const rootName = topElement.getAttribute("name");
      if (!rootName) continue;
      rootNames.push(rootName);

      const complexType = getFirstChildByLocalName(topElement, "complexType");
      const sequence = getFirstChildByLocalName(complexType, "sequence");
      const requiredChildren = [];

      for (const childElement of getChildrenByLocalName(sequence, "element")) {
        const childName = childElement.getAttribute("name");
        if (!childName) continue;
        const minOccursAttr = childElement.getAttribute("minOccurs");
        const minOccurs = minOccursAttr == null ? 1 : Number(minOccursAttr);
        if (!Number.isNaN(minOccurs) && minOccurs > 0) {
          requiredChildren.push(childName);
        }
      }

      requiredChildrenByRoot[rootName] = requiredChildren;
    }

    return {
      supported: rootNames.length > 0,
      reason: rootNames.length > 0 ? "" : "No top-level xs:element declarations found.",
      rootNames,
      requiredChildrenByRoot
    };
  }

  function validateXmlAgainstBasicXsdRules(xmlDoc, rules) {
    if (!xmlDoc?.documentElement) {
      return {
        ok: false,
        summary: "XML document is empty.",
        details: []
      };
    }

    if (!rules?.supported) {
      return {
        ok: false,
        summary: rules?.reason || "Unsupported XSD shape.",
        details: []
      };
    }

    const xmlRoot = xmlDoc.documentElement.tagName;
    const details = [];

    if (!rules.rootNames.includes(xmlRoot)) {
      return {
        ok: false,
        summary: `Root element mismatch. XML root is <${xmlRoot}>.`,
        details: [`Expected one of: ${rules.rootNames.map((n) => `<${n}>`).join(", ")}`]
      };
    }

    const requiredChildren = rules.requiredChildrenByRoot[xmlRoot] || [];
    const xmlChildNames = new Set(Array.from(xmlDoc.documentElement.children).map((el) => el.tagName));

    for (const requiredName of requiredChildren) {
      if (!xmlChildNames.has(requiredName)) {
        details.push(`Missing required direct child <${requiredName}> under <${xmlRoot}>.`);
      }
    }

    return {
      ok: details.length === 0,
      summary:
        details.length === 0
          ? "Basic XSD checks passed (root + required direct children)."
          : "Basic XSD checks found issues.",
      details
    };
  }

  function extractNamespacesFromRoot(xmlDoc) {
    const root = xmlDoc?.documentElement;
    const out = {};
    if (!root) return out;
    for (const attr of Array.from(root.attributes || [])) {
      if (attr.name === "xmlns") {
        out[""] = attr.value;
      } else if (attr.name.startsWith("xmlns:")) {
        out[attr.name.slice(6)] = attr.value;
      }
    }
    return out;
  }

  const api = {
    extractParserIssues,
    inferElementPathFromCursor,
    xpathLiteral,
    buildBasicXsdRules,
    validateXmlAgainstBasicXsdRules,
    extractNamespacesFromRoot
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (typeof window !== "undefined") {
    window.XmlEasyShared = api;
  }
})();
