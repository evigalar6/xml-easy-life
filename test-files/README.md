# Test Files (End-to-End)

Use these files to quickly verify extension features after loading the unpacked project in Chrome.

## Files

- `catalog_valid.xml`: Valid XML for general workflow tests.
- `catalog_basic.xsd`: Basic XSD compatible with the extension's lightweight XSD checks.
- `catalog_missing_required.xml`: Invalid against `catalog_basic.xsd` (missing required direct child).
- `catalog_malformed.xml`: Not well-formed XML for parser/error navigation tests.
- `books_ns.xml`: Namespaced XML for namespace-aware XPath testing.
- `books_ns.xslt`: XSLT sample for transform preview.
- `rss_feed.xml`: RSS 2.0 feed sample.
- `atom_feed.xml`: Atom feed sample with default namespace.
- `soap_books.xml`: SOAP-style namespaced payload sample.
- `soap_books_extract_titles.xslt`: XSLT sample for SOAP payload transform.

## Suggested test flow

1. Upload `catalog_valid.xml`.
2. Click `Validate` (should pass).
3. Try XPath: `//book/title/text()` and `//book[@id='bk101']/title/text()`.
4. Upload `catalog_basic.xsd`, then click `Validate XML With XSD` (should pass).
5. Upload `catalog_missing_required.xml`, run XSD validation again (should fail with missing child).
6. Upload `catalog_malformed.xml`, click `Validate` (should show parser error + error navigation).
7. Upload `books_ns.xml`, click `Detect Namespaces From XML`, then run XPath `//bk:book/bk:title/text()`.
8. Upload `books_ns.xslt`, click `Run Transform` to preview output.

## Additional scenario: RSS and Atom

1. Upload `rss_feed.xml`.
2. Try XPath:
   - `//item/title/text()`
   - `//channel/title/text()`
3. Upload `atom_feed.xml`.
4. Click `Detect Namespaces From XML`.
5. Add or verify mapping:
   - `a=http://www.w3.org/2005/Atom`
6. Try XPath:
   - `//a:entry/a:title/text()`
   - `//a:feed/a:title/text()`

## Additional scenario: SOAP-style XML

1. Upload `soap_books.xml`.
2. Click `Detect Namespaces From XML`.
3. Ensure mappings include:
   - `soapenv=http://schemas.xmlsoap.org/soap/envelope/`
   - `bk=urn:books:service`
4. Try XPath:
   - `//bk:Book/bk:Title/text()`
   - `/soapenv:Envelope/soapenv:Body/bk:GetBooksResponse/bk:Book[@bk:id='101']/bk:Title/text()`
5. Upload `soap_books_extract_titles.xslt` and run transform.

## Notes

- Namespace-aware XPath requires prefix mappings for namespaced elements.
- The included XSD file is intentionally simple and aligned with current basic XSD support.
