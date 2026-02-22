<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:bk="urn:books"
  exclude-result-prefixes="bk">
  <xsl:output method="text" omit-xml-declaration="yes" />

  <xsl:template match="/">
Books\n
    <xsl:for-each select="//bk:book">
- <xsl:value-of select="bk:title" />\n
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>
