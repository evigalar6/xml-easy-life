<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:bk="urn:books:service"
  exclude-result-prefixes="soapenv bk">
  <xsl:output method="text" omit-xml-declaration="yes" />

  <xsl:template match="/">
SOAP Titles\n
    <xsl:for-each select="/soapenv:Envelope/soapenv:Body/bk:GetBooksResponse/bk:Book">
- <xsl:value-of select="bk:Title" />\n
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>
